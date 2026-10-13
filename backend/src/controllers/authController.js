const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AdminInvitation = require("../models/AdminInvitation");
const AdminRegistrationRequest = require("../models/AdminRegistrationRequest");
const passwordService = require("../services/passwordService");
const emailService = require("../services/emailService");
const auditService = require("../services/auditService");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { trackFailedLogin, resetFailedLogin, getAccountLockStatus } = require("../middleware/rateLimitMiddleware");
const tokenBlacklistService = require("../services/tokenBlacklistService");

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET environment variable is missing in production!");
    }
    return process.env.JWT_SECRET || "college_erp_dev_secret_key_2026";
};

/**
 * Generate JWT token for user
 */
const generateToken = (userId, role, tokenVersion = 0) => {
    return jwt.sign(
        { id: userId, role, tokenVersion, jti: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}` },
        getJwtSecret(),
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );
};

/**
 * Safe transaction helper: executes within transaction if supported on MongoDB instance
 */
const runWithTransaction = async (workFn) => {
    let session = null;
    try {
        session = await mongoose.startSession();
        let result;
        await session.withTransaction(async () => {
            result = await workFn(session);
        });
        return result;
    } catch (err) {
        if (err.message && err.message.includes("Transaction numbers are only allowed on a replica set member")) {
            return await workFn(null);
        }
        throw err;
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

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

        const normalizedEmail = email.toLowerCase().trim();

        // Check account lock status from failed attempts
        const lockStatus = getAccountLockStatus(normalizedEmail);
        if (lockStatus.isLocked) {
            return errorResponse(
                res,
                429,
                `Account temporarily locked due to multiple failed login attempts. Please wait ${lockStatus.remainingSeconds} seconds before trying again.`
            );
        }

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            // Check if there is a pending registration request for helpful user feedback
            const pendingReq = await AdminRegistrationRequest.findOne({ email: normalizedEmail });
            if (pendingReq) {
                if (pendingReq.status === "pending" || pendingReq.status === "processing") {
                    return errorResponse(res, 403, "Your admin registration is pending approval by the Super Administrator.");
                } else if (pendingReq.status === "rejected") {
                    return errorResponse(res, 403, "Your admin registration request was rejected by the Super Administrator.");
                }
            }
            trackFailedLogin(normalizedEmail);
            return errorResponse(res, 401, "Invalid email or password");
        }

        // Verify account status
        if (user.status === "pending") {
            return errorResponse(res, 403, "Your admin registration is pending approval by the Super Administrator.");
        }
        if (user.status === "rejected") {
            return errorResponse(res, 403, "Your admin registration request was rejected by the Super Administrator.");
        }
        if (user.status === "suspended") {
            return errorResponse(res, 403, "Your account has been suspended.");
        }

        // Verify email verification status
        if (user.isEmailVerified === false) {
            return errorResponse(res, 403, "Please verify your email address before logging in.");
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            trackFailedLogin(normalizedEmail);
            return errorResponse(res, 401, "Invalid email or password");
        }

        // Reset failed login counter on successful authentication
        resetFailedLogin(normalizedEmail);

        const token = generateToken(user._id, user.role, user.tokenVersion || 0);

        return successResponse(res, 200, "Login successful", {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                isEmailVerified: user.isEmailVerified,
                permissions: user.permissions || [],
                collegeName: user.collegeName,
                phone: user.phone
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Submit admin registration with single-use invitation token
 * @route   POST /api/auth/register-admin
 * @access  Public
 */
const registerAdmin = async (req, res, next) => {
    try {
        const { name, collegeName, email, phone, invitationToken, password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        // 1. Check if an active account already exists with this email
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return errorResponse(res, 409, "An active account already exists with this email address");
        }

        // 2. Check if an active or pending request already exists with this email
        const existingReq = await AdminRegistrationRequest.findOne({
            email: normalizedEmail,
            status: { $in: ["pending", "processing"] }
        });
        if (existingReq) {
            return errorResponse(res, 409, "A pending registration request already exists for this email address");
        }

        // 3. Shared canonicalization & validation of raw invitation token
        let canonicalToken;
        try {
            canonicalToken = emailService.canonicalizeToken(invitationToken);
        } catch {
            console.warn("[AdminRegistrationAudit] Registration rejected: Invitation token malformed");
            return errorResponse(res, 400, "Invalid invitation token. Please check that you copied the complete token.");
        }

        const tokenHash = emailService.hashToken(canonicalToken);

        // Pre-validate invitation with granular error messages and safe category logging
        const existingInv = await AdminInvitation.findOne({ tokenHash });
        if (!existingInv) {
            console.warn("[AdminRegistrationAudit] Registration rejected: Invitation token not found");
            return errorResponse(res, 400, "Invalid invitation token. Please check that you copied the complete token.");
        }
        if (existingInv.status === "used") {
            console.warn("[AdminRegistrationAudit] Registration rejected: Invitation token already used");
            return errorResponse(res, 400, "This invitation token has already been used.");
        }
        if (existingInv.status === "revoked") {
            console.warn("[AdminRegistrationAudit] Registration rejected: Invitation token revoked");
            return errorResponse(res, 400, "This invitation token has been revoked by the Super Administrator.");
        }
        if (existingInv.expiresAt && existingInv.expiresAt <= new Date()) {
            console.warn("[AdminRegistrationAudit] Registration rejected: Invitation token expired");
            return errorResponse(res, 400, "This invitation token has expired.");
        }
        if (existingInv.recipientEmail && existingInv.recipientEmail.toLowerCase().trim() !== normalizedEmail) {
            console.warn("[AdminRegistrationAudit] Registration rejected: Recipient email mismatch");
            return errorResponse(res, 400, "This invitation token is reserved for a specific email address. Please register using your designated official email.");
        }

        // 4. Hash password explicitly via passwordService
        const hashedPassword = await passwordService.hashPassword(password);

        // 5. Generate secure email verification token
        const { rawToken: emailRawToken, tokenHash: emailTokenHash } = emailService.generateSecureToken();

        let createdRequest = null;

        // 6. Execute atomic consumption and request creation in transaction
        try {
            await runWithTransaction(async (session) => {
                // Find and atomically consume invitation token
                const invitation = await AdminInvitation.findOneAndUpdate(
                    {
                        _id: existingInv._id,
                        status: "active",
                        expiresAt: { $gt: new Date() },
                        $or: [
                            { recipientEmail: null },
                            { recipientEmail: "" },
                            { recipientEmail: normalizedEmail }
                        ]
                    },
                    {
                        $set: {
                            status: "used",
                            usedAt: new Date()
                        }
                    },
                    { session, new: true }
                );

                if (!invitation) {
                    throw new Error("INVITATION_ALREADY_USED");
                }

                const regRequest = new AdminRegistrationRequest({
                    name: name.trim(),
                    collegeName: collegeName.trim(),
                    email: normalizedEmail,
                    phone: phone.trim(),
                    password: hashedPassword,
                    invitationId: invitation._id,
                    requestedRole: invitation.allowedRole || "admin",
                    isEmailVerified: false,
                    emailVerificationTokenHash: emailTokenHash,
                    emailVerificationExpires: new Date(Date.now() + 24 * 3600 * 1000),
                    status: "pending",
                    ipAddress: req.ip || req.connection?.remoteAddress || null,
                    userAgent: req.headers["user-agent"] || null
                });

                if (session) {
                    await regRequest.save({ session });
                    invitation.usedBy = regRequest._id;
                    await invitation.save({ session });
                } else {
                    await regRequest.save();
                    invitation.usedBy = regRequest._id;
                    await invitation.save();
                }

                createdRequest = regRequest;

                // Log audit action
                await auditService.logAction({
                    action: "ADMIN_REGISTRATION_SUBMITTED",
                    actor: { email: normalizedEmail, role: "applicant" },
                    target: { id: regRequest._id, email: normalizedEmail, type: "AdminRegistrationRequest" },
                    details: { collegeName: regRequest.collegeName, requestedRole: regRequest.requestedRole },
                    req,
                    session
                });
            });
        } catch (err) {
            if (err.message === "INVITATION_ALREADY_USED") {
                console.warn("[AdminRegistrationAudit] Registration rejected: Invitation token already used");
                return errorResponse(res, 400, "This invitation token has already been used.");
            }
            throw err;
        }

        // 7. Dispatch verification email
        await emailService.sendVerificationEmail(normalizedEmail, emailRawToken);

        return successResponse(
            res,
            201,
            "Admin registration request submitted successfully. Please verify your email address. Your account is pending Super Administrator approval.",
            {
                requestId: createdRequest._id,
                email: normalizedEmail,
                name: createdRequest.name,
                collegeName: createdRequest.collegeName,
                status: "pending",
                isEmailVerified: false
            }
        );
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Verify email address using verification token
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            return errorResponse(res, 400, "Verification token is required");
        }

        const tokenHash = emailService.hashToken(token);

        // Check AdminRegistrationRequest first
        const pendingReq = await AdminRegistrationRequest.findOne({
            emailVerificationTokenHash: tokenHash,
            emailVerificationExpires: { $gt: new Date() }
        });

        if (pendingReq) {
            pendingReq.isEmailVerified = true;
            pendingReq.emailVerificationTokenHash = null;
            pendingReq.emailVerificationExpires = null;
            await pendingReq.save();

            await auditService.logAction({
                action: "EMAIL_VERIFIED",
                actor: { email: pendingReq.email, role: "applicant" },
                target: { id: pendingReq._id, email: pendingReq.email, type: "AdminRegistrationRequest" },
                details: { status: pendingReq.status },
                req
            });

            return successResponse(
                res,
                200,
                "Email verified successfully. Your application is pending Super Administrator review."
            );
        }

        // Check active User collection
        const user = await User.findOne({
            emailVerificationTokenHash: tokenHash,
            emailVerificationExpires: { $gt: new Date() }
        });

        if (user) {
            user.isEmailVerified = true;
            user.emailVerificationTokenHash = null;
            user.emailVerificationExpires = null;
            await user.save();

            await auditService.logAction({
                action: "EMAIL_VERIFIED",
                actor: { id: user._id, email: user.email, role: user.role },
                target: { id: user._id, email: user.email, type: "User" },
                details: { role: user.role },
                req
            });

            return successResponse(res, 200, "Email verified successfully. You can now log in.");
        }

        return errorResponse(res, 400, "Invalid or expired email verification token.");
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Request password reset link
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return errorResponse(res, 400, "Please provide an email address");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (user && user.status === "active") {
            const { rawToken, tokenHash } = emailService.generateSecureToken();
            user.resetPasswordTokenHash = tokenHash;
            user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
            await user.save();

            await emailService.sendPasswordResetEmail(normalizedEmail, rawToken);

            await auditService.logAction({
                action: "PASSWORD_RESET_REQUESTED",
                actor: { id: user._id, email: user.email, role: user.role },
                target: { id: user._id, email: user.email, type: "User" },
                details: { ip: req.ip },
                req
            });
        }

        // Always return 200 to prevent user enumeration attacks
        return successResponse(
            res,
            200,
            "If an account matching this email exists, a password reset link has been dispatched."
        );
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Reset password using reset token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return errorResponse(res, 400, "Reset token and new password are required");
        }

        const tokenHash = emailService.hashToken(token);
        const user = await User.findOne({
            resetPasswordTokenHash: tokenHash,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return errorResponse(res, 400, "Invalid or expired password reset token.");
        }

        // Hash new password explicitly via passwordService
        const hashedPassword = await passwordService.hashPassword(newPassword);
        user.password = hashedPassword;
        user.$locals.isPreHashed = true;
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.passwordChangedAt = new Date();
        user.resetPasswordTokenHash = null;
        user.resetPasswordExpires = null;
        await user.save();

        await auditService.logAction({
            action: "PASSWORD_RESET_COMPLETED",
            actor: { id: user._id, email: user.email, role: user.role },
            target: { id: user._id, email: user.email, type: "User" },
            details: { resetAt: new Date() },
            req
        });

        return successResponse(
            res,
            200,
            "Password has been reset successfully. You can now login with your new password."
        );
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
            await tokenBlacklistService.invalidateToken(token);
        }

        return successResponse(res, 200, "Logout successful");
    } catch (err) {
        return successResponse(res, 200, "Logout successful");
    }
};

module.exports = {
    login,
    registerAdmin,
    verifyEmail,
    forgotPassword,
    resetPassword,
    getMe,
    logout
};
