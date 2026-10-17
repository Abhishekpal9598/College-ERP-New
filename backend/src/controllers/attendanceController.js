const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const TeacherAttendance = require("../models/TeacherAttendance");
const { successResponse, errorResponse } = require("../utils/apiResponse");


/**
 * @desc    Get attendance records with filtering
 * @route   GET /api/attendance
 * @access  Private
 */
const getAttendance = async (req, res, next) => {
    try {
        if (req.query.userType === "teacher" || req.query.type === "teacher") {
            return getTeacherAttendance(req, res, next);
        }

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
        if (req.body.teacher || (Array.isArray(req.body.batch) && req.body.batch[0] && req.body.batch[0].teacher)) {
            return recordTeacherAttendance(req, res, next);
        }

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

/**
 * @desc    Get teacher attendance records with filtering
 * @route   GET /api/attendance/teachers
 * @access  Private
 */
const getTeacherAttendance = async (req, res, next) => {
    try {
        const { date, teacher, status } = req.query;

        const query = {};

        if (date) query.date = date;
        if (teacher) query.teacher = teacher;
        if (status) query.status = status;

        const records = await TeacherAttendance.find(query)
            .populate("teacher", "firstName lastName teacherId department subject email phone")
            .sort({ date: -1 });

        return successResponse(res, 200, "Teacher attendance records fetched successfully", records);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Record teacher attendance (single or batch with atomic upsert)
 * @route   POST /api/attendance/teachers
 * @access  Private
 */
const recordTeacherAttendance = async (req, res, next) => {
    try {
        const { teacher, date, status, remarks, batch } = req.body;

        // Batch attendance recording support with atomic upsert
        if (Array.isArray(batch) && batch.length > 0) {
            for (const item of batch) {
                if (!item.teacher || !item.date || !item.status) {
                    return errorResponse(res, 400, "Teacher, date, and status are required for each batch item.");
                }
                if (!["present", "absent", "leave"].includes(item.status)) {
                    return errorResponse(res, 400, "Status must be present, absent, or leave.");
                }
            }

            const operations = batch.map(item => ({
                updateOne: {
                    filter: {
                        teacher: item.teacher,
                        date: item.date
                    },
                    update: {
                        $set: {
                            status: item.status,
                            remarks: item.remarks || ""
                        }
                    },
                    upsert: true
                }
            }));

            const bulkResult = await TeacherAttendance.bulkWrite(operations);
            return successResponse(res, 201, "Teacher batch attendance saved successfully", bulkResult);
        }

        // Single attendance recording
        if (!teacher || !date || !status) {
            return errorResponse(res, 400, "Teacher, date, and status are required.");
        }

        if (!["present", "absent", "leave"].includes(status)) {
            return errorResponse(res, 400, "Status must be present, absent, or leave.");
        }

        const teacherExists = await Teacher.findById(teacher);
        if (!teacherExists) {
            return errorResponse(res, 404, "Teacher not found.");
        }

        // Atomic upsert: updates existing record or creates a new one
        const record = await TeacherAttendance.findOneAndUpdate(
            { teacher, date },
            { $set: { status, remarks: remarks || "" } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        ).populate("teacher", "firstName lastName teacherId department subject");

        return successResponse(res, 201, "Teacher attendance recorded successfully", record);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Update single teacher attendance record
 * @route   PUT /api/attendance/teachers/record/:id
 * @access  Private
 */
const updateTeacherAttendance = async (req, res, next) => {
    try {
        const record = await TeacherAttendance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate("teacher", "firstName lastName teacherId department subject");

        if (!record) {
            return errorResponse(res, 404, "Teacher attendance record not found");
        }

        return successResponse(res, 200, "Teacher attendance updated successfully", record);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get attendance history & stats for a specific teacher
 * @route   GET /api/attendance/teachers/:teacherId
 * @access  Private
 */
const getSingleTeacherAttendanceHistory = async (req, res, next) => {
    try {
        const { teacherId } = req.params;

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return errorResponse(res, 404, "Teacher not found");
        }

        const records = await TeacherAttendance.find({ teacher: teacherId }).sort({ date: -1 });

        const totalDays = records.length;
        const presentCount = records.filter(r => r.status === "present").length;
        const absentCount = records.filter(r => r.status === "absent").length;
        const leaveCount = records.filter(r => r.status === "leave").length;

        const attendancePercentage = totalDays > 0
            ? Number(((presentCount / totalDays) * 100).toFixed(2))
            : 0;

        return successResponse(res, 200, "Teacher attendance retrieved successfully", {
            teacher: {
                id: teacher._id,
                name: teacher.fullName,
                teacherId: teacher.teacherId,
                department: teacher.department,
                subject: teacher.subject
            },
            summary: {
                totalDays,
                presentCount,
                absentCount,
                leaveCount,
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
    getStudentAttendance,
    getTeacherAttendance,
    recordTeacherAttendance,
    updateTeacherAttendance,
    getSingleTeacherAttendanceHistory
};
