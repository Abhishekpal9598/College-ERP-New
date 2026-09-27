const Student = require("../models/Student");
const { successResponse, errorResponse } = require("../utils/apiResponse");

/**
 * @desc    Get all students with search, filters and pagination
 * @route   GET /api/students
 * @access  Private
 */
const getStudents = async (req, res, next) => {
    try {
        const {
            search,
            department,
            course,
            semester,
            section,
            status,
            feeStatus,
            page = 1,
            limit = 10,
            sort = "-createdAt"
        } = req.query;

        const query = {};

        // Filtering
        if (department) query.department = new RegExp(`^${department}$`, "i");
        if (course) query.course = new RegExp(`^${course}$`, "i");
        if (semester) query.semester = Number(semester);
        if (section) query.section = section.toUpperCase();
        if (status) query.status = status;
        if (feeStatus) query.feeStatus = feeStatus;

        // Search across fields
        if (search) {
            const searchRegex = new RegExp(search.trim(), "i");
            query.$or = [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { rollNumber: searchRegex },
                { studentId: searchRegex },
                { email: searchRegex }
            ];
        }

        const pageNumber = Math.max(1, parseInt(page, 10));
        const pageSize = Math.max(1, parseInt(limit, 10));
        const skip = (pageNumber - 1) * pageSize;

        const [students, total] = await Promise.all([
            Student.find(query).sort(sort).skip(skip).limit(pageSize),
            Student.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / pageSize);

        return successResponse(
            res,
            200,
            "Students fetched successfully",
            students,
            {
                total,
                page: pageNumber,
                limit: pageSize,
                totalPages
            }
        );
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get single student by ID
 * @route   GET /api/students/:id
 * @access  Private
 */
const getStudentById = async (req, res, next) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return errorResponse(res, 404, "Student not found");
        }

        return successResponse(res, 200, "Student details fetched successfully", student);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Create new student
 * @route   POST /api/students
 * @access  Private
 */
const createStudent = async (req, res, next) => {
    try {
        const { studentId, rollNumber, email } = req.body;

        // Duplicate checks
        const existingStudent = await Student.findOne({
            $or: [
                { studentId: studentId.trim() },
                { rollNumber: rollNumber.trim() },
                { email: email.toLowerCase().trim() }
            ]
        });

        if (existingStudent) {
            let duplicateField = "Student";
            if (existingStudent.studentId === studentId.trim()) duplicateField = "Student ID";
            else if (existingStudent.rollNumber === rollNumber.trim()) duplicateField = "Roll Number";
            else if (existingStudent.email === email.toLowerCase().trim()) duplicateField = "Email";

            return errorResponse(res, 409, `${duplicateField} already exists.`);
        }

        const student = await Student.create(req.body);
        return successResponse(res, 201, "Student created successfully", student);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Update student
 * @route   PUT /api/students/:id
 * @access  Private
 */
const updateStudent = async (req, res, next) => {
    try {
        const { studentId, rollNumber, email } = req.body;

        // Duplicate checks on update
        if (studentId || rollNumber || email) {
            const conflictQuery = {
                _id: { $ne: req.params.id },
                $or: []
            };
            if (studentId) conflictQuery.$or.push({ studentId: studentId.trim() });
            if (rollNumber) conflictQuery.$or.push({ rollNumber: rollNumber.trim() });
            if (email) conflictQuery.$or.push({ email: email.toLowerCase().trim() });

            if (conflictQuery.$or.length > 0) {
                const conflict = await Student.findOne(conflictQuery);
                if (conflict) {
                    return errorResponse(res, 409, "Duplicate studentId, rollNumber, or email with another student.");
                }
            }
        }

        const student = await Student.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!student) {
            return errorResponse(res, 404, "Student not found");
        }

        return successResponse(res, 200, "Student updated successfully", student);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Delete student
 * @route   DELETE /api/students/:id
 * @access  Private
 */
const deleteStudent = async (req, res, next) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);

        if (!student) {
            return errorResponse(res, 404, "Student not found");
        }

        return successResponse(res, 200, "Student deleted successfully", { id: req.params.id });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent
};
