# backend/app/engines/biophysical.py
"""
Biophysical Engine:
Implements FAO-56 Penman-Monteith reference evapotranspiration (ET0) principles,
dual crop coefficients (Kc), and soil water balance depletion.
"""
from typing import Dict, Any

# Standard FAO-56 Crop Coefficients by Phenological Stage
CROP_COEFFICIENTS = {
    "tomato": {"Initial": 0.6, "Crop Development": 0.85, "Mid-Season": 1.15, "Late Season": 0.80, "Harvest Ready": 0.70},
    "wheat": {"Initial": 0.4, "Crop Development": 0.75, "Mid-Season": 1.15, "Late Season": 0.40, "Harvest Ready": 0.25},
    "rice": {"Initial": 1.05, "Crop Development": 1.10, "Mid-Season": 1.20, "Late Season": 0.90, "Harvest Ready": 0.70},
    "maize": {"Initial": 0.4, "Crop Development": 0.80, "Mid-Season": 1.20, "Late Season": 0.50, "Harvest Ready": 0.35},
    "cotton": {"Initial": 0.45, "Crop Development": 0.75, "Mid-Season": 1.15, "Late Season": 0.70, "Harvest Ready": 0.50},
    "sugarcane": {"Initial": 0.40, "Crop Development": 1.00, "Mid-Season": 1.25, "Late Season": 0.75, "Harvest Ready": 0.60},
    "potato": {"Initial": 0.50, "Crop Development": 0.75, "Mid-Season": 1.15, "Late Season": 0.75, "Harvest Ready": 0.65},
    "chilli": {"Initial": 0.60, "Crop Development": 0.80, "Mid-Season": 1.10, "Late Season": 0.85, "Harvest Ready": 0.70},
}

DEFAULT_KC = {"Initial": 0.5, "Crop Development": 0.8, "Mid-Season": 1.1, "Late Season": 0.6, "Harvest Ready": 0.4}

def calculate_crop_water_demand(crop: str, stage: str, et0_mm: float) -> float:
    """
    Computes daily crop evapotranspiration ETc = Kc * ET0 (mm/day).
    """
    crop_lower = crop.lower().strip()
    kc_table = CROP_COEFFICIENTS.get(crop_lower, DEFAULT_KC)
    kc = kc_table.get(stage, 1.0)
    etc = round(kc * et0_mm, 2)
    return max(0.5, etc)

def estimate_root_zone_moisture(
    soil_type: str,
    recent_rain_mm: float,
    recent_etc_mm: float,
    irrigation_applied_mm: float = 0.0
) -> float:
    """
    Calculates estimated volumetric soil moisture percentage based on water balance.
    Field Capacity (FC) & Wilting Point (WP) approximations for common Indian soils.
    """
    soil_props = {
        "red sandy loam": {"fc": 22.0, "wp": 9.0, "default": 16.0},
        "black cotton soil": {"fc": 38.0, "wp": 18.0, "default": 28.0},
        "alluvial soil": {"fc": 30.0, "wp": 14.0, "default": 22.0},
        "clay loam": {"fc": 32.0, "wp": 15.0, "default": 24.0},
        "sandy loam": {"fc": 20.0, "wp": 8.0, "default": 14.0},
        "laterite soil": {"fc": 24.0, "wp": 11.0, "default": 17.0},
    }
    key = soil_type.lower().strip()
    props = soil_props.get(key, {"fc": 25.0, "wp": 12.0, "default": 18.0})
    
    # Net water flux in root zone (assuming 30cm root depth)
    net_water_mm = recent_rain_mm + irrigation_applied_mm - recent_etc_mm
    # 1 mm of water in 300 mm root zone ~ 0.33% volumetric moisture change
    delta_moisture_pct = net_water_mm * 0.33
    estimated_moisture = props["default"] + delta_moisture_pct
    return round(min(max(estimated_moisture, props["wp"] - 2.0), props["fc"] + 4.0), 1)
