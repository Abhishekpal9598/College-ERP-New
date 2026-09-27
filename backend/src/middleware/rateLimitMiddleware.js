/**
 * Tiered Rate Limiting Middleware
 * Provides configurable rate limiting for Auth routes, Public routes, and Authenticated API routes.
 */
const rateLimit = require("express-rate-limit");

// Helper to parse integer environment variables with safe defaults
const getEnvInt = (key, defaultVal) => {
    const val = process.env[key];
    if (val && !isNaN(parseInt(val, 10))) {
        return parseInt(val, 10);
    }
    return defaultVal;
};

// 1. In-memory failed login tracking for per-account exponential backoff
const failedLoginAttempts = new Map(); // email -> { count: number, lockUntil: number, lastAttempt: number }

const trackFailedLogin = (email) => {
    if (!email) return;
    const normalized = email.toLowerCase().trim();
    const now = Date.now();
    let current = failedLoginAttempts.get(normalized);

    // Reset if window has expired (15 minutes of inactivity) or lock period has elapsed
    if (!current || (current.lockUntil > 0 && now > current.lockUntil) || (now - (current.lastAttempt || 0) > 15 * 60 * 1000)) {
        current = { count: 0, lockUntil: 0, lastAttempt: now };
    }

    current.count += 1;
    current.lastAttempt = now;

    // Progressive backoff delay: after 5 consecutive failed attempts, exponential backoff kicks in
    if (current.count >= 5) {
        const delaySeconds = Math.min(900, Math.pow(2, current.count - 4) * 5);
        current.lockUntil = now + delaySeconds * 1000;
    }

    failedLoginAttempts.set(normalized, current);
};

const resetFailedLogin = (email) => {
    if (!email) return;
    failedLoginAttempts.delete(email.toLowerCase().trim());
};

const getAccountLockStatus = (email) => {
    if (!email) return { isLocked: false, remainingSeconds: 0 };
    const normalized = email.toLowerCase().trim();
    const record = failedLoginAttempts.get(normalized);
    if (!record) return { isLocked: false, remainingSeconds: 0 };

    const now = Date.now();
    if (record.lockUntil > 0 && now < record.lockUntil) {
        const remainingSeconds = Math.ceil((record.lockUntil - now) / 1000);
        return { isLocked: true, remainingSeconds, attempts: record.count };
    }

    // If lock expired, clean up record
    if (record.lockUntil > 0 && now >= record.lockUntil) {
        failedLoginAttempts.delete(normalized);
    }

    return { isLocked: false, remainingSeconds: 0, attempts: record.count };
};

// Periodic cleanup of stale account lock records
setInterval(() => {
    const now = Date.now();
    for (const [email, record] of failedLoginAttempts.entries()) {
        if (now > record.lockUntil && record.count > 0 && now - record.lockUntil > 30 * 60 * 1000) {
            failedLoginAttempts.delete(email);
        }
    }
}, 15 * 60 * 1000).unref?.();

// 2. Strict Rate Limiter for Authentication Routes (Login / Password changes)
const authWindowMs = getEnvInt("AUTH_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000); // 15 mins
const defaultAuthMax = process.env.NODE_ENV === "production" ? 15 : 100;
const authMax = getEnvInt("AUTH_RATE_LIMIT_MAX", defaultAuthMax);

const authLimiter = rateLimit({
    windowMs: authWindowMs,
    max: authMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts from this IP address. Please try again after 15 minutes."
    }
});

// 3. Moderate Rate Limiter for Public Endpoints (/api/health, etc.)
const publicWindowMs = getEnvInt("PUBLIC_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000);
const publicMax = getEnvInt("PUBLIC_RATE_LIMIT_MAX", 200);

const publicLimiter = rateLimit({
    windowMs: publicWindowMs,
    max: publicMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Public endpoint rate limit exceeded. Please try again later."
    }
});

// 4. Configurable Rate Limiter for Authenticated API Endpoints
const apiWindowMs = getEnvInt("API_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000);
const apiMax = getEnvInt("API_RATE_LIMIT_MAX", 1000);

const apiLimiter = rateLimit({
    windowMs: apiWindowMs,
    max: apiMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "API request rate limit exceeded. Please slow down your requests."
    }
});

module.exports = {
    authLimiter,
    publicLimiter,
    apiLimiter,
    trackFailedLogin,
    resetFailedLogin,
    getAccountLockStatus
};
