//

const http = require('http');
const path = require('path');
const fs = require('fs');
const port = process.env.PORT || 3000;

// Static APOD mock for development. Avoids hitting NASA during local dev.
// The real APOD fetch/fallback logic lives in services/apod-proxy.
const MOCK_APOD = {
    url: 'https://apod.nasa.gov/apod/image/0006/earthrise_apollo8_big.jpg',
    pageUrl: 'https://apod.nasa.gov/apod/ap000610.html',
    explanation: '[Dev mock] Earthrise — one of the most iconic photographs ever taken, captured by astronaut William Anders on December 24, 1968, during the Apollo 8 mission as the crew orbited the Moon.',
    fetchedAt: new Date().toISOString(),
};

async function fetchApod(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(MOCK_APOD));
}

function handleHealth(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
}

// --- Bookmark in-memory store ---
let bookmarks = [
    { id: '1', title: 'GitHub', url: 'https://github.com', order: 0 },
    { id: '2', title: 'YouTube', url: 'https://youtube.com', order: 1 },
    { id: '3', title: 'Google', url: 'https://google.com', order: 2 },
    { id: '4', title: 'Gmail', url: 'https://mail.google.com', order: 3 },
];
let nextBookmarkId = 5;
let bookmarkVisits = [];
let nextVisitId = 1;

function getSortedBookmarks() {
    return [...bookmarks].sort((a, b) => a.order - b.order);
}

function getPocketBaseListResponse() {
    return {
        page: 1,
        perPage: 200,
        totalItems: bookmarks.length,
        totalPages: 1,
        items: getSortedBookmarks(),
    };
}

function getVisitListResponse() {
    const sortedVisits = [...bookmarkVisits].sort((a, b) =>
        new Date(b.created).getTime() - new Date(a.created).getTime(),
    );

    return {
        page: 1,
        perPage: 500,
        totalItems: sortedVisits.length,
        totalPages: 1,
        items: sortedVisits,
    };
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => (data += chunk));
        req.on('end', () => {
            try { resolve(JSON.parse(data || '{}')); }
            catch (e) { reject(e); }
        });
    });
}

async function handleBookmarks(req, res) {
    const url = req.normalizedUrl || req.url;
    const method = req.method;

    // GET /api/collections/bookmarks/records
    if (method === 'GET' && url.startsWith('/api/collections/bookmarks/records')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getPocketBaseListResponse()));
        return;
    }

    // POST /api/collections/bookmarks/records
    if (method === 'POST' && url === '/api/collections/bookmarks/records') {
        const body = await readBody(req);
        const newBookmark = {
            id: String(nextBookmarkId++),
            title: body.title || '',
            url: body.url || '',
            order: typeof body.order === 'number' ? body.order : bookmarks.length,
            ...(body.customImageUrl ? { customImageUrl: body.customImageUrl } : {}),
        };
        bookmarks.push(newBookmark);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newBookmark));
        return;
    }

    // PATCH /api/collections/bookmarks/records/:id
    const patchRecordMatch = url.match(/^\/api\/collections\/bookmarks\/records\/([^/?]+)(?:\?.*)?$/);
    if (method === 'PATCH' && patchRecordMatch) {
        const id = patchRecordMatch[1];
        const bm = bookmarks.find(b => b.id === id);
        if (!bm) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Bookmark not found' }));
            return;
        }
        const body = await readBody(req);
        if (body.title !== undefined) bm.title = body.title;
        if (body.url !== undefined) bm.url = body.url;
        if (body.customImageUrl !== undefined) bm.customImageUrl = body.customImageUrl;
        if (body.order !== undefined) bm.order = body.order;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(bm));
        return;
    }

    // DELETE /api/collections/bookmarks/records/:id
    const deleteRecordMatch = url.match(/^\/api\/collections\/bookmarks\/records\/([^/?]+)(?:\?.*)?$/);
    if (method === 'DELETE' && deleteRecordMatch) {
        const id = deleteRecordMatch[1];
        const index = bookmarks.findIndex(b => b.id === id);
        if (index === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Bookmark not found' }));
            return;
        }
        bookmarks.splice(index, 1);
        res.writeHead(204);
        res.end();
        return;
    }

    // PUT /api/bookmarks/reorder — must be checked before /:id
    if (method === 'PUT' && url === '/api/bookmarks/reorder') {
        const body = await readBody(req);
        const ids = body.ids;
        if (!Array.isArray(ids)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'ids must be an array' }));
            return;
        }
        ids.forEach((id, index) => {
            const bm = bookmarks.find(b => b.id === String(id));
            if (bm) bm.order = index;
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getSortedBookmarks()));
        return;
    }

    // GET /api/bookmarks
    if (method === 'GET' && url === '/api/bookmarks') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getSortedBookmarks()));
        return;
    }

    // POST /api/bookmarks
    if (method === 'POST' && url === '/api/bookmarks') {
        const body = await readBody(req);
        const newBookmark = {
            id: String(nextBookmarkId++),
            title: body.title || '',
            url: body.url || '',
            order: typeof body.order === 'number' ? body.order : bookmarks.length,
            ...(body.customImageUrl ? { customImageUrl: body.customImageUrl } : {}),
        };
        bookmarks.push(newBookmark);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newBookmark));
        return;
    }

    // PUT /api/bookmarks/:id
    const putMatch = url.match(/^\/api\/bookmarks\/([^/]+)$/);
    if (method === 'PUT' && putMatch) {
        const id = putMatch[1];
        const bm = bookmarks.find(b => b.id === id);
        if (!bm) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Bookmark not found' }));
            return;
        }
        const body = await readBody(req);
        if (body.title !== undefined) bm.title = body.title;
        if (body.url !== undefined) bm.url = body.url;
        if (body.customImageUrl !== undefined) bm.customImageUrl = body.customImageUrl;
        if (body.order !== undefined) bm.order = body.order;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(bm));
        return;
    }

    // DELETE /api/bookmarks/:id
    const deleteMatch = url.match(/^\/api\/bookmarks\/([^/]+)$/);
    if (method === 'DELETE' && deleteMatch) {
        const id = deleteMatch[1];
        const index = bookmarks.findIndex(b => b.id === id);
        if (index === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Bookmark not found' }));
            return;
        }
        bookmarks.splice(index, 1);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
}

async function handleBookmarkVisits(req, res) {
    const url = req.normalizedUrl || req.url;
    const method = req.method;

    if (method === 'GET' && url.startsWith('/api/collections/bookmark_visits/records')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getVisitListResponse()));
        return;
    }

    if (method === 'POST' && url === '/api/collections/bookmark_visits/records') {
        const body = await readBody(req);
        const now = new Date().toISOString();
        const newVisit = {
            id: String(nextVisitId++),
            bookmarkId: body.bookmarkId || '',
            bookmarkTitle: body.bookmarkTitle || '',
            bookmarkUrl: body.bookmarkUrl || '',
            source: body.source || 'web',
            context: body.context || '',
            platform: body.platform || '',
            userAgent: body.userAgent || '',
            created: now,
            updated: now,
        };

        bookmarkVisits.push(newVisit);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newVisit));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
}

// Add mock routes here:
// - { method, path, file }    serves a static JSON file from the JSONs folder
// - { method, path, handler } calls a custom async handler function
const routes = [
    { method: 'POST', path: '/api/test', file: 'test.json' },
    { method: 'GET', path: '/health', handler: handleHealth },
    { method: 'GET', path: '/api/apod', handler: fetchApod },
];

function normalizeServicePath(url) {
    const [pathname, queryString] = url.split('?');

    let normalizedPath = pathname;
    if (pathname === '/pb' || pathname.startsWith('/pb/')) {
        normalizedPath = pathname.slice('/pb'.length) || '/';
    } else if (pathname === '/apod' || pathname.startsWith('/apod/')) {
        normalizedPath = pathname.slice('/apod'.length) || '/';
    }

    return queryString ? `${normalizedPath}?${queryString}` : normalizedPath;
}

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

function applyCors(req, res) {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

    const requestedHeaders = req.headers['access-control-request-headers'];
    res.setHeader('Access-Control-Allow-Headers', requestedHeaders || 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Chrome may require this for secure-context -> private-network preflights.
    if (req.headers['access-control-request-private-network'] === 'true') {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
}

const server = http.createServer(function (req, res) {
    applyCors(req, res);
    req.normalizedUrl = normalizeServicePath(req.url);
    const normalizedPath = req.normalizedUrl.split('?')[0];

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Bookmark routes (legacy + PocketBase-style)
    if (
        normalizedPath.startsWith('/api/bookmarks') ||
        normalizedPath.startsWith('/api/collections/bookmarks/records')
    ) {
        handleBookmarks(req, res);
        return;
    }

    if (normalizedPath.startsWith('/api/collections/bookmark_visits/records')) {
        handleBookmarkVisits(req, res);
        return;
    }

    const route = routes.find(r => r.method === req.method && r.path === normalizedPath);
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