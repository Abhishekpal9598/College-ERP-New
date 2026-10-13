/**
 * College ERP - Direct URL Authentication & Session Verification Test Suite
 *
 * Verifies:
 * TEST 1: Clean Unauthenticated Session -> Direct Protected Dashboard URL -> Blocked & Redirected to Login
 * TEST 2: Authenticated Session -> Direct Dashboard URL -> Session Verified via GET /api/auth/me -> Dashboard Revealed
 * TEST 3: Logout -> Direct Protected Dashboard URL -> Revoked Token Cleared & Redirected to Login
 * TEST 4: New Tab / Window Without Login -> Direct Dashboard URL -> Blocked & Redirected to Login
 */

const assert = require("assert");
const jwt = require("../../backend/node_modules/jsonwebtoken");
const authGuard = require("../../frontend/js/auth-guard");

const TEST_SECRET = "college_erp_dev_secret_key_2026";

class MockStorage {
    constructor() {
        this.store = {};
    }
    getItem(key) {
        return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
    }
    setItem(key, val) {
        this.store[key] = String(val);
    }
    removeItem(key) {
        delete this.store[key];
    }
    clear() {
        this.store = {};
    }
}

class MockElement {
    constructor(id, parentNode = null) {
        this.id = id;
        this.parentNode = parentNode;
        this.style = {};
    }
}

class MockDocument {
    constructor() {
        this.elements = {};
        this.body = { style: {} };
    }
    getElementById(id) {
        return this.elements[id] || null;
    }
}

let checksPassed = 0;
let checksFailed = 0;

function logCheck(desc, passed, details = "") {
    if (passed) {
        checksPassed++;
        console.log(`  [PASS] ${desc}`);
        if (details) console.log(`         -> ${details}`);
    } else {
        checksFailed++;
        console.error(`  [FAIL] ${desc}`);
        if (details) console.error(`         -> ${details}`);
    }
}

async function runDirectUrlTests() {
    console.log("================================================================================");
    console.log("  COLLEGE ERP - DIRECT URL AUTHENTICATION INVESTIGATION TEST SUITE");
    console.log("================================================================================\n");

    // -------------------------------------------------------------------------
    // TEST 1: Clean Incognito Session -> Direct Protected Dashboard URL
    // -------------------------------------------------------------------------
    console.log(">>> [TEST 1] Clean Incognito Session: Paste Protected Dashboard URL (Unauthenticated)");
    {
        const mockStorage = new MockStorage();
        let redirectedTo = null;
        const mockWindow = {
            location: {
                pathname: "/pages/dashboard/dashboard.html",
                replace: (url) => { redirectedTo = url; }
            }
        };

        const mockDoc = new MockDocument();
        const styleElement = new MockElement("auth-guard-css", {
            removeChild: (el) => { delete mockDoc.elements[el.id]; }
        });
        mockDoc.elements["auth-guard-css"] = styleElement;
        mockDoc.body.style.display = "none";
        mockDoc.body.style.visibility = "hidden";

        global.localStorage = mockStorage;
        global.window = mockWindow;
        global.document = mockDoc;

        // Execute requireAuth() directly
        const result = await authGuard.requireAuth();

        logCheck(
            "[TEST 1] Unauthenticated direct Dashboard URL access is strictly blocked",
            result === false && redirectedTo === "/pages/login/login.html",
            `requireAuth: ${result}, redirectedTo: ${redirectedTo}`
        );

        logCheck(
            "[TEST 1] Protected DOM remains completely hidden (zero content flash)",
            mockDoc.getElementById("auth-guard-css") !== null && mockDoc.body.style.display === "none",
            `auth-guard-css preserved: ${!!mockDoc.getElementById("auth-guard-css")}, bodyDisplay: ${mockDoc.body.style.display}`
        );

        logCheck(
            "[TEST 1] No authentication token created in clean session",
            mockStorage.getItem("token") === null,
            `token in storage: ${mockStorage.getItem("token")}`
        );
    }

    // -------------------------------------------------------------------------
    // TEST 2: Authenticated Session -> Direct Dashboard URL Access
    // -------------------------------------------------------------------------
    console.log("\n>>> [TEST 2] Authenticated Session: Direct Dashboard URL Access with Valid Token");
    {
        const mockStorage = new MockStorage();
        const validToken = jwt.sign(
            { id: "admin_user_001", role: "super_admin", jti: `test2_${Date.now()}` },
            TEST_SECRET,
            { expiresIn: "2h" }
        );
        mockStorage.setItem("token", validToken);
        mockStorage.setItem("user", JSON.stringify({ id: "admin_user_001", email: "admin@college.erp", role: "super_admin" }));
        mockStorage.setItem("isLoggedIn", "true");

        let redirectedTo = null;
        const mockWindow = {
            location: {
                pathname: "/pages/dashboard/dashboard.html",
                replace: (url) => { redirectedTo = url; }
            },
            authAPI: {
                getMe: async () => ({
                    success: true,
                    data: { id: "admin_user_001", email: "admin@college.erp", role: "super_admin", name: "System Admin" }
                })
            }
        };

        const mockDoc = new MockDocument();
        const styleElement = new MockElement("auth-guard-css", {
            removeChild: (el) => { delete mockDoc.elements[el.id]; }
        });
        mockDoc.elements["auth-guard-css"] = styleElement;
        mockDoc.body.style.display = "none";
        mockDoc.body.style.visibility = "hidden";

        global.localStorage = mockStorage;
        global.window = mockWindow;
        global.document = mockDoc;

        const result = await authGuard.requireAuth();

        logCheck(
            "[TEST 2] Authenticated session passes backend verification via getMe()",
            result === true && redirectedTo === null,
            `requireAuth: ${result}, redirectedTo: ${redirectedTo}`
        );

        logCheck(
            "[TEST 2] Protected DOM is unhidden only after successful verification",
            mockDoc.getElementById("auth-guard-css") === null && mockDoc.body.style.visibility === "visible",
            `auth-guard-css removed: ${mockDoc.getElementById("auth-guard-css") === null}, bodyVisibility: ${mockDoc.body.style.visibility}`
        );
    }

    // -------------------------------------------------------------------------
    // TEST 3: Logout -> Paste Protected Dashboard URL
    // -------------------------------------------------------------------------
    console.log("\n>>> [TEST 3] Logout -> Paste Protected Dashboard URL");
    {
        const mockStorage = new MockStorage();
        const validToken = jwt.sign(
            { id: "admin_user_001", role: "super_admin", jti: `test3_${Date.now()}` },
            TEST_SECRET,
            { expiresIn: "2h" }
        );
        mockStorage.setItem("token", validToken);
        mockStorage.setItem("user", JSON.stringify({ id: "admin_user_001", email: "admin@college.erp" }));
        mockStorage.setItem("isLoggedIn", "true");

        let logoutRedirected = null;
        let backendLogoutCalled = false;
        const mockWindow = {
            location: {
                pathname: "/pages/dashboard/dashboard.html",
                replace: (url) => { logoutRedirected = url; }
            },
            authAPI: {
                logout: async () => { backendLogoutCalled = true; return { success: true }; },
                getMe: async () => ({ success: false, message: "Session expired" })
            }
        };

        global.localStorage = mockStorage;
        global.window = mockWindow;

        // Perform logout
        await authGuard.logout();

        logCheck(
            "[TEST 3] Logout revokes session on backend and purges all storage keys",
            backendLogoutCalled === true && mockStorage.getItem("token") === null && mockStorage.getItem("isLoggedIn") === null,
            `backendLogoutCalled: ${backendLogoutCalled}, token: ${mockStorage.getItem("token")}`
        );

        // Now attempt direct Dashboard access post-logout
        let postLogoutRedirect = null;
        mockWindow.location.replace = (url) => { postLogoutRedirect = url; };

        const mockDoc = new MockDocument();
        const styleElement = new MockElement("auth-guard-css", {
            removeChild: (el) => { delete mockDoc.elements[el.id]; }
        });
        mockDoc.elements["auth-guard-css"] = styleElement;
        mockDoc.body.style.display = "none";
        mockDoc.body.style.visibility = "hidden";
        global.document = mockDoc;

        const postLogoutResult = await authGuard.requireAuth();

        logCheck(
            "[TEST 3] Post-logout direct Dashboard access is strictly denied",
            postLogoutResult === false && postLogoutRedirect === "/pages/login/login.html",
            `requireAuth: ${postLogoutResult}, redirectedTo: ${postLogoutRedirect}`
        );

        logCheck(
            "[TEST 3] Post-logout protected content remains completely hidden",
            mockDoc.getElementById("auth-guard-css") !== null && mockDoc.body.style.display === "none",
            `auth-guard-css preserved: ${!!mockDoc.getElementById("auth-guard-css")}`
        );
    }

    // -------------------------------------------------------------------------
    // TEST 4: Open Dashboard in New Tab / Session Without Logging In
    // -------------------------------------------------------------------------
    console.log("\n>>> [TEST 4] Open Dashboard in New Tab / Session Without Logging In");
    {
        const mockStorage = new MockStorage(); // Fresh tab with no auth state
        let redirectedTo = null;
        const mockWindow = {
            location: {
                pathname: "/dashboard",
                replace: (url) => { redirectedTo = url; }
            }
        };

        const mockDoc = new MockDocument();
        const styleElement = new MockElement("auth-guard-css", {
            removeChild: (el) => { delete mockDoc.elements[el.id]; }
        });
        mockDoc.elements["auth-guard-css"] = styleElement;
        mockDoc.body.style.display = "none";
        mockDoc.body.style.visibility = "hidden";

        global.localStorage = mockStorage;
        global.window = mockWindow;
        global.document = mockDoc;

        const result = await authGuard.requireAuth();

        logCheck(
            "[TEST 4] New unauthenticated tab accessing /dashboard is redirected to login",
            result === false && redirectedTo === "/pages/login/login.html",
            `requireAuth: ${result}, redirectedTo: ${redirectedTo}`
        );

        logCheck(
            "[TEST 4] New tab preserves content hiding style (body never exposed)",
            mockDoc.getElementById("auth-guard-css") !== null && mockDoc.body.style.display === "none",
            `auth-guard-css exists: ${!!mockDoc.getElementById("auth-guard-css")}`
        );
    }

    console.log("\n================================================================================");
    console.log(`  DIRECT URL AUTHENTICATION SUITE RESULTS: ${checksPassed}/${checksPassed + checksFailed} PASSED (${((checksPassed / (checksPassed + checksFailed)) * 100).toFixed(1)}%)`);
    console.log("================================================================================\n");

    if (checksFailed > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    runDirectUrlTests().catch(err => {
        console.error("Test execution failed:", err);
        process.exit(1);
    });
}

module.exports = { runDirectUrlTests };
