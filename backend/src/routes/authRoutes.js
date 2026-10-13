const express = require("express");
const {
    login,
    registerAdmin,
    verifyEmail,
    forgotPassword,
    resetPassword,
    getMe,
    logout
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const {
    authLimiter,
    registerAdminLimiter,
    passwordResetLimiter
} = require("../middleware/rateLimitMiddleware");
const {
    loginValidation,
    registerAdminValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    verifyEmailValidation
} = require("../validators/authValidator");

const router = express.Router();

router.post("/login", authLimiter, loginValidation, validate, login);
router.post("/register-admin", registerAdminLimiter, registerAdminValidation, validate, registerAdmin);
router.post("/verify-email", verifyEmailValidation, validate, verifyEmail);
router.post("/forgot-password", passwordResetLimiter, forgotPasswordValidation, validate, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPasswordValidation, validate, resetPassword);
router.post("/logout", logout);
router.get("/me", protect, getMe);

module.exports = router;
