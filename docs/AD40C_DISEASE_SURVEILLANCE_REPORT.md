# AD-40C — Community Crop Disease Surveillance & Predictive Outbreak Intelligence

**Project:** RaithaMitra (ರೈತ ಮಿತ್ರ)  
**Team:** Syntax Squad  
**Author / Owner:** Manish  
**Branch:** `feature/ad40c-disease-surveillance` (branched cleanly from current local feature baseline; `integration/final` and `main` untouched)

---

## 1. Architecture Overview

AD-40C replaces the static hardcoded `/surveillance` prototype (`Early Blight Warning`, `3 neighboring farms reported in Mandya`, `ESE 9.2 km/h`, `88% Compliant`) with an authenticated, privacy-preserving regional disease surveillance, predictive risk, DBSCAN outbreak clustering, early warning, and Gemini tool integration system.

### Backend (`backend/app/features/disease_surveillance/`)
- **`disease_knowledge.py`**: Scientific crop-disease profiles covering **Tomato, Chilli, Paddy, Maize, Potato, Cotton, Onion, and Groundnut** with explicit transmission modes (`airborne_spores`, `insect_vector`, `soil_water_borne`, `rain_splash`), `wind_dispersal_relevant` guards, temperature/humidity/rain thresholds, growth-stage susceptibility weights, and ICAR/TNAU/FAO cultural & IPM prevention guidance.
- **`privacy.py`**: Coarsens community coordinates (~1.5 km grid + deterministic non-reversible farm-ID jitter), strips private farm identifiers/notes for non-owners, and strictly excludes reports with `anonymous_community_consent = 0` from community views.
- **`geospatial.py`**: Spherical Haversine distance (`haversine_km`), initial compass bearing, meteorological downwind plume alignment (`(wind_from_deg + 180) % 360`), and spatial density heatmap grid aggregation.
- **`risk_engine.py`**: Computes explainable heuristic disease risk (`Low | Moderate | High | Critical | Insufficient evidence`) with distance decay, temporal recency half-life, confidence/verification weighting, disease-specific transmission behavior, weather suitability (Open-Meteo live or safe missing-weather handling), and explicit heuristic disclaimer.
- **`outbreak_detector.py`**: Pure-Python **Haversine-DBSCAN** clustering that deduplicates by `(crop, disease_name, farm_id)` before clustering so repeated reports from one farm cannot falsely fabricate a regional outbreak. Classifies `suspected_cluster` vs. `confirmed_outbreak`, computes 7-day trend delta, 14-day daily trend series, and district summaries.
- **`alert_engine.py`**: Persists deduplicated in-app alerts (`alert_fingerprint`) in SQLite (`disease_alerts`), supporting `unread`, `read`, `acknowledged`, and `dismissed` states. Explicitly marks `delivery_channel = "in_app_only"` (never falsely claiming SMS/WhatsApp delivery).
- **`demo_seed.py`**: Seeds isolated Mandya demonstration observations (`demo_rep_001`..`demo_rep_005`) strictly marked `is_demonstration = 1` and `data_source = 'demonstration_simulation'`.
- **`assistant_tools.py`**: Exports 6 authenticated async Python functions and JSON tool contracts ready for Gemini assistant registration without editing core assistant files.
- **`service.py` & `router.py`**: Coordinates FastAPI `/api/v1/surveillance/*` endpoints, farm ownership checks (`resolve_authorized_farm`), duplicate report prevention (`409 Conflict`), and strict live (`is_demonstration = 0`) vs. demo (`is_demonstration = 1`) query isolation.

### Frontend (`frontend/src/features/disease-surveillance/`, `frontend/src/lib/diseaseSurveillanceApi.ts`)
- **`DiseaseSurveillanceMap.tsx`**: Dynamic (`ssr: false`) Leaflet + OpenStreetMap geospatial map rendering anonymized markers (Expert Confirmed / AI-Suspected / Farmer Reported), translucent density heatmaps, DBSCAN risk zones, and configurable monitoring radius circles.
- **`SurveillanceDashboard.tsx`**: 10-section responsive dashboard with live vs. isolated demonstration mode switch, 4-language local UI switcher (**English, Kannada, Hindi, Telugu** without editing shared global `translations.ts`), filter strip, personalized risk card, outbreak clusters list, 14-day Recharts bar chart, alert management (`Mark Read` / `Acknowledge` / `Dismiss`), manual/diagnostic report submission with explicit consent opt-in, nearby community table, and 8-crop scientific guidance browser.

---

## 2. Implemented Features Checklist
1. Removed hardcoded prototype statistics from `frontend/src/app/surveillance/page.tsx`.
2. Authenticated manual & AI-diagnostic disease reporting with explicit anonymous sharing consent, duplicate detection (`409`), and verification workflow (`farmer_reported`, `ai_suspected`, `expert_confirmed`, `dismissed`).
3. Geospatial intelligence via Leaflet/OSM: markers, heatmaps, risk zones, monitoring radius, crop/disease/date filters, district summaries.
4. Explainable weather-aware & transmission-mode-aware risk engine with `Insufficient evidence` and missing-weather handling.
5. Haversine-DBSCAN regional outbreak clustering protected against single-farm report inflation.
6. Deduplicated in-app farmer alert lifecycle (`unread` → `read` → `acknowledged` / `dismissed`).
7. Non-prescriptive scientific IPM/cultural recommendations for Tomato, Chilli, Paddy, Maize, Potato, Cotton, Onion, Groundnut.
8. Honest isolated demonstration scenario (`demo_mode=true`) completely separated from live observations.

---

## 3. Algorithms & Scientific Assumptions

### Haversine Distance & Wind Alignment
- Distance uses great-circle WGS84 sphere approximation (`R = 6371.0088 km`).
- Meteorological `wind_direction_10m` denotes wind origin direction; airborne spore plume orientation is computed as `(wind_from_deg + 180) % 360`.
- **Non-wind diseases** (`Tomato Bacterial Wilt`, `Groundnut Stem Rot`, `Maize Stalk Rot`, insect-vectored `ToLCV`, `Chilli Leaf Curl`, `Cotton Leaf Curl`) set `wind_dispersal_relevant = False` and do **not** incorporate directional wind drift.

### Predictive Heuristic Risk Index
$$S_{farm} = W_{verif} \cdot e^{-d / (0.45 \cdot d_{max})} \cdot 0.5^{\Delta t / t_{1/2}} \cdot F_{wind}$$
- Collapses multiple observations from the same `farm_id` via `max(S_farm)` and combines independent farm pressure smoothly (`1 - ∏(1 - S_i)`).
- Combines spatial pathogen pressure (64%) and weather suitability (36%) scaled by crop growth-stage weight.
- **Limitation / Disclaimer:** Output `heuristic_risk_index` (0–100) and categorical levels (`Low`, `Moderate`, `High`, `Critical`) are heuristic agri-meteorological decision indicators, **not** calibrated clinical or epidemiological infection probabilities.

### Outbreak Detection (Haversine-DBSCAN)
- Groups reports by `(crop, disease_name)` within rolling `window_days` (default `30d`) and collapses to one representative point per `farm_id`.
- Clusters unique farm coordinates with `eps_km = 15.0` and `min_independent_farms = 2`.
- **`confirmed_outbreak`**: `>= 3` independent farms AND (`>= 1` `expert_confirmed` report OR `>= 4` farms with `>= 2` `ai_suspected`).
- **`suspected_cluster`**: `>= 2` independent farms within cluster radius.

### Scientific References Embedded in Guidance
- ICAR-IIHR (Tomato IPDM, Arka Rakshak Triple-Resistant Guidelines)
- ICAR-CPRI (Late Blight Early Warning Principles)
- ICAR-IIRR / NRRI & IRRI (Rice Blast & Bacterial Leaf Blight)
- ICAR-IIMR, CICR, DOGR, DGR, IIVR & TNAU Agritech Portal

---

## 4. Database Changes
Additive migration `backend/migrations/003_disease_surveillance_tables.sql` (also initialized idempotently in `backend/app/db/database.py` -> `init_db()`):
- Table `disease_reports` (+ indexes on `(is_demonstration, observation_date)`, `(crop, disease_name, is_demonstration)`, `(farmer_id, farm_id)`).
- Table `disease_alerts` (+ index on `(recipient_user_id, is_demonstration, status, updated_at)`).

---

## 5. API Endpoints (`/api/v1/surveillance/*`)

| Method | Endpoint | Auth & Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/surveillance/reports` | Bearer (`farmer`, `admin` owning `farm_id`) | Submit manual or AI-sourced disease report |
| `POST` | `/api/v1/surveillance/reports/from-diagnostic` | Bearer (owning `farmer` / `admin`) | Promote diagnostic result to `ai_suspected` report |
| `PATCH` | `/api/v1/surveillance/reports/{report_id}/verify` | Bearer (owner or `admin`) | Update verification status |
| `GET` | `/api/v1/surveillance/reports` | Bearer | Filter nearby consented community reports or `mine_only=true` |
| `GET` | `/api/v1/surveillance/map` | Bearer | Anonymized markers, heatmaps, DBSCAN clusters, risk zones, trends |
| `GET` | `/api/v1/surveillance/risk` | Bearer (owning `farmer` / `admin`) | Explainable parcel risk & alert evaluation |
| `GET` | `/api/v1/surveillance/outbreaks` | Bearer | Regional clusters, 14d trend, district summary |
| `GET` | `/api/v1/surveillance/guidance` | Bearer | Non-prescriptive scientific prevention catalog (8 crops) |
| `GET` | `/api/v1/surveillance/alerts` | Bearer | List user alerts (`live` vs `demo_mode`) |
| `POST` | `/api/v1/surveillance/alerts/evaluate` | Bearer | Trigger risk-to-alert upsert for farm |
| `PATCH` | `/api/v1/surveillance/alerts/{alert_id}` | Bearer (recipient or `admin`) | Update alert (`read`, `acknowledged`, `dismissed`) |
| `GET` | `/api/v1/surveillance/assistant-tools` | Bearer | Tool schema contracts for Gemini Voice Assistant |
| `POST` | `/api/v1/surveillance/assistant-tools/{tool_name}` | Bearer | Execute surveillance assistant tool contract |

---

## 6. Gemini Voice Assistant Tool Integration Contracts

Defined in `backend/app/features/disease_surveillance/assistant_tools.py`:
1. `get_nearby_disease_reports(user, farm_id=None, crop=None, radius_km=25.0, demo_mode=False)` → Answers *"Are there any diseases spreading near my farm?"*
2. `get_farm_disease_risk(user, farm_id=None, crop=None, radius_km=25.0, demo_mode=False)` → Answers *"Is my tomato crop at risk?"*
3. `get_regional_outbreak_summary(user, crop=None, demo_mode=False)` → Returns `clusters`, `district_summaries`, `daily_trend_14d`.
4. `get_disease_prevention_actions(user, crop=None, disease_name=None)` → Answers *"What precautions should I take?"*
5. `get_active_disease_alerts(user, demo_mode=False)` → Answers *"Why did I receive this disease warning?"*
6. `prepare_community_disease_report(user, farm_id=None, crop=None, disease_name=None)` → Prepares a confirmation-required draft report (`requires_confirmation: true`, `anonymous_community_consent: false`).

---

## 7. Changed & Added Files
- Added `backend/migrations/003_disease_surveillance_tables.sql`
- Added `backend/app/features/disease_surveillance/` (`__init__.py`, `disease_knowledge.py`, `privacy.py`, `geospatial.py`, `risk_engine.py`, `outbreak_detector.py`, `alert_engine.py`, `demo_seed.py`, `schemas.py`, `service.py`, `assistant_tools.py`, `router.py`)
- Added `backend/tests/test_disease_surveillance.py`
- Modified `backend/app/db/database.py` (additive surveillance tables & indexes)
- Modified `backend/app/api/api.py` (registered `disease_surveillance_router`)
- Added `frontend/src/lib/diseaseSurveillanceApi.ts`
- Added `frontend/src/features/disease-surveillance/` (`translations.ts`, `DiseaseSurveillanceMap.tsx`, `SurveillanceDashboard.tsx`)
- Modified `frontend/src/app/surveillance/page.tsx`
- Added `docs/AD40C_DISEASE_SURVEILLANCE_REPORT.md`

**Dependency Changes:** None. Reuses existing `fastapi`, `pydantic`, `sqlite3`, `httpx`, `leaflet`, `recharts`, and `lucide-react`.

---

## 8. Test & Build Verification Results
- **AD-40C Surveillance Suite:** `pytest backend/tests/test_disease_surveillance.py -v` → **8 passed in 6.18s** (auth/ownership, consent/privacy, duplicate 409 handling, diagnostic promotion, Haversine & wind vs. soil-borne transmission, missing weather & insufficient evidence, single-farm spam vs. multi-farm DBSCAN clusters, demo data isolation & alert lifecycle, assistant tool contracts & 8-crop guidance).
- **Full Backend Regression Suite:** `pytest backend/tests -q` → **87 passed, 1 skipped in 42.00s** (skipped test is optional live external Gemini key check in `test_agri_assistant.py`).
- **Frontend TypeScript Validation:** `cd frontend && npx tsc --noEmit` → **exit code 0** (0 errors).
- **Frontend Production Build:** `cd frontend && npm run build` → **✓ Compiled successfully, ✓ Generating static pages (38/38)** (`/surveillance`, `/crop-health`).

---

## 9. Demonstration Mode Instructions
1. Start backend (`uvicorn backend.app.main:app --host 127.0.0.1 --port 8000`) and frontend (`npm run start -p 3000` inside `frontend/`).
2. Sign in as Farmer demo user (`Suresh Gowda`) on `/login`.
3. Open `/surveillance` (or `/crop-health` → `2. Pest & Disease Alerts`).
4. By default **Live Community Data** shows strictly real consented reports (`is_demonstration = 0`, initially `0` until reports are submitted).
5. Click **Try Demonstration Scenario** in the header to view the isolated Mandya Tomato Early Blight/ToLCV + Chilli Anthracnose scenario (`demo_mode = true`), inspect DBSCAN clusters on the OpenStreetMap heatmap, view generated risk alerts, acknowledge/dismiss warnings, and toggle back to confirm live data stays untouched.

---

## 10. Known Limitations & Selective Integration Notes for Main Laptop
- **Known Limitations:**
  - Alerts are **in-app only** (`delivery_channel: "in_app_only"`); SMS/WhatsApp dispatch requires an external provider gateway not configured here.
  - Community heatmaps depend on voluntary anonymized farmer submissions; zero nearby reports accurately returns `Insufficient evidence` rather than assuming safety.
  - External OpenStreetMap tiles require internet access when rendering map backgrounds.
- **Selective Integration Into Main Laptop (`integration/final` / AD-37..AD-39):**
  1. Cherry-pick or copy `backend/app/features/disease_surveillance/`, `backend/migrations/003_disease_surveillance_tables.sql`, `backend/tests/test_disease_surveillance.py`, `frontend/src/lib/diseaseSurveillanceApi.ts`, and `frontend/src/features/disease-surveillance/` directly.
  2. Re-apply the small wiring edits in `backend/app/api/api.py`, `backend/app/db/database.py`, and `frontend/src/app/surveillance/page.tsx`.
  3. **Security / Auth Compatibility Note:** If the main laptop's AD-37+ security layer replaced `authenticate_bearer_user` or `resolve_authorized_farm` in `agri_assistant/context.py`, swap the imports in `backend/app/features/disease_surveillance/router.py` and `service.py` to point to the main laptop's canonical dependency (`get_current_user` / `verify_farm_ownership`), keeping the `user = {"id", "role", ...}` and `farm = {"id", "latitude", "longitude", ...}` contracts intact.
  4. **Gemini Voice Integration:** Register the functions in `backend/app/features/disease_surveillance/assistant_tools.py` (`TOOL_REGISTRY` / `TOOL_CONTRACTS`) in the main laptop's voice assistant orchestrator; no global assistant or i18n files were altered by AD-40C.
