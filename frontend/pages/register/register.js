console.log("College ERP Admin Registration Loaded");

// ==========================================
// 1. URL Parameter Extraction
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteParam = urlParams.get("invite") || urlParams.get("token");
    const emailParam = urlParams.get("email");

    if (inviteParam) {
        const tokenInput = document.getElementById("invitationToken");
        if (tokenInput) {
            tokenInput.value = inviteParam;
        }
    }

    if (emailParam) {
        const emailInput = document.getElementById("email");
        if (emailInput) {
            emailInput.value = emailParam;
        }
    }
});

// ==========================================
// 2. Elements & Password Toggle
// ==========================================
const registerForm = document.getElementById("registerForm");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const togglePwdBtn = document.getElementById("togglePasswordBtn");
const pwdEyeIcon = document.getElementById("pwdEyeIcon");
const submitBtn = document.getElementById("submitBtn");

if (togglePwdBtn && passwordInput) {
    togglePwdBtn.addEventListener("click", () => {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            if (pwdEyeIcon) {
                pwdEyeIcon.classList.remove("fa-eye");
                pwdEyeIcon.classList.add("fa-eye-slash");
            }
        } else {
            passwordInput.type = "password";
            if (pwdEyeIcon) {
                pwdEyeIcon.classList.remove("fa-eye-slash");
                pwdEyeIcon.classList.add("fa-eye");
            }
        }
    });
}

// ==========================================
// 3. Password Strength Meter
// ==========================================
const strengthBars = [
    document.getElementById("bar1"),
    document.getElementById("bar2"),
    document.getElementById("bar3"),
    document.getElementById("bar4")
];
const strengthText = document.getElementById("strengthText");

function evaluatePasswordStrength(pwd) {
    if (!pwd) return { score: 0, text: "Enter password", color: "#e5e7eb" };

    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;

    switch (score) {
        case 1:
            return { score: 1, text: "Weak (Need upper, lower, numbers & symbols)", color: "#ef4444" };
        case 2:
            return { score: 2, text: "Fair (Add numbers or special characters)", color: "#f59e0b" };
        case 3:
            return { score: 3, text: "Good (Almost secure)", color: "#3b82f6" };
        case 4:
            return { score: 4, text: "Strong (Secure password)", color: "#10b981" };
        default:
            return { score: 0, text: "Too short (min. 8 characters)", color: "#ef4444" };
    }
}

if (passwordInput) {
    passwordInput.addEventListener("input", () => {
        const result = evaluatePasswordStrength(passwordInput.value);

        strengthBars.forEach((bar, idx) => {
            if (bar) {
                if (idx < result.score) {
                    bar.style.backgroundColor = result.color;
                } else {
                    bar.style.backgroundColor = "#e5e7eb";
                }
            }
        });

        if (strengthText) {
            strengthText.textContent = `Strength: ${result.text}`;
            strengthText.style.color = result.color === "#e5e7eb" ? "#6b7280" : result.color;
        }

        checkPasswordMatch();
    });
}

// ==========================================
// 4. Password Match Indicator
// ==========================================
const matchText = document.getElementById("matchText");

function checkPasswordMatch() {
    if (!confirmPasswordInput || !passwordInput || !matchText) return;

    const pwd = passwordInput.value;
    const confirm = confirmPasswordInput.value;

    if (!confirm) {
        matchText.textContent = "";
        matchText.className = "match-indicator";
        return;
    }

    if (pwd === confirm) {
        matchText.textContent = "✓ Passwords match";
        matchText.className = "match-indicator match";
    } else {
        matchText.textContent = "✗ Passwords do not match";
        matchText.className = "match-indicator mismatch";
    }
}

if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", checkPasswordMatch);
}

// ==========================================
// 5. Modal Display Helper
// ==========================================
const statusModal = document.getElementById("statusModal");
const modalIcon = document.getElementById("modalIcon");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalActionBtn = document.getElementById("modalActionBtn");

function showStatusModal({ isSuccess, title, message, actionText, onAction }) {
    if (!statusModal) return;

    if (modalIcon) {
        modalIcon.className = `modal-icon ${isSuccess ? "success" : "error"}`;
        modalIcon.innerHTML = isSuccess ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
    }

    if (modalTitle) modalTitle.textContent = title;
    if (modalMessage) modalMessage.textContent = message;

    if (modalActionBtn) {
        modalActionBtn.textContent = actionText || (isSuccess ? "Return to Login" : "Close");
        modalActionBtn.onclick = () => {
            statusModal.style.display = "none";
            if (typeof onAction === "function") {
                onAction();
            }
        };
    }

    statusModal.style.display = "flex";
}

// ==========================================
// 6. Form Submission & API Integration
// ==========================================
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const collegeName = document.getElementById("collegeName").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const invitationToken = document.getElementById("invitationToken").value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const termsCheck = document.getElementById("termsCheck");

        // Basic Validation
        if (!name || !collegeName || !email || !phone || !invitationToken || !password) {
            alert("Please fill in all required fields.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match. Please verify.");
            return;
        }

        if (termsCheck && !termsCheck.checked) {
            alert("You must agree to the Administrative Access Policy.");
            return;
        }

        const strength = evaluatePasswordStrength(password);
        if (strength.score < 2) {
            alert("Please choose a stronger password containing uppercase, lowercase, numbers, and symbols.");
            return;
        }

        // Set Loading State
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>Submitting Request...</span> <i class="fas fa-spinner fa-spin"></i>';
        }

        try {
            const payload = {
                name,
                collegeName,
                email,
                phone,
                invitationToken,
                password,
                confirmPassword
            };

            const response = await authAPI.registerAdmin(payload);

            if (response && response.success) {
                showStatusModal({
                    isSuccess: true,
                    title: "Application Submitted Successfully",
                    message: "Your administrator registration request has been submitted. A verification email has been sent. Your account will be activated once approved by the Super Administrator.",
                    actionText: "Proceed to Login",
                    onAction: () => {
                        window.location.href = "/pages/login/login.html";
                    }
                });
            } else {
                const errMsg = response?.message || (response?.errors?.[0]?.msg) || "Registration request failed. Please check your invitation token and details.";
                showStatusModal({
                    isSuccess: false,
                    title: "Application Failed",
                    message: errMsg,
                    actionText: "Review Form"
                });
            }
        } catch (err) {
            showStatusModal({
                isSuccess: false,
                title: "Network / Server Error",
                message: err && err.message ? err.message : "Unable to reach College ERP server. Please verify your connection.",
                actionText: "Close"
            });
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Submit Application</span> <i class="fas fa-arrow-right"></i>';
            }
        }
    });
}
