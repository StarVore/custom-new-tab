# APOD Proxy Service

This folder is reserved for the dedicated APOD proxy service.

Phase 1 includes a scaffold `server.js` that exposes:

- `GET /health`
- `GET /api/apod` (returns `501 Not Implemented`)

In Phase 2, move the APOD fetch/parse/fallback logic here from the mock server.
