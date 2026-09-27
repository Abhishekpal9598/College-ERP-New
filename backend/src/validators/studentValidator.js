/**
 * Student Module Input Validators
 */
const { body, query, param } = require("express-validator");

const createStudentValidation = [
    body("studentId")
        .notEmpty().withMessage("Student ID is required")
        .trim()
        .isLength({ min: 2, max: 30 }).withMessage("Student ID must be between 2 and 30 characters"),
    body("rollNumber")
        .notEmpty().withMessage("Roll number is required")
        .trim()
        .isLength({ min: 2, max: 30 }).withMessage("Roll number must be between 2 and 30 characters"),
    body("firstName")
        .notEmpty().withMessage("First name is required")
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage("First name must be between 1 and 50 characters"),
    body("lastName")
        .notEmpty().withMessage("Last name is required")
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage("Last name must be between 1 and 50 characters"),
    body("email")
        .notEmpty().withMessage("Email is required")
        .trim()
        .isEmail().withMessage("Valid email is required")
        .normalizeEmail()
        .isLength({ max: 100 }).withMessage("Email cannot exceed 100 characters"),
    body("course")
        .notEmpty().withMessage("Course is required")
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage("Course must be between 2 and 50 characters"),
    body("department")
        .notEmpty().withMessage("Department is required")
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage("Department must be between 2 and 50 characters"),
    body("semester")
        .notEmpty().withMessage("Semester is required")
        .isInt({ min: 1, max: 12 }).withMessage("Semester must be an integer between 1 and 12")
        .toInt(),
    body("section")
        .optional()
        .trim()
        .isLength({ min: 1, max: 10 }).withMessage("Section cannot exceed 10 characters"),
    body("phone")
        .optional()
        .trim()
        .matches(/^[0-9+\-\s]{7,20}$/).withMessage("Phone number contains invalid characters"),
    body("gender")
        .optional()
        .isIn(["male", "female", "other"]).withMessage("Gender must be 'male', 'female', or 'other'")
];

const updateStudentValidation = [
    param("id")
        .isMongoId().withMessage("Invalid student ID format"),
    body("studentId")
        .optional()
        .trim()
        .isLength({ min: 2, max: 30 }).withMessage("Student ID must be between 2 and 30 characters"),
    body("rollNumber")
        .optional()
        .trim()
        .isLength({ min: 2, max: 30 }).withMessage("Roll number must be between 2 and 30 characters"),
    body("firstName")
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage("First name must be between 1 and 50 characters"),
    body("lastName")
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 }).withMessage("Last name must be between 1 and 50 characters"),
    body("email")
        .optional()
        .trim()
        .isEmail().withMessage("Valid email is required")
        .normalizeEmail()
        .isLength({ max: 100 }).withMessage("Email cannot exceed 100 characters"),
    body("course")
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage("Course must be between 2 and 50 characters"),
    body("department")
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage("Department must be between 2 and 50 characters"),
    body("semester")
        .optional()
        .isInt({ min: 1, max: 12 }).withMessage("Semester must be an integer between 1 and 12")
        .toInt(),
    body("section")
        .optional()
        .trim()
        .isLength({ min: 1, max: 10 }).withMessage("Section cannot exceed 10 characters"),
    body("phone")
        .optional()
        .trim()
        .matches(/^[0-9+\-\s]{7,20}$/).withMessage("Phone number contains invalid characters"),
    body("gender")
        .optional()
        .isIn(["male", "female", "other"]).withMessage("Gender must be 'male', 'female', or 'other'")
];

module.exports = {
    createStudentValidation,
    updateStudentValidation
};
