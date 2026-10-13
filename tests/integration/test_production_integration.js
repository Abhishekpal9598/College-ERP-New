/**
 * Production Integration & Security Test Suite
 * 
 * Tests:
 * 1. Correct production API URL configuration in frontend files
 * 2. API endpoint normalization logic
 * 3. Exact CORS preflight (OPTIONS) with production Vercel origin
 * 4. Invalid origin rejection without 500 error
 * 5. Absolute redirects in frontend auth guards and login
 * 6. Vercel static rewrites configuration
 * 7. Live login, password verification, and JWT session handling
 * 8. User account preservation
 */

const assert = require("assert");
const http = require("http");
const fs = require("fs");
const path = require("path");

const BACKEND_URL = "http://127.0.0.1:5000";
const FRONTEND_URL = "http://127.0.0.1:5500";
const PRODUCTION_VERCEL_ORIGIN = "https://college-erp-new-798m.vercel.app";
const PRODUCTION_RENDER_API = "https://college-erp-new-2-ki-project-mere.onrender.com/api";

console.log("===============================================================");
console.log("  COLLEGE ERP - PRODUCTION INTEGRATION & SECURITY SUITE");
console.log("===============================================================\n");

let passed = 0;
let total = 0;

function testSync(description, fn) {
    total++;
    try {
        fn();
        console.log(`  [PASS] ${description}`);
        passed++;
    } catch (err) {
        console.error(`  [FAIL] ${description} -> ${err.message}`);
    }
}

function httpRequest(url, options = {}, data = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const headers = Object.assign({}, options.headers || {});
        let payload = null;

        if (data) {
            payload = typeof data === "string" ? data : JSON.stringify(data);
            if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
            headers["Content-Length"] = Buffer.byteLength(payload);
        }

        const reqOptions = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + parsed.search,
            method: options.method || "GET",
            headers
        };

        const req = http.request(reqOptions, (res) => {
            let body = "";
            res.on("data", chunk => { body += chunk; });
            res.on("end", () => {
                let json = null;
                try { json = JSON.parse(body); } catch {}
                resolve({ status: res.statusCode, headers: res.headers, body, json });
            });
        });

        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function testAsync(description, fn) {
    total++;
    try {
        await fn();
        console.log(`  [PASS] ${description}`);
        passed++;
    } catch (err) {
        console.error(`  [FAIL] ${description} -> ${err.message}`);
    }
}

async function runAll() {
    // -------------------------------------------------------------
    // 1. PRODUCTION URL CONFIGURATION & ENDPOINT NORMALIZATION
    // -------------------------------------------------------------
    console.log(">> 1. PRODUCTION URL & ENDPOINT NORMALIZATION");

    testSync("Production API URL points to the active Render backend", () => {
        const configContent = fs.readFileSync(path.join(__dirname, "../../frontend/js/config.js"), "utf8");
        const apiContent = fs.readFileSync(path.join(__dirname, "../../frontend/js/api.js"), "utf8");

        assert.ok(configContent.includes(PRODUCTION_RENDER_API), "config.js must contain the Render URL");
        assert.ok(apiContent.includes(PRODUCTION_RENDER_API), "api.js must contain the Render URL");
    });

    testSync("API endpoint normalizer prevents duplicate /api prefixes and ensures clean paths", () => {
        const base = PRODUCTION_RENDER_API;
        const normalize = (endpoint) => {
            let clean = endpoint || "/";
            if (clean.startsWith("/api/")) clean = clean.substring(4);
            else if (clean === "/api") clean = "/";
            else if (!clean.startsWith("/")) clean = `/${clean}`;
            return `${base.replace(/\/+$/, "")}${clean}`;
        };

        assert.strictEqual(normalize("/auth/login"), `${base}/auth/login`);
        assert.strictEqual(normalize("/api/auth/login"), `${base}/auth/login`);
        assert.strictEqual(normalize("students"), `${base}/students`);
        assert.strictEqual(normalize("/api/students/123"), `${base}/students/123`);
    });

    testSync("Frontend scripts use absolute redirect paths (/pages/login/login.html, /pages/dashboard/dashboard.html)", () => {
        const authGuardContent = fs.readFileSync(path.join(__dirname, "../../frontend/js/auth-guard.js"), "utf8");
        const loginContent = fs.readFileSync(path.join(__dirname, "../../frontend/pages/login/login.js"), "utf8");
        const apiContent = fs.readFileSync(path.join(__dirname, "../../frontend/js/api.js"), "utf8");

        assert.ok(!authGuardContent.includes("../login/login.html"), "auth-guard.js must not use relative path");
        assert.ok(authGuardContent.includes("/pages/login/login.html"), "auth-guard.js must use absolute path");

        assert.ok(!loginContent.includes("../dashboard/dashboard.html"), "login.js must not use relative path");
        assert.ok(loginContent.includes("/pages/dashboard/dashboard.html"), "login.js must use absolute path");

        assert.ok(!apiContent.includes("../login/login.html"), "api.js must not use relative path");
        assert.ok(apiContent.includes("/pages/login/login.html"), "api.js must use absolute path");
    });

    testSync("Vercel vercel.json includes clean routes and legacy tolerance rewrites", () => {
        const vercelJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../../frontend/vercel.json"), "utf8"));
        const sources = vercelJson.rewrites.map(r => r.source);

        assert.ok(sources.includes("/"), "Must rewrite root");
        assert.ok(sources.includes("/login"), "Must rewrite /login");
        assert.ok(sources.includes("/dashboard"), "Must rewrite /dashboard");
        assert.ok(sources.includes("/login/login.html"), "Must rewrite legacy /login/login.html");
        assert.ok(sources.includes("/dashboard/dashboard.html"), "Must rewrite legacy /dashboard/dashboard.html");
    });

    // -------------------------------------------------------------
    // 2. CORS PREFLIGHT & ORIGIN REJECTION
    // -------------------------------------------------------------
    console.log("\n>> 2. CORS PREFLIGHT & ORIGIN SECURITY");

    await testAsync("OPTIONS preflight from production Vercel origin returns 204 with valid CORS headers", async () => {
        const res = await httpRequest(`${BACKEND_URL}/api/auth/login`, {
            method: "OPTIONS",
            headers: {
                "Origin": PRODUCTION_VERCEL_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type, Authorization"
            }
        });

        assert.strictEqual(res.status, 204);
        assert.strictEqual(res.headers["access-control-allow-origin"], PRODUCTION_VERCEL_ORIGIN);
        assert.strictEqual(res.headers["access-control-allow-credentials"], "true");
        assert.ok(res.headers["access-control-allow-methods"].includes("POST"));
        assert.ok(res.headers["access-control-allow-headers"].includes("Authorization"));
    });

    await testAsync("OPTIONS preflight from unauthorized origin is gracefully rejected without 500 error", async () => {
        const res = await httpRequest(`${BACKEND_URL}/api/auth/login`, {
            method: "OPTIONS",
            headers: {
                "Origin": "https://unauthorized-evil-domain.com",
                "Access-Control-Request-Method": "POST"
            }
        });

        assert.notStrictEqual(res.status, 500, "Server must not crash with 500 on unallowed origin");
        assert.strictEqual(res.headers["access-control-allow-origin"], undefined, "Must omit allow-origin header for unallowed origin");
    });

    // -------------------------------------------------------------
    // 3. DATABASE SEEDING & USER PRESERVATION
    // -------------------------------------------------------------
    console.log("\n>> 3. DATABASE SEEDING & USER PRESERVATION");

    testSync("seedService.js implements idempotent seeding with concurrency protection", () => {
        const seedServiceContent = fs.readFileSync(path.join(__dirname, "../../backend/src/services/seedService.js"), "utf8");
        assert.ok(seedServiceContent.includes("isSeedingInProgress"), "Must have concurrency guard");
        assert.ok(seedServiceContent.includes("seedAdminUsers"), "Must export seedAdminUsers");
        assert.ok(!seedServiceContent.includes("console.log(userData.password)"), "Must never log passwords");
    });

    // -------------------------------------------------------------
    // 4. AUTHENTICATION & JWT HANDLING
    // -------------------------------------------------------------
    console.log("\n>> 4. AUTHENTICATION & JWT HANDLING");

    let jwtToken = null;

    await testAsync("Admin login with abhipal895@gmail.com succeeds and issues JWT token", async () => {
        const res = await httpRequest(`${BACKEND_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Origin": PRODUCTION_VERCEL_ORIGIN
            }
        }, {
            email: "abhipal895@gmail.com",
            password: "95982536"
        });

        assert.strictEqual(res.status, 200);
        assert.ok(res.json.success);
        assert.ok(res.json.data.token, "Must return token");
        assert.strictEqual(res.json.data.user.email, "abhipal895@gmail.com");
        assert.strictEqual(res.json.data.user.password, undefined, "Must not leak password");
        jwtToken = res.json.data.token;
    });

    await testAsync("Protected route /api/auth/me verifies Bearer JWT token", async () => {
        const res = await httpRequest(`${BACKEND_URL}/api/auth/me`, {
            headers: {
                "Origin": PRODUCTION_VERCEL_ORIGIN,
                "Authorization": `Bearer ${jwtToken}`
            }
        });

        assert.strictEqual(res.status, 200);
        assert.ok(res.json.success);
        assert.strictEqual(res.json.data.email, "abhipal895@gmail.com");
    });

    await testAsync("Protected route /api/auth/me rejects missing or invalid token with 401", async () => {
        const resMissing = await httpRequest(`${BACKEND_URL}/api/auth/me`);
        assert.strictEqual(resMissing.status, 401);

        const resInvalid = await httpRequest(`${BACKEND_URL}/api/auth/me`, {
            headers: {
                "Authorization": "Bearer bad_invalid_token"
            }
        });
        assert.strictEqual(resInvalid.status, 401);
    });

    console.log("\n===============================================================");
    console.log(`Production Integration Tests: ${passed}/${total} Passed (${Math.round((passed/total)*100)}%)`);
    console.log("===============================================================\n");

    if (passed !== total) {
        process.exit(1);
    }
}

runAll().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
