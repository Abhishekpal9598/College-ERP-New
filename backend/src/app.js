const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const { isDBConnected } = require("./config/database");
const { notFoundHandler, errorHandler } = require("./middleware/errorMiddleware");
const { successResponse } = require("./utils/apiResponse");
const { publicLimiter, apiLimiter } = require("./middleware/rateLimitMiddleware");

// Import Routes
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const feeRoutes = require("./routes/feeRoutes");
const resultRoutes = require("./routes/resultRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

// ==========================================
// 1. Security & Core Middleware
// ==========================================

// Helmet for secure HTTP headers
app.use(helmet());

// CORS configuration
const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000"
].filter(Boolean);

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps, curl, postman) or matching origins
            if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
                return callback(null, true);
            }
            return callback(new Error("CORS policy violation: Not allowed by CORS"));
        },
        credentials: true
    })
);

// General API Rate Limiter
app.use("/api", apiLimiter);

// Body Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ==========================================
// 2. Health Check Endpoint
// ==========================================

app.get("/api/health", publicLimiter, (req, res) => {
    return successResponse(res, 200, "College ERP backend is running", {
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: isDBConnected() ? "connected" : "disconnected"
    });
});

// Root welcome
app.get("/", publicLimiter, (req, res) => {
    return successResponse(res, 200, "College ERP API is online. Refer to /docs for API documentation.");
});

// ==========================================
// 3. API Routes Mounting
// ==========================================

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ==========================================
// 4. Error Handling
// ==========================================

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
