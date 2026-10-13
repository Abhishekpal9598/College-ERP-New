console.log("Teachers Page Loaded");

let teachersData = [];
let editTeacherId = null;

const teacherForm = document.getElementById("teacherForm");
const teacherName = document.getElementById("teacherName");
const teacherId = document.getElementById("teacherId");
const subject = document.getElementById("subject");

const table = document.getElementById("teacherTable");
const totalTeachers = document.getElementById("totalTeachers");
const addTeacherBtn = document.getElementById("addTeacherBtn");
const searchInput = document.getElementById("searchTeacher");

// ==========================
// Fetch & Display Teachers
// ==========================

async function fetchAndDisplayTeachers(searchQuery = "") {
    if (!table) return;
    table.innerHTML = `<tr><td colspan="4">Loading teachers from database...</td></tr>`;

    try {
        const params = { limit: 100 };
        if (searchQuery) params.search = searchQuery;

        const response = await teacherAPI.getTeachers(params);

        if (response && response.success && Array.isArray(response.data)) {
            teachersData = response.data;
            renderTeachersTable(teachersData);
        } else if (response && response.offline) {
            table.innerHTML = `<tr><td colspan="4" style="color:red;">${response.message}</td></tr>`;
        } else {
            table.innerHTML = `<tr><td colspan="4">No teachers found.</td></tr>`;
            if (totalTeachers) totalTeachers.textContent = "0";
        }
    } catch (err) {
        table.innerHTML = `<tr><td colspan="4" style="color:red;">Error loading teachers.</td></tr>`;
    }
}

function renderTeachersTable(list) {
    if (!table) return;
    table.innerHTML = "";

    if (list.length === 0) {
        table.innerHTML = `<tr><td colspan="4">No teachers match your search.</td></tr>`;
        if (totalTeachers) totalTeachers.textContent = "0";
        return;
    }

    list.forEach((teacher) => {
        const row = document.createElement("tr");
        const name = teacher.fullName || `${teacher.firstName} ${teacher.lastName}`;
        row.innerHTML = `
            <td>${teacher.teacherId}</td>
            <td>${name}</td>
            <td>${teacher.subject}</td>
            <td>
                <button class="edit-btn" onclick="editTeacher('${teacher._id}')">
                    Edit
                </button>
                <button class="delete-btn" onclick="deleteTeacher('${teacher._id}')">
                    Delete
                </button>
            </td>
        `;
        table.appendChild(row);
    });

    if (totalTeachers) {
        totalTeachers.textContent = list.length;
    }
}

// ==========================
// Add / Update Teacher
// ==========================

if (teacherForm) {
    teacherForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const rawName = teacherName.value.trim();
        const tid = teacherId.value.trim();
        const sub = subject.value.trim();

        if (rawName === "" || tid === "" || sub === "") {
            alert("Please fill all fields.");
            return;
        }

        const nameParts = rawName.split(" ");
        const firstName = nameParts[0] || "Teacher";
        const lastName = nameParts.slice(1).join(" ") || "Faculty";

        try {
            let response;
            if (editTeacherId) {
                response = await teacherAPI.updateTeacher(editTeacherId, {
                    teacherId: tid,
                    firstName,
                    lastName,
                    subject: sub
                });
            } else {
                response = await teacherAPI.createTeacher({
                    teacherId: tid,
                    firstName,
                    lastName,
                    email: `${firstName.toLowerCase()}.${Date.now().toString().slice(-4)}@college.erp`,
                    department: "Engineering",
                    subject: sub
                });
            }

            if (response && response.success) {
                alert(editTeacherId ? "Teacher updated successfully!" : "Teacher added successfully!");
                teacherForm.reset();
                editTeacherId = null;
                if (addTeacherBtn) addTeacherBtn.textContent = "➕ Add Teacher";
                fetchAndDisplayTeachers();
            } else {
                alert(response.message || "Operation failed.");
            }
        } catch (err) {
            alert("Error communicating with backend server.");
        }
    });
}

// ==========================
// Edit Teacher
// ==========================

function editTeacher(id) {
    const teacher = teachersData.find(t => t._id === id);
    if (!teacher) return;

    teacherName.value = teacher.fullName || `${teacher.firstName} ${teacher.lastName}`;
    teacherId.value = teacher.teacherId;
    subject.value = teacher.subject;

    editTeacherId = id;

    if (addTeacherBtn) addTeacherBtn.textContent = "Update Teacher";
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}
window.editTeacher = editTeacher;

// ==========================
// Delete Teacher
// ==========================

async function deleteTeacher(id) {
    if (confirm("Are you sure you want to delete this teacher?")) {
        try {
            const response = await teacherAPI.deleteTeacher(id);
            if (response && response.success) {
                alert("Teacher deleted successfully!");
                fetchAndDisplayTeachers();
            } else {
                alert(response.message || "Failed to delete teacher.");
            }
        } catch (err) {
            alert("Error deleting teacher.");
        }
    }
}
window.deleteTeacher = deleteTeacher;

// ==========================
// Search Teacher
// ==========================

if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        const term = searchInput.value.trim();
        debounceTimer = setTimeout(() => {
            fetchAndDisplayTeachers(term);
        }, 300);
    });
}

// Initial Load strictly gated on session verification
if (typeof requireAuth === "function") {
    requireAuth().then(authenticated => {
        if (authenticated) fetchAndDisplayTeachers();
    });
}
