"""
AD-29: Market Data Normalization, Unit Conversion & Commodity Aliasing.
Converts INR/Quintal (100 kg), INR/Tonne (1000 kg), and INR/kg consistently,
rejects malformed/negative/inconsistent records, and sanitizes CSV cells.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

SUPPORTED_COMMODITIES = [
    "Tomato",
    "Onion",
    "Potato",
    "Paddy",
    "Wheat",
    "Maize",
    "Ragi",
    "Chilli",
    "Cotton",
    "Groundnut",
    "Sugarcane",
    "Sunflower",
    "Banana",
    "Mango",
    "Grapes",
    "Cabbage",
    "Carrot",
    "Turmeric",
    "Pulses",
]

COMMODITY_ALIASES: Dict[str, str] = {
    "tomato": "Tomato",
    "tomatoes": "Tomato",
    "tamatar": "Tomato",
    "onion": "Onion",
    "onions": "Onion",
    "pyaz": "Onion",
    "potato": "Potato",
    "potatoes": "Potato",
    "aloo": "Potato",
    "paddy": "Paddy",
    "paddy(dhan)(common)": "Paddy",
    "paddy(dhan)": "Paddy",
    "rice": "Paddy",
    "dhan": "Paddy",
    "wheat": "Wheat",
    "gehun": "Wheat",
    "maize": "Maize",
    "corn": "Maize",
    "makka": "Maize",
    "ragi": "Ragi",
    "ragi (finger millet)": "Ragi",
    "finger millet": "Ragi",
    "chilli": "Chilli",
    "chili": "Chilli",
    "dry chillies": "Chilli",
    "green chilli": "Chilli",
    "chilli red": "Chilli",
    "cotton": "Cotton",
    "groundnut": "Groundnut",
    "peanut": "Groundnut",
    "sugarcane": "Sugarcane",
    "sunflower": "Sunflower",
    "banana": "Banana",
    "mango": "Mango",
    "grapes": "Grapes",
    "cabbage": "Cabbage",
    "carrot": "Carrot",
    "turmeric": "Turmeric",
    "pulses": "Pulses",
    "tur": "Pulses",
    "arhar": "Pulses",
    "arhar (tur/red gram)(whole)": "Pulses",
    "moong": "Pulses",
    "urad": "Pulses",
    "bengal gram(gram)(whole)": "Pulses",
}

KARNATAKA_PRIORITY_DISTRICTS = [
    "Bengaluru Rural",
    "Tumakuru",
    "Ballari",
    "Chitradurga",
    "Kolar",
    "Chikkaballapura",
    "Mandya",
    "Mysuru",
    "Hassan",
    "Davanagere",
    "Belagavi",
    "Bagalkot",
]


def normalize_commodity_name(raw: str) -> str:
    cleaned = (raw or "").strip()
    if not cleaned:
        return "Unknown"
    low = cleaned.lower()
    if low in COMMODITY_ALIASES:
        return COMMODITY_ALIASES[low]
    for alias, canon in COMMODITY_ALIASES.items():
        if alias in low:
            return canon
    return cleaned.title()


def sanitize_csv_cell(value: str) -> str:
    text = (value or "").strip()
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return text.lstrip("=+-@\t\r").strip()
    return text


def normalize_date_str(raw: str) -> Optional[str]:
    s = (raw or "").strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d-%b-%Y"):
        try:
            return datetime.strptime(s[:12].strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def convert_to_per_quintal_and_kg(price: float, unit: str) -> Dict[str, float]:
    u = (unit or "INR/Quintal").strip().lower()
    if "kg" in u or "kilogram" in u:
        per_kg = round(float(price), 4)
        per_quintal = round(per_kg * 100.0, 2)
    elif "tonne" in u or "ton" in u or "mt" in u:
        per_kg = round(float(price) / 1000.0, 4)
        per_quintal = round(float(price) / 10.0, 2)
    else:  # quintal
        per_quintal = round(float(price), 2)
        per_kg = round(per_quintal / 100.0, 4)
    return {"per_quintal": per_quintal, "per_kg": per_kg}


def normalize_market_record(
    *,
    commodity: str,
    state: str,
    district: str,
    market: str,
    observation_date: str,
    modal_price: float,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    unit: str = "INR/Quintal",
    variety: str = "FAQ",
    grade: str = "FAQ",
    source_type: str = "official_agmarknet",
    source_name: str = "AGMARKNET / Data.gov.in",
    provenance_label: str = "Official AGMARKNET Observation",
) -> Optional[Dict[str, Any]]:
    norm_date = normalize_date_str(observation_date)
    if not norm_date:
        return None
    try:
        modal_val = float(modal_price)
    except (TypeError, ValueError):
        return None
    if modal_val <= 0:
        return None

    min_val = float(min_price) if min_price is not None else modal_val
    max_val = float(max_price) if max_price is not None else modal_val
    if min_val < 0 or max_val < 0 or min_val > max_val:
        return None

    m_conv = convert_to_per_quintal_and_kg(modal_val, unit)
    min_conv = convert_to_per_quintal_and_kg(min_val, unit)
    max_conv = convert_to_per_quintal_and_kg(max_val, unit)

    return {
        "commodity": normalize_commodity_name(commodity),
        "variety": sanitize_csv_cell(variety) or "FAQ",
        "grade": sanitize_csv_cell(grade) or "FAQ",
        "state": sanitize_csv_cell(state).title() or "Karnataka",
        "district": sanitize_csv_cell(district).title() or "Unknown",
        "market": sanitize_csv_cell(market) or "Unknown Market",
        "observation_date": norm_date,
        "min_price_per_quintal": min_conv["per_quintal"],
        "max_price_per_quintal": max_conv["per_quintal"],
        "modal_price_per_quintal": m_conv["per_quintal"],
        "modal_price_per_kg": m_conv["per_kg"],
        "original_unit": unit,
        "source_type": source_type,
        "source_name": source_name,
        "provenance_label": provenance_label,
    }
