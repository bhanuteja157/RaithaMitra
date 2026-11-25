"""
AD-28: Agricultural Machinery Compatibility, Work Estimation & Weather-Aware Scheduling.
Uses 1 acre = 0.404686 ha and distinguishes effective field capacity from theoretical capacity.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

ACRE_TO_HA = 0.404686

OPERATION_CATEGORY_MAP: Dict[str, List[str]] = {
    "Land Preparation": ["Tractor", "Rotavator", "Plough", "Cultivator", "Power Tiller"],
    "Sowing": ["Seed Drill", "Paddy Transplanter", "Tractor"],
    "Cultivation": ["Cultivator", "Rotavator", "Power Tiller"],
    "Crop Protection": ["Sprayer", "Agricultural Drone"],
    "Irrigation": ["Irrigation Pump"],
    "Harvesting": ["Combine Harvester", "Thresher"],
    "Post-Harvest Processing": ["Thresher", "Chaff Cutter", "Baling Machine"],
}


def is_equipment_compatible(category: str, suitable_operations: List[str], operation_type: str) -> bool:
    op_lower = (operation_type or "").strip().lower()
    if any(op_lower in s.lower() or s.lower() in op_lower for s in suitable_operations):
        return True
    for op_name, cats in OPERATION_CATEGORY_MAP.items():
        if op_lower in op_name.lower() or op_name.lower() in op_lower:
            return category in cats
    return False


def estimate_operation_duration(
    *,
    farm_area_acres: float,
    effective_field_capacity_ha_hr: float,
    theoretical_capacity_ha_hr: Optional[float] = None,
    setup_minutes: int = 20,
    travel_minutes: int = 20,
) -> Dict[str, Any]:
    area_ha = round(float(farm_area_acres) * ACRE_TO_HA, 4)
    eff_cap = max(0.05, float(effective_field_capacity_ha_hr))
    operating_hours = round(area_ha / eff_cap, 2)
    total_hours = round(operating_hours + (setup_minutes + travel_minutes) / 60.0, 2)
    return {
        "farm_area_acres": round(farm_area_acres, 2),
        "farm_area_ha": area_ha,
        "effective_field_capacity_ha_hr": eff_cap,
        "theoretical_capacity_ha_hr": theoretical_capacity_ha_hr,
        "estimated_operating_hours": operating_hours,
        "setup_and_travel_hours": round((setup_minutes + travel_minutes) / 60.0, 2),
        "total_estimated_hours": total_hours,
        "disclaimer": (
            "Duration is an estimate based on effective field capacity (not theoretical peak capacity) "
            "and excludes unforeseen field obstructions or weather delays."
        ),
    }


def evaluate_weather_scheduling_constraints(
    *,
    operation_type: str,
    category: str,
    rain_48h_mm: float,
    wind_speed_kmh: float,
    temperature_c: float,
) -> Dict[str, Any]:
    warnings: List[str] = []
    op_lower = operation_type.lower()
    cat_lower = category.lower()

    if rain_48h_mm >= 12.0:
        if any(w in op_lower for w in ("harvest", "sow", "land", "tillage", "prep")):
            warnings.append(
                f"Heavy rainfall forecast ({rain_48h_mm:.1f} mm over 48h) may interrupt {operation_type} and cause wet-soil compaction under heavy machinery."
            )
        if any(w in op_lower for w in ("spray", "protection")):
            warnings.append(
                f"Forecast rainfall ({rain_48h_mm:.1f} mm) can wash off foliar sprays; reschedule spraying to a dry window."
            )

    if wind_speed_kmh >= 15.0 and ("spray" in op_lower or "spray" in cat_lower or "drone" in cat_lower):
        warnings.append(
            f"Elevated wind speed ({wind_speed_kmh:.1f} km/h) increases spray drift risk; avoid aerial or boom spraying during gusts."
        )

    if temperature_c >= 38.0:
        warnings.append(
            f"High ambient temperature ({temperature_c:.1f}°C): schedule heavy tractor/operator shifts in early morning or late afternoon."
        )

    if "drone" in cat_lower:
        warnings.append(
            "Drone Operations Notice: Operator must hold valid DGCA remote pilot authorization, follow local airspace rules, and comply with pesticide label safety guidelines."
        )

    return {
        "has_warnings": len(warnings) > 0,
        "warnings": warnings,
        "weather_snapshot": {
            "rain_48h_mm": round(rain_48h_mm, 1),
            "wind_speed_kmh": round(wind_speed_kmh, 1),
            "temperature_c": round(temperature_c, 1),
        },
    }
