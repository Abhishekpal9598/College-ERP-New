const Result = require("../models/Result");
const Student = require("../models/Student");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { calculateGrade, calculatePercentage } = require("../services/gradeService");

/**
 * @desc    Get all results with filtering
 * @route   GET /api/results
 * @access  Private
 */
const getResults = async (req, res, next) => {
    try {
        const { student, semester, subject, examType, academicYear } = req.query;

        const query = {};
        if (student) query.student = student;
        if (semester) query.semester = Number(semester);
        if (subject) query.subject = new RegExp(subject, "i");
        if (examType) query.examType = examType;
        if (academicYear) query.academicYear = academicYear;

        const results = await Result.find(query)
            .populate("student", "firstName lastName rollNumber studentId department course section")
            .sort({ semester: 1, subject: 1 });

        return successResponse(res, 200, "Results fetched successfully", results);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get academic report card & results for a specific student
 * @route   GET /api/results/student/:studentId
 * @access  Private
 */
const getStudentResults = async (req, res, next) => {
    try {
        const { studentId } = req.params;

        const student = await Student.findById(studentId);
        if (!student) {
            return errorResponse(res, 404, "Student not found");
        }

        const results = await Result.find({ student: studentId }).sort({ semester: 1, subject: 1 });

        const totalSubjects = results.length;
        const totalMarksObtained = results.reduce((sum, r) => sum + (r.marks || 0), 0);
        const totalMaxMarks = results.reduce((sum, r) => sum + (r.maxMarks || 100), 0);

        const overallPercentage = totalMaxMarks > 0
            ? Number(((totalMarksObtained / totalMaxMarks) * 100).toFixed(2))
            : 0;

        const overallGrade = calculateGrade(totalMarksObtained, totalMaxMarks || 100);

        return successResponse(res, 200, "Student academic results retrieved successfully", {
            student: {
                id: student._id,
                name: student.fullName,
                rollNumber: student.rollNumber,
                department: student.department,
                semester: student.semester
            },
            summary: {
                totalSubjects,
                totalMarksObtained,
                totalMaxMarks,
                overallPercentage,
                overallGrade
            },
            results
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Create new result entry
 * @route   POST /api/results
 * @access  Private
 */
const createResult = async (req, res, next) => {
    try {
        const { student, marks, maxMarks = 100, subject, semester } = req.body;

        const studentExists = await Student.findById(student);
        if (!studentExists) {
            return errorResponse(res, 404, "Student not found");
        }

        const numMarks = Number(marks);
        const numMaxMarks = Number(maxMarks);

        if (isNaN(numMarks) || isNaN(numMaxMarks) || numMarks < 0 || numMaxMarks <= 0) {
            return errorResponse(res, 400, "Invalid marks values. Marks cannot be negative and maxMarks must be positive.");
        }

        if (numMarks > numMaxMarks) {
            return errorResponse(res, 400, `Marks obtained (${numMarks}) cannot exceed maximum marks (${numMaxMarks}).`);
        }

        const result = await Result.create(req.body);
        return successResponse(res, 201, "Result recorded successfully", result);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Update result entry
 * @route   PUT /api/results/:id
 * @access  Private
 */
const updateResult = async (req, res, next) => {
    try {
        const result = await Result.findById(req.params.id);

        if (!result) {
            return errorResponse(res, 404, "Result not found");
        }

        const updatedMarks = req.body.marks !== undefined ? Number(req.body.marks) : result.marks;
        const updatedMaxMarks = req.body.maxMarks !== undefined ? Number(req.body.maxMarks) : result.maxMarks;

        if (updatedMarks > updatedMaxMarks) {
            return errorResponse(res, 400, `Marks (${updatedMarks}) cannot exceed maximum marks (${updatedMaxMarks}).`);
        }

        Object.assign(result, req.body);
        await result.save();

        return successResponse(res, 200, "Result updated successfully", result);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Delete result record
 * @route   DELETE /api/results/:id
 * @access  Private
 */
const deleteResult = async (req, res, next) => {
    try {
        const result = await Result.findByIdAndDelete(req.params.id);

        if (!result) {
            return errorResponse(res, 404, "Result not found");
        }

        return successResponse(res, 200, "Result deleted successfully", { id: req.params.id });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getResults,
    getStudentResults,
    createResult,
    updateResult,
    deleteResult
};

