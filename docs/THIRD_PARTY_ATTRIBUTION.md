# RaithaMitra (ರೈತ ಮಿತ್ರ) — Third-Party Attribution & Legal Notices

**Team:** Syntax Squad  
**Competition:** HackWarts 2026  
**Product:** RaithaMitra — AI-Powered Agricultural Intelligence and Rural Economic Optimization System

---

## 1. Compliance Statement

RaithaMitra adheres to all applicable open-source software licenses, academic integrity guidelines, and hackathon rules.
- **Original Innovations:** The central decision optimization engine, multi-module unified farm context, evidence-grounded recommendation system, real-time Open-Meteo biophysical pipelines, and multilingual responsive Next.js/FastAPI architecture are original works developed by Syntax Squad.
- **Third-Party Research & Algorithmic References:** Where scientific algorithms, models, datasets, or reference patterns were evaluated, their respective licenses and copyright notices are honored as detailed below.
- **No Trademark Infringement:** No third-party repository names or brand identities are used within RaithaMitra's branding, routes, navigation, database schemas, or customer-facing copy.

---

## 2. Attributed Works & Licenses

### AquaCrop-OSPy
* **Original Project:** AquaCrop-OSPy (Soil-Crop-Water model based on FAO AquaCrop-OS)
* **Authors/Contributors:** AquaCrop-OSPy Contributors
* **License:** Apache License, Version 2.0
* **Notice:** Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
* **Usage in RaithaMitra:** Mathematical principles of FAO-56 Penman-Monteith reference evapotranspiration ($ET_0$) and FAO Irrigation & Drainage Paper 33 water-yield response ($K_y$) were consulted for the biophysical engine.

### KisaanMitra
* **Original Project:** KisaanMitra (A live-data decision agent for Indian farmers)
* **Copyright:** Copyright (c) 2026 FORGE '26 team
* **License:** MIT License
* **Usage in RaithaMitra:** The concept of evidence-grounded numeric guardrails (associating data source, timestamp, and measurement status to metrics presented to farmers) and deterministic fallback offline workflows.

### OfflineCropDoctor (Tomato Leaf Doctor)
* **Original Project:** Plant Disease Detection with MobileNetV2
* **Copyright:** Copyright (c) 2026 Ashwanth Kumaravel
* **License:** MIT License
* **Usage in RaithaMitra:** Computer vision disease ontology (classes, pathogen descriptions, visual symptoms, and management remedies) for offline tomato leaf disease diagnostics.

### OpenFarm
* **Original Project:** OpenFarm Crop Intelligence Platform
* **Copyright:** Copyright (c) 2026 OpenFarm Contributors
* **License:** BSD 3-Clause License
* **Usage in RaithaMitra:** Sentinel-2 multispectral vegetation index formulations (NDVI, NDWI, EVI) and standard GeoJSON field geometry representations.

---

## 3. External Data APIs & Services

1. **Open-Meteo Weather API**
   - **Provider:** Open-Meteo.com
   - **Terms:** Open-source weather API under Attribution 4.0 International (CC BY 4.0).
   - **Attribution:** Weather forecasts, hourly solar radiation, and FAO-56 Penman-Monteith reference evapotranspiration are powered by Open-Meteo.

2. **OpenStreetMap / CartoDB**
   - **Map Data:** © OpenStreetMap contributors under ODbL.
   - **Tiles:** CartoDB Positron / OSM Standard.
