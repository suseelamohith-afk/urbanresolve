const WorkerLeave = require("../models/workerleave.model");
const { getStaffAreaId } = require("../helpers/user.helper"); // 💡 MODIFIED: Use centralized helper

// Helper function to get the logged-in staff user's area ID (reused from report.controller)
// ❌ REMOVED: Replaced with imported getStaffAreaId

exports.applyWorkerLeave = async (req, res) => {
    try {
        const { workerUserId, startDate, endDate, areaId } = req.body;
        
        // 1. Authorization Check: Ensure BBMP staff is managing the area they are applying leave for
        const staffAreaId = await getStaffAreaId(req.userId);
        if (!staffAreaId || staffAreaId.toString() !== areaId) {
             return res.status(403).send({ message: "Access Denied: You can only manage leave for workers in your assigned area." });
        }
        
        if (!workerUserId || !startDate || !areaId) {
            return res.status(400).send({ message: "Worker ID, Start Date, and Area ID are required." });
        }
        
        const start = new Date(startDate);
        // CRITICAL FIX 1: Set the start date to the very beginning of the day (00:00:00.000)
        start.setHours(0, 0, 0, 0);
        
        // If endDate is null/empty, set it to the same as startDate (single-day leave)
        let end = endDate ? new Date(endDate) : new Date(startDate);
        
        // CRITICAL FIX 2: Set the end date to the very end of the day (23:59:59.999)
        end.setHours(23, 59, 59, 999);
        // END CRITICAL FIXES

        // Ensure dates are valid
        if (start.getTime() > end.getTime()) {
             return res.status(400).send({ message: "End date cannot be before start date." });
        }
        
        // 2. Overlap Check: Check for existing leave that overlaps with the new period
        const existingLeave = await WorkerLeave.findOne({
            workerUser: workerUserId,
            $or: [
                 // Check if any existing leave overlaps with the new period
                 { startDate: { $lte: end }, endDate: { $gte: start } }
            ]
        });

        if (existingLeave) {
            // Include dates in error message for better UX
            return res.status(409).send({ message: `Worker already has overlapping leave recorded from ${existingLeave.startDate.toISOString().slice(0, 10)} to ${existingLeave.endDate.toISOString().slice(0, 10)}.` });
        }
        
        const newLeave = new WorkerLeave({
            workerUser: workerUserId,
            startDate: start,
            endDate: end,
            area: areaId,
        });

        await newLeave.save();
        res.status(201).send({ message: "Worker leave recorded successfully!" });

    } catch (err) {
        if (err.message.includes("service area")) {
            return res.status(403).send({ message: "Access Denied: Must be a BBMP staff member." });
        }
        res.status(500).send({ message: err.message });
    }
};

// NEW FUNCTION: Get all leaves for the staff's assigned area (Feature C)
exports.getWorkerLeaves = async (req, res) => {
    try {
        const staffAreaId = await getStaffAreaId(req.userId); // Ensure user is BBMP staff
        
        if (!staffAreaId) {
            // If user is authenticated but not assigned an area, return empty array.
            return res.status(200).json([]);
        }

        // Fetch all leaves that belong to the staff's area and are active or upcoming (end date is in the future or today)
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        const leaves = await WorkerLeave.find({
            area: staffAreaId,
            endDate: { $gte: currentDate } // Only show current and future leaves
        }).sort({ startDate: 1 });

        if (leaves.length === 0) {
            return res.status(200).json([]);
        }

        res.status(200).json(leaves);

    } catch (err) {
        if (err.message.includes("service area") || err.message.includes("not found")) {
            return res.status(403).send({ message: "Access Denied: You must be a BBMP staff member assigned to an area." });
        }
        res.status(500).send({ message: err.message });
    }
};