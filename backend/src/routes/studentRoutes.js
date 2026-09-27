const express = require("express");
const {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent
} = require("../controllers/studentController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const { createStudentValidation, updateStudentValidation } = require("../validators/studentValidator");
const { mongoIdParamValidation, paginationQueryValidation } = require("../validators/commonValidator");

const router = express.Router();

router.use(protect);

router.route("/")
    .get(paginationQueryValidation, validate, getStudents)
    .post(createStudentValidation, validate, createStudent);

router.route("/:id")
    .get(mongoIdParamValidation("id"), validate, getStudentById)
    .put(updateStudentValidation, validate, updateStudent)
    .delete(authorizeRoles("admin"), mongoIdParamValidation("id"), validate, deleteStudent);

module.exports = router;
