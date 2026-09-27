const mongoose = require("mongoose");

const feeSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: [true, "Student reference is required"]
        },
        academicYear: {
            type: String,
            required: [true, "Academic year is required"],
            trim: true
        },
        semester: {
            type: Number,
            required: [true, "Semester is required"],
            min: [1, "Semester must be at least 1"],
            max: [12, "Semester cannot exceed 12"]
        },
        totalAmount: {
            type: Number,
            required: [true, "Total amount is required"],
            min: [0, "Total amount cannot be negative"]
        },
        paidAmount: {
            type: Number,
            default: 0,
            min: [0, "Paid amount cannot be negative"]
        },
        pendingAmount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ["paid", "partial", "pending"],
            default: "pending"
        },
        paymentDate: {
            type: Date,
            default: Date.now
        },
        paymentMethod: {
            type: String,
            enum: ["cash", "upi", "bank_transfer", "other"],
            default: "cash"
        },
        transactionReference: {
            type: String,
            trim: true
        },
        remarks: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                delete ret.__v;
                return ret;
            }
        }
    }
);

// Auto-calculate pendingAmount and fee status before save
feeSchema.pre("save", function (next) {
    this.pendingAmount = Math.max(0, this.totalAmount - this.paidAmount);
    if (this.pendingAmount === 0 && this.totalAmount > 0) {
        this.status = "paid";
    } else if (this.paidAmount > 0 && this.pendingAmount > 0) {
        this.status = "partial";
    } else {
        this.status = "pending";
    }
    next();
});

feeSchema.index({ student: 1, academicYear: 1, semester: 1 });
feeSchema.index({ status: 1 });

module.exports = mongoose.model("Fee", feeSchema);
