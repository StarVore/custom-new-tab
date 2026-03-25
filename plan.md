# Plan: Publishable Self-Hosted New Tab Platform

## TL;DR

Refactor the project into a multi-service layout with one shared frontend and separate backend services. Keep a strict mock backend for development, add a dedicated APOD proxy for real deployments, and use PocketBase for bookmark sync. Add first-run backend configuration in the app so users can self-host services and point clients to their own URLs. Support three frontend distribution targets: Chrome extension, Firefox extension, and LAN-hosted site for devices that do not support extensions. Keep TLS optional via Docker Compose environment variables and user-provided certificate paths.

---

## Decisions

- Repository structure becomes app-plus-services:
- apps/web for Angular frontend
- services/mock-server for development-only API replacement
- services/apod-proxy for production APOD fetching
- services/pocketbase for data persistence and operational scripts
- Development mode uses mock-server instead of PocketBase
- Production/LAN mode uses PocketBase for bookmarks and APOD proxy for image metadata
- First-run setup screen collects:
- Bookmark backend base URL
- APOD backend base URL
- Docker Compose is fully env-configurable:
- Service ports
- PUID and PGID
- Timezone
- Optional TLS toggle and cert/key paths
- TLS remains optional:
- HTTP works out of the box
- HTTPS enabled only when explicitly configured
- Frontend target support:
- Chrome extension
- Firefox extension
- LAN-hosted web app for non-extension clients
- Offline behavior remains cache-first with local persistence and queued mutation replay

---

## Phase 1 — Repository Restructure

1. Move Angular application to apps/web
2. Move current mock backend into services/mock-server
3. Create services/apod-proxy for real APOD retrieval and parsing
4. Keep root as orchestration layer for Compose, docs, and scripts
5. Update build configs and paths to new folder structure

---

## Phase 2 — Backend Service Boundaries

6. Keep services/mock-server as development-only replacement for bookmark and APOD APIs
7. Ensure services/apod-proxy is dedicated to APOD retrieval for production/LAN use
8. APOD proxy response contract includes:
9. url
10. pageUrl
11. explanation
12. fetchedAt
13. Preserve APOD fallback logic by walking backward through previous days until image media is found
14. Keep PocketBase focused on bookmark persistence and sync

---

## Phase 3 — First-Run Configuration UX

15. Add setup screen shown on first app launch per device
16. Collect bookmark backend URL and APOD backend URL
17. Add connection test actions for both services before save
18. Persist configuration locally on device
19. Add route guard to block normal app routes until config exists
20. Add settings flow to edit backend URLs later if host/IP/ports change

---

## Phase 4 — Compose Profiles and Environment Variables

21. Add root docker-compose with profile support:
22. dev profile:
23. web-dev
24. mock-server
25. prod profile:
26. web-static
27. pocketbase
28. apod-proxy
29. optional reverse proxy
30. Add root env template with configurable values:
31. WEB_PORT
32. POCKETBASE_PORT
33. APOD_PROXY_PORT
34. MOCK_SERVER_PORT
35. PUID
36. PGID
37. TZ
38. ENABLE_TLS
39. TLS_CERT_PATH
40. TLS_KEY_PATH
41. Apply PUID and PGID mapping where persistent volume writes occur

---

## Phase 5 — Optional SSL Support

42. Add reverse proxy in production profile for optional TLS termination
43. Keep default mode HTTP-only with no certificate requirements
44. Enable HTTPS only when ENABLE_TLS is true
45. Mount user certificate and key using TLS_CERT_PATH and TLS_KEY_PATH
46. Validate both startup paths:
47. TLS disabled with no cert paths
48. TLS enabled with cert paths present

---

## Phase 6 — Frontend Packaging Targets

49. Add Chrome extension build target
50. Add Firefox extension build target
51. Add LAN-hosted site build target for non-extension devices
52. Keep one shared frontend codebase and setup flow across all targets
53. Preserve offline app-shell capability for LAN-hosted target

---

## Phase 7 — Data, Cache, and Sync Behavior

54. Keep local cache as immediate read path
55. Keep optimistic updates for bookmark interactions
56. Keep queued mutation replay on reconnect
57. Route bookmark operations to configured bookmark backend URL
58. Route APOD operations to configured APOD backend URL
59. Ensure app is still usable when backend is temporarily unreachable

---

## Phase 8 — Documentation and Publishability

60. Rewrite README as operator-focused deployment guide
61. Include install flows for:
62. Chrome extension
63. Firefox extension
64. LAN-hosted site
65. Document development versus production Compose usage
66. Document PocketBase collection schema and required fields
67. Document first-run backend URL setup values
68. Add troubleshooting for:
69. bad URL or port config
70. cert/key mounting issues
71. CORS and mixed-content issues
72. stale local config values
73. offline queue replay behavior

---

## Relevant Files

- docker-compose.yml
- .env.example
- apps/web
- services/mock-server
- services/apod-proxy
- services/pocketbase
- README.md
- package.json
- angular.json

---

## Verification

1. Dev profile starts and app works fully using mock-server only
2. Prod profile starts and app syncs bookmarks through PocketBase
3. APOD proxy returns image metadata and handles video-day fallback
4. First-run setup appears and stores backend URLs
5. Editing backend URLs later updates service connectivity
6. Offline mode loads cached app data and replays queued mutations on reconnect
7. TLS disabled mode works without cert files
8. TLS enabled mode works with provided cert/key mounts
9. Chrome extension build is installable and functional
10. Firefox extension build is installable and functional
11. LAN-hosted site is reachable on local network and works on devices without extension support

---

## Further Considerations

1. Reverse proxy choice: Caddy for simpler optional TLS setup, or nginx for tighter manual control
2. Extension packaging conventions: output structure and release artifact naming
3. Migration strategy: one structural refactor first, then service split and setup UX in follow-up work to reduce risk
