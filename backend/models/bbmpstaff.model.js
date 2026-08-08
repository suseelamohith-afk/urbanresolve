const mongoose = require("mongoose");
const UserSchema = require("./user.model").schema; // Base schema for fields

const BBMPStaffSchema = new mongoose.Schema({
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
  
  // Specific BBMP field: area links staff to their managed Area ID or Worker ID
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Area",
    required: true, 
  },
}, { 
    // CRITICAL FIX: Set _id to false in schema options
    _id: false 
});

// The collection name will implicitly be 'bbmpstaff' or defined via plugin
module.exports = mongoose.model("BBMPStaff", BBMPStaffSchema, "bbmplogin");