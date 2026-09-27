const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
    {
        teacherId: {
            type: String,
            required: [true, "Teacher ID is required"],
            unique: true,
            trim: true
        },
        firstName: {
            type: String,
            required: [true, "First name is required"],
            trim: true
        },
        lastName: {
            type: String,
            required: [true, "Last name is required"],
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
        phone: {
            type: String,
            trim: true
        },
        department: {
            type: String,
            required: [true, "Department is required"],
            trim: true
        },
        subject: {
            type: String,
            required: [true, "Subject is required"],
            trim: true
        },
        designation: {
            type: String,
            trim: true,
            default: "Assistant Professor"
        },
        joiningDate: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ["active", "inactive", "on_leave"],
            default: "active"
        }
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.__v;
                return ret;
            }
        }
    }
);

teacherSchema.virtual("fullName").get(function () {
    return `${this.firstName} ${this.lastName}`;
});

teacherSchema.index({ department: 1, subject: 1 });
teacherSchema.index({ firstName: "text", lastName: "text", email: "text" });

module.exports = mongoose.model("Teacher", teacherSchema);
