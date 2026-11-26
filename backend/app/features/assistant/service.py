"""
AD-23: Hybrid Agentic Agricultural AI Companion Service.
Orchestrates:
  1. Language Detection (EN / KN / HI / TE)
  2. Multiturn Context & Slot-Filling (BioIntel Crop Planning + Corrections + Cancellation)
  3. Role-Authorized Tool Execution (Agricultural Tool Registry)
  4. Online Gemini Grounded Synthesis (when GEMINI_API_KEY is configured) OR
     Deterministic Local Intelligence Mode (when offline / key missing)
  5. Consequential Action Confirmation & Replay Protection
"""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.features.assistant.intent_engine import (
    classify_intent,
    detect_language,
    extract_area_acres,
    extract_budget_inr,
    extract_crop,
    extract_water_availability,
)
from backend.app.features.assistant.schemas import (
    AssistantChatResponse,
    ClientDirective,
    PendingActionPreview,
    SourceReference,
    StructuredCard,
    SupportedLang,
)
from backend.app.features.assistant.tool_registry import TOOL_METADATA, execute_tool
from backend.app.services.http_client import fetch_json_with_resilience


from backend.app.features.assistant.gemini_voice import generate_gemini_text
from backend.app.features.assistant.general_qa import generate_general_or_followup_reply


def _resolve_navigation_target(message: str, role: str) -> Dict[str, str]:
    q = (message or "").lower()
    if any(w in q for w in ("crop doctor", "leaf scan", "diagnostics", "disease", "crop health", "ರೋಗ", "रोग", "తెగులు")):
        route = "/crop-health?section=diagnostics"
        label = "Crop Doctor & Health Diagnostics"
    elif any(w in q for w in ("digital farm", "simulation", "growth", "ಡಿಜಿಟಲ್", "सिमुलेशन", "డిజిటల్")):
        route = "/digital-farming"
        label = "Digital Farming Simulator"
    elif any(w in q for w in ("biointel", "seed planner", "seed investment", "ಬಯೋಇಂಟೆಲ್", "बायोइंटेल", "బయోఇంటెల్")):
        route = "/biointel"
        label = "BioIntel Seed Investment Planner"
    elif any(w in q for w in ("today's market", "todays market", "market price", "mandi", "ಮಾರುಕಟ್ಟೆ", "मंडी", "మార్కెట్")):
        route = "/smart-market?section=today_prices"
        label = "Smart Market — Today's Prices"
    elif any(w in q for w in ("buyer", "direct sale", "ಖರೀದಿದಾರ", "खरीदार", "కొనుగోలుదారు")):
        route = "/smart-market?section=find_buyers"
        label = "Smart Market — Find Buyers"
    elif any(w in q for w in ("bidding", "auction", "ಬಿಡ್ಡಿಂಗ್", "बोली", "బిడ్డింగ్")):
        route = "/smart-market?section=auction"
        label = "Smart Market — Auction & Bidding"
    elif any(w in q for w in ("financ", "ledger", "expense", "profit", "ಹಣಕಾಸು", "वित्त", "ఆర్థిక")):
        route = "/finance-benefits?section=finance" if role in ("farmer", "admin") else "/"
        label = "Financial Intelligence"
    elif any(w in q for w in ("decision", "today", "priority", "ನಿರ್ಧಾರ", "निर्णय", "నిర్ణయ")):
        route = "/decision-intelligence" if role in ("farmer", "admin") else "/"
        label = "Centralized Decision Intelligence"
    elif any(w in q for w in ("post harvest", "post-harvest", "storage", "packaging", "passport")):
        route = "/post-harvest"
        label = "Post-Harvest & Cold-Chain"
    elif any(w in q for w in ("dashboard", "home", "ಡ್ಯಾಶ್", "डैशबोर्ड", "డ్యాష్")):
        role_dash = {"farmer": "/", "buyer": "/dashboard/buyer", "labour": "/dashboard/labour", "driver": "/dashboard/driver"}
        route = role_dash.get(role, "/")
        label = f"{role.title()} Dashboard"
    else:
        role_dash = {"farmer": "/", "buyer": "/dashboard/buyer", "labour": "/dashboard/labour", "driver": "/dashboard/driver"}
        route = role_dash.get(role, "/")
        label = "RaithaMitra Workspace"
    return {"route": route, "label": label}


async def _synthesize_with_gemini(
    *,
    user_message: str,
    lang: SupportedLang,
    role: str,
    tool_name: str,
    tool_data: Dict[str, Any],
    provenance: str,
) -> Optional[str]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    lang_name = {"en": "English", "kn": "Kannada", "hi": "Hindi", "te": "Telugu"}[lang]
    prompt = (
        f"You are RaithaMitra AI Companion assisting a {role}. Respond naturally and concisely in {lang_name}.\n"
        "STRICT RULES:\n"
        "1. Use ONLY the verified tool output below. NEVER invent numbers, prices, yields, papers, or URLs.\n"
        "2. Distinguish estimated, committed, recorded, and settled financial figures.\n"
        "3. Do NOT execute or suggest SQL, shell commands, or external unverified chemicals.\n"
        f"User question: {user_message}\n"
        f"Tool used ({tool_name} — {provenance}):\n{json.dumps(tool_data, default=str)[:2500]}\n"
        "Write a clear, helpful 2–4 sentence response grounded strictly in this data."
    )
    res = await generate_gemini_text(prompt=prompt, timeout_ms=10000)
    return res[0] if res else None


def _localized_prompt(key: str, lang: SupportedLang, **kw: Any) -> str:
    if key == "ask_area":
        return {
            "en": f"Got it — {kw['crop']}. How much land do you have (in acres or hectares)?",
            "kn": f"ಸರಿ — {kw['crop']}. ನಿಮ್ಮ ಬಳಿ ಎಷ್ಟು ಎಕರೆ ಜಮೀನು ಇದೆ?",
            "hi": f"ठीक है — {kw['crop']}। आपके पास कितनी एकड़ जमीन है?",
            "te": f"సరే — {kw['crop']}. మీ దగ్గర ఎంత ఎకరాల భూమి ఉంది?",
        }[lang]
    if key == "ask_budget":
        return {
            "en": f"Noted: {kw['crop']} on {kw['area']} acres. What is your available cultivation budget (in rupees)?",
            "kn": f"{kw['crop']} ({kw['area']} ಎಕರೆ). ನಿಮ್ಮ ಕೃಷಿ ಬಜೆಟ್ ಎಷ್ಟು ರೂಪಾಯಿ?",
            "hi": f"{kw['crop']} ({kw['area']} एकड़)। आपका खेती का बजट कितना रुपये है?",
            "te": f"{kw['crop']} ({kw['area']} ఎకరాలు). మీ సాగు బడ్జెట్ ఎంత రూపాయలు?",
        }[lang]
    if key == "ask_water":
        return {
            "en": f"Got it — {kw['crop']} for {kw['area']} acres with ₹{kw['budget']:,.0f} budget. What is your water availability: Abundant, Moderate, or Scarce?",
            "kn": f"{kw['crop']} ({kw['area']} ಎಕರೆ, ₹{kw['budget']:,.0f} ಬಜೆಟ್). ನೀರಿನ ಲಭ್ಯತೆ ಹೇಗಿದೆ: ಹೆಚ್ಚು (Abundant), ಮಧ್ಯಮ (Moderate), ಅಥವಾ ಕಡಿಮೆ (Scarce)?",
            "hi": f"{kw['crop']} ({kw['area']} एकड़, ₹{kw['budget']:,.0f} बजट)। पानी की उपलब्धता कैसी है: अधिक (Abundant), मध्यम (Moderate), या कम (Scarce)?",
            "te": f"{kw['crop']} ({kw['area']} ఎకరాలు, ₹{kw['budget']:,.0f} బడ్జెట్). నీటి లభ్యత ఎలా ఉంది: ఎక్కువ (Abundant), మధ్యస్థం (Moderate), లేదా తక్కువ (Scarce)?",
        }[lang]
    if key == "cancelled":
        return {
            "en": "Cancelled the pending task. How else can I assist you?",
            "kn": "ಬಾಕಿ ಇದ್ದ ಕಾರ್ಯವನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ. ಬೇರೆ ಏನು ಸಹಾಯ ಬೇಕು?",
            "hi": "लंबित कार्य रद्द कर दिया गया है। मैं और क्या सहायता कर सकता हूँ?",
            "te": "పెండింగ్‌లో ఉన్న పని రద్దు చేయబడింది. ఇంకేమైనా సహాయం కావాలా?",
        }[lang]
    return ""


def _build_local_reply(
    intent: str,
    lang: SupportedLang,
    tool_res: Dict[str, Any],
    user_role: str,
    params: Dict[str, Any],
) -> str:
    if not tool_res.get("authorized", True):
        return tool_res.get("summary", "You are not authorized for this action.")

    d = tool_res.get("data", {})

    if intent == "biointel_plan":
        warn = ""
        if d.get("exceeds_budget"):
            warn = (
                f" Warning: Estimated investment (₹{d['total_investment_inr']:,.0f}) exceeds your ₹{d['budget_inr']:,.0f} budget; consider {d['alt_variety']}."
            )
        if lang == "kn":
            return (
                f"{d['crop']} ({d['area_acres']} ಎಕರೆ, {d['water']} ನೀರು): ಅಂದಾಜು ಹೂಡಿಕೆ ₹{d['total_investment_inr']:,.0f}, "
                f"ನಿರೀಕ್ಷಿತ ಇಳುವರಿ {d['expected_production_kg']:,.0f} ಕೆಜಿ, ಮತ್ತು ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭ ₹{d['estimated_profit_inr']:,.0f}.{warn}"
            )
        if lang == "hi":
            return (
                f"{d['crop']} ({d['area_acres']} एकड़, {d['water']} पानी): अनुमानित निवेश ₹{d['total_investment_inr']:,.0f}, "
                f"अपेक्षित उत्पादन {d['expected_production_kg']:,.0f} किग्रा, और अनुमानित शुद्ध लाभ ₹{d['estimated_profit_inr']:,.0f}।{warn}"
            )
        if lang == "te":
            return (
                f"{d['crop']} ({d['area_acres']} ఎకరాలు, {d['water']} నీరు): అంచనా పెట్టుబడి ₹{d['total_investment_inr']:,.0f}, "
                f"ఆశించిన దిగుబడి {d['expected_production_kg']:,.0f} కిలోలు, అంచనా నికర లాభం ₹{d['estimated_profit_inr']:,.0f}.{warn}"
            )
        return (
            f"Generated cultivation plan for {d['crop']} ({d['area_acres']} acres, {d['water']} water): "
            f"Estimated investment ₹{d['total_investment_inr']:,.0f}, expected production {d['expected_production_kg']:,.0f} kg, "
            f"and estimated net profit ₹{d['estimated_profit_inr']:,.0f} (using {d['variety']}).{warn}"
        )

    if intent == "crop_journey_query":
        if not d.get("has_journey"):
            return "You do not have an active Seed-to-Sale crop journey yet. Open /journey to start a new crop journey."
        nxt = f" Next recommended action: {d['next_action']}." if d.get("next_action") else ""
        if lang == "kn":
            return f"ನಿಮ್ಮ {d['crop_name']} ಪ್ರಯಾಣ: ಪ್ರಸ್ತುತ ಹಂತ '{d.get('current_stage')}', ಪ್ರಗತಿ {d['progress_pct']}%, ನಿರೀಕ್ಷಿತ ಕೊಯ್ಲು {d['expected_harvest_date']}.{nxt}"
        if lang == "hi":
            return f"आपकी {d['crop_name']} यात्रा: वर्तमान चरण '{d['current_stage']}', प्रगति {d['progress_pct']}%, अपेक्षित कटाई {d['expected_harvest_date']}।{nxt}"
        if lang == "te":
            return f"మీ {d['crop_name']} ప్రయాణం: ప్రస్తుత దశ '{d['current_stage']}', పురోగతి {d['progress_pct']}%, అంచనా కోత {d['expected_harvest_date']}.{nxt}"
        return f"Your {d['crop_name']} Seed-to-Sale journey is at stage '{d.get('current_stage')}' ({d['progress_pct']}% complete, expected harvest {d['expected_harvest_date']}).{nxt}"

    if intent == "decision_intelligence_query":
        top_recs = d.get("top_recommendations", [])
        top_txt = f" Top priority: {top_recs[0]}. {d.get('top_why', '')}" if top_recs else ""
        if lang == "kn":
            return f"ಕೇಂದ್ರೀಕೃತ ಕೃಷಿ ನಿರ್ಧಾರ ಸಾರಾಂಶ: {d.get('conflicts_count', 0)} ಸಂಘರ್ಷಗಳನ್ನು ಗುರುತಿಸಲಾಗಿದೆ.{top_txt} ವಿವರಗಳಿಗಾಗಿ /decision-intelligence ತೆರೆಯಿರಿ."
        if lang == "hi":
            return f"केंद्रीकृत कृषि निर्णय सारांश: {d.get('conflicts_count', 0)} संभावित टकराव पहचाने गए।{top_txt} विवरण के लिए /decision-intelligence खोलें।"
        if lang == "te":
            return f"కేంద్రీకృత నిర్ణయ సారాంశం: {d.get('conflicts_count', 0)} అంశాలు గుర్తించబడ్డాయి.{top_txt} వివరాల కోసం /decision-intelligence తెరవండి."
        return f"{d.get('summary_text', '')}{top_txt} Open /decision-intelligence for full explainability and what-if simulation."

    if intent == "market_intelligence_query":
        comm = d.get("commodity", "Tomato")
        obs = d.get("latest_observations", [])
        if obs:
            top = obs[0]
            price_txt = f"Latest persisted price for {comm}: ₹{top['modal_price_per_kg']}/kg at {top['market']} on {top['observation_date']} ({top['provenance_label']})."
        else:
            price_txt = f"No persisted official or CSV market observations found for {comm} yet."
        if lang == "kn":
            return f"{comm} ಮಾರುಕಟ್ಟೆ ಮಾಹಿತಿ: {price_txt} ಸಾರಿಗೆ ವೆಚ್ಚದ ನಂತರದ ನಿವ್ವಳ ಆದಾಯ ಹೋಲಿಸಲು /market-intelligence ತೆರೆಯಿರಿ."
        if lang == "hi":
            return f"{comm} बाजार जानकारी: {price_txt} परिवहन खर्च के बाद शुद्ध लाभ की तुलना के लिए /market-intelligence खोलें।"
        if lang == "te":
            return f"{comm} మార్కెట్ సమాచారం: {price_txt} రవాణా ఖర్చు తర్వాత నికర ఆదాయాన్ని పోల్చడానికి /smart-market తెరవండి."
        return f"{price_txt} Open /smart-market?section=today_prices to compare transportation-adjusted net returns across markets."

    if intent == "buyer_discovery_query":
        comm = d.get("crop", "Tomato")
        cnt = d.get("count", 0)
        buyers = d.get("buyers", [])
        top_txt = f" Top match: {buyers[0]['business_name']} ({buyers[0]['district']})." if buyers else ""
        if lang == "kn":
            return f"{comm} ಗಾಗಿ {cnt} ನೋಂದಾಯಿತ ಖರೀದಿದಾರರು ಲಭ್ಯವಿದ್ದಾರೆ.{top_txt} ನೇರ ಮಾರಾಟಕ್ಕಾಗಿ /smart-market?section=find_buyers ತೆರೆಯಿರಿ."
        if lang == "hi":
            return f"{comm} के लिए {cnt} पंजीकृत खरीदार मिले हैं।{top_txt} सीधी बिक्री के लिए /smart-market?section=find_buyers खोलें।"
        if lang == "te":
            return f"{comm} కోసం {cnt} నమోదిత కొనుగోలుదారులు ఉన్నారు.{top_txt} /smart-market?section=find_buyers తెరవండి."
        return f"Found {cnt} registered buyer(s) interested in {comm}.{top_txt} Open /smart-market?section=find_buyers to send a direct sale proposal."

    if intent == "packaging_query":
        comm = d.get("crop_name", "Tomato")
        units = d.get("recommended_units_count", 0)
        cost = d.get("estimated_packaging_cost_inr", 0)
        temp = d.get("target_temperature_guidance", "")
        if lang == "kn":
            return f"{comm} ಪ್ಯಾಕೇಜಿಂಗ್ ಅಂದಾಜು: {units} ಘಟಕಗಳು ಅಗತ್ಯವಿದೆ (ಅಂದಾಜು ವೆಚ್ಚ ₹{cost:,.0f}, ತಾಪಮಾನ: {temp}). ವಿವರಗಳಿಗಾಗಿ /post-harvest ತೆರೆಯಿರಿ."
        if lang == "hi":
            return f"{comm} पैकेजिंग अनुमान: {units} यूनिट आवश्यक हैं (अनुमानित लागत ₹{cost:,.0f}, तापमान: {temp})। /post-harvest खोलें।"
        if lang == "te":
            return f"{comm} ప్యాకేజింగ్ అంచనా: {units} యూనిట్లు అవసరం (అంచనా ఖర్చు ₹{cost:,.0f}, ఉష్ణోగ్రత: {temp}). /post-harvest తెరవండి."
        return f"Packaging estimate for {comm}: {units} crate/bag units needed (est. ₹{cost:,.0f}, target {temp}). Open /post-harvest for full layers and QR passport."

    if intent == "equipment_query":
        cnt = d.get("available_count", 0)
        b_cnt = d.get("bookings_count", 0)
        sav = d.get("financial_summary", {}).get("estimated_shared_savings_inr", 0)
        top = d.get("top_listings", [])
        top_txt = f" Top listing: {top[0]['equipment_name']} at ₹{top[0]['rental_rate_inr']}/{top[0]['rate_unit']}." if top else " Register or browse machinery on /resources."
        if lang == "kn":
            return f"ಯಂತ್ರೋಪಕರಣ ಸಂಪರ್ಕ: {cnt} ಲಭ್ಯವಿರುವ ಯಂತ್ರಗಳು, {b_cnt} ನಿಮ್ಮ ಬುಕಿಂಗ್‌ಗಳು, ಅಂದಾಜು ಹಂಚಿಕೆ ಉಳಿತಾಯ ₹{sav:,.0f}.{top_txt}"
        if lang == "hi":
            return f"उपकरण कनेक्ट: {cnt} उपलब्ध मशीनें, {b_cnt} आपकी बुकिंग, अनुमानित साझा बचत ₹{sav:,.0f}।{top_txt}"
        if lang == "te":
            return f"పరికరాల కనెక్ట్: {cnt} అందుబాటులో ఉన్న యంత్రాలు, {b_cnt} మీ బుకింగ్‌లు, అంచనా ఆదా ₹{sav:,.0f}.{top_txt}"
        return f"Equipment Connect: {cnt} active machinery listings, {b_cnt} bookings on your account, and ₹{sav:,.0f} estimated shared rental savings.{top_txt} Open /resources to schedule or optimize shared bookings."

    if intent == "post_harvest_query":
        inv = d.get("inventory_summary", {})
        rec_t = d.get("recommended_temp_c", {})
        opt = d.get("optimal_shelf_life_days", {})
        amb = d.get("ambient_shelf_life_days", {})
        avail = inv.get("total_available_kg", 0)
        if lang == "kn":
            return (
                f"{d.get('crop')} ಸಂಗ್ರಹಣೆ: ತಾಪಮಾನ {rec_t.get('min')}–{rec_t.get('max')}°C, ಶೆಲ್ಫ್ ಲೈಫ್ {amb.get('min')}–{amb.get('max')} ದಿನ (ಸಾಮಾನ್ಯ) / {opt.get('min')}–{opt.get('max')} ದಿನ (ಸೂಕ್ತ). "
                f"ಲಭ್ಯವಿರುವ ದಾಸ್ತಾನು: {avail:,.0f} ಕೆಜಿ."
            )
        if lang == "hi":
            return (
                f"{d.get('crop')} भंडारण: तापमान {rec_t.get('min')}–{rec_t.get('max')}°C, शेल्फ लाइफ {amb.get('min')}–{amb.get('max')} दिन (सामान्य) / {opt.get('min')}–{opt.get('max')} दिन (उचित भंडारण)। "
                f"उपलब्ध स्टॉक: {avail:,.0f} किग्रा।"
            )
        if lang == "te":
            return (
                f"{d.get('crop')} నిల్వ: ఉష్ణోగ్రత {rec_t.get('min')}–{rec_t.get('max')}°C, నిల్వ కాలం {amb.get('min')}–{amb.get('max')} రోజులు / {opt.get('min')}–{opt.get('max')} రోజులు. "
                f"అందుబాటులో ఉన్న స్టాక్: {avail:,.0f} కిలోలు."
            )
        return (
            f"{d.get('crop')} storage guide: {rec_t.get('min')}–{rec_t.get('max')}°C, ambient shelf life {amb.get('min')}–{amb.get('max')} days "
            f"(up to {opt.get('min')}–{opt.get('max')} days in optimal storage). Current available inventory: {avail:,.0f} kg. "
            f"Use /post-harvest to compare Sell Now vs Store with your exact prices and transport costs."
        )

    if intent == "satellite_intelligence":
        if d.get("error"):
            return d["error"]
        idx = d.get("indices", {})
        ndvi_txt = f"NDVI {idx['ndvi']:.3f}" if idx.get("ndvi") is not None else "band stats awaiting Sentinel Hub / manual input"
        cloud_txt = f"{d['cloud_cover_pct']:.1f}%" if d.get("cloud_cover_pct") is not None else "N/A"
        acq_txt = (d.get("acquisition_date") or "N/A")[:10]
        if lang == "kn":
            return f"ಉಪಗ್ರಹ ವಿಶ್ಲೇಷಣೆ ({d.get('farm_name')}): ದಿನಾಂಕ {acq_txt}, ಮೋಡ {cloud_txt}, {ndvi_txt}. ಸ್ಥಿತಿ: {d.get('canopy_status')}. {d.get('irrigation_guidance', '')}"
        if lang == "hi":
            return f"उपग्रह विश्लेषण ({d.get('farm_name')}): तिथि {acq_txt}, बादल {cloud_txt}, {ndvi_txt}। स्थिति: {d.get('canopy_status')}। {d.get('irrigation_guidance', '')}"
        if lang == "te":
            return f"ఉపగ్రహ విశ్లేషణ ({d.get('farm_name')}): తేదీ {acq_txt}, మేఘాలు {cloud_txt}, {ndvi_txt}. స్థితి: {d.get('canopy_status')}."
        return (
            f"Satellite intelligence for {d.get('farm_name')} (scene {acq_txt}, cloud {cloud_txt}, mode: {d.get('source_mode')}): "
            f"{ndvi_txt}. Canopy: {d.get('canopy_status')}. {d.get('irrigation_guidance', '')}"
        )

    if intent == "irrigation_weather":
        if "action" in d:
            if lang == "kn":
                return f"ಹವಾಮಾನ: {d['temperature_c']}°C, ಮುಂದಿನ 48 ಗಂಟೆ ಮಳೆ {d['rain_48h_mm']} mm. ಶಿಫಾರಸು: {d['action']}. ({d['reason']})"
            if lang == "hi":
                return f"मौसम: {d['temperature_c']}°C, अगले 48 घंटे में बारिश {d['rain_48h_mm']} mm। सलाह: {d['action']}। ({d['reason']})"
            if lang == "te":
                return f"వాతావరణం: {d['temperature_c']}°C, రాబోయే 48 గంటల్లో వర్షం {d['rain_48h_mm']} mm. సూచన: {d['action']}."
            return f"{d['recommendation_title']}: {d['action']}. {d['reason']} (48h forecast rain: {d['rain_48h_mm']} mm, ET0: {d['et0_mm']} mm/day)."
        return f"Current temperature is {d.get('temperature_c')}°C with {d.get('rain_48h_mm')} mm rain expected in the next 48 hours."

    if intent in ("finance_query", "finance_what_if"):
        if d.get("error"):
            return d["error"]
        if d.get("what_if_note"):
            return d["what_if_note"]
        if lang == "kn":
            return (
                f"ಹಣಕಾಸು ಸಾರಾಂಶ: ಬಜೆಟ್ ₹{d['allocated_budget_inr']:,.0f}, ದಾಖಲಾದ ವೆಚ್ಚ ₹{d['actual_recorded_expenses_inr']:,.0f}, "
                f"ಉಳಿದ ಬಜೆಟ್ ₹{d['remaining_budget_inr']:,.0f}. ದೃಢೀಕೃತ ಮಾರಾಟ ₹{d['confirmed_sales_value_inr']:,.0f}, "
                f"ಸ್ವೀಕರಿಸಿದ ಪಾವತಿ ₹{d['received_payments_inr']:,.0f}, ನೈಜ ನಿವ್ವಳ ಲಾಭ ₹{d['realized_net_profit_inr']:,.0f}."
            )
        if lang == "hi":
            return (
                f"वित्तीय सारांश: बजट ₹{d['allocated_budget_inr']:,.0f}, दर्ज खर्च ₹{d['actual_recorded_expenses_inr']:,.0f}, "
                f"शेष बजट ₹{d['remaining_budget_inr']:,.0f}। पुष्ट बिक्री ₹{d['confirmed_sales_value_inr']:,.0f}, "
                f"प्राप्त भुगतान ₹{d['received_payments_inr']:,.0f}, वास्तविक शुद्ध लाभ ₹{d['realized_net_profit_inr']:,.0f}।"
            )
        if lang == "te":
            return (
                f"ఆర్థిక సారాంశం: బడ్జెట్ ₹{d['allocated_budget_inr']:,.0f}, నమోదైన ఖర్చు ₹{d['actual_recorded_expenses_inr']:,.0f}, "
                f"మిగిలిన బడ్జెట్ ₹{d['remaining_budget_inr']:,.0f}. నిర్ధారించిన అమ్మకం ₹{d['confirmed_sales_value_inr']:,.0f}, "
                f"నిజమైన నికర లాభం ₹{d['realized_net_profit_inr']:,.0f}."
            )
        be = f"₹{d['break_even_price_per_kg']}/kg" if d.get("break_even_price_per_kg") is not None else "N/A"
        return (
            f"Budget: ₹{d['allocated_budget_inr']:,.0f} (Remaining: ₹{d['remaining_budget_inr']:,.0f}). "
            f"Recorded expenses: ₹{d['actual_recorded_expenses_inr']:,.0f} (+ ₹{d['committed_expenses_inr']:,.0f} committed). "
            f"Confirmed sales: ₹{d['confirmed_sales_value_inr']:,.0f} (Received cash: ₹{d['received_payments_inr']:,.0f}, Outstanding: ₹{d['outstanding_payments_inr']:,.0f}). "
            f"Realized net profit: ₹{d['realized_net_profit_inr']:,.0f} | Estimated profit (confirmed orders): ₹{d['estimated_net_profit_inr']:,.0f} | Break-even: {be}."
        )

    if intent == "crop_recommend":
        top = d["ranked"][0]
        return (
            f"Based on your {d['soil']} soil and ₹{d['budget']:,.0f} budget, top recommended crop is {top['crop']} "
            f"({top['variety']}) with estimated cost ₹{top['cost_per_acre']:,.0f}/acre and est. profit ₹{top['est_profit_per_acre']:,.0f}/acre."
        )

    if intent == "research":
        papers = d.get("papers", [])
        return f"Retrieved {len(papers)} peer-reviewed study/studies for {d.get('crop')} from Europe PMC: " + "; ".join(papers)

    if intent == "nursery":
        return f"Found {d.get('count', 0)} certified nurseries for {d.get('crop')}. Closest match: {d.get('top') or 'See directory'}."

    if intent == "soil":
        return f"Soil type: {d.get('soil_type')}. Key recommendations: " + " ".join(d.get("actions", [])[:2])

    if intent == "digital_farm_control":
        return f"Sent '{d.get('action')}' command to your Digital Farm Simulator."

    if intent in ("labour_hire", "bidding_draft", "transport_draft"):
        return f"Prepared action preview: {d.get('summary')} Please confirm to execute or cancel."

    if intent == "labour_lookup":
        if user_role == "labour":
            return f"Your recorded labour earnings total ₹{d.get('earnings', 0):,.0f}, with {d.get('open_jobs', 0)} open agricultural jobs available."
        return f"Found {d.get('workers_count', 0)} available agricultural workers in Labour Connect."

    if intent in ("bidding_offers", "orders_status"):
        return f"Smart Bidding has {d.get('active_listings', 0)} active produce listing(s) and {d.get('orders', 0)} purchase order(s) for your account."

    if intent in ("transport_find", "transport_status"):
        return f"Found {d.get('vehicle_count', 0)} capacity-compatible transport vehicle(s) for {d.get('weight_kg', 1500):,.0f} kg. Top option: {d.get('top_driver') or 'Check Transport Connect'}."

    if intent == "schemes":
        return "Verified Indian agricultural schemes include: " + ", ".join(d.get("schemes", [])) + ". Open the official links in the card to verify eligibility."

    if intent == "crop_health":
        return (
            f"Crop Doctor (AD-22) trained pathology model status for {d.get('crop')}: "
            f"{'Available' if d.get('model_available') else 'Pending local model weights'}. "
            "No disease diagnosis is fabricated offline; please upload a clear leaf image on /crop-health or consult your local Krishi Vigyan Kendra (KVK)."
        )

    return "I could not match a specific farm tool locally for that request. Try asking about irrigation, crop planning, labour, Smart Bidding, transport, government schemes, or your farm finances."


async def handle_assistant_chat(
    *,
    cursor,
    user: Dict[str, str],
    farm: Optional[Dict[str, Any]],
    message: str,
    conversation_id: Optional[str],
    preferred_lang: Optional[str],
) -> AssistantChatResponse:
    now_iso = datetime.now(timezone.utc).isoformat()
    lang = detect_language(message, preferred_lang)

    # Load or initialize conversation scoped strictly to authenticated user
    conv_row = None
    if conversation_id:
        conv_row = cursor.execute(
            "SELECT * FROM assistant_conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user["user_id"]),
        ).fetchone()

    if conv_row:
        conv_id = conv_row["id"]
        messages = json.loads(conv_row["messages_json"] or "[]")
        pending_task = json.loads(conv_row["pending_task_json"]) if conv_row["pending_task_json"] else None
        # Reset pending task if farmer switched to a different farm
        if farm and conv_row["farm_id"] and conv_row["farm_id"] != farm["id"]:
            pending_task = None
    else:
        conv_id = f"conv_{uuid.uuid4().hex[:10]}"
        messages = []
        pending_task = None

    lowered = message.strip().lower()
    if re.match(r"^(cancel|stop|abort|nevermind|ಬೇಡ|रद्द|नहीं|వద్దు)\b", lowered) and pending_task:
        pending_task = None
        reply_text = _localized_prompt("cancelled", lang)
        messages = (messages + [{"role": "user", "text": message}, {"role": "assistant", "text": reply_text}])[-30:]
        _save_conversation(cursor, conv_id, user["user_id"], farm["id"] if farm else None, lang, message[:48], messages, None, now_iso)
        return AssistantChatResponse(
            conversation_id=conv_id,
            reply=reply_text,
            language=lang,
            mode="local_intelligence",
            intent="cancelled",
            provenance="Conversation Context Manager",
        )

    # Multiturn slot-filling & user corrections for BioIntel crop planning
    if pending_task and pending_task.get("kind") == "biointel_plan":
        if user["role"] not in ("farmer", "admin"):
            pending_task = None
        else:
            new_crop = extract_crop(message)
            new_area = extract_area_acres(message)
            new_budget = extract_budget_inr(message)
            new_water = extract_water_availability(message)

            if new_crop:
                pending_task["crop"] = new_crop
            if new_area is not None:
                pending_task["area_acres"] = new_area
            if new_budget is not None:
                pending_task["budget_inr"] = new_budget
            if new_water is not None:
                pending_task["water"] = new_water

            if any(x is not None for x in (new_crop, new_area, new_budget, new_water)):
                return await _progress_biointel_slots(
                    cursor=cursor,
                    conv_id=conv_id,
                    user=user,
                    farm=farm,
                    lang=lang,
                    message=message,
                    messages=messages,
                    draft=pending_task,
                    now_iso=now_iso,
                )

    classified = classify_intent(message, user["role"])
    intent = classified["intent"]

    # Handle incremental BioIntel voice/chat form controls ("Select tomato", "Set my budget to ₹50,000", "Calculate my cultivation investment")
    if intent == "biointel_slot":
        if user["role"] not in ("farmer", "admin"):
            reply_text = "Seed investment planning is restricted to Farmer accounts."
            messages = (messages + [{"role": "user", "text": message}, {"role": "assistant", "text": reply_text}])[-30:]
            _save_conversation(cursor, conv_id, user["user_id"], None, lang, message[:48], messages, None, now_iso)
            return AssistantChatResponse(
                conversation_id=conv_id,
                reply=reply_text,
                language=lang,
                mode="local_intelligence",
                intent=intent,
                provenance="RBAC Authorization Check",
            )

        existing_form = pending_task if (pending_task and pending_task.get("kind") in ("biointel_form", "biointel_plan")) else {}
        default_area = round(float(farm["land_area_ha"]) * 2.471, 1) if farm and farm.get("land_area_ha") else 2.0
        default_budget = float(farm["cultivation_budget_inr"]) if farm and farm.get("cultivation_budget_inr") else 50000.0
        draft = {
            "kind": "biointel_form",
            "crop": classified.get("crop") or existing_form.get("crop") or (farm["primary_crop"] if farm else "Tomato"),
            "area_acres": classified.get("area_acres") if classified.get("area_acres") is not None else (existing_form.get("area_acres") or default_area),
            "budget_inr": classified.get("budget_inr") if classified.get("budget_inr") is not None else (existing_form.get("budget_inr") or default_budget),
            "water": classified.get("water") or existing_form.get("water") or "Moderate",
        }
        if classified.get("auto_generate"):
            tool_res = await execute_tool(
                "generate_seed_investment_plan",
                cursor=cursor,
                user=user,
                farm=farm,
                params=draft,
                conversation_id=conv_id,
            )
            reply_text = _build_local_reply("biointel_plan", lang, tool_res, user["role"], draft)
            messages = (messages + [{"role": "user", "text": message}, {"role": "assistant", "text": reply_text}])[-30:]
            _save_conversation(cursor, conv_id, user["user_id"], farm["id"] if farm else None, lang, message[:48], messages, None, now_iso)
            return AssistantChatResponse(
                conversation_id=conv_id,
                reply=reply_text,
                language=lang,
                mode="local_intelligence",
                intent=intent,
                tools_used=["generate_seed_investment_plan"],
                provenance=tool_res["provenance"],
                sources=tool_res.get("sources", []),
                cards=tool_res.get("cards", []),
                client_directive=tool_res.get("client_directive"),
            )

        partial_payload: Dict[str, Any] = {"userId": user["user_id"], "autoGenerate": False}
        if classified.get("crop"):
            partial_payload["crop"] = classified["crop"]
        if classified.get("area_acres") is not None:
            partial_payload["areaAcres"] = classified["area_acres"]
        if classified.get("budget_inr") is not None:
            partial_payload["budgetInr"] = classified["budget_inr"]
        if classified.get("water"):
            partial_payload["waterAvailability"] = classified["water"]

        reply_map = {
            "kn": f"BioIntel ನವೀಕರಿಸಲಾಗಿದೆ — ಬೆಳೆ: {draft['crop']}, ವಿಸ್ತೀರ್ಣ: {draft['area_acres']} ಎಕರೆ, ಬಜೆಟ್: ₹{draft['budget_inr']:,.0f}. 'Calculate my cultivation investment' ಎಂದು ಹೇಳಿ.",
            "hi": f"BioIntel अपडेट किया गया — फसल: {draft['crop']}, क्षेत्रफल: {draft['area_acres']} एकड़, बजट: ₹{draft['budget_inr']:,.0f}। 'Calculate my cultivation investment' कहें।",
            "te": f"BioIntel నవీకరించబడింది — పంట: {draft['crop']}, విస్తీర్ణం: {draft['area_acres']} ఎకరాలు, బడ్జెట్: ₹{draft['budget_inr']:,.0f}. 'Calculate my cultivation investment' అని చెప్పండి.",
            "en": f"Updated BioIntel planner — Crop: {draft['crop']}, Area: {draft['area_acres']} acres, Budget: ₹{draft['budget_inr']:,.0f}. Say 'Calculate my cultivation investment' to run the full calculation.",
        }
        reply_text = reply_map[lang]
        messages = (messages + [{"role": "user", "text": message}, {"role": "assistant", "text": reply_text}])[-30:]
        _save_conversation(cursor, conv_id, user["user_id"], farm["id"] if farm else None, lang, message[:48], messages, draft, now_iso)
        return AssistantChatResponse(
            conversation_id=conv_id,
            reply=reply_text,
            language=lang,
            mode="local_intelligence",
            intent=intent,
            provenance="BioIntel Incremental Form Control",
            client_directive={"directive_type": "biointel_fill", "route": "/biointel", "payload": partial_payload},
        )

    # Start multiturn BioIntel planning if user intends crop planning
    if intent == "biointel_plan":
        if user["role"] not in ("farmer", "admin"):
            reply_text = "Seed investment planning is restricted to Farmer accounts."
            messages = (messages + [{"role": "user", "text": message}, {"role": "assistant", "text": reply_text}])[-30:]
            _save_conversation(cursor, conv_id, user["user_id"], None, lang, message[:48], messages, None, now_iso)
            return AssistantChatResponse(
                conversation_id=conv_id,
                reply=reply_text,
                language=lang,
                mode="local_intelligence",
                intent=intent,
                provenance="RBAC Authorization Check",
            )
        draft = {
            "kind": "biointel_plan",
            "crop": classified.get("crop") or (farm["primary_crop"] if farm else "Tomato"),
            "area_acres": classified.get("area_acres"),
            "budget_inr": classified.get("budget_inr"),
            "water": classified.get("water"),
        }
        return await _progress_biointel_slots(
            cursor=cursor,
            conv_id=conv_id,
            user=user,
            farm=farm,
            lang=lang,
            message=message,
            messages=messages,
            draft=draft,
            now_iso=now_iso,
        )

    # Map intent to allowlisted tool
    tool_map = {
        "irrigation_weather": ("get_irrigation_and_weather", {}),
        "soil": ("get_soil_recommendations", {}),
        "crop_recommend": ("recommend_crops", {}),
        "research": ("retrieve_scientific_research", {"crop": classified.get("crop")}),
        "nursery": ("find_nurseries", {"crop": classified.get("crop")}),
        "digital_farm_control": ("control_digital_farm", {"action": classified.get("action")}),
        "labour_hire": ("prepare_labour_job_draft", {"workers": classified.get("workers"), "work_type": classified.get("work_type")}),
        "labour_lookup": ("lookup_labour_info", {}),
        "bidding_offers": ("get_bidding_and_orders", {}),
        "orders_status": ("get_bidding_and_orders", {}),
        "bidding_draft": ("prepare_bidding_listing_draft", {"crop": classified.get("crop"), "quantity_kg": classified.get("quantity_kg")}),
        "transport_find": ("find_transport_and_optimize", {"weight_kg": classified.get("weight_kg"), "crop": classified.get("crop")}),
        "transport_status": ("find_transport_and_optimize", {"weight_kg": 1500}),
        "transport_draft": ("prepare_transport_booking_draft", {"weight_kg": classified.get("weight_kg"), "crop": classified.get("crop")}),
        "finance_query": ("get_financial_intelligence", {}),
        "finance_what_if": ("get_financial_intelligence", {"price_drop_pct": classified.get("price_drop_pct")}),
        "satellite_intelligence": ("get_satellite_intelligence", {}),
        "post_harvest_query": ("get_post_harvest_intelligence", {"crop": classified.get("crop")}),
        "equipment_query": ("get_equipment_intelligence", {"crop": classified.get("crop")}),
        "market_intelligence_query": ("get_market_intelligence", {"crop": classified.get("crop")}),
        "buyer_discovery_query": ("discover_buyers_tool", {"crop": classified.get("crop"), "weight_kg": classified.get("weight_kg")}),
        "packaging_query": ("get_packaging_recommendation", {"crop": classified.get("crop"), "weight_kg": classified.get("weight_kg")}),
        "decision_intelligence_query": ("get_farm_decision_summary", {}),
        "crop_journey_query": ("get_active_crop_journey", {"crop": classified.get("crop")}),
        "schemes": ("find_government_schemes", {}),
        "crop_health": ("check_crop_health_adapter", {"crop": classified.get("crop")}),
    }

    if intent not in tool_map:
        if intent == "navigate":
            target = _resolve_navigation_target(message, user["role"])
            nav_msg = {
                "kn": f"{target['label']} ತೆರೆಯಲಾಗುತ್ತಿದೆ.",
                "hi": f"{target['label']} खोला जा रहा है।",
                "te": f"{target['label']} తెరుస్తోంది.",
                "en": f"Opening {target['label']}.",
            }[lang]
            messages = (messages + [{"role": "user", "text": message}, {"role": "assistant", "text": nav_msg}])[-30:]
            _save_conversation(cursor, conv_id, user["user_id"], farm["id"] if farm else None, lang, message[:48], messages, None, now_iso)
            return AssistantChatResponse(
                conversation_id=conv_id,
                reply=nav_msg,
                language=lang,
                mode="local_intelligence",
                intent="navigate",
                provenance="Role-Authorized Voice Navigation",
                client_directive={"directive_type": "navigate", "route": target["route"], "payload": {"route": target["route"], "label": target["label"]}},
            )

        eff_lang = classified.get("target_lang") or lang
        reply_text, mode_val, prov_val = await generate_general_or_followup_reply(
            intent=intent,
            message=message,
            eff_lang=eff_lang,
            role=user["role"],
            farm=farm,
            history=messages,
        )
        messages = (messages + [{"role": "user", "text": message}, {"role": "assistant", "text": reply_text}])[-30:]
        _save_conversation(cursor, conv_id, user["user_id"], farm["id"] if farm else None, eff_lang, message[:48], messages, None, now_iso)
        return AssistantChatResponse(
            conversation_id=conv_id,
            reply=reply_text,
            language=eff_lang,
            mode=mode_val,
            intent=intent,
            provenance=prov_val,
        )

    tool_name, tool_params = tool_map[intent]
    tool_res = await execute_tool(
        tool_name,
        cursor=cursor,
        user=user,
        farm=farm,
        params=tool_params,
        conversation_id=conv_id,
    )

    mode = "local_intelligence"
    reply_text = None
    if tool_res.get("authorized", True) and intent not in ("labour_hire", "bidding_draft", "transport_draft", "digital_farm_control"):
        gem = await _synthesize_with_gemini(
            user_message=message,
            lang=lang,
            role=user["role"],
            tool_name=tool_name,
            tool_data=tool_res.get("data", {}),
            provenance=tool_res.get("provenance", "RaithaMitra"),
        )
        if gem:
            reply_text = gem
            mode = "online_gemini"

    if not reply_text:
        reply_text = _build_local_reply(intent, lang, tool_res, user["role"], tool_params)

    messages = (messages + [{"role": "user", "text": message}, {"role": "assistant", "text": reply_text}])[-30:]
    _save_conversation(cursor, conv_id, user["user_id"], farm["id"] if farm else None, lang, message[:48], messages, None, now_iso)

    return AssistantChatResponse(
        conversation_id=conv_id,
        reply=reply_text,
        language=lang,
        mode=mode,
        intent=intent,
        tools_used=[tool_name],
        provenance=tool_res.get("provenance", "RaithaMitra"),
        sources=tool_res.get("sources", []),
        cards=tool_res.get("cards", []),
        pending_action=tool_res.get("pending_action"),
        client_directive=tool_res.get("client_directive"),
    )


async def _progress_biointel_slots(
    *,
    cursor,
    conv_id: str,
    user: Dict[str, str],
    farm: Optional[Dict[str, Any]],
    lang: SupportedLang,
    message: str,
    messages: List[Dict[str, Any]],
    draft: Dict[str, Any],
    now_iso: str,
) -> AssistantChatResponse:
    if draft.get("area_acres") is None:
        reply_text = _localized_prompt("ask_area", lang, crop=draft["crop"])
        messages = (messages + [{"role": "user", "text": message}, {"role": "assistant", "text": reply_text}])[-30:]
        _save_conversation(cursor, conv_id, user["user_id"], farm["id"] if farm else None, lang, message[:48], messages, draft, now_iso)
        return AssistantChatResponse(
            conversation_id=conv_id,
            reply=reply_text,
            language=lang,
            mode="local_intelligence",
            intent="biointel_plan",
            provenance="Multiturn Slot Collection",
            awaiting_slot="area_acres",
        )

    if draft.get("budget_inr") is None:
        reply_text = _localized_prompt("ask_budget", lang, crop=draft["crop"], area=draft["area_acres"])
        messages = (messages + [{"role": "user", "text": message}, {"role": "assistant", "text": reply_text}])[-30:]
        _save_conversation(cursor, conv_id, user["user_id"], farm["id"] if farm else None, lang, message[:48], messages, draft, now_iso)
        return AssistantChatResponse(
            conversation_id=conv_id,
            reply=reply_text,
            language=lang,
            mode="local_intelligence",
            intent="biointel_plan",
            provenance="Multiturn Slot Collection",
            awaiting_slot="budget_inr",
        )

    if not draft.get("water"):
        reply_text = _localized_prompt(
            "ask_water",
            lang,
            crop=draft["crop"],
            area=draft["area_acres"],
            budget=draft["budget_inr"],
        )
        messages = (messages + [{"role": "user", "text": message}, {"role": "assistant", "text": reply_text}])[-30:]
        _save_conversation(cursor, conv_id, user["user_id"], farm["id"] if farm else None, lang, message[:48], messages, draft, now_iso)
        return AssistantChatResponse(
            conversation_id=conv_id,
            reply=reply_text,
            language=lang,
            mode="local_intelligence",
            intent="biointel_plan",
            provenance="Multiturn Slot Collection",
            awaiting_slot="water",
        )

    tool_res = await execute_tool(
        "generate_seed_investment_plan",
        cursor=cursor,
        user=user,
        farm=farm,
        params=draft,
        conversation_id=conv_id,
    )
    reply_text = _build_local_reply("biointel_plan", lang, tool_res, user["role"], draft)
    messages = (messages + [{"role": "user", "text": message}, {"role": "assistant", "text": reply_text}])[-30:]
    _save_conversation(cursor, conv_id, user["user_id"], farm["id"] if farm else None, lang, message[:48], messages, None, now_iso)
    return AssistantChatResponse(
        conversation_id=conv_id,
        reply=reply_text,
        language=lang,
        mode="local_intelligence",
        intent="biointel_plan",
        tools_used=["generate_seed_investment_plan"],
        provenance=tool_res["provenance"],
        sources=tool_res.get("sources", []),
        cards=tool_res.get("cards", []),
        client_directive=tool_res.get("client_directive"),
    )


def _save_conversation(
    cursor,
    conv_id: str,
    user_id: str,
    farm_id: Optional[str],
    lang: str,
    title: str,
    messages: List[Dict[str, Any]],
    pending_task: Optional[Dict[str, Any]],
    now_iso: str,
) -> None:
    existing = cursor.execute("SELECT id FROM assistant_conversations WHERE id = ?", (conv_id,)).fetchone()
    pending_json = json.dumps(pending_task) if pending_task else None
    msgs_json = json.dumps(messages)
    if existing:
        cursor.execute(
            """
            UPDATE assistant_conversations
            SET farm_id = ?, language = ?, messages_json = ?, pending_task_json = ?, updated_at = ?
            WHERE id = ?
            """,
            (farm_id, lang, msgs_json, pending_json, now_iso, conv_id),
        )
    else:
        cursor.execute(
            """
            INSERT INTO assistant_conversations (id, user_id, farm_id, language, title, messages_json, pending_task_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (conv_id, user_id, farm_id, lang, title, msgs_json, pending_json, now_iso, now_iso),
        )


def confirm_pending_action(cursor, action_id: str, user: Dict[str, str]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    row = cursor.execute("SELECT * FROM assistant_pending_actions WHERE id = ?", (action_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Pending action not found.")
    if row["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized: Action belongs to another user.")
    if row["session_token_hash"] != user["session_hash"]:
        raise HTTPException(status_code=403, detail="Unauthorized: Action confirmation must come from the same authenticated session.")
    if row["status"] == "confirmed":
        raise HTTPException(status_code=409, detail="This action has already been executed. Duplicate submission prevented.")
    if row["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Action cannot be confirmed (status: {row['status']}).")
    if datetime.fromisoformat(row["expires_at"]) < now:
        cursor.execute("UPDATE assistant_pending_actions SET status = 'expired' WHERE id = ?", (action_id,))
        raise HTTPException(status_code=400, detail="Action preview expired. Please request the assistant to draft it again.")

    payload = json.loads(row["payload_json"])
    a_type = row["action_type"]
    now_iso = now.isoformat()

    if a_type == "labour_post":
        job_id = f"job_{uuid.uuid4().hex[:6]}"
        cursor.execute(
            """
            INSERT INTO labour_jobs (id, farmer_id, farmer_name, farm_id, title, job_type, crop_type, work_location, work_date, working_hours, wage_per_day, required_workers, hired_workers_count, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'open', ?)
            """,
            (
                job_id, payload["farmer_id"], payload["farmer_name"], payload.get("farm_id"),
                payload["title"], payload["job_type"], payload["crop_type"], payload["work_location"],
                payload["work_date"], payload["working_hours"], payload["wage_per_day"], payload["required_workers"], now_iso,
            ),
        )
        created_id = job_id
        route = "/labour"
        msg = "Agricultural labour job published successfully."
    elif a_type == "bidding_post":
        list_id = f"list_{uuid.uuid4().hex[:6]}"
        cursor.execute(
            """
            INSERT INTO bidding_listings (id, farmer_id, farmer_name, farm_id, crop_name, variety, quantity_kg, min_price_per_kg, harvest_date, location, bidding_deadline, status, buyer_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?)
            """,
            (
                list_id, payload["farmer_id"], payload["farmer_name"], payload.get("farm_id"),
                payload["crop_name"], payload.get("variety"), payload["quantity_kg"], payload["min_price_per_kg"],
                payload["harvest_date"], payload["location"], payload["bidding_deadline"], now_iso,
            ),
        )
        created_id = list_id
        route = "/smart-market?section=bidding"
        msg = "Produce auction listing published to Smart Bidding."
    elif a_type == "transport_book":
        tb_id = f"tb_{uuid.uuid4().hex[:6]}"
        cursor.execute(
            """
            INSERT INTO transport_bookings (id, farmer_id, farmer_name, driver_id, driver_name, driver_phone, purchase_order_id, produce_type, weight_kg, pickup_location, delivery_destination, pickup_time, vehicle_type, estimated_distance_km, total_fare, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?)
            """,
            (
                tb_id, payload["farmer_id"], payload["farmer_name"], payload["driver_id"], payload["driver_name"],
                payload.get("driver_phone"), payload["produce_type"], payload["weight_kg"], payload["pickup_location"],
                payload["delivery_destination"], payload["pickup_time"], payload["vehicle_type"], payload["estimated_distance_km"],
                payload["total_fare"], now_iso, now_iso,
            ),
        )
        created_id = tb_id
        route = "/transport"
        msg = "Transport freight booking request submitted."
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported action type: {a_type}")

    cursor.execute(
        "UPDATE assistant_pending_actions SET status = 'confirmed' WHERE id = ? AND status = 'pending'",
        (action_id,),
    )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=409, detail="Action already confirmed.")

    return {"status": "confirmed", "action_type": a_type, "created_id": created_id, "route": route, "message": msg}


def cancel_pending_action(cursor, action_id: str, user: Dict[str, str]) -> Dict[str, str]:
    row = cursor.execute("SELECT * FROM assistant_pending_actions WHERE id = ?", (action_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Pending action not found.")
    if row["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Unauthorized: Action belongs to another user.")
    cursor.execute("UPDATE assistant_pending_actions SET status = 'cancelled' WHERE id = ?", (action_id,))
    return {"status": "cancelled", "action_id": action_id, "message": "Action cancelled. No changes were submitted."}
