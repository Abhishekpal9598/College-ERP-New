/**
 * College ERP - Client API Service
 * Dynamic backend REST API configuration with production fallback
 */

const getApiBaseUrl = () => {
    if (typeof window !== "undefined") {
        const isLocalClient = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

        // 1. Explicit window override
        if (window.__API_URL__) {
            const isLocalTarget = window.__API_URL__.includes("localhost") || window.__API_URL__.includes("127.0.0.1");
            const isMixed = window.location.protocol === "https:" && window.__API_URL__.startsWith("http://");
            if (!((!isLocalClient && isLocalTarget) || isMixed)) {
                return window.__API_URL__.replace(/\/+$/, "");
            }
        }

        // 2. LocalStorage override with stale localhost & mixed-content protection
        const storedUrl = localStorage.getItem("API_URL");
        if (storedUrl) {
            const isLocalTarget = storedUrl.includes("localhost") || storedUrl.includes("127.0.0.1");
            const isMixed = window.location.protocol === "https:" && storedUrl.startsWith("http://");
            // If running on production/HTTPS and stored URL points to localhost or insecure http, purge it
            if ((!isLocalClient && isLocalTarget) || isMixed) {
                localStorage.removeItem("API_URL");
            } else {
                return storedUrl.replace(/\/+$/, "");
            }
        }

        // 3. Application configuration
        if (window.APP_CONFIG && window.APP_CONFIG.API_URL) {
            const isLocalTarget = window.APP_CONFIG.API_URL.includes("localhost") || window.APP_CONFIG.API_URL.includes("127.0.0.1");
            const isMixed = window.location.protocol === "https:" && window.APP_CONFIG.API_URL.startsWith("http://");
            if (!((!isLocalClient && isLocalTarget) || isMixed)) {
                return window.APP_CONFIG.API_URL.replace(/\/+$/, "");
            }
        }

        // 4. In local development, connect to local backend on port 5000
        if (isLocalClient) {
            return "http://localhost:5000/api";
        }
    }
    // In production, fallback to Render backend API endpoint
    return "https://college-erp-new-2-ki-project-mere.onrender.com/api";
};

/**
 * Core fetch wrapper with auth header attachment, endpoint normalization, and graceful offline handling
 */
async function apiFetch(endpoint, options = {}) {
    const apiBase = getApiBaseUrl();
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;

    // Normalize endpoint to prevent duplicate /api prefixes and ensure leading slash
    let cleanEndpoint = endpoint || "/";
    if (cleanEndpoint.startsWith("/api/")) {
        cleanEndpoint = cleanEndpoint.substring(4);
    } else if (cleanEndpoint === "/api") {
        cleanEndpoint = "/";
    } else if (!cleanEndpoint.startsWith("/")) {
        cleanEndpoint = `/${cleanEndpoint}`;
    }

    const targetUrl = `${apiBase.replace(/\/+$/, "")}${cleanEndpoint}`;

    const defaultHeaders = {
        "Content-Type": "application/json"
    };

    if (token) {
        defaultHeaders["Authorization"] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(targetUrl, config);
        const data = await response.json().catch(() => null);

        // Handle 401 Unauthorized (session expired or invalid token)
        if (response.status === 401 && !endpoint.includes("/auth/login")) {
            if (typeof localStorage !== "undefined") {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                localStorage.removeItem("isLoggedIn");
            }
            if (typeof alert === "function") {
                alert("Your session has expired. Please login again.");
            }
            if (typeof window !== "undefined" && window.location) {
                window.location.href = "/pages/login/login.html";
            }
            return { success: false, message: "Session expired" };
        }

        if (!response.ok) {
            return {
                success: false,
                status: response.status,
                message: (data && data.message) ? data.message : `Request failed with status ${response.status}`,
                errors: data && data.errors
            };
        }

        return data;
    } catch (networkError) {
        console.warn(`[API Network Error] ${endpoint}: ${networkError.message}`);
        return {
            success: false,
            offline: true,
            message: "Backend server is unreachable. Please ensure the backend server is running and accessible."
        };
    }
}

// Authentication API
const authAPI = {
    login: async (email, password) => {
        return apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
    },
    registerAdmin: async (adminData) => {
        return apiFetch("/auth/register-admin", {
            method: "POST",
            body: JSON.stringify(adminData)
        });
    },
    verifyEmail: async (token) => {
        return apiFetch("/auth/verify-email", {
            method: "POST",
            body: JSON.stringify({ token })
        });
    },
    forgotPassword: async (email) => {
        return apiFetch("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email })
        });
    },
    resetPassword: async (token, newPassword, confirmPassword) => {
        return apiFetch("/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({ token, newPassword, confirmPassword })
        });
    },
    logout: async () => {
        return apiFetch("/auth/logout", {
            method: "POST"
        });
    },
    getMe: async () => {
        return apiFetch("/auth/me");
    }
};

// Dashboard API
const dashboardAPI = {
    getStats: async () => {
        return apiFetch("/dashboard/stats");
    }
};

// Students API
const studentAPI = {
    getStudents: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiFetch(`/students${query ? `?${query}` : ""}`);
    },
    getStudent: async (id) => {
        return apiFetch(`/students/${id}`);
    },
    createStudent: async (studentData) => {
        return apiFetch("/students", {
            method: "POST",
            body: JSON.stringify(studentData)
        });
    },
    updateStudent: async (id, studentData) => {
        return apiFetch(`/students/${id}`, {
            method: "PUT",
            body: JSON.stringify(studentData)
        });
    },
    deleteStudent: async (id) => {
        return apiFetch(`/students/${id}`, {
            method: "DELETE"
        });
    }
};

// Teachers API
const teacherAPI = {
    getTeachers: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiFetch(`/teachers${query ? `?${query}` : ""}`);
    },
    getTeacher: async (id) => {
        return apiFetch(`/teachers/${id}`);
    },
    createTeacher: async (teacherData) => {
        return apiFetch("/teachers", {
            method: "POST",
            body: JSON.stringify(teacherData)
        });
    },
    updateTeacher: async (id, teacherData) => {
        return apiFetch(`/teachers/${id}`, {
            method: "PUT",
            body: JSON.stringify(teacherData)
        });
    },
    deleteTeacher: async (id) => {
        return apiFetch(`/teachers/${id}`, {
            method: "DELETE"
        });
    }
};

// Attendance API
const attendanceAPI = {
    getAttendance: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiFetch(`/attendance${query ? `?${query}` : ""}`);
    },
    recordAttendance: async (attendanceData) => {
        return apiFetch("/attendance", {
            method: "POST",
            body: JSON.stringify(attendanceData)
        });
    },
    updateAttendance: async (id, attendanceData) => {
        return apiFetch(`/attendance/${id}`, {
            method: "PUT",
            body: JSON.stringify(attendanceData)
        });
    },
    getStudentAttendance: async (studentId) => {
        return apiFetch(`/attendance/student/${studentId}`);
    }
};

// Fees API
const feeAPI = {
    getFees: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiFetch(`/fees${query ? `?${query}` : ""}`);
    },
    createFee: async (feeData) => {
        return apiFetch("/fees", {
            method: "POST",
            body: JSON.stringify(feeData)
        });
    },
    updateFee: async (id, feeData) => {
        return apiFetch(`/fees/${id}`, {
            method: "PUT",
            body: JSON.stringify(feeData)
        });
    },
    recordPayment: async (id, paymentData) => {
        return apiFetch(`/fees/${id}/pay`, {
            method: "PATCH",
            body: JSON.stringify(paymentData)
        });
    },
    deleteFee: async (id) => {
        return apiFetch(`/fees/${id}`, {
            method: "DELETE"
        });
    },
    getStudentFees: async (studentId) => {
        return apiFetch(`/fees/student/${studentId}`);
    }
};

// Results API
const resultAPI = {
    getResults: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiFetch(`/results${query ? `?${query}` : ""}`);
    },
    createResult: async (resultData) => {
        return apiFetch("/results", {
            method: "POST",
            body: JSON.stringify(resultData)
        });
    },
    updateResult: async (id, resultData) => {
        return apiFetch(`/results/${id}`, {
            method: "PUT",
            body: JSON.stringify(resultData)
        });
    },
    deleteResult: async (id) => {
        return apiFetch(`/results/${id}`, {
            method: "DELETE"
        });
    },
    getStudentResults: async (studentId) => {
        return apiFetch(`/results/student/${studentId}`);
    }
};

// Super Admin Management API
const adminAPI = {
    createInvitation: async (invitationData) => {
        return apiFetch("/admin/invitations", {
            method: "POST",
            body: JSON.stringify(invitationData)
        });
    },
    getInvitations: async () => {
        return apiFetch("/admin/invitations");
    },
    revokeInvitation: async (id) => {
        return apiFetch(`/admin/invitations/${id}`, {
            method: "DELETE"
        });
    },
    getRegistrationRequests: async (status) => {
        const query = status ? `?status=${encodeURIComponent(status)}` : "";
        return apiFetch(`/admin/registration-requests${query}`);
    },
    getRegistrationRequestById: async (id) => {
        return apiFetch(`/admin/registration-requests/${id}`);
    },
    approveRequest: async (id, approvalData = {}) => {
        return apiFetch(`/admin/registration-requests/${id}/approve`, {
            method: "POST",
            body: JSON.stringify(approvalData)
        });
    },
    rejectRequest: async (id, rejectionData = {}) => {
        return apiFetch(`/admin/registration-requests/${id}/reject`, {
            method: "POST",
            body: JSON.stringify(rejectionData)
        });
    },
    getAuditLogs: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiFetch(`/admin/audit-logs${query ? `?${query}` : ""}`);
    }
};

// Expose globally
if (typeof window !== "undefined") {
    window.authAPI = authAPI;
    window.adminAPI = adminAPI;
    window.dashboardAPI = dashboardAPI;
    window.studentAPI = studentAPI;
    window.teacherAPI = teacherAPI;
    window.attendanceAPI = attendanceAPI;
    window.feeAPI = feeAPI;
    window.resultAPI = resultAPI;
    window.getApiBaseUrl = getApiBaseUrl;
    window.apiFetch = apiFetch;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        getApiBaseUrl,
        apiFetch,
        authAPI,
        adminAPI,
        dashboardAPI,
        studentAPI,
        teacherAPI,
        attendanceAPI,
        feeAPI,
        resultAPI
    };
}

