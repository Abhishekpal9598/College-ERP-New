const express = require("express");
const {
    getTeachers,
    getTeacherById,
    createTeacher,
    updateTeacher,
    deleteTeacher
} = require("../controllers/teacherController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const { createTeacherValidation, updateTeacherValidation } = require("../validators/teacherValidator");
const { mongoIdParamValidation, paginationQueryValidation } = require("../validators/commonValidator");

const router = express.Router();

router.use(protect);

router.route("/")
    .get(paginationQueryValidation, validate, getTeachers)
    .post(createTeacherValidation, validate, createTeacher);

router.route("/:id")
    .get(mongoIdParamValidation("id"), validate, getTeacherById)
    .put(updateTeacherValidation, validate, updateTeacher)
    .delete(authorizeRoles("admin"), mongoIdParamValidation("id"), validate, deleteTeacher);

module.exports = router;
