const Teacher = require("../models/Teacher");
const { successResponse, errorResponse } = require("../utils/apiResponse");

/**
 * @desc    Get all teachers with search, filters and pagination
 * @route   GET /api/teachers
 * @access  Private
 */
const getTeachers = async (req, res, next) => {
    try {
        const {
            search,
            department,
            subject,
            status,
            page = 1,
            limit = 10,
            sort = "firstName"
        } = req.query;

        const query = {};

        if (department) query.department = new RegExp(`^${department}$`, "i");
        if (subject) query.subject = new RegExp(subject, "i");
        if (status) query.status = status;

        if (search) {
            const searchRegex = new RegExp(search.trim(), "i");
            query.$or = [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { teacherId: searchRegex },
                { email: searchRegex },
                { subject: searchRegex },
                { department: searchRegex }
            ];
        }

        const pageNumber = Math.max(1, parseInt(page, 10));
        const pageSize = Math.max(1, parseInt(limit, 10));
        const skip = (pageNumber - 1) * pageSize;

        const [teachers, total] = await Promise.all([
            Teacher.find(query).sort(sort).skip(skip).limit(pageSize),
            Teacher.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / pageSize);

        return successResponse(
            res,
            200,
            "Teachers fetched successfully",
            teachers,
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
 * @desc    Get single teacher by ID
 * @route   GET /api/teachers/:id
 * @access  Private
 */
const getTeacherById = async (req, res, next) => {
    try {
        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return errorResponse(res, 404, "Teacher not found");
        }

        return successResponse(res, 200, "Teacher details fetched successfully", teacher);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Create new teacher
 * @route   POST /api/teachers
 * @access  Private
 */
const createTeacher = async (req, res, next) => {
    try {
        const { teacherId, email } = req.body;

        const existing = await Teacher.findOne({
            $or: [
                { teacherId: teacherId.trim() },
                { email: email.toLowerCase().trim() }
            ]
        });

        if (existing) {
            const field = existing.teacherId === teacherId.trim() ? "Teacher ID" : "Email";
            return errorResponse(res, 409, `${field} already exists.`);
        }

        const teacher = await Teacher.create(req.body);
        return successResponse(res, 201, "Teacher created successfully", teacher);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Update teacher
 * @route   PUT /api/teachers/:id
 * @access  Private
 */
const updateTeacher = async (req, res, next) => {
    try {
        const { teacherId, email } = req.body;

        if (teacherId || email) {
            const conflictQuery = {
                _id: { $ne: req.params.id },
                $or: []
            };
            if (teacherId) conflictQuery.$or.push({ teacherId: teacherId.trim() });
            if (email) conflictQuery.$or.push({ email: email.toLowerCase().trim() });

            if (conflictQuery.$or.length > 0) {
                const conflict = await Teacher.findOne(conflictQuery);
                if (conflict) {
                    return errorResponse(res, 409, "Duplicate teacherId or email with another teacher.");
                }
            }
        }

        const teacher = await Teacher.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!teacher) {
            return errorResponse(res, 404, "Teacher not found");
        }

        return successResponse(res, 200, "Teacher updated successfully", teacher);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Delete teacher
 * @route   DELETE /api/teachers/:id
 * @access  Private
 */
const deleteTeacher = async (req, res, next) => {
    try {
        const teacher = await Teacher.findByIdAndDelete(req.params.id);

        if (!teacher) {
            return errorResponse(res, 404, "Teacher not found");
        }

        return successResponse(res, 200, "Teacher deleted successfully", { id: req.params.id });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getTeachers,
    getTeacherById,
    createTeacher,
    updateTeacher,
    deleteTeacher
};
