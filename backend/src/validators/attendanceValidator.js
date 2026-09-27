/**
 * Attendance Module Input Validators
 */
const { body, param, query } = require("express-validator");

const recordAttendanceValidation = [
    // Support either single record or batch
    body("student")
        .if(body("batch").not().exists())
        .notEmpty().withMessage("Student ID is required")
        .isMongoId().withMessage("Invalid student MongoDB ID"),
    body("date")
        .if(body("batch").not().exists())
        .notEmpty().withMessage("Date is required")
        .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage("Date must be in YYYY-MM-DD format"),
    body("status")
        .if(body("batch").not().exists())
        .notEmpty().withMessage("Status is required")
        .isIn(["present", "absent", "late"]).withMessage("Status must be present, absent, or late"),
    body("subject")
        .if(body("batch").not().exists())
        .notEmpty().withMessage("Subject is required")
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage("Subject cannot exceed 100 characters"),
    body("batch")
        .optional()
        .isArray({ min: 1 }).withMessage("Batch must be a non-empty array of attendance entries")
];

const updateAttendanceValidation = [
    param("id")
        .isMongoId().withMessage("Invalid attendance ID format"),
    body("status")
        .optional()
        .isIn(["present", "absent", "late"]).withMessage("Status must be present, absent, or late"),
    body("remarks")
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage("Remarks cannot exceed 255 characters")
];

module.exports = {
    recordAttendanceValidation,
    updateAttendanceValidation
};
