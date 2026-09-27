console.log("College ERP Login Loaded");

// =========================
// Already Logged In Check
// =========================
if (typeof isAuthenticated === "function" && isAuthenticated()) {
    window.location.href = "../dashboard/dashboard.html";
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
if (toggleButton && passwordInput) {
    toggleButton.addEventListener("click", function () {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            toggleButton.textContent = "Hide Password";
        } else {
            passwordInput.type = "password";
            toggleButton.textContent = "Show Password";
        }
    });
}

// =========================
// Login Validation & API Call
// =========================
if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = passwordInput.value.trim();

        // Empty Fields
        if (email === "" || password === "") {
            alert("Please fill all fields.");
            return;
        }

        try {
            const response = await authAPI.login(email, password);

            if (response.success && response.data && response.data.token) {
                localStorage.setItem("token", response.data.token);
                localStorage.setItem("user", JSON.stringify(response.data.user));
                localStorage.setItem("isLoggedIn", "true");
                localStorage.setItem("adminName", response.data.user.name || "Administrator");

                alert("Login Successful!");
                window.location.href = "../dashboard/dashboard.html";
            } else {
                alert(response.message || "Invalid Email or Password!");
            }
        } catch (err) {
            alert("Unable to reach backend server. Please ensure backend is running on http://localhost:5000");
        }
    });
}
