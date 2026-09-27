/**
 * College ERP - Client Configuration
 */
window.APP_CONFIG = {
    API_URL: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : "/api",
    APP_NAME: "College ERP",
    VERSION: "1.0.0"
};
