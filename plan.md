# Plan: Bookmark Grid + PWA Offline Support

## TL;DR

Build a drag-and-droppable bookmark shortcuts grid into the existing Angular 21 new-tab app. 8 cards visible at a time (4×2), scrollable for more. Cards show auto-fetched favicons (Google Favicon API) with optional image override, a title, and a hyperlink to the site. Full CRUD via REST API (mock server in dev), localStorage as a read-through cache for instant loads, and complete offline capability via `@angular/service-worker`. Mutations made offline are queued and replayed when connectivity returns.


---

## Decisions

* Max visible at once: 18 (6×3 grid), scrollable for more
* Image: auto-fetch favicon from Google Favicon API, allow custom URL override
* Add/delete: dynamic (no fixed slots)
* Data store: REST API (mock server in dev) + localStorage cache layer
* Drag-and-drop: Angular CDK `DragDropModule`
* BaseScreen: removed from app.html (file kept, unused)
* Service worker disabled in dev mode; test offline via production build


---

## Phase 1 — Foundation


1. **Install** `@angular/cdk@21` — adds `DragDropModule`
2. **Add** `IBookmark` model — `{ id, title, url, customImageUrl?, order }` in `src/app/models/IBookmark.ts`
3. **Update** `api-service.config.ts` — add `BOOKMARKS_GET`, `BOOKMARKS_CREATE`, `BOOKMARKS_UPDATE`, `BOOKMARKS_DELETE`, `BOOKMARKS_REORDER` endpoint keys
4. **Create** `BookmarkService` (`src/app/services/bookmark.service.ts`) — reactive signal state; `getAll()` loads from localStorage cache first then syncs with API; mutations write-through cache; includes offline mutation queue (step 16)
5. **Extend mock server** (`mock_server/server.js`) — seed in-memory bookmark array; add `GET/POST /api/bookmarks`, `PUT/DELETE /api/bookmarks/:id`, `PUT /api/bookmarks/reorder`


---

## Phase 2 — Grid & Card Components *(parallel)*


6. `BookmarksGridComponent` (`src/app/bookmarks-grid/`) — `cdkDropList` container; CSS grid `repeat(4, 1fr)`, `max-height` \~2 rows, `overflow-y: auto`; Add `+` button that opens edit modal
7. `BookmarkCardComponent` (`src/app/bookmark-card/`) — `cdkDrag` root; favicon `<img>` from Google Favicon API (`https://www.google.com/s2/favicons?domain=<host>&sz=64`) or `customImageUrl`; title; edit + delete buttons shown on hover


---

## Phase 3 — Edit Modal *(depends on Phase 2)*


8. `BookmarkEditModalComponent` (`src/app/bookmark-edit-modal/`) — reactive form (Title, URL, Custom Image URL optional); live favicon preview as URL is typed; add + edit modes; fixed-position overlay with backdrop


---

## Phase 4 — App Integration


 9. **Update** `app.html` — remove `<app-base-screen>`, insert `<app-bookmarks-grid>`
10. **Update** `app.ts` — swap imports
11. **localStorage cache** (`bookmark_cache`) — stale-while-revalidate: emit cache on load, sync with API, write-through on all mutations


---

## Phase 5 — PWA / Offline Support *(depends on Phase 4)*


12. **Install** `@angular/service-worker@21`
13. `angular.json` — add `serviceWorker: true` and `"ngswConfigPath": "ngsw-config.json"` to the production build configuration
14. **Create** `ngsw-config.json`:
    * `assetGroups`: app shell (HTML/JS/CSS) with `installMode: prefetch`; lazy assets with `installMode: lazy`
    * `dataGroups`: `/api/bookmarks` → `strategy: freshness` (3s network timeout, cache fallback, 7-day expiry); `https://www.google.com/s2/favicons/**` → `strategy: performance` (cache-first, 100 entries, 30-day expiry)
15. **Register** `ServiceWorkerModule` in `app.config.ts` — `registerWhenStable:30000`, disabled in dev mode (`!isDevMode()`)
16. **Offline mutation queue** in `BookmarkService` — on CUD/reorder HTTP failure, push `{ type, payload, timestamp }` to `bookmark_pending_mutations` in localStorage; listen for `window online` event to drain and replay queue in order, then re-sync cache
17. `SwUpdate` integration in `app.ts` — subscribe to `VERSION_READY` events; prompt user to reload to activate new version


---

## Relevant Files

* `src/app/models/IBookmark.ts` — new
* `src/app/services/bookmark.service.ts` — new
* `src/app/services/api-service.config.ts` — add endpoints
* `src/app/services/api-service.ts` — add bookmark HTTP methods
* `src/app/bookmarks-grid/` — new component (3 files)
* `src/app/bookmark-card/` — new component (3 files)
* `src/app/bookmark-edit-modal/` — new component (3 files)
* `src/app/app.html` — swap BaseScreen for grid
* `src/app/app.ts` — update imports
* `src/app/app.config.ts` — register ServiceWorkerModule
* `mock_server/server.js` — bookmark CRUD routes
* `ngsw-config.json` — new, PWA caching rules
* `angular.json` — enable service worker in prod build
* `package.json` — add `@angular/cdk`, `@angular/service-worker`


---

## Verification


1. `npm install` completes without errors
2. `npm run mock:start` → `GET /api/bookmarks` returns sample data
3. `npm start` → 4×2 grid visible against APOD background
4. Add/edit/delete all persist through API + localStorage
5. Drag to reorder updates order in API and cache
6. Reload shows bookmarks instantly from cache, then syncs
7. **Offline**: disable network → app loads from SW cache; make a mutation → queued in localStorage; re-enable → queue drains and syncs
8. `npm run build` (production) → `ngsw-worker.js` and `ngsw.json` appear in `dist/`
9. `npm test` — existing tests pass


---

## Further Considerations


1. **Grid height**: Fixed px height tied to card size vs. `max-height: 50vh` to adapt to screen size
2. **Update prompt**: Silent auto-reload on new SW version vs. toast/banner asking user to click "Reload"
3. **Favicon fallback**: Letter-avatar or generic globe icon when Google's Favicon API returns blank
4. **API down fallback**: Silent cached-only mode vs. visible error indicator when mock server is unreachable


