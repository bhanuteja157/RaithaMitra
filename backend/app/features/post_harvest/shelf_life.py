"""
AD-27: Transparent Rule-Based Intelligent Shelf-Life Estimation Engine.
Computes crop-specific remaining shelf-life ranges from ICAR/NHB/USDA baselines
with temperature, humidity, maturity, packaging, and damage adjustments.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.features.post_harvest.storage_knowledge import get_crop_storage_profile


def _days_since_harvest(harvest_date_str: Optional[str]) -> int:
    if not harvest_date_str:
        return 0
    try:
        hd = date.fromisoformat(harvest_date_str[:10])
        today = datetime.now(timezone.utc).date()
        return max(0, (today - hd).days)
    except Exception:
        return 0


def estimate_shelf_life(
    *,
    crop: str,
    variety: Optional[str] = None,
    harvest_maturity: str = "Optimal",
    harvest_date: Optional[str] = None,
    current_temp_c: Optional[float] = None,
    current_rh_pct: Optional[float] = None,
    storage_method: str = "Ambient Ventilated",
    packaging: str = "Ventilated Plastic Crates",
    initial_quality: str = "Grade A",
    observed_damage_pct: float = 0.0,
) -> Dict[str, Any]:
    profile = get_crop_storage_profile(crop)
    opt_min = float(profile["optimal_shelf_life_days"]["min"])
    opt_max = float(profile["optimal_shelf_life_days"]["max"])
    amb_min = float(profile["ambient_shelf_life_days"]["min"])
    amb_max = float(profile["ambient_shelf_life_days"]["max"])

    rec_t_min = float(profile["recommended_temp_c"]["min"])
    rec_t_max = float(profile["recommended_temp_c"]["max"])
    rec_rh_min = float(profile["recommended_rh_pct"]["min"])
    rec_rh_max = float(profile["recommended_rh_pct"]["max"])

    is_cold = any(w in (storage_method or "").lower() for w in ("cold", "cool", "zecc", "chiller", "refrigerat"))
    base_min, base_max = (opt_min, opt_max) if (is_cold or not profile["requires_refrigeration"]) else (amb_min, amb_max)

    multiplier = 1.0
    risks: List[str] = []

    # Temperature factor
    if current_temp_c is not None:
        chilling_thresh = profile.get("chilling_threshold_c")
        if chilling_thresh is not None and current_temp_c < float(chilling_thresh):
            multiplier *= 0.60
            risks.append(
                f"Chilling injury risk: {current_temp_c:.1f}°C is below {crop} chilling threshold ({chilling_thresh}°C)."
            )
        elif current_temp_c > rec_t_max:
            excess = current_temp_c - rec_t_max
            # Q10 biological respiration heuristic: ~15-20% shelf-life reduction per 5°C above optimal
            temp_factor = max(0.25, 1.0 - (excess / 5.0) * 0.18)
            multiplier *= temp_factor
            risks.append(
                f"Elevated temperature ({current_temp_c:.1f}°C vs optimal {rec_t_min}–{rec_t_max}°C) accelerates respiration and senescence."
            )

    # Humidity factor
    if current_rh_pct is not None:
        if current_rh_pct < rec_rh_min - 10.0:
            multiplier *= 0.80
            risks.append(
                f"Low relative humidity ({current_rh_pct:.0f}% vs {rec_rh_min:.0f}–{rec_rh_max:.0f}%) increases moisture loss and shriveling."
            )
        elif current_rh_pct > rec_rh_max + 5.0:
            multiplier *= 0.72
            risks.append(
                f"Excess humidity ({current_rh_pct:.0f}% vs {rec_rh_min:.0f}–{rec_rh_max:.0f}%) elevates condensation and fungal rot risk."
            )

    # Maturity adjustment
    mat = (harvest_maturity or "Optimal").lower()
    if "over" in mat or "full" in mat:
        multiplier *= 0.65
        risks.append("Over-ripe / full-maturity harvest reduces remaining post-harvest storage window.")
    elif "immature" in mat:
        multiplier *= 0.85
        risks.append("Immature harvest may shrivel or fail to ripen uniformly.")

    # Quality & physical damage adjustment
    qual = (initial_quality or "Grade A").lower()
    if "c" in qual or "poor" in qual:
        multiplier *= 0.70
    elif "b" in qual:
        multiplier *= 0.88

    if observed_damage_pct > 0:
        dmg_factor = max(0.35, 1.0 - (observed_damage_pct / 100.0) * 1.4)
        multiplier *= dmg_factor
        risks.append(
            f"Observed mechanical/pest damage ({observed_damage_pct:.1f}%) accelerates ethylene production and decay entry."
        )

    # Packaging adjustment
    pkg = (packaging or "").lower()
    if any(w in pkg for w in ("sack", "gunny", "bulk")) and profile["category"] in ("Fresh Vegetable", "Tropical Fruit", "Table Fruit", "Leafy / Head Vegetable"):
        multiplier *= 0.78
        risks.append("Non-rigid bulk sacks increase bruising and heat buildup compared to shallow ventilated crates.")

    elapsed_days = _days_since_harvest(harvest_date)
    est_total_min = max(1, int(round(base_min * multiplier)))
    est_total_max = max(est_total_min + 1, int(round(base_max * multiplier)))

    rem_min = max(0, est_total_min - elapsed_days)
    rem_max = max(rem_min, est_total_max - elapsed_days)

    # Inspection interval
    if rem_max <= 7:
        inspection_hours = 12
    elif rem_max <= 21:
        inspection_hours = 24
    elif rem_max <= 90:
        inspection_hours = 72
    else:
        inspection_hours = 168

    return {
        "crop": profile["crop"],
        "variety": variety,
        "is_rule_based_estimate": True,
        "elapsed_days_since_harvest": elapsed_days,
        "estimated_remaining_shelf_life_days": {"min": rem_min, "max": rem_max},
        "recommended_storage_conditions": {
            "temperature_c": profile["recommended_temp_c"],
            "relative_humidity_pct": profile["recommended_rh_pct"],
            "suitable_methods": profile["suitable_storage_methods"],
            "packaging": profile["packaging"],
            "requires_refrigeration": profile["requires_refrigeration"],
        },
        "potential_storage_risks": risks or ["No acute deviations flagged; continue routine visual inspection."],
        "recommended_inspection_interval_hours": inspection_hours,
        "scientific_assumptions": [
            f"Baseline shelf-life range derived from {', '.join(profile['references'])}.",
            "Transparent rule-based Q10/humidity/damage multipliers applied; NOT a calibrated lab pathogen assay.",
            "Manual or ambient weather inputs are treated as representative of the lot environment.",
        ],
        "data_limitations": [
            "Actual storability depends on cultivar genetics, pre-harvest field disease pressure, and sanitation.",
            "Does not guarantee food safety or absence of latent microbial decay.",
        ],
    }
