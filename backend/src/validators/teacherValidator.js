/**
 * Teacher Module Input Validators
 */
const { body, param } = require("express-validator");

const createTeacherValidation = [
    body("teacherId")
        .notEmpty().withMessage("Teacher ID is required")
        .trim()
        .isLength({ min: 2, max: 30 }).withMessage("Teacher ID must be between 2 and 30 characters"),
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
    body("department")
        .notEmpty().withMessage("Department is required")
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage("Department must be between 2 and 50 characters"),
    body("subject")
        .notEmpty().withMessage("Subject is required")
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage("Subject must be between 2 and 50 characters"),
    body("designation")
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage("Designation cannot exceed 50 characters"),
    body("phone")
        .optional()
        .trim()
        .matches(/^[0-9+\-\s]{7,20}$/).withMessage("Phone number contains invalid characters")
];

const updateTeacherValidation = [
    param("id")
        .isMongoId().withMessage("Invalid teacher ID format"),
    body("teacherId")
        .optional()
        .trim()
        .isLength({ min: 2, max: 30 }).withMessage("Teacher ID must be between 2 and 30 characters"),
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
    body("department")
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage("Department must be between 2 and 50 characters"),
    body("subject")
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage("Subject must be between 2 and 50 characters"),
    body("designation")
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage("Designation cannot exceed 50 characters"),
    body("phone")
        .optional()
        .trim()
        .matches(/^[0-9+\-\s]{7,20}$/).withMessage("Phone number contains invalid characters")
];

module.exports = {
    createTeacherValidation,
    updateTeacherValidation
};
