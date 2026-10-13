/**
 * College ERP - Client Configuration
 */
window.APP_CONFIG = {
    // Priority: window.__API_URL__ -> localStorage("API_URL") -> localhost:5000 -> /api
    API_URL: (function() {
        if (typeof window !== "undefined") {
            const isLocalClient = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

            if (window.__API_URL__) {
                const isLocalTarget = window.__API_URL__.includes("localhost") || window.__API_URL__.includes("127.0.0.1");
                const isMixed = window.location.protocol === "https:" && window.__API_URL__.startsWith("http://");
                if (!((!isLocalClient && isLocalTarget) || isMixed)) {
                    return window.__API_URL__.replace(/\/+$/, "");
                }
            }

            const stored = localStorage.getItem("API_URL");
            if (stored) {
                const isLocalTarget = stored.includes("localhost") || stored.includes("127.0.0.1");
                const isMixed = window.location.protocol === "https:" && stored.startsWith("http://");
                if ((!isLocalClient && isLocalTarget) || isMixed) {
                    localStorage.removeItem("API_URL");
                } else {
                    return stored.replace(/\/+$/, "");
                }
            }

            if (isLocalClient) {
                return "http://localhost:5000/api";
            }
        }
        return "https://college-erp-new-2-ki-project-mere.onrender.com/api";
    })(),
    APP_NAME: "College ERP",
    VERSION: "1.0.0"
};
