/**
 * Standardized API Response Helpers
 */

const successResponse = (res, statusCode = 200, message = "Success", data = null, meta = null) => {
    const response = {
        success: true,
        message
    };

    if (data !== null && data !== undefined) {
        response.data = data;
    }

    if (meta !== null && meta !== undefined) {
        response.meta = meta;
    }

    return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode = 500, message = "Internal Server Error", errors = null) => {
    const response = {
        success: false,
        message
    };

    if (errors !== null && errors !== undefined) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

module.exports = {
    successResponse,
    errorResponse
};
