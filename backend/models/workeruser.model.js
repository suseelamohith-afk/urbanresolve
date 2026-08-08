const mongoose = require("mongoose");
const UserSchema = require("./user.model").schema; // Base schema for fields

const WorkerUserSchema = new mongoose.Schema({
  // CRITICAL FIX: Explicitly define _id as a String and disable Mongoose default _id
  _id: { 
    type: String, 
    required: true,
  },
  // Inherit common fields
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  aadhaarNumber: { type: String, required: true, unique: true },

  // Specific Worker field: links worker to their Worker document ID
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Worker", // Worker's User entry points to the Worker Document
    required: true, 
  },
  // CRITICAL FIX: Add direct Area ID reference to bypass inefficient lookup
  areaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Area",
    required: false, // Can be null until first provisioning
  },
  // --- NEW REWARD SYSTEM FIELDS ---
  resolvedReportsCount: { // Replaces the old frontend-calculated resolved count
    type: Number,
    default: 0,
  },
  resolutionPoints: { // Points for efficiency/speed
    type: Number,
    default: 0,
  }
  // --- END NEW FIELDS ---
}, { 
    // CRITICAL FIX: Set _id to false in schema options
    _id: false 
});

// The collection name will implicitly be 'workerusers' or defined via plugin
module.exports = mongoose.model("WorkerUser", WorkerUserSchema, "workerlogin");