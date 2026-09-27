const Fee = require("../models/Fee");
const Student = require("../models/Student");
const { successResponse, errorResponse } = require("../utils/apiResponse");

/**
 * Helper to update student's overall fee status based on all fee records
 */
const syncStudentFeeStatus = async (studentId) => {
    try {
        const fees = await Fee.find({ student: studentId });
        if (fees.length === 0) return;

        const hasPending = fees.some(f => f.status === "pending" || f.status === "partial");
        const allPaid = fees.every(f => f.status === "paid");

        let overallStatus = "pending";
        if (allPaid) overallStatus = "paid";
        else if (hasPending && fees.some(f => f.paidAmount > 0)) overallStatus = "partial";

        await Student.findByIdAndUpdate(studentId, { feeStatus: overallStatus });
    } catch (err) {
        console.warn(`[FeeSync] Notice: ${err.message}`);
    }
};

/**
 * @desc    Get all fee records with filtering
 * @route   GET /api/fees
 * @access  Private
 */
const getFees = async (req, res, next) => {
    try {
        const { student, status, academicYear, semester } = req.query;

        const query = {};
        if (student) query.student = student;
        if (status) query.status = status;
        if (academicYear) query.academicYear = academicYear;
        if (semester) query.semester = Number(semester);

        const fees = await Fee.find(query)
            .populate("student", "firstName lastName rollNumber studentId department course section")
            .sort({ createdAt: -1 });

        return successResponse(res, 200, "Fees records fetched successfully", fees);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Get fee history and summary for a specific student
 * @route   GET /api/fees/student/:studentId
 * @access  Private
 */
const getStudentFees = async (req, res, next) => {
    try {
        const { studentId } = req.params;

        const student = await Student.findById(studentId);
        if (!student) {
            return errorResponse(res, 404, "Student not found");
        }

        const fees = await Fee.find({ student: studentId }).sort({ createdAt: -1 });

        const totalAmount = fees.reduce((sum, f) => sum + (f.totalAmount || 0), 0);
        const totalPaid = fees.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
        const totalPending = fees.reduce((sum, f) => sum + (f.pendingAmount || 0), 0);

        return successResponse(res, 200, "Student fee records retrieved successfully", {
            student: {
                id: student._id,
                name: student.fullName,
                rollNumber: student.rollNumber,
                feeStatus: student.feeStatus
            },
            summary: {
                totalAmount,
                totalPaid,
                totalPending,
                recordsCount: fees.length
            },
            records: fees
        });
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Create new fee record
 * @route   POST /api/fees
 * @access  Private
 */
const createFee = async (req, res, next) => {
    try {
        const { student, totalAmount, paidAmount } = req.body;

        const studentExists = await Student.findById(student);
        if (!studentExists) {
            return errorResponse(res, 404, "Student not found");
        }

        if (Number(totalAmount) < 0 || (paidAmount !== undefined && Number(paidAmount) < 0)) {
            return errorResponse(res, 400, "Fee amounts cannot be negative");
        }

        const fee = await Fee.create(req.body);
        await syncStudentFeeStatus(student);

        return successResponse(res, 201, "Fee record created successfully", fee);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Update fee record
 * @route   PUT /api/fees/:id
 * @access  Private
 */
const updateFee = async (req, res, next) => {
    try {
        const fee = await Fee.findById(req.params.id);

        if (!fee) {
            return errorResponse(res, 404, "Fee record not found");
        }

        Object.assign(fee, req.body);
        await fee.save();

        await syncStudentFeeStatus(fee.student);

        return successResponse(res, 200, "Fee record updated successfully", fee);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Record a payment against a fee invoice
 * @route   PATCH /api/fees/:id/pay or POST /api/fees/:id/pay
 * @access  Private
 */
const recordPayment = async (req, res, next) => {
    try {
        const { amount, paymentMethod, transactionReference } = req.body;
        const fee = await Fee.findById(req.params.id);

        if (!fee) {
            return errorResponse(res, 404, "Fee record not found");
        }

        const payAmount = Number(amount) || 0;
        if (payAmount <= 0) {
            return errorResponse(res, 400, "Payment amount must be greater than 0");
        }

        fee.paidAmount = (fee.paidAmount || 0) + payAmount;
        if (paymentMethod) fee.paymentMethod = paymentMethod;
        if (transactionReference) fee.transactionReference = transactionReference;
        fee.paymentDate = new Date();

        await fee.save();
        await syncStudentFeeStatus(fee.student);

        return successResponse(res, 200, "Payment recorded successfully", fee);
    } catch (err) {
        next(err);
    }
};

/**
 * @desc    Delete fee record
 * @route   DELETE /api/fees/:id
 * @access  Private
 */
const deleteFee = async (req, res, next) => {
    try {
        const fee = await Fee.findByIdAndDelete(req.params.id);

        if (!fee) {
            return errorResponse(res, 404, "Fee record not found");
        }

        await syncStudentFeeStatus(fee.student);

        return successResponse(res, 200, "Fee record deleted successfully", { id: req.params.id });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getFees,
    getStudentFees,
    createFee,
    updateFee,
    recordPayment,
    deleteFee
};

