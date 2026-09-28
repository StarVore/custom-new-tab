const http = require('http');
const https = require('https');
const fs = require('fs');

const port = process.env.PORT || 3001;
const useTls = String(process.env.APOD_ENABLE_TLS || 'false').toLowerCase() === 'true';
const tlsCertPath = process.env.APOD_TLS_CERT_PATH || '/etc/nginx/certs/cert.pem';
const tlsKeyPath = process.env.APOD_TLS_KEY_PATH || '/etc/nginx/certs/key.pem';
const MAX_DAYS_BACK = 5;
const HTML_ENTITY_MAP = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

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

function decodeHtmlEntities(text) {
  return text.replace(/&(#x?[\da-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const isHex = entity[1]?.toLowerCase() === 'x';
      const value = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);

      return Number.isNaN(value) ? match : String.fromCodePoint(value);
    }

    return HTML_ENTITY_MAP[entity.toLowerCase()] ?? match;
  });
}

function normalizeExplanationText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(br|\/p|p)\b[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .replace(/(^|[\s([{])(["'])\s+/g, '$1$2')
    .replace(/\s+([)\]}])/g, '$1')
    .replace(/\s+(["'])(?=$|[\s,.;:!?)}\]])/g, '$1')
    .trim();
}

// science.nasa.gov serves the archive listing via this content-list REST endpoint (the
// static archivepix.html page was retired when apod.nasa.gov moved to science.nasa.gov/apod).
const APOD_LIST_URL =
  'https://science.nasa.gov/wp-json/smd/v1/content-list/?' +
  new URLSearchParams({
    block_id: 'content-list-9fb5c5e7-d4b9-45f0-b5b2-12831adebef5',
    'post_types[]': 'image-article',
    base_terms: JSON.stringify({ category: '22766', 'science-org': '', 'internal-terms': '', 'news-tags': '' }),
    number_of_items: String(MAX_DAYS_BACK + 5),
    order: 'DESC',
    orderby: 'date',
    current_page: '1',
    response_format: 'html',
  }).toString();

async function fetchLatestApodImage() {
  const listResponse = JSON.parse(await httpsGet(APOD_LIST_URL));
  const pageLinks = [
    ...new Set([...listResponse.content.matchAll(/href="(https:\/\/science\.nasa\.gov\/image-article\/apod-[^"]+)"/g)].map((m) => m[1])),
  ];

  if (!pageLinks.length) {
    throw new Error('Could not find any APOD page links in archive');
  }

  for (let i = 0; i < Math.min(MAX_DAYS_BACK, pageLinks.length); i++) {
    const pageUrl = pageLinks[i];
    const apodHtml = await httpsGet(pageUrl);

    if (/<meta property="og:video"/i.test(apodHtml)) {
      console.log(`Entry ${i + 1} (${pageUrl}) is a video — skipping`);
      continue;
    }

    const imgMatch = apodHtml.match(/<meta property="og:image" content="([^"]+)"/i);

    if (!imgMatch) {
      console.log(`Entry ${i + 1} (${pageUrl}) has no image — skipping`);
      continue;
    }

    const imageUrl = decodeHtmlEntities(imgMatch[1]);
    const explanationMatch = apodHtml.match(/<strong>\s*Explanation:\s*<\/strong>\s*(.*?)<\/p>/is);
    const explanation = explanationMatch ? normalizeExplanationText(explanationMatch[1]) : '';

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

const requestHandler = (req, res) => {
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
};

function startServer() {
  let server;
  if (useTls) {
    let cert;
    let key;
    try {
      cert = fs.readFileSync(tlsCertPath);
      key = fs.readFileSync(tlsKeyPath);
    } catch (err) {
      console.error(`Failed to read APOD TLS files at ${tlsCertPath} and ${tlsKeyPath}:`, err.message);
      process.exit(1);
    }

    server = https.createServer({ cert, key }, requestHandler);
  } else {
    server = http.createServer(requestHandler);
  }

  server.listen(port, () => {
    const protocol = useTls ? 'https' : 'http';
    console.log(`APOD proxy running on ${protocol}://localhost:${port}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  decodeHtmlEntities,
  normalizeExplanationText,
  startServer,
};
