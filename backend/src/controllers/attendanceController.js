const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const { successResponse, errorResponse } = require("../utils/apiResponse");

/**
 * @desc    Get attendance records with filtering
 * @route   GET /api/attendance
 * @access  Private
 */
const getAttendance = async (req, res, next) => {
    try {
        const { date, subject, semester, section, status, student } = req.query;

        const query = {};

        if (date) query.date = date;
        if (subject) query.subject = new RegExp(`^${subject}$`, "i");
        if (semester) query.semester = Number(semester);
        if (section) query.section = section.toUpperCase();
        if (status) query.status = status;
        if (student) query.student = student;

        const records = await Attendance.find(query)
            .populate("student", "firstName lastName rollNumber studentId department course section")
            .sort({ date: -1, "student.rollNumber": 1 });

        return successResponse(res, 200, "Attendance records fetched successfully", records);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Record attendance (single or batch)
 * @route   POST /api/attendance
 * @access  Private
 */
const recordAttendance = async (req, res, next) => {
    try {
        const { student, date, status, subject, semester, section, remarks, batch } = req.body;

        // Batch attendance recording support
        if (Array.isArray(batch) && batch.length > 0) {
            const operations = batch.map(item => ({
                updateOne: {
                    filter: {
                        student: item.student,
                        date: item.date,
                        subject: item.subject
                    },
                    update: {
                        $set: {
                            status: item.status,
                            semester: item.semester,
                            section: item.section,
                            remarks: item.remarks
                        }
                    },
                    upsert: true
                }
            }));

            const bulkResult = await Attendance.bulkWrite(operations);
            return successResponse(res, 201, "Batch attendance saved successfully", bulkResult);
        }

        // Single attendance recording with duplicate prevention
        if (!student || !date || !status || !subject) {
            return errorResponse(res, 400, "Student, date, status, and subject are required.");
        }

        // Verify student exists
        const studentExists = await Student.findById(student);
        if (!studentExists) {
            return errorResponse(res, 404, "Student not found.");
        }

        const existingRecord = await Attendance.findOne({
            student,
            date,
            subject: subject.trim()
        });

        if (existingRecord) {
            return errorResponse(res, 409, `Attendance for student on date ${date} for subject '${subject}' already exists. Use PUT to update.`);
        }

        const record = await Attendance.create({
            student,
            date,
            status,
            subject: subject.trim(),
            semester: semester || studentExists.semester,
            section: section || studentExists.section,
            remarks
        });

        return successResponse(res, 201, "Attendance recorded successfully", record);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Update single attendance record
 * @route   PUT /api/attendance/:id
 * @access  Private
 */
const updateAttendance = async (req, res, next) => {
    try {
        const record = await Attendance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate("student", "firstName lastName rollNumber");

        if (!record) {
            return errorResponse(res, 404, "Attendance record not found");
        }

        return successResponse(res, 200, "Attendance updated successfully", record);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get attendance history & stats for a specific student
 * @route   GET /api/attendance/student/:studentId
 * @access  Private
 */
const getStudentAttendance = async (req, res, next) => {
    try {
        const { studentId } = req.params;

        const student = await Student.findById(studentId);
        if (!student) {
            return errorResponse(res, 404, "Student not found");
        }

        const records = await Attendance.find({ student: studentId }).sort({ date: -1 });

        const totalClasses = records.length;
        const presentCount = records.filter(r => r.status === "present").length;
        const absentCount = records.filter(r => r.status === "absent").length;
        const lateCount = records.filter(r => r.status === "late").length;

        const attendancePercentage = totalClasses > 0
            ? Number(((presentCount / totalClasses) * 100).toFixed(2))
            : 0;

        return successResponse(res, 200, "Student attendance retrieved successfully", {
            student: {
                id: student._id,
                name: student.fullName,
                rollNumber: student.rollNumber,
                department: student.department,
                semester: student.semester
            },
            summary: {
                totalClasses,
                presentCount,
                absentCount,
                lateCount,
                attendancePercentage
            },
            records
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAttendance,
    recordAttendance,
    updateAttendance,
    getStudentAttendance
};
