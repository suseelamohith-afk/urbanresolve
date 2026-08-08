const BBMPStaff = require("../models/bbmpstaff.model");
const WorkerUser = require("../models/workeruser.model");
const Area = require("../models/area.model");
const WorkerModelFactory = require("../models/worker.model");

// Helper function to normalize area name for deterministic collection names
function cleanAreaName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds the Area ObjectId associated with a BBMP Staff or Worker User.
 * * * * @param {string} userId - The ObjectId/UID of the logged-in user.
 * @returns {Promise<mongoose.Types.ObjectId | null>} The Area ObjectId, or null if not found/assigned.
 */
exports.getStaffAreaId = async (userId) => {
    // 1. Check BBMP Staff (bbmplogin)
    let staffUser = await BBMPStaff.findById(userId).select('area');
    
    if (staffUser && staffUser.area) {
        return staffUser.area._id;
    }
    
    // 2. Check WorkerUser (workerlogin)
    let workerUser = await WorkerUser.findById(userId).select('area'); // workerUser.area is the Worker Document ID
    
    if (workerUser && workerUser.area) {
         const workerDocumentId = workerUser.area;
         
         // Inefficient but necessary lookup: Iterate through all Areas
         const allAreas = await Area.find().select('name');
         
         for (const area of allAreas) {
             const cleanedName = cleanAreaName(area.name);
             const collectionName = `worker${cleanedName}`;
             
             // Use the dynamic factory to query the specific worker collection
             const DynamicWorkerModel = WorkerModelFactory(collectionName);
             
             const workerDocument = await DynamicWorkerModel.findById(workerDocumentId).select('area'); // workerDocument.area is the Area ID
             
             if (workerDocument) {
                  // Found the Worker Document. Return the Area ID it belongs to.
                  return workerDocument.area; 
             }
         }
    }
    
    // 3. CRITICAL ADDITION: Check Citizen (citizenslogin)
    // Citizens won't have an area to return, but we check if they exist 
    // to prevent errors in other controllers (e.g., getting my-reports)
    const Citizen = require('../models/user.model'); // Local import to avoid circular dependency
    let citizenUser = await Citizen.findById(userId).select('-password');
    if (citizenUser) {
        // Citizen doesn't have an assigned area ID, but we confirm existence.
        // Throwing the error below if only a Citizen exists is correct for functions like getStaffAreaId.
        // We ensure the findById still works.
    }

    throw new Error("User is not assigned to a service area or user not found.");
}

/**
 * Gets the dynamic Worker Model based on area name (used internally by other controllers).
 */
exports.getWorkerModelForArea = (areaName) => {
    const cleanedName = cleanAreaName(areaName);
    const collectionName = `worker${cleanedName}`;
    return WorkerModelFactory(collectionName);
}