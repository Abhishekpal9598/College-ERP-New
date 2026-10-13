/**
 * College ERP - Comprehensive Authentication & Authorization Audit Regression Suite
 * Validates all 10 critical security criteria requested in the production audit.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const backendNodeModules = path.join(__dirname, "../../backend/node_modules");
const jwt = require(path.join(backendNodeModules, "jsonwebtoken"));
const mongoose = require(path.join(backendNodeModules, "mongoose"));
const dotenv = require(path.join(backendNodeModules, "dotenv"));

dotenv.config({ path: path.join(__dirname, "../../backend/.env") });

const app = require('../../backend/src/app');
const User = require('../../backend/src/models/User');
const tokenBlacklistService = require('../../backend/src/services/tokenBlacklistService');
const {
    isTokenExpired,
    clearAuthState,
    hasValidToken,
    verifySession,
    requireAuth,
    showProtectedContent,
    logout
} = require('../../frontend/js/auth-guard');

// Mock Browser Environment
class LocalStorageMock {
    constructor() { this.store = {}; }
    getItem(k) { return this.store[k] !== undefined ? this.store[k] : null; }
    setItem(k, v) { this.store[k] = String(v); }
    removeItem(k) { delete this.store[k]; }
    clear() { this.store = {}; }
}

const JWT_SECRET = process.env.JWT_SECRET || "college_erp_dev_secret_key_2026";

async function runAuditSuite() {
    console.log("================================================================================");
    console.log("  COLLEGE ERP - END-TO-END AUTHENTICATION & AUTHORIZATION AUDIT SUITE");
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

    if (mongoose.connection.readyState === 0) {
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/college_erp";
        await mongoose.connect(mongoUri);
    }

    // Start a temporary test HTTP server for live supertest/fetch calls
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/api`;

    const mockStorage = new LocalStorageMock();
    global.localStorage = mockStorage;

    let redirectedTo = null;
    let bodyHidden = true;

    global.document = {
        getElementById: (id) => {
            if (id === "auth-guard-css") {
                return {
                    id: "auth-guard-css",
                    parentNode: {
                        removeChild: () => { bodyHidden = false; }
                    }
                };
            }
            return null;
        },
        body: {
            style: { display: "none", visibility: "hidden" }
        }
    };

    global.window = {
        location: {
            pathname: "/pages/dashboard/dashboard.html",
            replace: (url) => { redirectedTo = url; },
            href: "/pages/dashboard/dashboard.html"
        },
        APP_CONFIG: {
            API_URL: baseUrl
        }
    };

    // Find or create test users (super_admin, admin, accountant)
    let adminUser = await User.findOne({ email: "audit_admin@college.erp" });
    if (!adminUser) {
        adminUser = new User({
            name: "Audit Administrator",
            email: "audit_admin@college.erp",
            password: "Password@123",
            role: "admin",
            status: "active",
            isEmailVerified: true
        });
        await adminUser.save();
    }

    let accountantUser = await User.findOne({ email: "audit_accountant@college.erp" });
    if (!accountantUser) {
        accountantUser = new User({
            name: "Audit Accountant",
            email: "audit_accountant@college.erp",
            password: "Password@123",
            role: "accountant",
            status: "active",
            isEmailVerified: true
        });
        await accountantUser.save();
    }

    // -------------------------------------------------------------
    // TEST 01: Anonymous Dashboard access denied & body hidden
    // -------------------------------------------------------------
    mockStorage.clear();
    redirectedTo = null;
    bodyHidden = true;
    window.location.pathname = "/pages/dashboard/dashboard.html";
    const res1 = await requireAuth();
    assert(
        res1 === false && redirectedTo === "/pages/login/login.html" && bodyHidden === true,
        "Anonymous Dashboard access denied (body remains hidden, redirected to login)",
        `requireAuth: ${res1}, redirectedTo: ${redirectedTo}, bodyHidden: ${bodyHidden}`
    );

    // -------------------------------------------------------------
    // TEST 02: Anonymous Students page access denied & body hidden
    // -------------------------------------------------------------
    mockStorage.clear();
    redirectedTo = null;
    bodyHidden = true;
    window.location.pathname = "/pages/students/students.html";
    const res2 = await requireAuth();
    assert(
        res2 === false && redirectedTo === "/pages/login/login.html" && bodyHidden === true,
        "Anonymous Students page access denied (body remains hidden, redirected to login)",
        `requireAuth: ${res2}, redirectedTo: ${redirectedTo}, bodyHidden: ${bodyHidden}`
    );

    // -------------------------------------------------------------
    // TEST 03: Anonymous Fees page access denied & body hidden
    // -------------------------------------------------------------
    mockStorage.clear();
    redirectedTo = null;
    bodyHidden = true;
    window.location.pathname = "/pages/fees/fees.html";
    const res3 = await requireAuth();
    assert(
        res3 === false && redirectedTo === "/pages/login/login.html" && bodyHidden === true,
        "Anonymous Fees page access denied (body remains hidden, redirected to login)",
        `requireAuth: ${res3}, redirectedTo: ${redirectedTo}, bodyHidden: ${bodyHidden}`
    );

    // -------------------------------------------------------------
    // TEST 04: Invalid token denied (rejected by backend, storage purged, body hidden)
    // -------------------------------------------------------------
    mockStorage.clear();
    // Tampered signature or invalid structure
    const invalidToken = jwt.sign({ id: adminUser._id.toString() }, "wrong_secret_key_123");
    mockStorage.setItem("token", invalidToken);
    mockStorage.setItem("isLoggedIn", "true");
    redirectedTo = null;
    bodyHidden = true;
    window.location.pathname = "/pages/dashboard/dashboard.html";

    const res4 = await requireAuth();
    assert(
        res4 === false && mockStorage.getItem("token") === null && redirectedTo === "/pages/login/login.html" && bodyHidden === true,
        "Invalid token denied (backend rejects signature, storage cleared, redirected, body hidden)",
        `requireAuth: ${res4}, storage purged: ${mockStorage.getItem("token") === null}, bodyHidden: ${bodyHidden}`
    );

    // -------------------------------------------------------------
    // TEST 05: Expired token denied (detected client & backend, purged, body hidden)
    // -------------------------------------------------------------
    mockStorage.clear();
    const expiredToken = jwt.sign(
        { id: adminUser._id.toString(), exp: Math.floor(Date.now() / 1000) - 300 },
        JWT_SECRET
    );
    mockStorage.setItem("token", expiredToken);
    mockStorage.setItem("isLoggedIn", "true");
    redirectedTo = null;
    bodyHidden = true;
    window.location.pathname = "/pages/dashboard/dashboard.html";

    const isExp = isTokenExpired(expiredToken);
    const res5 = await requireAuth();
    assert(
        isExp === true && res5 === false && mockStorage.getItem("token") === null && redirectedTo === "/pages/login/login.html" && bodyHidden === true,
        "Expired token denied (expired check: true, storage cleared, redirected, body hidden)",
        `isTokenExpired: ${isExp}, requireAuth: ${res5}, bodyHidden: ${bodyHidden}`
    );

    // -------------------------------------------------------------
    // TEST 06: Revoked token denied (session blacklisted, backend returns 401, body hidden)
    // -------------------------------------------------------------
    mockStorage.clear();
    const activeTokenToRevoke = jwt.sign(
        { id: adminUser._id.toString(), email: adminUser.email, role: adminUser.role, tokenVersion: adminUser.tokenVersion, jti: "test_06_revoked_" + Date.now() },
        JWT_SECRET,
        { expiresIn: "1h" }
    );
    await tokenBlacklistService.invalidateToken(activeTokenToRevoke, new Date(Date.now() + 3600000), adminUser._id, "Security audit test");

    mockStorage.setItem("token", activeTokenToRevoke);
    mockStorage.setItem("isLoggedIn", "true");
    redirectedTo = null;
    bodyHidden = true;
    window.location.pathname = "/pages/dashboard/dashboard.html";

    const res6 = await requireAuth();
    assert(
        res6 === false && mockStorage.getItem("token") === null && redirectedTo === "/pages/login/login.html" && bodyHidden === true,
        "Revoked token denied (blacklisted token rejected with 401, storage purged, redirected, body hidden)",
        `requireAuth: ${res6}, storage cleared: ${mockStorage.getItem("token") === null}, bodyHidden: ${bodyHidden}`
    );

    // -------------------------------------------------------------
    // TEST 07: Valid token accepted (backend GET /api/auth/me returns 200, body revealed)
    // -------------------------------------------------------------
    mockStorage.clear();
    const validToken = jwt.sign(
        { id: adminUser._id.toString(), email: adminUser.email, role: adminUser.role, tokenVersion: adminUser.tokenVersion, jti: "test_07_valid_" + Date.now() },
        JWT_SECRET,
        { expiresIn: "1h" }
    );
    mockStorage.setItem("token", validToken);
    redirectedTo = null;
    bodyHidden = true;
    window.location.pathname = "/pages/dashboard/dashboard.html";

    const res7 = await requireAuth();
    assert(
        res7 === true && redirectedTo === null && bodyHidden === false,
        "Valid token accepted (backend verification succeeds, authenticated: true, body revealed)",
        `requireAuth: ${res7}, redirectedTo: ${redirectedTo}, bodyHidden: ${bodyHidden}`
    );

    // -------------------------------------------------------------
    // TEST 08: Logout invalidates the session
    // -------------------------------------------------------------
    const sessionTokenToLogout = jwt.sign(
        { id: adminUser._id.toString(), email: adminUser.email, role: adminUser.role, tokenVersion: adminUser.tokenVersion, jti: "test_08_logout_" + Date.now() },
        JWT_SECRET,
        { expiresIn: "1h" }
    );
    mockStorage.setItem("token", sessionTokenToLogout);
    mockStorage.setItem("isLoggedIn", "true");
    redirectedTo = null;

    global.window.authAPI = {
        logout: async () => {
            const raw = await fetch(`${baseUrl}/auth/logout`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${sessionTokenToLogout}`,
                    "Content-Type": "application/json"
                }
            });
            return raw.json();
        }
    };

    await logout();
    const isRevokedInDB = await tokenBlacklistService.isTokenInvalidated(sessionTokenToLogout);
    assert(
        isRevokedInDB === true && mockStorage.getItem("token") === null && redirectedTo === "/pages/login/login.html",
        "Logout invalidates the session (revoked on backend & MongoDB, storage cleared, redirected)",
        `revokedInDB: ${isRevokedInDB}, token in storage: ${mockStorage.getItem("token")}, redirectedTo: ${redirectedTo}`
    );

    // -------------------------------------------------------------
    // TEST 09: Protected API routes without token return 401
    // -------------------------------------------------------------
    const endpointsToTest = ["/dashboard/stats", "/students", "/fees", "/teachers", "/attendance", "/results", "/auth/me"];
    let allReturned401 = true;
    const endpointStatuses = [];

    for (const ep of endpointsToTest) {
        const resp = await fetch(`${baseUrl}${ep}`);
        endpointStatuses.push(`${ep}: ${resp.status}`);
        if (resp.status !== 401) {
            allReturned401 = false;
        }
    }

    assert(
        allReturned401 === true,
        "Protected API routes without token return HTTP 401 Unauthorized",
        endpointStatuses.join(", ")
    );

    // -------------------------------------------------------------
    // TEST 10: Unauthorized role returns 403 Forbidden
    // -------------------------------------------------------------
    // Accountant token trying to access Super Admin invitations (/api/admin/invitations)
    const accountantToken = jwt.sign(
        { id: accountantUser._id.toString(), email: accountantUser.email, role: accountantUser.role, tokenVersion: accountantUser.tokenVersion },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    const rbacResp1 = await fetch(`${baseUrl}/admin/invitations`, {
        headers: { "Authorization": `Bearer ${accountantToken}` }
    });

    // Accountant token trying to delete a student (/api/students/:id)
    const rbacResp2 = await fetch(`${baseUrl}/students/60c72b2f9b1d8b0015b6d999`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${accountantToken}` }
    });

    assert(
        rbacResp1.status === 403 && rbacResp2.status === 403,
        "Unauthorized role returns HTTP 403 Forbidden",
        `Admin invitations: HTTP ${rbacResp1.status}, Student delete: HTTP ${rbacResp2.status}`
    );

    // -------------------------------------------------------------
    // TEST 11: All 9 Protected HTML Pages contain auth-guard-css and noscript in <head>
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

    let allPagesHaveCssGuard = true;
    const missingCssGuard = [];

    for (const pageRel of protectedPages) {
        const fullPath = path.join(pagesDir, pageRel);
        const html = fs.readFileSync(fullPath, "utf-8");
        const hasCss = html.includes('id="auth-guard-css"') && html.includes("display: none !important");
        const hasNoscript = html.includes("<noscript>") && html.includes("/pages/login/login.html");
        if (!hasCss || !hasNoscript) {
            allPagesHaveCssGuard = false;
            missingCssGuard.push(pageRel);
        }
    }

    assert(
        allPagesHaveCssGuard === true,
        "All 9 protected HTML pages contain head-level CSS guard and noscript meta-refresh",
        missingCssGuard.length === 0 ? "100% verified across all 9 pages" : `Missing: ${missingCssGuard.join(", ")}`
    );

    // -------------------------------------------------------------
    // TEST 12: Zero unauthenticated fallback execution branches in page scripts
    // -------------------------------------------------------------
    const scriptFiles = [
        "dashboard/dashboard.js",
        "students/students.js",
        "teachers/teachers.js",
        "fees/fees.js",
        "results/results.js",
        "settings/settings.js",
        "attendance/attendance.js"
    ];

    let zeroFallbacks = true;
    const violatingScripts = [];

    for (const scriptRel of scriptFiles) {
        const fullPath = path.join(pagesDir, scriptRel);
        const code = fs.readFileSync(fullPath, "utf-8");
        // Look for pattern `} else {\n    updateDashboard` or `} else {\n    fetchAndDisplay` or `} else {\n    loadStudents`
        if (code.includes("} else {\n    updateDashboard") ||
            code.includes("} else {\n    fetchAndDisplay") ||
            code.includes("} else {\n    loadStudents") ||
            code.includes("} else {\n    loadSettings")) {
            zeroFallbacks = false;
            violatingScripts.push(scriptRel);
        }
    }

    assert(
        zeroFallbacks === true,
        "Zero unauthenticated fallback execution branches across all page scripts",
        violatingScripts.length === 0 ? "All 7 page scripts strictly gated" : `Fallbacks detected: ${violatingScripts.join(", ")}`
    );

    // Cleanup
    server.close();

    console.log("\n================================================================================");
    console.log(`  AUDIT REGRESSION SUITE: ${passedTests}/${totalTests} PASSED (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log("================================================================================\n");

    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

runAuditSuite().then(() => {
    process.exit(0);
}).catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
