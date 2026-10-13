const mongoose = require("mongoose");

/**
 * RevokedToken Model
 * Persistent MongoDB-backed storage for revoked/invalidated JWT tokens
 * Automatic TTL index purges expired tokens automatically
 */
const revokedTokenSchema = new mongoose.Schema(
    {
        tokenHash: {
            type: String,
            required: [true, "tokenHash is required"],
            unique: true,
            index: true
        },
        jti: {
            type: String,
            default: null,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },
        reason: {
            type: String,
            enum: ["logout", "password_reset", "admin_revocation", "session_expired"],
            default: "logout"
        },
        expiresAt: {
            type: Date,
            required: [true, "expiresAt is required"]
        }
    },
    {
        timestamps: true
    }
);

// TTL index to automatically delete records when expiresAt is reached
revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RevokedToken", revokedTokenSchema);
