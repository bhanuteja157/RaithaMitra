"""
AD-27: Spoilage Risk Analysis Engine.
Evaluates temperature stress (heat & chilling), humidity mismatch, storage duration,
physical damage, ventilation, and moisture exposure without inventing sensor data.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from backend.app.features.post_harvest.storage_knowledge import get_crop_storage_profile


def analyze_spoilage_risk(
    *,
    crop: str,
    storage_duration_days: int = 5,
    current_temp_c: Optional[float] = None,
    current_rh_pct: Optional[float] = None,
    temperature_source: str = "manual",
    observed_damage_pct: float = 0.0,
    ventilation_adequate: bool = True,
    moisture_exposure: bool = False,
) -> Dict[str, Any]:
    profile = get_crop_storage_profile(crop)
    rec_t_min = float(profile["recommended_temp_c"]["min"])
    rec_t_max = float(profile["recommended_temp_c"]["max"])
    rec_rh_min = float(profile["recommended_rh_pct"]["min"])
    rec_rh_max = float(profile["recommended_rh_pct"]["max"])
    chilling_c = profile.get("chilling_threshold_c")

    score = 10.0
    factors: List[str] = []
    actions: List[str] = []

    # 1. Temperature deviation
    if current_temp_c is not None:
        if chilling_c is not None and current_temp_c < float(chilling_c):
            score += 28.0
            factors.append(
                f"Chilling stress ({current_temp_c:.1f}°C < {chilling_c}°C threshold): {profile['chilling_injury_sensitivity']}."
            )
            actions.append(f"Raise storage temperature into {rec_t_min}–{rec_t_max}°C range to prevent chilling injury.")
        elif current_temp_c > rec_t_max:
            diff = current_temp_c - rec_t_max
            add = min(35.0, diff * 2.2)
            score += add
            factors.append(
                f"Excessive temperature ({current_temp_c:.1f}°C vs recommended {rec_t_min}–{rec_t_max}°C)."
            )
            if profile["requires_refrigeration"]:
                actions.append(f"Move produce to evaporative/cold storage ({rec_t_min}–{rec_t_max}°C) or sell promptly.")
            else:
                actions.append("Improve shade and night-time cross-ventilation to lower stack temperature.")

    # 2. Humidity mismatch
    if current_rh_pct is not None:
        if current_rh_pct > rec_rh_max + 5.0:
            score += 20.0
            factors.append(
                f"High humidity ({current_rh_pct:.0f}% > {rec_rh_max:.0f}%): {profile['moisture_sensitivity']}."
            )
            actions.append("Increase air circulation and remove wet packaging to prevent condensation.")
        elif current_rh_pct < rec_rh_min - 10.0:
            score += 14.0
            factors.append(
                f"Low humidity ({current_rh_pct:.0f}% < {rec_rh_min:.0f}%) accelerates moisture loss and weight shrinkage."
            )
            actions.append("Use perforated liners or damp burlap/ZECC pads where appropriate for fresh produce.")

    # 3. Physical damage
    if observed_damage_pct > 0:
        score += min(25.0, observed_damage_pct * 1.5)
        factors.append(f"Physical or pest damage observed on {observed_damage_pct:.1f}% of lot.")
        actions.append("Sort and remove bruised/cracked units immediately before storage to prevent spread.")

    # 4. Ventilation & direct moisture exposure
    if not ventilation_adequate:
        score += 16.0
        factors.append(f"Inadequate ventilation: {profile['ventilation_requirements']}.")
        actions.append("Restack crates/bags on pallets with air channels and open vents.")

    if moisture_exposure:
        score += 22.0
        factors.append("Direct moisture / rain wetting reported — critical trigger for rot or mycotoxin growth.")
        actions.append("Dry surface moisture immediately; quarantine wetted lot and prioritize early sale or drying.")

    # 5. Duration relative to ambient/optimal shelf life
    amb_max = float(profile["ambient_shelf_life_days"]["max"])
    if storage_duration_days > amb_max and (current_temp_c is None or current_temp_c > rec_t_max + 2.0):
        score += 18.0
        factors.append(
            f"Planned duration ({storage_duration_days} days) exceeds typical ambient shelf life ({amb_max:.0f} days)."
        )
        actions.append("Either secure temperature-controlled storage or evaluate immediate sale via Sell-vs-Store simulator.")

    score = min(100.0, round(score, 1))
    if score >= 75:
        risk_level = "critical"
        loss_range = {"min": 15.0, "max": 35.0}
    elif score >= 50:
        risk_level = "high"
        loss_range = {"min": 8.0, "max": 18.0}
    elif score >= 28:
        risk_level = "moderate"
        loss_range = {"min": 3.0, "max": 8.0}
    else:
        risk_level = "low"
        loss_range = {"min": 0.5, "max": 3.0}

    return {
        "crop": profile["crop"],
        "risk_level": risk_level,
        "risk_score_0_100": score,
        "contributing_factors": factors or ["Storage parameters are within recommended bounds."],
        "recommended_corrective_actions": actions or ["Maintain current storage conditions and inspect on schedule."],
        "estimated_loss_range_pct": loss_range,
        "references": profile["references"],
        "measurement_provenance": {
            "temperature_source": temperature_source,
            "current_temp_c": current_temp_c,
            "current_rh_pct": current_rh_pct,
            "note": "Calculated from farmer-entered measurements or Open-Meteo ambient weather; no IoT sensor readings invented.",
        },
        "disclaimer": (
            "Rule-based post-harvest risk estimate only. Does NOT detect microbial contamination or guarantee food safety."
        ),
    }
