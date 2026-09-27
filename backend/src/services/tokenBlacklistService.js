/**
 * Token Blacklist & Server-Side Session Invalidation Service
 * Manages invalidated/revoked JWT tokens in memory with automatic TTL cleanup
 */
const jwt = require("jsonwebtoken");

class TokenBlacklistService {
    constructor() {
        // Map of token -> expiration timestamp (ms)
        this.blacklistedTokens = new Map();

        // Run garbage collection every 10 minutes to clean up expired entries
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 10 * 60 * 1000);

        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }

    /**
     * Invalidate a token on logout or session revocation
     * @param {string} token - The raw JWT token string
     */
    invalidateToken(token) {
        if (!token) return;

        try {
            const decoded = jwt.decode(token);
            const expiry = decoded && decoded.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
            this.blacklistedTokens.set(token, expiry);
        } catch {
            // If token cannot be decoded, invalidate for 24 hours
            this.blacklistedTokens.set(token, Date.now() + 24 * 60 * 60 * 1000);
        }
    }

    /**
     * Check if a token has been invalidated/logged out
     * @param {string} token
     * @returns {boolean}
     */
    isTokenInvalidated(token) {
        if (!token) return false;
        const expiry = this.blacklistedTokens.get(token);
        if (!expiry) return false;

        if (Date.now() > expiry) {
            this.blacklistedTokens.delete(token);
            return false;
        }

        return true;
    }

    /**
     * Remove expired tokens from the blacklist to conserve memory
     */
    cleanup() {
        const now = Date.now();
        for (const [token, expiry] of this.blacklistedTokens.entries()) {
            if (now > expiry) {
                this.blacklistedTokens.delete(token);
            }
        }
    }

    /**
     * Clear all blacklisted tokens (for testing purposes)
     */
    clearAll() {
        this.blacklistedTokens.clear();
    }
}

module.exports = new TokenBlacklistService();
