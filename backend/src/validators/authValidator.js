/**
 * Authentication Input Validators
 */
const { body } = require("express-validator");
const { validateComplexity } = require("../services/passwordService");

const loginValidation = [
    body("email")
        .notEmpty().withMessage("Email is required")
        .trim()
        .isEmail().withMessage("Please provide a valid email address")
        .normalizeEmail()
        .isLength({ max: 100 }).withMessage("Email cannot exceed 100 characters"),
    body("password")
        .notEmpty().withMessage("Password is required")
        .isString().withMessage("Password must be a string")
        .isLength({ min: 1, max: 128 }).withMessage("Password cannot exceed 128 characters")
];

const registerAdminValidation = [
    body("name")
        .notEmpty().withMessage("Full name is required")
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage("Full name must be between 2 and 100 characters")
        .matches(/^[a-zA-Z\s.'-]+$/).withMessage("Name must contain only letters, spaces, hyphens, and dots"),
    body("collegeName")
        .notEmpty().withMessage("College / Institution name is required")
        .trim()
        .isLength({ min: 2, max: 150 }).withMessage("College name must be between 2 and 150 characters"),
    body("email")
        .notEmpty().withMessage("Email is required")
        .trim()
        .isEmail().withMessage("Please provide a valid email address")
        .normalizeEmail()
        .isLength({ max: 100 }).withMessage("Email cannot exceed 100 characters"),
    body("phone")
        .notEmpty().withMessage("Phone number is required")
        .trim()
        .matches(/^[+]?[\d\s-]{10,15}$/).withMessage("Please provide a valid phone number (10-15 digits)"),
    body("invitationToken")
        .notEmpty().withMessage("Invitation token is required")
        .trim()
        .isString().withMessage("Invitation token must be a string"),
    body("password")
        .notEmpty().withMessage("Password is required")
        .custom((value) => {
            const check = validateComplexity(value);
            if (!check.isValid) {
                throw new Error(check.message);
            }
            return true;
        }),
    body("confirmPassword")
        .notEmpty().withMessage("Please confirm your password")
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match");
            }
            return true;
        })
];

const forgotPasswordValidation = [
    body("email")
        .notEmpty().withMessage("Email is required")
        .trim()
        .isEmail().withMessage("Please provide a valid email address")
        .normalizeEmail()
];

const resetPasswordValidation = [
    body("token")
        .notEmpty().withMessage("Reset token is required")
        .trim()
        .isString().withMessage("Reset token must be a string"),
    body("newPassword")
        .notEmpty().withMessage("New password is required")
        .custom((value) => {
            const check = validateComplexity(value);
            if (!check.isValid) {
                throw new Error(check.message);
            }
            return true;
        }),
    body("confirmPassword")
        .notEmpty().withMessage("Please confirm your new password")
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error("Passwords do not match");
            }
            return true;
        })
];

const verifyEmailValidation = [
    body("token")
        .notEmpty().withMessage("Verification token is required")
        .trim()
        .isString().withMessage("Verification token must be a string")
];

module.exports = {
    loginValidation,
    registerAdminValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    verifyEmailValidation
};
