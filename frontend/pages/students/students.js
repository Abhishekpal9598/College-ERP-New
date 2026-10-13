// ===============================
// STUDENT MANAGEMENT
// ===============================

console.log("Student Management Loaded");

let studentsData = [];
let editStudentId = null;

const studentForm = document.getElementById("studentForm");
const studentName = document.getElementById("studentName");
const rollNo = document.getElementById("rollNo");
const branch = document.getElementById("branch");
const studentTable = document.getElementById("studentTable");
const totalStudents = document.getElementById("totalStudents");
const searchStudent = document.getElementById("searchStudent");

// ===============================
// FETCH & DISPLAY STUDENTS
// ===============================

async function fetchAndDisplayStudents(searchQuery = "") {
    if (!studentTable) return;
    studentTable.innerHTML = `<tr><td colspan="5">Loading students from database...</td></tr>`;

    try {
        const params = { limit: 100 };
        if (searchQuery) params.search = searchQuery;

        const response = await studentAPI.getStudents(params);

        if (response && response.success && Array.isArray(response.data)) {
            studentsData = response.data;
            renderStudentsTable(studentsData);
        } else if (response && response.offline) {
            studentTable.innerHTML = `<tr><td colspan="5" style="color:red;">${response.message}</td></tr>`;
        } else {
            studentTable.innerHTML = `<tr><td colspan="5">No students found.</td></tr>`;
            if (totalStudents) totalStudents.textContent = "0";
        }
    } catch (err) {
        studentTable.innerHTML = `<tr><td colspan="5" style="color:red;">Error loading students.</td></tr>`;
    }
}

function renderStudentsTable(list) {
    if (!studentTable) return;
    studentTable.innerHTML = "";

    if (list.length === 0) {
        studentTable.innerHTML = `<tr><td colspan="5">No students match your search.</td></tr>`;
        if (totalStudents) totalStudents.textContent = "0";
        return;
    }

    list.forEach((student, index) => {
        const row = document.createElement("tr");
        const name = student.fullName || `${student.firstName} ${student.lastName}`;
        const roll = student.rollNumber || student.roll || "-";
        const dept = student.department || student.branch || "-";

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${name}</td>
            <td>${roll}</td>
            <td>${dept}</td>
            <td>
                <button class="edit-btn" onclick="editStudent('${student._id}')">
                    Edit
                </button>
                <button class="delete-btn" onclick="deleteStudent('${student._id}')">
                    Delete
                </button>
            </td>
        `;

        studentTable.appendChild(row);
    });

    if (totalStudents) {
        totalStudents.textContent = list.length;
    }
}

// ===============================
// ADD / UPDATE STUDENT
// ===============================

if (studentForm) {
    studentForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const rawName = studentName.value.trim();
        const roll = rollNo.value.trim();
        const branchValue = branch.value.trim();

        if (rawName === "" || roll === "" || branchValue === "") {
            alert("Please fill all fields.");
            return;
        }

        const nameParts = rawName.split(" ");
        const firstName = nameParts[0] || "Student";
        const lastName = nameParts.slice(1).join(" ") || "User";

        const payload = {
            studentId: editStudentId ? undefined : `STU${Date.now().toString().slice(-4)}`,
            rollNumber: roll,
            firstName,
            lastName,
            email: `${firstName.toLowerCase()}.${Date.now().toString().slice(-4)}@college.erp`,
            course: "B.Tech",
            department: branchValue,
            semester: 4,
            section: "A"
        };

        try {
            let response;
            if (editStudentId) {
                response = await studentAPI.updateStudent(editStudentId, {
                    firstName,
                    lastName,
                    rollNumber: roll,
                    department: branchValue
                });
            } else {
                response = await studentAPI.createStudent(payload);
            }

            if (response && response.success) {
                alert(editStudentId ? "Student updated successfully!" : "Student added successfully!");
                studentForm.reset();
                editStudentId = null;
                const submitBtn = studentForm.querySelector("button");
                if (submitBtn) submitBtn.textContent = "Add Student";
                fetchAndDisplayStudents();
            } else {
                alert(response.message || "Operation failed.");
            }
        } catch (err) {
            alert("Error communicating with backend server.");
        }
    });
}

// ===============================
// EDIT STUDENT
// ===============================

function editStudent(id) {
    const student = studentsData.find(s => s._id === id);
    if (!student) return;

    studentName.value = student.fullName || `${student.firstName} ${student.lastName}`;
    rollNo.value = student.rollNumber || student.roll || "";
    branch.value = student.department || student.branch || "";

    editStudentId = id;

    const submitBtn = studentForm.querySelector("button");
    if (submitBtn) submitBtn.textContent = "Update Student";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}
window.editStudent = editStudent;

// ===============================
// DELETE STUDENT
// ===============================

async function deleteStudent(id) {
    const confirmDelete = confirm("Are you sure you want to delete this student from database?");
    if (!confirmDelete) return;

    try {
        const response = await studentAPI.deleteStudent(id);
        if (response && response.success) {
            alert("Student deleted successfully!");
            fetchAndDisplayStudents();
        } else {
            alert(response.message || "Failed to delete student.");
        }
    } catch (err) {
        alert("Error deleting student from backend.");
    }
}
window.deleteStudent = deleteStudent;

// ===============================
// SEARCH STUDENT
// ===============================

if (searchStudent) {
    let debounceTimer;
    searchStudent.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        const term = searchStudent.value.trim();
        debounceTimer = setTimeout(() => {
            fetchAndDisplayStudents(term);
        }, 300);
    });
}

// Initial Load strictly gated on session verification
if (typeof requireAuth === "function") {
    requireAuth().then(authenticated => {
        if (authenticated) fetchAndDisplayStudents();
    });
}
