# AD-37: RaithaMitra Security Hardening, Data Integrity & Unified Module Connectivity Report

**Branch:** `integration/final`  
**Recovery Branch:** `backup/pre-ad37-hardening`  
**Baseline Commit:** `cf716d5`

---

## 1. Security Vulnerabilities Discovered & Corrected

1. **Unauthenticated Farm Endpoints (`backend/app/api/endpoints/farms.py`, `backend/app/services/farm_service.py`)**
   - **Vulnerability:** `GET /farms`, `POST /farms`, `GET /farms/{farm_id}`, `PATCH /farms/{farm_id}`, and `GET /farms/{farm_id}/summary` previously required no authentication and had no `farmer_id` ownership verification.
   - **Fix:** Enforced Bearer token authentication via `resolve_authenticated_user` / `require_roles`, backed `FarmService` by SQLite `farms` with `farmer_id` ownership, filtered `GET /farms` to the authenticated farmer's own farms, and enforced `403` cross-account rejection on `GET`/`PATCH`/`summary`. Added coordinate/budget/water validation bounds on `FarmUpdate` in `backend/app/schemas/farm.py`.

2. **Unauthenticated Flagship & Nursery Endpoints (`labour/router.py`, `bidding/router.py`, `transportation/router.py`, `nurseries.py`)**
   - **Vulnerability:** State-changing and private endpoints (`POST /labour/jobs`, `/apply`, `/accept`, `/complete`, `/my-profile`, `/my-jobs`, `POST /bidding/listings`, `/bid`, `/confirm`, `GET /bidding/orders`, `POST /transport/vehicles`, `/bookings`, `GET /transport/bookings`, `PATCH /transport/bookings/{id}/status`, `POST/PATCH /nurseries/products`, `POST /nurseries/inquiries`) accepted caller-supplied IDs without Bearer token verification.
   - **Fix:** Enforced `require_roles` / `resolve_authenticated_user` from `backend/app/features/auth/security.py`, bound actor IDs to the authenticated user, rejected cross-account spoofing (`403`), and verified record ownership on job acceptance/completion, listing confirmation, and transport status transitions.

3. **Permissive CORS & Credential Disclosure (`backend/app/main.py`, `backend/app/features/auth/router.py`)**
   - **Vulnerability:** `CORSMiddleware` allowed `allow_origins=["*"]` with `allow_credentials=True`. `GET /auth/demo-accounts` exposed plaintext demo passwords (`"password"`) and remained active in production. `user_sessions` lacked expiration enforcement.
   - **Fix:** Restricted CORS to `settings.CORS_ORIGINS` (+ optional `CORS_ORIGINS` env var) with explicit methods/headers. Added `expires_at` (7-day TTL) to `user_sessions`, enforced expiry & `account_status` in `resolve_authenticated_user` and `/auth/me`, added sliding-window rate limiting (`check_rate_limit`) on `/login`, `/register`, `/otp/send`, `/otp/verify`, disabled `/auth/demo-accounts` and `rm_demo_token_*` in `ENVIRONMENT=production`, and removed plaintext `password` fields from `/auth/demo-accounts`.

4. **Upload Restrictions (`backend/app/features/crop_diagnostics/router.py`, `backend/app/api/endpoints/scientific.py`)**
   - **Fix:** Added `validate_image_upload` enforcing non-empty payload, 10 MB max upload size (`413`), and blocking dangerous executable/script file types (`400`), plus `farm_id` ownership verification on `/crop-diagnostics/analyze-authenticated` and `/analyze-multi`.

---

## 2. Scientific & Data Integrity Corrections

1. **Zero-Value Preservation (`backend/app/features/decision_intelligence/context_collector.py`, `backend/app/engines/decision_engine.py`)**
   - **Issue:** `available_water_m3 or 10000.0`, `cultivation_budget_inr or 50000.0`, and `cultivation_budget_inr or 80000.0` silently replaced legitimate `0.0` values with large defaults.
   - **Fix:** Replaced `or` fallbacks with explicit `is not None` checks so `0.0` budget and `0.0` water availability are preserved accurately.

2. **AD-22 Crop Doctor Integration in AD-30 (`context_collector.py`, `action_planner.py`)**
   - **Fix:** Upgraded AD-30 `context_collector.py` and `action_planner.py` to consume AD-22 `crop_diagnostics` (`check_model_availability`, `get_user_diagnostic_history`, `get_surveillance_summary`) instead of the legacy stub, surfacing verified disease detections with model confidence and explicit pathology limitations while never fabricating diagnoses when unavailable.

---

## 3. Financial Integrity Corrections (`backend/app/features/finance/`)

- **Separation of Work Completion / Delivery from Payment Settlement:**
  - Updated `sync_farm_financials` in `backend/app/features/finance/service.py` so completed `labour_jobs` and delivered `transport_bookings` sync as `status="recorded"` (unpaid payable) rather than automatically `status="settled"`, unless `payment_status == "settled"`.
  - Added `settled_expenses_inr`, `unpaid_payables_inr`, `payment_gateway_connected: False`, and `settlement_mode: "manual_ledger_only"` to `compute_financial_summary`.
  - Added explicit `POST /api/v1/finance/labour/{job_id}/settle` and `POST /api/v1/finance/transport/{booking_id}/settle` endpoints in `backend/app/features/finance/router.py`.

---

## 4. Frontend Dashboard, Auth Headers & Offline Privacy (`frontend/src/`)

- **`frontend/src/context/FarmContext.tsx`**: Added `Authorization: Bearer <token>` headers to `/farms/{id}/summary`, `POST /farms`, and `PATCH /farms/{id}`; removed hardcoded fake fallback telemetry (`soil_moisture_pct: 34.2`, `total_expenses_inr: 42500.0`, `expected_revenue_inr: 185000.0`, fake weather/recommendations) so unavailable backend states surface honestly as `null`; cleared `rm_farms_saved`, `rm_current_farm_id`, and user-scoped IndexedDB read snapshots (`clearUserSnapshots(userId, false)`) on `logout()` and `switchDemoUser()` while preserving user-scoped unsynchronized drafts.
- **`frontend/src/components/dashboard/OverviewCards.tsx`**: Removed hardcoded fallback telemetry (`28.4°C`, `18.5%`, `5.29 mm`, `Sentinel-2 NDVI 0.74`, `87,500`, `62.5 t`, `13,75,000`, `15%`) and replaced them with honest `Unavailable` / `UNAVAILABLE` provenance states when live data is absent.
- **`frontend/src/app/labour/page.tsx`, `bidding/page.tsx`, `transport/page.tsx`**: Added `Authorization: Bearer <token>` headers to authenticated requests.

---

## 5. Database Migrations (`backend/app/db/database.py`)

Non-destructive `ALTER TABLE` migrations added to `init_db()`:
- `user_sessions.expires_at` (`TEXT`)
- `labour_jobs.payment_status`, `payment_settled_at`, `payment_reference`
- `transport_bookings.payment_status`, `payment_settled_at`, `payment_reference`

---

## 6. Verification Results

- **Backend Regression Suite:** `.venv\Scripts\python.exe -m pytest backend/tests -v`  
  **Result:** **127 passed**, 4 warnings in `63.51s` (including all 6 new tests in `backend/tests/test_ad37_security_and_integrity.py` and all 121 existing tests).
- **Frontend Validation:** `npx.cmd tsc --noEmit` & `npm.cmd run build`  
  **Result:** Exited with code `0`, generating **40/40** static pages with zero TypeScript errors.
- **Browser Verification:** Live interactive Chrome browser walkthrough was not executed in this environment; frontend changes were verified via `tsc --noEmit` and Next.js production build.

---

## 7. Remaining Limitations

- Rate limiting (`InMemoryRateLimiter`) is process-local in-memory; multi-worker production deployments should back rate limiting with Redis.
- Offline IndexedDB snapshots are cleared on logout/account switch; if a browser tab crashes before logout, `rm_user` remains in `localStorage` until explicit sign-out.
- No live payment gateway is integrated (`settlement_mode: "manual_ledger_only"`).
