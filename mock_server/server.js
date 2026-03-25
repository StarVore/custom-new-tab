//

const http = require('http');
const path = require('path');
const fs = require('fs');
const port = process.env.PORT || 3000;

// Add mock routes here: { method, path, file } where file is relative to the JSONs folder
const routes = [
    { method: 'POST', path: '/api/test', file: 'test.json' },
];

function serveJson(res, file) {
    const filePath = path.join(__dirname, 'JSONs', file);
    fs.readFile(filePath, 'utf8', function (err, data) {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read ' + file }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
    });
}

const server = http.createServer(function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const route = routes.find(r => r.method === req.method && r.path === req.url);
    if (route) {
        serveJson(res, route.file);
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, function () {
    console.log('Mock server is running on http://localhost:' + port);
});