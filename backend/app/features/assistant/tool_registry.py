"""
AD-23: Centralized Agricultural Tool Registry.
Every tool declares allowed roles, classification (read_only vs transactional),
data provenance, and executes strictly through validated Python handlers.
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from backend.app.data.schemes import INDIAN_GOVERNMENT_SCHEMES
from backend.app.engines.decision_engine import decision_engine
from backend.app.features.assistant.schemas import (
    ClientDirective,
    PendingActionPreview,
    SourceReference,
    StructuredCard,
)
from backend.app.features.finance.service import (
    compute_financial_summary,
    sync_farm_financials,
)
from backend.app.schemas.farm import Farm
from backend.app.schemas.scientific import SoilAnalysisRequest
from backend.app.services.biotech_service import biotech_service
from backend.app.services.diagnostics_service import diagnostics_service
from backend.app.services.nursery_service import nursery_service
from backend.app.services.soil_service import soil_service
from backend.app.services.weather_service import weather_service

CROP_SEED_PRESETS: Dict[str, Dict[str, Any]] = {
    "Tomato": {
        "variety": "Arka Rakshak (ICAR-IIHR Triple Disease Resistant)",
        "alt_variety": "Arka Vikas (Open-Pollinated Low-Input)",
        "seed_kg_per_acre": 0.15,
        "seed_price_per_kg": 4500.0,
        "non_seed_per_acre": 35000.0,
        "alt_non_seed_per_acre": 22000.0,
        "yield_kg_per_acre": 25000.0,
        "price_per_kg": 22.0,
    },
    "Maize": {
        "variety": "Pioneer P3396 F1 (High-Yielding)",
        "alt_variety": "NAH-1137 (UAS Bengaluru Drought-Tolerant)",
        "seed_kg_per_acre": 8.0,
        "seed_price_per_kg": 380.0,
        "non_seed_per_acre": 18000.0,
        "alt_non_seed_per_acre": 14000.0,
        "yield_kg_per_acre": 2800.0,
        "price_per_kg": 21.0,
    },
    "Rice": {
        "variety": "MTU-1010 / Jaya (High-Yielding Paddy)",
        "alt_variety": "Sahbhagi Dhan (Drought-Tolerant)",
        "seed_kg_per_acre": 20.0,
        "seed_price_per_kg": 65.0,
        "non_seed_per_acre": 24000.0,
        "alt_non_seed_per_acre": 18000.0,
        "yield_kg_per_acre": 2400.0,
        "price_per_kg": 23.0,
    },
    "Ragi": {
        "variety": "GPU-28 (Blast-Resistant Finger Millet)",
        "alt_variety": "MR-6 (Rainfed Resilience)",
        "seed_kg_per_acre": 4.0,
        "seed_price_per_kg": 110.0,
        "non_seed_per_acre": 12000.0,
        "alt_non_seed_per_acre": 9500.0,
        "yield_kg_per_acre": 1200.0,
        "price_per_kg": 38.0,
    },
    "Chilli": {
        "variety": "Byadagi Kaddi / Arka Khyati",
        "alt_variety": "Guntur Sannam S4",
        "seed_kg_per_acre": 0.25,
        "seed_price_per_kg": 3800.0,
        "non_seed_per_acre": 32000.0,
        "alt_non_seed_per_acre": 24000.0,
        "yield_kg_per_acre": 2200.0,
        "price_per_kg": 110.0,
    },
}

TOOL_METADATA: Dict[str, Dict[str, Any]] = {
    "get_irrigation_and_weather": {
        "description": "Retrieve live Open-Meteo weather forecast and FAO-56 decision-engine irrigation advice.",
        "allowed_roles": ["farmer", "buyer", "labour", "driver", "admin"],
        "classification": "read_only",
        "provenance": "Open-Meteo Live Weather + FAO-56 Decision Engine",
    },
    "get_soil_recommendations": {
        "description": "Retrieve soil texture and nutrient threshold guidance for the farmer's farm.",
        "allowed_roles": ["farmer", "admin"],
        "classification": "read_only",
        "provenance": "RaithaMitra Soil Science Engine",
    },
    "generate_seed_investment_plan": {
        "description": "Calculate seed quantity, total investment, expected production, profit, and budget check.",
        "allowed_roles": ["farmer", "admin"],
        "classification": "read_only",
        "provenance": "BioIntel & Seed Investment Calculator",
    },
    "recommend_crops": {
        "description": "Suggest suitable crops based on farm soil, water, and budget.",
        "allowed_roles": ["farmer", "admin"],
        "classification": "read_only",
        "provenance": "BioIntel Crop Suitability & ICAR Profiles",
    },
    "retrieve_scientific_research": {
        "description": "Fetch peer-reviewed agricultural studies from Europe PMC with citations.",
        "allowed_roles": ["farmer", "buyer", "labour", "driver", "admin"],
        "classification": "read_only",
        "provenance": "Europe PMC Open-Access Life Sciences Index",
    },
    "find_nurseries": {
        "description": "Find certified seed nurseries and planting materials.",
        "allowed_roles": ["farmer", "buyer", "admin"],
        "classification": "read_only",
        "provenance": "RaithaMitra Certified Nursery Directory",
    },
    "control_digital_farm": {
        "description": "Control Digital Farm growth simulation (play/pause/resume/summary).",
        "allowed_roles": ["farmer", "admin"],
        "classification": "read_only",
        "provenance": "Digital Farm Simulator",
    },
    "prepare_labour_job_draft": {
        "description": "Prepare a labour job posting preview requiring explicit confirmation.",
        "allowed_roles": ["farmer", "admin"],
        "classification": "transactional",
        "provenance": "Labour Connect",
    },
    "lookup_labour_info": {
        "description": "Lookup available workers, open agricultural jobs, or worker earnings.",
        "allowed_roles": ["farmer", "labour", "admin"],
        "classification": "read_only",
        "provenance": "Labour Connect SQLite Records",
    },
    "get_bidding_and_orders": {
        "description": "Retrieve active Smart Bidding listings, highest buyer bids, and confirmed orders.",
        "allowed_roles": ["farmer", "buyer", "admin"],
        "classification": "read_only",
        "provenance": "Smart Bidding SQLite Marketplace",
    },
    "prepare_bidding_listing_draft": {
        "description": "Prepare a produce auction listing preview requiring explicit confirmation.",
        "allowed_roles": ["farmer", "admin"],
        "classification": "transactional",
        "provenance": "Smart Bidding",
    },
    "find_transport_and_optimize": {
        "description": "Find capacity-compatible vehicles, estimate fares, and compare shared transport savings.",
        "allowed_roles": ["farmer", "buyer", "driver", "admin"],
        "classification": "read_only",
        "provenance": "Transport Connect & OR-Tools Fleet Model",
    },
    "prepare_transport_booking_draft": {
        "description": "Prepare a transport freight booking preview requiring explicit confirmation.",
        "allowed_roles": ["farmer", "buyer", "admin"],
        "classification": "transactional",
        "provenance": "Transport Connect",
    },
    "get_financial_intelligence": {
        "description": "Retrieve verified farm budget, recorded expenses, confirmed sales, payments, profit, ROI, and break-even.",
        "allowed_roles": ["farmer", "admin"],
        "classification": "read_only",
        "provenance": "AD-24 SQLite Financial Ledger",
    },
    "get_satellite_intelligence": {
        "description": "Retrieve latest Sentinel-2 satellite observation, cloud cover, spectral indices, and canopy/moisture stress guidance.",
        "allowed_roles": ["farmer", "admin"],
        "classification": "read_only",
        "provenance": "AD-25 Satellite & Geospatial Intelligence",
    },
    "get_post_harvest_intelligence": {
        "description": "Retrieve farmer's post-harvest inventory levels, crop-specific storage conditions, shelf-life estimates, and sell-vs-store guidance.",
        "allowed_roles": ["farmer", "admin"],
        "classification": "read_only",
        "provenance": "AD-27 Post-Harvest Intelligence & Storage KB",
    },
    "get_equipment_intelligence": {
        "description": "Search available agricultural machinery, check bookings and shared rental savings, and recommend compatible equipment.",
        "allowed_roles": ["farmer", "admin"],
        "classification": "read_only",
        "provenance": "AD-28 Equipment Connect & OR-Tools Scheduler",
    },
    "get_market_intelligence": {
        "description": "Retrieve agricultural market prices, historical trends, statistical forecasts, and market comparison guidance.",
        "allowed_roles": ["farmer", "buyer", "admin"],
        "classification": "read_only",
        "provenance": "AD-29 Live Market Intelligence & Forecasting",
    },
    "get_farm_decision_summary": {
        "description": "Run AD-30 centralized decision intelligence, conflict resolution, and prioritized daily action plan for the farm.",
        "allowed_roles": ["farmer", "admin"],
        "classification": "read_only",
        "provenance": "AD-30 Centralized Agricultural Decision Intelligence",
    },
    "find_government_schemes": {
        "description": "Retrieve verified Indian government agricultural schemes and official links.",
        "allowed_roles": ["farmer", "buyer", "labour", "driver", "admin"],
        "classification": "read_only",
        "provenance": "Verified Central & State Agricultural Scheme Registry",
    },
    "check_crop_health_adapter": {
        "description": "Compatible adapter for AD-22 Crop Doctor availability without fabricating predictions.",
        "allowed_roles": ["farmer", "admin"],
        "classification": "read_only",
        "provenance": "AD-22 Crop Diagnostics Adapter",
    },
}


def _row_to_farm_schema(farm_row: Dict[str, Any]) -> Farm:
    return Farm(
        id=farm_row["id"],
        farmer_id=farm_row["farmer_id"],
        farmer_name=farm_row["farmer_name"],
        farm_name=farm_row["farm_name"],
        village=farm_row["village"],
        district=farm_row["district"],
        state=farm_row["state"],
        latitude=float(farm_row["latitude"]),
        longitude=float(farm_row["longitude"]),
        land_area_ha=float(farm_row["land_area_ha"]),
        primary_crop=farm_row["primary_crop"],
        crop_variety=farm_row.get("crop_variety"),
        sowing_date=farm_row["sowing_date"],
        crop_stage=farm_row["crop_stage"],
        soil_type=farm_row["soil_type"],
        irrigation_method=farm_row["irrigation_method"],
        water_source=farm_row["water_source"],
        available_water_m3=float(farm_row.get("available_water_m3") or 10000.0),
        cultivation_budget_inr=float(farm_row.get("cultivation_budget_inr") or 50000.0),
        created_at=farm_row["created_at"],
        updated_at=farm_row["updated_at"],
    )


async def execute_tool(
    tool_name: str,
    *,
    cursor,
    user: Dict[str, str],
    farm: Optional[Dict[str, Any]],
    params: Dict[str, Any],
    conversation_id: str,
) -> Dict[str, Any]:
    meta = TOOL_METADATA.get(tool_name)
    if not meta:
        raise ValueError(f"Tool '{tool_name}' is not in the allowlisted registry.")
    if user["role"] not in meta["allowed_roles"]:
        return {
            "authorized": False,
            "summary": f"Role '{user['role']}' is not authorized to execute {tool_name}.",
            "cards": [],
            "sources": [],
            "provenance": "RBAC Authorization Check",
        }

    now_iso = datetime.now(timezone.utc).isoformat()
    cards: List[StructuredCard] = []
    sources: List[SourceReference] = []

    if tool_name == "get_irrigation_and_weather":
        lat = float(farm["latitude"]) if farm else 12.5234
        lon = float(farm["longitude"]) if farm else 76.8976
        weather = await weather_service.get_weather(lat, lon)
        rain_48h = 0.0
        if len(weather.daily_forecast) >= 2:
            rain_48h = round(
                weather.daily_forecast[0].precipitation_sum_mm
                + weather.daily_forecast[1].precipitation_sum_mm,
                1,
            )

        if farm:
            farm_obj = _row_to_farm_schema(farm)
            decision = decision_engine.evaluate_farm(farm_obj, weather)
            top_rec = decision.recommendations[0] if decision.recommendations else None
            cards.append(
                StructuredCard(
                    card_type="irrigation",
                    title=top_rec.title if top_rec else "Weather & Irrigation Forecast",
                    metrics={
                        "Temperature": f"{weather.current.temperature_c}°C",
                        "ET0 (FAO-56)": f"{weather.current.et0_fao56_mm} mm/day",
                        "Rain Next 48h": f"{rain_48h} mm",
                        "Soil Moisture Est.": f"{decision.recommendations[0].supporting_data.key_metrics.get('current_soil_moisture_pct', 'N/A')}%"
                        if top_rec
                        else "N/A",
                    },
                    highlights=[top_rec.action, top_rec.reason] if top_rec else [],
                )
            )
            sources.append(
                SourceReference(
                    title="Open-Meteo Live Weather & FAO-56 Decision Engine",
                    source=getattr(weather, "data_source", "Open-Meteo Weather API"),
                    timestamp=now_iso,
                    limitations="Forecast-based estimate; verify field soil moisture before irrigating.",
                )
            )
            return {
                "authorized": True,
                "data": {
                    "temperature_c": weather.current.temperature_c,
                    "et0_mm": weather.current.et0_fao56_mm,
                    "rain_48h_mm": rain_48h,
                    "recommendation_title": top_rec.title if top_rec else "Monitor moisture",
                    "action": top_rec.action if top_rec else "Check soil moisture before irrigation",
                    "reason": top_rec.reason if top_rec else "",
                    "conflicts": [c.conflict_type for c in decision.conflicts_resolved],
                },
                "cards": cards,
                "sources": sources,
                "provenance": meta["provenance"],
            }

        cards.append(
            StructuredCard(
                card_type="weather",
                title="Local Agricultural Weather Telemetry",
                metrics={
                    "Temperature": f"{weather.current.temperature_c}°C",
                    "Humidity": f"{weather.current.relative_humidity_pct}%",
                    "Rain Next 48h": f"{rain_48h} mm",
                },
            )
        )
        w_source = getattr(weather, "data_source", "Open-Meteo Weather API")
        sources.append(SourceReference(title="Open-Meteo Forecast", source=w_source, timestamp=now_iso))
        return {
            "authorized": True,
            "data": {"temperature_c": weather.current.temperature_c, "rain_48h_mm": rain_48h},
            "cards": cards,
            "sources": sources,
            "provenance": w_source,
        }

    if tool_name == "get_soil_recommendations":
        soil_type = farm["soil_type"] if farm else "Red Sandy Loam"
        crop = farm["primary_crop"] if farm else "Tomato"
        area_ha = float(farm["land_area_ha"]) if farm else 1.0
        soil_out = soil_service.analyze_soil(
            SoilAnalysisRequest(
                farm_id=farm["id"] if farm else "farm_001",
                crop_type=crop,
                farm_area_ha=area_ha,
                soil_type=soil_type,
                soil_ph=6.5,
            )
        )
        cards.append(
            StructuredCard(
                card_type="irrigation",
                title=f"Soil & Nutrient Profile ({soil_type})",
                metrics={
                    "Crop": crop,
                    "pH Assumption": "6.5 (Standard Loam Baseline)",
                    "Area": f"{area_ha} ha",
                },
                highlights=soil_out.recommended_actions[:3],
            )
        )
        sources.append(SourceReference(title="ICAR Soil Nutrient Thresholds", source=soil_out.source, timestamp=now_iso))
        return {
            "authorized": True,
            "data": {"soil_type": soil_type, "actions": soil_out.recommended_actions},
            "cards": cards,
            "sources": sources,
            "provenance": soil_out.source,
        }

    if tool_name == "generate_seed_investment_plan":
        crop = params.get("crop") or (farm["primary_crop"] if farm else "Tomato")
        preset = CROP_SEED_PRESETS.get(crop, CROP_SEED_PRESETS["Tomato"])
        area_acres = float(params.get("area_acres") or (round(float(farm["land_area_ha"]) * 2.471, 1) if farm else 2.0))
        budget_inr = float(params.get("budget_inr") or (farm["cultivation_budget_inr"] if farm else 50000.0))
        water = params.get("water") or "Moderate"

        seed_qty = round(preset["seed_kg_per_acre"] * area_acres, 2)
        seed_cost = round(seed_qty * preset["seed_price_per_kg"], 2)
        non_seed = round(preset["non_seed_per_acre"] * area_acres, 2)
        total_inv = round(seed_cost + non_seed, 2)
        expected_prod = round(preset["yield_kg_per_acre"] * area_acres, 0)
        expected_rev = round(expected_prod * preset["price_per_kg"], 2)
        est_profit = round(expected_rev - total_inv, 2)
        exceeds = total_inv > budget_inr

        highlights = [
            f"Recommended Variety: {preset['variety']}",
            f"Seed Required: {seed_qty} kg (₹{seed_cost:,.0f})",
        ]
        if exceeds:
            alt_total = round(seed_cost + preset["alt_non_seed_per_acre"] * area_acres, 2)
            highlights.append(
                f"Budget Alert: ₹{total_inv:,.0f} exceeds ₹{budget_inr:,.0f}. Lower-cost alternative ({preset['alt_variety']}) est. ₹{alt_total:,.0f}."
            )

        cards.append(
            StructuredCard(
                card_type="biointel_plan",
                title=f"Cultivation Plan: {crop} ({area_acres} acres)",
                metrics={
                    "Water": water,
                    "Est. Investment": f"₹{total_inv:,.0f}",
                    "Available Budget": f"₹{budget_inr:,.0f}",
                    "Est. Production": f"{expected_prod:,.0f} kg",
                    "Est. Net Profit": f"₹{est_profit:,.0f}",
                },
                highlights=highlights,
            )
        )
        directive = ClientDirective(
            directive_type="biointel_fill",
            route="/biointel",
            payload={
                "userId": user["user_id"],
                "crop": crop,
                "areaAcres": area_acres,
                "budgetInr": budget_inr,
                "waterAvailability": water,
                "openNurseries": False,
                "autoGenerate": True,
                "requestedAt": now_iso,
            },
        )
        sources.append(SourceReference(title="BioIntel & Seed Investment Estimator", source="RaithaMitra BioIntel Engine", timestamp=now_iso, limitations="Estimates depend on market prices and weather."))
        return {
            "authorized": True,
            "data": {
                "crop": crop,
                "variety": preset["variety"],
                "alt_variety": preset["alt_variety"],
                "area_acres": area_acres,
                "budget_inr": budget_inr,
                "water": water,
                "seed_qty_kg": seed_qty,
                "total_investment_inr": total_inv,
                "expected_production_kg": expected_prod,
                "expected_revenue_inr": expected_rev,
                "estimated_profit_inr": est_profit,
                "exceeds_budget": exceeds,
            },
            "cards": cards,
            "sources": sources,
            "client_directive": directive,
            "provenance": meta["provenance"],
        }

    if tool_name == "recommend_crops":
        budget = float(farm["cultivation_budget_inr"]) if farm else 50000.0
        soil = farm["soil_type"] if farm else "Red Sandy Loam"
        ranked = []
        for cname, p in CROP_SEED_PRESETS.items():
            cost_1ac = p["seed_kg_per_acre"] * p["seed_price_per_kg"] + p["non_seed_per_acre"]
            profit_1ac = p["yield_kg_per_acre"] * p["price_per_kg"] - cost_1ac
            ranked.append({"crop": cname, "variety": p["variety"], "cost_per_acre": round(cost_1ac, 0), "est_profit_per_acre": round(profit_1ac, 0)})
        ranked.sort(key=lambda x: x["est_profit_per_acre"], reverse=True)
        cards.append(
            StructuredCard(
                card_type="biointel_plan",
                title=f"Recommended Crops for {soil} (Budget ₹{budget:,.0f})",
                metrics={r["crop"]: f"Est. ₹{r['est_profit_per_acre']:,.0f}/acre (Cost ₹{r['cost_per_acre']:,.0f})" for r in ranked[:3]},
                highlights=[f"Top Match: {ranked[0]['crop']} ({ranked[0]['variety']})"],
            )
        )
        sources.append(SourceReference(title="ICAR & Regional Agronomic Suitability", source="RaithaMitra BioIntel", timestamp=now_iso))
        return {"authorized": True, "data": {"ranked": ranked[:3], "soil": soil, "budget": budget}, "cards": cards, "sources": sources, "provenance": meta["provenance"]}

    if tool_name == "retrieve_scientific_research":
        crop = params.get("crop") or (farm["primary_crop"] if farm else "Tomato")
        res = biotech_service.fetch_research_papers(crop=crop, page_size=3)
        for p in res.papers[:2]:
            sources.append(
                SourceReference(
                    title=p.title,
                    source=f"{p.journal_title or 'Europe PMC'} ({p.pub_year or 'Recent'})",
                    url=p.article_url,
                    timestamp=now_iso,
                    limitations="Peer-reviewed research; verify local ICAR/KVK certification before commercial use.",
                )
            )
        cards.append(
            StructuredCard(
                card_type="research",
                title=f"Scientific Evidence: {crop}",
                metrics={"Papers Found": res.total_results, "Source": "Europe PMC"},
                highlights=[p.title for p in res.papers[:2]],
            )
        )
        return {"authorized": True, "data": {"crop": crop, "papers": [p.title for p in res.papers[:2]]}, "cards": cards, "sources": sources, "provenance": meta["provenance"]}

    if tool_name == "find_nurseries":
        crop = params.get("crop") or (farm["primary_crop"] if farm else "Tomato")
        nurseries = nursery_service.get_nearby_nurseries(crop=crop)
        cards.append(
            StructuredCard(
                card_type="biointel_plan",
                title=f"Certified Nurseries for {crop}",
                metrics={n.name: f"{n.district} ({n.distance_km} km)" for n in nurseries[:3]},
                highlights=[f"{len(nurseries)} verified nurseries available in directory."],
            )
        )
        sources.append(SourceReference(title="RaithaMitra Certified Nursery Registry", source="Nursery Service", timestamp=now_iso))
        return {"authorized": True, "data": {"count": len(nurseries), "top": nurseries[0].name if nurseries else None}, "cards": cards, "sources": sources, "provenance": meta["provenance"]}

    if tool_name == "control_digital_farm":
        action = params.get("action") or "summary"
        directive = ClientDirective(
            directive_type="digital_farm_control",
            route="/digital-farming",
            payload={"action": action},
        )
        return {"authorized": True, "data": {"action": action}, "cards": cards, "sources": sources, "client_directive": directive, "provenance": meta["provenance"]}

    if tool_name == "lookup_labour_info":
        if user["role"] == "labour":
            prof = cursor.execute("SELECT * FROM labour_profiles WHERE user_id = ?", (user["user_id"],)).fetchone()
            open_jobs = cursor.execute("SELECT title, work_location, wage_per_day, work_date FROM labour_jobs WHERE status = 'open' LIMIT 3").fetchall()
            cards.append(
                StructuredCard(
                    card_type="labour",
                    title="Your Labour Profile & Open Work",
                    metrics={
                        "Total Earnings": f"₹{float(prof['total_earnings']):,.0f}" if prof else "₹0",
                        "Jobs Completed": int(prof["total_jobs_completed"]) if prof else 0,
                        "Open Jobs Nearby": len(open_jobs),
                    },
                    highlights=[f"{j['title']} in {j['work_location']} @ ₹{j['wage_per_day']}/day" for j in open_jobs],
                )
            )
            return {"authorized": True, "data": {"earnings": float(prof["total_earnings"]) if prof else 0.0, "open_jobs": len(open_jobs)}, "cards": cards, "sources": sources, "provenance": meta["provenance"]}

        workers = cursor.execute("SELECT name, location, daily_wage_rate FROM labour_profiles WHERE availability_status = 'available' LIMIT 5").fetchall()
        cards.append(
            StructuredCard(
                card_type="labour",
                title="Available Agricultural Workers",
                metrics={"Available Workers": len(workers)},
                highlights=[f"{w['name']} ({w['location']}) — ₹{w['daily_wage_rate']}/day" for w in workers[:3]],
            )
        )
        return {"authorized": True, "data": {"workers_count": len(workers)}, "cards": cards, "sources": sources, "provenance": meta["provenance"]}

    if tool_name == "prepare_labour_job_draft":
        workers_count = int(params.get("workers") or 3)
        work_type = params.get("work_type") or "Harvesting"
        crop = (farm["primary_crop"] if farm else None) or "Tomato"
        location = f"{farm['village']}, {farm['district']}" if farm else "Mandya Rural, Mandya"
        work_date = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
        wage = 650.0
        est_daily_cost = wage * workers_count
        payload = {
            "farmer_id": user["user_id"],
            "farmer_name": user["name"],
            "farm_id": farm["id"] if farm else "farm_001",
            "title": f"{crop} {work_type}",
            "job_type": work_type,
            "crop_type": crop,
            "work_location": location,
            "work_date": work_date,
            "working_hours": "07:00 - 15:00",
            "wage_per_day": wage,
            "required_workers": workers_count,
        }
        action_id = f"act_{uuid.uuid4().hex[:10]}"
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        summary = f"Post {work_type} job for {workers_count} workers on {work_date} in {location} at ₹{wage:.0f}/day (est. ₹{est_daily_cost:,.0f}/day)."
        cursor.execute(
            """
            INSERT INTO assistant_pending_actions (id, conversation_id, user_id, session_token_hash, action_type, payload_json, summary, status, expires_at, created_at)
            VALUES (?, ?, ?, ?, 'labour_post', ?, ?, 'pending', ?, ?)
            """,
            (action_id, conversation_id, user["user_id"], user["session_hash"], json.dumps(payload), summary, expires_at, now_iso),
        )
        preview = PendingActionPreview(
            action_id=action_id,
            action_type="labour_post",
            summary=summary,
            consequences=f"Publishes an open job on Labour Connect; commits up to ₹{est_daily_cost:,.0f}/day once workers are accepted.",
            payload=payload,
            expires_at=expires_at,
        )
        return {"authorized": True, "data": {"summary": summary}, "cards": cards, "sources": sources, "pending_action": preview, "provenance": meta["provenance"]}

    if tool_name == "get_bidding_and_orders":
        listings = cursor.execute("SELECT * FROM bidding_listings WHERE status = 'active' ORDER BY created_at DESC LIMIT 5").fetchall()
        orders = cursor.execute(
            "SELECT * FROM purchase_orders WHERE farmer_id = ? OR buyer_id = ? ORDER BY created_at DESC LIMIT 5",
            (user["user_id"], user["user_id"]),
        ).fetchall()
        highlights = []
        for l in listings[:3]:
            best = l["highest_bid_amount"] or l["min_price_per_kg"]
            highlights.append(f"{l['crop_name']} ({l['quantity_kg']} kg) — Highest/Min Offer: ₹{best}/kg ({l['buyer_count']} bids)")
        cards.append(
            StructuredCard(
                card_type="bidding_offers",
                title="Smart Bidding & Purchase Orders",
                metrics={"Active Listings": len(listings), "Confirmed Orders": len(orders)},
                highlights=highlights,
            )
        )
        return {"authorized": True, "data": {"active_listings": len(listings), "orders": len(orders)}, "cards": cards, "sources": sources, "provenance": meta["provenance"]}

    if tool_name == "prepare_bidding_listing_draft":
        crop = params.get("crop") or (farm["primary_crop"] if farm else "Tomato")
        qty = float(params.get("quantity_kg") or 1000.0)
        min_price = float(params.get("min_price_per_kg") or 22.0)
        location = f"{farm['village']}, {farm['district']}" if farm else "Mandya Rural, Mandya"
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        deadline = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        payload = {
            "farmer_id": user["user_id"],
            "farmer_name": user["name"],
            "farm_id": farm["id"] if farm else "farm_001",
            "crop_name": crop,
            "variety": (farm.get("crop_variety") if farm else None) or "Standard Grade",
            "quantity_kg": qty,
            "min_price_per_kg": min_price,
            "harvest_date": today,
            "location": location,
            "bidding_deadline": deadline,
        }
        action_id = f"act_{uuid.uuid4().hex[:10]}"
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        summary = f"List {qty:,.0f} kg of {crop} for Smart Bidding at reserve ₹{min_price}/kg (min value ₹{qty * min_price:,.0f})."
        cursor.execute(
            """
            INSERT INTO assistant_pending_actions (id, conversation_id, user_id, session_token_hash, action_type, payload_json, summary, status, expires_at, created_at)
            VALUES (?, ?, ?, ?, 'bidding_post', ?, ?, 'pending', ?, ?)
            """,
            (action_id, conversation_id, user["user_id"], user["session_hash"], json.dumps(payload), summary, expires_at, now_iso),
        )
        preview = PendingActionPreview(
            action_id=action_id,
            action_type="bidding_post",
            summary=summary,
            consequences="Opens a public auction listing for verified buyers to place bids.",
            payload=payload,
            expires_at=expires_at,
        )
        return {"authorized": True, "data": {"summary": summary}, "cards": cards, "sources": sources, "pending_action": preview, "provenance": meta["provenance"]}

    if tool_name == "find_transport_and_optimize":
        weight = float(params.get("weight_kg") or 1500.0)
        vehicles = cursor.execute(
            "SELECT * FROM transport_vehicles WHERE availability_status = 'available' AND capacity_kg >= ? ORDER BY capacity_kg ASC LIMIT 5",
            (weight,),
        ).fetchall()
        if not vehicles:
            vehicles = cursor.execute(
                "SELECT * FROM transport_vehicles WHERE availability_status = 'available' ORDER BY capacity_kg DESC LIMIT 3"
            ).fetchall()
        est_dist = 45.0
        highlights = []
        for v in vehicles[:3]:
            est_fare = round(est_dist * float(v["base_fare_per_km"]), 0)
            highlights.append(f"{v['driver_name']} — {v['vehicle_type']} ({v['capacity_kg']} kg cap, est. ₹{est_fare:,.0f} for 45 km)")
        cards.append(
            StructuredCard(
                card_type="transport",
                title=f"Transport Options for {weight:,.0f} kg",
                metrics={"Compatible Vehicles": len(vehicles), "Estimated Distance": f"{est_dist} km"},
                highlights=highlights,
            )
        )
        return {
            "authorized": True,
            "data": {"weight_kg": weight, "vehicle_count": len(vehicles), "top_driver": vehicles[0]["driver_name"] if vehicles else None},
            "cards": cards,
            "sources": sources,
            "provenance": meta["provenance"],
        }

    if tool_name == "prepare_transport_booking_draft":
        weight = float(params.get("weight_kg") or 1000.0)
        crop = params.get("crop") or (farm["primary_crop"] if farm else "Tomato")
        veh = cursor.execute(
            "SELECT * FROM transport_vehicles WHERE availability_status = 'available' AND capacity_kg >= ? ORDER BY capacity_kg ASC LIMIT 1",
            (weight,),
        ).fetchone()
        if not veh:
            return {"authorized": True, "data": {"error": f"No available vehicle found with capacity >= {weight} kg."}, "cards": cards, "sources": sources, "provenance": meta["provenance"]}
        dist = 45.0
        fare = round(dist * float(veh["base_fare_per_km"]), 2)
        pickup = f"{farm['village']}, {farm['district']}" if farm else "Mandya Rural, Mandya"
        payload = {
            "farmer_id": user["user_id"],
            "farmer_name": user["name"],
            "driver_id": veh["driver_id"],
            "driver_name": veh["driver_name"],
            "driver_phone": veh["driver_phone"],
            "produce_type": crop,
            "weight_kg": weight,
            "pickup_location": pickup,
            "delivery_destination": "Yeshwanthpur APMC Yard, Bengaluru",
            "pickup_time": "Tomorrow 06:00 AM",
            "vehicle_type": veh["vehicle_type"],
            "estimated_distance_km": dist,
            "total_fare": fare,
        }
        action_id = f"act_{uuid.uuid4().hex[:10]}"
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        summary = f"Book {veh['vehicle_type']} ({veh['driver_name']}) for {weight:,.0f} kg {crop} from {pickup} (est. fare ₹{fare:,.0f})."
        cursor.execute(
            """
            INSERT INTO assistant_pending_actions (id, conversation_id, user_id, session_token_hash, action_type, payload_json, summary, status, expires_at, created_at)
            VALUES (?, ?, ?, ?, 'transport_book', ?, ?, 'pending', ?, ?)
            """,
            (action_id, conversation_id, user["user_id"], user["session_hash"], json.dumps(payload), summary, expires_at, now_iso),
        )
        preview = PendingActionPreview(
            action_id=action_id,
            action_type="transport_book",
            summary=summary,
            consequences=f"Creates a freight booking request and commits ₹{fare:,.0f} in your farm financial ledger.",
            payload=payload,
            expires_at=expires_at,
        )
        return {"authorized": True, "data": {"summary": summary}, "cards": cards, "sources": sources, "pending_action": preview, "provenance": meta["provenance"]}

    if tool_name == "get_financial_intelligence":
        if not farm:
            return {"authorized": True, "data": {"error": "No farm profile found for your account."}, "cards": cards, "sources": sources, "provenance": meta["provenance"]}
        sync_farm_financials(cursor, farm["farmer_id"], farm["id"])
        fin = compute_financial_summary(cursor, farm["farmer_id"], farm)

        price_drop_pct = params.get("price_drop_pct")
        what_if_note = None
        if price_drop_pct:
            base_rev = fin["confirmed_sales_value_inr"]
            stressed_rev = round(base_rev * (1.0 - float(price_drop_pct) / 100.0), 2)
            stressed_profit = round(stressed_rev - fin["total_cost_inr"], 2)
            what_if_note = f"What-If ({price_drop_pct}% price drop): Revenue falls from ₹{base_rev:,.0f} to ₹{stressed_rev:,.0f}; projected profit becomes ₹{stressed_profit:,.0f}."

        cards.append(
            StructuredCard(
                card_type="financial_summary",
                title=f"Verified Financial Summary — {fin['farm_name']}",
                metrics={
                    "Allocated Budget": f"₹{fin['allocated_budget_inr']:,.0f}",
                    "Recorded Expenses": f"₹{fin['actual_recorded_expenses_inr']:,.0f}",
                    "Committed Expenses": f"₹{fin['committed_expenses_inr']:,.0f}",
                    "Remaining Budget": f"₹{fin['remaining_budget_inr']:,.0f}",
                    "Confirmed Sales": f"₹{fin['confirmed_sales_value_inr']:,.0f}",
                    "Received Cash": f"₹{fin['received_payments_inr']:,.0f}",
                    "Outstanding": f"₹{fin['outstanding_payments_inr']:,.0f}",
                    "Realized Net Profit": f"₹{fin['realized_net_profit_inr']:,.0f}",
                    "Est. Net Profit": f"₹{fin['estimated_net_profit_inr']:,.0f}",
                    "Break-Even Price": f"₹{fin['break_even_price_per_kg']}/kg" if fin["break_even_price_per_kg"] is not None else "N/A",
                },
                highlights=([what_if_note] if what_if_note else []) + [r["detail"] for r in fin["recommendations"][:2]],
            )
        )
        sources.append(SourceReference(title="AD-24 Persistent SQLite Financial Ledger", source="RaithaMitra Finance Engine", timestamp=now_iso))
        return {"authorized": True, "data": {**fin, "what_if_note": what_if_note}, "cards": cards, "sources": sources, "provenance": meta["provenance"]}

    if tool_name == "find_government_schemes":
        schemes = INDIAN_GOVERNMENT_SCHEMES[:4]
        cards.append(
            StructuredCard(
                card_type="schemes",
                title="Verified Indian Government Agricultural Schemes",
                metrics={s.name: s.financial_benefit for s in schemes},
                highlights=[f"{s.name}: {', '.join(s.eligibility_criteria[:2])}" for s in schemes[:2]],
            )
        )
        for s in schemes[:3]:
            sources.append(SourceReference(title=s.name, source="Official Government Portal", url=s.application_portal, limitations="Check official portal for state-specific eligibility verification."))
        return {"authorized": True, "data": {"schemes": [s.name for s in schemes]}, "cards": cards, "sources": sources, "provenance": meta["provenance"]}

    if tool_name == "get_satellite_intelligence":
        if not farm:
            return {"authorized": True, "data": {"error": "No farm profile found for satellite analysis."}, "cards": cards, "sources": sources, "provenance": meta["provenance"]}
        from backend.app.features.satellite.service import satellite_intelligence_service

        sat = await satellite_intelligence_service.analyze_observation(
            user_id=user["user_id"],
            role=user["role"],
            farm_id=farm["id"],
            latitude=float(farm["latitude"]),
            longitude=float(farm["longitude"]),
        )
        hist = satellite_intelligence_service.get_history(
            user_id=user["user_id"],
            role=user["role"],
            farm_id=farm["id"],
            limit=6,
        )
        idx = sat.get("indices", {})
        fusion = sat.get("agronomic_fusion", {})
        metrics: Dict[str, Any] = {
            "Provider": sat.get("provider", "Satellite"),
            "Source Mode": sat.get("source_mode", "unknown"),
            "Acquisition Date": (sat.get("acquisition_date") or "N/A")[:10],
            "Cloud Cover": f"{sat['cloud_cover_pct']:.1f}%" if sat.get("cloud_cover_pct") is not None else "N/A",
            "Canopy Status": fusion.get("canopy_status", "N/A"),
            "Moisture Status": fusion.get("moisture_status", "N/A"),
        }
        if idx.get("ndvi") is not None:
            metrics["NDVI"] = f"{idx['ndvi']:.3f}"
        if idx.get("ndmi") is not None:
            metrics["NDMI"] = f"{idx['ndmi']:.3f}"
        if idx.get("evi") is not None:
            metrics["EVI"] = f"{idx['evi']:.3f}"

        highlights = [
            fusion.get("canopy_health_summary", ""),
            fusion.get("irrigation_guidance", ""),
        ]
        if hist.get("change_detection"):
            highlights.append(hist["change_detection"].get("summary", ""))
        highlights = [h for h in highlights if h]

        cards.append(
            StructuredCard(
                card_type="satellite_intelligence",
                title=f"Satellite Intelligence — {farm['farm_name']}",
                metrics=metrics,
                highlights=highlights[:3],
            )
        )
        sources.append(SourceReference(title=sat.get("provider", "Sentinel-2 L2A"), source="AD-25 Satellite Intelligence", timestamp=now_iso))
        return {
            "authorized": True,
            "data": {
                "farm_name": farm["farm_name"],
                "source_mode": sat.get("source_mode"),
                "acquisition_date": sat.get("acquisition_date"),
                "cloud_cover_pct": sat.get("cloud_cover_pct"),
                "band_statistics_available": sat.get("band_statistics_available"),
                "indices": idx,
                "canopy_status": fusion.get("canopy_status"),
                "moisture_status": fusion.get("moisture_status"),
                "irrigation_guidance": fusion.get("irrigation_guidance"),
                "change_detection": hist.get("change_detection"),
            },
            "cards": cards,
            "sources": sources,
            "provenance": meta["provenance"],
        }

    if tool_name == "get_post_harvest_intelligence":
        from backend.app.features.post_harvest.service import get_post_harvest_summary
        from backend.app.features.post_harvest.shelf_life import estimate_shelf_life
        from backend.app.features.post_harvest.storage_knowledge import get_crop_storage_profile

        crop = params.get("crop") or (farm["primary_crop"] if farm else "Tomato")
        summary = get_post_harvest_summary(user["user_id"], user["role"], farm["id"] if farm else None)
        profile = get_crop_storage_profile(crop)
        shelf = estimate_shelf_life(crop=crop)

        rec_t = profile["recommended_temp_c"]
        rec_rh = profile["recommended_rh_pct"]
        amb = profile["ambient_shelf_life_days"]
        opt = profile["optimal_shelf_life_days"]

        metrics: Dict[str, Any] = {
            "Crop": profile["crop"],
            "Recommended Temp": f"{rec_t['min']}–{rec_t['max']}°C",
            "Recommended RH": f"{rec_rh['min']:.0f}–{rec_rh['max']:.0f}%",
            "Ambient Shelf Life": f"{amb['min']}–{amb['max']} days",
            "Optimal Storage Life": f"{opt['min']}–{opt['max']} days",
            "Available Inventory": f"{summary['total_available_kg']:,.0f} kg ({summary['lot_count']} lots)",
            "Reserved / Sold": f"{summary['total_reserved_kg']:,.0f} / {summary['total_sold_kg']:,.0f} kg",
        }
        highlights = [
            f"Suitable methods: {', '.join(profile['suitable_storage_methods'][:2])}.",
            f"Packaging: {profile['packaging']}.",
            "Open /post-harvest to run Sell-Now vs Store economic simulation with your target prices.",
        ]
        cards.append(
            StructuredCard(
                card_type="post_harvest",
                title=f"Post-Harvest & Storage Intelligence — {profile['crop']}",
                metrics=metrics,
                highlights=highlights,
            )
        )
        sources.append(SourceReference(title="; ".join(profile["references"]), source="AD-27 Scientific Storage KB", timestamp=now_iso))
        return {
            "authorized": True,
            "data": {
                "crop": profile["crop"],
                "recommended_temp_c": rec_t,
                "recommended_rh_pct": rec_rh,
                "ambient_shelf_life_days": amb,
                "optimal_shelf_life_days": opt,
                "requires_refrigeration": profile["requires_refrigeration"],
                "inventory_summary": summary,
                "shelf_life": shelf,
            },
            "cards": cards,
            "sources": sources,
            "provenance": meta["provenance"],
        }

    if tool_name == "get_equipment_intelligence":
        from backend.app.features.equipment.booking import list_user_bookings
        from backend.app.features.equipment.service import (
            discover_equipment,
            get_equipment_financial_summary,
        )

        lat = float(farm["latitude"]) if farm else 12.5234
        lon = float(farm["longitude"]) if farm else 76.8976
        listings = discover_equipment(latitude=lat, longitude=lon)
        bookings = list_user_bookings(user["user_id"])
        fin_sum = get_equipment_financial_summary(user["user_id"])

        metrics: Dict[str, Any] = {
            "Available Listings": len(listings),
            "My Bookings": len(bookings),
            "Committed Rental": f"₹{fin_sum['committed_cost_inr']:,.0f}",
            "Est. Shared Savings": f"₹{fin_sum['estimated_shared_savings_inr']:,.0f}",
        }
        if listings:
            top = listings[0]
            metrics["Nearest Machinery"] = f"{top['equipment_name']} (₹{top['rental_rate_inr']}/{top['rate_unit']})"
        highlights = [
            "Use /resources to book equipment, view availability calendars, or run Google OR-Tools Shared Tractor Optimization.",
            "Booking requests require explicit owner approval before reserving equipment.",
        ]
        cards.append(
            StructuredCard(
                card_type="equipment",
                title="RaithaMitra Equipment Connect",
                metrics=metrics,
                highlights=highlights,
            )
        )
        sources.append(SourceReference(title="AD-28 SQLite Equipment Registry & OR-Tools Scheduler", source="Equipment Connect", timestamp=now_iso))
        return {
            "authorized": True,
            "data": {
                "available_count": len(listings),
                "top_listings": listings[:3],
                "bookings_count": len(bookings),
                "financial_summary": fin_sum,
            },
            "cards": cards,
            "sources": sources,
            "provenance": meta["provenance"],
        }

    if tool_name == "get_market_intelligence":
        from backend.app.features.market_intelligence.cache import query_market_observations
        from backend.app.features.market_intelligence.normalization import normalize_commodity_name
        from backend.app.features.market_intelligence.service import (
            get_historical_and_forecast,
            get_provider_status,
        )

        crop = normalize_commodity_name(params.get("crop") or (farm["primary_crop"] if farm else "Tomato"))
        status_info = get_provider_status()
        obs = query_market_observations(commodity=crop, limit=10)
        hist_fc = get_historical_and_forecast(commodity=crop, horizon_days=7)
        fc = hist_fc.get("forecast", {})

        metrics: Dict[str, Any] = {
            "Commodity": crop,
            "AGMARKNET API": "Configured" if status_info["official_api_configured"] else "Unconfigured (Manual/CSV/Cache)",
            "Persisted Observations": len(obs),
        }
        if obs:
            top = obs[0]
            metrics["Latest Modal Price"] = f"₹{top['modal_price_per_kg']}/kg (₹{top['modal_price_per_quintal']}/qtl)"
            metrics["Market / Date"] = f"{top['market']} ({top['observation_date']})"
        if fc.get("available"):
            metrics["7-Day Forecast"] = f"₹{fc['forecast'][-1]['predicted_modal_per_kg']}/kg ({fc['selected_method']})"

        highlights = [
            status_info["message"],
            "Open /market-intelligence to compare transportation-adjusted net returns across markets or import historical CSVs.",
        ]
        cards.append(
            StructuredCard(
                card_type="market_intelligence",
                title=f"Market Intelligence — {crop}",
                metrics=metrics,
                highlights=highlights,
            )
        )
        sources.append(SourceReference(title="AD-29 Market Intelligence & AGMARKNET Cache", source="RaithaMitra Market Engine", timestamp=now_iso))
        return {
            "authorized": True,
            "data": {
                "commodity": crop,
                "official_api_configured": status_info["official_api_configured"],
                "latest_observations": obs[:3],
                "forecast_available": fc.get("available", False),
                "forecast": fc,
            },
            "cards": cards,
            "sources": sources,
            "provenance": meta["provenance"],
        }

    if tool_name == "get_farm_decision_summary":
        if not farm:
            return {"authorized": True, "data": {"error": "No farm profile found."}, "cards": cards, "sources": sources, "provenance": meta["provenance"]}
        from backend.app.features.decision_intelligence.schemas import DecisionEvaluateRequest
        from backend.app.features.decision_intelligence.service import evaluate_unified_decisions

        res = await evaluate_unified_decisions(
            user_id=user["user_id"],
            role=user["role"],
            req=DecisionEvaluateRequest(farm_id=farm["id"], persist_run=False),
        )
        top_recs = res["action_plan"]["ranked_recommendations"][:3]
        conflicts = res["conflicts"]

        metrics: Dict[str, Any] = {
            "Farm": farm["farm_name"],
            "Preference Profile": res["action_plan"]["preference_profile"],
            "Evidence Items": len(res["evidence"]),
            "Conflicts Detected": len(conflicts),
        }
        if top_recs:
            metrics["Top Action"] = top_recs[0]["title"]

        highlights = [
            f"{r['title']}: {r['explanation']['why']}" for r in top_recs[:2]
        ]
        if conflicts:
            highlights.append(f"Conflict: {conflicts[0]['title']} — {conflicts[0]['resolution']}")

        cards.append(
            StructuredCard(
                card_type="decision_intelligence",
                title=f"Centralized Decision Summary — {farm['farm_name']}",
                metrics=metrics,
                highlights=highlights[:3],
            )
        )
        sources.append(SourceReference(title="AD-30 Cross-Module Decision Engine", source="RaithaMitra Decision Intelligence", timestamp=now_iso))
        return {
            "authorized": True,
            "data": {
                "summary_text": res["summary_text"],
                "top_recommendations": [r["title"] for r in top_recs],
                "top_why": top_recs[0]["explanation"]["why"] if top_recs else None,
                "conflicts_count": len(conflicts),
            },
            "cards": cards,
            "sources": sources,
            "provenance": meta["provenance"],
        }

    if tool_name == "check_crop_health_adapter":
        status_info = diagnostics_service.check_model_availability()
        crop = params.get("crop") or (farm["primary_crop"] if farm else "your crop")
        cards.append(
            StructuredCard(
                card_type="crop_health",
                title=f"Crop Health & Diagnostics Adapter ({crop})",
                metrics={
                    "Model Available": "Yes" if status_info.get("available") else "Pending AD-22 Model",
                    "Recommendation": "Upload leaf photo on /crop-health or consult local KVK agronomist",
                },
                highlights=[
                    "Never apply unverified chemical mixes without confirming pathogen identity.",
                    "Consult your nearest Krishi Vigyan Kendra (KVK) for severe leaf blight or wilt symptoms.",
                ],
            )
        )
        return {"authorized": True, "data": {"crop": crop, "model_available": bool(status_info.get("available"))}, "cards": cards, "sources": sources, "provenance": meta["provenance"]}

    raise ValueError(f"Unhandled tool: {tool_name}")
