# backend/app/features/agri_assistant/tool_registry.py
"""
Controlled Agricultural Tool-Calling Registry (Tools A through M) for AD-23.
Every tool executes real RaithaMitra backend services, scientific engines, or SQLite queries.
Never fabricates lab readings, notifications, prices, or disease predictions.
"""
import asyncio
import json
import os
import time
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from backend.app.data.indian_ag_evidence import get_indian_evidence_for_crop
from backend.app.data.schemes import INDIAN_GOVERNMENT_SCHEMES
from backend.app.db.database import get_db_connection
from backend.app.engines.decision_engine import decision_engine
from backend.app.features.agri_assistant.safety import is_tool_allowed_for_role
from backend.app.features.agri_assistant.schemas import ToolDescriptor
from backend.app.schemas.biotech import FarmerProfileInput
from backend.app.schemas.farm import Farm
from backend.app.schemas.scientific import (
    FarmTwinRequest,
    FinancialSimulationRequest,
    IrrigationRequest,
    SoilAnalysisRequest,
)
from backend.app.services.biotech_service import biotech_service
from backend.app.services.diagnostics_service import diagnostics_service
from backend.app.services.farm_twin_service import farm_twin_service
from backend.app.services.nursery_service import nursery_service
from backend.app.services.scientific_irrigation_service import scientific_irrigation_service
from backend.app.services.simulation_service import simulation_service
from backend.app.services.soil_service import CROP_PH_RANGES, soil_service
from backend.app.services.weather_service import weather_service

# Short-lived non-sensitive cache for weather & research calls (5 min TTL)
_WEATHER_CACHE: Dict[str, Tuple[float, Any]] = {}
_WEATHER_CACHE_TTL_S = 300.0

# Pre-calibrated ICAR / UAS deterministic crop economics (aligned with frontend/src/lib/seedInvestment.ts)
CROP_ECONOMICS: Dict[str, Dict[str, Any]] = {
    "tomato": {
        "name": "Tomato",
        "duration_days": 120,
        "water_need": "Moderate",
        "water_requirement_mm": 520,
        "compatible_soils": ["Red soil", "Red Sandy Loam", "Loamy soil", "Black soil", "Alluvial soil"],
        "default_variety": "Arka Rakshak F1 (Triple Resistant)",
        "seed_rate_per_acre_kg": 0.06,
        "seed_price_per_kg": 35000.0,
        "fertilizer_per_acre": 12000.0,
        "labour_per_acre": 18000.0,
        "irrigation_per_acre": 6000.0,
        "other_per_acre": 4000.0,
        "expected_yield_per_acre_kg": 10000.0,
        "expected_selling_price_per_kg": 16.0,
        "major_risks": [
            "Tomato Leaf Curl Virus (ToLCV) via whiteflies in dry heat",
            "Bacterial wilt in waterlogged soils",
            "High perishability & spot mandi price volatility",
        ],
    },
    "maize": {
        "name": "Maize",
        "duration_days": 105,
        "water_need": "Moderate",
        "water_requirement_mm": 480,
        "compatible_soils": ["Red soil", "Red Sandy Loam", "Black soil", "Loamy soil", "Alluvial soil"],
        "default_variety": "DHM-117 / Pioneer P3396 F1",
        "seed_rate_per_acre_kg": 8.0,
        "seed_price_per_kg": 320.0,
        "fertilizer_per_acre": 6500.0,
        "labour_per_acre": 5000.0,
        "irrigation_per_acre": 2500.0,
        "other_per_acre": 2000.0,
        "expected_yield_per_acre_kg": 2800.0,
        "expected_selling_price_per_kg": 22.0,
        "major_risks": [
            "Fall Armyworm (FAW) infestation in vegetative stage",
            "Moisture stress during tasseling and silking",
            "Post-harvest grain moisture leading to aflatoxin if un-dried",
        ],
    },
    "paddy": {
        "name": "Paddy",
        "duration_days": 125,
        "water_need": "Abundant",
        "water_requirement_mm": 1100,
        "compatible_soils": ["Clay soil", "Loamy soil", "Alluvial soil", "Black soil"],
        "default_variety": "Sahbhagi Dhan / BPT 5204",
        "seed_rate_per_acre_kg": 16.0,
        "seed_price_per_kg": 75.0,
        "fertilizer_per_acre": 8000.0,
        "labour_per_acre": 9500.0,
        "irrigation_per_acre": 4500.0,
        "other_per_acre": 2500.0,
        "expected_yield_per_acre_kg": 2500.0,
        "expected_selling_price_per_kg": 25.0,
        "major_risks": [
            "Water scarcity during panicle initiation",
            "Brown planthopper & bacterial leaf blight",
        ],
    },
    "ragi": {
        "name": "Ragi",
        "duration_days": 110,
        "water_need": "Scarce",
        "water_requirement_mm": 350,
        "compatible_soils": ["Red Sandy Loam", "Red soil", "Loamy soil", "Laterite soil"],
        "default_variety": "GPU-28 / ML-365 (UAS Bangalore)",
        "seed_rate_per_acre_kg": 4.0,
        "seed_price_per_kg": 90.0,
        "fertilizer_per_acre": 3500.0,
        "labour_per_acre": 4500.0,
        "irrigation_per_acre": 1200.0,
        "other_per_acre": 1500.0,
        "expected_yield_per_acre_kg": 1200.0,
        "expected_selling_price_per_kg": 38.0,
        "major_risks": [
            "Neck and finger blast during prolonged wet weather",
            "Bird damage near grain maturity",
        ],
    },
    "groundnut": {
        "name": "Groundnut",
        "duration_days": 115,
        "water_need": "Moderate",
        "water_requirement_mm": 450,
        "compatible_soils": ["Red Sandy Loam", "Sandy loam", "Red soil", "Loamy soil"],
        "default_variety": "TMV-2 / GPBD-4",
        "seed_rate_per_acre_kg": 40.0,
        "seed_price_per_kg": 115.0,
        "fertilizer_per_acre": 4500.0,
        "labour_per_acre": 6000.0,
        "irrigation_per_acre": 2200.0,
        "other_per_acre": 1800.0,
        "expected_yield_per_acre_kg": 950.0,
        "expected_selling_price_per_kg": 62.0,
        "major_risks": [
            "Tikka leaf spot and stem rot",
            "Dry spell during pegging and pod filling",
        ],
    },
    "chilli": {
        "name": "Chilli",
        "duration_days": 150,
        "water_need": "Moderate",
        "water_requirement_mm": 550,
        "compatible_soils": ["Black soil", "Red soil", "Loamy soil", "Red Sandy Loam"],
        "default_variety": "Arka Tejasvi F1 (ChLCV Resistant)",
        "seed_rate_per_acre_kg": 0.2,
        "seed_price_per_kg": 22000.0,
        "fertilizer_per_acre": 14000.0,
        "labour_per_acre": 18000.0,
        "irrigation_per_acre": 6000.0,
        "other_per_acre": 4000.0,
        "expected_yield_per_acre_kg": 3500.0,
        "expected_selling_price_per_kg": 55.0,
        "major_risks": [
            "Chilli Leaf Curl Virus & thrips/mites",
            "Anthracnose fruit rot during unseasonal rains",
        ],
    },
    "onion": {
        "name": "Onion",
        "duration_days": 120,
        "water_need": "Moderate",
        "water_requirement_mm": 480,
        "compatible_soils": ["Loamy soil", "Red soil", "Black soil", "Alluvial soil"],
        "default_variety": "Bhima Super / Arka Kalyan",
        "seed_rate_per_acre_kg": 3.5,
        "seed_price_per_kg": 2200.0,
        "fertilizer_per_acre": 10000.0,
        "labour_per_acre": 12000.0,
        "irrigation_per_acre": 5000.0,
        "other_per_acre": 3000.0,
        "expected_yield_per_acre_kg": 8000.0,
        "expected_selling_price_per_kg": 20.0,
        "major_risks": [
            "Purple blotch and Stemphylium blight in humid weather",
            "Bulb rot if rained on at harvest",
        ],
    },
    "cotton": {
        "name": "Cotton",
        "duration_days": 160,
        "water_need": "Moderate",
        "water_requirement_mm": 650,
        "compatible_soils": ["Black soil", "Black Cotton Soil", "Deep loamy soil", "Alluvial soil"],
        "default_variety": "Bollgard II RCH 659",
        "seed_rate_per_acre_kg": 0.9,
        "seed_price_per_kg": 1800.0,
        "fertilizer_per_acre": 8500.0,
        "labour_per_acre": 11000.0,
        "irrigation_per_acre": 3500.0,
        "other_per_acre": 3000.0,
        "expected_yield_per_acre_kg": 1100.0,
        "expected_selling_price_per_kg": 68.0,
        "major_risks": [
            "Pink bollworm in late pickings",
            "Sucking pests during vegetative stage",
        ],
    },
    "wheat": {
        "name": "Wheat",
        "duration_days": 120,
        "water_need": "Moderate",
        "water_requirement_mm": 450,
        "compatible_soils": ["Black Cotton Soil", "Alluvial soil", "Clay loam", "Loamy soil"],
        "default_variety": "DWR-162 / UAS-304",
        "seed_rate_per_acre_kg": 40.0,
        "seed_price_per_kg": 48.0,
        "fertilizer_per_acre": 6000.0,
        "labour_per_acre": 4500.0,
        "irrigation_per_acre": 2800.0,
        "other_per_acre": 1500.0,
        "expected_yield_per_acre_kg": 1800.0,
        "expected_selling_price_per_kg": 26.0,
        "major_risks": [
            "Terminal heat stress during grain filling",
            "Leaf rust in humid winter spells",
        ],
    },
}

# Clearly labelled illustrative market records matching frontend/src/lib/market-intelligence/market.ts
DEMO_MARKET_PRICES: List[Dict[str, Any]] = [
    {
        "crop": "Tomato",
        "market": "Tumakuru APMC (Demonstration Dataset)",
        "district": "Tumakuru",
        "price_per_kg": 17.5,
        "modal_price_per_quintal": 1750,
        "price_date": "2026-11-25",
        "distance_km": 95.0,
        "source": "Demonstration Dataset (AGMARKNET schema)",
        "data_quality": "demo",
        "is_demo": True,
    },
    {
        "crop": "Tomato",
        "market": "Yeshwanthpur / KR Market Bengaluru (Demonstration Dataset)",
        "district": "Bengaluru",
        "price_per_kg": 21.5,
        "modal_price_per_quintal": 2150,
        "price_date": "2026-11-25",
        "distance_km": 98.0,
        "source": "Demonstration Dataset (AGMARKNET schema)",
        "data_quality": "demo",
        "is_demo": True,
    },
    {
        "crop": "Tomato",
        "market": "Kolar APMC (Demonstration Dataset)",
        "district": "Kolar",
        "price_per_kg": 18.5,
        "modal_price_per_quintal": 1850,
        "price_date": "2026-11-25",
        "distance_km": 165.0,
        "source": "Demonstration Dataset (AGMARKNET schema)",
        "data_quality": "demo",
        "is_demo": True,
    },
    {
        "crop": "Maize",
        "market": "Mandya / Tumakuru Grain Mandi (Demonstration Dataset)",
        "district": "Tumakuru",
        "price_per_kg": 22.0,
        "modal_price_per_quintal": 2200,
        "price_date": "2026-11-25",
        "distance_km": 42.0,
        "source": "Demonstration Dataset (AGMARKNET schema)",
        "data_quality": "demo",
        "is_demo": True,
    },
    {
        "crop": "Chilli",
        "market": "Byadagi APMC (Demonstration Dataset)",
        "district": "Haveri",
        "price_per_kg": 60.0,
        "modal_price_per_quintal": 6000,
        "price_date": "2026-11-25",
        "distance_km": 320.0,
        "source": "Demonstration Dataset (AGMARKNET schema)",
        "data_quality": "demo",
        "is_demo": True,
    },
]


def _normalize_crop_key(crop_name: Optional[str]) -> str:
    c = (crop_name or "tomato").strip().lower()
    if "rice" in c or "paddy" in c:
        return "paddy"
    if "corn" in c or "maize" in c:
        return "maize"
    if "millet" in c or "ragi" in c:
        return "ragi"
    if "peanut" in c or "groundnut" in c:
        return "groundnut"
    if "pepper" in c or "chilli" in c or "chili" in c:
        return "chilli"
    for k in CROP_ECONOMICS:
        if k in c:
            return k
    return "tomato"


def compute_crop_economics(crop_name: str, area_acres: float, budget_inr: float) -> Dict[str, Any]:
    key = _normalize_crop_key(crop_name)
    preset = CROP_ECONOMICS[key]
    acres = max(0.1, float(area_acres))
    seed_qty_kg = round(preset["seed_rate_per_acre_kg"] * acres, 3)
    seed_cost_inr = round(seed_qty_kg * preset["seed_price_per_kg"], 2)
    other_costs_inr = round(
        (
            preset["fertilizer_per_acre"]
            + preset["labour_per_acre"]
            + preset["irrigation_per_acre"]
            + preset["other_per_acre"]
        )
        * acres,
        2,
    )
    total_investment_inr = round(seed_cost_inr + other_costs_inr, 2)
    expected_production_kg = round(preset["expected_yield_per_acre_kg"] * acres, 1)
    expected_revenue_inr = round(expected_production_kg * preset["expected_selling_price_per_kg"], 2)
    estimated_profit_inr = round(expected_revenue_inr - total_investment_inr, 2)
    roi_pct = round((estimated_profit_inr / total_investment_inr) * 100.0, 1) if total_investment_inr > 0 else 0.0
    break_even_price_per_kg = (
        round(total_investment_inr / expected_production_kg, 2) if expected_production_kg > 0 else 0.0
    )
    return {
        "crop": preset["name"],
        "default_variety": preset["default_variety"],
        "area_acres": acres,
        "duration_days": preset["duration_days"],
        "water_need": preset["water_need"],
        "water_requirement_mm": preset["water_requirement_mm"],
        "compatible_soils": preset["compatible_soils"],
        "seed_rate_per_acre_kg": preset["seed_rate_per_acre_kg"],
        "seed_required_kg": seed_qty_kg,
        "seed_cost_inr": seed_cost_inr,
        "total_cultivation_investment_inr": total_investment_inr,
        "expected_production_kg": expected_production_kg,
        "expected_selling_price_per_kg": preset["expected_selling_price_per_kg"],
        "expected_revenue_inr": expected_revenue_inr,
        "estimated_profit_inr": estimated_profit_inr,
        "roi_pct": roi_pct,
        "break_even_price_per_kg": break_even_price_per_kg,
        "budget_inr": budget_inr,
        "within_budget": total_investment_inr <= budget_inr,
        "budget_gap_inr": round(budget_inr - total_investment_inr, 2),
        "major_risks": preset["major_risks"],
    }


def list_supported_tools(user_role: str) -> List[ToolDescriptor]:
    diag_status = diagnostics_service.check_model_availability()
    crop_doctor_available = bool(diag_status.get("model_available"))
    specs = [
        ("farm_context", "Tool A — Farm Context", "Retrieve authorized farm profile, crop, stage, area, budget, and water.", False, "operational", None),
        ("weather_intelligence", "Tool B — Weather Intelligence", "Fetch Open-Meteo temperature, rainfall, humidity, wind, ET0, and ag-risks.", False, "operational", None),
        ("biointel", "Tool C — BioIntel & Seed Economics", "Crop suitability, ICAR varieties, seed quantity, investment, yield, and research.", False, "operational", None),
        ("precision_irrigation", "Tool D — Precision Irrigation", "FAO-56 ETc water demand, deficit check, rainfall-aware irrigation timing.", False, "operational", None),
        ("soil_intelligence", "Tool E — Soil Intelligence", "ICAR Soil Health Card pH/NPK evaluation without fabricating missing tests.", False, "operational", None),
        (
            "crop_doctor",
            "Tool F — Crop Doctor (AD-22)",
            "Leaf disease diagnostic history & ONNX model status.",
            False,
            "operational" if crop_doctor_available else "unavailable",
            None if crop_doctor_available else "AD-22 crop diagnostics model/table is not yet merged on this server.",
        ),
        ("digital_farm", "Tool G — Digital Farm Twin", "Crop growth timeline, water balance yield impact, and harvest window.", False, "operational", None),
        ("labour_connect", "Tool H — Labour Connect", "Available agricultural workers, jobs, wages, and crew planning.", True, "operational", None),
        ("smart_bidding", "Tool I — Smart Bidding", "Produce listings, buyer bids, confirmed purchase orders, and sale value.", True, "operational", None),
        ("transport_connect", "Tool J — Transport Connect", "Available freight vehicles, bookings, rates, and shared load savings.", True, "operational", None),
        ("market_intelligence", "Tool K — Market Intelligence", "Mandi prices, transport net return comparison, and sell-today vs wait analysis.", False, "operational", None),
        ("finance", "Tool L — Finance", "Authorized farm budget, recorded orders/commitments, and Monte Carlo projections.", False, "operational", None),
        ("government_schemes", "Tool M — Government Schemes", "Official Indian agricultural schemes, eligibility criteria, and portals.", False, "operational", None),
    ]
    out: List[ToolDescriptor] = []
    for tid, name, desc, req_conf, st, unavail in specs:
        from backend.app.features.agri_assistant.safety import TOOL_ROLE_ALLOWLIST

        allowed = TOOL_ROLE_ALLOWLIST.get(tid, [])
        if user_role in allowed:
            out.append(
                ToolDescriptor(
                    tool_id=tid,
                    name=name,
                    description=desc,
                    allowed_roles=allowed,
                    requires_confirmation=req_conf,
                    status=st,  # type: ignore[arg-type]
                    unavailable_reason=unavail,
                )
            )
    return out


class AgriToolRegistry:
    """Executes authorized agricultural tools with strict role checks and provenance tracking."""

    async def execute_tool(
        self,
        tool_name: str,
        user: Dict[str, Any],
        farm: Optional[Dict[str, Any]],
        params: Dict[str, Any],
    ) -> Dict[str, Any]:
        role = user.get("role", "farmer")
        if not is_tool_allowed_for_role(tool_name, role):
            return {
                "tool_name": tool_name,
                "status": "skipped",
                "summary": f"Tool '{tool_name}' is not authorized for role '{role}'.",
                "data": {},
                "data_quality": "unavailable",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        t0 = time.perf_counter()
        try:
            handler = getattr(self, f"_tool_{tool_name}")
            result = await handler(user=user, farm=farm, params=params)
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            result["duration_ms"] = elapsed_ms
            result.setdefault("tool_name", tool_name)
            result.setdefault("status", "completed")
            result.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
            return result
        except Exception as exc:
            elapsed_ms = int((time.perf_counter() - t0) * 1000)
            return {
                "tool_name": tool_name,
                "status": "failed",
                "summary": f"{tool_name} encountered an error: {str(exc)[:140]}",
                "data": {},
                "data_quality": "unavailable",
                "duration_ms": elapsed_ms,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    # --- Tool A: Farm Context ---
    async def _tool_farm_context(self, user: Dict[str, Any], farm: Optional[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
        if not farm:
            return {
                "status": "completed",
                "summary": "No registered farm parcel found for this account.",
                "data": {"has_farm": False},
                "source": "RaithaMitra Authenticated Farm Registry",
                "data_quality": "user_provided",
            }
        area_ha = float(farm.get("land_area_ha") or 1.0)
        area_acres = round(area_ha * 2.471, 2)
        return {
            "status": "completed",
            "summary": f"{farm.get('farm_name')} ({area_acres} acres, {farm.get('primary_crop')}, {farm.get('crop_stage')}) in {farm.get('district')}.",
            "data": {
                "has_farm": True,
                "farm_id": farm.get("id"),
                "farm_name": farm.get("farm_name"),
                "crop": farm.get("primary_crop"),
                "variety": farm.get("crop_variety"),
                "area_ha": area_ha,
                "area_acres": area_acres,
                "location": f"{farm.get('village')}, {farm.get('district')}, {farm.get('state')}",
                "latitude": farm.get("latitude"),
                "longitude": farm.get("longitude"),
                "crop_stage": farm.get("crop_stage"),
                "sowing_date": str(farm.get("sowing_date")),
                "soil_type": farm.get("soil_type"),
                "irrigation_method": farm.get("irrigation_method"),
                "water_source": farm.get("water_source"),
                "available_water_m3": float(farm.get("available_water_m3") or 0.0),
                "budget_inr": float(farm.get("cultivation_budget_inr") or 0.0),
            },
            "source": "RaithaMitra Farm Profile Database",
            "data_quality": "user_provided",
        }

    # --- Tool B: Weather Intelligence ---
    async def _tool_weather_intelligence(self, user: Dict[str, Any], farm: Optional[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
        lat = float((farm or {}).get("latitude") or params.get("latitude") or 12.5234)
        lon = float((farm or {}).get("longitude") or params.get("longitude") or 76.8976)
        cache_key = f"{lat:.2f}:{lon:.2f}"
        now = time.monotonic()
        weather = None
        if cache_key in _WEATHER_CACHE:
            ts, cached = _WEATHER_CACHE[cache_key]
            if now - ts < _WEATHER_CACHE_TTL_S:
                weather = cached
        if weather is None:
            weather = await weather_service.get_weather(lat, lon)
            _WEATHER_CACHE[cache_key] = (now, weather)

        cur = weather.current
        forecast_48h_rain = round(sum(d.precipitation_sum_mm for d in weather.daily_forecast[:2]), 2)
        max_prob_48h = max((d.rain_probability_max_pct for d in weather.daily_forecast[:2]), default=cur.rain_probability_pct)

        risks: List[str] = []
        if cur.wind_speed_kmh > 15.0:
            risks.append(f"High wind ({cur.wind_speed_kmh} km/h > 15 km/h safety limit): halt foliar spraying to prevent drift.")
        if forecast_48h_rain >= 12.0:
            risks.append(f"Heavy rain expected in next 48h ({forecast_48h_rain} mm): delay irrigation and inspect drainage.")
        if cur.relative_humidity_pct > 80 and cur.temperature_c > 24.0:
            risks.append(f"High humidity ({cur.relative_humidity_pct}%) + warm {cur.temperature_c}°C: elevated fungal blight risk.")
        if cur.temperature_c >= 35.0:
            risks.append(f"Heat stress alert ({cur.temperature_c}°C): avoid midday transplanting or spraying.")
        if not risks:
            risks.append("No severe immediate agrometeorological hazards detected.")

        forecast_days = [
            {
                "date": d.date.isoformat() if hasattr(d.date, "isoformat") else str(d.date),
                "temp_max_c": d.temp_max_c,
                "temp_min_c": d.temp_min_c,
                "rain_mm": d.precipitation_sum_mm,
                "rain_prob_pct": d.rain_probability_max_pct,
                "et0_mm": d.et0_fao56_mm,
                "condition": d.condition_text,
            }
            for d in weather.daily_forecast[:3]
        ]

        return {
            "status": "completed",
            "summary": f"{cur.temperature_c}°C, {cur.condition_text}, Humidity {cur.relative_humidity_pct}%, Wind {cur.wind_speed_kmh} km/h, 48h Rain {forecast_48h_rain} mm.",
            "data": {
                "temperature_c": cur.temperature_c,
                "humidity_pct": cur.relative_humidity_pct,
                "precipitation_mm": cur.precipitation_mm,
                "wind_speed_kmh": cur.wind_speed_kmh,
                "condition": cur.condition_text,
                "et0_mm_day": cur.et0_fao56_mm,
                "forecast_48h_rain_mm": forecast_48h_rain,
                "rain_probability_48h_pct": max_prob_48h,
                "forecast_3day": forecast_days,
                "agricultural_risks": risks,
                "is_live": weather.provenance.is_live,
                "weather_obj": weather,
            },
            "source": weather.provenance.source,
            "data_quality": "live" if weather.provenance.is_live else "forecast",
            "timestamp": weather.provenance.timestamp.isoformat(),
        }

    # --- Tool C: BioIntel ---
    async def _tool_biointel(self, user: Dict[str, Any], farm: Optional[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
        crop = params.get("selected_crop") or (farm or {}).get("primary_crop") or "Tomato"
        area_acres = float(params.get("area_acres") or (float((farm or {}).get("land_area_ha") or 2.0) * 2.471))
        budget_inr = float(params.get("budget_inr") or (farm or {}).get("cultivation_budget_inr") or 50000.0)
        water_avail = params.get("water_availability") or "Moderate"
        soil_type = (farm or {}).get("soil_type") or "Red Sandy Loam"
        comparison_crops: List[str] = params.get("comparison_crops") or []

        # Score all calibrated crops for suitability (multi-factor: soil + water + budget + profit)
        scored_crops: List[Dict[str, Any]] = []
        for k in CROP_ECONOMICS:
            econ = compute_crop_economics(k, area_acres, budget_inr)
            score = 65
            reasons: List[str] = []
            soil_match = any(s.lower().replace(" soil", "") in soil_type.lower() for s in econ["compatible_soils"])
            if soil_match:
                score += 12
                reasons.append(f"Matches {soil_type}")
            else:
                score -= 10
                reasons.append(f"Soil conditioning needed for {soil_type}")

            if econ["water_need"] == "Abundant" and water_avail == "Scarce":
                score -= 25
                reasons.append("High water crop unsuitable for scarce water")
            elif econ["water_need"] == water_avail or water_avail == "Abundant":
                score += 12
                reasons.append(f"Aligned with {water_avail} water availability")
            elif econ["water_need"] == "Scarce" and water_avail == "Moderate":
                score += 8
                reasons.append("Water-efficient low-risk option")

            if econ["within_budget"]:
                score += 12
                reasons.append(f"Fits within ₹{budget_inr:,.0f} budget")
            elif econ["total_cultivation_investment_inr"] <= budget_inr * 1.25:
                score -= 5
                reasons.append("Slightly exceeds budget (consider lower-input variety or smaller area)")
            else:
                score -= 18
                reasons.append(f"Exceeds ₹{budget_inr:,.0f} budget by ₹{abs(econ['budget_gap_inr']):,.0f}")

            econ["suitability_score"] = max(25, min(98, score))
            econ["match_reasons"] = reasons
            scored_crops.append(econ)

        scored_crops.sort(key=lambda x: (x["within_budget"], x["suitability_score"], x["estimated_profit_inr"]), reverse=True)

        selected_econ = compute_crop_economics(crop, area_acres, budget_inr)
        comparisons = [compute_crop_economics(c, area_acres, budget_inr) for c in comparison_crops] if comparison_crops else []

        # Biotech & Indian evidence
        biotech_recs = biotech_service.generate_recommendations(
            FarmerProfileInput(
                farm_id=(farm or {}).get("id"),
                farmer_name=user.get("name"),
                latitude=float((farm or {}).get("latitude") or 12.5234),
                longitude=float((farm or {}).get("longitude") or 76.8976),
                crop_type=selected_econ["crop"],
                soil_type=soil_type,
                soil_ph=params.get("soil_ph"),
                water_availability=(
                    "Limited / Low"
                    if water_avail == "Scarce"
                    else ("Abundant / Canal" if water_avail == "Abundant" else "Moderate / Adequate")
                ),
                land_area_ha=round(area_acres / 2.471, 2),
                cultivation_budget_inr=budget_inr,
            )
        )
        indian_ev = get_indian_evidence_for_crop(selected_econ["crop"])
        varieties = [v.model_dump() for v in biotech_service.get_crop_varieties(crop=selected_econ["crop"])]

        # Bounded research fetch (3s timeout so external API timeouts never block)
        papers_out: List[Dict[str, Any]] = []
        research_source = "Europe PMC / ICAR Curated Index"
        try:
            res_papers = await asyncio.wait_for(
                asyncio.to_thread(biotech_service.fetch_research_papers, selected_econ["crop"], None, None, 3),
                timeout=3.5,
            )
            research_source = res_papers.data_source
            for p in res_papers.papers[:3]:
                papers_out.append({
                    "title": p.title,
                    "journal": p.journal_title,
                    "year": p.pub_year,
                    "doi": p.doi,
                    "url": p.article_url,
                    "evidence_type": p.evidence_type,
                })
        except Exception:
            pass

        nurseries = nursery_service.discover_nearby_suppliers(
            lat=float((farm or {}).get("latitude") or 12.5234),
            lon=float((farm or {}).get("longitude") or 76.8976),
            radius_km=60.0,
            crop=selected_econ["crop"],
        )
        nursery_list = [
            {
                "name": n.name,
                "district": n.district,
                "distance_km": n.distance_km,
                "is_verified": n.is_verified,
                "is_demo": n.is_demo,
                "phone": n.phone,
            }
            for n in nurseries[:3]
        ]

        return {
            "status": "completed",
            "summary": f"{selected_econ['crop']}: {selected_econ['seed_required_kg']} kg seed, est. investment ₹{selected_econ['total_cultivation_investment_inr']:,.0f}, expected yield {selected_econ['expected_production_kg']:,.0f} kg.",
            "data": {
                "selected_crop_economics": selected_econ,
                "top_suitable_crops": scored_crops[:3],
                "comparisons": comparisons,
                "recommended_varieties": varieties[:3],
                "indian_evidence": [e.model_dump() for e in indian_ev[:2]],
                "biotech_interventions": [r.model_dump() for r in biotech_recs.recommendations[:2]],
                "research_papers": papers_out,
                "research_source": research_source,
                "nearby_nurseries": nursery_list,
            },
            "source": "RaithaMitra BioIntel Engine + ICAR-IIHR/UAS Benchmarks + Europe PMC",
            "data_quality": "modeled",
        }

    # --- Tool D: Precision Irrigation ---
    async def _tool_precision_irrigation(self, user: Dict[str, Any], farm: Optional[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
        if not farm:
            return {
                "status": "unavailable",
                "summary": "Farm profile is required to calculate crop water demand.",
                "data": {"missing_inputs": ["Authorized farm profile (area, crop, stage, irrigation method)"]},
                "source": "FAO-56 Precision Irrigation Engine",
                "data_quality": "unavailable",
            }
        crop = params.get("selected_crop") or farm.get("primary_crop") or "Tomato"
        area_ha = float(farm.get("land_area_ha") or 1.0)
        if params.get("area_acres"):
            area_ha = round(float(params["area_acres"]) / 2.471, 2)

        req = IrrigationRequest(
            farm_id=farm.get("id"),
            latitude=float(farm.get("latitude") or 12.5234),
            longitude=float(farm.get("longitude") or 76.8976),
            crop_type=crop,
            crop_stage=farm.get("crop_stage") or "Mid-Season",
            farm_area_ha=area_ha,
            soil_type=farm.get("soil_type") or "Red Sandy Loam",
            available_water_m3=float(farm.get("available_water_m3") or 10000.0),
            irrigation_method=farm.get("irrigation_method") or "Drip Irrigation",
            flow_rate_m3_per_hr=params.get("flow_rate_m3_per_hr"),
        )
        irr_out = await scientific_irrigation_service.calculate_irrigation(req)

        # Also evaluate via DecisionEngine for conflict resolution
        weather_obj = params.get("weather_obj")
        if weather_obj is None:
            weather_obj = await weather_service.get_weather(req.latitude, req.longitude)

        decision_summary = None
        try:
            farm_model = Farm(
                id=str(farm.get("id", "farm_001")),
                farmer_name=str(farm.get("farmer_name", user.get("name", "Farmer"))),
                preferred_language="en",
                farm_name=str(farm.get("farm_name", "Farm")),
                village=str(farm.get("village", "Rural")),
                district=str(farm.get("district", "Mandya")),
                state=str(farm.get("state", "Karnataka")),
                latitude=req.latitude,
                longitude=req.longitude,
                land_area_ha=area_ha,
                primary_crop=crop,
                crop_variety=farm.get("crop_variety"),
                sowing_date=date.fromisoformat(str(farm.get("sowing_date", "2026-10-15"))),
                crop_stage=req.crop_stage,  # type: ignore[arg-type]
                soil_type=req.soil_type,
                irrigation_method=req.irrigation_method,  # type: ignore[arg-type]
                water_source=farm.get("water_source") or "Borewell",  # type: ignore[arg-type]
                available_water_m3=req.available_water_m3,
                cultivation_budget_inr=float(farm.get("cultivation_budget_inr") or 50000.0),
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            dec = decision_engine.evaluate_farm(farm_model, weather_obj)
            irr_recs = [r for r in dec.recommendations if r.category == "irrigation"]
            if irr_recs:
                decision_summary = irr_recs[0].model_dump(mode="json")
        except Exception:
            pass

        res = dict(irr_out.results)
        res["available_water_m3"] = req.available_water_m3
        res["irrigation_method"] = req.irrigation_method
        res["water_deficit_alert"] = bool(res.get("water_availability_warnings"))
        res["recommended_actions"] = irr_out.recommended_actions
        res["assumptions"] = irr_out.assumptions
        res["missing_measurements"] = [
            "In-situ root-zone soil moisture sensor reading (modeled water-balance estimate used instead).",
        ] + (["Pump discharge flow rate (m3/hr) not provided; irrigation duration cannot be calculated exactly."] if res.get("estimated_duration_hours") is None else [])
        if decision_summary:
            res["decision_engine_advisory"] = decision_summary

        return {
            "status": "completed",
            "summary": f"ETc={res.get('etc_mm_day')} mm/day, Gross={res.get('gross_irrigation_mm')} mm ({res.get('gross_volume_m3')} m3), 48h Rain={res.get('forecast_rain_48h_mm')} mm.",
            "data": res,
            "source": irr_out.source,
            "data_quality": irr_out.data_quality,
            "timestamp": irr_out.timestamp.isoformat(),
        }

    # --- Tool E: Soil Intelligence ---
    async def _tool_soil_intelligence(self, user: Dict[str, Any], farm: Optional[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
        crop = params.get("selected_crop") or (farm or {}).get("primary_crop") or "Tomato"
        soil_type = (farm or {}).get("soil_type") or "Red Sandy Loam"
        lat = float((farm or {}).get("latitude") or 12.5234)
        lon = float((farm or {}).get("longitude") or 76.8976)

        n_val = params.get("nitrogen_kg_ha")
        p_val = params.get("phosphorus_kg_ha")
        k_val = params.get("potassium_kg_ha")
        ph_val = params.get("soil_ph")
        has_lab = any(v is not None for v in [n_val, p_val, k_val, ph_val])

        req = SoilAnalysisRequest(
            farm_id=(farm or {}).get("id"),
            latitude=lat,
            longitude=lon,
            crop_type=crop,
            soil_texture=soil_type,
            nitrogen_kg_ha=n_val,
            phosphorus_kg_ha=p_val,
            potassium_kg_ha=k_val,
            soil_ph=ph_val,
            measurement_source="laboratory_soil_health_card" if has_lab else "user_estimate",
            fetch_soilgrids=bool(params.get("fetch_soilgrids", False)),
        )
        soil_out = await asyncio.to_thread(soil_service.analyze_soil, req)
        res = dict(soil_out.results)
        missing_fields: List[str] = []
        if n_val is None:
            missing_fields.append("Nitrogen (kg/ha)")
        if p_val is None:
            missing_fields.append("Phosphorus (kg/ha)")
        if k_val is None:
            missing_fields.append("Potassium (kg/ha)")
        if ph_val is None:
            missing_fields.append("Soil pH")
        res["missing_soil_readings"] = missing_fields
        res["optimal_ph_range"] = CROP_PH_RANGES.get(crop.lower().strip(), (6.0, 7.5))
        res["recommended_actions"] = soil_out.recommended_actions
        res["assumptions"] = soil_out.assumptions

        return {
            "status": "completed",
            "summary": f"Soil texture: {soil_type}. Missing lab readings: {', '.join(missing_fields) if missing_fields else 'None (Lab values provided)'}.",
            "data": res,
            "source": soil_out.source,
            "data_quality": soil_out.data_quality,
            "timestamp": soil_out.timestamp.isoformat(),
        }

    # --- Tool F: Crop Doctor (AD-22) ---
    async def _tool_crop_doctor(self, user: Dict[str, Any], farm: Optional[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
        status_info = diagnostics_service.check_model_availability()
        history_records: List[Dict[str, Any]] = []
        has_history_table = False

        conn = get_db_connection()
        try:
            tbl = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('crop_diagnostics_history', 'diagnostics_history')"
            ).fetchone()
            if tbl:
                has_history_table = True
                rows = conn.execute(
                    f"SELECT * FROM {tbl['name']} WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
                    (user["id"],),
                ).fetchall()
                history_records = [dict(r) for r in rows]
        except Exception:
            pass
        finally:
            conn.close()

        if not status_info.get("model_available") and not history_records:
            return {
                "status": "unavailable",
                "summary": "AD-22 Crop Doctor diagnostic service is currently unavailable (model not merged/configured).",
                "data": {
                    "ad22_available": False,
                    "model_status": status_info,
                    "diagnostic_history": [],
                    "unavailable_reason": "AD-22 leaf disease ONNX model and diagnostic history records are not yet available on this server.",
                    "safety_notice": "Disease management advice here is general agronomic guidance only, not a confirmed diagnosis or pesticide prescription.",
                },
                "source": "AD-22 Crop Diagnostics Integration Guard",
                "data_quality": "unavailable",
            }

        return {
            "status": "completed",
            "summary": f"Retrieved {len(history_records)} authorized diagnostic record(s).",
            "data": {
                "ad22_available": True,
                "model_status": status_info,
                "diagnostic_history": history_records,
                "safety_notice": "Verify symptoms in the field or with your local KVK before applying chemical fungicides.",
            },
            "source": "AD-22 Crop Diagnostics Registry",
            "data_quality": "modeled",
        }

    # --- Tool G: Digital Farm ---
    async def _tool_digital_farm(self, user: Dict[str, Any], farm: Optional[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
        frontend_sim = params.get("digital_farm_context")
        crop = (farm or {}).get("primary_crop") or params.get("selected_crop") or "Tomato"
        area_ha = float((farm or {}).get("land_area_ha") or 2.0)
        lat = float((farm or {}).get("latitude") or 12.5234)
        lon = float((farm or {}).get("longitude") or 76.8976)
        sowing_str = str((farm or {}).get("sowing_date") or "2026-10-15")
        stage = str((farm or {}).get("crop_stage") or "Mid-Season")
        soil_type = str((farm or {}).get("soil_type") or "Red Sandy Loam")

        twin = await farm_twin_service.simulate_twin(
            FarmTwinRequest(
                farm_id=(farm or {}).get("id"),
                latitude=lat,
                longitude=lon,
                crop_type=crop,
                sowing_date=sowing_str,
                crop_stage=stage,
                farm_area_ha=area_ha,
                soil_type=soil_type,
                cultivation_expenses_inr=float((farm or {}).get("cultivation_budget_inr") or 50000.0),
            )
        )

        # Calculate expected harvest date deterministically from sowing date + crop duration
        econ = compute_crop_economics(crop, area_ha * 2.471, float((farm or {}).get("cultivation_budget_inr") or 50000.0))
        try:
            sow_dt = date.fromisoformat(sowing_str)
        except ValueError:
            sow_dt = date(2026, 10, 15)
        expected_harvest_date = (sow_dt + timedelta(days=int(econ["duration_days"]))).isoformat()
        days_to_harvest = max(0, (date.fromisoformat(expected_harvest_date) - date.today()).days)

        data = {
            "crop": crop,
            "growth_stage": stage,
            "sowing_date": sowing_str,
            "expected_harvest_date": expected_harvest_date,
            "days_until_harvest": days_to_harvest,
            "estimated_production_kg": econ["expected_production_kg"],
            "backend_twin_summary": twin.results,
            "simulation_assumptions": twin.assumptions,
            "frontend_simulation_context": frontend_sim if isinstance(frontend_sim, dict) else None,
            "frontend_context_present": isinstance(frontend_sim, dict) and bool(frontend_sim),
        }
        return {
            "status": "completed",
            "summary": f"{crop} in {stage} stage; expected harvest around {expected_harvest_date} (~{days_to_harvest} days), est. production {econ['expected_production_kg']:,.0f} kg.",
            "data": data,
            "source": twin.source + (" + Validated Frontend Digital Farm Context" if data["frontend_context_present"] else ""),
            "data_quality": "simulated" if data["frontend_context_present"] else "modeled",
            "timestamp": twin.timestamp.isoformat(),
        }

    # --- Tool H: Labour Connect ---
    async def _tool_labour_connect(self, user: Dict[str, Any], farm: Optional[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            workers = [
                dict(r)
                for r in conn.execute(
                    "SELECT id, user_id, name, skills_json, daily_wage_rate, availability_status, location, rating FROM labour_profiles WHERE availability_status = 'available'"
                ).fetchall()
            ]
            for w in workers:
                w["skills"] = json.loads(w.pop("skills_json", "[]"))

            if user["role"] == "farmer":
                jobs = [
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM labour_jobs WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 10",
                        (user["id"],),
                    ).fetchall()
                ]
            else:
                jobs = [
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM labour_jobs WHERE status = 'open' ORDER BY created_at DESC LIMIT 10"
                    ).fetchall()
                ]
        finally:
            conn.close()

        area_acres = float(params.get("area_acres") or (float((farm or {}).get("land_area_ha") or 2.0) * 2.471))
        crop = params.get("selected_crop") or (farm or {}).get("primary_crop") or "Tomato"
        stage = (farm or {}).get("crop_stage") or "Mid-Season"
        rec_workers = max(2, int(round(area_acres * (2.5 if crop.lower() in ("tomato", "chilli", "paddy") else 1.5))))
        avg_wage = round(sum(w["daily_wage_rate"] for w in workers) / len(workers), 0) if workers else 600.0

        return {
            "status": "completed",
            "summary": f"{len(workers)} available worker(s) (avg ₹{avg_wage:.0f}/day), {len(jobs)} recorded job(s). Estimated need for {area_acres} ac {crop}: ~{rec_workers} workers.",
            "data": {
                "available_workers_count": len(workers),
                "available_workers": workers[:5],
                "jobs": jobs,
                "recommended_workers_for_stage": rec_workers,
                "crop_stage": stage,
                "average_daily_wage_inr": avg_wage,
            },
            "source": "Labour Connect SQLite Registry",
            "data_quality": "measured",
        }

    # --- Tool I: Smart Bidding ---
    async def _tool_smart_bidding(self, user: Dict[str, Any], farm: Optional[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            uid = user["id"]
            role = user["role"]
            if role == "farmer":
                listings = [
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM bidding_listings WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 10",
                        (uid,),
                    ).fetchall()
                ]
                orders = [
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM purchase_orders WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 10",
                        (uid,),
                    ).fetchall()
                ]
            elif role == "buyer":
                listings = [
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM bidding_listings WHERE status = 'active' ORDER BY created_at DESC LIMIT 10"
                    ).fetchall()
                ]
                orders = [
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM purchase_orders WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 10",
                        (uid,),
                    ).fetchall()
                ]
            else:
                listings, orders = [], []

            for lst in listings:
                bids = [
                    dict(b)
                    for b in conn.execute(
                        "SELECT id, buyer_id, buyer_name, bid_per_kg, total_amount, status, created_at FROM bidding_bids WHERE listing_id = ? ORDER BY bid_per_kg DESC",
                        (lst["id"],),
                    ).fetchall()
                ]
                lst["bids"] = bids
                lst["highest_bid_per_kg"] = bids[0]["bid_per_kg"] if bids else lst["min_price_per_kg"]
                lst["expected_sale_revenue_inr"] = round(lst["highest_bid_per_kg"] * lst["quantity_kg"], 2)
        finally:
            conn.close()

        return {
            "status": "completed",
            "summary": f"{len(listings)} listing(s), {len(orders)} confirmed purchase order(s).",
            "data": {
                "listings": listings,
                "confirmed_orders": orders,
                "active_listings_count": sum(1 for l in listings if l["status"] == "active"),
                "confirmed_orders_count": len(orders),
            },
            "source": "Smart Bidding SQLite Marketplace",
            "data_quality": "measured",
        }

    # --- Tool J: Transport Connect ---
    async def _tool_transport_connect(self, user: Dict[str, Any], farm: Optional[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            drivers = [
                dict(r)
                for r in conn.execute(
                    "SELECT id, driver_id, driver_name, vehicle_type, vehicle_reg_number, capacity_kg, base_fare_per_km, service_area, availability_status FROM transport_vehicles WHERE availability_status = 'available' ORDER BY capacity_kg ASC"
                ).fetchall()
            ]
            uid = user["id"]
            role = user["role"]
            if role == "driver":
                bookings = [
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM transport_bookings WHERE driver_id = ? ORDER BY created_at DESC LIMIT 10",
                        (uid,),
                    ).fetchall()
                ]
            else:
                bookings = [
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM transport_bookings WHERE farmer_id = ? ORDER BY created_at DESC LIMIT 10",
                        (uid,),
                    ).fetchall()
                ]
        finally:
            conn.close()

        est_dist_km = float(params.get("distance_km") or 65.0)
        rate_per_km = float(drivers[0]["base_fare_per_km"]) if drivers else 32.0
        est_freight_inr = round(est_dist_km * rate_per_km, 2)
        shared_freight_inr = round((est_freight_inr * 1.18) / 2.0, 2)

        return {
            "status": "completed",
            "summary": f"{len(drivers)} available vehicle(s), {len(bookings)} transport booking(s). Est. {est_dist_km:.0f} km freight ~₹{est_freight_inr:,.0f} (shared ~₹{shared_freight_inr:,.0f}).",
            "data": {
                "available_drivers": drivers,
                "bookings": bookings,
                "estimated_distance_km": est_dist_km,
                "estimated_freight_inr": est_freight_inr,
                "estimated_shared_freight_inr": shared_freight_inr,
            },
            "source": "Transport Connect SQLite Registry",
            "data_quality": "measured",
        }

    # --- Tool K: Market Intelligence ---
    async def _tool_market_intelligence(self, user: Dict[str, Any], farm: Optional[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
        crop = params.get("selected_crop") or (farm or {}).get("primary_crop") or "Tomato"
        area_acres = float(params.get("area_acres") or (float((farm or {}).get("land_area_ha") or 2.0) * 2.471))
        econ = compute_crop_economics(crop, area_acres, float((farm or {}).get("cultivation_budget_inr") or 50000.0))
        est_qty_kg = float(params.get("quantity_kg") or min(3000.0, econ["expected_production_kg"]))
        official_api_configured = bool(os.getenv("DATA_GOV_IN_API_KEY"))

        market_options: List[Dict[str, Any]] = []
        # 1. Include user manual prices if passed in market_context
        mkt_ctx = params.get("market_context") or {}
        if isinstance(mkt_ctx, dict) and mkt_ctx.get("manual_price_per_kg"):
            p_kg = float(mkt_ctx["manual_price_per_kg"])
            trans = float(mkt_ctx.get("transport_cost_inr") or 1500.0)
            gross = round(est_qty_kg * p_kg, 2)
            market_options.append({
                "market": mkt_ctx.get("market_name") or "Farmer Entered Market Price",
                "price_per_kg": p_kg,
                "quantity_kg": est_qty_kg,
                "transport_cost_inr": trans,
                "spoilage_pct": 2.0,
                "net_revenue_inr": round(gross * 0.98 - trans, 2),
                "data_quality": "user_provided",
                "source": "Farmer Manual Entry",
                "is_demo": False,
            })

        # 2. Check Smart Bidding active offers from SQLite
        conn = get_db_connection()
        try:
            bids = conn.execute(
                """
                SELECT b.bid_per_kg, b.buyer_name, l.crop_name, l.quantity_kg
                FROM bidding_bids b
                JOIN bidding_listings l ON b.listing_id = l.id
                WHERE l.farmer_id = ? AND LOWER(l.crop_name) LIKE ?
                ORDER BY b.bid_per_kg DESC LIMIT 3
                """,
                (user["id"], f"%{crop.lower()}%"),
            ).fetchall()
            for b in bids:
                p_kg = float(b["bid_per_kg"])
                qty = float(b["quantity_kg"])
                trans = 1800.0
                market_options.append({
                    "market": f"Smart Bidding Offer ({b['buyer_name']})",
                    "price_per_kg": p_kg,
                    "quantity_kg": qty,
                    "transport_cost_inr": trans,
                    "spoilage_pct": 1.0,
                    "net_revenue_inr": round(qty * p_kg * 0.99 - trans, 2),
                    "data_quality": "measured",
                    "source": "Live Smart Bidding Record",
                    "is_demo": False,
                })
        finally:
            conn.close()

        # 3. Demonstration APMC benchmark records (explicitly labelled)
        matching_demo = [m for m in DEMO_MARKET_PRICES if m["crop"].lower() == crop.lower()]
        if not matching_demo:
            matching_demo = [
                {
                    "crop": crop,
                    "market": f"{(farm or {}).get('district', 'Mandya')} Local APMC Benchmark (Demonstration Dataset)",
                    "price_per_kg": econ["expected_selling_price_per_kg"],
                    "distance_km": 35.0,
                    "price_date": "2026-11-25",
                    "source": "Demonstration Benchmark Dataset",
                    "is_demo": True,
                }
            ]

        for m in matching_demo:
            dist = float(m.get("distance_km") or 50.0)
            freight = round(dist * 32.0, 2)
            spoilage_pct = 3.0 if crop.lower() in ("tomato", "banana", "chilli") else 1.0
            gross = est_qty_kg * (1 - spoilage_pct / 100.0) * float(m["price_per_kg"])
            commission = gross * 0.02
            net_rev = round(gross - freight - commission, 2)
            market_options.append({
                "market": m["market"],
                "price_per_kg": float(m["price_per_kg"]),
                "quantity_kg": est_qty_kg,
                "transport_cost_inr": freight,
                "spoilage_pct": spoilage_pct,
                "net_revenue_inr": net_rev,
                "data_quality": "demo",
                "source": m["source"],
                "price_date": m.get("price_date"),
                "is_demo": True,
            })

        market_options.sort(key=lambda x: x["net_revenue_inr"], reverse=True)
        best = market_options[0]

        # Sell Today vs Wait 5 days calculation (accounting for spoilage & storage cost)
        perishable = crop.lower() in ("tomato", "banana", "onion", "potato")
        wait_days = 5
        storage_cost_per_kg_day = 0.35 if perishable else 0.12
        wait_spoilage_pct = 12.0 if crop.lower() == "tomato" else (5.0 if perishable else 1.5)
        immediate_net = best["net_revenue_inr"]
        # Break-even future price needed just to match selling today
        surviving_kg = est_qty_kg * (1.0 - wait_spoilage_pct / 100.0)
        storage_total = est_qty_kg * wait_days * storage_cost_per_kg_day
        breakeven_future_price = (
            round(((est_qty_kg * best["price_per_kg"]) + storage_total) / surviving_kg, 2)
            if surviving_kg > 0
            else best["price_per_kg"]
        )

        return {
            "status": "completed",
            "summary": f"Best listed option for {crop}: {best['market']} at ₹{best['price_per_kg']}/kg (est. net ₹{best['net_revenue_inr']:,.0f} for {est_qty_kg:,.0f} kg). Official AGMARKNET key configured: {official_api_configured}.",
            "data": {
                "crop": crop,
                "quantity_kg": est_qty_kg,
                "official_api_configured": official_api_configured,
                "market_options": market_options,
                "best_option": best,
                "sell_vs_wait_analysis": {
                    "wait_days_evaluated": wait_days,
                    "perishable_crop": perishable,
                    "estimated_spoilage_if_waiting_pct": wait_spoilage_pct,
                    "estimated_storage_cost_inr": round(storage_total, 2),
                    "sell_today_net_inr": immediate_net,
                    "break_even_future_price_per_kg": breakeven_future_price,
                    "uncertainty_note": "Future spot prices are uncertain; waiting on perishable crops risks spoilage unless cold storage or a confirmed buyer contract is secured.",
                },
            },
            "source": "RaithaMitra Market Intelligence + Smart Bidding + Demonstration APMC Benchmarks",
            "data_quality": "measured" if any(not o["is_demo"] for o in market_options) else "demo",
        }

    # --- Tool L: Finance ---
    async def _tool_finance(self, user: Dict[str, Any], farm: Optional[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            uid = user["id"]
            orders = [dict(r) for r in conn.execute("SELECT id, crop_name, total_amount, status, created_at FROM purchase_orders WHERE farmer_id = ?", (uid,)).fetchall()]
            bookings = [dict(r) for r in conn.execute("SELECT id, produce_type, total_fare, status, created_at FROM transport_bookings WHERE farmer_id = ?", (uid,)).fetchall()]
            jobs = [dict(r) for r in conn.execute("SELECT id, title, wage_per_day, required_workers, hired_workers_count, status FROM labour_jobs WHERE farmer_id = ?", (uid,)).fetchall()]
        finally:
            conn.close()

        recorded_revenue = round(sum(float(o["total_amount"]) for o in orders), 2)
        committed_freight = round(sum(float(b["total_fare"]) for b in bookings if b["status"] not in ("cancelled", "rejected")), 2)
        committed_labour = round(sum(float(j["wage_per_day"]) * max(int(j["hired_workers_count"]), int(j["required_workers"])) for j in jobs if j["status"] != "cancelled"), 2)

        budget_inr = float((farm or {}).get("cultivation_budget_inr") or params.get("budget_inr") or 50000.0)
        area_ha = float((farm or {}).get("land_area_ha") or 2.0)
        crop = (farm or {}).get("primary_crop") or params.get("selected_crop") or "Tomato"
        econ = compute_crop_economics(crop, area_ha * 2.471, budget_inr)

        sim = simulation_service.run_financial_simulation(
            FinancialSimulationRequest(
                farm_id=(farm or {}).get("id"),
                farm_area_ha=area_ha,
                expected_yield_t_per_ha=round((econ["expected_production_kg"] / 1000.0) / max(area_ha, 0.1), 2),
                market_price_inr_per_t=econ["expected_selling_price_per_kg"] * 1000.0,
                cultivation_expenses_inr=econ["total_cultivation_investment_inr"],
                transportation_expenses_inr=committed_freight or 3000.0,
                num_trials=200,
                random_seed=42,
            )
        )

        return {
            "status": "completed",
            "summary": f"Registered budget ₹{budget_inr:,.0f}; recorded POs ₹{recorded_revenue:,.0f}; committed labour/freight ₹{committed_labour + committed_freight:,.0f}; modeled median profit ₹{sim.results['monte_carlo']['median_p50_profit_inr']:,.0f}.",
            "data": {
                "allocated_budget_inr": budget_inr,
                "recorded_purchase_order_revenue_inr": recorded_revenue,
                "recorded_orders_count": len(orders),
                "committed_labour_obligation_inr": committed_labour,
                "committed_transport_fare_inr": committed_freight,
                "modeled_cultivation_estimate": econ,
                "monte_carlo_summary": sim.results["monte_carlo"],
                "ad24_ledger_ready": True,
                "ad24_ledger_connected": False,
                "note": "Hardcoded frontend finance demo cards are excluded; values reflect actual SQLite orders/jobs/bookings plus deterministic/Monte Carlo models.",
            },
            "source": "RaithaMitra SQLite Transaction Records + Predictive Financial Simulation Engine",
            "data_quality": "measured" if (orders or bookings or jobs) else "modeled",
            "timestamp": sim.timestamp.isoformat(),
        }

    # --- Tool M: Government Schemes ---
    async def _tool_government_schemes(self, user: Dict[str, Any], farm: Optional[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
        query_text = str(params.get("query") or "").lower()
        schemes_out = []
        for s in INDIAN_GOVERNMENT_SCHEMES:
            relevance = 1
            if any(k in query_text for k in ["drip", "water", "irrigat", "pmksy"]) and "Irrigation" in s.category:
                relevance = 3
            elif any(k in query_text for k in ["soil", "npk", "card", "shc"]) and "Soil" in s.category:
                relevance = 3
            elif any(k in query_text for k in ["insur", "pmfby", "loss", "rain"]) and "Insurance" in s.category:
                relevance = 3
            elif any(k in query_text for k in ["loan", "credit", "kcc", "finance", "budget"]) and "Credit" in s.category:
                relevance = 3
            elif "pm-kisan" in query_text or "pm kisan" in query_text:
                if s.id == "pm_kisan":
                    relevance = 3
            schemes_out.append((relevance, s.model_dump()))

        schemes_out.sort(key=lambda x: x[0], reverse=True)
        top_schemes = [item[1] for item in schemes_out[:4]]
        return {
            "status": "completed",
            "summary": f"Found {len(top_schemes)} relevant Indian agricultural government schemes (PM-KISAN, PMFBY, PMKSY, KCC, SHC).",
            "data": {
                "schemes": top_schemes,
                "approval_disclaimer": "Scheme listing is informational only. RaithaMitra does not verify or claim approval for any government benefit; apply through the official government portal or local Krishi Kendra.",
            },
            "source": "Ministry of Agriculture & Farmers Welfare (Official Scheme Directory)",
            "data_quality": "official",
        }


tool_registry = AgriToolRegistry()
