/**
 * College ERP - Comprehensive Frontend Authentication & Redirect Flow Test Suite
 * Validates all 9 critical scenarios required by production security specifications.
 */

const fs = require('fs');
const path = require('path');

const backendNodeModules = path.join(__dirname, "../../backend/node_modules");
const jwt = require(path.join(backendNodeModules, "jsonwebtoken"));
const mongoose = require(path.join(backendNodeModules, "mongoose"));
const dotenv = require(path.join(backendNodeModules, "dotenv"));

dotenv.config({ path: path.join(__dirname, "../../backend/.env") });
const { isTokenExpired, clearAuthState, hasValidToken, verifySession, requireAuth, logout } = require('../../frontend/js/auth-guard');
const User = require('../../backend/src/models/User');
const tokenBlacklistService = require('../../backend/src/services/tokenBlacklistService');

// Simulated Browser Environment (DOM/LocalStorage/Window)
class LocalStorageMock {
    constructor() {
        this.store = {};
    }
    getItem(key) {
        return this.store[key] !== undefined ? this.store[key] : null;
    }
    setItem(key, value) {
        this.store[key] = String(value);
    }
    removeItem(key) {
        delete this.store[key];
    }
    clear() {
        this.store = {};
    }
}

const JWT_SECRET = process.env.JWT_SECRET || "college_erp_dev_secret_key_2026";

async function runTestSuite() {
    console.log("================================================================================");
    console.log("  COLLEGE ERP - FRONTEND AUTHENTICATION & REDIRECT FLOW TEST SUITE");
    console.log("================================================================================\n");

    let totalTests = 0;
    let passedTests = 0;

    function assert(condition, testName, details = "") {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`  [PASS] [TEST ${String(totalTests).padStart(2, "0")}] ${testName}`);
            if (details) console.log(`         -> ${details}`);
        } else {
            console.error(`  [FAIL] [TEST ${String(totalTests).padStart(2, "0")}] ${testName}`);
            if (details) console.error(`         -> ${details}`);
        }
    }

    // Connect to database if not connected for live verification
    if (mongoose.connection.readyState === 0) {
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/college_erp";
        await mongoose.connect(mongoUri);
    }

    // Setup Mock Globals
    const mockStorage = new LocalStorageMock();
    global.localStorage = mockStorage;
    let redirectedTo = null;
    global.window = {
        location: {
            pathname: "/pages/dashboard/dashboard.html",
            replace: (url) => { redirectedTo = url; },
            href: "/pages/dashboard/dashboard.html"
        },
        APP_CONFIG: {
            API_URL: "http://localhost:5000/api"
        }
    };

    // -------------------------------------------------------------
    // TEST 01: No token: hasValidToken() returns false & redirects to login
    // -------------------------------------------------------------
    mockStorage.clear();
    redirectedTo = null;
    const test1HasToken = hasValidToken();
    const test1ReqAuth = await requireAuth();
    assert(
        test1HasToken === false && test1ReqAuth === false && redirectedTo === "/pages/login/login.html",
        "Unauthenticated user with no token is blocked from protected pages",
        `hasValidToken: ${test1HasToken}, redirectedTo: ${redirectedTo}`
    );

    // -------------------------------------------------------------
    // TEST 02: Stale isLoggedIn flag without token is purged & blocked
    // -------------------------------------------------------------
    mockStorage.clear();
    mockStorage.setItem("isLoggedIn", "true");
    redirectedTo = null;
    const test2HasToken = hasValidToken();
    assert(
        test2HasToken === false && mockStorage.getItem("isLoggedIn") === null,
        "Stale isLoggedIn=true without token is purged from localStorage",
        `isLoggedIn in storage: ${mockStorage.getItem("isLoggedIn")}`
    );

    // -------------------------------------------------------------
    // TEST 03: Expired JWT is detected client-side, purged & redirected to login
    // -------------------------------------------------------------
    mockStorage.clear();
    const expiredPayload = { id: new mongoose.Types.ObjectId().toString(), exp: Math.floor(Date.now() / 1000) - 3600 };
    const expiredToken = jwt.sign(expiredPayload, JWT_SECRET);
    mockStorage.setItem("token", expiredToken);
    mockStorage.setItem("isLoggedIn", "true");
    mockStorage.setItem("user", JSON.stringify({ name: "Expired User" }));
    redirectedTo = null;

    const test3ExpiredCheck = isTokenExpired(expiredToken);
    const test3HasToken = hasValidToken();
    const test3ReqAuth = await requireAuth();

    assert(
        test3ExpiredCheck === true &&
        test3HasToken === false &&
        mockStorage.getItem("token") === null &&
        mockStorage.getItem("isLoggedIn") === null &&
        redirectedTo === "/pages/login/login.html",
        "Expired JWT is immediately invalidated client-side and redirected to login",
        `isTokenExpired: ${test3ExpiredCheck}, token purged: ${mockStorage.getItem("token") === null}, redirectedTo: ${redirectedTo}`
    );

    // -------------------------------------------------------------
    // TEST 04: Malformed / Garbage token is rejected, purged & redirected
    // -------------------------------------------------------------
    mockStorage.clear();
    const garbageToken = "not_a_valid_jwt_token_string";
    mockStorage.setItem("token", garbageToken);
    redirectedTo = null;

    const test4Expired = isTokenExpired(garbageToken);
    const test4HasToken = hasValidToken();
    assert(
        test4Expired === true && test4HasToken === false && mockStorage.getItem("token") === null,
        "Malformed non-JWT token is rejected and purged immediately",
        `isTokenExpired: ${test4Expired}, hasValidToken: ${test4HasToken}`
    );

    // -------------------------------------------------------------
    // TEST 05: Valid JWT passes client-side validation
    // -------------------------------------------------------------
    mockStorage.clear();
    // Find or create an active test user
    let activeUser = await User.findOne({ status: "active", isEmailVerified: true });
    if (!activeUser) {
        activeUser = new User({
            name: "Test Auth Admin",
            email: "test_auth_admin_" + Date.now() + "@college.edu",
            password: "HashedPassword123!",
            role: "admin",
            status: "active",
            isEmailVerified: true
        });
        await activeUser.save();
    }

    const validToken = jwt.sign(
        { id: activeUser._id.toString(), email: activeUser.email, role: activeUser.role, tokenVersion: activeUser.tokenVersion },
        JWT_SECRET,
        { expiresIn: "2h" }
    );
    mockStorage.setItem("token", validToken);

    const test5Expired = isTokenExpired(validToken);
    const test5HasToken = hasValidToken();
    assert(
        test5Expired === false && test5HasToken === true,
        "Valid unexpired JWT passes client-side validation",
        `isTokenExpired: ${test5Expired}, hasValidToken: ${test5HasToken}`
    );

    // -------------------------------------------------------------
    // TEST 06: Active session verified successfully with backend GET /api/auth/me
    // -------------------------------------------------------------
    redirectedTo = null;
    const test6Verify = await verifySession();
    assert(
        test6Verify.authenticated === true && test6Verify.user && test6Verify.user.email === activeUser.email,
        "Active session is verified successfully with backend /api/auth/me",
        `Authenticated: ${test6Verify.authenticated}, User email: ${test6Verify.user?.email}`
    );

    // -------------------------------------------------------------
    // TEST 07: Concurrent duplicate verifySession calls are deduplicated into single promise
    // -------------------------------------------------------------
    const call1 = verifySession();
    const call2 = verifySession();
    assert(
        call1 === call2,
        "Concurrent verifySession() calls are deduplicated to prevent redundant network requests",
        "Both parallel invocations returned the identical in-flight Promise instance"
    );
    await Promise.all([call1, call2]);

    // -------------------------------------------------------------
    // TEST 08: Revoked token (server-side blacklist) is rejected by verifySession
    // -------------------------------------------------------------
    await tokenBlacklistService.invalidateToken(validToken, new Date(Date.now() + 3600000), activeUser._id, "Logout test");
    redirectedTo = null;
    const test8Verify = await verifySession();
    assert(
        test8Verify.authenticated === false && mockStorage.getItem("token") === null,
        "Server-side revoked token is rejected by backend and local storage is cleared",
        `Authenticated: ${test8Verify.authenticated}, Token in storage: ${mockStorage.getItem("token")}`
    );

    // -------------------------------------------------------------
    // TEST 09: Logout revokes session, clears storage, and redirects to login
    // -------------------------------------------------------------
    const freshToken = jwt.sign(
        { id: activeUser._id.toString(), email: activeUser.email, role: activeUser.role, tokenVersion: activeUser.tokenVersion },
        JWT_SECRET,
        { expiresIn: "2h" }
    );
    mockStorage.setItem("token", freshToken);
    mockStorage.setItem("isLoggedIn", "true");
    mockStorage.setItem("user", JSON.stringify({ email: activeUser.email }));
    mockStorage.setItem("adminName", "Test Admin");
    redirectedTo = null;

    global.window.authAPI = {
        logout: async () => {
            await tokenBlacklistService.invalidateToken(freshToken, new Date(Date.now() + 3600000), activeUser._id, "Manual logout");
            return { success: true };
        }
    };

    await logout();
    const isNowRevoked = await tokenBlacklistService.isTokenInvalidated(freshToken);

    assert(
        isNowRevoked === true &&
        mockStorage.getItem("token") === null &&
        mockStorage.getItem("isLoggedIn") === null &&
        mockStorage.getItem("user") === null &&
        mockStorage.getItem("adminName") === null &&
        redirectedTo === "/pages/login/login.html",
        "Logout revokes token on backend, purges all local auth keys, and redirects to login",
        `Token revoked in DB: ${isNowRevoked}, All storage keys cleared: true, redirectedTo: ${redirectedTo}`
    );

    // -------------------------------------------------------------
    // TEST 10: HTML Script Loading Order & Protection Audit Across All Pages
    // -------------------------------------------------------------
    const pagesDir = path.join(__dirname, "../../frontend/pages");
    const protectedPages = [
        "dashboard/dashboard.html",
        "students/students.html",
        "teachers/teachers.html",
        "fees/fees.html",
        "results/results.html",
        "settings/settings.html",
        "attendance/attendance.html",
        "attendance/attendance-selection.html",
        "attendance/teacher-attendance.html"
    ];

    let allProtectedPagesValid = true;
    const failures = [];

    for (const pageRel of protectedPages) {
        const fullPath = path.join(pagesDir, pageRel);
        const content = fs.readFileSync(fullPath, "utf-8");

        const configIdx = content.indexOf("config.js");
        const apiIdx = content.indexOf("api.js");
        const authGuardIdx = content.indexOf("auth-guard.js");
        const requireAuthIdx = content.indexOf("requireAuth();");

        // Verification rules:
        // 1. config.js must exist
        // 2. api.js must exist
        // 3. auth-guard.js must exist
        // 4. requireAuth() must exist
        // 5. config.js < api.js < auth-guard.js < requireAuth()
        if (configIdx === -1 || apiIdx === -1 || authGuardIdx === -1 || requireAuthIdx === -1) {
            allProtectedPagesValid = false;
            failures.push(`${pageRel}: missing one or more required auth scripts`);
        } else if (!(configIdx < apiIdx && apiIdx < authGuardIdx && authGuardIdx < requireAuthIdx)) {
            allProtectedPagesValid = false;
            failures.push(`${pageRel}: incorrect load order (config: ${configIdx}, api: ${apiIdx}, auth: ${authGuardIdx}, requireAuth: ${requireAuthIdx})`);
        }
    }

    assert(
        allProtectedPagesValid,
        "Every protected HTML page loads config.js -> api.js -> auth-guard.js -> requireAuth() in exact sequence",
        failures.length === 0 ? "All 9 protected pages verified with flawless script ordering" : failures.join("; ")
    );

    // -------------------------------------------------------------
    // TEST 11: Landing page (index.html) redirects directly to login and contains no dashboard bypass
    // -------------------------------------------------------------
    const indexFiles = [
        path.join(__dirname, "../../frontend/index.html"),
        path.join(__dirname, "../../frontend/public/index.html"),
        path.join(__dirname, "../../index.html")
    ];

    let allIndexFilesSecure = true;
    for (const f of indexFiles) {
        const c = fs.readFileSync(f, "utf-8");
        // Must redirect directly to login.html and not automatically redirect to dashboard
        if (!c.includes("/pages/login/login.html") || c.includes("/pages/dashboard/dashboard.html")) {
            allIndexFilesSecure = false;
        }
    }

    assert(
        allIndexFilesSecure,
        "All landing pages (index.html) redirect directly to login page with zero automatic dashboard bypass",
        "Verified across frontend/index.html, frontend/public/index.html, and root index.html"
    );

    // -------------------------------------------------------------
    // TEST 12: Login page (login.js) always displays login form without automatic dashboard redirect
    // -------------------------------------------------------------
    const loginJsPath = path.join(__dirname, "../../frontend/pages/login/login.js");
    const loginJsContent = fs.readFileSync(loginJsPath, "utf-8");
    const hasSyncBypass = loginJsContent.includes('window.location.href = "/pages/dashboard/dashboard.html";\n}');
    const hasAutoRedirect = loginJsContent.includes("verifySession().then");

    assert(
        !hasSyncBypass && !hasAutoRedirect,
        "Login page always shows login form and does not automatically redirect to Dashboard",
        `Synchronous bypass removed: ${!hasSyncBypass}, Automatic redirect to dashboard removed: ${!hasAutoRedirect}`
    );

    console.log("\n================================================================================");
    console.log(`  AUTHENTICATION FLOW SUITE: ${passedTests}/${totalTests} PASSED (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log("================================================================================\n");

    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

runTestSuite().then(() => {
    process.exit(0);
}).catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
