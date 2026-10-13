const mongoose = require("mongoose");

const adminInvitationSchema = new mongoose.Schema(
    {
        tokenHash: {
            type: String,
            required: [true, "Token hash is required"],
            unique: true,
            index: true
        },
        recipientEmail: {
            type: String,
            lowercase: true,
            trim: true,
            default: null
        },
        allowedRole: {
            type: String,
            enum: ["admin", "admission_admin", "accountant", "hr_admin"],
            default: "admin"
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Creator is required"]
        },
        expiresAt: {
            type: Date,
            required: [true, "Expiration date is required"],
            index: true
        },
        status: {
            type: String,
            enum: ["active", "used", "revoked", "expired"],
            default: "active",
            index: true
        },
        usedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminRegistrationRequest",
            default: null
        },
        usedAt: {
            type: Date,
            default: null
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

// Remove sensitive hash and internal versioning
adminInvitationSchema.set("toJSON", {
    transform: function (doc, ret) {
        delete ret.tokenHash;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("AdminInvitation", adminInvitationSchema);
