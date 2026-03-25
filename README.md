# Custom New Tab

A self-hosted new tab page with bookmarks and a NASA APOD background. Runs as a Chrome extension, Firefox extension, or a LAN-hosted web app for devices that do not support extensions.

---

## How it works

The frontend is a single Angular app shared across all three deployment targets. On first launch, a setup screen collects the URLs of your two backend services:

| Service        | Purpose                                       | Default port |
| -------------- | --------------------------------------------- | ------------ |
| **PocketBase** | Bookmark storage and sync                     | `8090`       |
| **APOD proxy** | Fetches the NASA Astronomy Picture of the Day | `3001`       |

Bookmarks are cached locally in `localStorage` and synced to PocketBase. Failed writes are queued and replayed when the connection is restored. The APOD background is cached for the current day so it only fetches once per day.

---

## Features

- Reorderable bookmark grid with drag-and-drop
- Add, edit, and delete bookmarks
- Responsive layout (2–6 columns depending on screen width)
- Daily NASA APOD full-screen background
- Expandable "About Background" footer sheet with explanation text
- Local-first caching: grid renders instantly from `localStorage`, syncs to backend in the background
- Offline mutation queue: writes made offline are replayed automatically on reconnect
- First-run setup flow to configure backend URLs
- In-app settings to update URLs when hosts change
- PWA / service worker for app-shell caching (LAN-hosted target)
- Chrome extension, Firefox extension, and LAN-hosted web app build targets

---

## Development

**Requirements:** Node.js 20+, npm 11+

```bash
# Install dependencies
npm install

# Start the mock server (replaces both PocketBase and the APOD proxy)
npm run mock:start

# In a second terminal, start the Angular dev server
npm start
```

Open `http://localhost:4200`. On first run the setup screen appears — enter `http://localhost:3000` for both service URLs and click **Save & Continue**.

The mock server is a standalone local development tool only. It is not part of Docker Compose.

The mock server provides:

- `GET  /api/bookmarks` — in-memory bookmark list
- `POST /api/bookmarks` — create bookmark
- `PUT  /api/bookmarks/:id` — update bookmark
- `DELETE /api/bookmarks/:id` — delete bookmark
- `PUT  /api/bookmarks/reorder` — reorder bookmarks
- `GET  /api/collections/bookmarks/records` — PocketBase-compatible bookmark list response
- `POST /api/collections/bookmarks/records` — PocketBase-compatible bookmark create
- `PATCH /api/collections/bookmarks/records/:id` — PocketBase-compatible bookmark update
- `DELETE /api/collections/bookmarks/records/:id` — PocketBase-compatible bookmark delete
- `GET  /api/apod` — static dev APOD response (no network requests)
- `GET  /health` — liveness check

---

## Production / LAN deployment

**Requirements:** Docker and Docker Compose

```bash
# 1. Copy the example env file and adjust values
cp .env.example .env

# 2. Start the stack and build directly from GitHub
docker compose up -d --build
```

This starts one stack with three services:

- **web** — nginx serving the built Angular app (port `$WEB_PORT`, default `80`)
- **pocketbase** — bookmark persistence (port `$POCKETBASE_PORT`, default `8090`)
- **apod-proxy** — live APOD image fetcher (port `$APOD_PROXY_PORT`, default `3001`)

The `web`, `pocketbase`, and `apod-proxy` images are built by Docker directly from the GitHub repository configured in `.env`:

- `GIT_OWNER_REPO` — GitHub `owner/repo`
- `GIT_REF` — branch, tag, or commit ref to build
- `POCKETBASE_VERSION` — official PocketBase release version downloaded during the image build

Open `http://<your-server-ip>` in a browser. The setup screen asks for the two service URLs:

- **Bookmark service:** `http://<your-server-ip>:8090`
- **APOD service:** `http://<your-server-ip>:3001`

The configuration is stored in `localStorage` per device — complete setup once per browser.

### Optional HTTPS

Add to your `.env` and restart:

```env
ENABLE_TLS=true
TLS_CERT_PATH=/path/to/cert.pem
TLS_KEY_PATH=/path/to/key.pem
```

The nginx container mounts the certificate and key read-only, redirects HTTP → HTTPS, and terminates TLS at port `$WEB_TLS_PORT` (default `443`). If the cert/key files are missing or empty, the container automatically falls back to HTTP.

---

## Chrome extension

```bash
npm run build:chrome
```

Output: `dist/CustomNewTab/browser/`

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `dist/CustomNewTab/browser/`

---

## Firefox extension

```bash
npm run build:firefox
```

Output: `dist/CustomNewTab/browser/`

**Temporary load (testing):**

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…** → select `dist/CustomNewTab/browser/manifest.json`

**Permanent install:** Zip the output folder and submit to [addons.mozilla.org](https://addons.mozilla.org). Update the `gecko.id` in `apps/web/extension/firefox/manifest.json` to a unique identifier before submitting.

---

## PocketBase collection schema

After starting PocketBase for the first time, create a collection named **`bookmarks`** with these fields:

| Field            | Type   | Required |
| ---------------- | ------ | -------- |
| `title`          | Text   | ✓        |
| `url`            | URL    | ✓        |
| `order`          | Number | ✓        |
| `customImageUrl` | URL    | —        |

Set the collection API rules to allow read/write without authentication (or configure token-based access if you want access control).

> PocketBase admin UI: `http://<your-server>:8090/_/`

---

## Environment variables

| Variable             | Default                   | Description                                              |
| -------------------- | ------------------------- | -------------------------------------------------------- |
| `GIT_OWNER_REPO`     | `StarVore/custom-new-tab` | GitHub repository used as the Docker build source        |
| `GIT_REF`            | `main`                    | Branch, tag, or commit ref to build from                 |
| `POCKETBASE_VERSION` | `0.36.7`                  | PocketBase release version downloaded in the image build |
| `WEB_PORT`           | `80`                      | Host port for the web service (HTTP)                     |
| `WEB_TLS_PORT`       | `443`                     | Host port for the web service (HTTPS)                    |
| `POCKETBASE_PORT`    | `8090`                    | Host port for PocketBase                                 |
| `APOD_PROXY_PORT`    | `3001`                    | Host port for the APOD proxy                             |
| `PUID`               | `1000`                    | UID for PocketBase volume writes                         |
| `PGID`               | `1000`                    | GID for PocketBase volume writes                         |
| `TZ`                 | `UTC`                     | Timezone                                                 |
| `ENABLE_TLS`         | `false`                   | Set `true` to enable HTTPS                               |
| `TLS_CERT_PATH`      | `./certs/cert.pem`        | Host path to TLS certificate                             |
| `TLS_KEY_PATH`       | `./certs/key.pem`         | Host path to TLS private key                             |

---

## Troubleshooting

**Setup screen reappears on every visit**
Backend URLs are stored in `localStorage` per browser. Each browser or device must complete setup once.

**"Could not connect" on the test button**

- Verify the service is running: `docker compose ps`
- Check the port is reachable from your device (firewall, VPN, or subnet)
- If the frontend is served over HTTPS but backend URLs are HTTP, the browser may block mixed-content requests — serve everything over HTTPS or keep both over HTTP

**CORS errors in the browser console**
Both the mock server and APOD proxy return `Access-Control-Allow-Origin: *`. CORS errors usually mean the request is reaching the wrong host or port — double-check the URLs in Settings (⚙ icon on the home screen).

**Bookmarks not syncing after reconnect**
Failed writes are queued in `localStorage` under `bookmark_pending_mutations` and replayed when the browser fires the `online` event. To inspect or clear the queue manually, use DevTools → Application → Local Storage.

**TLS enabled but the site still serves HTTP**

- Confirm `ENABLE_TLS=true` in `.env`
- Confirm cert and key files are non-empty at the configured paths
- Recreate the container: `docker compose up -d --build --force-recreate web`

**Stale APOD background**
The background is cached for the current day under `apod_background` in `localStorage`. To force a refresh: `localStorage.removeItem('apod_background')` in the browser console, then reload.

**APOD proxy returns no image**
The proxy walks back up to 5 days when the current day is a video. If it still fails, check network access from the proxy container to `apod.nasa.gov`.

**Docker build is not using the version I expect**

- Check `GIT_OWNER_REPO` and `GIT_REF` in `.env`
- Rebuild explicitly: `docker compose build --no-cache`
- Pin `GIT_REF` to a tag or commit if you need reproducible deployments
