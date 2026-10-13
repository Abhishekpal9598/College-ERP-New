const express = require("express");
const {
    createInvitation,
    getInvitations,
    revokeInvitation,
    getRegistrationRequests,
    getRegistrationRequestById,
    approveRegistrationRequest,
    rejectRegistrationRequest,
    getAuditLogs
} = require("../controllers/adminController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const {
    createInvitationValidation,
    approveRequestValidation,
    rejectRequestValidation,
    mongoIdParamValidation
} = require("../validators/adminValidator");

const router = express.Router();

// Enforce authentication & Super Admin role across all /api/admin endpoints
router.use(protect);
router.use(authorizeRoles("super_admin"));

router.post("/invitations", createInvitationValidation, validate, createInvitation);
router.get("/invitations", getInvitations);
router.delete("/invitations/:id", mongoIdParamValidation, validate, revokeInvitation);

router.get("/registration-requests", getRegistrationRequests);
router.get("/registration-requests/:id", mongoIdParamValidation, validate, getRegistrationRequestById);
router.post("/registration-requests/:id/approve", approveRequestValidation, validate, approveRegistrationRequest);
router.post("/registration-requests/:id/reject", rejectRequestValidation, validate, rejectRegistrationRequest);

router.get("/audit-logs", getAuditLogs);

module.exports = router;
