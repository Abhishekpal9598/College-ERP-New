console.log("Students Page Loaded");

// ==========================
// Variables
// ==========================

let students = JSON.parse(localStorage.getItem("students")) || [];

const studentForm = document.getElementById("studentForm");
const studentName = document.getElementById("studentName");
const rollNo = document.getElementById("rollNo");
const branch = document.getElementById("branch");

const table = document.getElementById("studentTable");
const totalStudents = document.getElementById("totalStudents");
const addBtn = document.getElementById("addBtn");
const searchInput = document.getElementById("searchStudent");

let editIndex = -1;

// ==========================
// Save Students
// ==========================

function saveStudents() {
    localStorage.setItem("students", JSON.stringify(students));
}

// ==========================
// Display Students
// ==========================

 function displayStudents(data = students) {

    table.innerHTML = "";

    data.forEach((student, index) => {

        table.innerHTML += `

        <tr>

            <td>${student.roll}</td>

            <td>${student.name}</td>

            <td>${student.branch}</td>

            <td>

                <button
                    class="edit-btn"
                    onclick="editStudent(${index})">
                    Edit
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteStudent(${index})">
                    Delete
                </button>

            </td>

        </tr>

        `;

    });

    totalStudents.textContent = data.length;

}

displayStudents();

// ==========================
// Add / Update Student
// ==========================

studentForm.addEventListener("submit", function (e) {

    e.preventDefault();

    const name = studentName.value.trim();
    const roll = rollNo.value.trim();
    const branchName = branch.value.trim();

    if (name === "" || roll === "" || branchName === "") {
        alert("Please fill all fields.");
        return;
    }

    if (editIndex === -1) {

        const exists = students.some(student => student.roll === roll);

        if (exists) {
            alert("Roll Number already exists.");
            return;
        }

        students.push({
            roll: roll,
            name: name,
            branch: branchName
        });

        alert("Student Added Successfully.");

    } else {

        students[editIndex] = {
            roll: roll,
            name: name,
            branch: branchName
        };

        editIndex = -1;
        addBtn.textContent = "Add Student";

        alert("Student Updated Successfully.");
    }

    saveStudents();
    displayStudents();

    studentForm.reset();
});

// ==========================
// Edit Student
// ==========================

function editStudent(index) {

    studentName.value = students[index].name;
    rollNo.value = students[index].roll;
    branch.value = students[index].branch;

    editIndex = index;

    addBtn.textContent = "Update Student";
}

// ==========================
// Delete Student
// ==========================

function deleteStudent(index) {

    if (confirm("Are you sure you want to delete this student?")) {

        students.splice(index, 1);

        saveStudents();
        displayStudents();

        alert("Student Deleted Successfully.");
    }
}

// ==========================
// Search Student
// ==========================

searchInput.addEventListener("keyup", function () {

    const value = this.value.toLowerCase();

    const rows = table.getElementsByTagName("tr");

    for (let row of rows) {

        const roll = row.cells[0].textContent.toLowerCase();
        const name = row.cells[1].textContent.toLowerCase();
        const branchValue = row.cells[2].textContent.toLowerCase();

        if (
            roll.includes(value) ||
            name.includes(value) ||
            branchValue.includes(value)
        ) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }
});