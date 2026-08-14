 
console.log("Fees Module Loaded");


// Get Students Data
let students = JSON.parse(localStorage.getItem("students")) || [];

let fees = JSON.parse(localStorage.getItem("fees")) || [];


// Elements
const studentSelect = document.getElementById("studentSelect");
const rollNo = document.getElementById("rollNo");
const branch = document.getElementById("branch");

const amount = document.getElementById("amount");
const paymentDate = document.getElementById("paymentDate");
const status = document.getElementById("status");

const addFee = document.getElementById("addFee");

const feeTable = document.getElementById("feeTable");

const searchFee = document.getElementById("searchFee");



// Load Students Dropdown

function loadStudents(){

    studentSelect.innerHTML =
    `<option value="">Select Student</option>`;

    students.forEach((student,index)=>{

        let option = document.createElement("option");

        option.value = index;

        option.textContent =
        student.name;

        studentSelect.appendChild(option);

    });

}


loadStudents();



// Auto Fill Roll & Branch

studentSelect.addEventListener("change",()=>{

    let student = students[studentSelect.value];

    if(student){

        rollNo.value = student.roll;
        branch.value = student.branch;

    }
    else{

        rollNo.value="";
        branch.value="";

    }

});




// Add Fee Record

addFee.addEventListener("click",()=>{


    let student = students[studentSelect.value];


    if(!student || !amount.value){

        alert("Please fill all details");
        return;

    }



    let feeData={

        name:student.name,

        roll:student.roll,

        branch:student.branch,

        amount:amount.value,

        date:paymentDate.value,

        status:status.value

    };



    fees.push(feeData);


    localStorage.setItem(
        "fees",
        JSON.stringify(fees)
    );


    displayFees();


    alert("Fee Added Successfully");


});





// Display Fees

function displayFees(data = fees){


    feeTable.innerHTML="";


    data.forEach((fee,index)=>{


        let row = `

        <tr>

        <td>${fee.name}</td>

        <td>${fee.roll}</td>

        <td>${fee.branch}</td>

        <td>₹${fee.amount}</td>

        <td>${fee.date}</td>

        <td>${fee.status}</td>


        <td>

        <button onclick="deleteFee(${index})">
        Delete
        </button>

        </td>


        </tr>

        `;


        feeTable.innerHTML += row;


    });


}



displayFees();




// Delete Fee

function deleteFee(index){


    fees.splice(index,1);


    localStorage.setItem(
        "fees",
        JSON.stringify(fees)
    );


    displayFees();


}




// Search Fee

searchFee.addEventListener("keyup",()=>{


    let value =
    searchFee.value.toLowerCase();


    let filtered =
    fees.filter((fee)=>{


        return fee.name
        .toLowerCase()
        .includes(value)
        ||
        fee.roll
        .toString()
        .includes(value);


    });


    displayFees(filtered);


});

