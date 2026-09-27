/**
 * Grade Calculation Service
 */

const calculateGrade = (marks, maxMarks = 100) => {
    if (maxMarks <= 0) return "F";
    const percentage = (marks / maxMarks) * 100;

    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    return "F";
};

const calculatePercentage = (marks, maxMarks = 100) => {
    if (maxMarks <= 0) return 0;
    return Number(((marks / maxMarks) * 100).toFixed(2));
};

module.exports = {
    calculateGrade,
    calculatePercentage
};
