 // ===============================
// FEES MANAGEMENT
// ===============================

console.log("Fees Module Loaded");


// ===============================
// GET DATA
// ===============================

let students =
    JSON.parse(localStorage.getItem("students")) || [];

let fees =
    JSON.parse(localStorage.getItem("fees")) || [];


// ===============================
// ELEMENTS
// ===============================

const studentSelect =
    document.getElementById("studentSelect");

const rollNo =
    document.getElementById("rollNo");

const branch =
    document.getElementById("branch");

const amount =
    document.getElementById("amount");

const paymentDate =
    document.getElementById("paymentDate");

const status =
    document.getElementById("status");

const addFee =
    document.getElementById("addFee");

const feeTable =
    document.getElementById("feeTable");

const searchFee =
    document.getElementById("searchFee");


// ===============================
// LOAD STUDENTS
// ===============================

function loadStudents() {

    studentSelect.innerHTML =
        `<option value="">Select Student</option>`;


    students.forEach((student, index) => {

        const option =
            document.createElement("option");


        option.value = index;


        option.textContent =
            student.name;


        studentSelect.appendChild(option);

    });

}


loadStudents();


// ===============================
// AUTO FILL ROLL + BRANCH
// ===============================

studentSelect.addEventListener(
    "change",
    () => {

        const student =
            students[studentSelect.value];


        if (student) {

            rollNo.value =
                student.rollNo;

            branch.value =
                student.branch;

        }

        else {

            rollNo.value = "";

            branch.value = "";

        }

    }
);


// ===============================
// ADD FEE
// ===============================

addFee.addEventListener(
    "click",
    () => {

        const student =
            students[studentSelect.value];


        if (
            !student ||
            !amount.value
        ) {

            alert(
                "Please select student and enter fee amount."
            );

            return;

        }


        const feeData = {

            name:
                student.name,

            roll:
                student.rollNo,

            branch:
                student.branch,

            amount:
                amount.value,

            date:
                paymentDate.value,

            status:
                status.value

        };


        fees.push(feeData);


        localStorage.setItem(
            "fees",
            JSON.stringify(fees)
        );


        displayFees();


        // Clear form

        studentSelect.value = "";

        rollNo.value = "";

        branch.value = "";

        amount.value = "";

        paymentDate.value = "";

        status.value = "Paid";


        alert(
            "Fee Added Successfully"
        );

    }
);


// ===============================
// DISPLAY FEES
// ===============================

function displayFees(data = fees) {

    feeTable.innerHTML = "";


    data.forEach((fee, index) => {

        const row =
            document.createElement("tr");


        let statusClass =
            fee.status === "Paid"
                ? "status-paid"
                : "status-pending";


        row.innerHTML = `

            <td>
                ${fee.name}
            </td>

            <td>
                ${fee.roll}
            </td>

            <td>
                ${fee.branch}
            </td>

            <td>
                ₹${fee.amount}
            </td>

            <td>
                ${fee.date || "-"}
            </td>

            <td class="${statusClass}">
                ${fee.status}
            </td>

            <td>

                <button
                    class="delete-btn"
                    onclick="deleteFee(${index})"
                >
                    Delete
                </button>

            </td>

        `;


        feeTable.appendChild(row);

    });

}


displayFees();


// ===============================
// DELETE FEE
// ===============================

function deleteFee(index) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this fee record?"
        );


    if (!confirmDelete) {

        return;

    }


    fees.splice(index, 1);


    localStorage.setItem(
        "fees",
        JSON.stringify(fees)
    );


    displayFees();

}


// ===============================
// SEARCH FEE
// ===============================

searchFee.addEventListener(
    "input",
    () => {

        const value =
            searchFee.value
                .toLowerCase()
                .trim();


        const filtered =
            fees.filter((fee) => {

                return (

                    fee.name
                        .toLowerCase()
                        .includes(value)

                    ||

                    String(fee.roll)
                        .toLowerCase()
                        .includes(value)

                    ||

                    fee.branch
                        .toLowerCase()
                        .includes(value)

                );

            });


        displayFees(filtered);

    }
);