const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/apiResponse");

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET environment variable is missing in production!");
    }
    return process.env.JWT_SECRET || "college_erp_dev_secret_key_2026";
};

/**
 * Generate JWT token for user
 */
const generateToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role, jti: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}` },
        getJwtSecret(),
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );
};


const { trackFailedLogin, resetFailedLogin, getAccountLockStatus } = require("../middleware/rateLimitMiddleware");
const tokenBlacklistService = require("../services/tokenBlacklistService");

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, 400, "Please provide email and password");
        }

        // Check account lock status from failed attempts
        const lockStatus = getAccountLockStatus(email);
        if (lockStatus.isLocked) {
            return errorResponse(
                res,
                429,
                `Account temporarily locked due to multiple failed login attempts. Please wait ${lockStatus.remainingSeconds} seconds before trying again.`
            );
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            trackFailedLogin(email);
            return errorResponse(res, 401, "Invalid email or password");
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            trackFailedLogin(email);
            return errorResponse(res, 401, "Invalid email or password");
        }

        // Reset failed login counter on successful authentication
        resetFailedLogin(email);

        const token = generateToken(user._id, user.role);

        return successResponse(res, 200, "Login successful", {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return errorResponse(res, 404, "User not found");
        }

        return successResponse(res, 200, "User profile retrieved successfully", user);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Logout user / clear token session
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = async (req, res) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (token) {
            tokenBlacklistService.invalidateToken(token);
        }

        return successResponse(res, 200, "Logout successful");
    } catch (err) {
        return successResponse(res, 200, "Logout successful");
    }
};

module.exports = {
    login,
    getMe,
    logout
};


