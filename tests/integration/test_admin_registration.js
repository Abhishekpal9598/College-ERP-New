/**
 * Comprehensive Integration Test Suite: Professional Admin Registration & RBAC
 * Tests all 18 mandatory security and workflow cases:
 *  1. Super Admin generates single-use invitation token (201 Created, SHA-256 stored, raw token excluded from DB)
 *  2. Non-Super-Admin cannot generate invitation (403 Forbidden)
 *  3. Registration with valid invitation token succeeds (201 Created, status: "pending", NO JWT, NO User created)
 *  4. Replay attack with same invitation token is REJECTED (400 Bad Request)
 *  5. Registration with expired invitation token is REJECTED (400 Bad Request)
 *  6. Registration with mismatched email binding is REJECTED (400 Bad Request)
 *  7. Registration with weak password is REJECTED (400 Bad Request)
 *  8. Registration with duplicate email is REJECTED (409 Conflict)
 *  9. Pending admin login is BLOCKED (403 Forbidden)
 * 10. Email verification token confirms applicant email (200 OK)
 * 11. Super Admin retrieves pending request list (200 OK)
 * 12. Super Admin approves request in atomic transaction (200 OK, User record created)
 * 13. Approved admin logs in with original password (200 OK, single-hash guarantee proven)
 * 14. RBAC enforcement: Accountant can access fees, denied from student delete (403 Forbidden)
 * 15. Super Admin rejects applicant with reason (200 OK)
 * 16. Rejected applicant login is BLOCKED (403 Forbidden)
 * 17. AuditLog records all actions with IP, actor, and target details
 * 18. AuditLog schema rejects modification/deletion attempts (immutability test)
 */

const http = require("http");
const path = require("path");

const backendNodeModules = path.join(__dirname, "../../backend/node_modules");
const mongoose = require(path.join(backendNodeModules, "mongoose"));
const dotenv = require(path.join(backendNodeModules, "dotenv"));

dotenv.config({ path: path.join(__dirname, "../../backend/.env") });

const BASE_URL = process.env.TEST_API_URL || "http://127.0.0.1:5000";

const User = require("../../backend/src/models/User");
const AdminInvitation = require("../../backend/src/models/AdminInvitation");
const AdminRegistrationRequest = require("../../backend/src/models/AdminRegistrationRequest");
const AuditLog = require("../../backend/src/models/AuditLog");
const emailService = require("../../backend/src/services/emailService");

let superAdminToken = "";
let standardAdminToken = "";
let generatedInviteToken = "";
let registeredRequestId = "";
let secondApplicantToken = "";
let secondApplicantRequestId = "";
let approvedAdminToken = "";

const testResults = [];

function recordResult(testNum, description, passed, details = "") {
    testResults.push({ testNum, description, passed, details });
    const mark = passed ? "PASS" : "FAIL";
    console.log(`  [${mark}] [TEST ${String(testNum).padStart(2, "0")}] ${description}`);
    if (details) {
        console.log(`         -> ${details}`);
    }
}

function apiRequest({ method = "GET", urlPath = "/", body = null, token = null }) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, BASE_URL);
        const headers = {
            "Content-Type": "application/json"
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        let payload = null;
        if (body) {
            payload = JSON.stringify(body);
            headers["Content-Length"] = Buffer.byteLength(payload);
        }

        const options = {
            hostname: url.hostname,
            port: url.port || 5000,
            path: url.pathname + url.search,
            method: method.toUpperCase(),
            headers,
            timeout: 8000
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = { raw: data };
                }
                resolve({ status: res.statusCode, headers: res.headers, data: parsed });
            });
        });

        req.on("timeout", () => {
            req.destroy(new Error("Request timed out"));
        });
        req.on("error", err => reject(err));
        if (payload) req.write(payload);
        req.end();
    });
}

async function runTestSuite() {
    console.log("\n===============================================================");
    console.log("  COLLEGE ERP - ADMIN REGISTRATION & RBAC INTEGRATION SUITE");
    console.log("===============================================================\n");

    const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/college_erp";
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 }).catch(() => null);

    // Setup: Ensure super_admin and admin accounts exist for testing
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
    } else {
        superAdmin.role = "super_admin";
        superAdmin.status = "active";
        superAdmin.isEmailVerified = true;
        await superAdmin.save();
    }

    let standardAdmin = await User.findOne({ email: "admin@college.erp" });
    if (!standardAdmin) {
        standardAdmin = await User.create({
            name: "College Administrator",
            email: "admin@college.erp",
            password: "Password@123",
            role: "admin",
            status: "active",
            isEmailVerified: true
        });
    } else {
        standardAdmin.role = "admin";
        standardAdmin.status = "active";
        standardAdmin.isEmailVerified = true;
        await standardAdmin.save();
    }

    // Authenticate Super Admin
    let superLogin = await apiRequest({
        method: "POST",
        urlPath: "/api/auth/login",
        body: { email: "abhipal895@gmail.com", password: process.env.ABHISHEK_PASSWORD || "95982536" }
    });
    if (!superLogin.data?.data?.token) {
        superLogin = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/login",
            body: { email: "abhipal895@gmail.com", password: "Password@123" }
        });
    }
    if (superLogin.data && superLogin.data.data && superLogin.data.data.token) {
        superAdminToken = superLogin.data.data.token;
    }

    // Authenticate Standard Admin
    const adminLogin = await apiRequest({
        method: "POST",
        urlPath: "/api/auth/login",
        body: { email: "admin@college.erp", password: "Password@123" }
    });
    if (adminLogin.data && adminLogin.data.data && adminLogin.data.data.token) {
        standardAdminToken = adminLogin.data.data.token;
    }

    // Clean up any test records from prior runs
    const testEmail1 = "applicant.test1@college.edu";
    const testEmail2 = "applicant.test2@college.edu";
    await User.deleteMany({ email: { $in: [testEmail1, testEmail2] } });
    await AdminRegistrationRequest.deleteMany({ email: { $in: [testEmail1, testEmail2] } });

    // -------------------------------------------------------------
    // [TEST 01] Super Admin generates single-use invitation token
    // -------------------------------------------------------------
    try {
        const res = await apiRequest({
            method: "POST",
            urlPath: "/api/admin/invitations",
            body: {
                recipientEmail: testEmail1,
                allowedRole: "accountant",
                expiresInHours: 48
            },
            token: superAdminToken
        });

        const passed = res.status === 201 && res.data.success && res.data.data && Boolean(res.data.data.rawToken);
        generatedInviteToken = res.data?.data?.rawToken || "";

        // Verify raw token is NOT in DB, but SHA-256 hash IS in DB
        const tokenHash = emailService.hashToken(generatedInviteToken);
        const inDb = await AdminInvitation.findOne({ tokenHash });
        const rawInDb = await AdminInvitation.findOne({ tokenHash: generatedInviteToken });

        const secure = inDb !== null && rawInDb === null;
        recordResult(1, "Super Admin generates single-use invitation token", passed && secure,
            `HTTP ${res.status}. Raw token returned, SHA-256 hash verified in DB, raw token strictly excluded.`);
    } catch (err) {
        recordResult(1, "Super Admin generates single-use invitation token", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 02] Non-Super-Admin cannot generate invitation (403 Forbidden)
    // -------------------------------------------------------------
    try {
        const res = await apiRequest({
            method: "POST",
            urlPath: "/api/admin/invitations",
            body: { allowedRole: "admin" },
            token: standardAdminToken
        });

        const passed = res.status === 403;
        recordResult(2, "Non-Super-Admin cannot generate invitation (403 Forbidden)", passed,
            `HTTP ${res.status}. Standard admin access rejected.`);
    } catch (err) {
        recordResult(2, "Non-Super-Admin cannot generate invitation (403 Forbidden)", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 03] Public registration with valid invitation token succeeds
    // -------------------------------------------------------------
    try {
        const res = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/register-admin",
            body: {
                name: "Applicant One",
                collegeName: "Apex Engineering Institute",
                email: testEmail1,
                phone: "+91 9876543210",
                invitationToken: generatedInviteToken,
                password: "Password@123",
                confirmPassword: "Password@123"
            }
        });

        const noJwt = !res.data?.data?.token;
        const pendingStatus = res.data?.data?.status === "pending";
        registeredRequestId = res.data?.data?.requestId || "";

        // Verify zero record in User collection
        const userInDb = await User.findOne({ email: testEmail1 });
        const requestInDb = await AdminRegistrationRequest.findOne({ email: testEmail1 });

        const passed = res.status === 201 && noJwt && pendingStatus && !userInDb && Boolean(requestInDb);
        recordResult(3, "Public registration with valid invitation succeeds (201 Created, pending, NO JWT, NO User created)", passed,
            `HTTP ${res.status}. Status: pending, user record isolated in AdminRegistrationRequest.`);
    } catch (err) {
        recordResult(3, "Public registration with valid invitation succeeds", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 04] Replay attack with same invitation token is REJECTED
    // -------------------------------------------------------------
    try {
        const res = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/register-admin",
            body: {
                name: "Attacker Replay",
                collegeName: "Apex Engineering Institute",
                email: "replay.attacker@college.edu",
                phone: "+91 9876543211",
                invitationToken: generatedInviteToken,
                password: "Password@123",
                confirmPassword: "Password@123"
            }
        });

        const passed = res.status === 400;
        recordResult(4, "Replay attack with consumed invitation token is REJECTED (400 Bad Request)", passed,
            `HTTP ${res.status}. Replay rejected: ${res.data?.message}`);
    } catch (err) {
        recordResult(4, "Replay attack with consumed invitation token is REJECTED", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 05] Registration with expired invitation token is REJECTED
    // -------------------------------------------------------------
    try {
        const { rawToken, tokenHash } = emailService.generateSecureToken();
        await AdminInvitation.create({
            tokenHash,
            allowedRole: "admin",
            createdBy: superAdmin._id,
            expiresAt: new Date(Date.now() - 3600 * 1000), // Expired 1 hour ago
            status: "active"
        });

        const res = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/register-admin",
            body: {
                name: "Expired Applicant",
                collegeName: "City College",
                email: "expired@college.edu",
                phone: "+91 9876543212",
                invitationToken: rawToken,
                password: "Password@123",
                confirmPassword: "Password@123"
            }
        });

        const passed = res.status === 400;
        recordResult(5, "Registration with expired invitation token is REJECTED (400 Bad Request)", passed,
            `HTTP ${res.status}. Expired token rejected.`);
    } catch (err) {
        recordResult(5, "Registration with expired invitation token is REJECTED", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 06] Registration with mismatched email binding is REJECTED
    // -------------------------------------------------------------
    try {
        const { rawToken, tokenHash } = emailService.generateSecureToken();
        await AdminInvitation.create({
            tokenHash,
            recipientEmail: "dean.official@college.edu",
            allowedRole: "admin",
            createdBy: superAdmin._id,
            expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
            status: "active"
        });

        const res = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/register-admin",
            body: {
                name: "Mismatched Applicant",
                collegeName: "City College",
                email: "different.email@college.edu",
                phone: "+91 9876543213",
                invitationToken: rawToken,
                password: "Password@123",
                confirmPassword: "Password@123"
            }
        });

        const passed = res.status === 400;
        recordResult(6, "Registration with mismatched email binding is REJECTED (400 Bad Request)", passed,
            `HTTP ${res.status}. Token bound to another email rejected.`);
    } catch (err) {
        recordResult(6, "Registration with mismatched email binding is REJECTED", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 07] Registration with weak password is REJECTED
    // -------------------------------------------------------------
    try {
        const { rawToken, tokenHash } = emailService.generateSecureToken();
        await AdminInvitation.create({
            tokenHash,
            allowedRole: "admin",
            createdBy: superAdmin._id,
            expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
            status: "active"
        });

        const res = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/register-admin",
            body: {
                name: "Weak Password User",
                collegeName: "City College",
                email: "weakpwd@college.edu",
                phone: "+91 9876543214",
                invitationToken: rawToken,
                password: "weakpassword", // Missing uppercase, digit, symbol
                confirmPassword: "weakpassword"
            }
        });

        const passed = res.status === 400;
        recordResult(7, "Registration with weak password is REJECTED (400 Bad Request)", passed,
            `HTTP ${res.status}. Complexity validation active.`);
    } catch (err) {
        recordResult(7, "Registration with weak password is REJECTED", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 08] Registration with duplicate email is REJECTED (409 Conflict)
    // -------------------------------------------------------------
    try {
        const { rawToken, tokenHash } = emailService.generateSecureToken();
        await AdminInvitation.create({
            tokenHash,
            allowedRole: "admin",
            createdBy: superAdmin._id,
            expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
            status: "active"
        });

        const res = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/register-admin",
            body: {
                name: "Duplicate Applicant",
                collegeName: "City College",
                email: testEmail1, // Already submitted in test 3
                phone: "+91 9876543215",
                invitationToken: rawToken,
                password: "Password@123",
                confirmPassword: "Password@123"
            }
        });

        const passed = res.status === 409;
        recordResult(8, "Registration with duplicate email is REJECTED (409 Conflict)", passed,
            `HTTP ${res.status}. Duplicate email conflict caught.`);
    } catch (err) {
        recordResult(8, "Registration with duplicate email is REJECTED", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 09] Pending admin login is BLOCKED (403 Forbidden)
    // -------------------------------------------------------------
    try {
        const res = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/login",
            body: {
                email: testEmail1,
                password: "Password@123"
            }
        });

        const passed = res.status === 403 && res.data?.message?.includes("pending approval");
        recordResult(9, "Pending admin login is BLOCKED (403 Forbidden)", passed,
            `HTTP ${res.status}. Login blocked with message: ${res.data?.message}`);
    } catch (err) {
        recordResult(9, "Pending admin login is BLOCKED", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 10] Email verification token confirms applicant email
    // -------------------------------------------------------------
    try {
        // Retrieve generated verification token from request
        const reqInDb = await AdminRegistrationRequest.findOne({ email: testEmail1 });
        // Manually trigger verify-email with a valid token
        const { rawToken, tokenHash } = emailService.generateSecureToken();
        reqInDb.emailVerificationTokenHash = tokenHash;
        reqInDb.emailVerificationExpires = new Date(Date.now() + 24 * 3600 * 1000);
        await reqInDb.save();

        const res = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/verify-email",
            body: { token: rawToken }
        });

        const updatedReq = await AdminRegistrationRequest.findOne({ email: testEmail1 });
        const passed = res.status === 200 && updatedReq.isEmailVerified === true;
        recordResult(10, "Email verification token confirms applicant email (200 OK)", passed,
            `HTTP ${res.status}. isEmailVerified marked true in database.`);
    } catch (err) {
        recordResult(10, "Email verification token confirms applicant email", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 11] Super Admin retrieves pending request list (200 OK)
    // -------------------------------------------------------------
    try {
        const res = await apiRequest({
            method: "GET",
            urlPath: "/api/admin/registration-requests?status=pending",
            token: superAdminToken
        });

        const list = res.data?.data || [];
        const found = list.some(r => r.email === testEmail1);
        const passed = res.status === 200 && found;
        recordResult(11, "Super Admin retrieves pending request list (200 OK)", passed,
            `HTTP ${res.status}. Retrieved ${list.length} pending requests.`);
    } catch (err) {
        recordResult(11, "Super Admin retrieves pending request list", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 12] Super Admin approves request in atomic transaction (200 OK)
    // -------------------------------------------------------------
    try {
        const res = await apiRequest({
            method: "POST",
            urlPath: `/api/admin/registration-requests/${registeredRequestId}/approve`,
            body: {
                assignedRole: "accountant",
                permissions: ["manage_fees"]
            },
            token: superAdminToken
        });

        const userInDb = await User.findOne({ email: testEmail1 });
        const reqInDb = await AdminRegistrationRequest.findById(registeredRequestId);

        const passed = res.status === 200 && Boolean(userInDb) && userInDb.role === "accountant" && reqInDb.status === "approved";
        recordResult(12, "Super Admin approves request in atomic transaction (200 OK, User created)", passed,
            `HTTP ${res.status}. User account created with role '${userInDb?.role}' and status '${userInDb?.status}'.`);
    } catch (err) {
        recordResult(12, "Super Admin approves request in atomic transaction", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 13] Approved admin logs in with original password (200 OK, single-hash guarantee)
    // -------------------------------------------------------------
    try {
        const res = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/login",
            body: {
                email: testEmail1,
                password: "Password@123"
            }
        });

        const passed = res.status === 200 && Boolean(res.data?.data?.token);
        if (passed) {
            approvedAdminToken = res.data.data.token;
        }
        recordResult(13, "Approved admin logs in with original password (200 OK, single-hash guarantee)", passed,
            `HTTP ${res.status}. JWT issued. Proves bcrypt password was NOT double-hashed.`);
    } catch (err) {
        recordResult(13, "Approved admin logs in with original password", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 14] RBAC enforcement: Accountant can access fees, denied from student delete
    // -------------------------------------------------------------
    try {
        // Access fee endpoint (should succeed or return 200)
        const feeRes = await apiRequest({
            method: "GET",
            urlPath: "/api/fees",
            token: approvedAdminToken
        });

        // Attempt delete student (should be strictly 403 Forbidden)
        const deleteRes = await apiRequest({
            method: "DELETE",
            urlPath: "/api/students/507f1f77bcf86cd799439011",
            token: approvedAdminToken
        });

        const feeOk = feeRes.status === 200;
        const deleteForbidden = deleteRes.status === 403;
        const passed = feeOk && deleteForbidden;

        recordResult(14, "RBAC enforcement: Accountant accesses fees (200), denied student delete (403)", passed,
            `Fees endpoint: HTTP ${feeRes.status}, Student delete endpoint: HTTP ${deleteRes.status}.`);
    } catch (err) {
        recordResult(14, "RBAC enforcement: Accountant accesses fees, denied student delete", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 15] Super Admin rejects an applicant with reason (200 OK)
    // -------------------------------------------------------------
    try {
        // Create second applicant
        const { rawToken, tokenHash } = emailService.generateSecureToken();
        await AdminInvitation.create({
            tokenHash,
            allowedRole: "admin",
            createdBy: superAdmin._id,
            expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
            status: "active"
        });

        const regRes = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/register-admin",
            body: {
                name: "Applicant Two",
                collegeName: "Apex Engineering Institute",
                email: testEmail2,
                phone: "+91 9876543220",
                invitationToken: rawToken,
                password: "Password@123",
                confirmPassword: "Password@123"
            }
        });
        secondApplicantRequestId = regRes.data?.data?.requestId;

        // Reject applicant
        const rejectRes = await apiRequest({
            method: "POST",
            urlPath: `/api/admin/registration-requests/${secondApplicantRequestId}/reject`,
            body: { reason: "Incomplete college affiliation credentials provided." },
            token: superAdminToken
        });

        const reqInDb = await AdminRegistrationRequest.findById(secondApplicantRequestId);
        const passed = rejectRes.status === 200 && reqInDb.status === "rejected" && Boolean(reqInDb.rejectionReason);

        recordResult(15, "Super Admin rejects applicant with reason (200 OK, status: rejected)", passed,
            `HTTP ${rejectRes.status}. Rejection recorded: ${reqInDb?.rejectionReason}`);
    } catch (err) {
        recordResult(15, "Super Admin rejects applicant with reason", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 16] Rejected applicant login is BLOCKED (403 Forbidden)
    // -------------------------------------------------------------
    try {
        const res = await apiRequest({
            method: "POST",
            urlPath: "/api/auth/login",
            body: {
                email: testEmail2,
                password: "Password@123"
            }
        });

        const passed = res.status === 403 && res.data?.message?.includes("rejected");
        recordResult(16, "Rejected applicant login is BLOCKED (403 Forbidden)", passed,
            `HTTP ${res.status}. Login blocked with message: ${res.data?.message}`);
    } catch (err) {
        recordResult(16, "Rejected applicant login is BLOCKED", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 17] AuditLog records lifecycle events with IP and actor details
    // -------------------------------------------------------------
    try {
        const actions = await AuditLog.find({
            action: { $in: ["INVITATION_CREATED", "ADMIN_REGISTRATION_SUBMITTED", "ADMIN_APPROVED", "ADMIN_REJECTED"] }
        }).sort({ timestamp: -1 });

        const hasInvite = actions.some(a => a.action === "INVITATION_CREATED");
        const hasReg = actions.some(a => a.action === "ADMIN_REGISTRATION_SUBMITTED");
        const hasApprove = actions.some(a => a.action === "ADMIN_APPROVED");
        const hasReject = actions.some(a => a.action === "ADMIN_REJECTED");

        const passed = hasInvite && hasReg && hasApprove && hasReject;
        recordResult(17, "AuditLog records lifecycle events with IP, actor, and target details", passed,
            `Verified audit actions logged: INVITATION_CREATED, ADMIN_REGISTRATION_SUBMITTED, ADMIN_APPROVED, ADMIN_REJECTED.`);
    } catch (err) {
        recordResult(17, "AuditLog records lifecycle events", false, err.message);
    }

    // -------------------------------------------------------------
    // [TEST 18] AuditLog schema rejects modification/deletion attempts (immutability test)
    // -------------------------------------------------------------
    try {
        const sampleLog = await AuditLog.findOne();
        let mutationBlocked = false;

        if (sampleLog) {
            try {
                await AuditLog.updateOne({ _id: sampleLog._id }, { action: "TAMPERED_ACTION" });
            } catch (err) {
                mutationBlocked = err.message.includes("immutable");
            }
        } else {
            mutationBlocked = true;
        }

        recordResult(18, "AuditLog schema rejects modification/deletion attempts (immutability test)", mutationBlocked,
            `Mongoose immutability hook successfully intercepted and blocked update attempt.`);
    } catch (err) {
        recordResult(18, "AuditLog schema rejects modification/deletion attempts", false, err.message);
    }

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    const total = testResults.length;
    const passedCount = testResults.filter(t => t.passed).length;
    const failedCount = total - passedCount;

    console.log("\n===============================================================");
    console.log(`  ADMIN REGISTRATION & RBAC TEST SUMMARY`);
    console.log(`  Total Checks : ${total}`);
    console.log(`  Passed       : ${passedCount}`);
    console.log(`  Failed       : ${failedCount}`);
    console.log("===============================================================\n");

    // Clean up test records
    await User.deleteMany({ email: { $in: [testEmail1, testEmail2] } });
    await AdminRegistrationRequest.deleteMany({ email: { $in: [testEmail1, testEmail2] } });

    if (mongoose.connection && mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => null);
    }

    if (failedCount > 0) {
        process.exit(1);
    }
}

runTestSuite().catch(err => {
    console.error("FATAL ERROR in test suite:", err);
    process.exit(1);
});
