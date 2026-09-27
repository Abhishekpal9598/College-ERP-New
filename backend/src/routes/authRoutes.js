const express = require("express");
const { login, getMe, logout } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const { authLimiter } = require("../middleware/rateLimitMiddleware");
const { loginValidation } = require("../validators/authValidator");

const router = express.Router();

router.post("/login", authLimiter, loginValidation, validate, login);
router.post("/logout", logout);
router.get("/me", protect, getMe);

module.exports = router;

