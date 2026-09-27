const { validationResult } = require("express-validator");
const { errorResponse } = require("../utils/apiResponse");

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return errorResponse(res, 400, firstError.msg || "Validation error", errors.array());
    }
    next();
};

module.exports = {
    validate
};
