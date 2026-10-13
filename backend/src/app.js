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
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Trust reverse proxy (e.g. Render, Heroku) for correct client IP detection in rate limiters
app.set("trust proxy", 1);

// ==========================================
// 1. Security & Core Middleware
// ==========================================

// Helmet for secure HTTP headers
app.use(helmet());

// CORS configuration allowing exact production Vercel domain, Vercel preview/deployment domains for College ERP, configured origins, and local development
const defaultOrigins = [
    "https://college-erp-new-798m.vercel.app",
    "https://college-erp-new.vercel.app",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000"
];

const configuredOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map(url => url.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const allowedOrigins = [...new Set([...configuredOrigins, ...defaultOrigins])];

const isAllowedVercelOrigin = (origin) => {
    // Allows College ERP production, preview, and deployment domains on Vercel
    // Matches https://college-erp-new.vercel.app, https://college-erp-new-*.vercel.app,
    // and https://*-abhishekpal9598s-projects.vercel.app
    return (
        /^https:\/\/college-erp-new(-[a-z0-9-]+)?\.vercel\.app$/i.test(origin) ||
        /^https:\/\/[a-z0-9-]+-abhishekpal9598s-projects\.vercel\.app$/i.test(origin)
    );
};

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g. curl, health checks, server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = origin.replace(/\/+$/, "");
        if (allowedOrigins.includes(normalizedOrigin) || isAllowedVercelOrigin(normalizedOrigin)) {
            return callback(null, true);
        }

        // In non-production development environments, allow localhost
        if (process.env.NODE_ENV !== "production" && (origin.includes("localhost") || origin.includes("127.0.0.1"))) {
            return callback(null, true);
        }

        // Disallow origin gracefully without throwing an unhandled 500 error
        return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// General API Rate Limiter
app.use("/api", apiLimiter);

// Body Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ==========================================
// 2. Health Check & Root Endpoints
// ==========================================

const healthHandler = (req, res) => {
    const dbConnected = isDBConnected();
    const statusCode = dbConnected ? 200 : 503;
    const nowIso = new Date().toISOString();

    return res.status(statusCode).json({
        success: dbConnected,
        status: dbConnected ? "OK" : "DEGRADED",
        message: "College ERP Backend is running",
        environment: process.env.NODE_ENV || "development",
        database: {
            status: dbConnected ? "connected" : "disconnected"
        },
        timestamp: nowIso,
        data: {
            status: dbConnected ? "healthy" : "unhealthy",
            uptime: process.uptime(),
            timestamp: nowIso,
            database: dbConnected ? "connected" : "disconnected"
        }
    });
};

// Mount health check on both /api/health and /health for Render monitoring
app.get(["/api/health", "/health"], publicLimiter, healthHandler);

// Root & API welcome
app.get(["/", "/api"], publicLimiter, (req, res) => {
    return successResponse(res, 200, "College ERP API is online. Refer to /api/health for system status.");
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
app.use("/api/admin", adminRoutes);

// ==========================================
// 4. Error Handling
// ==========================================

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
