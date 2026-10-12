const mongoose = require("mongoose");

let memoryServerInstance = null;

/**
 * Connect to MongoDB database.
 * Attempts MONGODB_URI first; falls back to embedded in-memory MongoDB if local daemon is unreachable.
 */
const connectDB = async () => {
    const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/college_erp";
    const dbName = process.env.DB_NAME || "college_erp";

    try {
        await mongoose.connect(mongoURI, {
            dbName,
            serverSelectionTimeoutMS: 5000
        });
        console.log(`[MongoDB] Connected to database: ${mongoose.connection.name}`);
        return mongoose.connection;
    } catch (primaryError) {
        if (process.env.NODE_ENV === "production") {
            console.error(`[MongoDB] Production Database Connection Error: Unable to connect to MongoDB Atlas at '${mongoURI}'. Check MONGODB_URI and IP whitelist.`);
            throw primaryError;
        }

        console.warn(`[MongoDB] Primary connection to ${mongoURI} failed (${primaryError.message}). Attempting in-memory fallback for local development/testing...`);
        try {
            const { MongoMemoryServer } = require("mongodb-memory-server");
            memoryServerInstance = await MongoMemoryServer.create();
            const memoryURI = memoryServerInstance.getUri();
            await mongoose.connect(memoryURI);
            console.log(`[MongoDB] Connected to in-memory database at ${memoryURI}`);
            return mongoose.connection;
        } catch (fallbackError) {
            console.error(`[MongoDB] Database connection error: ${fallbackError.message}`);
            throw fallbackError;
        }
    }
};

const disconnectDB = async () => {
    await mongoose.disconnect();
    if (memoryServerInstance) {
        await memoryServerInstance.stop();
    }
};

const isDBConnected = () => {
    return mongoose.connection.readyState === 1;
};

module.exports = {
    connectDB,
    disconnectDB,
    isDBConnected
};
