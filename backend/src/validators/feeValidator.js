/**
 * Fee Module Input Validators
 */
const { body, param, query } = require("express-validator");

const createFeeValidation = [
    body("student")
        .notEmpty().withMessage("Student ID is required")
        .isMongoId().withMessage("Invalid student MongoDB ID"),
    body("academicYear")
        .notEmpty().withMessage("Academic year is required")
        .trim()
        .isLength({ min: 4, max: 20 }).withMessage("Academic year must be between 4 and 20 characters"),
    body("semester")
        .notEmpty().withMessage("Semester is required")
        .isInt({ min: 1, max: 12 }).withMessage("Semester must be an integer between 1 and 12")
        .toInt(),
    body("totalAmount")
        .notEmpty().withMessage("Total amount is required")
        .isFloat({ min: 0 }).withMessage("Total amount must be a positive number or zero")
        .toFloat(),
    body("paidAmount")
        .optional()
        .isFloat({ min: 0 }).withMessage("Paid amount must be a positive number or zero")
        .toFloat(),
    body("paymentMethod")
        .optional()
        .isIn(["cash", "upi", "bank_transfer", "other"]).withMessage("Payment method must be cash, upi, bank_transfer, or other"),
    body("remarks")
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage("Remarks cannot exceed 255 characters")
];

const updateFeeValidation = [
    param("id")
        .isMongoId().withMessage("Invalid fee record ID format"),
    body("totalAmount")
        .optional()
        .isFloat({ min: 0 }).withMessage("Total amount must be a positive number or zero")
        .toFloat(),
    body("paidAmount")
        .optional()
        .isFloat({ min: 0 }).withMessage("Paid amount must be a positive number or zero")
        .toFloat(),
    body("status")
        .optional()
        .isIn(["paid", "partial", "pending"]).withMessage("Status must be paid, partial, or pending"),
    body("paymentMethod")
        .optional()
        .isIn(["cash", "upi", "bank_transfer", "other"]).withMessage("Payment method must be cash, upi, bank_transfer, or other")
];

const recordPaymentValidation = [
    param("id")
        .isMongoId().withMessage("Invalid fee record ID format"),
    body("amount")
        .notEmpty().withMessage("Payment amount is required")
        .isFloat({ gt: 0 }).withMessage("Payment amount must be greater than 0")
        .toFloat(),
    body("paymentMethod")
        .optional()
        .isIn(["cash", "upi", "bank_transfer", "other"]).withMessage("Payment method must be cash, upi, bank_transfer, or other"),
    body("transactionReference")
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage("Transaction reference cannot exceed 100 characters")
];

module.exports = {
    createFeeValidation,
    updateFeeValidation,
    recordPaymentValidation
};
