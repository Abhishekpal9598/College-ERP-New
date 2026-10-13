const mongoose = require("mongoose");
const passwordService = require("../services/passwordService");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"]
        },
        role: {
            type: String,
            enum: ["super_admin", "admin", "admission_admin", "accountant", "hr_admin", "teacher"],
            default: "admin"
        },
        status: {
            type: String,
            enum: ["active", "pending", "rejected", "suspended"],
            default: "active"
        },
        collegeName: {
            type: String,
            trim: true,
            default: null
        },
        phone: {
            type: String,
            trim: true,
            default: null
        },
        permissions: {
            type: [String],
            default: []
        },
        isEmailVerified: {
            type: Boolean,
            default: true // Preserves backward compatibility for existing users
        },
        emailVerificationTokenHash: {
            type: String,
            default: null
        },
        emailVerificationExpires: {
            type: Date,
            default: null
        },
        resetPasswordTokenHash: {
            type: String,
            default: null
        },
        resetPasswordExpires: {
            type: Date,
            default: null
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        approvedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Hash password before save if modified and not already hashed
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    // Explicit bypass if flagged as pre-hashed
    if (this.$locals && this.$locals.isPreHashed) {
        return next();
    }

    // Defense-in-depth: If password is already a valid bcrypt hash, do not double-hash
    if (passwordService.isBcryptHash(this.password)) {
        return next();
    }

    try {
        this.password = await passwordService.hashPassword(this.password);
        next();
    } catch (err) {
        next(err);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return passwordService.comparePassword(candidatePassword, this.password);
};

// Remove password and sensitive security tokens from JSON representation
userSchema.set("toJSON", {
    transform: function (doc, ret) {
        delete ret.password;
        delete ret.emailVerificationTokenHash;
        delete ret.resetPasswordTokenHash;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model("User", userSchema);
