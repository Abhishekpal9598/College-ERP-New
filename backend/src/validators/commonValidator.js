/**
 * Common Schema Validators
 * Shared validation rules for route parameters, pagination queries, and Mongo IDs
 */
const { param, query } = require("express-validator");

const mongoIdParamValidation = (paramName = "id") => [
    param(paramName)
        .notEmpty().withMessage(`${paramName} parameter is required`)
        .isMongoId().withMessage(`Invalid ${paramName} format. Must be a valid 24-character hexadecimal MongoDB ID`)
];

const paginationQueryValidation = [
    query("page")
        .optional()
        .isInt({ min: 1 }).withMessage("Page must be a positive integer starting from 1")
        .toInt(),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100")
        .toInt(),
    query("search")
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage("Search query cannot exceed 100 characters")
];

module.exports = {
    mongoIdParamValidation,
    paginationQueryValidation
};
