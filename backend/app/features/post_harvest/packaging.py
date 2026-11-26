"""
AD-38 (P1): Crop-Specific Smart Packaging & Cold-Chain Assessment Engine.
Selectively adopts scientifically supportable packaging & cold-chain calculations inside AD-27,
clearly labelling all outputs as estimates and never fabricating shock % or lab certificates.
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Optional

CROP_PACKAGING_PROFILES: Dict[str, Dict[str, Any]] = {
    "tomato": {
        "fragility": "high",
        "moisture_sensitivity": "medium",
        "ventilation_required": True,
        "cold_chain_recommended": True,
        "target_temp_c": "10–13 °C (ripe) / 13–15 °C (mature green)",
        "container": "Ventilated HDPE Plastic Crates (20 kg capacity)",
        "crate_capacity_kg": 20.0,
        "crate_cost_inr": 18.0,
        "cushioning": "Perforated kraft paper liner + moulded pulp/foam tray separator (for Grade A ripe)",
        "cushioning_cost_per_crate_inr": 12.0,
        "ambient_shelf_hours": 48,
    },
    "green chilli": {
        "fragility": "medium",
        "moisture_sensitivity": "high",
        "ventilation_required": True,
        "cold_chain_recommended": True,
        "target_temp_c": "7–10 °C, 90–95% RH",
        "container": "Perforated Corrugated Cartons or Ventilated Crates (15 kg capacity)",
        "crate_capacity_kg": 15.0,
        "crate_cost_inr": 22.0,
        "cushioning": "Micro-perforated moisture-wicking paper liner",
        "cushioning_cost_per_crate_inr": 8.0,
        "ambient_shelf_hours": 48,
    },
    "dry chilli": {
        "fragility": "low",
        "moisture_sensitivity": "very_high",
        "ventilation_required": False,
        "cold_chain_recommended": False,
        "target_temp_c": "Ambient dry (<25 °C, <65% RH)",
        "container": "Double-layered PP/HDPE Moisture-Barrier Lined Gunny Sacks (25 kg)",
        "crate_capacity_kg": 25.0,
        "crate_cost_inr": 28.0,
        "cushioning": "None required (use moisture-barrier LDPE inner liner)",
        "cushioning_cost_per_crate_inr": 10.0,
        "ambient_shelf_hours": 720,
    },
    "onion": {
        "fragility": "low",
        "moisture_sensitivity": "high",
        "ventilation_required": True,
        "cold_chain_recommended": False,
        "target_temp_c": "Ambient well-ventilated (20–30 °C, 65–70% RH)",
        "container": "Breathable Leno Mesh Bags (40 kg capacity)",
        "crate_capacity_kg": 40.0,
        "crate_cost_inr": 24.0,
        "cushioning": "None required",
        "cushioning_cost_per_crate_inr": 0.0,
        "ambient_shelf_hours": 360,
    },
    "potato": {
        "fragility": "low",
        "moisture_sensitivity": "medium",
        "ventilation_required": True,
        "cold_chain_recommended": False,
        "target_temp_c": "10–15 °C (short transit) / 4–7 °C (long storage)",
        "container": "Ventilated Jute or Leno Mesh Sacks (50 kg capacity)",
        "crate_capacity_kg": 50.0,
        "crate_cost_inr": 30.0,
        "cushioning": "None required",
        "cushioning_cost_per_crate_inr": 0.0,
        "ambient_shelf_hours": 360,
    },
    "paddy": {
        "fragility": "low",
        "moisture_sensitivity": "very_high",
        "ventilation_required": False,
        "cold_chain_recommended": False,
        "target_temp_c": "Ambient dry (<14% grain moisture)",
        "container": "Woven Polypropylene / Jute Grain Sacks (50 kg capacity)",
        "crate_capacity_kg": 50.0,
        "crate_cost_inr": 26.0,
        "cushioning": "None required",
        "cushioning_cost_per_crate_inr": 0.0,
        "ambient_shelf_hours": 2160,
    },
    "capsicum": {
        "fragility": "high",
        "moisture_sensitivity": "medium",
        "ventilation_required": True,
        "cold_chain_recommended": True,
        "target_temp_c": "7–10 °C, 90–95% RH",
        "container": "5-Ply Ventilated CFB Cartons / Crates (12 kg capacity)",
        "crate_capacity_kg": 12.0,
        "crate_cost_inr": 26.0,
        "cushioning": "Soft tissue / honeycomb partition dividers",
        "cushioning_cost_per_crate_inr": 14.0,
        "ambient_shelf_hours": 48,
    },
}


def recommend_packaging_and_cold_chain(
    *,
    crop_name: str,
    quantity_kg: float,
    ripeness: str = "optimal",
    distance_km: float = 60.0,
    transit_hours: Optional[float] = None,
    market_type: str = "regional_wholesale",
) -> Dict[str, Any]:
    key = (crop_name or "tomato").strip().lower()
    profile = CROP_PACKAGING_PROFILES.get(
        key,
        {
            "fragility": "medium",
            "moisture_sensitivity": "medium",
            "ventilation_required": True,
            "cold_chain_recommended": False,
            "target_temp_c": "Cool ventilated (12–20 °C)",
            "container": "Ventilated HDPE Crates or 5-Ply CFB Cartons (20 kg capacity)",
            "crate_capacity_kg": 20.0,
            "crate_cost_inr": 22.0,
            "cushioning": "Kraft paper liner for surface protection",
            "cushioning_cost_per_crate_inr": 8.0,
            "ambient_shelf_hours": 72,
        },
    )

    est_transit_h = float(transit_hours) if transit_hours is not None else max(2.0, round(distance_km / 35.0, 1))
    units_needed = max(1, math.ceil(quantity_kg / profile["crate_capacity_kg"]))

    layers: List[Dict[str, str]] = [
        {"layer": "Outer Container", "spec": profile["container"]},
        {"layer": "Batch Label", "spec": "Water-resistant QR Batch Passport & harvest-date tag"},
    ]
    unit_cost = float(profile["crate_cost_inr"]) + 2.0  # ₹2 per batch label

    # Add cushioning only when crop fragility/ripeness warrants it
    if profile["fragility"] in ("high", "medium") or ripeness == "ripe":
        if profile["cushioning"] and profile["cushioning"] != "None required":
            layers.append({"layer": "Protective Cushioning", "spec": profile["cushioning"]})
            unit_cost += float(profile["cushioning_cost_per_crate_inr"])

    if profile["ventilation_required"]:
        layers.append({"layer": "Ventilation", "spec": "Cross-ventilated slots (min 8% open area) to prevent heat buildup"})
    elif profile["moisture_sensitivity"] in ("high", "very_high"):
        layers.append({"layer": "Moisture Barrier", "spec": "Food-grade LDPE inner liner sealed against ambient humidity"})

    needs_cold_chain = bool(profile["cold_chain_recommended"]) and (
        est_transit_h >= 8.0 or distance_km >= 150.0 or ripeness == "ripe" or market_type == "cold_chain_retail"
    )
    if needs_cold_chain:
        layers.append({
            "layer": "Thermal Protection (Estimate)",
            "spec": f"Pre-cool produce and use insulated liner/reefer transport ({profile['target_temp_c']})",
        })
        unit_cost += 18.0

    total_packaging_cost = round(units_needed * unit_cost, 2)
    ordinary_transport_cost = round(max(600.0, distance_km * 32.0), 2)
    reefer_transport_cost = round(max(1200.0, distance_km * 52.0), 2)

    thermal_risk = "Low"
    if profile["cold_chain_recommended"] and not needs_cold_chain and est_transit_h >= 6.0:
        thermal_risk = "Moderate (ambient heat exposure)"
    elif profile["cold_chain_recommended"] and est_transit_h > profile["ambient_shelf_hours"] * 0.5:
        thermal_risk = "High without refrigeration"

    return {
        "is_estimate": True,
        "crop_name": crop_name,
        "quantity_kg": round(quantity_kg, 2),
        "ripeness": ripeness,
        "distance_km": round(distance_km, 1),
        "estimated_transit_hours": est_transit_h,
        "recommended_units_count": units_needed,
        "unit_capacity_kg": profile["crate_capacity_kg"],
        "estimated_packaging_cost_inr": total_packaging_cost,
        "cost_per_kg_inr": round(total_packaging_cost / max(1.0, quantity_kg), 2),
        "target_temperature_guidance": profile["target_temp_c"],
        "cold_chain_recommended": needs_cold_chain,
        "refrigerated_vehicle_compatible": needs_cold_chain,
        "estimated_thermal_exposure_risk": thermal_risk,
        "packaging_layers": layers,
        "transport_cost_comparison_inr": {
            "ordinary_vehicle_estimate": ordinary_transport_cost,
            "refrigerated_vehicle_estimate": reefer_transport_cost,
            "premium_inr": round(reefer_transport_cost - ordinary_transport_cost, 2),
        },
        "limitations": (
            "Packaging cost, transit time, and thermal risk are engineering estimates; "
            "no shock-absorption percentage or guaranteed spoilage prevention is claimed without live sensor telemetry."
        ),
    }
