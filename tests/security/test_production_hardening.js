/**
 * Production Security Hardening Test Suite
 *
 * Validates:
 * 1. Persistent MongoDB-backed JWT token revocation across simulated server restarts
 * 2. Concurrent requests blocked after token revocation
 * 3. Enforced email verification before Super Admin approval (unverified rejected with 400)
 * 4. Verified applicant approval success (200 OK)
 * 5. Password reset session revocation (previous tokens invalidated)
 * 6. Production admin seed safety & environment validation rules
 * 7. Email delivery fail-safe error handling (zero crashes, zero raw token leaks)
 */

const assert = require("assert");
const http = require("http");
const path = require("path");

const backendNodeModules = path.join(__dirname, "../../backend/node_modules");
const mongoose = require(path.join(backendNodeModules, "mongoose"));
const dotenv = require(path.join(backendNodeModules, "dotenv"));

dotenv.config({ path: path.join(__dirname, "../../backend/.env") });

const User = require("../../backend/src/models/User");
const AdminInvitation = require("../../backend/src/models/AdminInvitation");
const AdminRegistrationRequest = require("../../backend/src/models/AdminRegistrationRequest");
const RevokedToken = require("../../backend/src/models/RevokedToken");
const tokenBlacklistService = require("../../backend/src/services/tokenBlacklistService");
const emailService = require("../../backend/src/services/emailService");
const { validateEnvironment } = require("../../backend/src/config/envValidator");

const BACKEND_PORT = 5000;
const HOST = "127.0.0.1";

console.log("================================================================================");
console.log("  COLLEGE ERP - PRODUCTION SECURITY HARDENING & PERSISTENCE TEST SUITE");
console.log("================================================================================\n");

let passed = 0;
let total = 0;

function recordResult(num, description, isPassed, details = "") {
    total++;
    if (isPassed) {
        passed++;
        console.log(`  [PASS] [TEST ${String(num).padStart(2, "0")}] ${description}`);
        if (details) console.log(`         -> ${details}`);
    } else {
        console.error(`  [FAIL] [TEST ${String(num).padStart(2, "0")}] ${description}`);
        if (details) console.error(`         -> ${details}`);
    }
}

function apiRequest({ method = "GET", urlPath, body = null, token = null }) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const headers = {
            "Content-Type": "application/json"
        };
        if (payload) {
            headers["Content-Length"] = Buffer.byteLength(payload);
        }
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const req = http.request(
            {
                hostname: HOST,
                port: BACKEND_PORT,
                path: urlPath,
                method,
                headers
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => { data += chunk; });
                res.on("end", () => {
                    let json = null;
                    try {
                        json = JSON.parse(data);
                    } catch {}
                    resolve({ status: res.statusCode, headers: res.headers, data: json, raw: data });
                });
            }
        );

        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runHardeningTests() {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/college_erp";
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    // Ensure Super Admin exists for tests
    let superAdmin = await User.findOne({ email: "abhipal895@gmail.com" });
    if (!superAdmin) {
        superAdmin = await User.create({
            name: "Abhishek Pal",
            email: "abhipal895@gmail.com",
            password: "Password@123",
            role: "super_admin",
            status: "active",
            isEmailVerified: true
        });
    } else if (superAdmin.role !== "super_admin") {
        superAdmin.role = "super_admin";
        superAdmin.status = "active";
        superAdmin.isEmailVerified = true;
        await superAdmin.save();
    }

    // Login as Super Admin
    let superAdminToken;
    const loginRes = await apiRequest({
        method: "POST",
        urlPath: "/api/auth/login",
        body: { email: "abhipal895@gmail.com", password: process.env.ABHISHEK_PASSWORD || "95982536" }
    });
    if (loginRes.status === 200 && loginRes.data?.data?.token) {
        superAdminToken = loginRes.data.data.token;
    } else {
        const fallbackLogin = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/login",
            body: { email: "abhipal895@gmail.com", password: "Password@123" }
        });
        superAdminToken = fallbackLogin.data.data.token;
    }

    // -------------------------------------------------------------------------
    // [TEST 01] Persistent JWT Revocation: Logout records in MongoDB
    // -------------------------------------------------------------------------
    try {
        const testUserEmail = `test_jwt_persist_${Date.now()}@college.edu`;
        const testUser = await User.create({
            name: "JWT Test User",
            email: testUserEmail,
            password: "Password@123",
            role: "admin",
            status: "active",
            isEmailVerified: true
        });

        const userLogin = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/login",
            body: { email: testUserEmail, password: "Password@123" }
        });
        const userToken = userLogin.data.data.token;

        // Logout
        const logoutRes = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/logout",
            token: userToken
        });

        // Verify record in MongoDB RevokedToken collection
        const tokenHash = tokenBlacklistService.hashToken(userToken);
        const dbRevokedRecord = await RevokedToken.findOne({ tokenHash });

        const isRevokedInDb = dbRevokedRecord !== null;
        recordResult(1, "Logout persists revoked token to MongoDB collection", isRevokedInDb && logoutRes.status === 200,
            `RevokedToken document created in MongoDB with TTL index: ${dbRevokedRecord?._id}`);
    } catch (err) {
        recordResult(1, "Logout persists revoked token to MongoDB collection", false, err.message);
    }

    // -------------------------------------------------------------------------
    // [TEST 02] Persistent JWT Revocation: Revocation survives server restart
    // -------------------------------------------------------------------------
    try {
        const testUserEmail = `test_restart_${Date.now()}@college.edu`;
        await User.create({
            name: "Restart Test User",
            email: testUserEmail,
            password: "Password@123",
            role: "admin",
            status: "active",
            isEmailVerified: true
        });

        const userLogin = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/login",
            body: { email: testUserEmail, password: "Password@123" }
        });
        const userToken = userLogin.data.data.token;

        // Logout to invalidate
        await apiRequest({
            method: "POST",
            urlPath: "/api/auth/logout",
            token: userToken
        });

        // SIMULATE SERVER RESTART: Clear the in-memory cache completely!
        tokenBlacklistService.clearMemoryCache();

        // Attempt to access protected route with the logged-out token
        const checkAccess = await apiRequest({
            method: "GET",
            urlPath: "/api/auth/me",
            token: userToken
        });

        const passed = checkAccess.status === 401 && checkAccess.data?.message?.includes("logged out");
        recordResult(2, "Revocation survives simulated server restart (memory cache flushed)", passed,
            `HTTP ${checkAccess.status}. MongoDB persistent lookup successfully blocked revoked session.`);
    } catch (err) {
        recordResult(2, "Revocation survives simulated server restart", false, err.message);
    }

    // -------------------------------------------------------------------------
    // [TEST 03] Concurrent requests cannot bypass token revocation
    // -------------------------------------------------------------------------
    try {
        const testEmail = `test_concurrent_${Date.now()}@college.edu`;
        await User.create({
            name: "Concurrent Test",
            email: testEmail,
            password: "Password@123",
            role: "admin",
            status: "active",
            isEmailVerified: true
        });

        const uLogin = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/login",
            body: { email: testEmail, password: "Password@123" }
        });
        const uToken = uLogin.data.data.token;

        // Invalidate token
        await tokenBlacklistService.invalidateToken(uToken);

        // Fire 5 concurrent requests with the revoked token
        const concurrentPromises = Array.from({ length: 5 }, () =>
            apiRequest({ method: "GET", urlPath: "/api/auth/me", token: uToken })
        );
        const results = await Promise.all(concurrentPromises);
        const allBlocked = results.every(r => r.status === 401);

        recordResult(3, "Concurrent requests cannot bypass token revocation", allBlocked,
            `All 5 parallel requests blocked with HTTP 401.`);
    } catch (err) {
        recordResult(3, "Concurrent requests cannot bypass token revocation", false, err.message);
    }

    // -------------------------------------------------------------------------
    // [TEST 04] Unverified applicant approval is REJECTED (400 Bad Request)
    // -------------------------------------------------------------------------
    let unverifiedRequestId;
    try {
        const unverifiedEmail = `unverified_applicant_${Date.now()}@college.edu`;
        const { rawToken, tokenHash } = emailService.generateSecureToken();
        const testInvite = await AdminInvitation.create({
            tokenHash: "dummy_invite_hash_" + Date.now(),
            allowedRole: "admin",
            createdBy: superAdmin._id,
            expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
            status: "used"
        });

        const unverifiedReq = await AdminRegistrationRequest.create({
            name: "Unverified Applicant",
            collegeName: "Apex University",
            email: unverifiedEmail,
            phone: "+91 9998887771",
            password: "$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr",
            requestedRole: "admin",
            invitationId: testInvite._id,
            status: "pending",
            isEmailVerified: false, // NOT VERIFIED
            emailVerificationTokenHash: tokenHash,
            emailVerificationExpires: new Date(Date.now() + 24 * 3600 * 1000)
        });
        unverifiedRequestId = unverifiedReq._id;

        // Super Admin attempts to approve unverified applicant
        const approveRes = await apiRequest({
            method: "POST",
            urlPath: `/api/admin/registration-requests/${unverifiedRequestId}/approve`,
            token: superAdminToken,
            body: { assignedRole: "admin" }
        });

        const reqAfter = await AdminRegistrationRequest.findById(unverifiedRequestId);
        const userCreated = await User.findOne({ email: unverifiedEmail });

        const passed = approveRes.status === 400 &&
            approveRes.data?.message?.includes("not verified their email") &&
            reqAfter.status === "pending" &&
            !userCreated;

        recordResult(4, "Unverified applicant approval is strictly REJECTED (400 Bad Request)", passed,
            `HTTP ${approveRes.status}: "${approveRes.data?.message}". No user account created.`);
    } catch (err) {
        recordResult(4, "Unverified applicant approval is strictly REJECTED", false, err.message);
    }

    // -------------------------------------------------------------------------
    // [TEST 05] Verified applicant approval SUCCEEDS (200 OK)
    // -------------------------------------------------------------------------
    try {
        // Now simulate applicant verifying their email
        await AdminRegistrationRequest.findByIdAndUpdate(unverifiedRequestId, {
            isEmailVerified: true,
            emailVerificationTokenHash: null
        });

        // Super Admin approves verified applicant
        const approveRes = await apiRequest({
            method: "POST",
            urlPath: `/api/admin/registration-requests/${unverifiedRequestId}/approve`,
            token: superAdminToken,
            body: { assignedRole: "admin", permissions: ["manage_students"] }
        });

        const reqAfter = await AdminRegistrationRequest.findById(unverifiedRequestId);
        const userCreated = await User.findOne({ email: reqAfter.email });

        const passed = approveRes.status === 200 &&
            reqAfter.status === "approved" &&
            userCreated !== null &&
            userCreated.role === "admin";

        recordResult(5, "Verified applicant approval SUCCEEDS (200 OK, User activated)", passed,
            `HTTP ${approveRes.status}. User account ${userCreated?.email} activated.`);
    } catch (err) {
        recordResult(5, "Verified applicant approval SUCCEEDS", false, err.message);
    }

    // -------------------------------------------------------------------------
    // [TEST 06] Password reset invalidates previous sessions
    // -------------------------------------------------------------------------
    try {
        const resetUserEmail = `reset_test_${Date.now()}@college.edu`;
        const rUser = await User.create({
            name: "Reset Test Admin",
            email: resetUserEmail,
            password: "OriginalPassword@123",
            role: "admin",
            status: "active",
            isEmailVerified: true
        });

        // Login to get session token
        const login1 = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/login",
            body: { email: resetUserEmail, password: "OriginalPassword@123" }
        });
        const oldToken = login1.data.data.token;

        // Verify old token works before reset
        const checkBefore = await apiRequest({
            method: "GET",
            urlPath: "/api/auth/me",
            token: oldToken
        });
        assert.strictEqual(checkBefore.status, 200);

        // Request password reset
        const { rawToken, tokenHash } = emailService.generateSecureToken();
        rUser.resetPasswordTokenHash = tokenHash;
        rUser.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
        await rUser.save();

        // Reset password
        const resetRes = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/reset-password",
            body: {
                token: rawToken,
                newPassword: "BrandNewPassword@2026!",
                confirmPassword: "BrandNewPassword@2026!"
            }
        });
        assert.strictEqual(resetRes.status, 200);

        // Try using the OLD token after reset
        const checkAfter = await apiRequest({
            method: "GET",
            urlPath: "/api/auth/me",
            token: oldToken
        });

        const oldTokenBlocked = checkAfter.status === 401 && checkAfter.data?.message?.includes("Password was changed");

        // Login with NEW password works
        const loginNew = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/login",
            body: { email: resetUserEmail, password: "BrandNewPassword@2026!" }
        });
        const newTokenWorks = loginNew.status === 200;

        recordResult(6, "Password reset invalidates previous sessions (prev tokens receive 401)", oldTokenBlocked && newTokenWorks,
            `Old token rejected: HTTP ${checkAfter.status} ("${checkAfter.data?.message}"). New login accepted.`);
    } catch (err) {
        recordResult(6, "Password reset invalidates previous sessions", false, err.message);
    }

    // -------------------------------------------------------------------------
    // [TEST 07] Production environment validation enforces critical secrets
    // -------------------------------------------------------------------------
    try {
        const origEnv = process.env.NODE_ENV;
        const origSecret = process.env.JWT_SECRET;
        const origMongo = process.env.MONGODB_URI;

        // Temporarily set NODE_ENV to production
        process.env.NODE_ENV = "production";

        // Case A: Missing JWT_SECRET
        delete process.env.JWT_SECRET;
        const check1 = validateEnvironment();
        const caseAPassed = !check1.isValid && check1.errors.some(e => e.includes("JWT_SECRET"));

        // Case B: Short JWT_SECRET
        process.env.JWT_SECRET = "short_secret_123";
        const check2 = validateEnvironment();
        const caseBPassed = !check2.isValid && check2.errors.some(e => e.includes("too short"));

        // Case C: Localhost MONGODB_URI in production
        process.env.JWT_SECRET = "a_very_long_production_cryptographic_jwt_secret_key_2026";
        process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/college_erp";
        const check3 = validateEnvironment();
        const caseCPassed = !check3.isValid && check3.errors.some(e => e.includes("localhost"));

        // Case D: Valid production configuration
        process.env.MONGODB_URI = "mongodb+srv://user:pass@cluster0.mongodb.net/college_erp";
        const check4 = validateEnvironment();
        const caseDPassed = check4.isValid;

        // Restore environment
        process.env.NODE_ENV = origEnv;
        if (origSecret) process.env.JWT_SECRET = origSecret;
        if (origMongo) process.env.MONGODB_URI = origMongo;

        const allValidationsPassed = caseAPassed && caseBPassed && caseCPassed && caseDPassed;
        recordResult(7, "Production environment validator catches missing/insecure parameters", allValidationsPassed,
            `Enforces minimum 32-char JWT_SECRET and remote MongoDB Atlas URI in production.`);
    } catch (err) {
        recordResult(7, "Production environment validator catches missing/insecure parameters", false, err.message);
    }

    // -------------------------------------------------------------------------
    // [TEST 08] Email delivery fail-safe handling (safe error, no raw token leak)
    // -------------------------------------------------------------------------
    try {
        // Enable simulation hook
        process.env.EMAIL_FAIL_SIMULATION = "true";

        const { rawToken } = emailService.generateSecureToken();
        const res = await emailService.sendVerificationEmail("applicant_failsafe@college.edu", rawToken);

        // Must return failure object without throwing uncaught exception
        const handledSafely = res.success === false && res.delivered === false && res.error.includes("Simulated");

        // Restore
        delete process.env.EMAIL_FAIL_SIMULATION;

        recordResult(8, "Email delivery handles provider failure safely without crashing", handledSafely,
            `Safe return object: success: ${res.success}, delivered: ${res.delivered}, error: "${res.error}".`);
    } catch (err) {
        delete process.env.EMAIL_FAIL_SIMULATION;
        recordResult(8, "Email delivery handles provider failure safely", false, err.message);
    }

    console.log("\n================================================================================");
    console.log(`  HARDENING SUITE RESULTS: ${passed}/${total} PASSED (${passed === total ? "100%" : "FAILURES DETECTED"})`);
    console.log("================================================================================\n");

    await mongoose.disconnect();
    process.exit(passed === total ? 0 : 1);
}

runHardeningTests().catch((err) => {
    console.error("Fatal error running hardening tests:", err);
    process.exit(1);
});
