const AuditLog = require("../models/AuditLog");

/**
 * Sanitize details object to guarantee no sensitive data is logged
 */
const sanitizeDetails = (details) => {
    if (!details || typeof details !== "object") return {};
    const sanitized = { ...details };
    const sensitiveKeys = ["password", "token", "rawToken", "tokenHash", "secret", "resetToken", "verificationToken"];
    for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
            sanitized[key] = "[REDACTED]";
        }
    }
    return sanitized;
};

/**
 * Log an immutable audit event
 */
const logAction = async ({
    action,
    actor = {},
    target = {},
    details = {},
    req = null,
    session = null
}) => {
    try {
        let ipAddress = null;
        let userAgent = null;

        if (req) {
            ipAddress = req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress || null;
            userAgent = req.headers["user-agent"] || null;
        }

        const logEntry = new AuditLog({
            action,
            actor: {
                id: actor.id || actor._id || null,
                email: actor.email || null,
                role: actor.role || null
            },
            target: {
                id: target.id || target._id || null,
                email: target.email || null,
                type: target.type || null
            },
            details: sanitizeDetails(details),
            ipAddress,
            userAgent,
            timestamp: new Date()
        });

        if (session) {
            await logEntry.save({ session });
        } else {
            await logEntry.save();
        }

        return logEntry;
    } catch (err) {
        console.error(`[AuditLog Error] Failed to log action '${action}': ${err.message}`);
        // Do not throw if logging fails unless session is active
        if (session) {
            throw err;
        }
        return null;
    }
};

module.exports = {
    logAction,
    sanitizeDetails
};
