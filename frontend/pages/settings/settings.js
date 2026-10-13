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
    const savedCollege = localStorage.getItem("collegeName") || "Not Set";
    const savedAdmin = localStorage.getItem("adminName") || "Admin";

    if (showCollege) showCollege.textContent = savedCollege;
    if (showAdmin) showAdmin.textContent = savedAdmin;

    if (collegeName) collegeName.value = savedCollege === "Not Set" ? "" : savedCollege;
    if (adminName) adminName.value = savedAdmin === "Admin" ? "" : savedAdmin;
}

// Initial Load gated on session verification
if (typeof requireAuth === "function") {
    requireAuth().then(authenticated => {
        if (authenticated) loadSettings();
    });
} else {
    loadSettings();
}

// ==========================
// Save Settings
// ==========================

if (settingsForm) {
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

        if (showCollege) showCollege.textContent = college;
        if (showAdmin) showAdmin.textContent = admin;

        alert("Settings Saved Successfully!");
    });
}
