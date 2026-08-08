const Report = require("../models/report.model");
const Citizen = require("../models/user.model"); // Citizen Model
const BBMPStaff = require("../models/bbmpstaff.model"); // NEW
const WorkerUser = require("../models/workeruser.model"); // NEW
const { getStaffAreaId } = require("../helpers/user.helper"); // 庁 MODIFIED: Use centralized helper
const Area = require("../models/area.model"); // Area model for lookups
const AssignmentState = require("../models/assignmentstate.model"); // NEW IMPORT for counter
const { runAutomaticAssignment } = require("./assignment.controller"); 
const { classifyTrashPriority } = require("../helpers/ai.helper");

// Helper function to handle daily reset and generation of the sequential counter
async function getNextReportCounter(areaId) {
    const today = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Start of today

    // Find and conditionally update the AssignmentState document for the area
    let state = await AssignmentState.findOne({ area: areaId });
    let counter = 1;

    if (state) {
        if (new Date(state.lastAssignmentDate) < todayStart) {
            // New day, reset counter to 1
            state.reportCounter = 1;
        } else {
            // Same day, increment counter
            state.reportCounter += 1;
        }
        state.lastAssignmentDate = new Date();
        // Use updateOne to ensure atomicity for the counter logic
        await AssignmentState.updateOne({ area: areaId }, { reportCounter: state.reportCounter, lastAssignmentDate: state.lastAssignmentDate }, { upsert: true });
        
        counter = state.reportCounter;
    } else {
        // First ever report for this area, initialize state
        await AssignmentState.create({ area: areaId, reportCounter: 1, lastAssignmentDate: new Date() });
        counter = 1;
    }
    return counter.toString().padStart(3, '0'); // Pad with leading zeros (e.g., 001, 015)
}

// Function to generate the custom, 10-character Report ID
async function generateUniqueReportId(areaId, areaName) {
    const today = new Date();
    
    // 1. Generate Date Component (MMDD) -> 4 digits
    const mm = (today.getMonth() + 1).toString().padStart(2, '0'); // 01 to 12
    const dd = today.getDate().toString().padStart(2, '0'); // 01 to 31
    const dateComponent = `${mm}${dd}`; // MMDD (e.g., 1209)

    // 2. Generate Area Component (First 3 characters of cleaned name, uppercase) -> 3 chars
    const cleanedName = areaName.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const areaComponent = cleanedName.substring(0, 3).padEnd(3, 'X'); // e.g., BEL, RAJ
    
    // 3. Get Sequential Counter (001 to 999) -> 3 chars
    const counterComponent = await getNextReportCounter(areaId);
    
    // 4. Combine all parts: MMDD + AreaCode + Counter = 10 chars
    return `${dateComponent}${areaComponent}${counterComponent}`; // e.g., 1209BEL001
}


// --- MODIFIED POPULATION HELPER (Reliable Manual Population) ---
const populateReportUsers = (reportsQuery) => {
    // 1. Populate Area (Common)
    reportsQuery.populate("area", "name");

    // 2. Manually Populate submittedBy by specifying multiple paths/models in an array.
    reportsQuery.populate({ 
        path: 'submittedBy', 
        model: 'Citizen', 
        select: 'fullName email' 
    });
    reportsQuery.populate({ 
        path: 'submittedBy', 
        model: 'BBMPStaff', 
        select: 'fullName email' 
    });
    reportsQuery.populate({ 
        path: 'submittedBy', 
        model: 'WorkerUser', 
        select: 'fullName email' 
    });

    // 3. Manually Populate assignedTo
    reportsQuery.populate({ 
        path: 'assignedTo', 
        model: 'BBMPStaff', 
        select: 'fullName email' 
    });
    reportsQuery.populate({ 
        path: 'assignedTo', 
        model: 'WorkerUser', 
        select: 'fullName email' 
    });

    return reportsQuery;
};
// --- END MODIFIED POPULATION HELPER ---


// Create a new report (submittedBy is a Citizen)
exports.createReport = async (req, res) => {
  try {
    const { category, description, location, area } = req.body;
    
    // --- NEW FEATURE: DAILY REPORT LIMIT CHECK (5 reports per day) ---
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const reportsSubmittedToday = await Report.countDocuments({
      submittedBy: req.userId,
      createdAt: { $gte: twentyFourHoursAgo }
    });

    const DAILY_LIMIT = 4;

    if (reportsSubmittedToday >= DAILY_LIMIT) {
        return res.status(429).send({ 
            message: `Submission limit reached. You can only submit ${DAILY_LIMIT} reports per 24 hours.` 
        });
    }
    // --- END NEW FEATURE ---
    
    // FIX 1: Ensure the file was uploaded successfully by the middleware
    if (!req.file || !req.file.url) { 
        return res.status(400).send({ message: "No file uploaded or file upload failed in middleware." });
    }

    // Robustly parse the location string (expected format: "Lat:12.9716,Lon:77.5946")
    let latitude, longitude;
    const latMatch = location.match(/Lat:([\d.-]+)/);
    const lonMatch = location.match(/Lon:([\d.-]+)/);
    
    if (!latMatch || !lonMatch) {
         return res.status(400).send({ message: "Invalid location format provided." });
    }
    
    latitude = parseFloat(latMatch[1]);
    longitude = parseFloat(lonMatch[1]);
    
    if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).send({ message: "Invalid latitude or longitude values." });
    }

    // Mongoose expects coordinates in [longitude, latitude] format for GeoJSON Point
    const coordinates = [longitude, latitude]; 

    // --- NEW FEATURE: AI CLASSIFICATION ---
    let trashPriorityTag = 'Small'; // Default fallback
    // Check if mediaPath is present and mediaType is image before calling the helper
    if (req.file.url && req.file.mimetype.startsWith("image")) {
        // Use the AI helper to get the priority tag from the uploaded image URL
        trashPriorityTag = await classifyTrashPriority(req.file.url, req.file.mimetype);
        console.log(`🗑️ AI Classified Report as: ${trashPriorityTag}`);
    }
    // --- END NEW FEATURE ---
    
    // --- CRITICAL FIX 1: Generate Custom Report ID and explicitly assign it ---
    const areaDoc = await Area.findById(area).select('name'); 
    if (!areaDoc) {
        return res.status(400).send({ message: "Invalid area ID provided." });
    }
    const generatedReportId = await generateUniqueReportId(area, areaDoc.name);
    // --- END CRITICAL FIX 1 ---

    const report = new Report({
      customReportId: generatedReportId, // Explicitly assign the unique ID
      category,
      description,
      location: {
        type: 'Point',
        coordinates: coordinates // Use the validated array
      },
      area, 
      mediaPath: req.file.url, // SAVES FULL AZURE URL TO MONGODB
      mediaType: req.file.mimetype.startsWith("image") ? "image" : "video",
      submittedBy: req.userId,
      trashPriorityTag: trashPriorityTag,
    });

    await report.save();
    
    // --- NEW REWARD SYSTEM: Reward Citizen for Participation ---
    // Give 10 points for submission and increment report count
    await Citizen.findByIdAndUpdate(req.userId, { 
        $inc: { 
            rewardPoints: 10, 
            reportsSubmitted: 1 
        } 
    });
    // --- END NEW REWARD SYSTEM ---

    // CRITICAL MODIFICATION: Call the auto-assignment function immediately
    await runAutomaticAssignment(null, null, report._id); 

    res.status(201).send({ message: "Report submitted successfully and automatically assigned!" });
  } catch (err) {
    // Log the error for server-side debugging
    console.error("Error creating report:", err.message, err.stack);
    // Handle the specific Mongoose error if the customReportId is duplicated
    if (err.code === 11000) {
        return res.status(409).send({ message: "A Report ID collision occurred. Please try submitting again." });
    }
    // Return a generic 500 message
    res.status(500).send({ message: "An unexpected error occurred while processing the report." });
  }
};

// MODIFIED: Get all reports (for Admin Dashboard) 
exports.getAllReports = async (req, res) => {
  try {
    // Priority filter removed from query parameters
    const { search, category, status } = req.query; 
    let query = {};

    // CRITICAL FIX: Allow searching by the new custom ID
    if (search) {
      // Check if search term looks like a custom ID (10 chars, contains digits/letters)
      if (search.length <= 10 && /^[0-9A-Z]{10}$/i.test(search)) {
          query.customReportId = search.toUpperCase(); // Search by exact custom ID
      } else {
          query.description = { $regex: search, $options: "i" }; // Search by description
      }
    }
    if (category && category !== 'All Categories') {
      query.category = category;
    }
    if (status && status !== 'All Statuses') {
      query.status = status;
    }
    // REMOVED PRIORITY FILTER LOGIC:
    // if (priority && priority !== 'All Priorities') {
    //   query.priority = priority;
    // }

    // REPORTS FETCH QUERY
    let reportsQuery = Report.find(query).sort({ createdAt: -1 });

    // USE HELPER FOR RELIABLE MANUAL POPULATION
    reportsQuery = populateReportUsers(reportsQuery);
    const reports = await reportsQuery.exec();
      
    res.status(200).json(reports);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// MODIFIED: Get reports for the currently logged-in user (Citizen)
exports.getMyReports = async (req, res) => {
  try {
    // REPORTS FETCH QUERY
    let reportsQuery = Report.find({ submittedBy: req.userId }).sort({ createdAt: -1 });
    
    // RESTORED FIX: Use full population now that the Report model field type is corrected to String
    reportsQuery = populateReportUsers(reportsQuery); 

    const reports = await reportsQuery.exec();

    res.status(200).json(reports);
  } catch (err) {
    // CRITICAL FIX: Log the error stack to understand Mongoose/DB failures
    console.error(`笶Error fetching reports for user ${req.userId}:`, err.message, err.stack);
    res.status(500).send({ message: "Internal server error during report fetch. See console for details." });
  }
};

// MODIFIED: Get reports for BBMP Staff Reports (Area-based filtering)
exports.getStaffReports = async (req, res) => {
  try {
    // 庁 MODIFIED: Use the centralized helper
    const staffAreaId = await getStaffAreaId(req.userId); 

    if (!staffAreaId) {
        return res.status(200).json([]);
    }

    // REPORTS FETCH QUERY
    let reportsQuery = Report.find({ area: staffAreaId }).sort({ createdAt: -1 });
    
    // ADDED: Apply filters if provided by the staff user (for manage tab)
    const { search, category, status } = req.query; 
    
    if (search) {
      // CRITICAL FIX: Allow searching by the new custom ID
      if (search.length <= 10 && /^[0-9A-Z]{10}$/i.test(search)) {
          reportsQuery.where('customReportId').equals(search.toUpperCase()); // Search by exact custom ID
      } else {
          reportsQuery.where('description').regex(new RegExp(search, 'i')); // Search by description
      }
    }
    if (category && category !== 'All Categories') {
      reportsQuery.where('category').equals(category);
    }
    if (status && status !== 'All Statuses') {
      // MODIFIED: Include the new status 'Review Required'
      reportsQuery.where('status').equals(status);
    }
    
    // USE HELPER FOR RELIABLE MANUAL POPULATION
    reportsQuery = populateReportUsers(reportsQuery);
    const reports = await reportsQuery.exec();
      
    res.status(200).json(reports);
  } catch (err) {
     if (err.message.includes("service area")) {
         return res.status(403).send({ message: "Access Denied: You must be a BBMP staff member assigned to an area." });
     }
    res.status(500).send({ message: err.message });
  }
};

// MODIFIED: Get reports assigned to the currently logged-in worker (User ID)
exports.getWorkerAssignments = async (req, res) => {
    try {
        // REPORTS FETCH QUERY
        let reportsQuery = Report.find({ assignedTo: req.userId }).sort({ createdAt: -1 });
        
        // FIX: Apply the helper to fetch all related details (Citizen, Area, etc.)
        reportsQuery = populateReportUsers(reportsQuery);
        const reports = await reportsQuery.exec();
            
        res.status(200).json(reports);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// NEW FUNCTION: Get the total count of reports resolved by a worker
// MODIFIED: Now fetches the count from the workeruser model, which tracks the resolvedReportsCount
exports.getResolvedReportsCount = async (req, res) => {
    try {
        const workerUser = await WorkerUser.findById(req.userId).select('resolvedReportsCount');
        
        if (!workerUser) {
             return res.status(404).send({ message: "Worker user not found." });
        }

        res.status(200).json({ count: workerUser.resolvedReportsCount || 0 });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// CRITICALLY MODIFIED: Worker Status Update (Now handles file upload, rejection, AND rewards)
exports.updateWorkerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    // Status now comes from req.body (form data or JSON).
    const { status, rejectionReason } = req.body; 
    
    // 1. Input Validation and Status Guardrails
    if (!['Pending', 'In Progress', 'Resolved', 'Rejected'].includes(status)) {
        return res.status(400).send({ message: "Invalid status value." });
    }
    
    let updateFields = { status: status, rejectionReason: null }; // Reset reason unless status is Rejected
    let workerRewarded = false;

    // --- REJECTION LOGIC (Worker) ---
    if (status === 'Rejected') {
        if (!rejectionReason || rejectionReason.length < 10) {
            return res.status(400).send({ message: "Rejection requires a detailed reason (min 10 characters)." });
        }
        // Worker submission of 'Rejected' is stored as 'Review Required'
        updateFields.status = 'Review Required'; 
        updateFields.rejectionReason = rejectionReason;
        updateFields.resolutionMediaPath = null; // Clear any old resolution proof
        updateFields.resolvedAt = null;
        
        const updatedReport = await Report.findOneAndUpdate(
            { _id: id, assignedTo: req.userId }, 
            { $set: updateFields },
            { new: true }
        ).select('status rejectionReason');

        if (!updatedReport) {
            return res.status(403).send({ message: "Access Denied: Report not found or not assigned to you." });
        }
        return res.status(200).send({ 
            message: "Report marked for rejection review. A supervisor will review your reason.", 
            report: updatedReport 
        });
    }
    // --- END REJECTION LOGIC ---

    // --- RESOLUTION LOGIC ---
    if (status === 'Resolved') {
        // 圷 CRITICAL CHECK: Ensure file data exists for resolution (req.file.url is set by middleware)
        if (!req.file || !req.file.url) {
             return res.status(400).send({ message: "Resolution proof (photo/video) is required to mark as Resolved." });
        }
        
        updateFields.resolutionMediaPath = req.file.url; 
        updateFields.resolutionMediaType = req.file.mimetype.startsWith("image") ? "image" : "video";
        // NEW FEATURE: Record the resolution time
        updateFields.resolvedAt = new Date(); 
        
        // Fetch the report before updating to calculate resolution time
        const oldReport = await Report.findById(id).select('createdAt resolvedAt assignedTo status');

        // Check if report was already resolved to prevent double reward
        if (oldReport && oldReport.status !== 'Resolved' && oldReport.assignedTo.equals(req.userId)) {
            
            // 1. Calculate Resolution Time (Efficiency Metric)
            const createdTime = new Date(oldReport.createdAt).getTime();
            const resolutionTimeMs = updateFields.resolvedAt.getTime() - createdTime;
            
            // 2. Determine Reward Points (Example: faster resolution = higher points)
            let points = 100; 
            const hoursTaken = resolutionTimeMs / 3600000;
            
            if (hoursTaken <= 8) { // Resolved within 8 hours
                points += 50; 
            } else if (hoursTaken <= 24) { // Resolved within 1 day
                points += 25;
            } else if (hoursTaken > 72) { // Resolved after 3 days
                points -= 50;
            }
            
            if (points < 10) points = 10; // Minimum reward
            
            // 3. Increment Worker's score and resolved count
            await WorkerUser.findByIdAndUpdate(req.userId, {
                $inc: {
                    resolutionPoints: points, // Add calculated points
                    resolvedReportsCount: 1 // Increment total count
                }
            });
            workerRewarded = true;
        }
    }
    
    // --- STATUS CHANGE (Pending/In Progress) ---
    // If we reach here, it's Pending/In Progress or a Resolved update (if it has a file)

    // 1. Find and update the report
    const updatedReport = await Report.findOneAndUpdate(
        { _id: id, assignedTo: req.userId }, 
        { $set: updateFields },
        { new: true }
    )
    // Select necessary fields for frontend updates, INCLUDING resolvedAt and createdAt
    .select('status resolutionMediaPath resolutionMediaType resolvedAt createdAt rejectionReason'); 

    if (!updatedReport) {
        return res.status(403).send({ message: "Access Denied: Report not found or not assigned to you." });
    }
    
    let message = `Report status updated to ${status} successfully!`;
    if (workerRewarded) {
        message += ` (You earned points for efficient resolution!)`;
    }

    // Return the updated report object, which includes the new resolution paths.
    res.status(200).send({ message: message, report: updatedReport });

  } catch (err) {
    console.error("Worker Status Update Error:", err);
    res.status(500).send({ message: err.message });
  }
};


// NEW FUNCTION: Supervisor Report Status Control (BBMP Staff)
exports.superviseReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalStatus, finalRejectionReason } = req.body;
    
    // 1. Check for valid supervisor action
    if (!['Rejected', 'In Progress'].includes(finalStatus)) {
        return res.status(400).send({ message: "Invalid supervisor final status. Must be 'Rejected' or 'In Progress'." });
    }
    
    // 2. Authorization Check: Ensure BBMP staff manages this report's area
    // CRITICAL FIX: Search by _id OR customReportId if the provided ID is 10 chars
    let report = null;
    if (id.length === 10 && /^[0-9A-Z]{10}$/i.test(id)) {
        report = await Report.findOne({ customReportId: id.toUpperCase() }).select('area status customReportId _id');
    } else {
        report = await Report.findById(id).select('area status customReportId _id');
    }
    
    if (!report) {
        return res.status(404).send({ message: "Report not found." });
    }
    
    const staffAreaId = await getStaffAreaId(req.userId);
    if (!staffAreaId || !report.area.equals(staffAreaId)) {
         return res.status(403).send({ message: "Access Denied: Report does not belong to your assigned area." });
    }
    
    let updateFields = { status: finalStatus };
    
    // 3. Handle Final Rejection
    if (finalStatus === 'Rejected') {
         if (!finalRejectionReason || finalRejectionReason.length < 10) {
             return res.status(400).send({ message: "Final rejection requires a detailed reason (min 10 characters)." });
         }
         updateFields.rejectionReason = finalRejectionReason;
         updateFields.assignedTo = null; // Unassign the report on final rejection
         updateFields.resolutionMediaPath = null; // Clear resolution proof
         updateFields.resolvedAt = null;
         
    } else if (finalStatus === 'In Progress') {
         // 4. Handle Override Rejection
         updateFields.rejectionReason = null; // Clear the rejection reason if supervisor overrides
         
         // The assignedTo field remains, and the worker is expected to continue.
    }

    const updatedReport = await Report.findByIdAndUpdate(
        report._id, // Use the MongoDB _id found in step 2
        { $set: updateFields },
        { new: true }
    ).select('status assignedTo rejectionReason');
    
    const displayId = report.customReportId || report._id.toString().slice(-6);
    
    let message = finalStatus === 'Rejected' 
        ? `Report #${displayId} has been permanently rejected.`
        : `Rejection request for report #${displayId} was overridden. Status set to In Progress.`;
        
    res.status(200).send({ message, report: updatedReport });
    
  } catch (err) {
    if (err.message.includes("service area")) {
         return res.status(403).send({ message: "Access Denied: You must be a BBMP staff member assigned to an area." });
    }
    res.status(500).send({ message: err.message });
  }
};

// NEW: Assign a report to a specific worker (user)
exports.assignReportToWorker = async (req, res) => {
  try {
    const { reportId, workerUserId } = req.body;
    
    // 1. Find the report to perform the area check
    const report = await Report.findById(reportId);
    
    if (!report) {
        return res.status(404).send({ message: "Report not found." });
    }
    
    // 2. Fetch the logged-in staff's area for authorization
    // 庁 MODIFIED: Use the centralized helper
    const staffAreaId = await getStaffAreaId(req.userId);
    
    if (!staffAreaId || !report.area.equals(staffAreaId)) {
         return res.status(403).send({ message: "Access Denied: Report does not belong to your assigned area." });
    }
    
    // 3. Update the report
    const updatedReport = await Report.findByIdAndUpdate(
      reportId,
      { 
        $set: { 
          assignedTo: workerUserId, 
          status: 'In Progress', // Assignment overrides Review Required/Pending
          rejectionReason: null, // Clear rejection reason on new assignment
        } 
      },
      { new: true }
    )
    .populate({
        path: 'assignedTo',
        model: 'WorkerUser', // Explicitly use the WorkerUser model/collection
        select: 'fullName email'
    });

    if (!updatedReport) {
      return res.status(404).send({ message: "Report Not found." });
    }

    res.status(200).send({ message: "Report assigned successfully!", report: updatedReport });
  } catch (err) {
    if (err.message.includes("service area")) {
         return res.status(403).send({ message: "Access Denied: Cannot assign worker without an assigned area." });
     }
    res.status(500).send({ message: err.message });
  }
};


// MODIFIED: Get a single report by ID
exports.getReportById = async (req, res) => {
  try {
    const id = req.params.id;
    let report = null;

    // CRITICAL FIX: Search by customReportId if the provided ID is 10 chars, otherwise search by ObjectId
    if (id.length === 10 && /^[0-9A-Z]{10}$/i.test(id)) {
        report = await Report.findOne({ customReportId: id.toUpperCase() });
    } else {
        // Fallback search by MongoDB ObjectId if needed (e.g., if used internally)
        report = await Report.findById(id); 
    }
    
    if (!report) {
      return res.status(404).send({ message: "Report Not found." });
    }

    // Now that we have the report document, run the population query on it
    let reportsQuery = Report.findById(report._id);
    
    // USE HELPER FOR RELIABLE MANUAL POPULATION (Explicitly adding each model)
    reportsQuery.populate("area", "name");
    reportsQuery.populate({ path: 'submittedBy', model: 'Citizen', select: 'fullName email' });
    reportsQuery.populate({ path: 'submittedBy', model: 'BBMPStaff', select: 'fullName email' });
    reportsQuery.populate({ path: 'submittedBy', model: 'WorkerUser', select: 'fullName email' });
    reportsQuery.populate({ path: 'assignedTo', path: 'assignedTo', model: 'BBMPStaff', select: 'fullName email' });
    reportsQuery.populate({ path: 'assignedTo', path: 'assignedTo', model: 'WorkerUser', select: 'fullName email' });
    
    const populatedReport = await reportsQuery.exec();
    
    // Double check against null after population
    if (!populatedReport) {
        return res.status(404).send({ message: "Report Not found." });
    }

    res.status(200).json(populatedReport);
  } catch (err) {
    // Check for invalid ObjectId format error and return 404 instead of 500
    if (err.name === 'CastError' && err.path === '_id') {
        return res.status(404).send({ message: "Invalid Report ID format." });
    }
    res.status(500).send({ message: err.message });
  }
};