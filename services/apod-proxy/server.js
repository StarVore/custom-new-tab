const http = require('http');
const https = require('https');

const port = process.env.PORT || 3001;
const MAX_DAYS_BACK = 5;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

async function fetchLatestApodImage() {
  const archiveHtml = await httpsGet('https://apod.nasa.gov/apod/archivepix.html');
  const pageLinks = [...archiveHtml.matchAll(/href="(ap\d{6}\.html)"/g)].map((m) => m[1]);

  if (!pageLinks.length) {
    throw new Error('Could not find any APOD page links in archive');
  }

  for (let i = 0; i < Math.min(MAX_DAYS_BACK, pageLinks.length); i++) {
    const pageUrl = `https://apod.nasa.gov/apod/${pageLinks[i]}`;
    const apodHtml = await httpsGet(pageUrl);
    const imgMatch = apodHtml.match(/<img[^>]+src="(image\/[^"]+)"/i);

    if (!imgMatch) {
      console.log(`Entry ${i + 1} (${pageLinks[i]}) has no image — skipping (likely a video day)`);
      continue;
    }

    const imageUrl = `https://apod.nasa.gov/apod/${imgMatch[1]}`;
    const explanationMatch = apodHtml.match(/<b>\s*Explanation:\s*<\/b>\s*(.*?)<p>/is);
    const explanation = explanationMatch
      ? explanationMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : '';

    console.log(`Found APOD image on entry ${i + 1}: ${imageUrl}`);
    return { url: imageUrl, pageUrl, explanation, fetchedAt: new Date().toISOString() };
  }

  throw new Error(`No image found in the last ${MAX_DAYS_BACK} APOD entries`);
}

async function handleApod(req, res) {
  try {
    const photo = await fetchLatestApodImage();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(photo));
  } catch (err) {
    console.error('APOD fetch error:', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  const requestedHeaders = req.headers['access-control-request-headers'];
  res.setHeader('Access-Control-Allow-Headers', requestedHeaders || 'Content-Type');

  // Chrome may require this for secure-context -> private-network preflights.
  if (req.headers['access-control-request-private-network'] === 'true') {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
}

const server = http.createServer((req, res) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/apod') {
    handleApod(req, res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, () => {
  console.log(`APOD proxy running on http://localhost:${port}`);
});
