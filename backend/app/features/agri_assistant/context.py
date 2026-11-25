# backend/app/features/agri_assistant/context.py
"""
Authenticated User & Farm Ownership Resolution, Multilingual Entity Extraction,
and Agricultural Intent Classification for AD-23.
"""
import re
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.services.farm_service import farm_service

CROP_ALIASES: List[Tuple[str, List[str]]] = [
    ("Tomato", ["tomato", "tomatoes", "ಟೊಮೆಟೊ", "ಟೊಮ್ಯಾಟೊ", "टमाटर", "టొమాటో", "టమాట"]),
    ("Maize", ["maize", "corn", "ಮೆಕ್ಕೆಜೋಳ", "ಮಕ್ಕೆಜೋಳ", "मक्का", "मके", "మొక్కజొన్న"]),
    ("Paddy", ["paddy", "rice", "ಭತ್ತ", "ಅಕ್ಕಿ", "धान", "चावल", "వరి", "బియ్యం"]),
    ("Wheat", ["wheat", "ಗೋಧಿ", "गेहूं", "गेहूँ", "గోధుమ"]),
    ("Ragi", ["ragi", "finger millet", "ರಾಗಿ", "रागी", "రాగి"]),
    ("Groundnut", ["groundnut", "peanut", "ಕಡಲೆಕಾಯಿ", "ಶೇಂಗಾ", "मूंगफली", "వేరుశెనగ"]),
    ("Cotton", ["cotton", "ಹತ್ತಿ", "कपास", "పత్తి"]),
    ("Sugarcane", ["sugarcane", "ಕಬ್ಬು", "गन्ना", "చెరకు"]),
    ("Onion", ["onion", "onions", "ಈರುಳ್ಳಿ", "प्याज", "प्याज़", "ఉల్లిపాయ", "ఉల్లి"]),
    ("Potato", ["potato", "potatoes", "ಆಲೂಗಡ್ಡೆ", "आलू", "బంగాళాదుంప"]),
    ("Chilli", ["chilli", "chili", "pepper", "ಮೆಣಸಿನಕಾಯಿ", "ಮೆಣಸು", "मिर्च", "మిర్చి"]),
    ("Banana", ["banana", "ಬಾಳೆ", "केला", "అరటి"]),
    ("Mango", ["mango", "ಮಾವಿನ", "ಮಾವು", "आम", "మామిడి"]),
]


def authenticate_bearer_user(authorization: Optional[str]) -> Dict[str, Any]:
    """Validates Bearer session token against SQLite user_sessions + users."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization Bearer token.",
        )
    token = authorization.replace("Bearer ", "", 1).strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty session token.")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        session = cursor.execute(
            "SELECT user_id, role FROM user_sessions WHERE token = ?",
            (token,),
        ).fetchone()
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired session token.")
        user = cursor.execute(
            """
            SELECT id, email, name, phone, role, preferred_language, village, district, state, created_at
            FROM users WHERE id = ?
            """,
            (session["user_id"],),
        ).fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Authenticated user account not found.")
        u = dict(user)
        u["is_demo"] = any(
            u["id"].startswith(p) for p in ("usr_farmer", "usr_buyer", "usr_labour", "usr_driver")
        )
        return u
    finally:
        conn.close()


def resolve_authorized_farm(
    user: Dict[str, Any],
    farm_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Retrieves the farm profile strictly owned by the authenticated user.
    Raises 403 on unauthorized cross-user farm access.
    """
    role = user.get("role", "")
    user_id = user.get("id", "")

    if farm_id:
        if role not in ("farmer", "admin"):
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: Only the owning farmer account can access private farm context.",
            )

        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
            if row:
                farm_dict = dict(row)
                if role != "admin" and farm_dict.get("farmer_id") != user_id:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Unauthorized: Farm '{farm_id}' does not belong to your account.",
                    )
                return farm_dict
        finally:
            conn.close()

        # Check in-memory prototype farm_service with strict ownership rules
        mem_farm = farm_service.get_farm(farm_id)
        if mem_farm:
            mem_dict = mem_farm.model_dump()
            # farm_001 belongs to usr_farmer; farm_002 belongs to Ramesh Patil (not Suresh Gowda)
            if role != "admin":
                owner_matches = (
                    (farm_id == "farm_001" and user_id == "usr_farmer")
                    or (
                        mem_dict.get("farmer_name", "").strip().lower()
                        == user.get("name", "").strip().lower()
                    )
                )
                if not owner_matches:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Unauthorized: Farm '{farm_id}' belongs to another farmer.",
                    )
            mem_dict["farmer_id"] = user_id
            return mem_dict

        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found.")

    # No explicit farm_id requested
    if role != "farmer":
        return None

    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT * FROM farms WHERE farmer_id = ? ORDER BY created_at ASC LIMIT 1",
            (user_id,),
        ).fetchone()
        if row:
            return dict(row)
    finally:
        conn.close()

    # Fallback for usr_farmer only if SQLite farms row wasn't present
    if user_id == "usr_farmer":
        mem_farm = farm_service.get_farm("farm_001")
        if mem_farm:
            d = mem_farm.model_dump()
            d["farmer_id"] = user_id
            return d
    return None


def extract_crops_mentioned(text: str) -> List[str]:
    q = text.lower()
    found: List[str] = []
    for canonical, terms in CROP_ALIASES:
        if any(t in q for t in terms):
            if canonical not in found:
                found.append(canonical)
    return found


def extract_water_availability(text: str) -> Optional[str]:
    q = text.lower()
    if any(w in q for w in ["abundant", "plenty", "high water", "canal", "flood", "ಹೆಚ್ಚು", "अधिक", "ఎక్కువ"]):
        return "Abundant"
    if any(w in q for w in ["scarce", "low water", "less water", "limited water", "rainfed", "ಕಡಿಮೆ", "कम", "తక్కువ"]):
        return "Scarce"
    if any(w in q for w in ["moderate", "medium", "drip", "borewell", "ಮಧ್ಯಮ", "मध्यम", "మధ్యస్థం"]):
        return "Moderate"
    return None


def extract_area_acres(text: str) -> Optional[float]:
    q = text.lower()
    word_nums = {
        "one": 1.0,
        "two": 2.0,
        "three": 3.0,
        "four": 4.0,
        "five": 5.0,
        "half": 0.5,
        "ಒಂದು": 1.0,
        "ಎರಡು": 2.0,
        "ಮೂರು": 3.0,
        "एक": 1.0,
        "दो": 2.0,
        "तीन": 3.0,
        "ఒక": 1.0,
        "రెండు": 2.0,
        "మూడు": 3.0,
    }
    m_ha = re.search(r"(\d+(?:\.\d+)?)\s*(?:ha|hectare|hectares|ಹೆಕ್ಟೇರ್|हेक्टेयर|హెక్టార్లు)\b", q)
    if m_ha:
        return round(float(m_ha.group(1)) * 2.471, 2)

    m_ac = re.search(r"(\d+(?:\.\d+)?)\s*(?:acre|acres|ac|ಎಕರೆ|एकड़|एकड|ఎకరాల|ఎకరాలు|ఎకరం)\b", q)
    if m_ac:
        return round(float(m_ac.group(1)), 2)

    for word, val in word_nums.items():
        if re.search(rf"\b{re.escape(word)}\s*(?:acre|acres|ac|ಎಕರೆ|एकड़|ఎకరాలు|ఎకరం)\b", q) or (
            word in q and any(u in q for u in ["ಎಕರೆ", "एकड़", "ఎకరాల", "ఎకరం", "acre", "acres"])
        ):
            return val
    return None


def extract_budget_inr(text: str) -> Optional[float]:
    q = text.lower()
    m_lakh = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac)\b", q)
    if m_lakh:
        return round(float(m_lakh.group(1)) * 100000.0, 2)

    m_k = re.search(r"(\d+(?:\.\d+)?)\s*(?:k|thousand)\b", q)
    if m_k:
        return round(float(m_k.group(1)) * 1000.0, 2)

    m_curr = re.search(
        r"(?:₹|rs\.?|inr|budget(?:\s+is)?|ರೂಪಾಯಿ|रुपये|రూపాయలు)?\s*(\d[\d,]{2,})\s*(?:rs\.?|inr|rupees|budget|ರೂಪಾಯಿ|रुपये|రూపాయలు)?",
        q,
    )
    if m_curr:
        val = float(m_curr.group(1).replace(",", ""))
        if val >= 500:
            return val
    return None


def extract_soil_ph_and_npk(text: str) -> Dict[str, Optional[float]]:
    q = text.lower()
    res: Dict[str, Optional[float]] = {"soil_ph": None, "nitrogen_kg_ha": None, "phosphorus_kg_ha": None, "potassium_kg_ha": None}
    m_ph = re.search(r"\bph\s*(?:is|=|:)?\s*(\d(?:\.\d+)?)", q)
    if m_ph:
        ph_val = float(m_ph.group(1))
        if 3.0 <= ph_val <= 10.0:
            res["soil_ph"] = ph_val
    m_n = re.search(r"\bnitrogen\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)", q)
    if m_n:
        res["nitrogen_kg_ha"] = float(m_n.group(1))
    m_p = re.search(r"\bphosphorus\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)", q)
    if m_p:
        res["phosphorus_kg_ha"] = float(m_p.group(1))
    m_k = re.search(r"\bpotassium\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)", q)
    if m_k:
        res["potassium_kg_ha"] = float(m_k.group(1))
    return res


def update_memory_with_query(
    text: str,
    existing_memory: Dict[str, Any],
    farm: Optional[Dict[str, Any]],
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Extracts structured entities from current query and merges them with conversation memory
    so follow-up questions retain area, budget, crop, and water context.
    Returns (updated_memory, turn_extracted).
    """
    mem = dict(existing_memory or {})
    crops = extract_crops_mentioned(text)
    area_acres = extract_area_acres(text)
    budget_inr = extract_budget_inr(text)
    water = extract_water_availability(text)
    soil_vals = extract_soil_ph_and_npk(text)

    if crops:
        mem["selected_crop"] = crops[0]
        if len(crops) > 1:
            mem["comparison_crops"] = crops[:3]
    elif not mem.get("selected_crop") and farm and farm.get("primary_crop"):
        mem["selected_crop"] = farm["primary_crop"]

    if area_acres is not None:
        mem["area_acres"] = area_acres
    elif not mem.get("area_acres") and farm and farm.get("land_area_ha"):
        mem["area_acres"] = round(float(farm["land_area_ha"]) * 2.471, 2)

    if budget_inr is not None:
        mem["budget_inr"] = budget_inr
    elif not mem.get("budget_inr") and farm and farm.get("cultivation_budget_inr"):
        mem["budget_inr"] = float(farm["cultivation_budget_inr"])

    if water is not None:
        mem["water_availability"] = water
    elif not mem.get("water_availability") and farm:
        avail_m3 = float(farm.get("available_water_m3") or 10000.0)
        method = str(farm.get("irrigation_method") or "")
        if "rainfed" in method.lower() or avail_m3 < 4000:
            mem["water_availability"] = "Scarce"
        elif avail_m3 >= 15000:
            mem["water_availability"] = "Abundant"
        else:
            mem["water_availability"] = "Moderate"

    for k, v in soil_vals.items():
        if v is not None:
            mem[k] = v

    # Track whether user explicitly gave area/budget/crop in this turn
    turn_extracted = {
        "crops_mentioned": crops,
        "area_acres": area_acres,
        "budget_inr": budget_inr,
        "water_availability": water,
        "soil_inputs": soil_vals,
    }
    return mem, turn_extracted


def classify_agricultural_intent(
    text: str,
    memory: Dict[str, Any],
    turn_extracted: Dict[str, Any],
) -> str:
    q = text.lower().strip()

    # Consequential action drafts (require confirmation before write)
    if re.search(r"\b(hire|post|book|recruit)\b.*\b(worker|workers|labour|labor)\b", q) or (
        any(w in q for w in ["ಕಾರ್ಮಿಕರನ್ನು ನೇಮಿಸಿ", "मजदूर रखें", "కార్మికులను"])
    ):
        return "action_draft_labour"

    if re.search(r"\b(publish|create|post|list|sell)\b.*\b(\d+)\s*(?:kg|quintal)\b", q) and any(
        w in q for w in ["bid", "bidding", "auction", "lot", "list"]
    ):
        return "action_draft_bidding"

    if re.search(r"\b(book|arrange|schedule|reserve)\b.*\b(vehicle|truck|tata ace|driver|transport)\b", q):
        return "action_draft_transport"

    # Multi-crop comparison
    if len(turn_extracted.get("crops_mentioned") or []) >= 2 or re.search(
        r"\b(compare|versus|vs|instead|or grow|better between)\b", q
    ):
        return "crop_comparison"

    # Crop Doctor / Disease Diagnosis
    if any(
        w in q
        for w in [
            "disease",
            "leaf spot",
            "blight",
            "wilt",
            "diagnos",
            "crop doctor",
            "pest",
            "ರೋಗ",
            "कीट",
            "रोग",
            "వ్యాధి",
            "తెగులు",
        ]
    ):
        return "crop_diagnosis"

    # Precision Irrigation
    if any(
        w in q
        for w in [
            "irrigat",
            "water requirement",
            "drip",
            "how much water",
            "moisture",
            "ನೀರಾವರಿ",
            "ನೀರು",
            "सिंचाई",
            "पानी",
            "నీటిపారుదల",
            "నీరు",
        ]
    ):
        return "irrigation_advisory"

    # Seed quantity & BioIntel
    if any(
        w in q
        for w in [
            "how much seed",
            "seed quantity",
            "seed rate",
            "variety",
            "varieties",
            "nursery",
            "nurseries",
            "biointel",
            "resistant",
            "ಬೀಜ",
            "ತಳಿ",
            "बीज",
            "किस्म",
            "విత్తన",
            "రకం",
        ]
    ):
        return "seed_and_biointel"

    # Crop recommendation ("which crop should I grow", Kannada/Hindi/Telugu equivalents)
    if any(
        w in q
        for w in [
            "which crop",
            "what crop",
            "should i grow",
            "recommend crop",
            "suitable crop",
            "crop to grow",
            "plant next",
            "ಯಾವ ಬೆಳೆ",
            "ಬೆಳೆ ಸೂಕ್ತ",
            "कौन सी फसल",
            "फसल लगानी",
            "ఏ పంట",
            "పంట అనుకూల",
        ]
    ):
        return "crop_recommendation"

    # Follow-up budget/area update connected to previous crop discussion
    if (
        (turn_extracted.get("budget_inr") is not None or turn_extracted.get("area_acres") is not None)
        and memory.get("last_intent") in ("crop_recommendation", "crop_comparison", "seed_and_biointel")
    ):
        return memory["last_intent"]

    # Soil & nutrients
    if any(
        w in q
        for w in [
            "soil",
            "npk",
            "nitrogen",
            "phosphorus",
            "potassium",
            "ph ",
            "soil ph",
            "fertilizer",
            "nutrient",
            "ಮಣ್ಣು",
            "ಗೊಬ್ಬರ",
            "मिट्टी",
            "उर्वरक",
            "खाद",
            "నేల",
            "ఎరువు",
        ]
    ):
        return "soil_advisory"

    # Weather
    if any(
        w in q
        for w in [
            "weather",
            "forecast",
            "rain",
            "temperature",
            "humidity",
            "wind",
            "spray",
            "ಹವಾಮಾನ",
            "ಮಳೆ",
            "मौसम",
            "बारिश",
            "వాతావరణం",
            "వర్షం",
        ]
    ):
        return "weather_advisory"

    # Market Sell Today vs Wait & Mandi Prices
    if any(
        w in q
        for w in [
            "sell",
            "mandi",
            "market price",
            "apmc",
            "spoilage",
            "storage",
            "wait",
            "ಮಾರುಕಟ್ಟೆ",
            "ಬೆಲೆ",
            "मंडी",
            "बाजार",
            "भाव",
            "మార్కెట్",
            "ధర",
        ]
    ):
        return "market_intelligence"

    # Smart Bidding & Orders
    if any(
        w in q
        for w in [
            "bid",
            "bids",
            "auction",
            "buyer offer",
            "purchase order",
            "confirmed order",
            "orders",
            "ಬಿಡ್",
            "ಹರಾಜು",
            "बोली",
            "ऑर्डर",
            "బిడ్",
            "ఆర్డర్",
        ]
    ):
        return "bidding_status"

    # Transport
    if any(
        w in q
        for w in [
            "transport",
            "driver",
            "vehicle",
            "freight",
            "delivery",
            "logistics",
            "ಸಾರಿಗೆ",
            "ವಾಹನ",
            "परिवहन",
            "वाहन",
            "రవాణా",
            "వాహనం",
        ]
    ):
        return "transport_status"

    # Labour
    if any(
        w in q
        for w in [
            "worker",
            "workers",
            "labour",
            "labor",
            "wage",
            "ಕೂಲಿ",
            "ಕಾರ್ಮಿಕ",
            "मजदूर",
            "श्रमिक",
            "కూలీ",
            "కార్మిక",
        ]
    ):
        return "labour_status"

    # Digital Farm / Harvest Readiness
    if any(
        w in q
        for w in [
            "harvest",
            "ready to harvest",
            "growth stage",
            "digital farm",
            "simulation",
            "twin",
            "ಕೊಯ್ಲು",
            "ಕಟಾವು",
            "कटाई",
            "కోత",
        ]
    ):
        return "digital_farm_status"

    # Government Schemes
    if any(
        w in q
        for w in [
            "scheme",
            "subsidy",
            "pm-kisan",
            "pm kisan",
            "pmfby",
            "kcc",
            "insurance",
            "government",
            "ಯೋಜನೆ",
            "ಸಬ್ಸಿಡಿ",
            "योजना",
            "सब्सिडी",
            "పథకం",
            "సబ్సిడీ",
        ]
    ):
        return "government_schemes"

    # Finance
    if any(
        w in q
        for w in [
            "finance",
            "expense",
            "profit",
            "revenue",
            "loan",
            "ledger",
            "budget",
            "ಹಣಕಾಸು",
            "ಖರ್ಚು",
            "లాభం",
            "वित्त",
            "खर्च",
            "ఆర్థిక",
        ]
    ):
        return "finance_overview"

    return "general_farm_advisory"
