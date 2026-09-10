 // =======================================
// ATTENDANCE MANAGEMENT
// =======================================

console.log("Attendance Management Loaded");


// =======================================
// GET DATA
// =======================================

let students =
    JSON.parse(localStorage.getItem("students")) || [];

let teachers =
    JSON.parse(localStorage.getItem("teachers")) || [];

let studentAttendance =
    JSON.parse(localStorage.getItem("studentAttendance")) || [];

let teacherAttendance =
    JSON.parse(localStorage.getItem("teacherAttendance")) || [];


// =======================================
// ELEMENTS
// =======================================

const studentTab =
    document.getElementById("studentTab");

const teacherTab =
    document.getElementById("teacherTab");

const studentSection =
    document.getElementById("studentAttendanceSection");

const teacherSection =
    document.getElementById("teacherAttendanceSection");

const studentDate =
    document.getElementById("studentDate");

const teacherDate =
    document.getElementById("teacherDate");

const studentSearch =
    document.getElementById("studentSearch");

const teacherSearch =
    document.getElementById("teacherSearch");

const studentTable =
    document.getElementById("studentAttendanceTable");

const teacherTable =
    document.getElementById("teacherAttendanceTable");

const saveStudentBtn =
    document.getElementById("saveStudentAttendance");

const saveTeacherBtn =
    document.getElementById("saveTeacherAttendance");


// =======================================
// TODAY DATE
// =======================================

function getTodayDate() {

    const date = new Date();

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


const today =
    getTodayDate();


// =======================================
// SET DATE
// =======================================

studentDate.value =
    localStorage.getItem(
        "studentAttendanceDate"
    ) || today;

teacherDate.value =
    localStorage.getItem(
        "teacherAttendanceDate"
    ) || today;


// =======================================
// STUDENT TAB
// =======================================

studentTab.addEventListener(
    "click",
    function () {

        studentTab.classList.add("active");

        teacherTab.classList.remove("active");

        studentSection.classList.remove("hidden");

        teacherSection.classList.add("hidden");

        displayStudents();

    }
);


// =======================================
// TEACHER TAB
// =======================================

teacherTab.addEventListener(
    "click",
    function () {

        teacherTab.classList.add("active");

        studentTab.classList.remove("active");

        studentSection.classList.add("hidden");

        teacherSection.classList.remove("hidden");

        displayTeachers();

    }
);


// =======================================
// DISPLAY STUDENTS
// =======================================

function displayStudents(
    list = students
) {

    studentTable.innerHTML = "";


    list.forEach(
        function (student, index) {

            // IMPORTANT:
            // Your student data uses "roll"
            // NOT "rollNo"

            const savedRecord =
                studentAttendance.find(
                    function (record) {

                        return (

                            String(
                                record.roll
                            ) ===
                            String(
                                student.roll
                            )

                            &&

                            record.date ===
                            studentDate.value

                        );

                    }
                );


            const savedStatus =
                savedRecord
                    ? savedRecord.status
                    : "";


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${student.name}
                </td>

                <td>
                    ${student.roll}
                </td>

                <td>
                    ${student.branch}
                </td>

                <td>

                    <div class="status-box">

                        <button
                            type="button"
                            class="status-btn present-btn"
                        >
                            Present
                        </button>

                        <button
                            type="button"
                            class="status-btn absent-btn"
                        >
                            Absent
                        </button>

                    </div>

                </td>

            `;


            const presentBtn =
                row.querySelector(
                    ".present-btn"
                );

            const absentBtn =
                row.querySelector(
                    ".absent-btn"
                );


            // ===================================
            // LOAD SAVED STATUS
            // ===================================

            if (
                savedStatus === "Present"
            ) {

                presentBtn.classList.add(
                    "selected"
                );

            }


            if (
                savedStatus === "Absent"
            ) {

                absentBtn.classList.add(
                    "selected"
                );

            }


            // ===================================
            // PRESENT BUTTON
            // ===================================

            presentBtn.addEventListener(
                "click",
                function () {

                    presentBtn.classList.add(
                        "selected"
                    );

                    absentBtn.classList.remove(
                        "selected"
                    );

                }
            );


            // ===================================
            // ABSENT BUTTON
            // ===================================

            absentBtn.addEventListener(
                "click",
                function () {

                    absentBtn.classList.add(
                        "selected"
                    );

                    presentBtn.classList.remove(
                        "selected"
                    );

                }
            );


            studentTable.appendChild(row);

        }
    );

}


// =======================================
// SAVE STUDENT ATTENDANCE
// =======================================

saveStudentBtn.addEventListener(
    "click",
    function () {

        console.log(
            "Student Attendance Save Clicked"
        );


        const date =
            studentDate.value;


        // Check date

        if (!date) {

            alert(
                "Please select attendance date."
            );

            return;

        }


        // Save selected date

        localStorage.setItem(
            "studentAttendanceDate",
            date
        );


        const rows =
            studentTable.querySelectorAll("tr");


        if (rows.length === 0) {

            alert(
                "No students found."
            );

            return;

        }


        let savedCount = 0;


        rows.forEach(
            function (row) {

                const name =
                    row.children[1]
                        .textContent
                        .trim();


                // Roll number from table

                const roll =
                    row.children[2]
                        .textContent
                        .trim();


                const branch =
                    row.children[3]
                        .textContent
                        .trim();


                const presentBtn =
                    row.querySelector(
                        ".present-btn"
                    );


                const absentBtn =
                    row.querySelector(
                        ".absent-btn"
                    );


                let status = "";


                // Check Present

                if (
                    presentBtn.classList.contains(
                        "selected"
                    )
                ) {

                    status = "Present";

                }


                // Check Absent

                else if (
                    absentBtn.classList.contains(
                        "selected"
                    )
                ) {

                    status = "Absent";

                }


                // No status selected

                if (status === "") {

                    return;

                }


                // ===================================
                // REMOVE OLD SAME DATE RECORD
                // ===================================

                studentAttendance =
                    studentAttendance.filter(
                        function (record) {

                            return !(
                                String(
                                    record.roll
                                ) ===
                                String(roll)

                                &&

                                record.date ===
                                date
                            );

                        }
                    );


                // ===================================
                // ADD NEW RECORD
                // ===================================

                studentAttendance.push({

                    name:
                        name,

                    roll:
                        roll,

                    branch:
                        branch,

                    date:
                        date,

                    status:
                        status

                });


                savedCount++;

            }
        );


        // ===================================
        // SAVE TO LOCAL STORAGE
        // ===================================

        localStorage.setItem(
            "studentAttendance",
            JSON.stringify(
                studentAttendance
            )
        );


        console.log(
            "Student Attendance Saved:",
            studentAttendance
        );


        // ===================================
        // CHECK
        // ===================================

        if (savedCount === 0) {

            alert(
                "Please select Present or Absent for at least one student."
            );

            return;

        }


        alert(
            savedCount +
            " student attendance saved successfully!"
        );


        // Reload current date

        displayStudents();

    }
);


// =======================================
// STUDENT SEARCH
// =======================================

studentSearch.addEventListener(
    "input",
    function () {

        const value =
            studentSearch.value
                .toLowerCase()
                .trim();


        const filteredStudents =
            students.filter(
                function (student) {

                    return (

                        student.name
                            .toLowerCase()
                            .includes(value)

                        ||

                        String(
                            student.roll
                        )
                            .toLowerCase()
                            .includes(value)

                        ||

                        student.branch
                            .toLowerCase()
                            .includes(value)

                    );

                }
            );


        displayStudents(
            filteredStudents
        );

    }
);


// =======================================
// STUDENT DATE CHANGE
// =======================================

studentDate.addEventListener(
    "change",
    function () {

        const date =
            studentDate.value;


        console.log(
            "Student Date Changed:",
            date
        );


        // Save selected date

        localStorage.setItem(
            "studentAttendanceDate",
            date
        );


        // Load that date's attendance

        displayStudents();

    }
);


// =======================================
// DISPLAY TEACHERS
// =======================================

function displayTeachers(
    list = teachers
) {

    teacherTable.innerHTML = "";


    list.forEach(
        function (teacher, index) {

            const savedRecord =
                teacherAttendance.find(
                    function (record) {

                        return (

                            String(
                                record.teacherId
                            ) ===
                            String(
                                teacher.id
                            )

                            &&

                            record.date ===
                            teacherDate.value

                        );

                    }
                );


            const savedStatus =
                savedRecord
                    ? savedRecord.status
                    : "";


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${teacher.name}
                </td>

                <td>
                    ${teacher.id}
                </td>

                <td>
                    ${teacher.subject}
                </td>

                <td>

                    <div class="status-box">

                        <button
                            type="button"
                            class="status-btn present-btn"
                        >
                            Present
                        </button>

                        <button
                            type="button"
                            class="status-btn absent-btn"
                        >
                            Absent
                        </button>

                    </div>

                </td>

            `;


            const presentBtn =
                row.querySelector(
                    ".present-btn"
                );


            const absentBtn =
                row.querySelector(
                    ".absent-btn"
                );


            // ===================================
            // LOAD SAVED STATUS
            // ===================================

            if (
                savedStatus === "Present"
            ) {

                presentBtn.classList.add(
                    "selected"
                );

            }


            if (
                savedStatus === "Absent"
            ) {

                absentBtn.classList.add(
                    "selected"
                );

            }


            // ===================================
            // PRESENT
            // ===================================

            presentBtn.addEventListener(
                "click",
                function () {

                    presentBtn.classList.add(
                        "selected"
                    );

                    absentBtn.classList.remove(
                        "selected"
                    );

                }
            );


            // ===================================
            // ABSENT
            // ===================================

            absentBtn.addEventListener(
                "click",
                function () {

                    absentBtn.classList.add(
                        "selected"
                    );

                    presentBtn.classList.remove(
                        "selected"
                    );

                }
            );


            teacherTable.appendChild(row);

        }
    );

}


// =======================================
// SAVE TEACHER ATTENDANCE
// =======================================

saveTeacherBtn.addEventListener(
    "click",
    function () {

        console.log(
            "Teacher Attendance Save Clicked"
        );


        const date =
            teacherDate.value;


        if (!date) {

            alert(
                "Please select a date."
            );

            return;

        }


        localStorage.setItem(
            "teacherAttendanceDate",
            date
        );


        const rows =
            teacherTable.querySelectorAll(
                "tr"
            );


        if (rows.length === 0) {

            alert(
                "No teachers found."
            );

            return;

        }


        let savedCount = 0;


        rows.forEach(
            function (row) {

                const name =
                    row.children[1]
                        .textContent
                        .trim();


                const teacherId =
                    row.children[2]
                        .textContent
                        .trim();


                const subject =
                    row.children[3]
                        .textContent
                        .trim();


                const presentBtn =
                    row.querySelector(
                        ".present-btn"
                    );


                const absentBtn =
                    row.querySelector(
                        ".absent-btn"
                    );


                let status = "";


                if (
                    presentBtn.classList.contains(
                        "selected"
                    )
                ) {

                    status = "Present";

                }

                else if (
                    absentBtn.classList.contains(
                        "selected"
                    )
                ) {

                    status = "Absent";

                }


                if (status === "") {

                    return;

                }


                // ===================================
                // REMOVE OLD RECORD
                // ===================================

                teacherAttendance =
                    teacherAttendance.filter(
                        function (record) {

                            return !(
                                String(
                                    record.teacherId
                                ) ===
                                String(teacherId)

                                &&

                                record.date ===
                                date
                            );

                        }
                    );


                // ===================================
                // ADD NEW RECORD
                // ===================================

                teacherAttendance.push({

                    name:
                        name,

                    teacherId:
                        teacherId,

                    subject:
                        subject,

                    date:
                        date,

                    status:
                        status

                });


                savedCount++;

            }
        );


        // ===================================
        // SAVE
        // ===================================

        localStorage.setItem(
            "teacherAttendance",
            JSON.stringify(
                teacherAttendance
            )
        );


        if (savedCount === 0) {

            alert(
                "Please select Present or Absent for at least one teacher."
            );

            return;

        }


        alert(
            savedCount +
            " teacher attendance saved successfully!"
        );


        displayTeachers();

    }
);


// =======================================
// TEACHER SEARCH
// =======================================

teacherSearch.addEventListener(
    "input",
    function () {

        const value =
            teacherSearch.value
                .toLowerCase()
                .trim();


        const filteredTeachers =
            teachers.filter(
                function (teacher) {

                    return (

                        teacher.name
                            .toLowerCase()
                            .includes(value)

                        ||

                        String(
                            teacher.id
                        )
                            .toLowerCase()
                            .includes(value)

                        ||

                        teacher.subject
                            .toLowerCase()
                            .includes(value)

                    );

                }
            );


        displayTeachers(
            filteredTeachers
        );

    }
);


// =======================================
// TEACHER DATE CHANGE
// =======================================

teacherDate.addEventListener(
    "change",
    function () {

        const date =
            teacherDate.value;


        console.log(
            "Teacher Date Changed:",
            date
        );


        localStorage.setItem(
            "teacherAttendanceDate",
            date
        );


        displayTeachers();

    }
);


// =======================================
// INITIAL LOAD
// =======================================

displayStudents();


console.log(
    "Students:",
    students.length
);


console.log(
    "Teachers:",
    teachers.length
);


console.log(
    "Student Attendance:",
    studentAttendance
);


console.log(
    "Teacher Attendance:",
    teacherAttendance
);