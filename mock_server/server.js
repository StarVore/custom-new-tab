//

const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const port = process.env.PORT || 3000;

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function fetchApod(req, res) {
    const MAX_DAYS_BACK = 5;
    try {
        console.log('Fetching latest APOD image...');
        const archiveHtml = await httpsGet('https://apod.nasa.gov/apod/archivepix.html');
        const pageLinks = [...archiveHtml.matchAll(/href="(ap\d{6}\.html)"/g)].map(m => m[1]);
        if (!pageLinks.length) throw new Error('Could not find any APOD page links');

        for (let i = 0; i < Math.min(MAX_DAYS_BACK, pageLinks.length); i++) {
            const pageUrl = `https://apod.nasa.gov/apod/${pageLinks[i]}`;
            const apodHtml = await httpsGet(pageUrl);
            const imgMatch = apodHtml.match(/<img[^>]+src="(image\/[^"]+)"/i);
            if (imgMatch) {
                const imageUrl = `https://apod.nasa.gov/apod/${imgMatch[1]}`;
                const explanationMatch = apodHtml.match(/<b>\s*Explanation:\s*<\/b>\s*(.*?)<p>/is);
                const explanation = explanationMatch
                    ? explanationMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                    : '';
                console.log(`Found APOD image on entry ${i + 1}: ${imageUrl}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ url: imageUrl, pageUrl, explanation, fetchedAt: new Date().toISOString() }));
                return;
            }
            console.log(`Entry ${i + 1} (${pageLinks[i]}) is a video day, trying next...`);
        }

        throw new Error(`No image found in the last ${MAX_DAYS_BACK} APOD entries`);
    } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    }
}

// Add mock routes here:
// - { method, path, file }    serves a static JSON file from the JSONs folder
// - { method, path, handler } calls a custom async handler function
const routes = [
    { method: 'POST', path: '/api/test', file: 'test.json' },
    { method: 'GET', path: '/api/apod', handler: fetchApod },
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
        if (route.handler) {
            route.handler(req, res);
        } else {
            serveJson(res, route.file);
        }
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, function () {
    console.log('Mock server is running on http://localhost:' + port);
});