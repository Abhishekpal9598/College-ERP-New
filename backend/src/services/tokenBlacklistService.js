/**
 * Persistent Token Revocation & Invalidation Service
 * Backed by MongoDB RevokedToken collection with TTL index
 * Supplemented by high-speed in-memory cache for sub-millisecond lookup
 */
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const RevokedToken = require("../models/RevokedToken");

class TokenBlacklistService {
    constructor() {
        // In-memory cache for instantaneous O(1) validation: tokenHash -> expiryTimestampMs
        this.memoryCache = new Map();

        // Periodic sweep of local memory cache (every 10 minutes)
        this.cleanupInterval = setInterval(() => {
            this.cleanupMemoryCache();
        }, 10 * 60 * 1000);

        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }

    /**
     * Compute SHA-256 hash of token for consistent fixed-length indexed lookups
     * @param {string} token
     * @returns {string}
     */
    hashToken(token) {
        if (!token || typeof token !== "string") return "";
        return crypto.createHash("sha256").update(token).digest("hex");
    }

    /**
     * Invalidate a token persistently across server restarts
     * @param {string} token - The raw JWT token string
     * @param {string} reason - Reason for revocation ('logout', 'password_reset', etc.)
     * @returns {Promise<boolean>}
     */
    async invalidateToken(token, reason = "logout") {
        if (!token) return false;

        const tokenHash = this.hashToken(token);
        let expiryDate;
        let jti = null;
        let userId = null;

        try {
            const decoded = jwt.decode(token);
            if (decoded) {
                expiryDate = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);
                jti = decoded.jti || null;
                userId = decoded.id || null;
            } else {
                expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
            }
        } catch {
            expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }

        // 1. Immediately store in local memory cache
        this.memoryCache.set(tokenHash, expiryDate.getTime());

        // 2. Persist to MongoDB (upsert to handle concurrent duplicate logout calls safely)
        try {
            await RevokedToken.findOneAndUpdate(
                { tokenHash },
                {
                    $setOnInsert: {
                        tokenHash,
                        jti,
                        userId,
                        reason,
                        expiresAt: expiryDate
                    }
                },
                { upsert: true, new: true }
            );
            return true;
        } catch (err) {
            // Duplicate key error (E11000) indicates token was already recorded by concurrent request
            if (err.code !== 11000) {
                console.error(`[TokenRevocation] Warning: Could not persist token to MongoDB: ${err.message}`);
            }
            return true;
        }
    }

    /**
     * Check if a token has been revoked / logged out
     * Checks memory cache first; queries MongoDB if not found in cache
     * @param {string} token
     * @returns {Promise<boolean>}
     */
    async isTokenInvalidated(token) {
        if (!token) return false;

        const tokenHash = this.hashToken(token);
        const cachedExpiry = this.memoryCache.get(tokenHash);

        if (cachedExpiry) {
            if (Date.now() > cachedExpiry) {
                this.memoryCache.delete(tokenHash);
                return false;
            }
            return true;
        }

        // Query persistent MongoDB
        try {
            const record = await RevokedToken.findOne({ tokenHash });
            if (record) {
                if (record.expiresAt && Date.now() > record.expiresAt.getTime()) {
                    return false;
                }
                // Repopulate memory cache for subsequent requests
                const expMs = record.expiresAt ? record.expiresAt.getTime() : Date.now() + 24 * 60 * 60 * 1000;
                this.memoryCache.set(tokenHash, expMs);
                return true;
            }
        } catch (err) {
            console.error(`[TokenRevocation] Database lookup error: ${err.message}`);
        }

        return false;
    }

    /**
     * Clean up expired tokens from local memory cache
     */
    cleanupMemoryCache() {
        const now = Date.now();
        for (const [tokenHash, expiry] of this.memoryCache.entries()) {
            if (now > expiry) {
                this.memoryCache.delete(tokenHash);
            }
        }
    }

    /**
     * Clear in-memory cache only (simulates server restart)
     */
    clearMemoryCache() {
        this.memoryCache.clear();
    }

    /**
     * Clear all tokens in memory and database (for tests only)
     */
    async clearAll() {
        this.memoryCache.clear();
        try {
            await RevokedToken.deleteMany({});
        } catch {}
    }
}

module.exports = new TokenBlacklistService();
