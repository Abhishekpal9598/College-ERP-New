/**
 * Super Admin Management Input Validators
 */
const { body, param, query } = require("express-validator");

const createInvitationValidation = [
    body("recipientEmail")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isEmail().withMessage("Please provide a valid recipient email address")
        .normalizeEmail(),
    body("allowedRole")
        .optional()
        .isIn(["admin", "admission_admin", "accountant", "hr_admin"])
        .withMessage("Allowed role must be one of: admin, admission_admin, accountant, hr_admin"),
    body("expiresInHours")
        .optional()
        .isInt({ min: 1, max: 168 })
        .withMessage("Expiration must be between 1 and 168 hours (7 days)")
];

const approveRequestValidation = [
    param("id")
        .isMongoId().withMessage("Invalid request ID format. Must be a valid 24-character hexadecimal MongoDB ID"),
    body("assignedRole")
        .optional()
        .isIn(["admin", "admission_admin", "accountant", "hr_admin"])
        .withMessage("Assigned role must be one of: admin, admission_admin, accountant, hr_admin"),
    body("permissions")
        .optional()
        .isArray().withMessage("Permissions must be an array of permission strings")
];

const rejectRequestValidation = [
    param("id")
        .isMongoId().withMessage("Invalid request ID format. Must be a valid 24-character hexadecimal MongoDB ID"),
    body("reason")
        .optional()
        .trim()
        .isLength({ max: 300 }).withMessage("Rejection reason cannot exceed 300 characters")
];

const mongoIdParamValidation = [
    param("id")
        .isMongoId().withMessage("Invalid ID format. Must be a valid 24-character hexadecimal MongoDB ID")
];

module.exports = {
    createInvitationValidation,
    approveRequestValidation,
    rejectRequestValidation,
    mongoIdParamValidation
};
