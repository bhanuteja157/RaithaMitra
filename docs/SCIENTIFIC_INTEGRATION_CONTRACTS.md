# RaithaMitra (ರೈತ ಮಿತ್ರ) — Scientific Module Integration Contracts

**Target Modules:** AD-04 (Scientific Agricultural Intelligence) & AD-05 (Advanced BioIntel)  
**Target Branches:** `origin/feature/scientific-intelligence`, `origin/feature/biointel-advanced`  
**Architecture:** Standardized Scientific Envelope Ingestion (`backend/app/schemas/scientific_contract.py`)  

---

## 1. Unified Scientific Module Output Envelope

All scientific intelligence micro-services output data in the canonical `ScientificModuleOutput` schema:

```json
{
  "farm_id": "farm_001",
  "module": "scientific_irrigation",
  "source": "FAO-56 Dual Kc In-situ Soil Water Balance",
  "timestamp": "2026-11-25T10:00:00Z",
  "units": {
    "et0": "mm/day",
    "soil_moisture": "%",
    "root_zone_depletion": "mm"
  },
  "data_quality": "measured",
  "is_live": true,
  "assumptions": [
    "Drip discharge rate: 25 m3/ha/hr",
    "Canopy cover: 68%"
  ],
  "uncertainty": "±5%",
  "results": {
    "daily_crop_water_demand_mm": 4.82,
    "current_depletion_mm": 11.4,
    "wilting_point_risk": false
  },
  "recommended_actions": [
    {
      "action": "Run drip irrigation for 2.2 hours at 06:00 AM",
      "priority": "high",
      "urgency": "today"
    }
  ]
}
```

---

## 2. Scientific Adapters & Integration Points

| Module | Canonical Identifier | Core Metrics & Payload | Decision Engine Role |
| :--- | :--- | :--- | :--- |
| **Scientific Irrigation** | `scientific_irrigation` | $ET_0$, $K_c$, root zone depletion ($D_r$), irrigation hours | Conflict resolution against NWP rainfall and power grid availability |
| **Soil Intelligence** | `soil_intelligence` | Available N-P-K, pH, organic carbon %, EC ($dS/m$) | Fertilizer dosage and biological nutrient management recommendations |
| **Financial Risk Simulation** | `financial_simulation` | Monte Carlo profit distribution, P10/P50/P90, VaR95 | Budget compatibility verification for inputs and transport |
| **Digital Farm Twin** | `digital_farm_twin` | AquaCrop biomass accumulation, yield potential ($t/ha$) | Harvest timing and seasonal labour requirement forecasting |
| **Satellite Analysis** | `satellite_analysis` | Sentinel-2 NDVI, NDWI, EVI, chlorophyll indices | Zonal stress detection and targeted scouting advisories |
| **Crop Diagnostics** | `crop_diagnostics` | MobileNetV2 leaf pathology classification, confidence | Spray recommendations vs wind drift & humidity windows |
| **Advanced BioIntel** | `advanced_biointel` | 12 biotechnology services, genomics, biocontrol | Certified seed and biofertilizer procurement optimization |

---

## 3. Post-Merge Router Integration

When `feature/scientific-intelligence` is integrated, mount its router in `backend/app/api/api.py`:

```python
# In backend/app/api/api.py:
from backend.app.api.endpoints import scientific

# Register Scientific Router
api_router.include_router(scientific.router, prefix="/scientific", tags=["Scientific Intelligence"])
```
