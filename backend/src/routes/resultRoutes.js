const express = require("express");
const {
    getResults,
    getStudentResults,
    createResult,
    updateResult,
    deleteResult
} = require("../controllers/resultController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const { createResultValidation, updateResultValidation } = require("../validators/resultValidator");
const { mongoIdParamValidation, paginationQueryValidation } = require("../validators/commonValidator");

const router = express.Router();

router.use(protect);

router.route("/")
    .get(paginationQueryValidation, validate, getResults)
    .post(createResultValidation, validate, createResult);

router.route("/student/:studentId")
    .get(mongoIdParamValidation("studentId"), validate, getStudentResults);

router.route("/:id")
    .put(updateResultValidation, validate, updateResult)
    .delete(authorizeRoles("admin"), mongoIdParamValidation("id"), validate, deleteResult);

module.exports = router;

