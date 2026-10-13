const mongoose = require("mongoose");
const User = require("../models/User");
const AdminInvitation = require("../models/AdminInvitation");
const AdminRegistrationRequest = require("../models/AdminRegistrationRequest");
const AuditLog = require("../models/AuditLog");
const emailService = require("../services/emailService");
const auditService = require("../services/auditService");
const { successResponse, errorResponse } = require("../utils/apiResponse");

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
 * @desc    Generate a single-use cryptographically random invitation token
 * @route   POST /api/admin/invitations
 * @access  Private (Super Admin)
 */
const createInvitation = async (req, res, next) => {
    try {
        const { recipientEmail, allowedRole, expiresInHours = 48, metadata = {} } = req.body;

        // Security check: Never allow generating invitations for super_admin role
        if (allowedRole === "super_admin") {
            return errorResponse(res, 400, "Cannot create invitations with super_admin privileges.");
        }

        const validRole = allowedRole || "admin";
        const normalizedEmail = recipientEmail ? recipientEmail.toLowerCase().trim() : null;

        // Generate 32-byte crypto token and SHA-256 hash
        const { rawToken, tokenHash } = emailService.generateSecureToken();

        const expiresAt = new Date(Date.now() + parseInt(expiresInHours, 10) * 3600 * 1000);

        const invitation = new AdminInvitation({
            tokenHash,
            recipientEmail: normalizedEmail,
            allowedRole: validRole,
            createdBy: req.user._id,
            expiresAt,
            status: "active",
            metadata
        });

        await invitation.save();

        // Log audit event
        await auditService.logAction({
            action: "INVITATION_CREATED",
            actor: { id: req.user._id, email: req.user.email, role: req.user.role },
            target: { id: invitation._id, email: normalizedEmail, type: "AdminInvitation" },
            details: { allowedRole: validRole, expiresInHours },
            req
        });

        // Return raw token ONCE to the Super Admin (never stored in DB)
        return successResponse(
            res,
            201,
            "Invitation token generated successfully. Copy this token now as it cannot be retrieved again.",
            {
                invitation: {
                    id: invitation._id,
                    recipientEmail: invitation.recipientEmail,
                    allowedRole: invitation.allowedRole,
                    expiresAt: invitation.expiresAt,
                    status: invitation.status,
                    createdAt: invitation.createdAt
                },
                rawToken
            }
        );
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get all invitations
 * @route   GET /api/admin/invitations
 * @access  Private (Super Admin)
 */
const getInvitations = async (req, res, next) => {
    try {
        const invitations = await AdminInvitation.find()
            .populate("createdBy", "name email")
            .populate("usedBy", "name email collegeName")
            .sort({ createdAt: -1 });

        return successResponse(res, 200, "Invitations retrieved successfully", invitations);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Revoke an active invitation
 * @route   DELETE /api/admin/invitations/:id
 * @access  Private (Super Admin)
 */
const revokeInvitation = async (req, res, next) => {
    try {
        const invitation = await AdminInvitation.findById(req.params.id);
        if (!invitation) {
            return errorResponse(res, 404, "Invitation not found");
        }

        if (invitation.status !== "active") {
            return errorResponse(res, 400, `Cannot revoke invitation with status '${invitation.status}'`);
        }

        invitation.status = "revoked";
        await invitation.save();

        await auditService.logAction({
            action: "INVITATION_REVOKED",
            actor: { id: req.user._id, email: req.user.email, role: req.user.role },
            target: { id: invitation._id, email: invitation.recipientEmail, type: "AdminInvitation" },
            details: { previousStatus: "active" },
            req
        });

        return successResponse(res, 200, "Invitation revoked successfully");
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get registration requests
 * @route   GET /api/admin/registration-requests
 * @access  Private (Super Admin)
 */
const getRegistrationRequests = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const requests = await AdminRegistrationRequest.find(filter)
            .populate("reviewedBy", "name email")
            .sort({ createdAt: -1 });

        return successResponse(res, 200, "Registration requests retrieved successfully", requests);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get single registration request details
 * @route   GET /api/admin/registration-requests/:id
 * @access  Private (Super Admin)
 */
const getRegistrationRequestById = async (req, res, next) => {
    try {
        const request = await AdminRegistrationRequest.findById(req.params.id)
            .populate("reviewedBy", "name email")
            .populate("invitationId");

        if (!request) {
            return errorResponse(res, 404, "Registration request not found");
        }

        return successResponse(res, 200, "Registration request details retrieved successfully", request);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Approve admin registration request & activate User account
 * @route   POST /api/admin/registration-requests/:id/approve
 * @access  Private (Super Admin)
 */
const approveRegistrationRequest = async (req, res, next) => {
    try {
        const requestId = req.params.id;
        const { assignedRole, permissions = [] } = req.body;

        // Security check: Cannot assign super_admin via approval
        if (assignedRole === "super_admin") {
            return errorResponse(res, 400, "Cannot grant super_admin role through standard approval workflow.");
        }

        // 1. Atomic state transition to prevent race condition & double approvals
        const request = await AdminRegistrationRequest.findOneAndUpdate(
            { _id: requestId, status: "pending" },
            { $set: { status: "processing" } },
            { new: true }
        );

        if (!request) {
            return errorResponse(
                res,
                409,
                "Request is already processed, being processed, or does not exist."
            );
        }

        // 2. Check if a User already exists with this email
        const existingUser = await User.findOne({ email: request.email });
        if (existingUser) {
            // Revert state
            request.status = "rejected";
            request.rejectionReason = "An active account with this email already exists.";
            request.reviewedBy = req.user._id;
            request.reviewedAt = new Date();
            await request.save();
            return errorResponse(res, 409, "A user account with this email address already exists.");
        }

        const finalRole = assignedRole || request.requestedRole || "admin";
        let createdUser = null;

        // 3. Multi-document transaction for user creation, request approval, and audit logging
        try {
            await runWithTransaction(async (session) => {
                const newUser = new User({
                    name: request.name,
                    collegeName: request.collegeName,
                    email: request.email,
                    phone: request.phone,
                    password: request.password, // Pre-hashed with bcrypt in registration
                    role: finalRole,
                    status: "active",
                    permissions: permissions,
                    isEmailVerified: request.isEmailVerified,
                    approvedBy: req.user._id,
                    approvedAt: new Date()
                });

                // Flag as pre-hashed to guarantee pre-save hook never double-hashes
                newUser.$locals.isPreHashed = true;

                if (session) {
                    await newUser.save({ session });
                } else {
                    await newUser.save();
                }

                createdUser = newUser;

                request.status = "approved";
                request.assignedRole = finalRole;
                request.assignedPermissions = permissions;
                request.reviewedBy = req.user._id;
                request.reviewedAt = new Date();

                if (session) {
                    await request.save({ session });
                } else {
                    await request.save();
                }

                // Log audit action
                await auditService.logAction({
                    action: "ADMIN_APPROVED",
                    actor: { id: req.user._id, email: req.user.email, role: req.user.role },
                    target: { id: newUser._id, email: newUser.email, type: "User" },
                    details: { assignedRole: finalRole, permissions, collegeName: request.collegeName },
                    req,
                    session
                });
            });
        } catch (err) {
            // Revert request status if transaction failed
            await AdminRegistrationRequest.findByIdAndUpdate(requestId, { status: "pending" });
            throw err;
        }

        return successResponse(
            res,
            200,
            "Admin registration request approved and account activated successfully.",
            {
                user: {
                    id: createdUser._id,
                    name: createdUser.name,
                    email: createdUser.email,
                    role: createdUser.role,
                    status: createdUser.status,
                    isEmailVerified: createdUser.isEmailVerified,
                    permissions: createdUser.permissions,
                    collegeName: createdUser.collegeName
                },
                request: {
                    id: request._id,
                    status: request.status,
                    reviewedAt: request.reviewedAt
                }
            }
        );
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Reject admin registration request
 * @route   POST /api/admin/registration-requests/:id/reject
 * @access  Private (Super Admin)
 */
const rejectRegistrationRequest = async (req, res, next) => {
    try {
        const requestId = req.params.id;
        const { reason = "Registration request rejected by Super Administrator." } = req.body;

        const request = await AdminRegistrationRequest.findOneAndUpdate(
            { _id: requestId, status: { $in: ["pending", "processing"] } },
            {
                $set: {
                    status: "rejected",
                    rejectionReason: reason,
                    reviewedBy: req.user._id,
                    reviewedAt: new Date()
                }
            },
            { new: true }
        );

        if (!request) {
            return errorResponse(res, 409, "Request is already processed or does not exist.");
        }

        await auditService.logAction({
            action: "ADMIN_REJECTED",
            actor: { id: req.user._id, email: req.user.email, role: req.user.role },
            target: { id: request._id, email: request.email, type: "AdminRegistrationRequest" },
            details: { reason },
            req
        });

        return successResponse(res, 200, "Registration request rejected successfully", {
            id: request._id,
            status: request.status,
            rejectionReason: request.rejectionReason,
            reviewedAt: request.reviewedAt
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get immutable audit logs
 * @route   GET /api/admin/audit-logs
 * @access  Private (Super Admin)
 */
const getAuditLogs = async (req, res, next) => {
    try {
        const { action, limit = 50, page = 1 } = req.query;
        const filter = {};
        if (action) {
            filter.action = action;
        }

        const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const skip = (parsedPage - 1) * parsedLimit;

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(parsedLimit),
            AuditLog.countDocuments(filter)
        ]);

        return successResponse(res, 200, "Audit logs retrieved successfully", {
            logs,
            pagination: {
                total,
                page: parsedPage,
                limit: parsedLimit,
                pages: Math.ceil(total / parsedLimit)
            }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createInvitation,
    getInvitations,
    revokeInvitation,
    getRegistrationRequests,
    getRegistrationRequestById,
    approveRegistrationRequest,
    rejectRegistrationRequest,
    getAuditLogs
};
