/**
 * College ERP - Authentication Guard
 */
function isAuthenticated() {
    if (typeof localStorage === "undefined") return false;
    const token = localStorage.getItem("token");
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    return Boolean(token && isLoggedIn);
}

function requireAuth() {
    if (!isAuthenticated()) {
        if (typeof window !== "undefined" && window.location) {
            const currentPath = window.location.pathname || "";
            if (!currentPath.includes("login")) {
                window.location.replace("/pages/login/login.html");
            }
        }
    }
}

async function logout() {
    try {
        if (typeof window !== "undefined" && window.authAPI && typeof window.authAPI.logout === "function") {
            await window.authAPI.logout();
        }
    } catch (e) {
        console.warn("Logout error:", e);
    } finally {
        if (typeof localStorage !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("isLoggedIn");
            localStorage.removeItem("adminName");
        }
        if (typeof window !== "undefined" && window.location) {
            window.location.replace("/pages/login/login.html");
        }
    }
}

if (typeof window !== "undefined") {
    window.isAuthenticated = isAuthenticated;
    window.requireAuth = requireAuth;
    window.logout = logout;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        isAuthenticated,
        requireAuth,
        logout
    };
}
