const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: [true, "Action is required"],
            enum: [
                "ADMIN_REGISTRATION_SUBMITTED",
                "INVITATION_CREATED",
                "INVITATION_REVOKED",
                "ADMIN_APPROVED",
                "ADMIN_REJECTED",
                "ROLE_CHANGED",
                "USER_SUSPENDED",
                "USER_ACTIVATED",
                "PASSWORD_RESET_REQUESTED",
                "PASSWORD_RESET_COMPLETED",
                "EMAIL_VERIFIED"
            ],
            index: true
        },
        actor: {
            id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null
            },
            email: {
                type: String,
                default: null
            },
            role: {
                type: String,
                default: null
            }
        },
        target: {
            id: {
                type: mongoose.Schema.Types.ObjectId,
                default: null
            },
            email: {
                type: String,
                default: null
            },
            type: {
                type: String,
                default: null
            }
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        ipAddress: {
            type: String,
            default: null
        },
        userAgent: {
            type: String,
            default: null
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        timestamps: false // timestamp field is explicitly indexed
    }
);

// Append-only immutability guard: prevent any modification or deletion
const preventMutation = function (next) {
    next(new Error("AuditLog is immutable. Modification or deletion is strictly forbidden."));
};

auditLogSchema.pre("updateOne", preventMutation);
auditLogSchema.pre("updateMany", preventMutation);
auditLogSchema.pre("findOneAndUpdate", preventMutation);
auditLogSchema.pre("findByIdAndUpdate", preventMutation);
auditLogSchema.pre("deleteOne", preventMutation);
auditLogSchema.pre("deleteMany", preventMutation);
auditLogSchema.pre("findOneAndDelete", preventMutation);
auditLogSchema.pre("findByIdAndDelete", preventMutation);

auditLogSchema.set("toJSON", {
    transform: function (doc, ret) {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
