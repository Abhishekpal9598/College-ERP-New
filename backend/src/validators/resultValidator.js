/**
 * Result Module Input Validators
 */
const { body, param, query } = require("express-validator");

const createResultValidation = [
    body("student")
        .notEmpty().withMessage("Student ID is required")
        .isMongoId().withMessage("Invalid student MongoDB ID"),
    body("subject")
        .notEmpty().withMessage("Subject is required")
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage("Subject must be between 1 and 100 characters"),
    body("semester")
        .notEmpty().withMessage("Semester is required")
        .isInt({ min: 1, max: 12 }).withMessage("Semester must be an integer between 1 and 12")
        .toInt(),
    body("marks")
        .notEmpty().withMessage("Marks are required")
        .isFloat({ min: 0 }).withMessage("Marks must be a positive number or zero")
        .toFloat(),
    body("maxMarks")
        .optional()
        .isFloat({ min: 1 }).withMessage("Max marks must be greater than 0")
        .toFloat(),
    body("examType")
        .optional()
        .isIn(["midterm", "final", "quiz", "practical", "assignment"]).withMessage("Exam type must be midterm, final, quiz, practical, or assignment"),
    body("academicYear")
        .optional()
        .trim()
        .isLength({ max: 20 }).withMessage("Academic year cannot exceed 20 characters")
];

const updateResultValidation = [
    param("id")
        .isMongoId().withMessage("Invalid result ID format"),
    body("marks")
        .optional()
        .isFloat({ min: 0 }).withMessage("Marks must be a positive number or zero")
        .toFloat(),
    body("maxMarks")
        .optional()
        .isFloat({ min: 1 }).withMessage("Max marks must be greater than 0")
        .toFloat(),
    body("subject")
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage("Subject must be between 1 and 100 characters"),
    body("examType")
        .optional()
        .isIn(["midterm", "final", "quiz", "practical", "assignment"]).withMessage("Exam type must be midterm, final, quiz, practical, or assignment")
];

module.exports = {
    createResultValidation,
    updateResultValidation
};
