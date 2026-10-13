console.log("College ERP Login Loaded");

// =========================
// Session Verification
// Unauthenticated users always see the login form.
// Existing sessions are verified with the backend before any redirect.
// =========================
if (typeof hasValidToken === "function" && hasValidToken()) {
    if (typeof verifySession === "function") {
        verifySession().then(result => {
            if (result && result.authenticated) {
                window.location.replace("/pages/dashboard/dashboard.html");
            } else {
                if (typeof clearAuthState === "function") clearAuthState();
            }
        });
    }
} else {
    if (typeof clearAuthState === "function") {
        clearAuthState();
    }
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
                window.location.href = "/pages/dashboard/dashboard.html";
            } else {
                alert(response.message || "Invalid Email or Password!");
            }
        } catch (err) {
            alert(err && err.message ? err.message : "Unable to reach backend server. Please verify your connection.");
        }
    });
}
