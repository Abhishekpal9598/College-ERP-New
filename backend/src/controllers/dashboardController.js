const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Attendance = require("../models/Attendance");
const Fee = require("../models/Fee");
const Result = require("../models/Result");
const { successResponse } = require("../utils/apiResponse");

/**
 * Helper to get today's date in YYYY-MM-DD
 */
const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

/**
 * @desc    Get aggregated real-time dashboard statistics from database
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getDashboardStats = async (req, res, next) => {
    try {
        const today = getTodayDate();

        const [
            totalStudents,
            totalTeachers,
            presentToday,
            absentToday,
            feeAggregations,
            recentStudents,
            recentResults
        ] = await Promise.all([
            // Total students count
            Student.countDocuments({ status: "active" }),

            // Total teachers count
            Teacher.countDocuments({ status: "active" }),

            // Present today
            Attendance.countDocuments({ date: today, status: "present" }),

            // Absent today
            Attendance.countDocuments({ date: today, status: "absent" }),

            // Fee stats aggregation
            Fee.aggregate([
                {
                    $group: {
                        _id: null,
                        totalCollected: { $sum: "$paidAmount" },
                        totalPending: { $sum: "$pendingAmount" }
                    }
                }
            ]),

            // 5 Recent students
            Student.find().sort({ createdAt: -1 }).limit(5).select("firstName lastName rollNumber department course createdAt"),

            // 5 Recent results
            Result.find().sort({ createdAt: -1 }).limit(5).populate("student", "firstName lastName rollNumber")
        ]);

        const totalFeeCollected = feeAggregations.length > 0 ? feeAggregations[0].totalCollected : 0;
        const pendingFees = feeAggregations.length > 0 ? feeAggregations[0].totalPending : 0;

        return successResponse(res, 200, "Dashboard statistics fetched successfully", {
            totalStudents,
            totalTeachers,
            presentToday,
            absentToday,
            pendingFees,
            totalFeeCollected,
            recentStudents,
            recentResults
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDashboardStats
};
