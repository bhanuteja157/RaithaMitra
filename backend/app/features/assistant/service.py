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
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    data = await fetch_json_with_resilience(
        provider_key="gemini_assistant",
        url=url,
        method="POST",
        json_body={"contents": [{"parts": [{"text": prompt}]}]},
        timeout_s=6.0,
        max_retries=1,
        cache_ttl_s=0,
    )
    candidates = (data or {}).get("candidates", [])
    if candidates:
        parts = candidates[0].get("content", {}).get("parts", [])
        if parts and parts[0].get("text"):
            return parts[0]["text"].strip()
    return None


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
        "schemes": ("find_government_schemes", {}),
        "crop_health": ("check_crop_health_adapter", {"crop": classified.get("crop")}),
    }

    if intent not in tool_map:
        reply_text = _build_local_reply(intent, lang, {"authorized": True, "data": {}}, user["role"], {})
        messages = (messages + [{"role": "user", "text": message}, {"role": "assistant", "text": reply_text}])[-30:]
        _save_conversation(cursor, conv_id, user["user_id"], farm["id"] if farm else None, lang, message[:48], messages, None, now_iso)
        return AssistantChatResponse(
            conversation_id=conv_id,
            reply=reply_text,
            language=lang,
            mode="local_intelligence",
            intent=intent,
            provenance="Local Intelligence Mode",
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
