const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5500;
const BASE_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const ROUTE_REWRITES = {
    '/': '/pages/login/login.html',
    '/login': '/pages/login/login.html',
    '/register': '/pages/register/register.html',
    '/register/register.html': '/pages/register/register.html',
    '/register.css': '/pages/register/register.css',
    '/register.js': '/pages/register/register.js',
    '/dashboard': '/pages/dashboard/dashboard.html',
    '/students': '/pages/students/students.html',
    '/teachers': '/pages/teachers/teachers.html',
    '/attendance': '/pages/attendance/attendance.html',
    '/teacher-attendance': '/pages/attendance/attendance.html',
    '/fees': '/pages/fees/fees.html',
    '/results': '/pages/results/results.html',
    '/settings': '/pages/settings/settings.html',
    '/login/login.html': '/pages/login/login.html',
    '/dashboard/dashboard.html': '/pages/dashboard/dashboard.html',
    '/students/students.html': '/pages/students/students.html',
    '/teachers/teachers.html': '/pages/teachers/teachers.html',
    '/attendance/attendance.html': '/pages/attendance/attendance.html',
    '/fees/fees.html': '/pages/fees/fees.html',
    '/results/results.html': '/pages/results/results.html',
    '/settings/settings.html': '/pages/settings/settings.html',
    '/login.css': '/pages/login/login.css',
    '/login.js': '/pages/login/login.js',
    '/dashboard.css': '/pages/dashboard/dashboard.css',
    '/dashboard.js': '/pages/dashboard/dashboard.js',
    '/students.css': '/pages/students/students.css',
    '/students.js': '/pages/students/students.js',
    '/teachers.css': '/pages/teachers/teachers.css',
    '/teachers.js': '/pages/teachers/teachers.js',
    '/attendance.css': '/pages/attendance/attendance.css',
    '/attendance.js': '/pages/attendance/attendance.js',
    '/fees.css': '/pages/fees/fees.css',
    '/fees.js': '/pages/fees/fees.js',
    '/results.css': '/pages/results/results.css',
    '/results.js': '/pages/results/results.js',
    '/settings.css': '/pages/settings/settings.css',
    '/settings.js': '/pages/settings/settings.js'
};

const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (ROUTE_REWRITES[reqPath]) {
        reqPath = ROUTE_REWRITES[reqPath];
    }

    // Strip leading slash for safe cross-platform resolution
    let cleanRelPath = reqPath.replace(/^\/+/, '');
    let filePath = path.join(BASE_DIR, cleanRelPath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`404 Not Found: ${reqPath}`);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`Frontend dev server running at http://localhost:${PORT}/`);
});
