 console.log("Attendance Module Loaded");

// ==========================
// Elements
// ==========================

const attendanceTable = document.getElementById("attendanceTable");
const searchInput = document.getElementById("searchAttendance");
const totalAttendance = document.getElementById("totalAttendance");

// ==========================
// Local Storage Data
// ==========================

let students = JSON.parse(localStorage.getItem("students")) || [];
let attendance = JSON.parse(localStorage.getItem("attendance")) || {};

// ==========================
// Load Attendance Table
// ==========================

function loadAttendance(data = students) {

    attendanceTable.innerHTML = "";

    if (data.length === 0) {

        attendanceTable.innerHTML = `
            <tr>
                <td colspan="4">
                    No Students Found
                </td>
            </tr>
        `;

        totalAttendance.textContent = 0;
        return;
    }

    data.forEach(student => {

        const status = attendance[student.roll] || "Present";

        attendanceTable.innerHTML += `

        <tr>

            <td>${student.roll}</td>

            <td>${student.name}</td>

            <td>${student.branch}</td>

            <td>

                <select
                    onchange="saveAttendance('${student.roll}', this.value)">

                    <option value="Present"
                        ${status === "Present" ? "selected" : ""}>
                        Present
                    </option>

                    <option value="Absent"
                        ${status === "Absent" ? "selected" : ""}>
                        Absent
                    </option>

                </select>

            </td>

        </tr>

        `;

    });

    totalAttendance.textContent = data.length;

    updateDashboardAttendance();

}

// ==========================
// Save Attendance
// ==========================

function saveAttendance(roll, status) {

    attendance[roll] = status;

    localStorage.setItem(
        "attendance",
        JSON.stringify(attendance)
    );

    updateDashboardAttendance();

}

// ==========================
// Dashboard Attendance
// ==========================

function updateDashboardAttendance() {

    let total = students.length;

    let present = 0;

    students.forEach(student => {

        if ((attendance[student.roll] || "Present") === "Present") {

            present++;

        }

    });

    let percentage = 0;

    if (total > 0) {

        percentage = Math.round(
            (present / total) * 100
        );

    }

    localStorage.setItem(
        "attendancePercentage",
        percentage
    );

}

// ==========================
// Search Student
// ==========================

searchInput.addEventListener("keyup", function () {

    const value = this.value.toLowerCase();

    const filtered = students.filter(student => {

        return (

            student.roll.toLowerCase().includes(value) ||

            student.name.toLowerCase().includes(value) ||

            student.branch.toLowerCase().includes(value)

        );

    });

    loadAttendance(filtered);

});

// ==========================
// First Load
// ==========================

loadAttendance();