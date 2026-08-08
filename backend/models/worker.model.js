const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  // NEW FIELD: Link the worker to the specific area managed by the BBMP staff.
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Area",
    required: true, // Worker must belong to an area/staff group
  },
});

// FINAL FIX: This compound index ensures:
// 1. Worker 'Suresh' can exist in Area 'Peenya' (unique document: { name: 'Suresh', area: 'PeenyaId' }).
WorkerSchema.index({ name: 1, area: 1 }, { unique: true });

// CRITICAL FIX: Register the model globally under the name "Worker" 
// This resolves the Mongoose population error in auth.controller.js when loading WorkerUser.
try {
  mongoose.model("Worker", WorkerSchema);
} catch (error) {
  // Model already exists, which is fine.
}


// MODIFIED: Export a function to create a dynamically named model/collection.
module.exports = (collectionName) => {
  try {
    // Check if the dynamic model is already compiled to prevent Mongoose error
    return mongoose.model(collectionName);
  } catch (e) {
    // Compile and return the new model for the dynamic collection, 
    // explicitly using the dynamic name as the collection name.
    return mongoose.model(collectionName, WorkerSchema, collectionName);
  }
};