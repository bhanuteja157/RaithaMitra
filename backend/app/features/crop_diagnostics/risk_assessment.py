# backend/app/features/crop_diagnostics/risk_assessment.py
"""
Weather-Aware Disease Risk Intelligence.
Clearly distinguishes environmental risk rules from image-based classification and lab confirmation.
"""
from typing import Any, Dict, Optional


DISEASE_WEATHER_RULES = {
    "Late Blight": {"temp_min": 10, "temp_max": 24, "rh_min": 80, "note": "Cool, humid weather strongly favors Phytophthora infestans."},
    "Early Blight": {"temp_min": 22, "temp_max": 31, "rh_min": 70, "note": "Warm, humid conditions favor Alternaria solani."},
    "Leaf Mold": {"temp_min": 18, "temp_max": 26, "rh_min": 85, "note": "High humidity (>85%) with moderate warmth favors Leaf Mold."},
    "Bacterial Spot": {"temp_min": 23, "temp_max": 32, "rh_min": 75, "note": "Warm, wet weather and rain splash favor Xanthomonas spread."},
    "Septoria Leaf Spot": {"temp_min": 19, "temp_max": 27, "rh_min": 75, "note": "Warm, wet foliage favors Septoria spore splash."},
    "Spider Mite": {"temp_min": 27, "temp_max": 42, "rh_max": 55, "note": "Hot, dry conditions accelerate spider mite reproduction."},
    "Powdery Mildew": {"temp_min": 20, "temp_max": 30, "rh_min": 50, "note": "Moderate warmth and dry leaf surfaces with high night humidity favor powdery mildew."},
    "Common Rust": {"temp_min": 15, "temp_max": 24, "rh_min": 80, "note": "Cool-to-moderate temperatures with heavy dew favor rust pustules."},
}


def assess_weather_disease_risk(
    disease_name: str,
    temperature_c: Optional[float] = None,
    humidity_pct: Optional[float] = None,
    rainfall_mm: Optional[float] = None,
) -> Dict[str, Any]:
    if temperature_c is None and humidity_pct is None and rainfall_mm is None:
        return {
            "available": False,
            "risk_level": "unknown",
            "summary": "Live weather measurements were not provided for this scan; weather risk cannot be evaluated.",
            "disclaimer": "Weather risk reflects environmental favorability only and is never proof of active infection.",
        }

    matched_rule = None
    d_lower = (disease_name or "").lower()
    for key, rule in DISEASE_WEATHER_RULES.items():
        if key.lower() in d_lower:
            matched_rule = rule
            break

    if not matched_rule:
        return {
            "available": True,
            "temperature_c": temperature_c,
            "humidity_pct": humidity_pct,
            "rainfall_mm": rainfall_mm,
            "risk_level": "moderate" if (humidity_pct or 0) >= 75 or (rainfall_mm or 0) > 2 else "low",
            "summary": f"Observed weather: {temperature_c if temperature_c is not None else 'N/A'}°C, {humidity_pct if humidity_pct is not None else 'N/A'}% RH, {rainfall_mm if rainfall_mm is not None else 'N/A'} mm rain.",
            "disclaimer": "Weather risk reflects environmental favorability only and is never proof of active infection.",
        }

    favors = True
    reasons = []
    if temperature_c is not None:
        if matched_rule["temp_min"] <= temperature_c <= matched_rule["temp_max"]:
            reasons.append(f"temperature ({temperature_c}°C) is within the favorable range")
        else:
            favors = False
            reasons.append(f"temperature ({temperature_c}°C) is outside peak favorable range")

    if humidity_pct is not None:
        if "rh_min" in matched_rule:
            if humidity_pct >= matched_rule["rh_min"]:
                reasons.append(f"humidity ({humidity_pct}%) is high enough to favor spore germination")
            else:
                favors = False
        if "rh_max" in matched_rule:
            if humidity_pct <= matched_rule["rh_max"]:
                reasons.append(f"low humidity ({humidity_pct}%) favors dry-weather pest buildup")
            else:
                favors = False

    if rainfall_mm is not None and rainfall_mm > 2.0 and "rh_min" in matched_rule:
        reasons.append(f"recent rainfall ({rainfall_mm} mm) increases leaf wetness and splash dispersal")

    risk_level = "high" if favors and len(reasons) >= 2 else ("moderate" if favors else "low")
    return {
        "available": True,
        "temperature_c": temperature_c,
        "humidity_pct": humidity_pct,
        "rainfall_mm": rainfall_mm,
        "risk_level": risk_level,
        "favorable_for_disease": favors,
        "summary": matched_rule["note"] + (" (" + "; ".join(reasons) + ")." if reasons else ""),
        "disclaimer": "Weather risk reflects environmental favorability only and is never proof of active infection.",
    }
