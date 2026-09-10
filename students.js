 // ===============================
// STUDENT MANAGEMENT
// ===============================

console.log("Student Management Loaded");


// ===============================
// VARIABLES
// ===============================

let students =
    JSON.parse(localStorage.getItem("students")) || [];

let editIndex = -1;

const studentForm =
    document.getElementById("studentForm");

const studentName =
    document.getElementById("studentName");

const rollNo =
    document.getElementById("rollNo");

const branch =
    document.getElementById("branch");

const studentTable =
    document.getElementById("studentTable");

const totalStudents =
    document.getElementById("totalStudents");

const searchStudent =
    document.getElementById("searchStudent");


// ===============================
// DISPLAY STUDENTS
// ===============================

function displayStudents(studentList = students) {

    studentTable.innerHTML = "";

    studentList.forEach((student, index) => {

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${index + 1}</td>

            <td>${student.name}</td>

            <td>${student.rollNo}</td>

            <td>${student.branch}</td>

            <td>

                <button
                    class="edit-btn"
                    onclick="editStudent(${index})"
                >
                    Edit
                </button>

                <button
                    class="delete-btn"
                    onclick="deleteStudent(${index})"
                >
                    Delete
                </button>

            </td>
        `;

        studentTable.appendChild(row);

    });

    updateTotalStudents();
}


// ===============================
// UPDATE TOTAL
// ===============================

function updateTotalStudents() {

    totalStudents.textContent =
        students.length;
}


// ===============================
// ADD / UPDATE STUDENT
// ===============================

studentForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        const name =
            studentName.value.trim();

        const roll =
            rollNo.value.trim();

        const branchValue =
            branch.value.trim();


        // Validation

        if (
            name === "" ||
            roll === "" ||
            branchValue === ""
        ) {

            alert("Please fill all fields.");

            return;
        }


        const studentData = {

            name: name,

            rollNo: roll,

            branch: branchValue

        };


        // UPDATE

        if (editIndex !== -1) {

            students[editIndex] =
                studentData;

            editIndex = -1;

            studentForm.querySelector(
                "button"
            ).textContent = "Add Student";

        }

        // ADD

        else {

            students.push(studentData);

        }


        // Save

        localStorage.setItem(
            "students",
            JSON.stringify(students)
        );


        // Reset

        studentForm.reset();


        // Display

        displayStudents();

    }
);


// ===============================
// EDIT STUDENT
// ===============================

function editStudent(index) {

    const student =
        students[index];

    studentName.value =
        student.name;

    rollNo.value =
        student.rollNo;

    branch.value =
        student.branch;

    editIndex = index;

    studentForm.querySelector(
        "button"
    ).textContent = "Update Student";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ===============================
// DELETE STUDENT
// ===============================

function deleteStudent(index) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this student?"
        );

    if (!confirmDelete) {
        return;
    }


    students.splice(index, 1);


    localStorage.setItem(
        "students",
        JSON.stringify(students)
    );


    displayStudents();

}


// ===============================
// SEARCH STUDENT
// ===============================

searchStudent.addEventListener(
    "input",
    function () {

        const searchValue =
            searchStudent.value
                .toLowerCase()
                .trim();


        const filteredStudents =
            students.filter(student =>

                student.name
                    .toLowerCase()
                    .includes(searchValue)

                ||

                student.rollNo
                    .toLowerCase()
                    .includes(searchValue)

                ||

                student.branch
                    .toLowerCase()
                    .includes(searchValue)

            );


        displayStudents(filteredStudents);

    }
);


// ===============================
// INITIAL LOAD
// ===============================

displayStudents();