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
    '/': '/index.html',
    '/login': '/pages/login/login.html',
    '/dashboard': '/pages/dashboard/dashboard.html',
    '/students': '/pages/students/students.html',
    '/teachers': '/pages/teachers/teachers.html',
    '/attendance': '/pages/attendance/attendance.html',
    '/fees': '/pages/fees/fees.html',
    '/results': '/pages/results/results.html',
    '/settings': '/pages/settings/settings.html'
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
