# AD-33 V2 — Real Satellite Agricultural Monitoring & Crop Digital Twin Report

- **Branch:** `feature/ad33-satellite-digital-twin`
- **Recovery Checkpoint:** `backup/pre-ad33`
- **Module:** Digital Farming & Satellite Intelligence

---

## 1. Real Satellite Data Provider & Authentication

- **Primary Authenticated OAuth Support:** Copernicus Data Space Ecosystem (`https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`, Sentinel Hub Process & Statistical APIs) when `CDSE_CLIENT_ID` / `CDSE_CLIENT_SECRET` (or `SENTINEL_HUB_CLIENT_ID` / `SECRET`) are configured in `backend/.env`. Currently not configured on this laptop (`SAT_ENV_KEYS_PRESENT: []`), so no paid quota is activated.
- **Open Copernicus Sentinel-2 L2A COG Retrieval (Active Without Paid Keys):** Element84 Earth Search v1 STAC API (`https://earth-search.aws.element84.com/v1/search`, collection `sentinel-2-l2a`) serving official 10 m (`B02`, `B03`, `B04`, `B08`) and 20 m (`B11`, `SCL`) Cloud-Optimized GeoTIFFs via HTTP Range windowed reads (`rasterio` + `pyproj` + `shapely`).
- **Cloud & Shadow Masking Method:** Official Sentinel-2 Scene Classification Layer (`SCL`) masking excludes classes `{0: NO_DATA, 1: SATURATED_DEFECTIVE, 3: CLOUD_SHADOWS, 8: CLOUD_MEDIUM_PROBABILITY, 9: CLOUD_HIGH_PROBABILITY, 10: THIN_CIRRUS}`. Scenes with `<40%` valid clear parcel pixels are rejected cleanly (`usable = False`) with explicit limitation messages.
- **Computed Indices (Over Clear Parcel Pixels Inside Mapped GeoJSON Polygon):**
  - `NDVI = (B08 - B04) / (B08 + B04)`
  - `NDMI = (B08 - B11) / (B08 + B11)` (explicitly labeled as Normalized Difference Moisture Index)
  - `EVI = 2.5 * (B08 - B04) / (B08 + 6*B04 - 7.5*B02 + 1.0)` (computed on surface reflectance scaled `/ 10000.0`)

## 2. Observed Real-World Tumakuru Verification Results (`2026-10-15` to `2026-11-26`)

Tested on genuine Tumakuru agricultural parcel (`lat=13.3407, lon=77.1140`, ~1.9 acres):

| Scene ID | Acquisition Timestamp (UTC) | Spatial Res | Parcel Cloud % | Valid Pixel % | NDVI Mean | NDMI Mean | EVI Mean | Cache Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `S2B_43PGQ_20261118_0_L2A` | `2026-11-18T05:25:21.132Z` | 10 m / 20 m | 0.0% | 100.0% | `0.2770` | `0.0018` | `0.2039` | Cached (`SQLite`) |
| `S2B_43PGQ_20261121_0_L2A` | `2026-11-21T05:35:15.676Z` | 10 m / 20 m | 0.0% | 100.0% | `0.2739` | `-0.0170` | `0.1739` | Cached (`SQLite`) |
| `S2C_43PGQ_20261123_0_L2A` | `2026-11-23T05:25:19.018Z` | 10 m / 20 m | 0.0% | 100.0% | `0.2541` | `-0.0350` | `0.1679` | Cached (`SQLite`) |

- **Data Freshness:** `2.6` days since `2026-11-23` overpass (`3/3` usable scenes; nominal Sentinel-2 revisit is ~5 days depending on orbital overlap and clouds).
- **Automatic Daily Refresh & Caching:** `backend/app/main.py` runs an async 24-hour background sync loop across `monitored_parcels` alongside SQLite `satellite_observations_cache` deduplication and `/satellite-monitoring/parcels/sync`.

## 3. Maize Agronomic Model & WebGL 3D Digital Twin Architecture

- **Maize Varieties (`maize_model.py`):**
  - `NAH-1137 (Nithyashree Hybrid)`: 110 days, `60cm × 20cm` spacing, TGW `290 g`, GDD target `1480 °C·d` (UAS Bengaluru / ICAR-IIMR).
  - `PMH-1`: 95 days, TGW `265 g`, GDD `1320 °C·d`.
  - `Deccan-103`: 120 days, `60cm × 25cm` spacing, TGW `310 g`, GDD `1620 °C·d`.
- **Observed Tumakuru 1.9-Acre NAH-1137 Output (`ESTIMATED`):**
  - Required seed: `21.68 kg` (`74,759` seeds); Theoretical stand: `64,075` plants; Established stand (90% germ): `57,668` plants; Expected harvest (`2026-09-01` sowing): `2026-12-20`.
  - 15 biological stages (`Seed Sowing` -> `Imbibition` -> `Radicle` -> `Coleoptile` -> `V1-V2` -> `V3-V5` -> `V6-V9` -> `V10-V14` -> `VT Tassel` -> `R1 Silk` -> `Pollination` -> `Ear Dev` -> `Kernel Fill` -> `R6 Maturity` -> `Grain Drying/Harvest`).
- **3-Mode WebGL & Satellite Architecture:**
  - **Mode A (`RealSatelliteMonitorPanel.tsx`):** Observed True-Color RGB, False-Color (`NIR-R-G`), NDVI Heatmap, before/after split slider, Observation-vs-Prediction Recharts chart, and trend divergence alert (`"Observed vegetation development differs from the predicted growth trend."`).
  - **Mode B & C (`CropDigitalTwin3D.tsx`):** Built with `Three.js` WebGL (`PCFSoftShadowMap`, procedural `CanvasTexture` moist-to-dry soil & leaf midrib/lateral vein textures, `InstancedMesh` polygon-clipped rows displaying both estimated actual stand and rendered sample count, soil cutaway revealing seed/radicle/lateral roots/tubers/pods, Maize progressive alternating leaves/tassels/silks/kernel cob, weather rainfall particles & wind sway, interactive orbit/zoom, and WebGL fallback).
  - Asset provenance: All 3D textures/geometries are procedurally synthesized in `CropDigitalTwin3D.tsx` (`CanvasTexture`), avoiding unverified external assets; existing agricultural imagery remains sourced from project-owned files under `frontend/public/images/`.

## 4. Test & Build Verification

- **Backend Pytest** (`backend/tests/test_satellite_monitoring.py`, `test_crop_diagnostics.py`, `test_auth_rbac.py`, `test_mobile_otp_auth.py`): **21 passed** (`44.89s`).
- **Frontend TypeScript (`npx.cmd tsc --noEmit`) & Next.js Production Build (`npm.cmd run build`):** Passed with **0** errors across **38/38** static routes.
- **Browser WebGL FPS & Screenshots:** Interactive WebGL FPS readout and browser screenshots remain pending until Chrome remote debugging (`chrome://inspect/#remote-debugging`) is enabled on this machine; headless backend/build checks verify all computations and bundle compilation.

## 5. Modified & Added Files

- `backend/app/features/satellite_monitoring/` (`__init__.py`, `cdse_client.py`, `monitoring_service.py`, `maize_model.py`, `router.py`)
- `backend/app/api/api.py`, `backend/app/main.py`, `backend/app/services/satellite_service.py`
- `backend/tests/test_satellite_monitoring.py`
- `frontend/package.json`, `frontend/package-lock.json` (`three`, `@types/three`)
- `frontend/src/lib/satelliteMonitoringApi.ts`
- `frontend/src/components/digital-farming/CropDigitalTwin3D.tsx`
- `frontend/src/components/digital-farming/RealSatelliteMonitorPanel.tsx`
- `frontend/src/components/digital-farming/MaizeAgronomyCard.tsx`
- `frontend/src/components/digital-farming/DigitalFarmingWorkspace.tsx`
- `docs/AD33_REAL_SATELLITE_DIGITAL_TWIN.md`
