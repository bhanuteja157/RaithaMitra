"""
AD-30: Cross-Module Conflict Detection & Resolution Engine.
Implements Conflicts A through H using genuine farm context and deterministic math.
"""
from __future__ import annotations

from typing import Any, Dict, List


def detect_and_resolve_conflicts(ctx: Dict[str, Any]) -> List[Dict[str, Any]]:
    conflicts: List[Dict[str, Any]] = []
    farm = ctx["farm"]
    wx = ctx["weather"]
    fin = ctx["finance"]
    sat = ctx["satellite"]
    ph = ctx["post_harvest"]
    eq = ctx["equipment"]
    labour = ctx["labour"]
    mkt = ctx["market"]["observations"]

    # Conflict A — Irrigation vs Rainfall
    if wx["available"] and wx["water_demand_mm_day"] is not None:
        rain_48h = float(wx["rain_48h_mm"])
        demand = float(wx["water_demand_mm_day"])
        if rain_48h >= 12.0:
            conflicts.append({
                "conflict_id": "CONF_A_IRRIGATION_RAIN",
                "title": "Irrigation Demand vs Forecast Rainfall",
                "modules": ["Irrigation (FAO-56)", "Open-Meteo Weather"],
                "severity": "medium",
                "description": (
                    f"{farm.primary_crop} ({farm.crop_stage}) requires ~{demand:.2f} mm/day, "
                    f"while {rain_48h:.1f} mm rainfall is forecast over the next 48 hours."
                ),
                "resolution": (
                    "Reduce or delay scheduled irrigation by 24–48 hours while monitoring actual rainfall; "
                    "do not cancel critical-stage watering if forecast rain fails to materialize."
                ),
                "route": "/irrigation",
            })

    # Conflict B & H — Budget vs Planned/Committed Expenses
    rem_budget = float(fin["remaining_budget_inr"])
    committed = float(fin["committed_expenses_inr"])
    if rem_budget < 0 or committed > float(fin["allocated_budget_inr"]) * 0.85:
        conflicts.append({
            "conflict_id": "CONF_BH_BUDGET_PRESSURE",
            "title": "Cultivation Budget vs Commitments & Expenses",
            "modules": ["AD-24 Financial Intelligence", "BioIntel / Operations"],
            "severity": "high" if rem_budget < 0 else "medium",
            "description": (
                f"Remaining budget is ₹{rem_budget:,.0f} (Allocated ₹{fin['allocated_budget_inr']:,.0f}, "
                f"Committed ₹{committed:,.0f}, Recorded ₹{fin['actual_recorded_expenses_inr']:,.0f})."
            ),
            "resolution": (
                "Prioritize essential crop protection and harvest operations; defer optional expenditures "
                "or evaluate lower-input seed/shared-machinery alternatives without cancelling confirmed commitments."
            ),
            "route": "/finance",
        })

    # Conflict C — Buyer Price vs Transportation Cost (when market obs exist)
    if len(mkt) >= 2:
        p0, p1 = mkt[0], mkt[1]
        if p0["modal_price_per_kg"] != p1["modal_price_per_kg"]:
            conflicts.append({
                "conflict_id": "CONF_C_MARKET_TRANSPORT",
                "title": "Headline Market Price vs Transportation Cost",
                "modules": ["AD-29 Market Intelligence", "Transport Connect"],
                "severity": "low",
                "description": (
                    f"Multiple markets show spread for {farm.primary_crop} "
                    f"(₹{p0['modal_price_per_kg']}/kg at {p0['market']} vs ₹{p1['modal_price_per_kg']}/kg at {p1['market']})."
                ),
                "resolution": "Rank markets by transport-adjusted net selling return in Market Intelligence before dispatching.",
                "route": "/market-intelligence",
            })

    # Conflict D — Storage vs Spoilage Risk
    if ph["summary"]["total_available_kg"] > 0:
        conflicts.append({
            "conflict_id": "CONF_D_STORAGE_SPOILAGE",
            "title": "Delayed Sale Upside vs Post-Harvest Spoilage Risk",
            "modules": ["AD-27 Post-Harvest", "AD-29 Market Intelligence"],
            "severity": "medium",
            "description": (
                f"{ph['summary']['total_available_kg']:,.0f} kg of harvested produce is in stock. "
                f"Holding for higher prices incurs storage fees and biological spoilage loss."
            ),
            "resolution": "Run Sell-Now vs Store with your exact storage temperature and spoilage rate before holding inventory.",
            "route": "/post-harvest",
        })

    # Conflict E — Harvest Timing vs Weather
    if ph["harvests"] and wx["available"] and wx["rain_48h_mm"] >= 12.0:
        conflicts.append({
            "conflict_id": "CONF_E_HARVEST_WEATHER",
            "title": "Upcoming Harvest vs Forecast Rainfall",
            "modules": ["Harvest Planning (AD-27)", "Open-Meteo Weather"],
            "severity": "high",
            "description": f"Harvest records exist while {wx['rain_48h_mm']:.1f} mm rain is forecast in 48 hours.",
            "resolution": "Verify actual field maturity and harvest mature produce in dry morning hours with covered staging.",
            "route": "/post-harvest",
        })

    # Conflict F — Equipment vs Labour Scheduling
    if eq["bookings"] and not labour["open_jobs"]:
        conflicts.append({
            "conflict_id": "CONF_F_EQUIPMENT_LABOUR",
            "title": "Machinery Schedule vs Supporting Labour Availability",
            "modules": ["AD-28 Equipment Connect", "Labour Connect"],
            "severity": "low",
            "description": "Equipment bookings are active without linked open/accepted field labour jobs.",
            "resolution": "Check whether loading or field assistance workers are required and prepare a Labour Connect draft with explicit confirmation.",
            "route": "/labour",
        })

    # Conflict G — Satellite Stress vs Non-Diagnostic Chemical Warning
    if sat and sat.get("ndvi") is not None and float(sat["ndvi"]) < 0.40:
        conflicts.append({
            "conflict_id": "CONF_G_SATELLITE_STRESS",
            "title": "Low Satellite Vegetation Index vs Unknown Root Cause",
            "modules": ["AD-25 Satellite Intelligence", "AD-22 Crop Doctor"],
            "severity": "high",
            "description": f"Cached NDVI is {float(sat['ndvi']):.3f}, indicating low canopy vigor or moisture/nutrient/pest stress.",
            "resolution": "Inspect affected field zones in person and use Crop Doctor leaf diagnostics before applying any chemical treatment.",
            "route": "/crop-health",
        })

    return conflicts
