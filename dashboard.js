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

 
// =======================================
// STUDENT ATTENDANCE
// =======================================

function updateStudentAttendance() {

    const attendance =
        JSON.parse(
            localStorage.getItem("studentAttendance")
        ) || [];


    if (attendance.length === 0) {

        document.getElementById(
            "studentAttendance"
        ).textContent = "0%";

        return;
    }


    const present =
        attendance.filter(
            record => record.status === "Present"
        ).length;


    const percentage =
        (present / attendance.length) * 100;


    document.getElementById(
        "studentAttendance"
    ).textContent =
        percentage.toFixed(1) + "%";

}


// =======================================
// TEACHER ATTENDANCE
// =======================================

function updateTeacherAttendance() {

    const attendance =
        JSON.parse(
            localStorage.getItem("teacherAttendance")
        ) || [];


    if (attendance.length === 0) {

        document.getElementById(
            "teacherAttendance"
        ).textContent = "0%";

        return;
    }


    const present =
        attendance.filter(
            record => record.status === "Present"
        ).length;


    const percentage =
        (present / attendance.length) * 100;


    document.getElementById(
        "teacherAttendance"
    ).textContent =
        percentage.toFixed(1) + "%";

}


// =======================================
// UPDATE DASHBOARD
// =======================================

function updateAttendanceDashboard() {

    updateStudentAttendance();

    updateTeacherAttendance();

}


updateAttendanceDashboard();

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

function logout() {

    if (confirm("Are you sure you want to logout?")) {

        localStorage.removeItem("isLoggedIn");

        window.location.href = "index.html";

    }

}