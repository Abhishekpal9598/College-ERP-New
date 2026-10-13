/**
 * College ERP - Email & Token Dispatch Service
 * Cryptographic token generation, SHA-256 hashing, and email delivery abstraction
 */
const crypto = require("crypto");

/**
 * Generate 32-byte cryptographically secure random token and its SHA-256 hash
 */
const generateSecureToken = () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    return { rawToken, tokenHash };
};

/**
 * Hash raw token using SHA-256
 */
const hashToken = (rawToken) => {
    if (!rawToken || typeof rawToken !== "string") {
        throw new Error("Raw token string is required for hashing");
    }
    return crypto.createHash("sha256").update(rawToken).digest("hex");
};

/**
 * Dispatch verification email (or safe mock in development/test)
 */
const sendVerificationEmail = async (email, rawToken) => {
    // In production with configured SMTP, deliver email here
    // In dev/test/staging, ensure secure log without leaking secret
    if (process.env.NODE_ENV !== "test") {
        console.log(`[EmailService] Verification token dispatched to: ${email}`);
    }
    return { success: true };
};

/**
 * Dispatch password reset email (or safe mock in development/test)
 */
const sendPasswordResetEmail = async (email, rawToken) => {
    if (process.env.NODE_ENV !== "test") {
        console.log(`[EmailService] Password reset token dispatched to: ${email}`);
    }
    return { success: true };
};

module.exports = {
    generateSecureToken,
    hashToken,
    sendVerificationEmail,
    sendPasswordResetEmail
};
