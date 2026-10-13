/**
 * Environment Configuration Validator
 * Validates critical secrets, database URIs, and security keys on application startup.
 * Fails safely with explicit diagnostic errors if required production parameters are missing.
 */

const validateEnvironment = () => {
    const isProduction = process.env.NODE_ENV === "production";
    const errors = [];
    const warnings = [];

    // 1. JWT_SECRET Validation
    if (!process.env.JWT_SECRET) {
        if (isProduction) {
            errors.push("CRITICAL: 'JWT_SECRET' environment variable is missing in production. Generate a high-entropy secret (min 32 chars).");
        } else {
            warnings.push("Notice: 'JWT_SECRET' is not set; using local development fallback secret.");
        }
    } else if (isProduction && process.env.JWT_SECRET.length < 32) {
        errors.push("SECURITY: 'JWT_SECRET' is too short for production. It must be at least 32 characters long.");
    }

    // 2. MONGODB_URI Validation
    if (!process.env.MONGODB_URI) {
        if (isProduction) {
            errors.push("CRITICAL: 'MONGODB_URI' environment variable is missing in production. A valid MongoDB Atlas connection string is required.");
        } else {
            warnings.push("Notice: 'MONGODB_URI' is not set; defaulting to local MongoDB / in-memory server.");
        }
    } else if (isProduction && (process.env.MONGODB_URI.includes("127.0.0.1") || process.env.MONGODB_URI.includes("localhost"))) {
        errors.push("CONFIGURATION: 'MONGODB_URI' in production cannot point to localhost. A remote MongoDB Atlas cluster URI is required.");
    }

    // 3. PRIMARY_SUPER_ADMIN_EMAIL
    if (!process.env.PRIMARY_SUPER_ADMIN_EMAIL) {
        warnings.push("Security Notice: 'PRIMARY_SUPER_ADMIN_EMAIL' is not set. No existing administrative account will be automatically elevated to super_admin.");
    }

    // 4. CLIENT_URL (CORS)
    if (!process.env.CLIENT_URL) {
        warnings.push("Notice: 'CLIENT_URL' is not set; falling back to default production origin (https://college-erp-new-798m.vercel.app).");
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

module.exports = {
    validateEnvironment
};
