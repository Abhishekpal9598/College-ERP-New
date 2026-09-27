const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: [true, "Student reference is required"]
        },
        date: {
            type: String,
            required: [true, "Date is required (YYYY-MM-DD format)"],
            match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"]
        },
        status: {
            type: String,
            enum: ["present", "absent", "late"],
            required: [true, "Status is required (present/absent/late)"]
        },
        subject: {
            type: String,
            required: [true, "Subject is required"],
            trim: true
        },
        semester: {
            type: Number,
            min: 1,
            max: 12
        },
        section: {
            type: String,
            trim: true,
            default: "A"
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

// Compound unique index to prevent duplicate attendance
attendanceSchema.index({ student: 1, date: 1, subject: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
