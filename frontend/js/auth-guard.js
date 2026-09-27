/**
 * College ERP - Authentication Guard
 */
function isAuthenticated() {
    const token = localStorage.getItem("token");
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    return Boolean(token && isLoggedIn);
}

function requireAuth() {
    if (!isAuthenticated()) {
        const currentPath = window.location.pathname;
        if (!currentPath.includes("login")) {
            window.location.replace("../login/login.html");
        }
    }
}

async function logout() {
    try {
        if (window.authAPI && typeof window.authAPI.logout === "function") {
            await window.authAPI.logout();
        }
    } catch (e) {
        console.warn("Logout error:", e);
    } finally {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("adminName");
        window.location.replace("../login/login.html");
    }
}

window.isAuthenticated = isAuthenticated;
window.requireAuth = requireAuth;
window.logout = logout;
