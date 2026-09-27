/**
 * Secure File Upload Utility & Middleware
 * Validates file MIME types, content magic bytes, enforces strict size limits,
 * randomizes filenames to prevent path traversal and execution vulnerabilities.
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { errorResponse } = require("../utils/apiResponse");

// Whitelist of allowed MIME types and their expected magic byte signatures
const ALLOWED_MIME_TYPES = {
    "image/jpeg": [0xFF, 0xD8, 0xFF],
    "image/png": [0x89, 0x50, 0x4E, 0x47],
    "application/pdf": [0x25, 0x50, 0x44, 0x46] // %PDF
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Isolated uploads directory outside the public web root
const UPLOADS_DIR = path.join(__dirname, "../../storage/uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    try {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    } catch (err) {
        console.warn(`[UploadSecurity] Could not create uploads directory: ${err.message}`);
    }
}

/**
 * Validates buffer magic bytes against expected signatures
 * @param {Buffer} buffer 
 * @param {string} mimeType 
 * @returns {boolean}
 */
const validateMagicBytes = (buffer, mimeType) => {
    if (!buffer || buffer.length < 4) return false;
    const expectedSignature = ALLOWED_MIME_TYPES[mimeType];
    if (!expectedSignature) return false;

    for (let i = 0; i < expectedSignature.length; i++) {
        if (buffer[i] !== expectedSignature[i]) {
            return false;
        }
    }
    return true;
};

/**
 * Generates a cryptographically random, safe file name preserving only the validated extension
 * @param {string} mimeType 
 * @returns {string}
 */
const generateSafeFileName = (mimeType) => {
    const extensionMap = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "application/pdf": ".pdf"
    };
    const ext = extensionMap[mimeType] || ".bin";
    const randomHex = crypto.randomBytes(16).toString("hex");
    return `upload_${Date.now()}_${randomHex}${ext}`;
};

/**
 * Secure file upload validator middleware
 */
const validateUploadedFile = (req, res, next) => {
    if (!req.file) {
        return next();
    }

    const { mimetype, size, buffer, originalname } = req.file;

    // 1. File size check
    if (size > MAX_FILE_SIZE_BYTES) {
        return errorResponse(res, 400, "File size exceeds the maximum allowed limit of 5MB.");
    }

    // 2. MIME type whitelist check
    if (!ALLOWED_MIME_TYPES[mimetype]) {
        return errorResponse(res, 400, "Invalid file format. Only JPG, PNG, and PDF files are permitted.");
    }

    // 3. Magic byte signature verification
    if (buffer && !validateMagicBytes(buffer, mimetype)) {
        return errorResponse(res, 400, "File content header does not match declared MIME type.");
    }

    // 4. Sanitize and assign safe destination path
    const safeName = generateSafeFileName(mimetype);
    req.file.safeFileName = safeName;
    req.file.safePath = path.join(UPLOADS_DIR, safeName);

    next();
};

module.exports = {
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE_BYTES,
    UPLOADS_DIR,
    validateMagicBytes,
    generateSafeFileName,
    validateUploadedFile
};
