 // =======================================
// RESULT MANAGEMENT
// =======================================

console.log("Result Management Loaded");

// =======================================
// GET DATA
// =======================================

let students =
    JSON.parse(localStorage.getItem("students")) || [];

let results =
    JSON.parse(localStorage.getItem("results")) || [];


// =======================================
// ELEMENTS
// =======================================

const studentSelect =
    document.getElementById("studentSelect");

const studentInfo =
    document.getElementById("studentInfo");

const selectedStudentName =
    document.getElementById("selectedStudentName");

const selectedStudentRoll =
    document.getElementById("selectedStudentRoll");

const selectedStudentBranch =
    document.getElementById("selectedStudentBranch");

const resultForm =
    document.getElementById("resultForm");

const subject =
    document.getElementById("subject");

const marks =
    document.getElementById("marks");

const resultTable =
    document.getElementById("resultTable");

const totalSubjects =
    document.getElementById("totalSubjects");

const totalMarks =
    document.getElementById("totalMarks");

const percentage =
    document.getElementById("percentage");

const noResult =
    document.getElementById("noResult");

const addResultBtn =
    document.getElementById("addResultBtn");

let editIndex = -1;


// =======================================
// SAVE RESULTS
// =======================================

function saveResults() {

    localStorage.setItem(
        "results",
        JSON.stringify(results)
    );

    localStorage.setItem(
        "resultCount",
        results.length
    );
}


// =======================================
// GRADE
// =======================================

function getGrade(mark) {

    mark = Number(mark);

    if (mark >= 90) {
        return "A+";
    }

    if (mark >= 80) {
        return "A";
    }

    if (mark >= 70) {
        return "B";
    }

    if (mark >= 60) {
        return "C";
    }

    if (mark >= 50) {
        return "D";
    }

    return "F";
}


// =======================================
// LOAD STUDENTS
// =======================================

function loadStudents() {

    studentSelect.innerHTML = `
        <option value="">
            -- Select Student --
        </option>
    `;

    console.log("Students Loaded:", students);

    students.forEach(function (student) {

        const option =
            document.createElement("option");

        /*
            IMPORTANT:
            Tumhare students data me
            roll key hai.
        */

        option.value = student.roll;

        option.textContent =
            `${student.name} - Roll No. ${student.roll}`;

        studentSelect.appendChild(option);

    });

    console.log(
        "Student Options:",
        studentSelect.options.length
    );
}


// =======================================
// STUDENT SELECT
// =======================================

studentSelect.addEventListener(
    "change",
    function () {

        const selectedRoll =
            this.value;

        editIndex = -1;

        addResultBtn.textContent =
            "Add Result";

        resultForm.reset();

        if (!selectedRoll) {

            studentInfo.classList.add(
                "hidden"
            );

            resultTable.innerHTML = "";

            totalSubjects.textContent = "0";

            totalMarks.textContent = "0";

            percentage.textContent = "0%";

            noResult.textContent =
                "Please select a student to view result.";

            return;
        }


        const student =
            students.find(function (item) {

                return String(item.roll) ===
                    String(selectedRoll);

            });


        if (!student) {

            console.log(
                "Student not found:",
                selectedRoll
            );

            return;
        }


        // ===================================
        // STUDENT INFORMATION
        // ===================================

        studentInfo.classList.remove(
            "hidden"
        );

        selectedStudentName.textContent =
            student.name;

        selectedStudentRoll.textContent =
            student.roll;

        selectedStudentBranch.textContent =
            student.branch;


        // ===================================
        // SHOW RESULT
        // ===================================

        displayStudentResult(
            selectedRoll
        );

    }
);


// =======================================
// DISPLAY STUDENT RESULT
// =======================================

function displayStudentResult(selectedRoll) {

    resultTable.innerHTML = "";


    const studentResults =
        results.filter(function (result) {

            return String(result.rollNo) ===
                String(selectedRoll);

        });


    // ===================================
    // NO RESULT
    // ===================================

    if (studentResults.length === 0) {

        noResult.textContent =
            "No result added for this student yet.";

        totalSubjects.textContent = "0";

        totalMarks.textContent = "0";

        percentage.textContent = "0%";

        return;
    }


    noResult.textContent = "";


    // ===================================
    // TOTAL MARKS
    // ===================================

    let calculatedTotal = 0;


    studentResults.forEach(
        function (result, index) {

            calculatedTotal +=
                Number(result.marks);


            const originalIndex =
                results.indexOf(result);


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${result.subject}
                </td>

                <td>
                    ${result.marks}
                </td>

                <td class="grade">
                    ${result.grade}
                </td>

                <td>

                    <button
                        class="edit-btn"
                        onclick="editResult(${originalIndex})"
                    >
                        Edit
                    </button>

                    <button
                        class="delete-btn"
                        onclick="deleteResult(${originalIndex})"
                    >
                        Delete
                    </button>

                </td>

            `;


            resultTable.appendChild(row);

        }
    );


    // ===================================
    // PERCENTAGE
    // ===================================

    const calculatedPercentage =
        (
            calculatedTotal /
            (studentResults.length * 100)
        ) * 100;


    totalSubjects.textContent =
        studentResults.length;

    totalMarks.textContent =
        calculatedTotal;

    percentage.textContent =
        Math.round(calculatedPercentage) + "%";
}


// =======================================
// ADD / UPDATE RESULT
// =======================================

resultForm.addEventListener(
    "submit",
    function (e) {

        e.preventDefault();


        const selectedRoll =
            studentSelect.value;


        if (!selectedRoll) {

            alert(
                "Please select a student first."
            );

            return;
        }


        const student =
            students.find(function (item) {

                return String(item.roll) ===
                    String(selectedRoll);

            });


        if (!student) {

            alert("Student not found.");

            return;
        }


        const sub =
            subject.value.trim();


        const mark =
            marks.value.trim();


        if (
            sub === "" ||
            mark === ""
        ) {

            alert(
                "Please enter subject and marks."
            );

            return;
        }


        if (
            Number(mark) < 0 ||
            Number(mark) > 100
        ) {

            alert(
                "Marks must be between 0 and 100."
            );

            return;
        }


        const grade =
            getGrade(mark);


        // ===================================
        // ADD
        // ===================================

        if (editIndex === -1) {

            const exists =
                results.some(function (result) {

                    return (
                        String(result.rollNo) ===
                        String(selectedRoll)

                        &&

                        result.subject
                            .toLowerCase() ===
                        sub.toLowerCase()
                    );

                });


            if (exists) {

                alert(
                    "This subject result already exists for this student."
                );

                return;
            }


            results.push({

                rollNo:
                    selectedRoll,

                name:
                    student.name,

                branch:
                    student.branch,

                subject:
                    sub,

                marks:
                    mark,

                grade:
                    grade

            });


            alert(
                "Result Added Successfully."
            );

        }


        // ===================================
        // UPDATE
        // ===================================

        else {

            results[editIndex] = {

                rollNo:
                    selectedRoll,

                name:
                    student.name,

                branch:
                    student.branch,

                subject:
                    sub,

                marks:
                    mark,

                grade:
                    grade

            };


            editIndex = -1;

            addResultBtn.textContent =
                "Add Result";


            alert(
                "Result Updated Successfully."
            );
        }


        // ===================================
        // SAVE
        // ===================================

        saveResults();


        resultForm.reset();


        displayStudentResult(
            selectedRoll
        );

    }
);


// =======================================
// EDIT RESULT
// =======================================

function editResult(index) {

    const result =
        results[index];


    if (!result) {
        return;
    }


    studentSelect.value =
        result.rollNo;


    const student =
        students.find(function (item) {

            return String(item.roll) ===
                String(result.rollNo);

        });


    if (student) {

        studentInfo.classList.remove(
            "hidden"
        );

        selectedStudentName.textContent =
            student.name;

        selectedStudentRoll.textContent =
            student.roll;

        selectedStudentBranch.textContent =
            student.branch;
    }


    subject.value =
        result.subject;

    marks.value =
        result.marks;


    editIndex =
        index;


    addResultBtn.textContent =
        "Update Result";


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });
}


// =======================================
// DELETE RESULT
// =======================================

function deleteResult(index) {

    const result =
        results[index];


    if (!result) {
        return;
    }


    if (
        confirm(
            `Delete ${result.subject} result?`
        )
    ) {

        const selectedRoll =
            studentSelect.value;


        results.splice(
            index,
            1
        );


        saveResults();


        displayStudentResult(
            selectedRoll
        );


        alert(
            "Result Deleted Successfully."
        );
    }
}


// =======================================
// INITIAL LOAD
// =======================================

loadStudents();


console.log(
    "Students:",
    students
);


console.log(
    "Results:",
    results
);