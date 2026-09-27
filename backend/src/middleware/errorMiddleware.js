const { errorResponse } = require("../utils/apiResponse");

const notFoundHandler = (req, res, next) => {
    return errorResponse(res, 404, `API endpoint '${req.originalUrl}' not found`);
};

const errorHandler = (err, req, res, next) => {
    // Always log the full error details server-side
    console.error(`[Error] ${err.name || "Error"}: ${err.message}`);
    if (err.stack && process.env.NODE_ENV !== "production") {
        console.error(err.stack);
    }

    // Mongoose bad ObjectId CastError
    if (err.name === "CastError") {
        return errorResponse(res, 400, `Invalid ID format: ${err.value}`);
    }

    // Mongoose duplicate key error (E11000)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "field";
        const val = err.keyValue ? err.keyValue[field] : "value";
        return errorResponse(res, 409, `Duplicate value '${val}' for field '${field}'. Record already exists.`);
    }

    // Mongoose validation error
    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map(val => val.message);
        return errorResponse(res, 400, messages[0] || "Validation failed", messages);
    }

    // JWT errors
    if (err.name === "JsonWebTokenError") {
        return errorResponse(res, 401, "Invalid authentication token");
    }
    if (err.name === "TokenExpiredError") {
        return errorResponse(res, 401, "Authentication token has expired");
    }

    // Custom Error Message or default 500
    const statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error";

    // In production, sanitize 500 errors so internal stack/driver details are never leaked
    if (statusCode === 500 && process.env.NODE_ENV === "production") {
        message = "An unexpected error occurred on the server. Please try again later.";
    }

    return errorResponse(res, statusCode, message);
};

module.exports = {
    notFoundHandler,
    errorHandler
};
