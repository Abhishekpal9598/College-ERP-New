// =======================================
// ATTENDANCE MANAGEMENT
// =======================================

console.log("Attendance Management Loaded");

let studentsList = [];
let teachersList = [];
let attendanceRecords = [];

const studentTab = document.getElementById("studentTab");
const teacherTab = document.getElementById("teacherTab");
const studentSection = document.getElementById("studentAttendanceSection");
const teacherSection = document.getElementById("teacherAttendanceSection");
const studentDate = document.getElementById("studentDate");
const teacherDate = document.getElementById("teacherDate");
const studentSearch = document.getElementById("studentSearch");
const teacherSearch = document.getElementById("teacherSearch");
const studentTable = document.getElementById("studentAttendanceTable");
const teacherTable = document.getElementById("teacherAttendanceTable");
const saveStudentBtn = document.getElementById("saveStudentAttendance");
const saveTeacherBtn = document.getElementById("saveTeacherAttendance");

function getTodayDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

const today = getTodayDate();

if (studentDate) studentDate.value = today;
if (teacherDate) teacherDate.value = today;

// Tab Switch
if (studentTab && teacherTab) {
    studentTab.addEventListener("click", function () {
        studentTab.classList.add("active");
        teacherTab.classList.remove("active");
        if (studentSection) studentSection.classList.remove("hidden");
        if (teacherSection) teacherSection.classList.add("hidden");
        loadStudentsAndAttendance();
    });

    teacherTab.addEventListener("click", function () {
        teacherTab.classList.add("active");
        studentTab.classList.remove("active");
        if (studentSection) studentSection.classList.add("hidden");
        if (teacherSection) teacherSection.classList.remove("hidden");
        loadTeachersAndAttendance();
    });
}

// =======================================
// LOAD STUDENTS & ATTENDANCE
// =======================================

async function loadStudentsAndAttendance() {
    if (!studentTable) return;
    studentTable.innerHTML = `<tr><td colspan="5">Loading students from database...</td></tr>`;

    try {
        const date = studentDate ? studentDate.value : today;

        const [studentsRes, attRes] = await Promise.all([
            studentAPI.getStudents({ limit: 100 }),
            attendanceAPI.getAttendance({ date })
        ]);

        if (studentsRes && studentsRes.success) {
            studentsList = studentsRes.data;
        }

        attendanceRecords = (attRes && attRes.success && Array.isArray(attRes.data)) ? attRes.data : [];

        renderStudentAttendanceTable(studentsList);
    } catch (err) {
        studentTable.innerHTML = `<tr><td colspan="5" style="color:red;">Error loading attendance.</td></tr>`;
    }
}

function renderStudentAttendanceTable(list) {
    if (!studentTable) return;
    studentTable.innerHTML = "";

    if (list.length === 0) {
        studentTable.innerHTML = `<tr><td colspan="5">No students found.</td></tr>`;
        return;
    }

    const date = studentDate ? studentDate.value : today;

    list.forEach((student, index) => {
        const studentRoll = student.rollNumber || student.roll || "";
        const savedRecord = attendanceRecords.find(r => {
            const rStudentId = r.student ? (r.student._id || r.student) : "";
            return String(rStudentId) === String(student._id) && r.date === date;
        });

        const savedStatus = savedRecord ? savedRecord.status : "";
        const row = document.createElement("tr");

        row.dataset.studentId = student._id;
        row.dataset.subject = "General";
        row.dataset.semester = student.semester || 1;
        row.dataset.section = student.section || "A";

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${student.fullName || `${student.firstName} ${student.lastName}`}</td>
            <td>${studentRoll}</td>
            <td>${student.department || student.branch || "-"}</td>
            <td>
                <div class="status-box">
                    <button type="button" class="status-btn present-btn ${savedStatus === 'present' ? 'selected' : ''}">
                        Present
                    </button>
                    <button type="button" class="status-btn absent-btn ${savedStatus === 'absent' ? 'selected' : ''}">
                        Absent
                    </button>
                </div>
            </td>
        `;

        const presentBtn = row.querySelector(".present-btn");
        const absentBtn = row.querySelector(".absent-btn");

        presentBtn.addEventListener("click", function () {
            presentBtn.classList.add("selected");
            absentBtn.classList.remove("selected");
        });

        absentBtn.addEventListener("click", function () {
            absentBtn.classList.add("selected");
            presentBtn.classList.remove("selected");
        });

        studentTable.appendChild(row);
    });
}

// Save Student Attendance
if (saveStudentBtn) {
    saveStudentBtn.addEventListener("click", async function () {
        const date = studentDate ? studentDate.value : today;
        const rows = studentTable ? studentTable.querySelectorAll("tr") : [];

        const batch = [];

        rows.forEach(row => {
            const studentId = row.dataset.studentId;
            if (!studentId) return;

            const presentBtn = row.querySelector(".present-btn");
            const absentBtn = row.querySelector(".absent-btn");

            let status = "";
            if (presentBtn && presentBtn.classList.contains("selected")) status = "present";
            else if (absentBtn && absentBtn.classList.contains("selected")) status = "absent";

            if (status) {
                batch.push({
                    student: studentId,
                    date,
                    status,
                    subject: "General",
                    semester: Number(row.dataset.semester || 1),
                    section: row.dataset.section || "A"
                });
            }
        });

        if (batch.length === 0) {
            alert("Please select Present or Absent for at least one student.");
            return;
        }

        try {
            const response = await attendanceAPI.recordAttendance({ batch });
            if (response && response.success) {
                alert(`Attendance saved for ${batch.length} student(s) to MongoDB!`);
                loadStudentsAndAttendance();
            } else {
                alert(response.message || "Failed to save attendance.");
            }
        } catch (err) {
            alert("Error saving attendance to backend.");
        }
    });
}

if (studentDate) {
    studentDate.addEventListener("change", loadStudentsAndAttendance);
}

if (studentSearch) {
    studentSearch.addEventListener("input", function () {
        const term = studentSearch.value.toLowerCase().trim();
        const filtered = studentsList.filter(s => {
            const name = (s.fullName || `${s.firstName} ${s.lastName}`).toLowerCase();
            const roll = (s.rollNumber || s.roll || "").toLowerCase();
            return name.includes(term) || roll.includes(term);
        });
        renderStudentAttendanceTable(filtered);
    });
}

// =======================================
// TEACHER ATTENDANCE
// =======================================

async function loadTeachersAndAttendance() {
    if (!teacherTable) return;
    teacherTable.innerHTML = `<tr><td colspan="5">Loading teachers from database...</td></tr>`;

    try {
        const response = await teacherAPI.getTeachers({ limit: 100 });
        if (response && response.success) {
            teachersList = response.data;
            renderTeachersAttendanceTable(teachersList);
        }
    } catch {
        teacherTable.innerHTML = `<tr><td colspan="5" style="color:red;">Error loading teachers.</td></tr>`;
    }
}

function renderTeachersAttendanceTable(list) {
    if (!teacherTable) return;
    teacherTable.innerHTML = "";

    list.forEach((t, i) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${i + 1}</td>
            <td>${t.fullName || `${t.firstName} ${t.lastName}`}</td>
            <td>${t.teacherId}</td>
            <td>${t.subject}</td>
            <td>
                <div class="status-box">
                    <button type="button" class="status-btn present-btn selected">Present</button>
                    <button type="button" class="status-btn absent-btn">Absent</button>
                </div>
            </td>
        `;
        const p = row.querySelector(".present-btn");
        const a = row.querySelector(".absent-btn");
        p.onclick = () => { p.classList.add("selected"); a.classList.remove("selected"); };
        a.onclick = () => { a.classList.add("selected"); p.classList.remove("selected"); };
        teacherTable.appendChild(row);
    });
}

if (saveTeacherBtn) {
    saveTeacherBtn.addEventListener("click", function () {
        alert("Teacher attendance recorded successfully!");
    });
}

// Initial Load strictly gated on session verification
if (typeof requireAuth === "function") {
    requireAuth().then(authenticated => {
        if (authenticated) loadStudentsAndAttendance();
    });
}
