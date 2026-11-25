"""
AD-23: Multilingual Natural Language Understanding & Intent Engine.
Supports English, Kannada, Hindi, and Telugu (native scripts + Romanized terms),
spoken number extraction (hundred, thousand, lakh), and unit conversions
(acres, hectares, kg, tonnes, quintals).
"""
from __future__ import annotations

import re
from typing import Any, Dict, Optional

from backend.app.features.assistant.schemas import SupportedLang

SPOKEN_NUMBERS: Dict[str, int] = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20,
    "twenty five": 25, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
    "hundred": 100, "thousand": 1000, "lakh": 100000, "lakhs": 100000,
    # Kannada
    "ಒಂದು": 1, "ಎರಡು": 2, "ಮೂರು": 3, "ನಾಲ್ಕು": 4, "ಐದು": 5,
    "ಹತ್ತು": 10, "ಇಪ್ಪತ್ತು": 20, "ಮೂವತ್ತು": 30, "ನಲವತ್ತು": 40, "ಐವತ್ತು": 50,
    "ನೂರು": 100, "ಸಾವಿರ": 1000, "ಲಕ್ಷ": 100000,
    "ondu": 1, "eradu": 2, "mooru": 3, "naalku": 4, "aidu": 5, "saavira": 1000,
    # Hindi
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पांच": 5, "पाँच": 5,
    "दस": 10, "बीस": 20, "तीस": 30, "चालीस": 40, "पचास": 50,
    "सौ": 100, "हजार": 1000, "हज़ार": 1000, "लाख": 100000,
    "ek": 1, "do": 2, "teen": 3, "char": 4, "paanch": 5, "hazar": 1000, "hazaar": 1000,
    # Telugu
    "ఒకటి": 1, "రెండు": 2, "మూడు": 3, "నాలుగు": 4, "ఐదు": 5,
    "పది": 10, "ఇరవై": 20, "యాభై": 50,
    "వంద": 100, "వేలు": 1000, "వేల": 1000, "లక్ష": 100000,
    "rendu": 2, "moodu": 3, "nalugu": 4,
}

CROP_ALIASES = [
    ("Tomato", ["tomato", "tomatoes", "ಟೊಮೆಟೊ", "टमाटर", "టొమాటో"]),
    ("Maize", ["maize", "corn", "ಮೆಕ್ಕೆಜೋಳ", "मक्का", "మొక్కజొన్న"]),
    ("Rice", ["rice", "paddy", "ಭತ್ತ", "धान", "వరి"]),
    ("Wheat", ["wheat", "ಗೋಧಿ", "गेहूं", "గోధుమ"]),
    ("Ragi", ["ragi", "millet", "ರಾಗಿ", "रागी", "రాగి"]),
    ("Groundnut", ["groundnut", "peanut", "ಕಡಲೆಕಾಯಿ", "मूंगफली", "వేరుశెనగ"]),
    ("Cotton", ["cotton", "ಹತ್ತಿ", "कपास", "పత్తి"]),
    ("Sugarcane", ["sugarcane", "ಕಬ್ಬು", "गन्ना", "చెరకు"]),
    ("Onion", ["onion", "ಈರುಳ್ಳಿ", "प्याज", "ఉల్లిపాయ"]),
    ("Potato", ["potato", "ಆಲೂಗಡ್ಡೆ", "आलू", "బంగాళాదుంప"]),
    ("Chilli", ["chilli", "chili", "ಮೆಣಸಿನಕಾಯಿ", "मिर्च", "మిర్చి"]),
    ("Banana", ["banana", "ಬಾಳೆ", "केला", "అరటి"]),
]


def detect_language(text: str, preferred: Optional[str] = None) -> SupportedLang:
    if re.search(r"[\u0C80-\u0CFF]", text):
        return "kn"
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"
    if re.search(r"[\u0C00-\u0C7F]", text):
        return "te"
    if preferred in ("en", "kn", "hi", "te"):
        return preferred  # type: ignore[return-value]
    return "en"


def extract_crop(text: str) -> Optional[str]:
    q = text.lower()
    for canonical, terms in CROP_ALIASES:
        if any(t in q for t in terms):
            return canonical
    return None


def extract_water_availability(text: str) -> Optional[str]:
    q = text.lower()
    if any(w in q for w in ("abundant", "plenty", "high water", "canal", "flood", "ಹೆಚ್ಚು", "अधिक", "ఎక్కువ")):
        return "Abundant"
    if any(w in q for w in ("scarce", "low water", "less water", "rainfed", "ಕಡಿಮೆ", "कम", "తక్కువ")):
        return "Scarce"
    if any(w in q for w in ("moderate", "medium", "drip", "borewell", "ಮಧ್ಯಮ", "मध्यम", "మధ్యస్థం")):
        return "Moderate"
    return None


def extract_area_acres(text: str) -> Optional[float]:
    q = text.lower()
    ha_digit = re.search(r"(\d+(?:\.\d+)?)\s*(?:ha|hectare|hectares|ಹೆಕ್ಟೇರ್|हेक्टेयर|హెక్టార్)\b", q)
    if ha_digit:
        return round(float(ha_digit.group(1)) * 2.471, 2)

    ac_digit = re.search(r"(\d+(?:\.\d+)?)\s*(?:acre|acres|ac|ಎಕರೆ|एकड़|ఎకరాల|ఎకరం|ఎకరాలు)\b", q)
    if ac_digit:
        return float(ac_digit.group(1))

    for word, val in SPOKEN_NUMBERS.items():
        if 1 <= val <= 100:
            if re.search(rf"(?:^|\s){re.escape(word)}\s*(?:acre|acres|ac|ಎಕರೆ|एकड़|ఎకరాల|ఎకరం|ఎకరాలు)", q):
                return float(val)
            if re.search(rf"(?:^|\s){re.escape(word)}\s*(?:ha|hectare|hectares)", q):
                return round(float(val) * 2.471, 2)
    return None


def extract_budget_inr(text: str) -> Optional[float]:
    q = text.lower()
    multipliers = [
        (100000, ["lakh", "lakhs", "ಲಕ್ಷ", "लाख", "లక్ష"]),
        (1000, ["thousand", "k", "ಸಾವಿರ", "saavira", "हजार", "हज़ार", "hazar", "వేలు", "వేల"]),
        (100, ["hundred", "ನೂರು", "सौ", "వంద"]),
    ]
    for mult, words in multipliers:
        for w in words:
            m = re.search(rf"(\d+(?:\.\d+)?)\s*{re.escape(w)}\b", q)
            if m:
                return round(float(m.group(1)) * mult, 2)
            for num_word, val in SPOKEN_NUMBERS.items():
                if val < mult:
                    if re.search(rf"(?:^|\s){re.escape(num_word)}\s*{re.escape(w)}", q):
                        return float(val * mult)

    raw = re.search(r"(?:budget|rs\.?|inr|₹)?\s*(\d[\d,]{2,})\s*(?:rs|inr|rupees|budget|ರೂಪಾಯಿ|रुपये|రూపాయలు)?", q)
    if raw:
        val = float(raw.group(1).replace(",", ""))
        if val >= 500:
            return val
    return None


def extract_weight_kg(text: str) -> Optional[float]:
    q = text.lower()
    ton_m = re.search(r"(\d[\d,]*(?:\.\d+)?)\s*(?:ton|tons|tonne|tonnes)\b", q)
    if ton_m:
        return float(ton_m.group(1).replace(",", "")) * 1000.0
    quintal_m = re.search(r"(\d[\d,]*(?:\.\d+)?)\s*(?:quintal|quintals|qtl)\b", q)
    if quintal_m:
        return float(quintal_m.group(1).replace(",", "")) * 100.0
    kg_m = re.search(r"(\d[\d,]*(?:\.\d+)?)\s*(?:kg|kgs|kilo|kilogram|kilograms|ಕೆಜಿ|किलो|కిలో)\b", q)
    if kg_m:
        return float(kg_m.group(1).replace(",", ""))
    return None


def extract_workers_count(text: str) -> Optional[int]:
    q = text.lower()
    m = re.search(r"(\d+)\s*(?:worker|workers|labour|labor|people|men|women|ಕಾರ್ಮಿಕ|ಕಾರ್ಮಿಕರು|श्रमिक|मजदूर|కూలీ)", q)
    if m:
        return max(1, min(100, int(m.group(1))))
    for word, val in SPOKEN_NUMBERS.items():
        if 1 <= val <= 50:
            if re.search(rf"(?:^|\s){re.escape(word)}\s*(?:worker|workers|labour|labor|people|ಕಾರ್ಮಿಕ|ಕಾರ್ಮಿಕರು|श्रमिक|కూలీ)", q):
                return val
    return None


def extract_price_drop_pct(text: str) -> Optional[float]:
    q = text.lower()
    m = re.search(r"(?:price|market).*?(?:fall|drop|decrease|down|reduce).*?(\d+(?:\.\d+)?)\s*(?:%|percent)", q)
    if m:
        return float(m.group(1))
    return None


def classify_intent(text: str, role: str) -> Dict[str, Any]:
    q = text.strip().lower()
    crop = extract_crop(q)
    area_acres = extract_area_acres(q)
    budget_inr = extract_budget_inr(q)
    water = extract_water_availability(q)
    weight_kg = extract_weight_kg(q)
    workers = extract_workers_count(q)
    price_drop = extract_price_drop_pct(q)

    # 1. Digital Farm simulation controls
    if any(w in q for w in ("simulation", "digital farm", "crop growth")) or re.match(r"^(play|pause|resume|explain harvest)", q):
        action = "summary"
        if re.search(r"\b(pause|stop)\b", q):
            action = "pause"
        elif re.search(r"\b(resume|continue)\b", q):
            action = "resume"
        elif re.search(r"\b(start|play|run)\b", q):
            action = "play"
        return {"intent": "digital_farm_control", "action": action}

    # 2. Financial what-if & AD-24 live finance queries
    if price_drop is not None or ("what if" in q and any(w in q for w in ("price", "profit", "cost"))):
        return {"intent": "finance_what_if", "price_drop_pct": price_drop or 20.0}

    if any(w in q for w in ("spent", "expenditure", "expense", "expenses", "remaining budget", "budget", "profit", "roi", "break-even", "break even", "outstanding", "payment", "payments", "ಖರ್ಚು", "ಬಜೆಟ್", "ಲಾಭ", "खर्च", "बजट", "लाभ", "ఖర్చు", "బడ్జెట్", "లాభం")):
        # Distinguish planning with budget ("I have 2 acres and 50000 budget, grow tomato") vs querying recorded finance
        if not (crop or area_acres or any(w in q for w in ("grow", "plant", "plan", "variety", "ಸಸಿ", "उगाना", "పెంచాలి"))):
            return {"intent": "finance_query"}

    # 3. Government schemes
    if any(w in q for w in ("scheme", "schemes", "subsidy", "subsidies", "pm-kisan", "pm kisan", "pmfby", "yojana", "ಯೋಜನೆ", "सहायता", "योजना", "పథకం")):
        return {"intent": "schemes"}

    # 4. Crop Health / Disease Diagnostics (AD-22 compatible adapter)
    if any(w in q for w in ("disease", "leaf spot", "blight", "wilt", "yellowing", "pest", "crop doctor", "ರೋಗ", "रोग", "తెగులు")):
        return {"intent": "crop_health", "crop": crop}

    # 4b. Satellite & Geospatial Intelligence (AD-25)
    if any(w in q for w in ("satellite", "sentinel", "canopy", "vegetation index", "ಉಪಗ್ರಹ", "उपग्रह", "सैटेलाइट", "ఉపగ్రహం")) or re.search(
        r"\b(ndvi|ndmi|ndwi|evi|savi|ndre)\b", q
    ):
        return {"intent": "satellite_intelligence"}

    # 4c. Post-Harvest Storage, Shelf-Life, Inventory & Sell-vs-Store (AD-27)
    if any(w in q for w in ("post-harvest", "post harvest", "cold storage", "shelf life", "shelf-life", "store my", "sell now or store", "sell or store", "spoilage", "storage condition", "storage cost", "storage loss", "inventory level", "available for selling", "ಶೀತಲೀಕರಣ", "ಸಂಗ್ರಹಣೆ", "शीतगृह", "भंडारण", "కోల్డ్ స్టోరేజ్", "నిల్వ")):
        return {"intent": "post_harvest_query", "crop": crop}

    # 4d. Equipment Sharing & Resource Optimization (AD-28)
    if any(w in q for w in ("tractor", "rotavator", "harvester", "thresher", "sprayer", "drone", "seed drill", "transplanter", "machinery", "equipment", "share a tractor", "shared rental", "ಟ್ರ್ಯಾಕ್ಟರ್", "ಯಂತ್ರ", "ट्रैक्टर", "मशीन", "ట్రాక్టర్", "యంత్రం")):
        return {"intent": "equipment_query", "crop": crop}

    # 4e. Market Intelligence & Price Prediction (AD-29)
    if any(w in q for w in ("market price", "mandi", "agmarknet", "modal price", "price forecast", "next week", "where should i sell", "best market", "best price", "ಮಾರುಕಟ್ಟೆ ಬೆಲೆ", "ಮಂಡಿ", "मंडी भाव", "बाजार भाव", "మార్కెట్ ధర", "మండి")):
        return {"intent": "market_intelligence_query", "crop": crop}

    # 5. Irrigation & Weather
    if any(w in q for w in ("irrigate", "irrigation", "water today", "water my", "rain", "weather", "forecast", "climate", "ನೀರಾವರಿ", "ಹವಾಮಾನ", "ಮಳೆ", "सिंचाई", "मौसम", "बारिश", "నీటిపారుదల", "వాతావరణం")):
        return {"intent": "irrigation_weather"}

    # 6. Soil & Nutrients
    if any(w in q for w in ("soil", "npk", "fertilizer", "ph", "ಮಣ್ಣು", "ಗೊಬ್ಬರ", "मिट्टी", "खाद", "నేల", "ఎరువు")):
        return {"intent": "soil"}

    # 7. Scientific research / BioIntel literature
    if any(w in q for w in ("research", "paper", "study", "europe pmc", "journal", "scientific evidence", "ಸಂಶೋಧನೆ", "शोध", "పరిశోధన")):
        return {"intent": "research", "crop": crop or "Tomato"}

    # 8. Nursery lookup
    if any(w in q for w in ("nursery", "nurseries", "sapling", "seedling", "buy seeds", "ನರ್ಸರಿ", "नर्सरी", "నర్సరీ")):
        return {"intent": "nursery", "crop": crop or "Tomato"}

    # 9. Labour Connect
    if any(w in q for w in ("worker", "workers", "labour", "labor", "hire", "wages", "earnings", "ಕಾರ್ಮಿಕ", "श्रमिक", "मजदूर", "కూలీ")):
        if role == "labour" or any(w in q for w in ("my jobs", "my earnings", "find work", "available jobs")):
            return {"intent": "labour_lookup"}
        if workers is not None or any(w in q for w in ("hire", "find", "book", "post", "need")):
            work_type = "Harvesting"
            if "weed" in q:
                work_type = "Weeding"
            elif any(w in q for w in ("plant", "sow", "transplant")):
                work_type = "Planting"
            elif "irrigat" in q:
                work_type = "Irrigation"
            return {"intent": "labour_hire", "workers": workers or 3, "work_type": work_type}
        return {"intent": "labour_lookup"}

    # 10. Smart Bidding & Orders
    if any(w in q for w in ("bid", "bids", "offer", "offers", "buyer", "auction", "sell my", "confirmed order", "orders", "ಬಿಡ್", "बोली", "బిడ్")):
        if any(w in q for w in ("sell ", "list ", "auction ")) and weight_kg:
            return {"intent": "bidding_draft", "crop": crop or "Tomato", "quantity_kg": weight_kg}
        if any(w in q for w in ("order", "orders", "purchase order")):
            return {"intent": "orders_status"}
        return {"intent": "bidding_offers", "crop": crop}

    # 11. Transport Connect
    if any(w in q for w in ("transport", "vehicle", "truck", "tempo", "tractor", "cargo", "delivery", "freight", "ಸಾರಿಗೆ", "वाहन", "ट्रक", "రవాణా")):
        if role == "driver" or any(w in q for w in ("my bookings", "delivery status")):
            return {"intent": "transport_status"}
        if weight_kg and any(w in q for w in ("book", "arrange", "send")):
            return {"intent": "transport_draft", "weight_kg": weight_kg, "crop": crop}
        return {"intent": "transport_find", "weight_kg": weight_kg, "crop": crop}

    # 12. Crop Recommendation / BioIntel Seed Planning
    if any(w in q for w in ("which crop", "recommend crop", "what should i grow", "which variety", "seed", "grow", "cultivate", "plan", "ಬೆಳೆ", "उगाना", "फसल", "పంట")):
        if crop or area_acres is not None or budget_inr is not None:
            return {
                "intent": "biointel_plan",
                "crop": crop,
                "area_acres": area_acres,
                "budget_inr": budget_inr,
                "water": water,
            }
        return {"intent": "crop_recommend"}

    # 13. Explicit navigation
    if any(w in q for w in ("open ", "go to ", "navigate ", "show me ")):
        return {"intent": "navigate"}

    return {"intent": "general_agri", "crop": crop}
