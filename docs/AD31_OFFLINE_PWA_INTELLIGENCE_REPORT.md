# AD-31 — Advanced Offline-First Progressive Web Application & Intelligent Data Synchronization

## 1. PWA Architecture, Manifest & Service Worker
- **Manifest (`frontend/public/manifest.webmanifest`)**: Standards-compliant manifest (`RaithaMitra`, `standalone` display, `#F7F5ED` background, `#166534` theme, 192×192, 512×512, and maskable PNG icons in `frontend/public/icons/`). Wired in `frontend/src/app/layout.tsx`.
- **Service Worker (`frontend/public/sw.js`)**: Compatible with Next.js 14 (`SKIP_WAITING` controlled updates, versioned `rm-static-v1` / `rm-pages-v1` caches). Strictly registered in production builds only (`OfflineStatusBar.tsx`).
- **Cache Exclusion Policy**: Network-only for all `POST` requests, `/api/*` endpoints, `/auth`, `/otp`, and requests carrying `Authorization` headers. Cache-first for `/_next/static/*`, `/icons/*`, `/images/*`. Network-first with cached page -> `/offline.html` fallback for navigation.

## 2. IndexedDB, Data Isolation & Synchronization Engine (`frontend/src/lib/offline/`)
- **IndexedDB (`database.ts`)**: Versioned schema (`raithamitra_offline_db`) with 11 user-namespaced object stores (`by_user` index). Supports `clearUserSnapshots` while preserving unsynchronized drafts unless explicitly cleared.
- **Connectivity Intelligence (`connectivity.ts`)**: Distinguishes `browser_offline`, `online_backend_unreachable`, `online_backend_ready`, `syncing`, and `sync_failed` via `navigator.onLine` + `/api/v1/health` probing.
- **Operation Queue & Sync Engine (`operationRegistry.ts`, `syncEngine.ts`)**: Allowlisted operation types (`low_risk` vs `consequential`), per-operation `idempotency_key`, account-switch abort check (never syncing User A's operations under User B's token), and bounded snapshot downloads.
- **Offline UI & Sync Center (`OfflineStatusBar.tsx`, `frontend/src/app/sync-center/page.tsx`)**: Displays connectivity status, pending queue count, Low-Bandwidth Mode toggle, Install App button (`beforeinstallprompt`), update banner, and dedicated `/sync-center` workspace.

## 3. Backend Synchronization & Idempotency (`backend/app/features/synchronization/`)
- **Non-Destructive Table**: Added `sync_operation_receipts` (`UNIQUE(user_id, operation_type, idempotency_key)`) in `backend/app/db/database.py`.
- **Endpoints (`/api/v1/sync/*`)**: `GET /status`, `GET /operations`, `POST /submit`, `GET /receipts`, `GET /snapshot`.
- **Safety Controls**: `idempotency.py` verifies SHA-256 `payload_hash` (`409 Conflict` if same key is reused with different payload); `conflict_detection.py` checks equipment availability, lot inventory, and farm version; consequential drafts return `confirmation_required` and never auto-execute.

## 4. Verification & Limitations
- Verified via `pytest backend/tests/test_offline_sync_ad31.py -v`, full `pytest backend/tests -v`, and `npx tsc --noEmit && npm run build`.
- **Remaining Limitations**: Live Chrome DevTools offline reload / `beforeinstallprompt` installation was not executed in a live browser session; verify manually using `npm run start` after production build.
