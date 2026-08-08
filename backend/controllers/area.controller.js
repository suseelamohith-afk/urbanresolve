// File: area.controller.js

const Area = require("../models/area.model");
const BBMPStaff = require("../models/bbmpstaff.model");
const Report = require("../models/report.model");
const WorkerUser = require("../models/workeruser.model");
const WorkerLeave = require("../models/workerleave.model");
const AssignmentState = require("../models/assignmentstate.model");
const { getWorkerModelForArea } = require("../helpers/user.helper"); // Utility to get dynamic worker model
const mongoose = require('mongoose'); // Need mongoose for dynamic model access

// Helper function to normalize area name for deterministic collection names
function cleanAreaName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Get all areas
exports.getAreas = async (req, res) => {
  try {
    const areas = await Area.find().sort({ name: 1 });
    res.status(200).json(areas);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Add a new area (Admin only)
exports.addArea = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).send({ message: "Area name is required." });
    }

    const newArea = new Area({ name });
    await newArea.save();
    res.status(201).send({ message: "Area added successfully!", area: newArea });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).send({ message: "Area already exists." });
    }
    res.status(500).send({ message: err.message });
  }
};

// CRITICALLY MODIFIED: Remove an area (Admin only) and cascade delete all related data
exports.removeArea = async (req, res) => {
  try {
    const { id: areaId } = req.params;

    // 1. Find the Area document to get its name for dynamic worker collection deletion
    const area = await Area.findById(areaId).select('name');
    if (!area) {
      return res.status(404).send({ message: "Area not found." });
    }
    const areaName = area.name;

    // --- Start Cascading Deletion ---

    // 2. Delete all BBMP Staff assigned to this area
    await BBMPStaff.deleteMany({ area: areaId });
    console.log(`Deleted BBMP Staff in Area ${areaName}.`);

    // 3. Delete all Reports filed under this area
    await Report.deleteMany({ area: areaId });
    console.log(`Deleted Reports in Area ${areaName}.`);
    
    // 4. Delete the dynamic worker collection documents for this area
    const DynamicWorkerModel = getWorkerModelForArea(areaName);
    
    // a. Get all Worker Document IDs in this area to look up their User accounts
    const workerDocuments = await DynamicWorkerModel.find({ area: areaId }).select('_id');
    const workerDocumentIds = workerDocuments.map(doc => doc._id);

    // b. Delete Worker User accounts that reference these worker documents
    await WorkerUser.deleteMany({ area: { $in: workerDocumentIds } });
    console.log(`Deleted Worker Users associated with Area ${areaName}.`);

    // c. Delete Worker Leaves associated with this area
    await WorkerLeave.deleteMany({ area: areaId });
    console.log(`Deleted Worker Leaves in Area ${areaName}.`);
    
    // d. Delete the Worker Documents (from the dynamic collection)
    // Note: This only deletes the documents, not the collection itself.
    await DynamicWorkerModel.deleteMany({ area: areaId }); 
    console.log(`Deleted Worker Documents in dynamic collection 'worker${cleanAreaName(areaName)}'.`);

    // e. CRITICAL FIX: Explicitly drop the dynamic collection
    // This removes the 'workersahakarnagar' entry from MongoDB.
    try {
        await DynamicWorkerModel.collection.drop();
        console.log(`CRITICAL FIX: Dropped dynamic collection 'worker${cleanAreaName(areaName)}'.`);
    } catch (e) {
        // Ignore "collection not found" error, which might happen if the area was empty
        if (e.codeName !== 'NamespaceNotFound') {
             throw e;
        }
    }
    
    // 5. Delete the Assignment State document for this area
    await AssignmentState.deleteOne({ area: areaId });
    console.log(`Deleted Assignment State for Area ${areaName}.`);
    
    // 6. Delete the Area document itself (Final step)
    const result = await Area.findByIdAndDelete(areaId);

    // --- End Cascading Deletion ---
    
    if (!result) {
      return res.status(500).send({ message: "Area document deletion failed unexpectedly." });
    }

    res.status(200).send({ message: `Area '${areaName}' and all associated data removed successfully!` });
  } catch (err) {
    console.error("Error during cascade deletion of area:", err);
    res.status(500).send({ message: `An error occurred during deletion: ${err.message}` });
  }
};