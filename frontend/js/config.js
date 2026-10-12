/**
 * College ERP - Client Configuration
 */
window.APP_CONFIG = {
    // Priority: window.__API_URL__ -> localStorage("API_URL") -> localhost:5000 -> /api
    API_URL: (function() {
        if (typeof window !== "undefined") {
            if (window.__API_URL__) return window.__API_URL__.replace(/\/+$/, "");
            const stored = localStorage.getItem("API_URL");
            if (stored) return stored.replace(/\/+$/, "");
            if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
                return "http://localhost:5000/api";
            }
        }
        return "https://college-erp-api.onrender.com/api";
    })(),
    APP_NAME: "College ERP",
    VERSION: "1.0.0"
};
