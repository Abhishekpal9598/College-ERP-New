const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { errorResponse } = require("../utils/apiResponse");

const tokenBlacklistService = require("../services/tokenBlacklistService");

const getJwtSecret = () => {
    return process.env.JWT_SECRET || "college_erp_dev_secret_key_2026";
};

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return errorResponse(res, 401, "Access denied. No token provided.");
    }

    // Check if token was invalidated via logout
    if (tokenBlacklistService.isTokenInvalidated(token)) {
        return errorResponse(res, 401, "Session has been logged out. Please login again.");
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return errorResponse(res, 401, "Invalid token. User not found.");
        }

        req.user = user;
        req.token = token;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return errorResponse(res, 401, "Session expired. Please login again.");
        }
        return errorResponse(res, 401, "Invalid authentication token.");
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return errorResponse(res, 403, `Forbidden. Role '${req.user ? req.user.role : "none"}' does not have access to this resource.`);
        }
        next();
    };
};

module.exports = {
    protect,
    authorizeRoles
};
