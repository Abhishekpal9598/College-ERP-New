 
 localStorage.removeItem("isLoggedIn");
  alert("JavaScript Loaded");
 console.log("College ERP Started");

// =========================
// Already Logged In Check
// =========================

if (localStorage.getItem("isLoggedIn") === "true") {
    window.location.href = "dashboard.html";
}

// =========================
// Get Elements
// =========================

const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const toggleButton = document.getElementById("togglePassword");

// =========================
// Show / Hide Password
// =========================

toggleButton.addEventListener("click", function () {

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleButton.textContent = "Hide Password";
    } else {
        passwordInput.type = "password";
        toggleButton.textContent = "Show Password";
    }

});

// =========================
// Login Validation
// =========================

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = passwordInput.value.trim();

    // Empty Fields
    if (email === "" || password === "") {
        alert("Please fill all fields.");
        return;
    }

    // Password Length
    if (password.length < 8) {
        alert("Password must be at least 8 characters.");
        return;
    }

    // Login Check
    if (email ==="ankushddu7983@gmail.com" || password==="12345678" || email === "abhipal895@gmail.com" ||   password==="95982536" ) {

        localStorage.setItem("isLoggedIn", "true");

        alert("Login Successful!");

        window.location.href = "dashboard.html";

    } else {

        alert("Invalid Email or Password!");

    }

});