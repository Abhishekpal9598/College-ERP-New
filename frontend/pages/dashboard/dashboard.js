console.log("Dashboard Loaded");

// =========================
// Login Check
// =========================
if (typeof requireAuth === "function") {
    requireAuth();
}

// =========================
// Update Admin Greeting
// =========================
function updateAdminGreeting() {
    const adminElement = document.querySelector(".admin");
    if (adminElement) {
        const storedUser = localStorage.getItem("user");
        let name = localStorage.getItem("adminName");
        if (storedUser) {
            try {
                const userObj = JSON.parse(storedUser);
                if (userObj.name) name = userObj.name;
            } catch {}
        }
        if (name) {
            adminElement.textContent = "Welcome, " + name;
        }
    }
}

// =========================
// Load Dashboard from MongoDB
// =========================
async function updateDashboard() {
    updateAdminGreeting();

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
