const mongoose = require("mongoose");

const WorkerLeaveSchema = new mongoose.Schema({
  workerUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkerUser', // Reference to the actual login user
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  area: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area', // Area the worker belongs to
    required: true,
  },
}, { timestamps: true });

// Compound index to quickly check for existing/overlapping leaves for a specific worker
WorkerLeaveSchema.index({ workerUser: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model("WorkerLeave", WorkerLeaveSchema, "workerleaves");