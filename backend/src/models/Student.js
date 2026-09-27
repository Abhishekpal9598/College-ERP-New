const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
    {
        studentId: {
            type: String,
            required: [true, "Student ID is required"],
            unique: true,
            trim: true
        },
        rollNumber: {
            type: String,
            required: [true, "Roll number is required"],
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
        dateOfBirth: {
            type: Date
        },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            default: "male"
        },
        course: {
            type: String,
            required: [true, "Course is required"],
            trim: true
        },
        department: {
            type: String,
            required: [true, "Department is required"],
            trim: true
        },
        semester: {
            type: Number,
            required: [true, "Semester is required"],
            min: [1, "Semester must be at least 1"],
            max: [12, "Semester cannot exceed 12"]
        },
        section: {
            type: String,
            trim: true,
            default: "A"
        },
        admissionYear: {
            type: Number,
            default: () => new Date().getFullYear()
        },
        address: {
            type: String,
            trim: true
        },
        guardianName: {
            type: String,
            trim: true
        },
        guardianPhone: {
            type: String,
            trim: true
        },
        feeStatus: {
            type: String,
            enum: ["paid", "partial", "pending"],
            default: "pending"
        },
        status: {
            type: String,
            enum: ["active", "inactive", "graduated", "suspended"],
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

studentSchema.virtual("fullName").get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Indexes for searching & filtering
studentSchema.index({ department: 1, course: 1, semester: 1 });
studentSchema.index({ firstName: "text", lastName: "text", rollNumber: "text", email: "text" });

module.exports = mongoose.model("Student", studentSchema);
