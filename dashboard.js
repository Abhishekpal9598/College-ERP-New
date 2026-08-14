 console.log("Dashboard Loaded");
 // =========================
// Login Check
// =========================

if (localStorage.getItem("isLoggedIn") !== "true") {

    alert("Please login first.");

    window.location.href = "index.html";

}

// =========================
// Update Dashboard
// =========================

function updateDashboard() {

    // =========================
    // Total Students
    // =========================

    const students =
        JSON.parse(localStorage.getItem("students")) || [];

    const totalStudentsCard =
        document.getElementById("totalStudentsCard");

    if (totalStudentsCard) {

        totalStudentsCard.textContent =
            students.length;

    }

    // =========================
    // Total Teachers
    // =========================

    const teacherCard =
        document.getElementById("teacherCard");

    if (teacherCard) {

        const teacherCount =
            localStorage.getItem("teacherCount") || 0;

        teacherCard.textContent =
            teacherCount;

    }

     // =========================
// Student Attendance Percentage
// =========================

const studentAttendanceCard =
    document.getElementById("studentAttendance");

let studentAttendance =
    JSON.parse(
        localStorage.getItem("studentAttendance")
    ) || [];

if (studentAttendanceCard) {

    if (studentAttendance.length > 0) {

        let present =
            studentAttendance.filter(
                a => a.status === "Present"
            ).length;

        let percentage =
            Math.round(
                (present / studentAttendance.length) * 100
            );

        studentAttendanceCard.textContent =
            percentage + "%";

    } else {

        studentAttendanceCard.textContent =
            "0%";

    }

}


// =========================
// Teacher Attendance Percentage
// =========================

const teacherAttendanceCard =
    document.getElementById("teacherAttendance");

let teacherAttendance =
    JSON.parse(
        localStorage.getItem("teacherAttendance")
    ) || [];

if (teacherAttendanceCard) {

    if (teacherAttendance.length > 0) {

        let present =
            teacherAttendance.filter(
                a => a.status === "Present"
            ).length;

        let percentage =
            Math.round(
                (present / teacherAttendance.length) * 100
            );

        teacherAttendanceCard.textContent =
            percentage + "%";

    } else {

        teacherAttendanceCard.textContent =
            "0%";

    }

}

    // =========================
    // Fees Collection
    // =========================

    const feesCard =
        document.getElementById("feesCard");

    let fees =
        JSON.parse(localStorage.getItem("fees")) || [];

    if (feesCard) {

        let totalFees =
            fees.reduce(
                (sum, fee) =>
                    sum + Number(fee.amount),
                0
            );

        feesCard.textContent =
            "₹" + totalFees.toLocaleString();

    }

    // =========================
    // Total Results
    // =========================

    const resultCard =
        document.getElementById("resultCard");

    if (resultCard) {

        const resultCount =
            localStorage.getItem("resultCount") || 0;

        resultCard.textContent =
            resultCount;

    }

}

// =========================
// Run Function
// =========================

updateDashboard();
// =========================
// Logout
// =========================
 // =========================
// Logout
// =========================

function logout() {

    if (confirm("Are you sure you want to logout?")) {

        localStorage.removeItem("isLoggedIn");

        window.location.href = "index.html";

    }

}