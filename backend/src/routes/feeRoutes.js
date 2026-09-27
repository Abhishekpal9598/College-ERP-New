const express = require("express");
const {
    getFees,
    getStudentFees,
    createFee,
    updateFee,
    recordPayment,
    deleteFee
} = require("../controllers/feeController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const { createFeeValidation, updateFeeValidation, recordPaymentValidation } = require("../validators/feeValidator");
const { mongoIdParamValidation, paginationQueryValidation } = require("../validators/commonValidator");

const router = express.Router();

router.use(protect);

router.route("/")
    .get(paginationQueryValidation, validate, getFees)
    .post(createFeeValidation, validate, createFee);

router.route("/student/:studentId")
    .get(mongoIdParamValidation("studentId"), validate, getStudentFees);

router.route("/:id")
    .put(updateFeeValidation, validate, updateFee)
    .delete(authorizeRoles("admin"), mongoIdParamValidation("id"), validate, deleteFee);

router.route("/:id/pay")
    .patch(recordPaymentValidation, validate, recordPayment)
    .post(recordPaymentValidation, validate, recordPayment);

module.exports = router;

