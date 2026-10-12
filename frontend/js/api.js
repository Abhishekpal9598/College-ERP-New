/**
 * College ERP - Client API Service
 * Dynamic backend REST API configuration with production fallback
 */

const getApiBaseUrl = () => {
    if (typeof window !== "undefined") {
        if (window.__API_URL__) return window.__API_URL__.replace(/\/+$/, "");
        const storedUrl = localStorage.getItem("API_URL");
        if (storedUrl) return storedUrl.replace(/\/+$/, "");
        if (window.APP_CONFIG && window.APP_CONFIG.API_URL) return window.APP_CONFIG.API_URL.replace(/\/+$/, "");
        
        // In local development, connect to local backend on port 5000
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
            return "http://localhost:5000/api";
        }
    }
    // In production, fallback to same-origin /api or environment variable
    return "/api";
};

/**
 * Core fetch wrapper with auth header attachment and graceful offline handling
 */
async function apiFetch(endpoint, options = {}) {
    const apiBase = getApiBaseUrl();
    const token = localStorage.getItem("token");

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
        const response = await fetch(`${apiBase}${endpoint}`, config);
        const data = await response.json().catch(() => null);

        // Handle 401 Unauthorized (session expired or invalid token)
        if (response.status === 401 && !endpoint.includes("/auth/login")) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("isLoggedIn");
            alert("Your session has expired. Please login again.");
            window.location.href = "../login/login.html";
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
            message: "Backend server is unreachable (offline). Please ensure the backend server is running on http://localhost:5000"
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

// Expose globally
window.authAPI = authAPI;
window.dashboardAPI = dashboardAPI;
window.studentAPI = studentAPI;
window.teacherAPI = teacherAPI;
window.attendanceAPI = attendanceAPI;
window.feeAPI = feeAPI;
window.resultAPI = resultAPI;
