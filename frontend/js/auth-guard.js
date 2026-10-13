/**
 * College ERP - Authentication Guard & Session Management
 */

// In-flight deduplication promise for concurrent verifySession calls
let pendingVerificationPromise = null;

/**
 * Validates JWT expiration timestamp client-side.
 * Returns true if token is missing, malformed, or expired.
 *
 * @param {string} token
 * @returns {boolean} true if expired or invalid, false if still unexpired
 */
function isTokenExpired(token) {
    if (!token || typeof token !== "string") return true;
    try {
        const parts = token.trim().split(".");
        if (parts.length !== 3) return true;

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        let jsonStr;
        if (typeof atob === "function") {
            jsonStr = atob(base64);
        } else if (typeof Buffer !== "undefined") {
            jsonStr = Buffer.from(base64, "base64").toString("utf8");
        } else {
            return false;
        }

        const payload = JSON.parse(jsonStr);
        if (payload && typeof payload.exp === "number") {
            // Buffer of 5 seconds for clock drift
            return Date.now() >= (payload.exp * 1000) - 5000;
        }
        return false;
    } catch {
        return true;
    }
}

/**
 * Centralized, safe removal of all authentication-related keys from localStorage.
 */
function clearAuthState() {
    if (typeof localStorage !== "undefined") {
        try {
            localStorage.removeItem("token");
            localStorage.removeItem("jwt_token");
            localStorage.removeItem("user");
            localStorage.removeItem("isLoggedIn");
            localStorage.removeItem("adminName");
        } catch (e) {
            console.warn("Error clearing auth state:", e);
        }
    }
}

/**
 * Synchronous client-side token presence and expiration check.
 * If token is missing, malformed, or expired, clears state immediately and returns false.
 *
 * @returns {boolean}
 */
function hasValidToken() {
    if (typeof localStorage === "undefined") return false;
    const token = localStorage.getItem("token") || localStorage.getItem("jwt_token");
    if (!token || typeof token !== "string" || !token.trim()) {
        clearAuthState();
        return false;
    }
    if (isTokenExpired(token)) {
        clearAuthState();
        return false;
    }
    return true;
}

/**
 * Legacy check maintained for backwards compatibility.
 * Delegates strictly to hasValidToken() to ensure token is valid.
 *
 * @returns {boolean}
 */
function isAuthenticated() {
    return hasValidToken();
}

/**
 * Verify active session with backend GET /api/auth/me.
 * Deduplicates concurrent requests to avoid redundant network overhead.
 *
 * @returns {Promise<{ authenticated: boolean, user: object|null }>}
 */
function verifySession() {
    if (!hasValidToken()) {
        clearAuthState();
        return Promise.resolve({ authenticated: false, user: null });
    }

    if (pendingVerificationPromise) {
        return pendingVerificationPromise;
    }

    pendingVerificationPromise = (async () => {
        try {
            if (typeof window !== "undefined" && window.authAPI && typeof window.authAPI.getMe === "function") {
                const res = await window.authAPI.getMe();
                if (res && res.success && res.data) {
                    if (typeof localStorage !== "undefined") {
                        localStorage.setItem("user", JSON.stringify(res.data));
                        localStorage.setItem("isLoggedIn", "true");
                        if (res.data.name) localStorage.setItem("adminName", res.data.name);
                    }
                    return { authenticated: true, user: res.data };
                }
            } else {
                // Direct fallback fetch if authAPI is not initialized yet
                const token = (typeof localStorage !== "undefined")
                    ? (localStorage.getItem("token") || localStorage.getItem("jwt_token"))
                    : null;
                const apiBase = (typeof window !== "undefined" && window.APP_CONFIG && window.APP_CONFIG.API_URL)
                    ? window.APP_CONFIG.API_URL.replace(/\/+$/, "")
                    : "https://college-erp-new-2-ki-project-mere.onrender.com/api";

                const response = await fetch(`${apiBase}/auth/me`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });

                if (response.ok) {
                    const data = await response.json().catch(() => null);
                    if (data && data.success && data.data) {
                        if (typeof localStorage !== "undefined") {
                            localStorage.setItem("user", JSON.stringify(data.data));
                            localStorage.setItem("isLoggedIn", "true");
                            if (data.data.name) localStorage.setItem("adminName", data.data.name);
                        }
                        return { authenticated: true, user: data.data };
                    }
                }
            }
        } catch (err) {
            console.warn("[AuthGuard] Backend session verification failed:", err?.message || err);
        }

        // Verification failed (401, expired, blacklisted, or invalid token)
        clearAuthState();
        return { authenticated: false, user: null };
    })().finally(() => {
        pendingVerificationPromise = null;
    });

    return pendingVerificationPromise;
}

/**
 * Route protection guard for authenticated pages.
 * 1. Synchronously checks hasValidToken(). If invalid, immediately redirects to /pages/login/login.html.
 * 2. Asynchronously verifies session with backend GET /api/auth/me. If invalid, redirects to /pages/login/login.html.
 *
 * @returns {Promise<boolean>} resolves to true if verified, false if redirected
 */
function requireAuth() {
    if (!hasValidToken()) {
        clearAuthState();
        if (typeof window !== "undefined" && window.location) {
            const currentPath = window.location.pathname || "";
            if (!currentPath.includes("login")) {
                window.location.replace("/pages/login/login.html");
            }
        }
        return Promise.resolve(false);
    }

    return verifySession().then(result => {
        if (!result.authenticated) {
            clearAuthState();
            if (typeof window !== "undefined" && window.location) {
                const currentPath = window.location.pathname || "";
                if (!currentPath.includes("login")) {
                    window.location.replace("/pages/login/login.html");
                }
            }
            return false;
        }
        return true;
    });
}

/**
 * Revoke session on backend and clear local state.
 */
async function logout() {
    try {
        if (typeof window !== "undefined" && window.authAPI && typeof window.authAPI.logout === "function") {
            await window.authAPI.logout();
        }
    } catch (e) {
        console.warn("Logout error:", e);
    } finally {
        clearAuthState();
        if (typeof window !== "undefined" && window.location) {
            window.location.replace("/pages/login/login.html");
        }
    }
}

if (typeof window !== "undefined") {
    window.isTokenExpired = isTokenExpired;
    window.clearAuthState = clearAuthState;
    window.hasValidToken = hasValidToken;
    window.isAuthenticated = isAuthenticated;
    window.verifySession = verifySession;
    window.requireAuth = requireAuth;
    window.logout = logout;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        isTokenExpired,
        clearAuthState,
        hasValidToken,
        isAuthenticated,
        verifySession,
        requireAuth,
        logout
    };
}
