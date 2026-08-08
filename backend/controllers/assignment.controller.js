const Report = require("../models/report.model");
const Area = require("../models/area.model");
const WorkerUser = require("../models/workeruser.model");
const WorkerLeave = require("../models/workerleave.model");
const AssignmentState = require("../models/assignmentstate.model");
const WorkerModelFactory = require("../models/worker.model"); 
const { getWorkerModelForArea } = require("../helpers/user.helper"); // 💡 MODIFIED: Use centralized helper
// Import ObjectId to ensure robust comparison if necessary
const mongoose = require('mongoose'); 

// Helper function to normalize area name for deterministic collection names (reused from worker.controller)
function cleanAreaName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// --- Complex Helper Function for WorkerUser to Area lookup ---
async function getWorkerUsersInArea(areaId) {
    const area = await Area.findById(areaId).select('name');
    if (!area) return [];
    
    // 💡 MODIFIED: Use centralized helper
    const DynamicWorkerModel = getWorkerModelForArea(area.name);
    
    // 1. Find all Worker Documents in the dynamic collection for this area
    const workerDocuments = await DynamicWorkerModel.find({ area: areaId }).select('_id');
    const workerDocumentIds = workerDocuments.map(doc => doc._id);

    // 2. Find all WorkerUser accounts whose 'area' field matches the Worker Document IDs
    return await WorkerUser.find({ 
        area: { $in: workerDocumentIds } 
    }).select('_id fullName');
}
// -----------------------------------------------------------


// NEW: Core Auto-Assignment Logic - Now callable for a specific area/report ID
exports.runAutomaticAssignment = async (req, res, reportId = null) => {
    // If called via route (POST /api/assignment/run) or directly after report creation.
    console.log("Starting automatic report assignment...");
    
    // FINAL FIX 1: Generate a fresh, clean Date object right before the query.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let areasToProcess = [];
    let initialReport = null;

    if (reportId) {
        initialReport = await Report.findById(reportId).select('area status assignedTo');
        if (initialReport && initialReport.area) {
            areasToProcess = [await Area.findById(initialReport.area)];
        }
    } else {
        areasToProcess = await Area.find({});
    }

    let overallAssignedCount = 0;

    for (const area of areasToProcess) {
        
        // --- STEP 1: Define Target Reports ---
        let reportsToAssign = [];
        if (initialReport && initialReport.area.equals(area._id)) {
            if (initialReport.status === 'Pending' && !initialReport.assignedTo) {
                reportsToAssign = [initialReport];
            }
        } else {
            reportsToAssign = await Report.find({
                area: area._id,
                status: 'Pending',
                assignedTo: { $exists: false } 
            })
            .sort({ trashPriorityTag: -1, createdAt: 1 });
        }


        if (reportsToAssign.length === 0) continue;

        // --- STEP 2: Get Eligible Workers (excluding those on leave) ---
        const workerUsersInArea = await getWorkerUsersInArea(area._id); // All Workers (WorkerUser Documents)
        const workerUserIds = workerUsersInArea.map(w => w._id);
        
        // Find active leaves for these workers covering 'today'
        const workersOnLeave = await WorkerLeave.find({
            workerUser: { $in: workerUserIds },
            startDate: { $lte: today },
            endDate: { $gte: today }
        }).select('workerUser');

        // FINAL FIX 2: Extract the ObjectIds of workers who ARE on leave
        // This array contains pure ObjectId references.
        const leaveWorkerObjectIds = workersOnLeave.map(l => l.workerUser); 
        
        // NEW FILTER APPROACH: Find *eligible* WorkerUser documents explicitly by excluding the leave ObjectIds.
        // Mongoose handles the comparison of ObjectIds in the $nin array robustly.
        const eligibleWorkers = await WorkerUser.find({
             _id: { $in: workerUserIds, $nin: leaveWorkerObjectIds } // $nin check using ObjectIds directly
        }).select('_id fullName');
        
        // CRITICAL CHECK: If no eligible workers are found, skip assignment for this area.
        if (eligibleWorkers.length === 0) {
            console.log(`Area ${area.name}: All eligible workers are on leave or none are provisioned. Skipping assignment.`);
            // Reports remain in 'Pending' and 'unassigned' state.
            continue; 
        }
        // END CRITICAL CHECK

        const eligibleWorkerIds = eligibleWorkers.map(w => w._id.toString());
        
        // --- STEP 3: Determine Starting Point & Round-Robin ---
        let assignmentState = await AssignmentState.findOneAndUpdate(
            { area: area._id }, 
            { $setOnInsert: { area: area._id, lastAssignedWorkerUser: null } },
            { upsert: true, new: true }
        );

        let startIndex = 0;
        
        if (assignmentState.lastAssignedWorkerUser) {
            const lastId = assignmentState.lastAssignedWorkerUser.toString();
            // Find index of last worker among the CURRENTLY ELIGIBLE list
            const lastIndex = eligibleWorkerIds.indexOf(lastId); 
            
            if (lastIndex !== -1) {
                // Start from the worker after the last one in the eligible rotation
                startIndex = (lastIndex + 1) % eligibleWorkerIds.length;
            } else {
                // Case: Last assigned worker is now ineligible (on leave or deleted). Start from the beginning.
                startIndex = 0;
            }
        }

        let currentWorkerIndex = startIndex;
        let lastAssignedId = assignmentState.lastAssignedWorkerUser;
        let assignedCount = 0;

        for (const report of reportsToAssign) {
            const workerIdToAssign = eligibleWorkerIds[currentWorkerIndex];
            
            // 4. Perform the assignment
            await Report.findByIdAndUpdate(report._id, {
                $set: { 
                    assignedTo: workerIdToAssign, 
                    status: 'In Progress' // Automatically mark as In Progress when assigned
                }
            });

            lastAssignedId = workerIdToAssign;
            assignedCount++;
            overallAssignedCount++;
            
            // 5. Move to the next worker in the *eligible* list
            currentWorkerIndex = (currentWorkerIndex + 1) % eligibleWorkerIds.length;
        }

        // --- STEP 6: Update State ---
        if (assignedCount > 0) {
            await AssignmentState.updateOne(
                { area: area._id },
                { $set: { lastAssignedWorkerUser: lastAssignedId, lastAssignmentDate: new Date() } }
            );
            console.log(`Area ${area.name}: Assigned ${assignedCount} reports.`);
        }
    }
    
    // Return API response if called via route
    if (res) {
        return res.status(200).send({ message: `Automatic assignment completed. Total reports assigned: ${overallAssignedCount}.` });
    }
};