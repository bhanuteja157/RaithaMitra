# AD-38: RaithaMitra Unified Marketplace, Live Market Intelligence & AgriFlow Integration Report

## 1. Original Git HEAD & Recovery Branch
- **Branch:** `integration/final`
- **Baseline Commit:** `05295cb` (`feat(security): harden auth, data integrity, financial settlement, and unified module connectivity (AD-37)`)
- **Recovery Branch:** `backup/pre-ad38-marketplace`

---

## 2. Seven-Repository Audit
All 7 reference repositories in `references/` (excluded from Git tracking via `.gitignore`) were audited:
1. **AgriFlow** (cloned to `references/AgriFlow` for research): Inspected `mandiApiService.ts`, `perseussColdCartonizationService.ts`, and `PackagingIntelligenceDashboard.tsx`.
2. **AquaCrop**: Reference crop-water productivity methodology; no `.env` credentials.
3. **HarvestIQ**: `.env.example` contains Firebase & `NEXT_PUBLIC_API_URL` template keys only.
4. **KisaanMitra**: `.env.example` contains LLM/Qdrant/Data.gov.in template keys (`DATA_GOV_API_KEY`, `MANDI_RESOURCE_ID`) only.
5. **KisaanSetu**: No `.env` credentials.
6. **OfflineCropDoctor**: No `.env` credentials.
7. **OpenFarm**: `.env.example` contains Postgres/Redis/MinIO/STAC template keys only.

---

## 3. Private API Provider Inventory (No Credential Values Exposed)

| Provider | Purpose | Integration Status | Credential Configured | Connectivity / Notes |
|---|---|---|---|---|
| **Data.gov.in / AGMARKNET** | Official Indian mandi prices | Integrated (`backend/app/features/market_intelligence/providers.py`) | `False` (`DATA_GOV_IN_API_KEY`, `DATA_GOV_API_KEY`, `MANDI_API_KEY` unset) | Provider adapter recognizes all 3 env aliases; requires key configuration on host |
| **Open-Meteo** | Live NWP weather & ET₀ | Integrated (`weather_service.py`) | Keyless (Public) | Active |
| **Europe PMC / GBIF / NCBI** | Agronomic & species bio-intelligence | Integrated (`biointel_advanced.py`) | Keyless (Public) | Active |
| **Earth Search STAC** | Open Sentinel-2 metadata | Integrated (`satellite/providers.py`) | Keyless (Public) | Active (metadata only; no fabricated NDVI) |
| **Sentinel Hub** | Sentinel-2 spectral reflectance | Integrated (`satellite/providers.py`) | `False` (`SENTINELHUB_CLIENT_ID` unset) | Honest unavailable state until configured |
| **Gemini / Sarvam / Google Places / Routes / WeatherAPI / OpenWeatherMap** | AI assistant, speech, places, weather | Optional adapters / templates | `False` | Browser speech & Haversine fallbacks active |
| **Twilio Verify** | Live SMS OTP | Integrated (`otp_service.py`) | `True` (in local env) | Active when enabled; local dev demo OTP active (`DEMO_OTP_ENABLED=true`) |

---

## 4. Official Market API Connectivity Results
- `DATA_GOV_IN_API_KEY` / `DATA_GOV_API_KEY` / `MANDI_API_KEY` are **not configured** in this workspace environment, so live Data.gov.in requests return `status: "not_configured"` honestly without fabricating prices.
- Verified with mocked official responses in `backend/tests/test_ad38_marketplace_and_agriflow.py`:
  - Commodity alias disambiguation strictly separates **Green Chilli** (`Green Chilli`), **Dry Chilli** (`Dry Chillies`), **Capsicum** (`Capsicum`), **Black Pepper** (`Black Pepper`), and **White Pepper** (`White Pepper`).
  - District queries returning 0 records report `district_match: False` and fetch state-level `nearby_records` separately without mislabelling them as district matches.

---

## 5. Existing Features Preserved
- AD-19B personalized OTP, AD-22 AI Crop Doctor, AD-23 Multilingual Assistant, AD-24 Financial Ledger, AD-25 Satellite Intelligence, AD-27 Post-Harvest, AD-28 Equipment Connect, AD-29 Market Intelligence, AD-30 Decision Intelligence, AD-31 Offline Sync, AD-32 Seed-to-Sale Journey, AD-33 Crop Growth Simulation, and AD-37 Security Hardening.

---

## 6. New Features Implemented
- **AGMARKNET Env Aliases & Commodity Disambiguation** (`providers.py`, `normalization.py`, `schemas.py`, `service.py`).
- **Registered Buyer Discovery** (`GET /api/v1/bidding/buyers`, `PUT /api/v1/bidding/buyers/profile`): Filters by crop, district, category, quantity, and Haversine distance while stripping private phone/email and avoiding false verified badges.
- **Direct Farmer-to-Buyer Selling** (`POST/GET /api/v1/bidding/direct-proposals`, `/{id}/respond`, `/{id}/confirm`): Supports proposals, buyer counteroffers, offer expiry, dual-party confirmation, and atomic backing listing/bid + single `purchase_orders` generation.
- **Smart Bidding Upgrades** (`backend/app/features/bidding/router.py`): Selected non-highest bid confirmation (`bid_id`), actual `buyer_profiles.delivery_address` lookup, bidding deadline enforcement (`expired`), and accurate `COUNT(DISTINCT buyer_id)` unique buyer count.
- **Unified `/smart-market` Workspace** (`frontend/src/app/smart-market/page.tsx`, `frontend/src/lib/marketplaceApi.ts`): 6-section marketplace defaulting to **Today's Market Prices**, with **Auction My Harvest**, **Find Buyers**, **Direct Selling**, **My Offers & Orders**, and **Forecasts & Alerts**.
- **Smart Packaging & Cold-Chain Assessment** (`backend/app/features/post_harvest/packaging.py`, `POST /api/v1/post-harvest/packaging/recommend`): Crop-specific layered packaging, crate counts, target temperatures, and ordinary vs refrigerated vehicle cost estimates (`is_estimate: True`).
- **QR Produce Passports** (`backend/app/features/post_harvest/passport.py`, `POST/GET /api/v1/post-harvest/passports`, `GET /api/v1/post-harvest/passports/public/{batch_code}`, `frontend/src/app/passport/[batchCode]/page.tsx`): Persistent batch records with SHA-256 record integrity hash (explicitly non-blockchain) and privacy-safe public verification.

---

## 7. AgriFlow Features Selectively Adopted vs Rejected
- **Adopted:** Crop-specific packaging layers & cold-chain thermal/cost estimation concepts (re-implemented as honest `is_estimate: True` engineering estimates in `packaging.py`) and lightweight QR produce passport concept (`passport.py`).
- **Rejected:** AgriFlow's `mandiApiService.ts` / `livePriceService.ts` hardcoded `APMC_MANDI_BENCHMARKS` marked `status: 'LIVE'`, artificial daily price variations, and invented today-dates on missing observations were **strictly rejected** to preserve scientific and market data integrity.

---

## 8. Database Migrations (`backend/app/db/database.py`)
Additive, non-destructive migrations in `init_db()`:
- Extended `buyer_profiles` with procurement discovery columns (`buyer_category`, `district`, `state`, `latitude`, `longitude`, `required_commodities_json`, `preferred_varieties_json`, `quality_requirements`, `min_quantity_kg`, `max_quantity_kg`, `expected_price_min_inr`, `expected_price_max_inr`, `payment_terms`, `procurement_schedule`, `verification_status`, `is_active`).
- Extended `purchase_orders` with `farm_id`, `proposal_id`, `payment_terms`.
- Created `direct_sale_proposals` and `produce_passports` tables with indexes.

---

## 9. API Endpoints Added / Upgraded
- `POST /api/v1/market-intelligence/fetch-live` (variety filter + separate `nearby_records` fallback)
- `GET /api/v1/bidding/buyers`, `PUT /api/v1/bidding/buyers/profile`
- `POST /api/v1/bidding/direct-proposals`, `GET /api/v1/bidding/direct-proposals`, `POST /api/v1/bidding/direct-proposals/{proposal_id}/respond`, `POST /api/v1/bidding/direct-proposals/{proposal_id}/confirm`
- `POST /api/v1/bidding/listings/{listing_id}/confirm` (optional `bid_id` selection + buyer delivery address)
- `POST /api/v1/post-harvest/packaging/recommend`
- `POST /api/v1/post-harvest/passports`, `GET /api/v1/post-harvest/passports`, `GET /api/v1/post-harvest/passports/public/{batch_code}`

---

## 10. Frontend Routes
- Upgraded: `/smart-market` (`frontend/src/app/smart-market/page.tsx`)
- Added: `/passport/[batchCode]` (`frontend/src/app/passport/[batchCode]/page.tsx`)

---

## 11. Security Improvements
- Preserved AD-37 Bearer token auth, role guards, farm ownership checks, and session expiry across all new marketplace/packaging/passport endpoints.
- Public buyer discovery strips private `phone` and `email`.
- Public QR passport endpoint strips `farmer_id`, `farm_id`, and exact street address.

---

## 12. Verification Results
- **Backend Regression Suite:** `.venv\Scripts\python.exe -m pytest backend/tests -v` — **131 passed**, 4 warnings in `62.88s` (including all 4 new AD-38 tests in `backend/tests/test_ad38_marketplace_and_agriflow.py`).
- **TypeScript & Production Build:** `npx.cmd tsc --noEmit` & `npm.cmd run build` — exited with code `0`, generating **40 static pages + `/passport/[batchCode]` dynamic route**.
- **Browser Testing:** Live interactive Chrome browser walkthrough was not executed in this environment.

---

## 13. Remaining Limitations & Local Commit
- Live Data.gov.in AGMARKNET queries require configuring `DATA_GOV_IN_API_KEY` (or `DATA_GOV_API_KEY` / `MANDI_API_KEY`) in the backend runtime `.env`.
- Optional P2 features (live Sarvam AI speech proxy, multi-order OR-Tools consolidation across disparate POs, and downloadable PDF packaging reports) are not bundled in this commit; browser speech fallback and existing OR-Tools shared transport remain active.
- Committed locally on `integration/final` (not pushed to GitHub).
