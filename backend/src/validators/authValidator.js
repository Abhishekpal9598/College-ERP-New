/**
 * Authentication Input Validators
 */
const { body } = require("express-validator");

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

module.exports = {
    loginValidation
};
