"""
Predictive Crop Disease Risk Engine for AD-40C.

Computes transparent, scientifically grounded heuristic risk assessments considering:
- Nearby observation Haversine distances & independent farm count
- Temporal recency exponential decay
- Crop susceptibility & growth stage vulnerability
- Disease-specific transmission mode (airborne spores vs insect vector vs soil/water vs rain splash)
- Agrometeorological weather compatibility (temperature, humidity, rainfall, and directional wind ONLY when wind-relevant)
- Explicit handling for missing weather telemetry & insufficient evidence
"""
import math
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.features.disease_surveillance.disease_knowledge import resolve_disease_profile
from backend.app.features.disease_surveillance.geospatial import (
    downwind_alignment_factor,
    haversine_km,
)

VERIFICATION_WEIGHTS = {
    "expert_confirmed": 1.0,
    "ai_suspected": 0.78,
    "farmer_reported": 0.65,
    "dismissed": 0.0,
}


def _parse_date(date_str: str) -> date:
    try:
        return date.fromisoformat(str(date_str)[:10])
    except Exception:
        return datetime.now(timezone.utc).date()


def _evaluate_weather_suitability(
    profile: Dict[str, Any],
    weather: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    if not weather:
        return {
            "weather_available": False,
            "weather_score": None,
            "temperature_c": None,
            "humidity_pct": None,
            "rainfall_mm": None,
            "wind_speed_kmh": None,
            "wind_direction_deg": None,
            "weather_note": "Weather telemetry unavailable; estimate relies strictly on spatial & crop observations.",
        }

    temp = weather.get("temperature_c")
    hum = weather.get("relative_humidity_pct")
    rain = weather.get("precipitation_mm", 0.0) or 0.0
    wind_speed = weather.get("wind_speed_kmh", 0.0) or 0.0
    wind_dir = weather.get("wind_direction_deg", 0) or 0

    if temp is None or hum is None:
        return {
            "weather_available": False,
            "weather_score": None,
            "temperature_c": temp,
            "humidity_pct": hum,
            "rainfall_mm": rain,
            "wind_speed_kmh": wind_speed,
            "wind_direction_deg": wind_dir,
            "weather_note": "Incomplete weather measurements; temperature/humidity missing.",
        }

    t_min = float(profile.get("favorable_temp_min_c", 20.0))
    t_max = float(profile.get("favorable_temp_max_c", 32.0))
    h_min = float(profile.get("favorable_humidity_min_pct", 75.0))
    rain_trig = float(profile.get("rain_trigger_mm", 3.0))

    if t_min <= temp <= t_max:
        temp_score = 1.0
    else:
        dist_t = min(abs(temp - t_min), abs(temp - t_max))
        temp_score = max(0.15, 1.0 - dist_t / 12.0)

    if hum >= h_min:
        hum_score = 1.0
    else:
        hum_score = max(0.15, 1.0 - (h_min - hum) / 45.0)

    rain_score = 1.0 if (rain_trig <= 0 or rain >= rain_trig) else 0.45 + 0.55 * (rain / max(0.5, rain_trig))

    mode = profile.get("transmission_mode", "unknown")
    if mode in ("airborne_spores", "rain_splash"):
        weather_score = 0.35 * temp_score + 0.45 * hum_score + 0.20 * rain_score
    elif mode == "insect_vector":
        # Dry warm days favor whitefly/thrips vector flight; heavy rain suppresses vector flight
        rain_suppress = 0.45 if rain > 8.0 else 1.0
        weather_score = (0.65 * temp_score + 0.35 * (1.0 - max(0.0, hum - 85) / 40.0)) * rain_suppress
    elif mode == "soil_water_borne":
        weather_score = 0.40 * temp_score + 0.30 * hum_score + 0.30 * rain_score
    else:
        weather_score = 0.45 * temp_score + 0.40 * hum_score + 0.15 * rain_score

    weather_score = round(max(0.05, min(1.0, weather_score)), 3)
    return {
        "weather_available": True,
        "weather_score": weather_score,
        "temperature_c": round(float(temp), 1),
        "humidity_pct": int(hum),
        "rainfall_mm": round(float(rain), 1),
        "wind_speed_kmh": round(float(wind_speed), 1),
        "wind_direction_deg": int(wind_dir),
        "weather_note": (
            f"Temp {round(float(temp), 1)}°C, RH {int(hum)}%, Rain {round(float(rain), 1)} mm "
            f"(suitability {round(weather_score * 100)}% for {mode.replace('_', ' ')})."
        ),
    }


def assess_farm_disease_risk(
    target_lat: float,
    target_lon: float,
    target_crop: str,
    crop_stage: str,
    reports: List[Dict[str, Any]],
    weather: Optional[Dict[str, Any]] = None,
    monitoring_radius_km: float = 25.0,
    focus_disease: Optional[str] = None,
    reference_date: Optional[date] = None,
) -> Dict[str, Any]:
    """
    Produces an explainable predictive risk assessment for a farm parcel.
    Returns 'Insufficient evidence' when no active relevant observations exist within radius.
    """
    today = reference_date or datetime.now(timezone.utc).date()
    crop_low = (target_crop or "").strip().lower()

    active_nearby: List[Dict[str, Any]] = []
    for r in reports:
        if r.get("verification_status") == "dismissed":
            continue
        dist = haversine_km(target_lat, target_lon, float(r["latitude"]), float(r["longitude"]))
        if dist > monitoring_radius_km:
            continue
        r_crop = (r.get("crop") or "").strip().lower()
        if crop_low and r_crop and r_crop != crop_low:
            # Check cross-host solanaceous link (Late/Early blight between Tomato & Potato)
            shared_solanaceae = (
                {crop_low, r_crop} == {"tomato", "potato"}
                and "blight" in (r.get("disease_name") or "").lower()
            )
            if not shared_solanaceae:
                continue
        if focus_disease and focus_disease.strip().lower() not in (r.get("disease_name") or "").lower():
            continue
        active_nearby.append({**r, "_distance_km": dist})

    if not active_nearby:
        weather_eval = _evaluate_weather_suitability(resolve_disease_profile(target_crop, focus_disease)[0], weather)
        return {
            "crop": target_crop,
            "crop_stage": crop_stage,
            "monitoring_radius_km": monitoring_radius_km,
            "risk_level": "Insufficient evidence",
            "heuristic_risk_index": None,
            "primary_threat_disease": focus_disease or None,
            "transmission_mode": "unknown",
            "wind_dispersal_considered": False,
            "nearby_report_count": 0,
            "independent_farms_count": 0,
            "nearest_distance_km": None,
            "most_recent_days": None,
            "weather_summary": weather_eval,
            "disease_breakdown": [],
            "contributing_factors": [
                f"No disease reports affecting {target_crop} found within {monitoring_radius_km} km.",
                weather_eval["weather_note"],
            ],
            "limitations": [
                "Insufficient local surveillance reports to estimate infection risk reliably.",
                "Continue routine weekly scouting and inspect lower foliage & leaf undersides.",
            ],
            "disclaimer": (
                "Heuristic agri-meteorological risk indicator — NOT a scientifically validated probability of infection. "
                "Always verify symptoms with your local Krishi Vigyan Kendra (KVK)."
            ),
        }

    # Group nearby observations by disease profile
    by_disease: Dict[str, List[Dict[str, Any]]] = {}
    for item in active_nearby:
        d_key = item["disease_name"]
        by_disease.setdefault(d_key, []).append(item)

    weather_eval_global = _evaluate_weather_suitability(
        resolve_disease_profile(target_crop, next(iter(by_disease.keys())))[0],
        weather,
    )

    breakdown: List[Dict[str, Any]] = []
    for d_name, items in by_disease.items():
        profile, is_known = resolve_disease_profile(target_crop, d_name)
        w_eval = _evaluate_weather_suitability(profile, weather)
        max_km = float(profile.get("max_effective_spread_km", 15.0))
        half_life = float(profile.get("incubation_half_life_days", 10.0))
        wind_relevant = bool(profile.get("wind_dispersal_relevant", False))
        stage_mult = float(profile.get("stage_weights", {}).get(crop_stage, 1.0))

        # Deduplicate spatial pressure per independent farm (keep strongest signal per farm_id)
        farm_best_signal: Dict[str, float] = {}
        min_dist = min(i["_distance_km"] for i in items)
        min_age = min(max(0, (today - _parse_date(i["observation_date"])).days) for i in items)
        downwind_exposure_max = 0.0

        for it in items:
            dist = it["_distance_km"]
            age_days = max(0, (today - _parse_date(it["observation_date"])).days)
            v_status = it.get("verification_status", "farmer_reported")
            base_conf = VERIFICATION_WEIGHTS.get(v_status, 0.6)
            if v_status == "ai_suspected" and it.get("diagnostic_confidence") is not None:
                base_conf = max(0.35, min(0.92, float(it["diagnostic_confidence"]) * 0.9))

            dist_decay = math.exp(-dist / max(2.0, max_km * 0.45))
            time_decay = 0.5 ** (age_days / max(2.0, half_life))

            wind_factor = 1.0
            if wind_relevant and w_eval["weather_available"]:
                align = downwind_alignment_factor(
                    float(it["latitude"]),
                    float(it["longitude"]),
                    target_lat,
                    target_lon,
                    w_eval["wind_direction_deg"],
                    w_eval["wind_speed_kmh"],
                )
                downwind_exposure_max = max(downwind_exposure_max, align)
                wind_factor = 0.68 + 0.45 * align

            # Soil/water-borne diseases require very close proximity or connected watershed
            if profile.get("transmission_mode") == "soil_water_borne" and dist > max_km:
                dist_decay *= 0.2

            signal = base_conf * dist_decay * time_decay * wind_factor
            f_key = it.get("farm_id") or it["id"]
            farm_best_signal[f_key] = max(farm_best_signal.get(f_key, 0.0), signal)

        indep_farms = len(farm_best_signal)
        cluster_signal = 1.0 - math.prod(1.0 - min(0.95, s) for s in farm_best_signal.values())
        w_score = w_eval["weather_score"] if w_eval["weather_available"] else 0.52

        raw_index = (0.64 * cluster_signal + 0.36 * w_score * min(1.0, cluster_signal * 1.35)) * stage_mult
        heuristic_idx = round(max(0.0, min(100.0, raw_index * 100.0)), 1)

        if indep_farms == 0:
            d_level = "Insufficient evidence"
        elif heuristic_idx >= 75 and indep_farms >= 2:
            d_level = "Critical"
        elif heuristic_idx >= 52:
            d_level = "High"
        elif heuristic_idx >= 26:
            d_level = "Moderate"
        else:
            d_level = "Low"

        breakdown.append(
            {
                "disease_name": d_name,
                "matched_profile": profile["disease_name"],
                "known_profile": is_known,
                "transmission_mode": profile.get("transmission_mode", "unknown"),
                "wind_dispersal_considered": wind_relevant and w_eval["weather_available"],
                "downwind_alignment_score": round(downwind_exposure_max, 2) if wind_relevant else None,
                "heuristic_risk_index": heuristic_idx,
                "risk_level": d_level,
                "report_count": len(items),
                "independent_farms_count": indep_farms,
                "nearest_distance_km": round(min_dist, 2),
                "most_recent_days": min_age,
                "weather_suitability_score": w_eval["weather_score"],
                "stage_multiplier": stage_mult,
                "preventive_actions": profile["preventive_actions"],
                "scientific_references": profile["scientific_references"],
            }
        )

    breakdown.sort(key=lambda b: b["heuristic_risk_index"], reverse=True)
    top = breakdown[0]

    all_indep = len({i.get("farm_id") or i["id"] for i in active_nearby})
    nearest_km = min(i["_distance_km"] for i in active_nearby)
    newest_days = min(max(0, (today - _parse_date(i["observation_date"])).days) for i in active_nearby)

    factors = [
        f"{len(active_nearby)} report(s) from {all_indep} independent farm(s) within {monitoring_radius_km} km (nearest {round(nearest_km, 1)} km, {newest_days}d ago).",
        f"Primary threat '{top['disease_name']}' transmits primarily via {top['transmission_mode'].replace('_', ' ')}.",
        f"Crop stage '{crop_stage}' susceptibility multiplier: {top['stage_multiplier']}x.",
        weather_eval_global["weather_note"],
    ]
    if top["wind_dispersal_considered"] and top["downwind_alignment_score"] is not None:
        factors.append(
            f"Wind alignment exposure score: {round(top['downwind_alignment_score'] * 100)}% based on local wind vector."
        )
    elif top["transmission_mode"] in ("soil_water_borne", "insect_vector"):
        factors.append(
            "Wind-borne spore drift was NOT used as a primary vector because this pathogen spreads mainly via soil/water or insect vectors."
        )

    limitations = [
        "Regional risk score depends on voluntary farmer reports and diagnostic submissions; absence of reports does not guarantee disease freedom.",
    ]
    if not weather_eval_global["weather_available"]:
        limitations.append("Live meteorological measurements were unavailable; humidity/temperature weighting used neutral fallback weight.")
    if not top["known_profile"]:
        limitations.append("Reported condition did not match a calibrated crop-disease profile; conservative generic spread parameters applied.")

    return {
        "crop": target_crop,
        "crop_stage": crop_stage,
        "monitoring_radius_km": monitoring_radius_km,
        "risk_level": top["risk_level"],
        "heuristic_risk_index": top["heuristic_risk_index"],
        "primary_threat_disease": top["disease_name"],
        "transmission_mode": top["transmission_mode"],
        "wind_dispersal_considered": top["wind_dispersal_considered"],
        "nearby_report_count": len(active_nearby),
        "independent_farms_count": all_indep,
        "nearest_distance_km": round(nearest_km, 2),
        "most_recent_days": newest_days,
        "weather_summary": weather_eval_global,
        "disease_breakdown": breakdown,
        "contributing_factors": factors,
        "limitations": limitations,
        "disclaimer": (
            "Heuristic agri-meteorological risk score — NOT a scientifically validated infection probability. "
            "Confirm field symptoms via Krishi Vigyan Kendra (KVK) before applying targeted plant protection."
        ),
    }
