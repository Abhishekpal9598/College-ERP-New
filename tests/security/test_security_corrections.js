const http = require("http");
const path = require("path");
const PROJECT_ROOT = path.join(__dirname, "../..");
const backendNodeModules = path.join(PROJECT_ROOT, "backend/node_modules");
const mongoose = require(path.join(backendNodeModules, "mongoose"));
const dotenv = require(path.join(backendNodeModules, "dotenv"));

dotenv.config({ path: path.join(PROJECT_ROOT, "backend/.env") });

const AdminInvitation = require(path.join(PROJECT_ROOT, "backend/src/models/AdminInvitation"));
const User = require(path.join(PROJECT_ROOT, "backend/src/models/User"));
const AdminRegistrationRequest = require(path.join(PROJECT_ROOT, "backend/src/models/AdminRegistrationRequest"));
const emailService = require(path.join(PROJECT_ROOT, "backend/src/services/emailService"));
const seedService = require(path.join(PROJECT_ROOT, "backend/src/services/seedService"));

function api(method, urlPath, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request({
            hostname: "127.0.0.1",
            port: 5000,
            path: urlPath,
            method,
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = "";
            res.on("data", c => data += c);
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}

async function runSecurityTests() {
    console.log("================================================================================");
    console.log("  CRITICAL SECURITY CORRECTIONS VALIDATION SUITE");
    console.log("================================================================================\n");

    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/college_erp");

    // Ensure superAdmin exists for creating invitations
    let superAdmin = await User.findOne({ role: "super_admin" });
    if (!superAdmin) {
        superAdmin = await User.findOne({ email: "abhipal895@gmail.com" });
        if (superAdmin) {
            superAdmin.role = "super_admin";
            superAdmin.isEmailVerified = true;
            await superAdmin.save();
        }
    }

    let passed = 0;
    let total = 0;

    function check(testNum, desc, condition, detail = "") {
        total++;
        if (condition) {
            passed++;
            console.log(`  [PASS] [TEST ${String(testNum).padStart(2, "0")}] ${desc}`);
            if (detail) console.log(`         -> ${detail}`);
        } else {
            console.error(`  [FAIL] [TEST ${String(testNum).padStart(2, "0")}] ${desc}`);
            if (detail) console.error(`         -> ${detail}`);
        }
    }

    // -------------------------------------------------------------
    // 1. Token Whitespace Handling: leading/trailing whitespace trimmed
    // -------------------------------------------------------------
    const { rawToken: t1Raw, tokenHash: t1Hash } = emailService.generateSecureToken();
    await AdminInvitation.create({
        tokenHash: t1Hash,
        allowedRole: "admin",
        createdBy: superAdmin._id,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        status: "active"
    });

    const paddedToken = "   \t" + t1Raw + "   \n";
    const res1 = await api("POST", "/api/auth/register-admin", {
        name: "Whitespace Applicant",
        collegeName: "Apex College",
        email: "sec_ws_" + Date.now() + "@college.edu",
        phone: "+91 9999900001",
        invitationToken: paddedToken,
        password: "Password@123",
        confirmPassword: "Password@123"
    });
    check(1, "Token whitespace handling: leading/trailing whitespace is safely trimmed and accepted",
        res1.status === 201, `HTTP ${res1.status}: ${res1.data?.message}`);

    // -------------------------------------------------------------
    // 2. Uppercase Token Handling: uppercase rejected as non-canonical / malformed
    // -------------------------------------------------------------
    const { rawToken: t2Raw, tokenHash: t2Hash } = emailService.generateSecureToken();
    await AdminInvitation.create({
        tokenHash: t2Hash,
        allowedRole: "admin",
        createdBy: superAdmin._id,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        status: "active"
    });

    const uppercaseToken = t2Raw.toUpperCase();
    const res2 = await api("POST", "/api/auth/register-admin", {
        name: "Uppercase Applicant",
        collegeName: "Apex College",
        email: "sec_upper_" + Date.now() + "@college.edu",
        phone: "+91 9999900002",
        invitationToken: uppercaseToken,
        password: "Password@123",
        confirmPassword: "Password@123"
    });
    check(2, "Uppercase token handling: uppercase token rejected as malformed (format preserved)",
        res2.status === 400 && res2.data?.message?.includes("Invalid invitation token"),
        `HTTP ${res2.status}: ${res2.data?.message}`);

    // -------------------------------------------------------------
    // 3. Malformed Token Handling: short, non-hex, invalid lengths
    // -------------------------------------------------------------
    const malformedTokens = [
        "short_token_1234",
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdeg", // 'g' is non-hex
        "0123456789abcdef", // too short
        "   " // empty/spaces
    ];

    let allMalformedRejected = true;
    for (const mt of malformedTokens) {
        const resM = await api("POST", "/api/auth/register-admin", {
            name: "Malformed Applicant",
            collegeName: "Apex College",
            email: "sec_mal_" + Math.random().toString(36).slice(2) + "@college.edu",
            phone: "+91 9999900003",
            invitationToken: mt,
            password: "Password@123",
            confirmPassword: "Password@123"
        });
        if (resM.status !== 400) {
            allMalformedRejected = false;
        }
    }
    check(3, "Malformed token handling: short/non-hex/empty tokens strictly rejected with HTTP 400",
        allMalformedRejected, "All 4 malformed token samples rejected with HTTP 400");

    // -------------------------------------------------------------
    // 4. Expired Token Handling
    // -------------------------------------------------------------
    const { rawToken: tExpRaw, tokenHash: tExpHash } = emailService.generateSecureToken();
    await AdminInvitation.create({
        tokenHash: tExpHash,
        allowedRole: "admin",
        createdBy: superAdmin._id,
        expiresAt: new Date(Date.now() - 3600 * 1000), // past
        status: "active"
    });

    const resExp = await api("POST", "/api/auth/register-admin", {
        name: "Expired Applicant",
        collegeName: "Apex College",
        email: "sec_exp_" + Date.now() + "@college.edu",
        phone: "+91 9999900004",
        invitationToken: tExpRaw,
        password: "Password@123",
        confirmPassword: "Password@123"
    });
    check(4, "Expired token handling: returns specific expired message (HTTP 400)",
        resExp.status === 400 && resExp.data?.message === "This invitation token has expired.",
        `HTTP ${resExp.status}: ${resExp.data?.message}`);

    // -------------------------------------------------------------
    // 5. Already Used Token Handling
    // -------------------------------------------------------------
    const { rawToken: tUsedRaw, tokenHash: tUsedHash } = emailService.generateSecureToken();
    await AdminInvitation.create({
        tokenHash: tUsedHash,
        allowedRole: "admin",
        createdBy: superAdmin._id,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        status: "used",
        usedAt: new Date()
    });

    const resUsed = await api("POST", "/api/auth/register-admin", {
        name: "Used Token Applicant",
        collegeName: "Apex College",
        email: "sec_used_" + Date.now() + "@college.edu",
        phone: "+91 9999900005",
        invitationToken: tUsedRaw,
        password: "Password@123",
        confirmPassword: "Password@123"
    });
    check(5, "Used token handling: returns specific already used message (HTTP 400)",
        resUsed.status === 400 && resUsed.data?.message === "This invitation token has already been used.",
        `HTTP ${resUsed.status}: ${resUsed.data?.message}`);

    // -------------------------------------------------------------
    // 6. Revoked Token Handling
    // -------------------------------------------------------------
    const { rawToken: tRevRaw, tokenHash: tRevHash } = emailService.generateSecureToken();
    await AdminInvitation.create({
        tokenHash: tRevHash,
        allowedRole: "admin",
        createdBy: superAdmin._id,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        status: "revoked"
    });

    const resRev = await api("POST", "/api/auth/register-admin", {
        name: "Revoked Applicant",
        collegeName: "Apex College",
        email: "sec_rev_" + Date.now() + "@college.edu",
        phone: "+91 9999900006",
        invitationToken: tRevRaw,
        password: "Password@123",
        confirmPassword: "Password@123"
    });
    check(6, "Revoked token handling: returns specific revoked message (HTTP 400)",
        resRev.status === 400 && resRev.data?.message === "This invitation token has been revoked by the Super Administrator.",
        `HTTP ${resRev.status}: ${resRev.data?.message}`);

    // -------------------------------------------------------------
    // 7. Email Mismatched Token Handling
    // -------------------------------------------------------------
    const { rawToken: tMisRaw, tokenHash: tMisHash } = emailService.generateSecureToken();
    await AdminInvitation.create({
        tokenHash: tMisHash,
        recipientEmail: "designated.dean@college.edu",
        allowedRole: "admin",
        createdBy: superAdmin._id,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        status: "active"
    });

    const resMis = await api("POST", "/api/auth/register-admin", {
        name: "Mismatched Applicant",
        collegeName: "Apex College",
        email: "unauthorized.user_" + Date.now() + "@college.edu",
        phone: "+91 9999900007",
        invitationToken: tMisRaw,
        password: "Password@123",
        confirmPassword: "Password@123"
    });
    check(7, "Email mismatched token handling: returns designated email message (HTTP 400)",
        resMis.status === 400 && resMis.data?.message?.includes("reserved for a specific email address"),
        `HTTP ${resMis.status}: ${resMis.data?.message}`);

    // -------------------------------------------------------------
    // 8. Concurrent Invitation Reuse (Atomicity Defense)
    // -------------------------------------------------------------
    const { rawToken: tRaceRaw, tokenHash: tRaceHash } = emailService.generateSecureToken();
    await AdminInvitation.create({
        tokenHash: tRaceHash,
        allowedRole: "admin",
        createdBy: superAdmin._id,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        status: "active"
    });

    const raceEmailA = "sec_race_a_" + Date.now() + "@college.edu";
    const raceEmailB = "sec_race_b_" + Date.now() + "@college.edu";

    const [raceRes1, raceRes2] = await Promise.all([
        api("POST", "/api/auth/register-admin", {
            name: "Race A",
            collegeName: "College A",
            email: raceEmailA,
            phone: "+91 9999900008",
            invitationToken: tRaceRaw,
            password: "Password@123",
            confirmPassword: "Password@123"
        }),
        api("POST", "/api/auth/register-admin", {
            name: "Race B",
            collegeName: "College B",
            email: raceEmailB,
            phone: "+91 9999900009",
            invitationToken: tRaceRaw,
            password: "Password@123",
            confirmPassword: "Password@123"
        })
    ]);

    const raceStatuses = [raceRes1.status, raceRes2.status].sort();
    const raceAtomic = raceStatuses[0] === 201 && raceStatuses[1] === 400;
    check(8, "Concurrent invitation reuse: exactly 1 request succeeds (201) and 1 is rejected (400)",
        raceAtomic, `Concurrent responses: [${raceStatuses[0]}, ${raceStatuses[1]}]`);

    // -------------------------------------------------------------
    // 9. Super Admin Bootstrap when PRIMARY_SUPER_ADMIN_EMAIL is missing
    // -------------------------------------------------------------
    const originalEnv = process.env.PRIMARY_SUPER_ADMIN_EMAIL;
    delete process.env.PRIMARY_SUPER_ADMIN_EMAIL;

    // Create a regular unpromoted user
    const unpromotedEmail = "unpromoted.admin_" + Date.now() + "@college.edu";
    await User.create({
        name: "Unpromoted Admin",
        email: unpromotedEmail,
        password: "Password@123",
        role: "admin",
        status: "active",
        isEmailVerified: true
    });

    // Run seedAdminUsers
    await seedService.seedAdminUsers();
    const checkUnpromoted = await User.findOne({ email: unpromotedEmail });
    check(9, "Super Admin bootstrap when env var is missing: fails safely with NO promotion",
        checkUnpromoted.role === "admin", `Account role remains: '${checkUnpromoted.role}'`);

    // -------------------------------------------------------------
    // 10. Verified Owner Promotion when explicitly configured
    // -------------------------------------------------------------
    const ownerEmail = "verified.owner_" + Date.now() + "@college.edu";
    await User.create({
        name: "Verified Owner",
        email: ownerEmail,
        password: "Password@123",
        role: "admin",
        status: "active",
        isEmailVerified: true
    });

    process.env.PRIMARY_SUPER_ADMIN_EMAIL = ownerEmail;
    await seedService.seedAdminUsers();
    const checkOwner = await User.findOne({ email: ownerEmail });
    check(10, "Verified owner promotion when explicitly configured: account promoted to super_admin",
        checkOwner.role === "super_admin", `Account role updated to: '${checkOwner.role}'`);

    // -------------------------------------------------------------
    // 11. Unverified Account Promotion is BLOCKED
    // -------------------------------------------------------------
    const unverifiedOwnerEmail = "unverified.owner_" + Date.now() + "@college.edu";
    await User.create({
        name: "Unverified Owner",
        email: unverifiedOwnerEmail,
        password: "Password@123",
        role: "admin",
        status: "active",
        isEmailVerified: false // UNVERIFIED
    });

    process.env.PRIMARY_SUPER_ADMIN_EMAIL = unverifiedOwnerEmail;
    await seedService.seedAdminUsers();
    const checkUnverifiedOwner = await User.findOne({ email: unverifiedOwnerEmail });
    check(11, "Unverified account promotion is BLOCKED: unverified account role remains admin",
        checkUnverifiedOwner.role === "admin", `Account role remains: '${checkUnverifiedOwner.role}'`);

    // -------------------------------------------------------------
    // 12. Accidental Super Admin Demotion Prevention
    // -------------------------------------------------------------
    const existingSuperAdminEmail = "permanent.super_" + Date.now() + "@college.edu";
    await User.create({
        name: "Permanent Super Admin",
        email: existingSuperAdminEmail,
        password: "Password@123",
        role: "super_admin",
        status: "active",
        isEmailVerified: true
    });

    // Run seed with different email configured
    process.env.PRIMARY_SUPER_ADMIN_EMAIL = ownerEmail;
    await seedService.seedAdminUsers();
    const checkPermanentSuper = await User.findOne({ email: existingSuperAdminEmail });
    check(12, "Super Admin demotion prevention: existing super_admin accounts are never demoted",
        checkPermanentSuper.role === "super_admin", `Existing super_admin role preserved: '${checkPermanentSuper.role}'`);

    // Restore env
    if (originalEnv) {
        process.env.PRIMARY_SUPER_ADMIN_EMAIL = originalEnv;
    } else {
        delete process.env.PRIMARY_SUPER_ADMIN_EMAIL;
    }

    // Cleanup test users and requests
    await User.deleteMany({ email: { $regex: /^sec_/ } });
    await User.deleteMany({ email: { $in: [unpromotedEmail, ownerEmail, unverifiedOwnerEmail, existingSuperAdminEmail] } });
    await AdminRegistrationRequest.deleteMany({ email: { $regex: /^sec_/ } });

    console.log("\n================================================================================");
    console.log(`  SECURITY CORRECTIONS RESULTS: ${passed}/${total} PASSED (${((passed / total) * 100).toFixed(1)}%)`);
    console.log("================================================================================\n");

    await mongoose.disconnect();
    if (passed !== total) process.exit(1);
}

runSecurityTests().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
