const mongoose = require("mongoose");
const { calculateGrade, calculatePercentage } = require("../services/gradeService");

const resultSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: [true, "Student reference is required"]
        },
        subject: {
            type: String,
            required: [true, "Subject is required"],
            trim: true
        },
        semester: {
            type: Number,
            required: [true, "Semester is required"],
            min: [1, "Semester must be at least 1"],
            max: [12, "Semester cannot exceed 12"]
        },
        marks: {
            type: Number,
            required: [true, "Marks are required"],
            min: [0, "Marks cannot be negative"]
        },
        maxMarks: {
            type: Number,
            default: 100,
            min: [1, "Max marks must be at least 1"]
        },
        percentage: {
            type: Number
        },
        grade: {
            type: String
        },
        examType: {
            type: String,
            enum: ["midterm", "final", "quiz", "practical", "assignment"],
            default: "final"
        },
        academicYear: {
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

// Validate marks not exceeding maxMarks and compute percentage & grade
resultSchema.pre("save", function (next) {
    if (this.marks > this.maxMarks) {
        return next(new Error("Marks cannot exceed maximum marks"));
    }
    this.percentage = calculatePercentage(this.marks, this.maxMarks);
    this.grade = calculateGrade(this.marks, this.maxMarks);
    next();
});

resultSchema.index({ student: 1, subject: 1, semester: 1, examType: 1 });

module.exports = mongoose.model("Result", resultSchema);
