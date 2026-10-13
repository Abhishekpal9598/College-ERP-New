/**
 * College ERP - Password Service
 * Explicit, centralized password hashing, verification, and complexity checks
 */
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;
const BCRYPT_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/**
 * Validate password complexity:
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special character
 */
const validateComplexity = (password) => {
    if (!password || typeof password !== "string") {
        return { isValid: false, message: "Password is required" };
    }
    if (password.length < 8) {
        return { isValid: false, message: "Password must be at least 8 characters long" };
    }
    if (password.length > 128) {
        return { isValid: false, message: "Password cannot exceed 128 characters" };
    }
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (!/\d/.test(password)) {
        return { isValid: false, message: "Password must contain at least one number" };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { isValid: false, message: "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)" };
    }
    return { isValid: true };
};

/**
 * Hash plaintext password using bcrypt
 */
const hashPassword = async (plainPassword) => {
    if (!plainPassword || typeof plainPassword !== "string") {
        throw new Error("Plaintext password is required for hashing");
    }
    // Prevent double hashing if already a bcrypt hash
    if (BCRYPT_REGEX.test(plainPassword)) {
        return plainPassword;
    }
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(plainPassword, salt);
};

/**
 * Compare candidate plaintext password against bcrypt hash
 */
const comparePassword = async (candidatePassword, hashedPassword) => {
    if (!candidatePassword || !hashedPassword) {
        return false;
    }
    return bcrypt.compare(candidatePassword, hashedPassword);
};

/**
 * Check if a string matches bcrypt hash format
 */
const isBcryptHash = (str) => {
    return typeof str === "string" && BCRYPT_REGEX.test(str);
};

module.exports = {
    validateComplexity,
    hashPassword,
    comparePassword,
    isBcryptHash,
    BCRYPT_REGEX
};
