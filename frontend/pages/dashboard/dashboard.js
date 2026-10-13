console.log("Dashboard Loaded");

// =========================
// Login Check
// =========================
if (typeof requireAuth === "function") {
    requireAuth();
}

// Current user state
let currentUser = null;
try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) currentUser = JSON.parse(rawUser);
} catch (e) {
    console.warn("Error parsing user from localStorage:", e);
}

// =========================
// RBAC Sidebar Navigation
// =========================
function setupRBACNavigation() {
    if (!currentUser) return;

    const userRole = currentUser.role || "admin";
    const adminRequestsNav = document.getElementById("adminRequestsNavItem");

    // Only Super Admin can access the Admin Requests panel
    if (adminRequestsNav) {
        if (userRole === "super_admin") {
            adminRequestsNav.style.display = "block";
            updatePendingBadge();
        } else {
            adminRequestsNav.style.display = "none";
        }
    }

    // Role-specific navigation filters for specialized administrative roles
    const sidebarLinks = document.querySelectorAll(".sidebar ul li a");
    sidebarLinks.forEach(link => {
        const text = link.textContent.trim().toLowerCase();
        if (userRole === "accountant") {
            // Accountant sees Dashboard, Fees, Logout
            if (!text.includes("dashboard") && !text.includes("fees") && !text.includes("logout")) {
                link.parentElement.style.display = "none";
            }
        } else if (userRole === "admission_admin") {
            // Admission Admin sees Dashboard, Students, Attendance, Logout
            if (!text.includes("dashboard") && !text.includes("students") && !text.includes("attendance") && !text.includes("logout")) {
                link.parentElement.style.display = "none";
            }
        } else if (userRole === "hr_admin") {
            // HR Admin sees Dashboard, Teachers, Logout
            if (!text.includes("dashboard") && !text.includes("teachers") && !text.includes("logout")) {
                link.parentElement.style.display = "none";
            }
        }
    });
}

// Update pending requests badge
async function updatePendingBadge() {
    if (!currentUser || currentUser.role !== "super_admin") return;
    try {
        if (typeof adminAPI !== "undefined" && typeof adminAPI.getRegistrationRequests === "function") {
            const res = await adminAPI.getRegistrationRequests("pending");
            if (res && res.success && Array.isArray(res.data)) {
                const badge = document.getElementById("pendingRequestsBadge");
                const countSpan = document.getElementById("pendingTabCount");
                const count = res.data.length;
                if (badge) {
                    badge.textContent = count;
                    badge.style.display = count > 0 ? "inline-block" : "none";
                }
                if (countSpan) {
                    countSpan.textContent = count;
                }
            }
        }
    } catch (e) {
        console.warn("Failed to fetch pending requests count:", e);
    }
}

// =========================
// View Switcher (Dashboard / Admin Requests)
// =========================
function switchDashboardView(view) {
    const cards = document.querySelector(".cards");
    const activity = document.querySelector(".activity");
    const adminView = document.getElementById("adminRequestsView");
    const headerTitle = document.querySelector(".header h1");

    if (view === "admin-requests") {
        if (cards) cards.style.display = "none";
        if (activity) activity.style.display = "none";
        if (adminView) adminView.style.display = "block";
        if (headerTitle) headerTitle.textContent = "Admin Requests & Approvals";
        loadAdminRequests();
    } else {
        if (cards) cards.style.display = "grid";
        if (activity) activity.style.display = "block";
        if (adminView) adminView.style.display = "none";
        if (headerTitle) headerTitle.textContent = "Dashboard";
    }
}

// =========================
// Admin Tabs Switcher
// =========================
function switchAdminTab(tab) {
    const pendingPanel = document.getElementById("pendingRequestsPanel");
    const historyPanel = document.getElementById("historyRequestsPanel");
    const tabPendingBtn = document.getElementById("tabPendingBtn");
    const tabHistoryBtn = document.getElementById("tabHistoryBtn");

    if (tab === "pending") {
        if (pendingPanel) pendingPanel.style.display = "block";
        if (historyPanel) historyPanel.style.display = "none";
        if (tabPendingBtn) tabPendingBtn.classList.add("active");
        if (tabHistoryBtn) tabHistoryBtn.classList.remove("active");
    } else {
        if (pendingPanel) pendingPanel.style.display = "none";
        if (historyPanel) historyPanel.style.display = "block";
        if (tabPendingBtn) tabPendingBtn.classList.remove("active");
        if (tabHistoryBtn) tabHistoryBtn.classList.add("active");
        loadAdminHistory();
    }
}

// =========================
// Load Admin Requests (Pending)
// =========================
async function loadAdminRequests() {
    const tableBody = document.getElementById("pendingRequestsTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="7">Loading pending requests...</td></tr>';

    try {
        const response = await adminAPI.getRegistrationRequests("pending");
        if (response && response.success && Array.isArray(response.data)) {
            const requests = response.data;
            updatePendingBadge();

            if (requests.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" style="color: #6b7280; padding: 20px;">No pending registration requests at this time.</td></tr>';
                return;
            }

            tableBody.innerHTML = "";
            requests.forEach(req => {
                const row = document.createElement("tr");
                const submitDate = req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "Recent";
                const emailStatus = req.isEmailVerified
                    ? '<span style="color: #059669; font-weight: 600;">✅ Verified</span>'
                    : '<span style="color: #d97706; font-weight: 600;">⏳ Unverified</span>';

                row.innerHTML = `
                    <td style="font-weight: 600;">${escapeHtml(req.name)}</td>
                    <td>${escapeHtml(req.collegeName)}</td>
                    <td>${escapeHtml(req.email)}</td>
                    <td>${escapeHtml(req.phone)}</td>
                    <td>${submitDate}</td>
                    <td>${emailStatus}</td>
                    <td>
                        <button onclick="openApproveModal('${req._id}', '${escapeJs(req.name)}', '${req.requestedRole || "admin"}')" 
                                style="padding: 6px 12px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px;">
                            Approve
                        </button>
                        <button onclick="openRejectModal('${req._id}', '${escapeJs(req.name)}')" 
                                style="padding: 6px 12px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            Reject
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="7" style="color: #dc2626;">Failed to load requests.</td></tr>';
        }
    } catch (err) {
        console.error("Error loading admin requests:", err);
        tableBody.innerHTML = '<tr><td colspan="7" style="color: #dc2626;">Error loading requests from server.</td></tr>';
    }
}

// Load Approval History
async function loadAdminHistory() {
    const tableBody = document.getElementById("historyRequestsTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6">Loading history...</td></tr>';

    try {
        const response = await adminAPI.getRegistrationRequests();
        if (response && response.success && Array.isArray(response.data)) {
            const history = response.data.filter(r => r.status === "approved" || r.status === "rejected");

            if (history.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" style="color: #6b7280; padding: 20px;">No historical decisions recorded yet.</td></tr>';
                return;
            }

            tableBody.innerHTML = "";
            history.forEach(item => {
                const row = document.createElement("tr");
                const decision = item.status === "approved"
                    ? '<span style="color: #16a34a; font-weight: 600;">✅ Approved</span>'
                    : '<span style="color: #dc2626; font-weight: 600;">❌ Rejected</span>';
                const reviewedDate = item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString() : "-";
                const reviewerName = item.reviewedBy ? (item.reviewedBy.name || item.reviewedBy.email) : "Super Admin";

                row.innerHTML = `
                    <td style="font-weight: 600;">${escapeHtml(item.name)}</td>
                    <td>${escapeHtml(item.collegeName)}</td>
                    <td>${item.assignedRole || item.requestedRole || "admin"}</td>
                    <td>${decision}</td>
                    <td>${escapeHtml(reviewerName)}</td>
                    <td>${reviewedDate}</td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (err) {
        console.error("Error loading history:", err);
    }
}

// =========================
// Invitation Modal Handlers
// =========================
function openGenerateInviteModal() {
    const modal = document.getElementById("generateInviteModal");
    const resultBox = document.getElementById("inviteResultBox");
    if (resultBox) resultBox.style.display = "none";
    if (modal) modal.style.display = "flex";
}

function closeGenerateInviteModal() {
    const modal = document.getElementById("generateInviteModal");
    if (modal) modal.style.display = "none";
}

async function submitGenerateInvite() {
    const recipientEmail = document.getElementById("inviteRecipientEmail").value.trim();
    const allowedRole = document.getElementById("inviteAllowedRole").value;
    const expiresInHours = document.getElementById("inviteExpiryHours").value;
    const submitBtn = document.getElementById("submitInviteBtn");

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Generating...";
    }

    try {
        const payload = {
            recipientEmail: recipientEmail || undefined,
            allowedRole,
            expiresInHours: parseInt(expiresInHours, 10)
        };

        const res = await adminAPI.createInvitation(payload);
        if (res && res.success && res.data && res.data.rawToken) {
            const rawTokenOutput = document.getElementById("rawTokenOutput");
            const resultBox = document.getElementById("inviteResultBox");
            if (rawTokenOutput) rawTokenOutput.value = res.data.rawToken;
            if (resultBox) resultBox.style.display = "block";
        } else {
            alert(res?.message || "Failed to generate invitation token.");
        }
    } catch (err) {
        alert(err.message || "Failed to generate invitation.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Generate Token";
        }
    }
}

function copyInviteToken() {
    const rawTokenOutput = document.getElementById("rawTokenOutput");
    if (rawTokenOutput && rawTokenOutput.value) {
        navigator.clipboard.writeText(rawTokenOutput.value).then(() => {
            alert("Invitation token copied to clipboard!");
        }).catch(() => {
            rawTokenOutput.select();
            document.execCommand("copy");
            alert("Token copied!");
        });
    }
}

// =========================
// Approve / Reject Modal Handlers
// =========================
let currentApprovingId = null;
let currentRejectingId = null;

function openApproveModal(id, name, requestedRole) {
    currentApprovingId = id;
    const info = document.getElementById("approveApplicantInfo");
    const roleSelect = document.getElementById("approveAssignedRole");
    const modal = document.getElementById("approveModal");

    if (info) info.textContent = `Applicant: ${name} (Requested role: ${requestedRole})`;
    if (roleSelect && requestedRole) roleSelect.value = requestedRole;
    if (modal) modal.style.display = "flex";
}

function closeApproveModal() {
    currentApprovingId = null;
    const modal = document.getElementById("approveModal");
    if (modal) modal.style.display = "none";
}

async function submitApproveApplicant() {
    if (!currentApprovingId) return;

    const assignedRole = document.getElementById("approveAssignedRole").value;
    const permissions = [];
    if (document.getElementById("perm_students")?.checked) permissions.push("manage_students");
    if (document.getElementById("perm_teachers")?.checked) permissions.push("manage_teachers");
    if (document.getElementById("perm_attendance")?.checked) permissions.push("manage_attendance");
    if (document.getElementById("perm_fees")?.checked) permissions.push("manage_fees");
    if (document.getElementById("perm_results")?.checked) permissions.push("manage_results");

    const btn = document.getElementById("confirmApproveBtn");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Approving...";
    }

    try {
        const res = await adminAPI.approveRequest(currentApprovingId, { assignedRole, permissions });
        if (res && res.success) {
            alert("Applicant approved and active user account created successfully!");
            closeApproveModal();
            loadAdminRequests();
        } else {
            alert(res?.message || "Failed to approve applicant.");
        }
    } catch (err) {
        alert(err.message || "Approval request failed.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Approve & Activate";
        }
    }
}

function openRejectModal(id, name) {
    currentRejectingId = id;
    const info = document.getElementById("rejectApplicantInfo");
    const modal = document.getElementById("rejectModal");
    const reasonInput = document.getElementById("rejectReasonInput");

    if (info) info.textContent = `Applicant: ${name}`;
    if (reasonInput) reasonInput.value = "";
    if (modal) modal.style.display = "flex";
}

function closeRejectModal() {
    currentRejectingId = null;
    const modal = document.getElementById("rejectModal");
    if (modal) modal.style.display = "none";
}

async function submitRejectApplicant() {
    if (!currentRejectingId) return;

    const reason = document.getElementById("rejectReasonInput").value.trim();
    const btn = document.getElementById("confirmRejectBtn");

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Rejecting...";
    }

    try {
        const res = await adminAPI.rejectRequest(currentRejectingId, { reason });
        if (res && res.success) {
            alert("Applicant registration rejected.");
            closeRejectModal();
            loadAdminRequests();
        } else {
            alert(res?.message || "Failed to reject applicant.");
        }
    } catch (err) {
        alert(err.message || "Rejection request failed.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Reject Application";
        }
    }
}

// Helpers
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJs(str) {
    if (!str) return "";
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Expose globals for HTML onclick bindings
window.switchDashboardView = switchDashboardView;
window.switchAdminTab = switchAdminTab;
window.openGenerateInviteModal = openGenerateInviteModal;
window.closeGenerateInviteModal = closeGenerateInviteModal;
window.submitGenerateInvite = submitGenerateInvite;
window.copyInviteToken = copyInviteToken;
window.openApproveModal = openApproveModal;
window.closeApproveModal = closeApproveModal;
window.submitApproveApplicant = submitApproveApplicant;
window.openRejectModal = openRejectModal;
window.closeRejectModal = closeRejectModal;
window.submitRejectApplicant = submitRejectApplicant;

// =========================
// Update Admin Greeting
// =========================
function updateAdminGreeting() {
    const adminElement = document.querySelector(".admin");
    if (adminElement) {
        const storedUser = localStorage.getItem("user");
        let name = localStorage.getItem("adminName");
        let role = "";
        if (storedUser) {
            try {
                const userObj = JSON.parse(storedUser);
                if (userObj.name) name = userObj.name;
                if (userObj.role) role = ` (${userObj.role.replace("_", " ").toUpperCase()})`;
            } catch {}
        }
        if (name) {
            adminElement.textContent = "Welcome, " + name + role;
        }
    }
}

// =========================
// Load Dashboard from MongoDB
// =========================
async function updateDashboard() {
    updateAdminGreeting();
    setupRBACNavigation();

    try {
        const response = await dashboardAPI.getStats();

        if (response && response.success && response.data) {
            const stats = response.data;

            // Total Students
            const totalStudentsCard = document.getElementById("totalStudentsCard");
            if (totalStudentsCard) {
                totalStudentsCard.textContent = stats.totalStudents ?? 0;
            }

            // Total Teachers
            const teacherCard = document.getElementById("teacherCard");
            if (teacherCard) {
                teacherCard.textContent = stats.totalTeachers ?? 0;
            }

            // Student Attendance
            const studentAttendanceElem = document.getElementById("studentAttendance");
            if (studentAttendanceElem) {
                const totalAtt = (stats.presentToday || 0) + (stats.absentToday || 0);
                if (totalAtt > 0) {
                    const pct = ((stats.presentToday / totalAtt) * 100).toFixed(1);
                    studentAttendanceElem.textContent = `${pct}%`;
                } else {
                    studentAttendanceElem.textContent = "0%";
                }
            }

            // Teacher Attendance
            const teacherAttendanceElem = document.getElementById("teacherAttendance");
            if (teacherAttendanceElem) {
                teacherAttendanceElem.textContent = stats.totalTeachers > 0 ? "100%" : "0%";
            }

            // Fees Collected
            const feesCard = document.getElementById("feesCard");
            if (feesCard) {
                const feeVal = Number(stats.totalFeeCollected || 0);
                feesCard.textContent = "₹" + feeVal.toLocaleString();
            }

            // Total Results
            const resultCard = document.getElementById("resultCard");
            if (resultCard) {
                resultCard.textContent = stats.recentResults ? stats.recentResults.length : 0;
            }

            // Recent Activity table
            const tableBody = document.getElementById("activityTableBody");
            if (tableBody && stats.recentStudents && stats.recentStudents.length > 0) {
                tableBody.innerHTML = "";
                stats.recentStudents.slice(0, 5).forEach(s => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>Today</td>
                        <td>Student Registered: ${s.firstName} ${s.lastName} (${s.rollNumber})</td>
                        <td>✅ Active</td>
                    `;
                    tableBody.appendChild(row);
                });
            }
        } else if (response && response.offline) {
            console.warn(response.message);
        }
    } catch (err) {
        console.error("Failed to load dashboard data from backend:", err);
    }
}

// Initial Run
updateDashboard();
