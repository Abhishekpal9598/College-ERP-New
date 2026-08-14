 console.log("Teachers Page Loaded");

// ==========================
// Variables
// ==========================

let teachers = JSON.parse(localStorage.getItem("teachers")) || [];

const teacherForm = document.getElementById("teacherForm");
const teacherName = document.getElementById("teacherName");
const teacherId = document.getElementById("teacherId");
const subject = document.getElementById("subject");

const table = document.getElementById("teacherTable");
const totalTeachers = document.getElementById("totalTeachers");
const addTeacherBtn = document.getElementById("addTeacherBtn");
const searchInput = document.getElementById("searchTeacher");

let editIndex = -1;

// ==========================
// Save Teachers
// ==========================

function saveTeachers() {
    localStorage.setItem("teachers", JSON.stringify(teachers));
}

// ==========================
// Display Teachers
// ==========================

function displayTeachers() {

    table.innerHTML = "";

    teachers.sort((a, b) => a.name.localeCompare(b.name));

    teachers.forEach((teacher, index) => {

        table.innerHTML += `
        <tr>
            <td>${teacher.id}</td>
            <td>${teacher.name}</td>
            <td>${teacher.subject}</td>
            <td>
                <button class="edit-btn" onclick="editTeacher(${index})">
                    Edit
                </button>

                <button class="delete-btn" onclick="deleteTeacher(${index})">
                    Delete
                </button>
            </td>
        </tr>
        `;

    });

    totalTeachers.textContent = teachers.length;

    // Dashboard Update
    localStorage.setItem("teacherCount", teachers.length);
}

displayTeachers();

// ==========================
// Add / Update Teacher
// ==========================

teacherForm.addEventListener("submit", function (e) {

    e.preventDefault();

    const name = teacherName.value.trim();
    const id = teacherId.value.trim();
    const sub = subject.value.trim();

    if (name === "" || id === "" || sub === "") {
        alert("Please fill all fields.");
        return;
    }

    if (editIndex === -1) {

        const exists = teachers.some(teacher => teacher.id === id);

        if (exists) {
            alert("Teacher ID already exists.");
            return;
        }

        teachers.push({
            id: id,
            name: name,
            subject: sub
        });

        alert("Teacher Added Successfully.");

    } else {

        const exists = teachers.some((teacher, index) =>
            teacher.id === id && index !== editIndex
        );

        if (exists) {
            alert("Teacher ID already exists.");
            return;
        }

        teachers[editIndex] = {
            id: id,
            name: name,
            subject: sub
        };

        editIndex = -1;
        addTeacherBtn.textContent = "Add Teacher";

        alert("Teacher Updated Successfully.");
    }

    saveTeachers();
    displayTeachers();

    teacherForm.reset();

});

// ==========================
// Edit Teacher
// ==========================

function editTeacher(index) {

    teacherName.value = teachers[index].name;
    teacherId.value = teachers[index].id;
    subject.value = teachers[index].subject;

    editIndex = index;

    addTeacherBtn.textContent = "Update Teacher";

}

// ==========================
// Delete Teacher
// ==========================

function deleteTeacher(index) {

    if (confirm("Delete this teacher?")) {

        teachers.splice(index, 1);

        saveTeachers();
        displayTeachers();

        alert("Teacher Deleted Successfully.");
    }

}

// ==========================
// Search Teacher
// ==========================

searchInput.addEventListener("keyup", function () {

    const value = this.value.toLowerCase();

    const rows = table.getElementsByTagName("tr");

    for (let row of rows) {

        const id = row.cells[0].textContent.toLowerCase();
        const name = row.cells[1].textContent.toLowerCase();
        const sub = row.cells[2].textContent.toLowerCase();

        if (
            id.includes(value) ||
            name.includes(value) ||
            sub.includes(value)
        ) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    }

});