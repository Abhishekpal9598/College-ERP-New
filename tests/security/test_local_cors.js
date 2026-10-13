const http = require("http");

const originsToTest = [
    { origin: "https://college-erp-new-798m.vercel.app", expectedAllow: true },
    { origin: "https://college-erp-new.vercel.app", expectedAllow: true },
    { origin: "https://college-erp-new-git-main-abhishekpal9598s-projects.vercel.app", expectedAllow: true },
    { origin: "https://college-erp-new-deploy-123.vercel.app", expectedAllow: true },
    { origin: "http://localhost:5500", expectedAllow: true },
    { origin: "https://malicious-site.com", expectedAllow: false },
    { origin: "https://other-unrelated.vercel.app", expectedAllow: false }
];

function testLocalCors(origin) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: "127.0.0.1",
            port: 5000,
            path: "/api/auth/login",
            method: "OPTIONS",
            headers: {
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type,Authorization"
            }
        }, (res) => {
            resolve({
                origin,
                status: res.statusCode,
                allowOrigin: res.headers["access-control-allow-origin"]
            });
        });
        req.on("error", err => resolve({ origin, error: err.message }));
        req.end();
    });
}

async function run() {
    console.log("=== Testing Local CORS Preflight Configuration ===");
    let allPassed = true;
    for (const item of originsToTest) {
        const res = await testLocalCors(item.origin);
        const isAllowed = res.allowOrigin === item.origin;
        const matchesExpected = isAllowed === item.expectedAllow;
        if (!matchesExpected) allPassed = false;
        console.log(`[${matchesExpected ? "PASS" : "FAIL"}] Origin: ${item.origin}`);
        console.log(`       Status: ${res.status}, Allow-Origin: ${res.allowOrigin || "none"} (Expected allowed: ${item.expectedAllow})`);
    }

    if (allPassed) {
        console.log("\nALL CORS PREFLIGHT TESTS PASSED (100%)!");
    } else {
        console.error("\nSOME CORS PREFLIGHT TESTS FAILED!");
        process.exit(1);
    }
}

run();
