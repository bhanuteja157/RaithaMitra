# RaithaMitra — Judges' Demonstration Scenarios & Readiness Checklists (AD-05B)

## 1. Four Reproducible Judges' Demonstration Scenarios

> **Disclosure:** Model-based simulations and demonstration datasets are explicitly labelled and must never be represented as guaranteed agricultural outcomes or live commercial inventory.

### Scenario A — Scientific Biotechnology & Procurement (BioIntel)
- **Farmer Context:** 2 acres (`0.809 ha`) Tomato cultivation, `Limited / Low` water availability, previous disease history (`Bacterial Wilt`, `Tomato Leaf Curl Virus`), budget `₹15,000`, required quantity `5,000` seedlings.
- **Route:** `/biointel` → Click **"Run Judges' Demo (2 Acres Tomato, 5k Seedlings)"** (or `POST /api/v1/biotech/advanced/workflow`).
- **Expected Verified Output:**
  1. **Species Validation (GBIF):** `Tomato` → *Solanum lycopersicum* (`taxon_key: 2930137`).
  2. **Scientific Research (Europe PMC):** Live peer-reviewed studies on tomato bacterial wilt & biofertilizers with DOI/PMID links.
  3. **Genetic Evidence (NCBI):** Live Tomato gene loci & deduplicated PubMed hits (shown in expandable panel; species-level only).
  4. **Indian Official Evidence (ICAR-IIHR):** *Arka Rakshak (F1 Hybrid)* (ToLCV, Bacterial Wilt, Early Blight resistance).
  5. **Climate & Soil Suitability:** Live Open-Meteo temperature / ET0 + soil pH compatibility.
  6. **OR-Tools CP-SAT Optimization:** Allocates `5,000` seedlings across verified/demo nurseries within `₹15,000` budget (`Optimal` status, straight-line distance clearly labelled when `GOOGLE_ROUTES_API_KEY` is absent).

### Scenario B — Water Scarcity (Scientific Precision Irrigation)
- **Inputs:** Crop `Tomato`, Stage `Mid-Season` ($K_c = 1.15$), Area `2.5 ha`, Irrigation `Drip Irrigation` (90% efficiency), Available Water `100 m³` (scarce), Flow Rate `20 m³/hr`, Live Open-Meteo $ET_0$.
- **Route:** `/irrigation` (or `POST /api/v1/scientific/irrigation/calculate`).
- **Expected Verified Output:**
  - $ET_c = K_c \times ET_0$; Net & Gross irrigation depths (`mm/day`); Volumetric demand (`1 mm/ha = 10 m³`); Duration (`hours`); and explicit **Water Deficit Alert** when daily gross volume exceeds `100 m³`.

### Scenario C — Financial Risk (Monte Carlo Simulation)
- **Inputs:** Area `2.5 ha`, Expected Yield `25 t/ha`, Selling Price `₹22,000/t`, Crop Loss `8%`, Water Availability `90%`, Cultivation Expenses `₹85,000`, Transport `₹18,000`, `5,000` trials, `seed=42`.
- **Route:** `/simulation` (or `POST /api/v1/scientific/simulation/financial`).
- **Expected Verified Output:**
  - Deterministic saleable harvest, break-even price (`₹/t`), and reproducible Monte Carlo P10 / Median (P50) / P90 profit distribution + probability of financial loss (`%`).

### Scenario D — Satellite & Digital Farm Intelligence
- **Inputs:** Farm coordinates (`12.5234, 76.8976`), optional GeoJSON polygon, spectral bands (`NIR=0.44, Red=0.08, SWIR=0.22, Blue=0.05`) on `/satellite`; Rainfall `× 0.5`, Irrigation Deficit `25%` on `/farm-twin`.
- **Routes:** `/satellite` and `/farm-twin`.
- **Expected Verified Output:**
  - Exact $\text{NDVI} = \frac{0.44 - 0.08}{0.44 + 0.08} = 0.6923$, $\text{NDWI} = 0.3333$, $\text{EVI} = 0.5825$; and 7-day simplified FAO-56/33 water balance trajectory & 3-zone moisture breakdown (explicitly labelled *Non-AquaCrop*).

---

## 2. External API Configuration Checklist

| Env Variable | Where Obtained | API to Enable | Billing Required | Verification Step |
| :--- | :--- | :--- | :--- | :--- |
| `GOOGLE_PLACES_API_KEY` | Google Cloud Console → Credentials | Places API (New) | Yes (free monthly credit) | `GET /api/v1/nurseries/nearby?lat=13.34&lon=77.10` returns `google_places_supplier` |
| `GOOGLE_ROUTES_API_KEY` | Google Cloud Console → Credentials | Routes API | Yes (free monthly credit) | `POST /api/v1/biotech/advanced/workflow` shows `"Google Routes road distance"` |
| `GEMINI_API_KEY` | Google AI Studio | Generative Language API | Free tier available | `gemini_used: true` in `POST /api/v1/biotech/advanced/workflow` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API | PostgreSQL + PostgREST + RLS | Free tier available | Apply `002_biointel_nursery_tables.sql` & verify DB query |
| `NCBI_API_KEY`, `NCBI_EMAIL` | NCBI Account Settings | NCBI E-utilities | No (Free; raises 3→10 req/s) | `GET /api/v1/biotech/advanced/genomics?crop=Tomato` |
| `SENTINEL_HUB_CLIENT_ID`, `SENTINEL_HUB_CLIENT_SECRET` | Copernicus Data Space / Sentinel Hub | Sentinel Hub Process/Stats API | Free quota / Paid | `sentinel_credentials_configured: true` in `/satellite` |

---

## 3. Crop Disease Detection ONNX Model Compatibility Checklist

- **Expected Model Path:** `backend/app/models/tomato_disease.onnx` (or `TOMATO_ONNX_MODEL_PATH` env var).
- **Required Python Package:** `onnxruntime` (CPU execution provider).
- **Expected Input Tensor:** `float32`, shape `[1, 3, 224, 224]` (NCHW RGB), ImageNet normalization (`mean=[0.485, 0.456, 0.406]`, `std=[0.229, 0.224, 0.225]`).
- **Expected Output Tensor:** `[1, num_classes]` logits converted via softmax.
- **Class Mapping & Licensing:** Must match the exact class index list from the authorized training run (e.g., PlantVillage Tomato classes) with verified dataset/model license before enabling inference.
