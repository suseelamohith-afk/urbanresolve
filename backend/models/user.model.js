const mongoose = require("mongoose");

const CitizenSchema = new mongoose.Schema({
  // CRITICAL FIX: Explicitly define _id as a String to accept the Firebase UID
  _id: { 
    type: String, 
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  aadhaarNumber: {
    type: String,
    required: true,
    unique: true,
  },
  // Citizen model does not need the 'area' field, setting default to null 
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Area",
    default: null, 
  },
  // --- NEW REWARD SYSTEM FIELDS ---
  rewardPoints: { // Points for participation
    type: Number,
    default: 0,
  },
  reportsSubmitted: { // Total reports for quality metrics
    type: Number,
    default: 0,
  },
  // --- END NEW FIELDS ---
}, { 
    // CRITICAL FIX: Set _id to false in schema options
    // This prevents Mongoose from adding its own default ObjectId _id field 
    // and relies entirely on the custom String _id defined above.
    _id: false 
});

// MODIFIED: Rename model to Citizen and enforce collection name 'citizenslogin'
module.exports = mongoose.model("Citizen", CitizenSchema, "citizenslogin");