console.log("Settings Page Loaded");

// ==========================
// Variables
// ==========================

const settingsForm = document.getElementById("settingsForm");

const collegeName = document.getElementById("collegeName");
const adminName = document.getElementById("adminName");

const showCollege = document.getElementById("showCollege");
const showAdmin = document.getElementById("showAdmin");

// ==========================
// Load Saved Settings
// ==========================

function loadSettings() {

    const savedCollege =
        localStorage.getItem("collegeName") || "Not Set";

    const savedAdmin =
        localStorage.getItem("adminName") || "Admin";

    showCollege.textContent = savedCollege;
    showAdmin.textContent = savedAdmin;

    collegeName.value = savedCollege === "Not Set" ? "" : savedCollege;
    adminName.value = savedAdmin === "Admin" ? "" : savedAdmin;

}

loadSettings();

// ==========================
// Save Settings
// ==========================

settingsForm.addEventListener("submit", function (e) {

    e.preventDefault();

    const college = collegeName.value.trim();
    const admin = adminName.value.trim();

    if (college === "" || admin === "") {

        alert("Please fill all fields.");
        return;

    }

    localStorage.setItem("collegeName", college);
    localStorage.setItem("adminName", admin);

    showCollege.textContent = college;
    showAdmin.textContent = admin;

    alert("Settings Saved Successfully!");

});