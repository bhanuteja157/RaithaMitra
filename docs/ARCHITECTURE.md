# RaithaMitra (ರೈತ ಮಿತ್ರ) — System Architecture

**Brand:** Raitha Mitra — ರೈತ ಮಿತ್ರ  
**Tagline:** *From Seed to Sale, One Intelligent Companion*  
**Team:** Syntax Squad — HackWarts 2026  
**Domain:** AgriTech  

---

## 1. Architectural Principles

RaithaMitra is engineered as **ONE integrated agricultural intelligence platform**, not an ad-hoc collection of disconnected tools.

### Core Tenets:
1. **Single Farm Context**: Every module operates on the same authenticated farm profile, spatial parcel boundary, soil profile, and crop cycle.
2. **Centralized Decision Intelligence**: All domain insights (satellite indices, biophysical water balance, disease detections, market forecasts) feed into a single multi-criteria decision engine.
3. **Evidence-Grounded Data**: Every numeric recommendation displayed to the farmer includes:
   - `source`: e.g., "Open-Meteo High Resolution NWP", "In-situ Soil Moisture Sensor", "Sentinel-2 L2A", "FAO-56 Physical Calculation".
   - `timestamp`: Deterministic ISO 8601 UTC timestamp of measurement or calculation.
   - `status`: One of `live`, `measured`, `user_provided`, `estimated`, `simulated`, or `unavailable`.
   - `uncertainty`: Quantitative confidence interval (e.g., $\pm 8\%$).
4. **Resilient Local & Offline Operation**: When cloud APIs or external connectivity are degraded, the biophysical equations, ONNX models, and deterministic rule engines execute locally on device/edge.

---

## 2. System Topology

```
+-----------------------------------------------------------------------------------+
|                            RaithaMitra Unified Web App                            |
|                 (Next.js 14/15 App Router, React, TypeScript, Tailwind)          |
|                                                                                   |
|  [Farm Intelligence] [Satellite] [Twin] [Irrigation] [Climate] [AI Diagnostics]  |
|  [Soil/Nutrient] [Finance] [Simulation] [Marketplace] [Post-Harvest] [Resource]   |
|  [Surveillance] [Schemes Hub] [Multilingual Assistant] [Decision Intelligence]   |
+------------------------------------------+----------------------------------------+
                                           | HTTP / REST API (OpenAPI v3)
                                           v
+-----------------------------------------------------------------------------------+
|                            RaithaMitra Backend Engine                             |
|                        (FastAPI, Python 3.12, Pydantic v2)                        |
|                                                                                   |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  | Weather Service    |  | Biophysical Engine   |  | Risk Simulator            |  |
|  | (Open-Meteo API)   |  | (FAO-56 ET0, Ky)     |  | (Monte Carlo, VaR)        |  |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  | Diagnostic Engine  |  | Nutrient Engine      |  | Decision Engine           |  |
|  | (ONNX MobileNetV2) |  | (NPK Deficit Rules)  |  | (Multi-Criteria Ranking)  |  |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  | Data Layer: Supabase PostgreSQL + Local Prototype Persistence Adapter         |  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Unified Domain Model

All modules read and write to the standardized domain models:
- **`User`**: Authentication state, phone number, language preference (`en`, `kn`, `hi`), theme preference (`light`, `dark`).
- **`Farm`**: Spatial polygon coordinates, geo-hierarchy (State, District, Taluk/Village), total area in hectares, default irrigation infrastructure, soil texture class.
- **`CropCycle`**: Crop species, cultivar variety, sowing/transplanting date, anticipated harvest window, current phenological growth stage (Initial, Crop Development, Mid-Season, Late Season).
- **`SoilProfile`**: Depth layers, organic carbon %, nitrogen (N), phosphorus (P), potassium (K), pH, electrical conductivity (EC), field capacity, wilting point.
- **`WeatherSnapshot`**: Air temperature, relative humidity, precipitation, wind speed, solar radiation, FAO-56 Penman-Monteith reference evapotranspiration ($ET_0$).
- **`FarmRecommendation`**: Structured decision entity output by the centralized engine containing action directive, priority (`critical`, `high`, `medium`, `low`), agronomic rationale, quantitative supporting data, uncertainty, and alternative actions.

---

## 4. Centralized Decision Engine Architecture

The decision engine resolves conflicting recommendations across domains (e.g., "Market prices will peak in 3 days, but heavy rain is forecasted in 24 hours"):
1. **Input Normalization**: Ingests the current unified farm context, real-time weather alerts, crop stage, and cashflow constraints.
2. **Rule Matrix Evaluation**: Evaluates agronomic safety rules (e.g., never spray pesticides if wind speed $> 15$ km/h or rain probability $> 40\%$).
3. **Multi-Objective Optimization**: Balances yield preservation, operational costs, and water conservation.
4. **Structured Output**: Emits prioritized, human-readable action cards in the farmer's chosen language with full evidence provenance.
