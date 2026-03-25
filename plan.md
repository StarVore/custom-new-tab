# Plan: Single GitHub Compose Stack

## TL;DR

Run the LAN-hosted deployment as a single Docker Compose stack containing `web`, `pocketbase`, and `apod-proxy`. Remove the mock server from Compose entirely, keep it only as a standalone local development tool, and have Docker build the web app and APOD proxy directly from the GitHub repository using a configurable branch or tag ref. Keep TLS optional via environment variables and user-provided certificate paths. Keep Chrome and Firefox extension packaging outside Docker.

---

## Decisions

- Docker Compose becomes a single production-oriented stack with no profile split
- `mock-server` is removed from Compose and remains a standalone local development tool only
- `web`, `pocketbase`, and `apod-proxy` ship together in the default stack
- Docker builds `web` and `apod-proxy` directly from GitHub using configurable repo/ref values
- PocketBase remains an external image dependency and stays in the same stack
- First-run setup screen collects:
- Bookmark backend base URL
- APOD backend base URL
- Docker Compose remains env-configurable for:
- GitHub repo and ref
- Service ports
- PUID and PGID
- Timezone
- Optional TLS toggle and cert/key paths
- TLS remains optional:
- HTTP works out of the box
- HTTPS enabled only when explicitly configured
- Frontend target support remains:
- Chrome extension
- Firefox extension
- LAN-hosted web app for non-extension clients
- Extension builds remain outside Docker
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

## Phase 4 — Single Stack Compose and Environment Variables

21. Remove Compose profile support and define one default production-oriented stack
22. Exclude `mock-server` from Compose entirely
23. Keep `web`, `pocketbase`, and `apod-proxy` together under one stack
24. Build `web` from the GitHub repository instead of the local workspace
25. Build `apod-proxy` from the GitHub repository instead of the local workspace
26. Add root env template with configurable values:
27. GIT_OWNER_REPO
28. GIT_REF
29. WEB_PORT
30. POCKETBASE_PORT
31. APOD_PROXY_PORT
32. PUID
33. PGID
34. TZ
35. ENABLE_TLS
36. TLS_CERT_PATH
37. TLS_KEY_PATH
38. Apply PUID and PGID mapping where persistent volume writes occur

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
65. Document single-stack Compose usage and GitHub-backed builds
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
- README.md
- package.json
- angular.json

---

## Verification

1. `docker compose config` resolves to only `web`, `pocketbase`, and `apod-proxy`
2. The `web` image builds successfully from the configured GitHub repo/ref
3. The `apod-proxy` image builds successfully from the configured GitHub repo/ref
4. The stack starts and the app syncs bookmarks through PocketBase
5. APOD proxy returns image metadata and handles video-day fallback
6. First-run setup appears and stores backend URLs
7. Editing backend URLs later updates service connectivity
8. Offline mode loads cached app data and replays queued mutations on reconnect
9. TLS disabled mode works without cert files
10. TLS enabled mode works with provided cert/key mounts
11. Chrome extension build is installable and functional
12. Firefox extension build is installable and functional
13. LAN-hosted site is reachable on local network and works on devices without extension support

---

## Further Considerations

1. Pin `GIT_REF` to a tag or commit for reproducible deployments instead of tracking `main`
2. If Compose remote Git contexts prove too limiting, fall back to CI-built images and registry pulls
3. Extension packaging conventions: output structure and release artifact naming
