console.log("Result Management Loaded");

// ==========================
// Variables
// ==========================

let results = JSON.parse(localStorage.getItem("results")) || [];

const resultForm = document.getElementById("resultForm");
const studentName = document.getElementById("studentName");
const rollNo = document.getElementById("rollNo");
const subject = document.getElementById("subject");
const marks = document.getElementById("marks");

const resultTable = document.getElementById("resultTable");
const totalResults = document.getElementById("totalResults");
const addResultBtn = document.getElementById("addResultBtn");
const searchResult = document.getElementById("searchResult");

let editIndex = -1;

// ==========================
// Save Results
// ==========================

function saveResults() {
    localStorage.setItem("results", JSON.stringify(results));
    localStorage.setItem("resultCount", results.length);
}

// ==========================
// Grade Function
// ==========================

function getGrade(mark) {

    mark = Number(mark);

    if (mark >= 90) return "A+";
    if (mark >= 80) return "A";
    if (mark >= 70) return "B";
    if (mark >= 60) return "C";
    if (mark >= 50) return "D";

    return "F";
}

// ==========================
// Display Results
// ==========================

function displayResults() {

    resultTable.innerHTML = "";

    results.forEach((result, index) => {

        resultTable.innerHTML += `
        <tr>
            <td>${result.rollNo}</td>
            <td>${result.name}</td>
            <td>${result.subject}</td>
            <td>${result.marks}</td>
            <td>${result.grade}</td>
            <td>
                <button class="edit-btn" onclick="editResult(${index})">
                    Edit
                </button>

                <button class="delete-btn" onclick="deleteResult(${index})">
                    Delete
                </button>
            </td>
        </tr>
        `;

    });

    totalResults.textContent = results.length;
}

displayResults();

// ==========================
// Add / Update Result
// ==========================

resultForm.addEventListener("submit", function (e) {

    e.preventDefault();

    const name = studentName.value.trim();
    const roll = rollNo.value.trim();
    const sub = subject.value.trim();
    const mark = marks.value.trim();

    if (name === "" || roll === "" || sub === "" || mark === "") {
        alert("Please fill all fields.");
        return;
    }

    if (mark < 0 || mark > 100) {
        alert("Marks must be between 0 and 100.");
        return;
    }

    const grade = getGrade(mark);

    if (editIndex === -1) {

        const exists = results.some(result =>
            result.rollNo === roll &&
            result.subject.toLowerCase() === sub.toLowerCase()
        );

        if (exists) {
            alert("Result for this Roll No and Subject already exists.");
            return;
        }

        results.push({
            rollNo: roll,
            name: name,
            subject: sub,
            marks: mark,
            grade: grade
        });

        alert("Result Added Successfully.");

    } else {

        const exists = results.some((result, index) =>
            result.rollNo === roll &&
            result.subject.toLowerCase() === sub.toLowerCase() &&
            index !== editIndex
        );

        if (exists) {
            alert("Result for this Roll No and Subject already exists.");
            return;
        }

        results[editIndex] = {
            rollNo: roll,
            name: name,
            subject: sub,
            marks: mark,
            grade: grade
        };

        editIndex = -1;
        addResultBtn.textContent = "Add Result";

        alert("Result Updated Successfully.");
    }

    saveResults();
    displayResults();
    resultForm.reset();

});
// ==========================
// Edit Result
// ==========================

function editResult(index) {

    studentName.value = results[index].name;
    rollNo.value = results[index].rollNo;
    subject.value = results[index].subject;
    marks.value = results[index].marks;

    editIndex = index;

    addResultBtn.textContent = "Update Result";
}

// ==========================
// Delete Result
// ==========================

function deleteResult(index) {

    if (confirm("Delete this result?")) {

        results.splice(index, 1);

        saveResults();
        displayResults();

        alert("Result Deleted Successfully.");
    }

}

// ==========================
// Search Result
// ==========================

searchResult.addEventListener("keyup", function () {

    const value = this.value.toLowerCase();

    const rows = resultTable.getElementsByTagName("tr");

    for (let row of rows) {

        const roll = row.cells[0].textContent.toLowerCase();
        const name = row.cells[1].textContent.toLowerCase();
        const sub = row.cells[2].textContent.toLowerCase();
        const grade = row.cells[4].textContent.toLowerCase();

        if (
            roll.includes(value) ||
            name.includes(value) ||
            sub.includes(value) ||
            grade.includes(value)
        ) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    }

});

// ==========================
// Dashboard Counter Update
// ==========================

function updateDashboardCounter() {
    localStorage.setItem("resultCount", results.length);
}

updateDashboardCounter();

// ==========================
// Initialize
// ==========================

displayResults();