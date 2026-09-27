const http = require('http');

const PORT = 5500;
const filesToTest = [
    '/public/index.html',
    '/pages/login/login.html',
    '/pages/login/login.css',
    '/pages/login/login.js',
    '/pages/dashboard/dashboard.html',
    '/pages/dashboard/dashboard.css',
    '/pages/dashboard/dashboard.js',
    '/pages/students/students.html',
    '/pages/students/students.css',
    '/pages/students/students.js',
    '/pages/teachers/teachers.html',
    '/pages/teachers/teachers.css',
    '/pages/teachers/teachers.js',
    '/pages/attendance/attendance.html',
    '/pages/attendance/attendance.css',
    '/pages/attendance/attendance.js',
    '/pages/fees/fees.html',
    '/pages/fees/fees.css',
    '/pages/fees/fees.js',
    '/pages/results/results.html',
    '/pages/results/results.css',
    '/pages/results/results.js',
    '/pages/settings/settings.html',
    '/pages/settings/settings.css',
    '/pages/settings/settings.js',
    '/js/api.js',
    '/js/auth-guard.js',
    '/js/config.js'
];

async function runTests() {
    let allPassed = true;
    for (const urlPath of filesToTest) {
        await new Promise((resolve) => {
            http.get(`http://localhost:${PORT}${urlPath}`, (res) => {
                if (res.statusCode === 200) {
                    console.log(`[PASS] ${res.statusCode} : ${urlPath}`);
                } else {
                    console.error(`[FAIL] ${res.statusCode} : ${urlPath}`);
                    allPassed = false;
                }
                res.resume();
                resolve();
            }).on('error', (err) => {
                console.error(`[ERROR] ${urlPath}: ${err.message}`);
                allPassed = false;
                resolve();
            });
        });
    }

    if (allPassed) {
        console.log("\n>>> ALL FRONTEND ROUTES AND ASSETS VERIFIED SUCCESSFULLY (HTTP 200 OK) <<<");
    } else {
        console.error("\n>>> SOME ROUTES FAILED <<<");
        process.exit(1);
    }
}

runTests();
