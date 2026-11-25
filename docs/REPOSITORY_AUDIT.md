# RaithaMitra (ರೈತ ಮಿತ್ರ) — Reference Repositories Technical Audit

**Author:** Syntax Squad — HackWarts 2026  
**Date:** November 2026  
**Workspace:** `C:\Users\ppraj\Projects\RM`

---

## Executive Summary

As part of the initial discovery phase for **RaithaMitra**, a rigorous technical audit of the six reference repositories located in `references/` was conducted. In adherence to strict single-product governance and hackathon intellectual property rules:
- **No reference repository names** are used in branding, user interfaces, navigation, or API contracts.
- **No untrusted binary models (pickle/joblib)** or shell scripts were executed.
- All intellectual property and licensing terms were catalogued to ensure 100% legal compliance and proper attribution.
- The reference implementations provided valuable mathematical formulations, agronomic datasets, and architectural patterns, which are unified into a single, cohesive agricultural intelligence platform.

---

## Detailed Repository Audits

### 1. AquaCrop (aquacropos/aquacrop)
* **License:** Apache License 2.0 (Permissive open source)
* **Copyright:** AquaCrop-OSPy Contributors
* **Source Path:** `references/AquaCrop/aquacrop/`
* **Key Components Examined:**
  - `aquacrop/core.py`: Core simulation runner and daily time-stepping.
  - `aquacrop/entities/crop.py`: Crop phenology parameters, base temperatures, and yield response factors ($K_y$).
  - `aquacrop/entities/soil.py`: Multi-layer soil hydraulic characteristics, field capacity ($\theta_{FC}$), permanent wilting point ($\theta_{PWP}$), saturation ($\theta_{SAT}$), and saturated hydraulic conductivity ($K_{sat}$).
* **Dependencies:** NumPy, Numba, Pandas, SciPy, Matplotlib.
* **Input / Output Formats:**
  - *Inputs:* Daily weather time series (Min/Max Temp, Precipitation, Reference ET $ET_0$), initial soil water content, crop planting date, irrigation management schedule.
  - *Outputs:* Daily canopy cover ($CC$), transpiration ($Tr$), soil evaporation ($E$), biomass accumulation ($B$), and final harvest yield ($Y$).
* **Supported Crops:** Wheat, Maize, Rice, Cotton, Potato, Soybean, Barley, Tomato, Sorghum, Sunflower.
* **Reuse & Integration Strategy:**
  - Use the standard FAO-56 Penman-Monteith and Stewart yield-response formulation ($1 - Y/Y_m = K_y (1 - ET_c/ET_m)$) within RaithaMitra's biophysical engine (`backend/app/engines/biophysical.py`).
  - Numba AOT compilation is omitted to avoid Windows C-compiler build friction in hackathon runtimes; a vectorized pure NumPy/SciPy implementation is used.

---

### 2. HarvestIQ
* **License:** Hackathon Public Codebase (Unlicensed / MIT-compatible academic use)
* **Source Path:** `references/HarvestIQ/`
* **Key Components Examined:**
  - `backend/simulation/monte_carlo.py`: Stochastic yield and market price simulation using triangular/normal distributions.
  - `backend/ml/yield_model.py`: Hybrid machine learning and $K_y$ physical adequacy calculations.
  - `backend/simulation/recommendation.py`: Multi-scenario comparative scoring for crop choices.
  - `backend/data/market_data.py`: Cost breakdown per hectare for Indian crops (seeds, fertilizer, labor, machinery, water).
* **Dependencies:** FastAPI, Uvicorn, NumPy, Pandas, Scikit-Learn, SHAP, Next.js 14, Recharts.
* **Input / Output Formats:**
  - *Inputs:* Farm area (ha), crop type, soil texture, planned irrigation, localized cost items.
  - *Outputs:* Expected yield (tonnes), profit distribution percentiles ($P_{10}, P_{50}, P_{90}$), Value-at-Risk ($VaR_{95}$), and Sharpe/profitability ratios.
* **Supported Crops:** Wheat, Rice, Cotton, Sugarcane, Maize, Tomato, Mustard, Potato.
* **Reuse & Integration Strategy:**
  - Independently reimplement the Monte Carlo financial risk distribution algorithm and cost itemization inside `backend/app/engines/risk_simulator.py`.
  - Maintain clean separation: pure mathematical simulation logic is decoupled from UI presentation.

---

### 3. KisaanMitra
* **License:** MIT License (Copyright 2026 FORGE '26 team)
* **Source Path:** `references/KisaanMitra/`
* **Key Components Examined:**
  - `backend/app/agents/evidence.py`: Grounded numbers guardrail; tracks source, timestamp, and context lines for every numeric figure displayed to farmers.
  - `backend/app/agents/offline.py`: Deterministic fallback advice generator when external LLMs or internet connectivity are unavailable.
  - `backend/app/agents/planner.py`: Tool orchestration and question intent classification.
* **Dependencies:** Python 3.11+, FastAPI, Pydantic v2, HTTPX, LiteLLM.
* **Input / Output Formats:**
  - *Inputs:* Natural language farmer query, location coordinates, current crop and soil profile.
  - *Outputs:* Structured advisory with strict citations, numeric source verification, and multilingual localized text (English, Hindi, Marathi, Kannada).
* **Supported Crops:** General Indian staples, pulses, oilseeds, and vegetables.
* **Reuse & Integration Strategy:**
  - Adopt the **Evidence-Grounded Number Architecture**: every figure presented in RaithaMitra (ET, soil moisture, market prices, recommended spray volumes) carries data provenance (Source, Timestamp, Measured/Estimated flag).
  - Adopt the offline fallback strategy to ensure zero hallucination and continuous availability.

---

### 4. KisaanSetu
* **License:** Agri-Tech Hackathon 2025 Winner (Unlicensed / MIT-style competition codebase)
* **Source Path:** `references/KisaanSetu/`
* **Key Components Examined:**
  - `kisaansetu/lib/screens/government_schemes.dart`: Extensive repository of Indian central and state government agricultural schemes (PM-KISAN, PMFBY, PMKSY, Soil Health Card, KCC).
  - `kisaansetu/flask-model-server/app.py`: Fertilizer and crop suitability recommendation tables based on N-P-K soil ratings.
* **Dependencies:** Flutter / Dart (mobile), Flask (Python backend).
* **Input / Output Formats:**
  - *Inputs:* Farmer category (small/marginal), landholding size, state, soil N-P-K values.
  - *Outputs:* Eligible subsidies, application links, documentation requirements, fertilizer dosage recommendations.
* **Integration Limitations:**
  - Flutter and Flask are explicitly prohibited from the unified stack.
* **Reuse & Integration Strategy:**
  - Extract the factual government scheme definitions, eligibility rules, and N-P-K guidance tables into standardized JSON/Pydantic schemas in `backend/app/data/schemes.py` and `backend/app/engines/nutrient_engine.py`.
  - Present schemes through a modern Next.js desktop/mobile responsive UI.

---

### 5. OfflineCropDoctor
* **License:** MIT License (Copyright 2026 Ashwanth Kumaravel)
* **Source Path:** `references/OfflineCropDoctor/`
* **Key Components Examined:**
  - `deploy/static/model.onnx`: MobileNetV2 computer vision model trained on plant leaf diseases.
  - `deploy/static/classes.json`: 10 disease classes with pathogen cause, visual symptoms, and organic/chemical remedies.
  - `deploy/static/rules.json`: Offline confidence thresholds, feature centroids, and out-of-distribution leaf detection heuristics.
* **Dependencies:** ONNX Runtime, NumPy, Pillow.
* **Input / Output Formats:**
  - *Inputs:* RGB leaf image (224x224 tensor).
  - *Outputs:* Top-3 disease class probabilities, confidence score, pathogen diagnosis, and treatment plan.
* **Supported Diseases:** Tomato Early Blight, Late Blight, Bacterial Spot, Leaf Mold, Septoria Leaf Spot, Spider Mites, Target Spot, Yellow Leaf Curl Virus, Mosaic Virus, Healthy.
* **Reuse & Integration Strategy:**
  - Integrate the ONNX runtime inference adapter in `backend/app/engines/diagnostics_engine.py` for fully offline, zero-cloud-cost plant pathology.
  - Use pure ONNX Runtime CPU inference; avoid heavy GPU frameworks or PyTorch runtimes in production.

---

### 6. OpenFarm
* **License:** BSD 3-Clause License (Copyright 2026 OpenFarm Contributors)
* **Source Path:** `references/OpenFarm/`
* **Key Components Examined:**
  - `services/api/src/routers/satellite.py`: Sentinel-2 STAC API query contracts and vegetation index calculation formulas (NDVI, NDWI, EVI, SAVI).
  - `apps/web/`: Modern Next.js frontend patterns with Tailwind CSS and geospatial map components.
* **Dependencies:** Next.js, TypeScript, Tailwind CSS, Leaflet/MapLibre, FastAPI, Pydantic, Shapely.
* **Input / Output Formats:**
  - *Inputs:* Field boundary GeoJSON polygon, observation date range, cloud coverage threshold (<20%).
  - *Outputs:* Spatial raster / zonal statistics for Mean NDVI, NDWI (canopy moisture), EVI (biomass vigor), and localized stress anomalies.
* **Reuse & Integration Strategy:**
  - Adopt standardized GeoJSON polygon structures for farm plots and zones.
  - Implement mathematical vegetation index calculations and satellite telemetry contracts in `backend/app/services/satellite_service.py`.

---

## Architectural Synthesis Matrix

| Capability Needed in RaithaMitra | Best Reference Inspo | Unified Implementation Approach |
| :--- | :--- | :--- |
| **Biophysical Crop Water & Yield** | AquaCrop & HarvestIQ | Pure NumPy FAO-56 Penman-Monteith and $K_y$ physical yield deficit engine |
| **Financial & Monte Carlo Risk** | HarvestIQ | Granular Indian cost-of-cultivation database + stochastic Monte Carlo ($P_{10}/P_{50}/P_{90}$) |
| **Evidence Grounding & Offline Advisory** | KisaanMitra | Data provenance metadata (`source`, `timestamp`, `quality`) on every numeric metric |
| **Government Schemes & Nutrients** | KisaanSetu | Native Pydantic schema hub for PM-KISAN, PMFBY, PMKSY, KCC with regional language support |
| **Offline Leaf Disease Diagnostics** | OfflineCropDoctor | ONNX Runtime CPU inference with agronomic symptom and remedy knowledgebase |
| **Satellite Indices & Field Boundaries** | OpenFarm | GeoJSON farm polygon standard with NDVI/NDWI/EVI zonal statistics and Open-Meteo feeds |
