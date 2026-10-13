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
    if (await tokenBlacklistService.isTokenInvalidated(token)) {
        return errorResponse(res, 401, "Session has been logged out. Please login again.");
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
            return errorResponse(res, 401, "Invalid token. User not found.");
        }

        // Invalidate sessions issued prior to a password reset
        if (
            (decoded.tokenVersion !== undefined && user.tokenVersion !== undefined && decoded.tokenVersion < user.tokenVersion) ||
            (user.passwordChangedAt && (decoded.iat || 0) * 1000 < user.passwordChangedAt.getTime() - 2000)
        ) {
            return errorResponse(res, 401, "Password was changed recently. Please log in again.");
        }

        // Verify user account status
        if (user.status === "pending") {
            return errorResponse(res, 403, "Your account is pending Super Administrator approval.");
        }
        if (user.status === "rejected") {
            return errorResponse(res, 403, "Your registration request has been rejected.");
        }
        if (user.status === "suspended") {
            return errorResponse(res, 403, "Your account has been suspended.");
        }

        // Verify email verification status
        if (user.isEmailVerified === false) {
            return errorResponse(res, 403, "Please verify your email address before accessing this resource.");
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

/**
 * Role-Based Access Control Middleware
 * super_admin has universal access across all modules
 */
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return errorResponse(res, 403, "Forbidden. No user authenticated.");
        }
        // Super admin has universal access
        if (req.user.role === "super_admin") {
            return next();
        }
        if (!roles.includes(req.user.role)) {
            return errorResponse(
                res,
                403,
                `Forbidden. Role '${req.user.role}' does not have access to this resource.`
            );
        }
        next();
    };
};

/**
 * Granular Permission-Based Access Control Middleware
 * super_admin has universal access
 */
const authorizePermissions = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return errorResponse(res, 403, "Forbidden. No user authenticated.");
        }
        if (req.user.role === "super_admin") {
            return next();
        }
        const userPerms = req.user.permissions || [];
        const hasAllPermissions = permissions.every(p => userPerms.includes(p));
        if (!hasAllPermissions) {
            return errorResponse(
                res,
                403,
                `Forbidden. Missing required permissions: ${permissions.join(", ")}`
            );
        }
        next();
    };
};

module.exports = {
    protect,
    authorizeRoles,
    authorizePermissions
};
