const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = require("./app");
const { connectDB } = require("./config/database");
const { seedAdminUsers } = require("./services/seedService");
const { validateEnvironment } = require("./config/envValidator");

const PORT = process.env.PORT || 5000;
let serverInstance = null;

const startServer = async () => {
    try {
        // Validate environment configuration
        const envCheck = validateEnvironment();
        if (!envCheck.isValid) {
            console.error("[ConfigError] Critical environment variables missing or invalid for production:");
            envCheck.errors.forEach(err => console.error(` - ${err}`));
            process.exit(1);
        }
        if (envCheck.warnings.length > 0 && process.env.NODE_ENV !== "test") {
            envCheck.warnings.forEach(warn => console.warn(`[Config] ${warn}`));
        }

        await connectDB();

        // Safe, idempotent administrative user and baseline verification
        await seedAdminUsers();

        serverInstance = app.listen(PORT, () => {
            console.log(`[Server] College ERP Backend running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
            console.log(`[Server] Health check available at: http://localhost:${PORT}/api/health`);
        });

        return serverInstance;
    } catch (err) {
        console.error(`[Server] Failed to start server: ${err.message}`);
        process.exit(1);
    }
};

const gracefulShutdown = async (signal) => {
    console.log(`[Server] Received ${signal}. Initiating graceful shutdown...`);
    if (serverInstance) {
        serverInstance.close(async () => {
            console.log("[Server] HTTP server closed.");
            const { disconnectDB } = require("./config/database");
            await disconnectDB();
            console.log("[Server] Database connections closed. Exiting cleanly.");
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start automatically if run directly
if (require.main === module) {
    startServer();
}

module.exports = {
    app,
    startServer,
    gracefulShutdown
};
