"""
AD-30: Unified Agricultural Context Collector.
Gathers available Farm, Environmental, Scientific, Economic, and Operational
evidence across RaithaMitra modules using cached/local records and bounded async calls,
never crashing when an optional provider is unavailable.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.data.schemes import INDIAN_GOVERNMENT_SCHEMES
from backend.app.db.database import get_db_connection
from backend.app.engines.biophysical import calculate_crop_water_demand, estimate_root_zone_moisture
from backend.app.engines.decision_engine import decision_engine
from backend.app.features.assistant.security import verify_authorized_farm
from backend.app.features.crop_diagnostics.model_registry import check_model_availability as check_ad22_model
from backend.app.features.crop_diagnostics.service import (
    get_surveillance_summary,
    get_user_diagnostic_history,
)
from backend.app.features.decision_intelligence.evidence_registry import make_evidence
from backend.app.features.equipment.booking import list_user_bookings
from backend.app.features.equipment.service import discover_equipment, get_equipment_financial_summary
from backend.app.features.finance.service import compute_financial_summary
from backend.app.features.market_intelligence.cache import query_market_observations
from backend.app.features.post_harvest.inventory import list_inventory_lots
from backend.app.features.post_harvest.service import get_post_harvest_summary, list_harvest_records
from backend.app.features.satellite.service import _read_cached_observations
from backend.app.schemas.farm import Farm
from backend.app.services.diagnostics_service import diagnostics_service
from backend.app.services.weather_service import weather_service

logger = logging.getLogger(__name__)


async def collect_unified_farm_context(
    *,
    user_id: str,
    role: str,
    farm_id: str,
) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    evidence: List[Dict[str, Any]] = []
    unavailable_modules: List[str] = []

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm_row = verify_authorized_farm(cursor, farm_id, user_id, role)
        if not farm_row:
            raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found.")

        farm_model = Farm(
            id=str(farm_row["id"]),
            farmer_name=str(farm_row.get("farmer_name") or "Farmer"),
            preferred_language=farm_row.get("preferred_language") or "en",
            farm_name=str(farm_row.get("farm_name") or "Farm"),
            village=str(farm_row.get("village") or ""),
            district=str(farm_row.get("district") or ""),
            state=str(farm_row.get("state") or "Karnataka"),
            latitude=float(farm_row["latitude"]),
            longitude=float(farm_row["longitude"]),
            land_area_ha=float(farm_row["land_area_ha"]),
            primary_crop=str(farm_row["primary_crop"]),
            crop_variety=farm_row.get("crop_variety"),
            sowing_date=farm_row.get("sowing_date") or now_iso[:10],
            crop_stage=farm_row.get("crop_stage") or "Mid-Season",
            soil_type=str(farm_row.get("soil_type") or "Loamy"),
            irrigation_method=farm_row.get("irrigation_method") or "Drip Irrigation",
            water_source=farm_row.get("water_source") or "Borewell",
            available_water_m3=float(farm_row["available_water_m3"]) if farm_row.get("available_water_m3") is not None else 0.0,
            cultivation_budget_inr=float(farm_row["cultivation_budget_inr"]) if farm_row.get("cultivation_budget_inr") is not None else 0.0,
            created_at=farm_row.get("created_at") or now_iso,
            updated_at=farm_row.get("updated_at") or now_iso,
        )

        # AD-24 Financial Summary
        fin_summary = compute_financial_summary(cursor, user_id, farm_row)

        # Smart Bidding & Labour open counts
        active_listings = [
            dict(r)
            for r in cursor.execute(
                "SELECT id, crop_name, quantity_kg, min_price_per_kg FROM bidding_listings WHERE farmer_id = ? AND status = 'active'",
                (user_id,),
            ).fetchall()
        ]
        open_labour_jobs = [
            dict(r)
            for r in cursor.execute(
                "SELECT id, status FROM labour_jobs WHERE farmer_id = ? AND status IN ('open', 'accepted')",
                (user_id,),
            ).fetchall()
        ]
        available_workers_row = cursor.execute(
            "SELECT COUNT(*) AS cnt FROM labour_profiles WHERE availability_status = 'available'"
        ).fetchone()
        available_workers_count = int(available_workers_row["cnt"] if available_workers_row else 0)
        available_vehicles_row = cursor.execute(
            "SELECT COUNT(*) AS cnt FROM transport_vehicles WHERE availability_status = 'available'"
        ).fetchone()
        available_vehicles_count = int(available_vehicles_row["cnt"] if available_vehicles_row else 0)
    finally:
        conn.close()

    # 1. Weather + FAO-56 + Core DecisionEngine
    weather = None
    core_decision = None
    water_demand_mm = None
    rain_48h_mm = 0.0
    wind_kmh = 0.0
    temp_c = None
    soil_moisture_est = None

    try:
        weather = await weather_service.get_weather(farm_model.latitude, farm_model.longitude)
        et0 = float(weather.current.et0_fao56_mm)
        rain_now = float(weather.current.precipitation_mm)
        wind_kmh = float(weather.current.wind_speed_kmh)
        temp_c = float(weather.current.temperature_c)
        rain_48h_mm = sum(float(d.precipitation_sum_mm) for d in weather.daily_forecast[:2]) if weather.daily_forecast else 0.0
        water_demand_mm = round(calculate_crop_water_demand(farm_model.primary_crop, farm_model.crop_stage, et0), 2)
        soil_moisture_est = round(estimate_root_zone_moisture(farm_model.soil_type, rain_now, water_demand_mm), 1)
        core_decision = decision_engine.evaluate_farm(farm_model, weather)

        evidence.append(make_evidence(
            farm_id=farm_id,
            source_module="weather",
            source_provider="Open-Meteo",
            observed_value={"temperature_c": temp_c, "rain_48h_mm": round(rain_48h_mm, 1), "wind_kmh": wind_kmh, "et0_mm_day": et0},
            unit="°C / mm / km/h",
            classification="official_observation",
            data_quality="live",
            freshness="current",
            observation_timestamp=now_iso,
            applicable_crop=farm_model.primary_crop,
            applicable_growth_stage=farm_model.crop_stage,
            limitations="48h precipitation is a meteorological forecast, not a certainty.",
        ))
        evidence.append(make_evidence(
            farm_id=farm_id,
            source_module="irrigation",
            source_provider="FAO-56 Biophysical Engine",
            observed_value={"crop_water_demand_mm_day": water_demand_mm, "estimated_soil_moisture_pct": soil_moisture_est},
            unit="mm/day / %",
            classification="scientifically_calculated",
            data_quality="modeled",
            freshness="current",
            applicable_crop=farm_model.primary_crop,
            applicable_growth_stage=farm_model.crop_stage,
            assumptions=["Soil moisture is estimated from soil texture, recent precipitation, and ET0 rather than in-situ soil probes."],
        ))
    except Exception as exc:
        logger.warning("Weather context unavailable for %s: %s", farm_id, exc)
        unavailable_modules.append("weather_open_meteo")
        evidence.append(make_evidence(
            farm_id=farm_id,
            source_module="weather",
            source_provider="Open-Meteo",
            observed_value="Unavailable",
            unit=None,
            classification="unavailable",
            data_quality="unavailable",
            freshness="unavailable",
            limitations=str(exc),
        ))

    # 2. Financial Intelligence (AD-24)
    evidence.append(make_evidence(
        farm_id=farm_id,
        source_module="finance",
        source_provider="AD-24 SQLite Financial Ledger",
        observed_value={
            "allocated_budget_inr": fin_summary["allocated_budget_inr"],
            "actual_recorded_expenses_inr": fin_summary["actual_recorded_expenses_inr"],
            "committed_expenses_inr": fin_summary["committed_expenses_inr"],
            "remaining_budget_inr": fin_summary["remaining_budget_inr"],
            "outstanding_payments_inr": fin_summary["outstanding_payments_inr"],
        },
        unit="INR",
        classification="user_entered",
        data_quality="verified_ledger",
        freshness="current",
        applicable_crop=farm_model.primary_crop,
    ))

    # 3. Satellite Intelligence (AD-25 Cached Real Observations Only)
    sat_cached = _read_cached_observations(farm_id=farm_id, limit=3)
    latest_sat_with_ndvi = next((s for s in sat_cached if s.get("ndvi") is not None), None)
    if latest_sat_with_ndvi:
        evidence.append(make_evidence(
            farm_id=farm_id,
            source_module="satellite",
            source_provider=latest_sat_with_ndvi.get("provider", "Sentinel-2"),
            observed_value={"ndvi": latest_sat_with_ndvi["ndvi"], "ndmi": latest_sat_with_ndvi.get("ndmi")},
            unit="index (-1 to +1)",
            classification="cached_observation",
            data_quality="cached",
            freshness=latest_sat_with_ndvi["acquisition_date"][:10],
            observation_timestamp=latest_sat_with_ndvi["acquisition_date"],
            applicable_crop=farm_model.primary_crop,
            limitations="Optical satellite indices indicate canopy vigor/moisture, not specific pathogens.",
        ))
    else:
        unavailable_modules.append("satellite_spectral_indices")
        evidence.append(make_evidence(
            farm_id=farm_id,
            source_module="satellite",
            source_provider="AD-25 Satellite Cache",
            observed_value="No cached NDVI/NDMI pixel statistics available",
            unit=None,
            classification="unavailable",
            data_quality="unavailable",
            freshness="unavailable",
            limitations="Sentinel Hub credentials or manual band inputs needed for spectral indices.",
        ))

    # 4. Post-Harvest Inventory & Harvests (AD-27)
    ph_summary = get_post_harvest_summary(user_id, role, farm_id)
    ph_lots = list_inventory_lots(user_id, role, farm_id)
    harvests = list_harvest_records(user_id, role, farm_id)
    evidence.append(make_evidence(
        farm_id=farm_id,
        source_module="post_harvest",
        source_provider="AD-27 SQLite Inventory",
        observed_value={
            "total_available_kg": ph_summary["total_available_kg"],
            "lot_count": ph_summary["lot_count"],
            "harvest_records": len(harvests),
        },
        unit="kg",
        classification="user_entered",
        data_quality="verified_ledger",
        freshness="current",
        applicable_crop=farm_model.primary_crop,
    ))

    # 5. Equipment Connect (AD-28)
    eq_listings = discover_equipment(latitude=farm_model.latitude, longitude=farm_model.longitude)
    eq_bookings = list_user_bookings(user_id)
    eq_fin = get_equipment_financial_summary(user_id)
    evidence.append(make_evidence(
        farm_id=farm_id,
        source_module="equipment",
        source_provider="AD-28 Equipment Connect",
        observed_value={"nearby_listings": len(eq_listings), "user_bookings": len(eq_bookings)},
        unit="count",
        classification="user_entered",
        data_quality="live_registry",
        freshness="current",
    ))

    # 6. Market Intelligence (AD-29)
    mkt_obs = query_market_observations(commodity=farm_model.primary_crop, limit=5)
    if mkt_obs:
        top_m = mkt_obs[0]
        evidence.append(make_evidence(
            farm_id=farm_id,
            source_module="market_intelligence",
            source_provider=top_m["source_name"],
            observed_value={"market": top_m["market"], "modal_price_per_kg": top_m["modal_price_per_kg"]},
            unit="INR/kg",
            classification="official_observation" if top_m["source_type"] == "official_agmarknet" else "cached_observation",
            data_quality=top_m["source_type"],
            freshness=top_m["observation_date"],
            observation_timestamp=top_m["observation_date"],
            applicable_crop=farm_model.primary_crop,
        ))
    else:
        unavailable_modules.append("market_agmarknet_live")
        evidence.append(make_evidence(
            farm_id=farm_id,
            source_module="market_intelligence",
            source_provider="AD-29 Market Cache",
            observed_value="No persisted market observations for crop",
            unit=None,
            classification="unavailable",
            data_quality="unavailable",
            freshness="unavailable",
            limitations="DATA_GOV_IN_API_KEY not configured and no CSV/manual price entered for this crop.",
        ))

    # 7. Crop Doctor (AD-22) & Community Disease Surveillance
    ad22_status = check_ad22_model()
    ad22_available = bool(ad22_status.get("model_available"))
    diag_history = get_user_diagnostic_history(user_id, limit=5)
    farm_diags = [d for d in diag_history if d.get("farm_id") in (farm_id, None)]
    latest_diag = farm_diags[0] if farm_diags else None

    if latest_diag:
        evidence.append(make_evidence(
            farm_id=farm_id,
            source_module="crop_doctor",
            source_provider=f"AD-22 {ad22_status.get('model_name', 'ONNX Plant Disease Classifier')}",
            observed_value={
                "diagnosis_status": latest_diag.get("diagnosis_status"),
                "predicted_disease": latest_diag.get("predicted_disease"),
                "confidence": latest_diag.get("confidence"),
            },
            unit="classification",
            classification="model_prediction",
            data_quality="verified_scan",
            freshness=(latest_diag.get("created_at") or "")[:10] or "current",
            observation_timestamp=latest_diag.get("created_at"),
            applicable_crop=latest_diag.get("predicted_crop") or farm_model.primary_crop,
            limitations="Visual leaf classification does not replace laboratory pathology confirmation.",
        ))
    elif not ad22_available:
        unavailable_modules.append("crop_doctor_ad22")
        evidence.append(make_evidence(
            farm_id=farm_id,
            source_module="crop_doctor",
            source_provider="AD-22 ONNX Classifier",
            observed_value="Crop Doctor model unavailable and no diagnostic scans recorded",
            unit=None,
            classification="unavailable",
            data_quality="unavailable",
            freshness="unavailable",
        ))

    surveillance_reports = get_surveillance_summary()
    if surveillance_reports:
        evidence.append(make_evidence(
            farm_id=farm_id,
            source_module="disease_surveillance",
            source_provider="AD-22 Community Disease Reports",
            observed_value={"active_reports_count": len(surveillance_reports)},
            unit="reports",
            classification="user_entered",
            data_quality="community_unverified",
            freshness="current",
            limitations="Community reports are farmer-submitted and require local verification.",
        ))
    else:
        unavailable_modules.append("disease_surveillance_ad26")

    return {
        "farm": farm_model,
        "farm_row": farm_row,
        "weather": {
            "available": weather is not None,
            "temperature_c": temp_c,
            "rain_48h_mm": round(rain_48h_mm, 1),
            "wind_kmh": round(wind_kmh, 1),
            "water_demand_mm_day": water_demand_mm,
            "estimated_soil_moisture_pct": soil_moisture_est,
        },
        "core_decision": core_decision,
        "finance": fin_summary,
        "satellite": latest_sat_with_ndvi,
        "post_harvest": {"summary": ph_summary, "lots": ph_lots, "harvests": harvests},
        "equipment": {"listings": eq_listings, "bookings": eq_bookings, "financial": eq_fin},
        "market": {"observations": mkt_obs},
        "bidding": {"active_listings": active_listings},
        "labour": {"open_jobs": open_labour_jobs, "available_workers_count": available_workers_count},
        "transport": {"available_vehicles_count": available_vehicles_count},
        "crop_doctor": {"model_available": ad22_available, "latest_diagnosis": latest_diag, "recent_count": len(farm_diags)},
        "adapters": {
            "crop_doctor_ad22_available": ad22_available,
            "disease_surveillance_ad26_available": len(surveillance_reports) > 0,
        },
        "schemes": [{"name": s.name, "benefit": s.financial_benefit, "portal": s.application_portal} for s in INDIAN_GOVERNMENT_SCHEMES[:3]],
        "evidence": evidence,
        "unavailable_modules": unavailable_modules,
    }
