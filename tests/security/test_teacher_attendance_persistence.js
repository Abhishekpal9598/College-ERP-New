/**
 * Data Persistence & Regression Test Suite for Teacher Attendance
 * Verifies end-to-end MongoDB persistence, atomic updates, and student attendance integrity.
 */
const path = require("path");

const backendNodeModules = path.join(__dirname, "../../backend/node_modules");
const mongoose = require(path.join(backendNodeModules, "mongoose"));
const dotenv = require(path.join(backendNodeModules, "dotenv"));
const jwt = require(path.join(backendNodeModules, "jsonwebtoken"));

dotenv.config({ path: path.join(__dirname, "../../backend/.env") });

const JWT_SECRET = process.env.JWT_SECRET || "college_erp_dev_secret_key_2026";
function signToken(user) {
    return jwt.sign(
        { id: user._id, role: user.role, tokenVersion: user.tokenVersion || 0, jti: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}` },
        JWT_SECRET,
        { expiresIn: "24h" }
    );
}


const { connectDB, disconnectDB } = require("../../backend/src/config/database");
const Teacher = require("../../backend/src/models/Teacher");
const TeacherAttendance = require("../../backend/src/models/TeacherAttendance");
const Student = require("../../backend/src/models/Student");
const Attendance = require("../../backend/src/models/Attendance");
const User = require("../../backend/src/models/User");
const app = require("../../backend/src/app");
const http = require("http");

let passedChecks = 0;
let failedChecks = 0;

function assert(description, condition, details = "") {
    if (condition) {
        console.log(`  [PASS] ${description}`);
        if (details) console.log(`         -> ${details}`);
        passedChecks++;
    } else {
        console.error(`  [FAIL] ${description}`);
        if (details) console.error(`         -> ${details}`);
        failedChecks++;
    }
}

async function runTeacherAttendancePersistenceTests() {
    console.log("================================================================================");
    console.log("  COLLEGE ERP - TEACHER ATTENDANCE DATA PERSISTENCE & REGRESSION TEST SUITE");
    console.log("================================================================================\n");

    await connectDB();

    const server = http.createServer(app);
    await new Promise(res => server.listen(0, res));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    async function apiCall(method, path, body = null, token = null) {
        const url = `${baseUrl}${path}`;
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const options = {
            method: method.toUpperCase(),
            headers
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const res = await fetch(url, options);
        let parsed = null;
        try {
            parsed = await res.json();
        } catch {
            parsed = null;
        }
        return { status: res.status, body: parsed };
    }

    try {
        // Obtain Admin Token for API calls
        const adminEmail = `admin_att_${Date.now()}@college.erp`;
        const adminUser = await User.create({
            name: "Attendance Admin",
            email: adminEmail,
            password: "Password123!",
            role: "admin",
            status: "active",
            isEmailVerified: true
        });

        const token = signToken(adminUser);

        // Ensure 3 test teachers exist in database
        const timestamp = Date.now();
        const teachers = await Teacher.insertMany([
            {
                teacherId: `TCH_A_${timestamp}`,
                firstName: "Aarav",
                lastName: "Sharma",
                email: `aarav.${timestamp}@college.erp`,
                department: "Computer Science",
                subject: "Algorithms"
            },
            {
                teacherId: `TCH_B_${timestamp}`,
                firstName: "Bhavna",
                lastName: "Gupta",
                email: `bhavna.${timestamp}@college.erp`,
                department: "Mathematics",
                subject: "Linear Algebra"
            },
            {
                teacherId: `TCH_C_${timestamp}`,
                firstName: "Chirag",
                lastName: "Verma",
                email: `chirag.${timestamp}@college.erp`,
                department: "Physics",
                subject: "Quantum Mechanics"
            }
        ]);

        const [t1, t2, t3] = teachers;
        const testDate1 = "2026-10-20";
        const testDate2 = "2026-10-21";

        // ---------------------------------------------------------------------
        // TEST 1: Mark Teacher 1 Present -> Refresh / Fetch -> Verify Present
        // ---------------------------------------------------------------------
        console.log(">>> [TEST 1] Mark a teacher Present & Verify Persistence");
        const t1SaveRes = await apiCall("POST", "/api/attendance/teachers", {
            teacher: t1._id.toString(),
            date: testDate1,
            status: "present"
        }, token);

        assert(
            "POST /api/attendance/teachers saves record successfully (201 Created)",
            t1SaveRes.status === 201 && t1SaveRes.body?.success === true,
            `HTTP Status: ${t1SaveRes.status}`
        );

        // Simulate page refresh: GET /api/attendance/teachers?date=...
        const t1FetchRes = await apiCall("GET", `/api/attendance/teachers?date=${testDate1}`, null, token);
        const t1Record = t1FetchRes.body?.data?.find(r => (r.teacher?._id || r.teacher) === t1._id.toString());

        assert(
            "Previously marked Present status survives refresh and is returned from backend",
            t1Record && t1Record.status === "present",
            `Found record status: ${t1Record?.status}`
        );

        // ---------------------------------------------------------------------
        // TEST 2: Mark Teacher 2 Absent -> Refresh / Fetch -> Verify Absent
        // ---------------------------------------------------------------------
        console.log("\n>>> [TEST 2] Mark a teacher Absent & Verify Persistence");
        const t2SaveRes = await apiCall("POST", "/api/attendance/teachers", {
            teacher: t2._id.toString(),
            date: testDate1,
            status: "absent"
        }, token);

        assert(
            "POST /api/attendance/teachers saves absent record (201 Created)",
            t2SaveRes.status === 201 && t2SaveRes.body?.success === true,
            `HTTP Status: ${t2SaveRes.status}`
        );

        const t2FetchRes = await apiCall("GET", `/api/attendance/teachers?date=${testDate1}`, null, token);
        const t2Record = t2FetchRes.body?.data?.find(r => (r.teacher?._id || r.teacher) === t2._id.toString());

        assert(
            "Previously marked Absent status survives refresh and is returned from backend",
            t2Record && t2Record.status === "absent",
            `Found record status: ${t2Record?.status}`
        );

        // ---------------------------------------------------------------------
        // TEST 3: Change existing Present record to Absent -> Verify Updated
        // ---------------------------------------------------------------------
        console.log("\n>>> [TEST 3] Change existing record from Present to Absent");
        const t1UpdateRes = await apiCall("POST", "/api/attendance/teachers", {
            teacher: t1._id.toString(),
            date: testDate1,
            status: "absent"
        }, token);

        assert(
            "POST/Upsert on existing record succeeds without duplicate error (201 Created)",
            t1UpdateRes.status === 201 && t1UpdateRes.body?.data?.status === "absent",
            `Updated status: ${t1UpdateRes.body?.data?.status}`
        );

        // Verify in DB that only 1 record exists for t1 on testDate1 (no duplicate)
        const t1CountInDB = await TeacherAttendance.countDocuments({
            teacher: t1._id,
            date: testDate1
        });
        const t1UpdatedDoc = await TeacherAttendance.findOne({
            teacher: t1._id,
            date: testDate1
        });

        assert(
            "Atomic upsert updated existing record in place with zero duplicate creation",
            t1CountInDB === 1 && t1UpdatedDoc.status === "absent",
            `Record count in MongoDB: ${t1CountInDB}, Status in MongoDB: ${t1UpdatedDoc?.status}`
        );

        // ---------------------------------------------------------------------
        // TEST 4: Batch mark multiple teachers (Present, Absent, Leave) -> Refresh
        // ---------------------------------------------------------------------
        console.log("\n>>> [TEST 4] Batch mark multiple teachers & Verify All Persist");
        const batchPayload = {
            batch: [
                { teacher: t1._id.toString(), date: testDate2, status: "present" },
                { teacher: t2._id.toString(), date: testDate2, status: "leave" },
                { teacher: t3._id.toString(), date: testDate2, status: "absent" }
            ]
        };

        const batchRes = await apiCall("POST", "/api/attendance/teachers", batchPayload, token);
        assert(
            "Batch save /api/attendance/teachers returns 201 Created",
            batchRes.status === 201 && batchRes.body?.success === true,
            `Bulk result upserted: ${batchRes.body?.data?.upsertedCount || 3}`
        );

        // Simulate refresh
        const batchFetchRes = await apiCall("GET", `/api/attendance/teachers?date=${testDate2}`, null, token);
        const records2 = batchFetchRes.body?.data || [];

        const rec1 = records2.find(r => (r.teacher?._id || r.teacher) === t1._id.toString());
        const rec2 = records2.find(r => (r.teacher?._id || r.teacher) === t2._id.toString());
        const rec3 = records2.find(r => (r.teacher?._id || r.teacher) === t3._id.toString());

        assert(
            "All multiple teacher records retrieved accurately with distinct statuses (Present, Leave, Absent)",
            rec1?.status === "present" && rec2?.status === "leave" && rec3?.status === "absent",
            `t1: ${rec1?.status}, t2: ${rec2?.status}, t3: ${rec3?.status}`
        );

        // ---------------------------------------------------------------------
        // TEST 5: Open same date in another browser session / user
        // ---------------------------------------------------------------------
        console.log("\n>>> [TEST 5] Retrieve attendance from a separate authenticated session");
        const admin2Email = `admin_session2_${Date.now()}@college.erp`;
        const admin2User = await User.create({
            name: "Second Admin",
            email: admin2Email,
            password: "Password123!",
            role: "admin",
            status: "active",
            isEmailVerified: true
        });
        const token2 = signToken(admin2User);

        const session2Res = await apiCall("GET", `/api/attendance/teachers?date=${testDate2}`, null, token2);
        assert(
            "Second independent session retrieves identical saved teacher attendance from MongoDB",
            session2Res.status === 200 && session2Res.body?.data?.length === 3,
            `Records retrieved: ${session2Res.body?.data?.length}`
        );

        // ---------------------------------------------------------------------
        // TEST 6: Direct MongoDB Atlas / Mongoose Collection Verification
        // ---------------------------------------------------------------------
        console.log("\n>>> [TEST 6] Inspect MongoDB TeacherAttendance Collection Directly");
        const mongoDocs = await TeacherAttendance.find({ date: testDate2 }).lean();
        const validDocs = mongoDocs.every(d =>
            mongoose.Types.ObjectId.isValid(d.teacher) &&
            typeof d.date === "string" &&
            ["present", "absent", "leave"].includes(d.status)
        );

        assert(
            "Direct MongoDB inspection confirms documents have correct teacher ObjectIds, dates, and validated enum statuses",
            mongoDocs.length === 3 && validDocs,
            `Found ${mongoDocs.length} valid documents in MongoDB TeacherAttendance collection`
        );

        // ---------------------------------------------------------------------
        // TEST 7: Student Attendance Integrity & Regression Verification
        // ---------------------------------------------------------------------
        console.log("\n>>> [TEST 7] Student Attendance Integrity Verification");
        const testStudent = await Student.create({
            studentId: `STU_ATT_${timestamp}`,
            firstName: "Dev",
            lastName: "Kashyap",
            email: `dev.${timestamp}@college.erp`,
            rollNumber: `ROLL_${timestamp.toString().slice(-5)}`,
            department: "Computer Science",
            course: "B.Tech",
            semester: 4,
            section: "B"
        });

        // 7.1 Record Student Attendance
        const studentAttRes = await apiCall("POST", "/api/attendance", {
            student: testStudent._id.toString(),
            date: testDate1,
            status: "present",
            subject: "Operating Systems",
            semester: 4,
            section: "B"
        }, token);

        assert(
            "Student attendance creation functions normally (201 Created)",
            studentAttRes.status === 201 && studentAttRes.body?.success === true,
            `Created student attendance ID: ${studentAttRes.body?.data?._id}`
        );

        // 7.2 Duplicate prevention for student attendance
        const studentDupRes = await apiCall("POST", "/api/attendance", {
            student: testStudent._id.toString(),
            date: testDate1,
            status: "present",
            subject: "Operating Systems",
            semester: 4,
            section: "B"
        }, token);

        assert(
            "Student attendance duplicate prevention remains active (409 Conflict)",
            studentDupRes.status === 409 && studentDupRes.body?.success === false,
            `HTTP Status: ${studentDupRes.status}`
        );

        // 7.3 Fetch Student attendance
        const studentFetchRes = await apiCall("GET", `/api/attendance?date=${testDate1}&student=${testStudent._id.toString()}`, null, token);
        assert(
            "Student attendance query returns valid student records",
            studentFetchRes.status === 200 && studentFetchRes.body?.data?.length === 1,
            `Student records count: ${studentFetchRes.body?.data?.length}`
        );

        // Cleanup test data
        await TeacherAttendance.deleteMany({ date: { $in: [testDate1, testDate2] } });
        await Attendance.deleteMany({ student: testStudent._id });
        await Teacher.deleteMany({ _id: { $in: [t1._id, t2._id, t3._id] } });
        await Student.deleteOne({ _id: testStudent._id });
        await User.deleteMany({ email: { $in: [adminEmail, admin2Email] } });

    } finally {
        server.close();
        await disconnectDB();
    }

    console.log("\n================================================================================");
    console.log(`  TEACHER ATTENDANCE PERSISTENCE SUITE: ${passedChecks}/${passedChecks + failedChecks} PASSED (${((passedChecks / (passedChecks + failedChecks)) * 100).toFixed(1)}%)`);
    console.log("================================================================================\n");

    if (failedChecks > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    runTeacherAttendancePersistenceTests().catch(err => {
        console.error("Test execution failed:", err);
        process.exit(1);
    });
}

module.exports = { runTeacherAttendancePersistenceTests };
