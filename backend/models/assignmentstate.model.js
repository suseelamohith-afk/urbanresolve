const mongoose = require("mongoose");

const AssignmentStateSchema = new mongoose.Schema({
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
    required: true,
    unique: true, // Only one state document per area
  },
  lastAssignedWorkerUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkerUser',
    default: null,
  },
  
  // NEW FIELD: Counter for generating unique report IDs (resets daily)
  reportCounter: {
    type: Number,
    default: 0,
  },
  
  lastAssignmentDate: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model("AssignmentState", AssignmentStateSchema, "assignmentstates");