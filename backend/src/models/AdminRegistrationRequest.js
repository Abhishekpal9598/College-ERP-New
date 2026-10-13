const mongoose = require("mongoose");

const adminRegistrationRequestSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true
        },
        collegeName: {
            type: String,
            required: [true, "College name is required"],
            trim: true
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
            index: true
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            trim: true
        },
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        invitationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminInvitation",
            required: [true, "Invitation ID is required"]
        },
        requestedRole: {
            type: String,
            enum: ["admin", "admission_admin", "accountant", "hr_admin"],
            default: "admin"
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        emailVerificationTokenHash: {
            type: String,
            default: null,
            index: true
        },
        emailVerificationExpires: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: ["pending", "processing", "approved", "rejected"],
            default: "pending",
            index: true
        },
        assignedRole: {
            type: String,
            enum: ["admin", "admission_admin", "accountant", "hr_admin"],
            default: null
        },
        assignedPermissions: {
            type: [String],
            default: []
        },
        rejectionReason: {
            type: String,
            default: null
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        ipAddress: {
            type: String,
            default: null
        },
        userAgent: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Remove sensitive password hash and email verification token from JSON output
adminRegistrationRequestSchema.set("toJSON", {
    transform: function (doc, ret) {
        delete ret.password;
        delete ret.emailVerificationTokenHash;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("AdminRegistrationRequest", adminRegistrationRequestSchema);
