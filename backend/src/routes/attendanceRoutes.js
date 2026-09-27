const express = require("express");
const {
    getAttendance,
    recordAttendance,
    updateAttendance,
    getStudentAttendance
} = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const { recordAttendanceValidation, updateAttendanceValidation } = require("../validators/attendanceValidator");
const { mongoIdParamValidation, paginationQueryValidation } = require("../validators/commonValidator");

const router = express.Router();

router.use(protect);

router.route("/")
    .get(paginationQueryValidation, validate, getAttendance)
    .post(recordAttendanceValidation, validate, recordAttendance);

router.route("/student/:studentId")
    .get(mongoIdParamValidation("studentId"), validate, getStudentAttendance);

router.route("/:id")
    .put(updateAttendanceValidation, validate, updateAttendance);

module.exports = router;
