# APOD Proxy Service

Dedicated production service for fetching and parsing NASA's Astronomy Picture of the Day.

## Endpoints

| Method | Path        | Description                        |
| ------ | ----------- | ---------------------------------- |
| GET    | `/health`   | Returns `{ status: "ok" }`         |
| GET    | `/api/apod` | Returns the latest APOD image data |

## Response contract (`GET /api/apod`)

```json
{
  "url": "https://apod.nasa.gov/apod/image/...",
  "pageUrl": "https://apod.nasa.gov/apod/apYYMMDD.html",
  "explanation": "...",
  "fetchedAt": "2026-03-25T12:00:00.000Z"
}
```

## Fallback behavior

The service walks backward through the APOD archive (up to 5 entries) until it finds a day with an image. Video-of-the-day entries are skipped automatically.

## Running

```bash
# Default port 3001
node server.js

# Custom port
PORT=4001 node server.js
```

## Development vs production

- **Development**: Use `services/mock-server` instead. It returns a static APOD mock response so local dev does not depend on NASA's website.
- **Production / LAN**: Use this service. It fetches and parses live APOD data from NASA.
