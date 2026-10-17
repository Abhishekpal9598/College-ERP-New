const express = require("express");
const {
    getAttendance,
    recordAttendance,
    updateAttendance,
    getStudentAttendance,
    getTeacherAttendance,
    recordTeacherAttendance,
    updateTeacherAttendance,
    getSingleTeacherAttendanceHistory
} = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const {
    recordAttendanceValidation,
    updateAttendanceValidation,
    recordTeacherAttendanceValidation,
    updateTeacherAttendanceValidation
} = require("../validators/attendanceValidator");
const { mongoIdParamValidation, paginationQueryValidation } = require("../validators/commonValidator");

const router = express.Router();

router.use(protect);

router.route("/")
    .get(paginationQueryValidation, validate, getAttendance)
    .post(recordAttendanceValidation, validate, recordAttendance);

// Teacher Attendance endpoints (mounted before /:id)
router.route("/teachers")
    .get(paginationQueryValidation, validate, getTeacherAttendance)
    .post(recordTeacherAttendanceValidation, validate, recordTeacherAttendance);

router.route("/teachers/:teacherId")
    .get(mongoIdParamValidation("teacherId"), validate, getSingleTeacherAttendanceHistory);

router.route("/teachers/record/:id")
    .put(updateTeacherAttendanceValidation, validate, updateTeacherAttendance);

// Alias singular /teacher for consistency
router.route("/teacher")
    .get(paginationQueryValidation, validate, getTeacherAttendance)
    .post(recordTeacherAttendanceValidation, validate, recordTeacherAttendance);

router.route("/student/:studentId")
    .get(mongoIdParamValidation("studentId"), validate, getStudentAttendance);

router.route("/:id")
    .put(updateAttendanceValidation, validate, updateAttendance);

module.exports = router;
