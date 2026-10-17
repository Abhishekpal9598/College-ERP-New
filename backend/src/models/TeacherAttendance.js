const mongoose = require("mongoose");

const teacherAttendanceSchema = new mongoose.Schema(
    {
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Teacher",
            required: [true, "Teacher reference is required"]
        },
        date: {
            type: String,
            required: [true, "Date is required (YYYY-MM-DD format)"],
            match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"]
        },
        status: {
            type: String,
            enum: ["present", "absent", "leave"],
            required: [true, "Status is required (present/absent/leave)"]
        },
        remarks: {
            type: String,
            trim: true,
            maxlength: [255, "Remarks cannot exceed 255 characters"],
            default: ""
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

// Compound unique index prevents duplicate attendance for the same teacher and date
teacherAttendanceSchema.index({ teacher: 1, date: 1 }, { unique: true });
teacherAttendanceSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model("TeacherAttendance", teacherAttendanceSchema);
