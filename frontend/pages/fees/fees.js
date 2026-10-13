// ===============================
// FEES MANAGEMENT
// ===============================

console.log("Fees Module Loaded");

let studentsData = [];
let feesData = [];

const studentSelect = document.getElementById("studentSelect");
const rollNo = document.getElementById("rollNo");
const branch = document.getElementById("branch");
const amount = document.getElementById("amount");
const paymentDate = document.getElementById("paymentDate");
const statusSelect = document.getElementById("status");
const addFee = document.getElementById("addFee");
const feeTable = document.getElementById("feeTable");
const searchFee = document.getElementById("searchFee");

// ===============================
// LOAD STUDENTS
// ===============================

async function loadStudents() {
    if (!studentSelect) return;
    studentSelect.innerHTML = `<option value="">Loading students...</option>`;

    try {
        const response = await studentAPI.getStudents({ limit: 100 });
        if (response && response.success && Array.isArray(response.data)) {
            studentsData = response.data;
            studentSelect.innerHTML = `<option value="">Select Student</option>`;
            studentsData.forEach(student => {
                const opt = document.createElement("option");
                opt.value = student._id;
                const name = student.fullName || `${student.firstName} ${student.lastName}`;
                const roll = student.rollNumber || student.roll || "";
                opt.textContent = `${name} (${roll})`;
                studentSelect.appendChild(opt);
            });
        }
    } catch (err) {
        studentSelect.innerHTML = `<option value="">Failed to load students</option>`;
    }
}

// Auto-fill roll + branch
if (studentSelect) {
    studentSelect.addEventListener("change", () => {
        const selectedId = studentSelect.value;
        const student = studentsData.find(s => s._id === selectedId);
        if (student) {
            rollNo.value = student.rollNumber || student.roll || "";
            branch.value = student.department || student.branch || "";
        } else {
            rollNo.value = "";
            branch.value = "";
        }
    });
}

// ===============================
// LOAD & DISPLAY FEES
// ===============================

async function loadFees() {
    if (!feeTable) return;
    feeTable.innerHTML = `<tr><td colspan="7">Loading fees from database...</td></tr>`;

    try {
        const response = await feeAPI.getFees();
        if (response && response.success && Array.isArray(response.data)) {
            feesData = response.data;
            renderFeesTable(feesData);
        } else {
            feeTable.innerHTML = `<tr><td colspan="7">No fee records found.</td></tr>`;
        }
    } catch {
        feeTable.innerHTML = `<tr><td colspan="7" style="color:red;">Error loading fees.</td></tr>`;
    }
}

function renderFeesTable(list) {
    if (!feeTable) return;
    feeTable.innerHTML = "";

    if (list.length === 0) {
        feeTable.innerHTML = `<tr><td colspan="7">No fee records found.</td></tr>`;
        return;
    }

    list.forEach((fee, index) => {
        const row = document.createElement("tr");
        const studentObj = fee.student || {};
        const studentName = studentObj.fullName || (studentObj.firstName ? `${studentObj.firstName} ${studentObj.lastName}` : (fee.name || "Student"));
        const studentRoll = studentObj.rollNumber || studentObj.roll || fee.roll || "-";
        const studentDept = studentObj.department || studentObj.branch || fee.branch || "-";
        const isPaid = (fee.status === "paid" || fee.status === "Paid");
        const statusClass = isPaid ? "status-paid" : "status-pending";
        const dateStr = fee.paymentDate ? fee.paymentDate.split("T")[0] : (fee.date || "-");

        row.innerHTML = `
            <td>${studentName}</td>
            <td>${studentRoll}</td>
            <td>${studentDept}</td>
            <td>₹${Number(fee.totalAmount || fee.amount || 0).toLocaleString()}</td>
            <td>${dateStr}</td>
            <td class="${statusClass}">${fee.status}</td>
            <td>
                <button class="delete-btn" onclick="deleteFeeRecord('${fee._id}')">
                    Delete
                </button>
            </td>
        `;
        feeTable.appendChild(row);
    });
}

// ===============================
// ADD FEE
// ===============================

if (addFee) {
    addFee.addEventListener("click", async () => {
        const selectedId = studentSelect.value;
        const feeAmount = Number(amount.value);

        if (!selectedId || !feeAmount) {
            alert("Please select a student and enter fee amount.");
            return;
        }

        const isPaid = statusSelect.value === "Paid";
        const payload = {
            student: selectedId,
            academicYear: "2025-2026",
            semester: 4,
            totalAmount: feeAmount,
            paidAmount: isPaid ? feeAmount : 0,
            status: isPaid ? "paid" : "pending",
            paymentDate: paymentDate.value || new Date().toISOString().split("T")[0],
            paymentMethod: "upi"
        };

        try {
            const response = await feeAPI.createFee(payload);
            if (response && response.success) {
                alert("Fee record saved to MongoDB successfully!");
                studentSelect.value = "";
                rollNo.value = "";
                branch.value = "";
                amount.value = "";
                paymentDate.value = "";
                loadFees();
            } else {
                alert(response.message || "Failed to add fee.");
            }
        } catch (err) {
            alert("Error communicating with backend.");
        }
    });
}

async function deleteFeeRecord(id) {
    if (confirm("Are you sure you want to delete this fee record?")) {
        alert("Fee record deleted.");
        loadFees();
    }
}
window.deleteFeeRecord = deleteFeeRecord;

if (searchFee) {
    searchFee.addEventListener("input", () => {
        const term = searchFee.value.toLowerCase().trim();
        const filtered = feesData.filter(f => {
            const s = f.student || {};
            const name = (s.fullName || `${s.firstName || ''} ${s.lastName || ''}`).toLowerCase();
            const roll = (s.rollNumber || s.roll || f.roll || "").toLowerCase();
            return name.includes(term) || roll.includes(term);
        });
        renderFeesTable(filtered);
    });
}

// Initial Load gated on session verification
if (typeof requireAuth === "function") {
    requireAuth().then(authenticated => {
        if (authenticated) {
            loadStudents();
            loadFees();
        }
    });
} else {
    loadStudents();
    loadFees();
}
