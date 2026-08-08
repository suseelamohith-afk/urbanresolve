const Area = require("../models/area.model");
// MODIFIED: Import the dynamic worker model factory
const WorkerModelFactory = require("../models/worker.model");
const BBMPStaff = require("../models/bbmpstaff.model");
const WorkerUser = require("../models/workeruser.model");
const Citizen = require("../models/user.model"); // Citizen Model
const Report = require("../models/report.model"); // NEW IMPORT for cascade delete
const WorkerLeave = require("../models/workerleave.model"); // NEW IMPORT for cascade delete
// 💡 MODIFIED: Use centralized helpers
const { getStaffAreaId, getWorkerModelForArea } = require("../helpers/user.helper"); 
const mongoose = require('mongoose'); // Import mongoose for robust ObjectId comparison

// Helper function to normalize area name for deterministic collection names
function cleanAreaName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ❌ REMOVED: getStaffAreaInfo is now replaced by the internal function below.
// ❌ REMOVED: getWorkerModel is now replaced by the internal function below.

// NEW: Internal helper to get the dynamic Worker Model and Area Info
const getWorkerModelAndAreaInfo = (userId, areaNameOverride = null) => {
    return new Promise(async (resolve, reject) => {
        try {
            let info;
            let areaId;
            let areaName;

            if (areaNameOverride) {
                 // Used during worker lookup iteration in auth.controller
                 areaName = areaNameOverride; 
                 areaId = null; // Area ID is unknown in this path
            } else {
                 // Get area ID managed by the logged-in user
                 areaId = await getStaffAreaId(userId);
                 const areaDoc = await Area.findById(areaId).select('name');
                 areaName = areaDoc ? areaDoc.name : null;
            }
            
            if (!areaName) {
                throw new Error("User is not assigned to a service area or area not found.");
            }

            const cleanedName = cleanAreaName(areaName);
            const collectionName = `worker${cleanedName}`; // e.g., workerrajankunte
            
            const DynamicWorker = WorkerModelFactory(collectionName);
            resolve({ DynamicWorker, areaId, areaName });
        } catch (error) {
            reject(error);
        }
    });
}

// Get all workers (used for select dropdown)
exports.getWorkers = async (req, res) => {
  try {
    // 💡 MODIFIED: Use the new centralized lookup function
    const { DynamicWorker, areaId } = await getWorkerModelAndAreaInfo(req.userId); 
    
    // MODIFIED: Fetch workers from the dynamic collection
    const workers = await DynamicWorker.find({}).sort({ name: 1 }); // Removed area filter as the collection is already scoped

    // MODIFIED: We need to find the corresponding WorkerUser document 
    // for each Worker to get the actual Worker User ID for assignment.
    // MODIFIED: Now selecting resolutionPoints for reward ranking/display
    const workerUsers = await WorkerUser.find({ area: { $in: workers.map(w => w._id) } }).select('fullName area resolutionPoints');

    // Combine Worker data with the corresponding WorkerUser ID
    const finalWorkers = workers.map(worker => {
        // 'worker.area' is the Area ID. 'worker._id' is the Worker Document ID (in the dynamic collection).
        // WorkerUser.area holds the Worker Document ID.
        const user = workerUsers.find(wu => wu.area.equals(worker._id));
        return {
            _id: worker._id, // Worker Document ID (in the dynamic collection)
            name: worker.name,
            area: worker.area, // This is the Area ID
            workerUserId: user ? user._id : null, // This is the ID we need for assignment (WorkerUser ID)
            workerUserName: user ? user.fullName : worker.name,
            // NEW: Add resolution points for potential ranking/display
            resolutionPoints: user ? user.resolutionPoints : 0 
        };
    });

    // Determine return set based on whether the request is for management or assignment
    if (req.query.internal === 'manage') { 
        // Return all workers for management list (including those without provisioned accounts)
        return res.status(200).json(finalWorkers);
    }
    
    // Default (Assignment) behavior: filter out workers without a provisioned User account
    res.status(200).json(finalWorkers.filter(w => w.workerUserId));
  } catch (err) {
    if (err.message.includes("service area") || err.message.includes("not found")) {
        return res.status(403).send({ message: "Access Denied: You must be a BBMP staff member assigned to an area." });
    }
    res.status(500).send({ message: err.message });
  }
};

// NEW FUNCTION: Get the top 3 rewarded workers in the staff's area
exports.getTopWorkersByReward = async (req, res) => {
    try {
        // 1. Get the Area ID of the logged-in staff
        const areaId = await getStaffAreaId(req.userId);
        
        if (!areaId) {
            return res.status(200).json([]);
        }

        // 2. Fetch top 3 WorkerUser accounts in that area, sorted by resolutionPoints
        const topWorkers = await WorkerUser.find({ areaId: areaId })
            .select('fullName resolutionPoints')
            .sort({ resolutionPoints: -1 }) // Sort descending
            .limit(3);

        res.status(200).json(topWorkers);

    } catch (err) {
        console.error("Error fetching top workers:", err);
        if (err.message.includes("service area")) {
            return res.status(403).send({ message: "Access Denied: You must be a BBMP staff member assigned to an area." });
        }
        res.status(500).send({ message: err.message });
    }
};

// Add a new worker (BBMP Admin only)
exports.addWorker = async (req, res) => {
  try {
    // 💡 MODIFIED: Use the new centralized lookup function
    const { DynamicWorker, areaId } = await getWorkerModelAndAreaInfo(req.userId); 
    
    const { name } = req.body;
    if (!name) {
      return res.status(400).send({ message: "Worker name is required." });
    }

    // MODIFIED: Add the area ID to the new worker entry and save to the dynamic collection
    const newWorker = new DynamicWorker({ name, area: areaId });
    await newWorker.save();
    res.status(201).send({ message: "Worker added successfully!", worker: newWorker });
  } catch (err) {
    if (err.code === 11000) {
      // The compound index prevents adding the same name within this dynamic collection
      return res.status(409).send({ message: "Worker/Name already exists in your area." });
    }
    if (err.message.includes("service area") || err.message.includes("not found")) {
        return res.status(403).send({ message: "Access Denied: Cannot add worker without an assigned area." });
    }
    res.status(500).send({ message: err.message });
  }
};

// CRITICALLY MODIFIED: Remove a worker (BBMP Admin only) and cascade delete all associated data
exports.removeWorker = async (req, res) => {
  try {
    // 1. Get the dynamic model for the staff's area
    const { DynamicWorker } = await getWorkerModelAndAreaInfo(req.userId); 
    
    const { id: workerDocumentId } = req.params; // This ID is the Worker Document ID (e.g., in workerrajankunte)
    
    // 2. Find the Worker Document to ensure it exists and to get its Worker Document ID
    const workerDocument = await DynamicWorker.findOne({ _id: workerDocumentId });
    
    if (!workerDocument) {
      return res.status(404).send({ message: "Worker not found in your area." });
    }

    // --- Start Cascading Deletion ---

    // 3. Find the corresponding WorkerUser document to get the WorkerUser ID (_id)
    const workerUser = await WorkerUser.findOne({ area: workerDocumentId }).select('_id');
    
    let workerUserId = null;
    if (workerUser) {
        workerUserId = workerUser._id;

        // a. Delete all Reports assigned to this Worker User
        await Report.updateMany(
            { assignedTo: workerUserId }, 
            { $unset: { assignedTo: 1 }, $set: { status: 'Pending' } } // Unassign and set back to Pending
        );
        console.log(`Unassigned reports previously assigned to worker user ID: ${workerUserId}`);

        // b. Delete Worker User's account and all associated leaves
        await WorkerLeave.deleteMany({ workerUser: workerUserId });
        await WorkerUser.deleteOne({ _id: workerUserId });
        console.log(`Deleted Worker User account and related leaves for ID: ${workerUserId}`);
    } else {
        console.log("No provisioned WorkerUser account found for this Worker Document. Skipping user/report deletion.");
    }
    
    // 4. Delete the Worker Document from the dynamic collection (Final step for worker data)
    await DynamicWorker.deleteOne({ _id: workerDocumentId }); 

    // --- End Cascading Deletion ---

    res.status(200).send({ message: "Worker and all associated data removed successfully!" });
  } catch (err) {
    if (err.message.includes("service area") || err.message.includes("not found")) {
        return res.status(403).send({ message: "Access Denied: Cannot remove worker without an assigned area." });
    }
    console.error("Error during cascade deletion of worker:", err);
    res.status(500).send({ message: err.message });
  }
};