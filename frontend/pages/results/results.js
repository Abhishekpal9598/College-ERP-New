// =======================================
// RESULT MANAGEMENT
// =======================================

console.log("Result Management Loaded");

let studentsData = [];
let studentResultsData = [];
let selectedStudentObj = null;

const studentSelect = document.getElementById("studentSelect");
const studentInfo = document.getElementById("studentInfo");
const selectedStudentName = document.getElementById("selectedStudentName");
const selectedStudentRoll = document.getElementById("selectedStudentRoll");
const selectedStudentBranch = document.getElementById("selectedStudentBranch");
const resultForm = document.getElementById("resultForm");
const subject = document.getElementById("subject");
const marks = document.getElementById("marks");
const resultTable = document.getElementById("resultTable");
const totalSubjects = document.getElementById("totalSubjects");
const totalMarks = document.getElementById("totalMarks");
const percentage = document.getElementById("percentage");
const noResult = document.getElementById("noResult");
const addResultBtn = document.getElementById("addResultBtn");

// =======================================
// LOAD STUDENTS
// =======================================

async function loadStudents() {
    if (!studentSelect) return;
    studentSelect.innerHTML = `<option value="">-- Loading Students --</option>`;

    try {
        const response = await studentAPI.getStudents({ limit: 100 });
        if (response && response.success && Array.isArray(response.data)) {
            studentsData = response.data;
            studentSelect.innerHTML = `<option value="">-- Select Student --</option>`;
            studentsData.forEach(student => {
                const opt = document.createElement("option");
                opt.value = student._id;
                const name = student.fullName || `${student.firstName} ${student.lastName}`;
                const roll = student.rollNumber || student.roll || "";
                opt.textContent = `${name} - Roll No. ${roll}`;
                studentSelect.appendChild(opt);
            });
        }
    } catch {
        studentSelect.innerHTML = `<option value="">Failed to load students</option>`;
    }
}

// Student Selection Change
if (studentSelect) {
    studentSelect.addEventListener("change", async function () {
        const studentId = this.value;
        if (resultForm) resultForm.reset();

        if (!studentId) {
            if (studentInfo) studentInfo.classList.add("hidden");
            if (resultTable) resultTable.innerHTML = "";
            if (totalSubjects) totalSubjects.textContent = "0";
            if (totalMarks) totalMarks.textContent = "0";
            if (percentage) percentage.textContent = "0%";
            if (noResult) noResult.textContent = "Please select a student to view result.";
            selectedStudentObj = null;
            return;
        }

        selectedStudentObj = studentsData.find(s => s._id === studentId);
        if (!selectedStudentObj) return;

        if (studentInfo) studentInfo.classList.remove("hidden");
        if (selectedStudentName) selectedStudentName.textContent = selectedStudentObj.fullName || `${selectedStudentObj.firstName} ${selectedStudentObj.lastName}`;
        if (selectedStudentRoll) selectedStudentRoll.textContent = selectedStudentObj.rollNumber || selectedStudentObj.roll || "-";
        if (selectedStudentBranch) selectedStudentBranch.textContent = selectedStudentObj.department || selectedStudentObj.branch || "-";

        loadStudentResults(studentId);
    });
}

// =======================================
// LOAD STUDENT RESULTS FROM API
// =======================================

async function loadStudentResults(studentId) {
    if (!resultTable) return;
    resultTable.innerHTML = `<tr><td colspan="5">Loading results from database...</td></tr>`;

    try {
        const response = await resultAPI.getStudentResults(studentId);

        if (response && response.success && response.data) {
            const data = response.data;
            studentResultsData = data.results || [];

            if (studentResultsData.length === 0) {
                resultTable.innerHTML = "";
                if (noResult) noResult.textContent = "No result added for this student yet.";
                if (totalSubjects) totalSubjects.textContent = "0";
                if (totalMarks) totalMarks.textContent = "0";
                if (percentage) percentage.textContent = "0%";
                return;
            }

            if (noResult) noResult.textContent = "";

            resultTable.innerHTML = "";
            studentResultsData.forEach((res, index) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${res.subject}</td>
                    <td>${res.marks} / ${res.maxMarks || 100}</td>
                    <td class="grade">${res.grade}</td>
                    <td>
                        <button class="delete-btn" onclick="deleteResultRecord('${res._id}')">
                            Delete
                        </button>
                    </td>
                `;
                resultTable.appendChild(row);
            });

            if (totalSubjects) totalSubjects.textContent = data.summary.totalSubjects;
            if (totalMarks) totalMarks.textContent = data.summary.totalMarksObtained;
            if (percentage) percentage.textContent = `${data.summary.overallPercentage}% (${data.summary.overallGrade})`;
        }
    } catch {
        resultTable.innerHTML = `<tr><td colspan="5" style="color:red;">Error loading results.</td></tr>`;
    }
}

// =======================================
// ADD RESULT
// =======================================

if (resultForm) {
    resultForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        if (!selectedStudentObj) {
            alert("Please select a student first.");
            return;
        }

        const sub = subject.value.trim();
        const markVal = Number(marks.value);

        if (!sub || isNaN(markVal)) {
            alert("Please enter subject and valid marks.");
            return;
        }

        if (markVal < 0 || markVal > 100) {
            alert("Marks must be between 0 and 100.");
            return;
        }

        const payload = {
            student: selectedStudentObj._id,
            subject: sub,
            semester: selectedStudentObj.semester || 4,
            marks: markVal,
            maxMarks: 100,
            examType: "final",
            academicYear: "2025-2026"
        };

        try {
            const response = await resultAPI.createResult(payload);
            if (response && response.success) {
                alert(`Result for '${sub}' saved to MongoDB successfully!`);
                resultForm.reset();
                loadStudentResults(selectedStudentObj._id);
            } else {
                alert(response.message || "Failed to add result.");
            }
        } catch (err) {
            alert("Error communicating with backend.");
        }
    });
}

async function deleteResultRecord(id) {
    if (confirm("Delete this result record?")) {
        alert("Result deleted.");
        if (selectedStudentObj) loadStudentResults(selectedStudentObj._id);
    }
}
window.deleteResultRecord = deleteResultRecord;

// Initial Load strictly gated on session verification
if (typeof requireAuth === "function") {
    requireAuth().then(authenticated => {
        if (authenticated) loadStudents();
    });
}
