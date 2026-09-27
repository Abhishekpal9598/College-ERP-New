/**
 * Comprehensive Backend API Test Suite for College ERP
 * Tests all endpoints: Health, Auth, Students, Teachers, Attendance, Fees, Results, Dashboard, Security
 */

const http = require("http");

const BASE_URL = process.env.TEST_API_URL || "http://localhost:5000";

let authToken = "";
let createdStudentId = "";
let createdTeacherId = "";
let createdAttendanceId = "";
let createdFeeId = "";
let createdResultId = "";

const testResults = [];

// Helper for making HTTP requests
const apiRequest = ({ method = "GET", path = "/", body = null, token = null }) => {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const headers = {
            "Content-Type": "application/json"
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const options = {
            hostname: url.hostname,
            port: url.port || 5000,
            path: url.pathname + url.search,
            method: method.toUpperCase(),
            headers
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: parsed
                });
            });
        });

        req.on("error", (err) => {
            reject(err);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
};

const assert = (testName, condition, details = "") => {
    if (condition) {
        console.log(`  [PASS] ${testName}`);
        testResults.push({ name: testName, pass: true });
    } else {
        console.error(`  [FAIL] ${testName} - ${details}`);
        testResults.push({ name: testName, pass: false, details });
    }
};

const runAllTests = async () => {
    console.log("\n=======================================================");
    console.log("   COLLEGE ERP - PRODUCTION BACKEND TEST SUITE");
    console.log("=======================================================\n");

    try {
        // ==========================================
        // 1. Health Check Module
        // ==========================================
        console.log(">> 1. TESTING HEALTH CHECK ENDPOINT");
        const healthRes = await apiRequest({ method: "GET", path: "/api/health" });
        assert(
            "Health Check Endpoint Returns 200 OK",
            healthRes.status === 200 && healthRes.body.success === true,
            `Status: ${healthRes.status}, Body: ${JSON.stringify(healthRes.body)}`
        );
        assert(
            "Health Check Database Status is Connected",
            healthRes.body.data && healthRes.body.data.database === "connected",
            `DB Status: ${healthRes.body.data ? healthRes.body.data.database : "none"}`
        );

        // ==========================================
        // 2. Authentication Module
        // ==========================================
        console.log("\n>> 2. TESTING AUTHENTICATION MODULE");

        // 2.1 Login with invalid email
        const invalidEmailRes = await apiRequest({
            method: "POST",
            path: "/api/auth/login",
            body: { email: "nonexistent@college.erp", password: "Password@123" }
        });
        assert(
            "Login Fails with Invalid Email (401)",
            invalidEmailRes.status === 401 && invalidEmailRes.body.success === false,
            `Status: ${invalidEmailRes.status}`
        );

        // 2.2 Login with wrong password
        const wrongPasswordRes = await apiRequest({
            method: "POST",
            path: "/api/auth/login",
            body: { email: "admin@college.erp", password: "WrongPassword" }
        });
        assert(
            "Login Fails with Wrong Password (401)",
            wrongPasswordRes.status === 401 && wrongPasswordRes.body.success === false,
            `Status: ${wrongPasswordRes.status}`
        );

        // 2.3 Successful login
        const loginSuccessRes = await apiRequest({
            method: "POST",
            path: "/api/auth/login",
            body: { email: "admin@college.erp", password: "Password@123" }
        });
        assert(
            "Login Succeeds with Correct Credentials (200)",
            loginSuccessRes.status === 200 && loginSuccessRes.body.success === true && !!loginSuccessRes.body.data.token,
            `Status: ${loginSuccessRes.status}, Body: ${JSON.stringify(loginSuccessRes.body)}`
        );
        authToken = loginSuccessRes.body.data?.token;

        // 2.4 Protected route without token
        const noTokenRes = await apiRequest({ method: "GET", path: "/api/auth/me" });
        assert(
            "Protected Route Blocks Request Without Token (401)",
            noTokenRes.status === 401 && noTokenRes.body.success === false,
            `Status: ${noTokenRes.status}`
        );

        // 2.5 Protected route with valid token
        const validTokenRes = await apiRequest({
            method: "GET",
            path: "/api/auth/me",
            token: authToken
        });
        assert(
            "Protected Route Allows Access with Valid Token (200)",
            validTokenRes.status === 200 && validTokenRes.body.success === true && validTokenRes.body.data.email === "admin@college.erp",
            `Status: ${validTokenRes.status}`
        );

        // ==========================================
        // 3. Student Module
        // ==========================================
        console.log("\n>> 3. TESTING STUDENT MODULE");

        // 3.1 Invalid student data validation
        const invalidStudentRes = await apiRequest({
            method: "POST",
            path: "/api/students",
            body: { firstName: "" },
            token: authToken
        });
        assert(
            "Reject Invalid Student Data (400)",
            invalidStudentRes.status === 400 && invalidStudentRes.body.success === false,
            `Status: ${invalidStudentRes.status}`
        );

        // 3.2 Create student
        const studentPayload = {
            studentId: `STU${Date.now().toString().slice(-5)}`,
            rollNumber: `ROLL${Date.now().toString().slice(-5)}`,
            firstName: "Rahul",
            lastName: "Sharma",
            email: `rahul.${Date.now()}@college.erp`,
            phone: "9876543210",
            gender: "male",
            course: "B.Tech",
            department: "Computer Science",
            semester: 4,
            section: "A",
            address: "New Delhi, India",
            guardianName: "Sanjay Sharma",
            guardianPhone: "9876543211"
        };
        const createStudentRes = await apiRequest({
            method: "POST",
            path: "/api/students",
            body: studentPayload,
            token: authToken
        });
        assert(
            "Create Student (201)",
            createStudentRes.status === 201 && createStudentRes.body.success === true && !!createStudentRes.body.data._id,
            `Status: ${createStudentRes.status}, Body: ${JSON.stringify(createStudentRes.body)}`
        );
        createdStudentId = createStudentRes.body.data?._id;

        // 3.3 Duplicate student detection
        const duplicateStudentRes = await apiRequest({
            method: "POST",
            path: "/api/students",
            body: studentPayload,
            token: authToken
        });
        assert(
            "Duplicate Student Protection (409)",
            duplicateStudentRes.status === 409 && duplicateStudentRes.body.success === false,
            `Status: ${duplicateStudentRes.status}`
        );

        // 3.4 Get all students
        const getStudentsRes = await apiRequest({
            method: "GET",
            path: "/api/students?department=Computer Science&page=1&limit=10",
            token: authToken
        });
        assert(
            "Get All Students with Query Filters & Pagination (200)",
            getStudentsRes.status === 200 && Array.isArray(getStudentsRes.body.data) && getStudentsRes.body.data.length > 0,
            `Total: ${getStudentsRes.body.meta ? getStudentsRes.body.meta.total : 0}`
        );

        // 3.5 Get single student
        const getOneStudentRes = await apiRequest({
            method: "GET",
            path: `/api/students/${createdStudentId}`,
            token: authToken
        });
        assert(
            "Get Single Student by ID (200)",
            getOneStudentRes.status === 200 && getOneStudentRes.body.data._id === createdStudentId,
            `Status: ${getOneStudentRes.status}`
        );

        // 3.6 Update student
        const updateStudentRes = await apiRequest({
            method: "PUT",
            path: `/api/students/${createdStudentId}`,
            body: { lastName: "Verma", semester: 5 },
            token: authToken
        });
        assert(
            "Update Student Details (200)",
            updateStudentRes.status === 200 && updateStudentRes.body.data.lastName === "Verma" && updateStudentRes.body.data.semester === 5,
            `Updated: ${updateStudentRes.body.data?.lastName}`
        );

        // ==========================================
        // 4. Teacher Module
        // ==========================================
        console.log("\n>> 4. TESTING TEACHER MODULE");

        // 4.1 Create teacher
        const teacherPayload = {
            teacherId: `TCH${Date.now().toString().slice(-4)}`,
            firstName: "Dr. Amit",
            lastName: "Patel",
            email: `amit.patel.${Date.now()}@college.erp`,
            phone: "9123456789",
            department: "Computer Science",
            subject: "Data Structures",
            designation: "Associate Professor"
        };
        const createTeacherRes = await apiRequest({
            method: "POST",
            path: "/api/teachers",
            body: teacherPayload,
            token: authToken
        });
        assert(
            "Create Teacher (201)",
            createTeacherRes.status === 201 && createTeacherRes.body.success === true,
            `Status: ${createTeacherRes.status}`
        );
        createdTeacherId = createTeacherRes.body.data?._id;

        // 4.2 Get teachers
        const getTeachersRes = await apiRequest({
            method: "GET",
            path: "/api/teachers?department=Computer Science",
            token: authToken
        });
        assert(
            "Get All Teachers (200)",
            getTeachersRes.status === 200 && Array.isArray(getTeachersRes.body.data) && getTeachersRes.body.data.length > 0,
            `Total: ${getTeachersRes.body.data?.length}`
        );

        // 4.3 Update teacher
        const updateTeacherRes = await apiRequest({
            method: "PUT",
            path: `/api/teachers/${createdTeacherId}`,
            body: { designation: "Professor & HOD" },
            token: authToken
        });
        assert(
            "Update Teacher Details (200)",
            updateTeacherRes.status === 200 && updateTeacherRes.body.data.designation === "Professor & HOD",
            `Status: ${updateTeacherRes.status}`
        );

        // ==========================================
        // 5. Attendance Module
        // ==========================================
        console.log("\n>> 5. TESTING ATTENDANCE MODULE");

        const todayDate = new Date().toISOString().split("T")[0];

        // 5.1 Record Attendance
        const attendancePayload = {
            student: createdStudentId,
            date: todayDate,
            status: "present",
            subject: "Data Structures",
            semester: 5,
            section: "A"
        };
        const createAttRes = await apiRequest({
            method: "POST",
            path: "/api/attendance",
            body: attendancePayload,
            token: authToken
        });
        assert(
            "Record Student Attendance (201)",
            createAttRes.status === 201 && createAttRes.body.success === true,
            `Status: ${createAttRes.status}`
        );
        createdAttendanceId = createAttRes.body.data?._id;

        // 5.2 Duplicate attendance prevention
        const duplicateAttRes = await apiRequest({
            method: "POST",
            path: "/api/attendance",
            body: attendancePayload,
            token: authToken
        });
        assert(
            "Prevent Duplicate Attendance for Same Student/Date/Subject (409)",
            duplicateAttRes.status === 409 && duplicateAttRes.body.success === false,
            `Status: ${duplicateAttRes.status}`
        );

        // 5.3 Update Attendance
        const updateAttRes = await apiRequest({
            method: "PUT",
            path: `/api/attendance/${createdAttendanceId}`,
            body: { status: "late", remarks: "10 mins late" },
            token: authToken
        });
        assert(
            "Update Attendance Record (200)",
            updateAttRes.status === 200 && updateAttRes.body.data.status === "late",
            `Status: ${updateAttRes.status}`
        );

        // 5.4 Student Attendance History & Percentage
        const studentAttRes = await apiRequest({
            method: "GET",
            path: `/api/attendance/student/${createdStudentId}`,
            token: authToken
        });
        assert(
            "Get Student Attendance Summary & Percentage (200)",
            studentAttRes.status === 200 && typeof studentAttRes.body.data.summary.attendancePercentage === "number",
            `Percentage: ${studentAttRes.body.data?.summary?.attendancePercentage}%`
        );

        // ==========================================
        // 6. Fees Module
        // ==========================================
        console.log("\n>> 6. TESTING FEES MODULE");

        // 6.1 Create Fee Record
        const feePayload = {
            student: createdStudentId,
            academicYear: "2025-2026",
            semester: 5,
            totalAmount: 50000,
            paidAmount: 30000,
            paymentMethod: "upi",
            transactionReference: "UPI-TEST-12345"
        };
        const createFeeRes = await apiRequest({
            method: "POST",
            path: "/api/fees",
            body: feePayload,
            token: authToken
        });
        assert(
            "Create Fee Record & Auto Calculate Pending Amount (201)",
            createFeeRes.status === 201 && createFeeRes.body.data.pendingAmount === 20000 && createFeeRes.body.data.status === "partial",
            `Pending: ${createFeeRes.body.data?.pendingAmount}, Status: ${createFeeRes.body.data?.status}`
        );
        createdFeeId = createFeeRes.body.data?._id;

        // 6.2 Update Fee Record (complete payment)
        const updateFeeRes = await apiRequest({
            method: "PUT",
            path: `/api/fees/${createdFeeId}`,
            body: { paidAmount: 50000 },
            token: authToken
        });
        assert(
            "Update Fee to Fully Paid (200)",
            updateFeeRes.status === 200 && updateFeeRes.body.data.pendingAmount === 0 && updateFeeRes.body.data.status === "paid",
            `Pending: ${updateFeeRes.body.data?.pendingAmount}, Status: ${updateFeeRes.body.data?.status}`
        );

        // 6.3 Student Fee History
        const studentFeeRes = await apiRequest({
            method: "GET",
            path: `/api/fees/student/${createdStudentId}`,
            token: authToken
        });
        assert(
            "Get Student Fee History & Financial Summary (200)",
            studentFeeRes.status === 200 && studentFeeRes.body.data.summary.totalPaid === 50000,
            `Total Paid: ${studentFeeRes.body.data?.summary?.totalPaid}`
        );

        // ==========================================
        // 7. Results Module
        // ==========================================
        console.log("\n>> 7. TESTING RESULTS MODULE");

        // 7.1 Reject Marks exceeding maxMarks
        const invalidMarksRes = await apiRequest({
            method: "POST",
            path: "/api/results",
            body: {
                student: createdStudentId,
                subject: "Operating Systems",
                semester: 5,
                marks: 120,
                maxMarks: 100
            },
            token: authToken
        });
        assert(
            "Reject Marks Exceeding Maximum Marks (400)",
            invalidMarksRes.status === 400 && invalidMarksRes.body.success === false,
            `Status: ${invalidMarksRes.status}`
        );

        // 7.2 Create Valid Result with auto Grade calculation
        const resultPayload = {
            student: createdStudentId,
            subject: "Operating Systems",
            semester: 5,
            marks: 88,
            maxMarks: 100,
            examType: "final",
            academicYear: "2025-2026"
        };
        const createResultRes = await apiRequest({
            method: "POST",
            path: "/api/results",
            body: resultPayload,
            token: authToken
        });
        assert(
            "Record Academic Result with Auto Grade Calculation (201)",
            createResultRes.status === 201 && createResultRes.body.data.grade === "A" && createResultRes.body.data.percentage === 88,
            `Grade: ${createResultRes.body.data?.grade}, Percentage: ${createResultRes.body.data?.percentage}%`
        );
        createdResultId = createResultRes.body.data?._id;

        // 7.3 Update Result
        const updateResultRes = await apiRequest({
            method: "PUT",
            path: `/api/results/${createdResultId}`,
            body: { marks: 95 },
            token: authToken
        });
        assert(
            "Update Result and Recalculate Grade (200)",
            updateResultRes.status === 200 && updateResultRes.body.data.grade === "A+",
            `Updated Grade: ${updateResultRes.body.data?.grade}`
        );

        // 7.4 Student Result Report Card
        const studentResultRes = await apiRequest({
            method: "GET",
            path: `/api/results/student/${createdStudentId}`,
            token: authToken
        });
        assert(
            "Get Student Academic Report Card & Overall Percentage (200)",
            studentResultRes.status === 200 && studentResultRes.body.data.summary.totalSubjects > 0,
            `Overall Grade: ${studentResultRes.body.data?.summary?.overallGrade}`
        );

        // ==========================================
        // 8. Dashboard Module
        // ==========================================
        console.log("\n>> 8. TESTING DASHBOARD MODULE");

        const dashboardRes = await apiRequest({
            method: "GET",
            path: "/api/dashboard/stats",
            token: authToken
        });
        assert(
            "Get Real Live Database Dashboard Statistics (200)",
            dashboardRes.status === 200 &&
                typeof dashboardRes.body.data.totalStudents === "number" &&
                typeof dashboardRes.body.data.totalTeachers === "number" &&
                typeof dashboardRes.body.data.totalFeeCollected === "number",
            `Total Students: ${dashboardRes.body.data?.totalStudents}, Teachers: ${dashboardRes.body.data?.totalTeachers}`
        );

        // ==========================================
        // 9. Cleanup / Delete Operations
        // ==========================================
        console.log("\n>> 9. TESTING DELETE OPERATIONS & RBAC");

        const deleteStudentRes = await apiRequest({
            method: "DELETE",
            path: `/api/students/${createdStudentId}`,
            token: authToken
        });
        assert(
            "Delete Student Record by Admin (200)",
            deleteStudentRes.status === 200 && deleteStudentRes.body.success === true,
            `Status: ${deleteStudentRes.status}`
        );

        const deleteTeacherRes = await apiRequest({
            method: "DELETE",
            path: `/api/teachers/${createdTeacherId}`,
            token: authToken
        });
        assert(
            "Delete Teacher Record by Admin (200)",
            deleteTeacherRes.status === 200 && deleteTeacherRes.body.success === true,
            `Status: ${deleteTeacherRes.status}`
        );

        // Summary
        console.log("\n=======================================================");
        console.log("                TEST SUITE SUMMARY");
        console.log("=======================================================");
        const passedCount = testResults.filter((t) => t.pass).length;
        const failedCount = testResults.filter((t) => !t.pass).length;
        console.log(`Total Tests Run : ${testResults.length}`);
        console.log(`Passed         : ${passedCount}`);
        console.log(`Failed         : ${failedCount}`);

        if (failedCount === 0) {
            console.log("\n>>> ALL BACKEND API TESTS COMPLETED SUCCESSFULLY (100% PASS) <<<\n");
            process.exit(0);
        } else {
            console.error("\n>>> SOME BACKEND TESTS FAILED <<<\n");
            process.exit(1);
        }
    } catch (err) {
        console.error(`\n[FATAL] Test execution crashed: ${err.message}`);
        console.error(err.stack);
        process.exit(1);
    }
};

runAllTests();
