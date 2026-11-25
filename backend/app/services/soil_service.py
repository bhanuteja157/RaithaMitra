# backend/app/services/soil_service.py
"""
P1: Soil & Nutrient Intelligence Service.
Evaluates laboratory Soil Health Card parameters against documented ICAR thresholds,
checks crop-specific pH compatibility, optionally queries ISRIC SoilGrids v2.0 (modeled),
and links biological nutrient options to BioIntel without fabricating NPK from GPS.
"""
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import requests
from backend.app.schemas.scientific import SoilAnalysisRequest, ScientificModuleOutput

# Documented crop-specific optimal pH ranges (ICAR / FAO guidelines)
CROP_PH_RANGES: Dict[str, tuple[float, float]] = {
    "tomato": (6.0, 7.0),
    "rice": (5.5, 7.0),
    "wheat": (6.0, 7.5),
    "maize": (5.8, 7.2),
    "chilli": (6.0, 7.2),
    "banana": (6.0, 7.5),
    "mango": (5.5, 7.5),
    "cotton": (6.0, 8.0),
    "potato": (5.2, 6.5),
}


def _classify_icar_nutrient(value: Optional[float], low_thresh: float, high_thresh: float) -> str:
    if value is None:
        return "not_measured"
    if value < low_thresh:
        return "low_deficient"
    if value <= high_thresh:
        return "medium_moderate"
    return "high_sufficient"


class SoilService:
    def _fetch_soilgrids(self, lat: float, lon: float) -> Dict[str, Any]:
        """
        Queries ISRIC SoilGrids v2.0 REST API for modeled topsoil (0-5cm) properties.
        Explicitly labeled as global gridded model estimates, NOT laboratory NPK.
        """
        url = "https://rest.isric.org/soilgrids/v2.0/properties/query"
        params = [
            ("lon", str(round(lon, 4))),
            ("lat", str(round(lat, 4))),
            ("property", "phh2o"),
            ("property", "soc"),
            ("property", "clay"),
            ("property", "sand"),
            ("depth", "0-5cm"),
            ("value", "mean"),
        ]
        try:
            resp = requests.get(url, params=params, timeout=5.0)
            if resp.status_code != 200:
                return {"available": False, "note": f"SoilGrids returned HTTP {resp.status_code}."}
            data = resp.json()
            layers = data.get("properties", {}).get("layers", [])
            parsed: Dict[str, Any] = {"available": True, "source": "ISRIC SoilGrids v2.0 (250m global model)"}
            for layer in layers:
                name = layer.get("name")
                depths = layer.get("depths", [])
                if not depths:
                    continue
                mean_val = depths[0].get("values", {}).get("mean")
                if mean_val is None:
                    continue
                if name == "phh2o":
                    parsed["modeled_ph"] = round(mean_val / 10.0, 2)
                elif name == "soc":
                    # dg/kg -> % organic carbon (divide by 100)
                    parsed["modeled_organic_carbon_pct"] = round(mean_val / 100.0, 2)
                elif name == "clay":
                    parsed["modeled_clay_pct"] = round(mean_val / 10.0, 1)
                elif name == "sand":
                    parsed["modeled_sand_pct"] = round(mean_val / 10.0, 1)
            return parsed
        except Exception:
            return {"available": False, "note": "ISRIC SoilGrids service unreachable; laboratory values only."}

    def analyze_soil(self, req: SoilAnalysisRequest) -> ScientificModuleOutput:
        # ICAR Soil Health Card standard thresholds (kg/ha)
        n_status = _classify_icar_nutrient(req.nitrogen_kg_ha, 280.0, 560.0)
        p_status = _classify_icar_nutrient(req.phosphorus_kg_ha, 10.0, 25.0)
        k_status = _classify_icar_nutrient(req.potassium_kg_ha, 110.0, 280.0)
        oc_status = _classify_icar_nutrient(req.organic_carbon_pct, 0.50, 0.75)

        deficiencies: List[str] = []
        improvements: List[str] = []
        biointel_links: List[Dict[str, str]] = []
        actions: List[str] = []

        if n_status == "low_deficient":
            deficiencies.append(f"Nitrogen deficiency ({req.nitrogen_kg_ha} kg/ha < 280 kg/ha ICAR threshold)")
            improvements.append("Supplement Nitrogen using Azotobacter/Rhizobium biofertilizers and split organic N sources.")
            biointel_links.append({
                "intervention": "ICAR-IIHR Microbial Consortium (N-fixer)",
                "category": "biofertilizers",
                "route": "/nursery-marketplace?category=biofertilizers",
            })
        if p_status == "low_deficient":
            deficiencies.append(f"Phosphorus deficiency ({req.phosphorus_kg_ha} kg/ha < 10 kg/ha ICAR threshold)")
            improvements.append("Apply Phosphate Solubilizing Bacteria (PSB) & VAM Mycorrhiza to unlock fixed soil phosphorus.")
            biointel_links.append({
                "intervention": "VAM (Glomus intraradices) Mycorrhizal Bio-inoculant",
                "category": "beneficial_soil_microorganisms",
                "route": "/nursery-marketplace?category=beneficial_soil_microorganisms",
            })
        if k_status == "low_deficient":
            deficiencies.append(f"Potassium deficiency ({req.potassium_kg_ha} kg/ha < 110 kg/ha ICAR threshold)")
            improvements.append("Use Potassium Mobilizing Bacteria (Frateuria aurantia) with composted agro-residue.")
        if oc_status == "low_deficient":
            deficiencies.append(f"Low Organic Carbon ({req.organic_carbon_pct}% < 0.50%)")
            improvements.append("Incorporate Trichoderma-enriched farm waste biocompost or vermicompost to build humus.")
            biointel_links.append({
                "intervention": "Trichoderma-Enriched Agro-Waste Biocompost",
                "category": "agricultural_waste_bioconversion",
                "route": "/biointel",
            })

        # Crop-specific pH compatibility
        crop_key = req.crop_type.lower().strip()
        opt_low, opt_high = CROP_PH_RANGES.get(crop_key, (6.0, 7.5))
        ph_compatibility = "not_measured"
        if req.soil_ph is not None:
            if req.soil_ph < opt_low:
                ph_compatibility = "acidic_below_optimal"
                deficiencies.append(f"Soil pH ({req.soil_ph}) is below optimal range ({opt_low}–{opt_high}) for {req.crop_type}.")
                improvements.append("Consider agricultural lime soil amendment guided by local KVK lime-requirement testing.")
            elif req.soil_ph > opt_high:
                ph_compatibility = "alkaline_above_optimal"
                deficiencies.append(f"Soil pH ({req.soil_ph}) is above optimal range ({opt_low}–{opt_high}) for {req.crop_type}.")
                improvements.append("Incorporate organic matter / gypsum based on soil sodicity test to buffer alkalinity.")
            else:
                ph_compatibility = "optimal"

        if any(s == "not_measured" for s in [n_status, p_status, k_status]):
            actions.append("Submit a Soil Health Card (SHC) lab sample for missing N-P-K measurements before deciding fertilizer rates.")

        if deficiencies:
            actions.extend(improvements[:3])
        else:
            actions.append(f"Measured soil parameters are compatible with {req.crop_type}; maintain organic matter with microbial consortia.")

        soilgrids_data = self._fetch_soilgrids(req.latitude, req.longitude) if req.fetch_soilgrids else {"available": False, "note": "Not requested"}

        has_any_lab_input = any(
            v is not None for v in [req.nitrogen_kg_ha, req.phosphorus_kg_ha, req.potassium_kg_ha, req.soil_ph, req.organic_carbon_pct]
        )

        return ScientificModuleOutput(
            farm_id=req.farm_id,
            module="soil_and_nutrient_intelligence",
            source=f"ICAR Soil Health Card Thresholds ({req.measurement_source})"
            + (" + ISRIC SoilGrids v2.0" if soilgrids_data.get("available") else ""),
            timestamp=datetime.now(timezone.utc),
            units={
                "nitrogen": "kg/ha",
                "phosphorus": "kg/ha",
                "potassium": "kg/ha",
                "soil_ph": "pH (1:2.5 water)",
                "organic_carbon": "%",
                "soil_moisture": "% volumetric",
            },
            data_quality="measured" if req.measurement_source == "laboratory_soil_health_card" and has_any_lab_input else "user_provided",
            is_live=bool(soilgrids_data.get("available")),
            assumptions=[
                "Thresholds follow ICAR Soil Health Card (SHC) classifications: N (<280/280-560/>560 kg/ha), P (<10/10-25/>25 kg/ha), K (<110/110-280/>280 kg/ha), OC (<0.50/0.50-0.75/>0.75%).",
                "NPK values are NEVER fabricated from GPS coordinates; missing fields remain unmeasured.",
                "Unsupported exact synthetic fertilizer dosages are omitted pending lab calibration.",
            ],
            uncertainty="±10% (laboratory extraction & field spatial heterogeneity)",
            results={
                "crop_type": req.crop_type,
                "soil_texture": req.soil_texture,
                "measurement_source": req.measurement_source,
                "optimal_ph_range": {"min": opt_low, "max": opt_high},
                "nutrient_status": {
                    "nitrogen": {"value_kg_ha": req.nitrogen_kg_ha, "status": n_status},
                    "phosphorus": {"value_kg_ha": req.phosphorus_kg_ha, "status": p_status},
                    "potassium": {"value_kg_ha": req.potassium_kg_ha, "status": k_status},
                    "organic_carbon": {"value_pct": req.organic_carbon_pct, "status": oc_status},
                    "soil_ph": {"value": req.soil_ph, "compatibility": ph_compatibility},
                    "soil_moisture_pct": req.soil_moisture_pct,
                },
                "deficiencies": deficiencies,
                "soil_improvement_recommendations": improvements,
                "biointel_biological_options": biointel_links,
                "soilgrids_modeled_reference": soilgrids_data,
            },
            recommended_actions=actions,
        )


soil_service = SoilService()
