# backend/app/features/agri_assistant/response_builder.py
"""
Structured Response Card Builder, Proactive Alert Generator, Evidence Citation Compiler,
and Multilingual Deterministic Response Synthesizer (EN / KN / HI / TE) for AD-23.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.features.agri_assistant.schemas import (
    EvidenceSource,
    ProactiveAlert,
    ResponseCard,
    SuggestedAction,
    SupportedLanguage,
)

# Localized concise labels & templates preserving exact numerical values and sources
_FOLLOW_UPS: Dict[SupportedLanguage, List[str]] = {
    "en": [
        "Should I irrigate my crop tomorrow?",
        "Compare maize and tomato for my farm",
        "Where should I sell my produce for best net profit?",
        "What government schemes am I eligible to apply for?",
    ],
    "kn": [
        "ನಾಳೆ ನನ್ನ ಬೆಳೆಗೆ ನೀರಾವರಿ ಕೊಡಬೇಕೇ?",
        "ಮೆಕ್ಕೆಜೋಳ ಮತ್ತು ಟೊಮೆಟೊ ಬೆಳೆಗಳನ್ನು ಹೋಲಿಸಿ",
        "ನನ್ನ ಉತ್ಪನ್ನವನ್ನು ಎಲ್ಲಿ ಮಾರಾಟ ಮಾಡಿದರೆ ಹೆಚ್ಚು ಲಾಭ?",
        "ನನಗೆ ಯಾವ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಲಭ್ಯವಿವೆ?",
    ],
    "hi": [
        "क्या मुझे कल अपनी फसल की सिंचाई करनी चाहिए?",
        "मेरे खेत के लिए मक्का और टमाटर की तुलना करें",
        "अधिकतम शुद्ध लाभ के लिए उपज कहाँ बेचें?",
        "मेरे लिए कौन सी सरकारी योजनाएं उपलब्ध हैं?",
    ],
    "te": [
        "రేపు నా పంటకు నీరు పెట్టాలా?",
        "నా పొలానికి మొక్కజొన్న మరియు టొమాటో పోల్చండి",
        "మంచి నికర లాభం కోసం పంటను ఎక్కడ అమ్మాలి?",
        "నాకు ఏ ప్రభుత్వ పథకాలు అందుబాటులో ఉన్నాయి?",
    ],
}


def get_follow_ups(language: SupportedLanguage) -> List[str]:
    return _FOLLOW_UPS.get(language, _FOLLOW_UPS["en"])


def build_cards_alerts_citations(
    intent: str,
    language: SupportedLanguage,
    tool_outputs: Dict[str, Dict[str, Any]],
    farm: Optional[Dict[str, Any]],
    memory: Dict[str, Any],
    confirmation_card: Optional[ResponseCard] = None,
) -> Dict[str, Any]:
    cards: List[ResponseCard] = []
    alerts: List[ProactiveAlert] = []
    citations: List[EvidenceSource] = []
    suggested_actions: List[SuggestedAction] = []
    now_iso = datetime.now(timezone.utc).isoformat()

    if confirmation_card is not None:
        cards.append(confirmation_card)

    # Compile citations from every executed tool
    for t_name, out in tool_outputs.items():
        if out.get("status") in ("completed", "unavailable"):
            citations.append(
                EvidenceSource(
                    source=str(out.get("source") or t_name),
                    timestamp=str(out.get("timestamp") or now_iso),
                    data_quality=str(out.get("data_quality") or "modeled"),
                    assumptions=list((out.get("data") or {}).get("assumptions") or [])[:3],
                    limitations=list(
                        filter(
                            None,
                            [
                                (out.get("data") or {}).get("unavailable_reason"),
                                (out.get("data") or {}).get("approval_disclaimer"),
                                (out.get("data") or {}).get("safety_notice"),
                            ],
                        )
                    ),
                )
            )

    # 1. BioIntel / Crop Recommendation Card
    if "biointel" in tool_outputs and tool_outputs["biointel"].get("status") == "completed":
        bdata = tool_outputs["biointel"]["data"]
        sel = bdata.get("selected_crop_economics") or {}
        top_crops = bdata.get("top_suitable_crops") or []
        comparisons = bdata.get("comparisons") or []
        varieties = bdata.get("recommended_varieties") or []
        best_crop = top_crops[0] if (intent == "crop_recommendation" and top_crops) else sel

        if not best_crop.get("within_budget", True):
            alerts.append(
                ProactiveAlert(
                    id="alert_budget_exceed",
                    severity="warning",
                    title="Estimated Cultivation Cost Exceeds Budget",
                    message=f"{best_crop.get('crop')} requires ~₹{best_crop.get('total_cultivation_investment_inr', 0):,.0f}, exceeding budget ₹{best_crop.get('budget_inr', 0):,.0f} by ₹{abs(best_crop.get('budget_gap_inr', 0)):,.0f}.",
                    source="BioIntel Deterministic Economics",
                    timestamp=now_iso,
                    action_route="/biointel",
                )
            )

        bio_action = SuggestedAction(
            id="act_open_biointel",
            label="Open BioIntel",
            action_type="navigate",
            route="/biointel",
        )
        suggested_actions.append(bio_action)
        cards.append(
            ResponseCard(
                card_type="crop_recommendation",
                title=f"{best_crop.get('crop', 'Crop')} — Seed & Investment Plan",
                subtitle=f"{best_crop.get('area_acres')} acres • {best_crop.get('duration_days')} days • Water: {best_crop.get('water_need')}",
                badge="Within Budget" if best_crop.get("within_budget") else "Over Budget",
                data={
                    "recommended_crop": best_crop.get("crop"),
                    "suitable_varieties": [v.get("variety_name") for v in varieties] or [best_crop.get("default_variety")],
                    "seed_required_kg": best_crop.get("seed_required_kg"),
                    "seed_cost_inr": best_crop.get("seed_cost_inr"),
                    "estimated_investment_inr": best_crop.get("total_cultivation_investment_inr"),
                    "expected_cultivation_duration_days": best_crop.get("duration_days"),
                    "expected_production_kg": best_crop.get("expected_production_kg"),
                    "expected_revenue_inr": best_crop.get("expected_revenue_inr"),
                    "estimated_profit_inr": best_crop.get("estimated_profit_inr"),
                    "roi_pct": best_crop.get("roi_pct"),
                    "break_even_price_per_kg": best_crop.get("break_even_price_per_kg"),
                    "main_risks": best_crop.get("major_risks", []),
                    "alternatives": [
                        {
                            "crop": c.get("crop"),
                            "investment_inr": c.get("total_cultivation_investment_inr"),
                            "profit_inr": c.get("estimated_profit_inr"),
                            "within_budget": c.get("within_budget"),
                            "suitability_score": c.get("suitability_score"),
                        }
                        for c in top_crops
                    ],
                    "comparisons": comparisons,
                    "nearby_nurseries": bdata.get("nearby_nurseries", []),
                },
                actions=[bio_action],
            )
        )

    # 2. Weather Advisory Card
    if "weather_intelligence" in tool_outputs and tool_outputs["weather_intelligence"].get("status") == "completed":
        wdata = tool_outputs["weather_intelligence"]["data"]
        if float(wdata.get("forecast_48h_rain_mm") or 0) >= 12.0:
            alerts.append(
                ProactiveAlert(
                    id="alert_rain_irrigation",
                    severity="high",
                    title="Forecasted Rainfall Affects Irrigation",
                    message=f"{wdata.get('forecast_48h_rain_mm')} mm rain expected in next 48h — postpone irrigation to prevent waterlogging.",
                    source=str(tool_outputs["weather_intelligence"].get("source")),
                    timestamp=str(tool_outputs["weather_intelligence"].get("timestamp")),
                    action_route="/farm-management?section=irrigation",
                )
            )
        cards.append(
            ResponseCard(
                card_type="weather_advisory",
                title="Weather & Agrometeorological Advisory",
                subtitle=f"{wdata.get('condition')} • {'Live Telemetry' if wdata.get('is_live') else 'Calibrated Fallback'}",
                badge=f"{wdata.get('temperature_c')}°C",
                data={
                    "temperature_c": wdata.get("temperature_c"),
                    "humidity_pct": wdata.get("humidity_pct"),
                    "wind_speed_kmh": wdata.get("wind_speed_kmh"),
                    "precipitation_mm": wdata.get("precipitation_mm"),
                    "forecast_48h_rain_mm": wdata.get("forecast_48h_rain_mm"),
                    "et0_mm_day": wdata.get("et0_mm_day"),
                    "agricultural_risks": wdata.get("agricultural_risks", []),
                    "forecast_3day": wdata.get("forecast_3day", []),
                    "timestamp": tool_outputs["weather_intelligence"].get("timestamp"),
                },
                actions=[
                    SuggestedAction(
                        id="act_open_climate",
                        label="Open Climate View",
                        action_type="navigate",
                        route="/farm-management?section=climate",
                    )
                ],
            )
        )

    # 3. Irrigation Card
    if "precision_irrigation" in tool_outputs and tool_outputs["precision_irrigation"].get("status") == "completed":
        idata = tool_outputs["precision_irrigation"]["data"]
        cards.append(
            ResponseCard(
                card_type="irrigation",
                title="Precision Irrigation Requirement (FAO-56)",
                subtitle=f"{idata.get('crop_type')} ({idata.get('crop_stage')}) • {idata.get('irrigation_method')}",
                badge="Deficit Alert" if idata.get("water_deficit_alert") else "Calculated",
                data={
                    "etc_mm_day": idata.get("etc_mm_day"),
                    "gross_irrigation_mm": idata.get("gross_irrigation_mm"),
                    "gross_volume_m3": idata.get("gross_volume_m3"),
                    "available_water_m3": idata.get("available_water_m3"),
                    "estimated_duration_hours": idata.get("estimated_duration_hours"),
                    "forecast_rain_48h_mm": idata.get("forecast_rain_48h_mm"),
                    "estimated_soil_moisture_pct": idata.get("estimated_soil_moisture_pct"),
                    "soil_moisture_is_measured": False,
                    "water_deficit_status": "Warning" if idata.get("water_deficit_alert") else "Sufficient",
                    "warnings": idata.get("water_availability_warnings", []),
                    "missing_measurements": idata.get("missing_measurements", []),
                    "recommended_timing": idata.get("recommended_timing"),
                },
                actions=[
                    SuggestedAction(
                        id="act_open_irrigation",
                        label="Open Precision Irrigation",
                        action_type="navigate",
                        route="/farm-management?section=irrigation",
                    )
                ],
            )
        )

    # 4. Soil Intelligence Card
    if "soil_intelligence" in tool_outputs and tool_outputs["soil_intelligence"].get("status") == "completed":
        sdata = tool_outputs["soil_intelligence"]["data"]
        cards.append(
            ResponseCard(
                card_type="soil",
                title="Soil & Nutrient Intelligence (ICAR)",
                subtitle=f"{sdata.get('soil_texture')} • {sdata.get('crop_type')}",
                badge="Lab Needed" if sdata.get("missing_soil_readings") else "Lab Evaluated",
                data={
                    "optimal_ph_range": sdata.get("optimal_ph_range"),
                    "nutrient_status": sdata.get("nutrient_status"),
                    "missing_soil_readings": sdata.get("missing_soil_readings", []),
                    "deficiencies": sdata.get("deficiencies", []),
                    "recommended_actions": sdata.get("recommended_actions", []),
                },
                actions=[
                    SuggestedAction(
                        id="act_open_soil",
                        label="Open Soil & Nutrients",
                        action_type="navigate",
                        route="/farm-management?section=soil",
                    )
                ],
            )
        )

    # 5. Crop Diagnosis Card (AD-22)
    if "crop_doctor" in tool_outputs:
        cdata = tool_outputs["crop_doctor"].get("data") or {}
        is_avail = tool_outputs["crop_doctor"].get("status") == "completed" and cdata.get("ad22_available")
        hist = cdata.get("diagnostic_history") or []
        latest = hist[0] if hist else {}
        if not is_avail:
            alerts.append(
                ProactiveAlert(
                    id="alert_crop_doctor_unavailable",
                    severity="info",
                    title="Crop Doctor (AD-22) Diagnostics Pending Merge",
                    message="Automated leaf disease inference is unavailable until AD-22 is merged/configured. Inspect leaves physically or consult KVK.",
                    source="Tool F — Crop Doctor Guard",
                    timestamp=now_iso,
                    action_route="/crop-health",
                )
            )
        crop_health_action = SuggestedAction(
            id="act_open_crop_health",
            label="Open Crop Health",
            action_type="navigate",
            route="/crop-health",
        )
        suggested_actions.append(crop_health_action)
        cards.append(
            ResponseCard(
                card_type="crop_diagnosis",
                title="Crop Health & Disease Diagnostics (AD-22)",
                subtitle="Available" if is_avail else "Model Unavailable (AD-22 Not Merged)",
                badge="Unavailable" if not is_avail else "Verified Record",
                data={
                    "ad22_available": is_avail,
                    "suspected_disease": latest.get("disease_label", "Not available"),
                    "model_score": latest.get("confidence_score"),
                    "uncertainty_warning": "Visual diagnosis cannot replace field pathology confirmation; never apply unverified pesticide doses.",
                    "unavailable_reason": cdata.get("unavailable_reason"),
                    "recommended_next_steps": [
                        "Inspect lower leaves for lesions, wilting, or whitefly vectors.",
                        "Upload leaf images in Crop Health once AD-22 model weights are configured.",
                    ],
                },
                actions=[crop_health_action],
            )
        )

    # 6. Digital Farm Card
    if "digital_farm" in tool_outputs and tool_outputs["digital_farm"].get("status") == "completed":
        ddata = tool_outputs["digital_farm"]["data"]
        days_left = int(ddata.get("days_until_harvest") or 30)
        if days_left <= 14:
            alerts.append(
                ProactiveAlert(
                    id="alert_harvest_window",
                    severity="warning",
                    title="Harvest Window Approaching",
                    message=f"{ddata.get('crop')} expected harvest is in ~{days_left} days ({ddata.get('expected_harvest_date')}). Plan labour & market listing.",
                    source="Digital Farm Twin Timeline",
                    timestamp=now_iso,
                    action_route="/digital-farming",
                )
            )
        df_action = SuggestedAction(
            id="act_open_digital_farm",
            label="Open Digital Farm",
            action_type="navigate",
            route="/digital-farming",
        )
        suggested_actions.append(df_action)
        cards.append(
            ResponseCard(
                card_type="digital_farm",
                title="Digital Farm Growth & Harvest Projection",
                subtitle=f"{ddata.get('crop')} • Stage: {ddata.get('growth_stage')}",
                badge="Frontend Context" if ddata.get("frontend_context_present") else "Water-Balance Model",
                data={
                    "growth_stage": ddata.get("growth_stage"),
                    "expected_harvest_date": ddata.get("expected_harvest_date"),
                    "days_until_harvest": days_left,
                    "estimated_production_kg": ddata.get("estimated_production_kg"),
                    "assumptions": ddata.get("simulation_assumptions", []),
                    "frontend_simulation_context": ddata.get("frontend_simulation_context"),
                },
                actions=[df_action],
            )
        )

    # 7. Market Comparison Card
    if "market_intelligence" in tool_outputs and tool_outputs["market_intelligence"].get("status") == "completed":
        mdata = tool_outputs["market_intelligence"]["data"]
        if not mdata.get("official_api_configured"):
            alerts.append(
                ProactiveAlert(
                    id="alert_market_demo_data",
                    severity="info",
                    title="Market Prices Include Demonstration Benchmarks",
                    message="DATA_GOV_IN_API_KEY is not configured; market comparison combines your Smart Bidding offers with clearly labelled demonstration APMC benchmarks.",
                    source="Market Intelligence Registry",
                    timestamp=now_iso,
                    action_route="/smart-market?section=market_intel",
                )
            )
        cards.append(
            ResponseCard(
                card_type="market_comparison",
                title=f"Market & Net Revenue Comparison — {mdata.get('crop')}",
                subtitle=f"Lot size evaluated: {mdata.get('quantity_kg')} kg",
                badge="Live + Demo" if any(not o["is_demo"] for o in mdata.get("market_options", [])) else "Demonstration Dataset",
                data={
                    "markets": mdata.get("market_options", []),
                    "sell_vs_wait_analysis": mdata.get("sell_vs_wait_analysis"),
                    "official_api_configured": mdata.get("official_api_configured"),
                },
                actions=[
                    SuggestedAction(
                        id="act_open_market",
                        label="Open Market Intelligence",
                        action_type="navigate",
                        route="/smart-market?section=market_intel",
                    )
                ],
            )
        )

    # 8. Smart Bidding Card
    if "smart_bidding" in tool_outputs and tool_outputs["smart_bidding"].get("status") == "completed":
        bid_data = tool_outputs["smart_bidding"]["data"]
        orders = bid_data.get("confirmed_orders") or []
        unarranged = [o for o in orders if o.get("status") == "confirmed"]
        if unarranged:
            alerts.append(
                ProactiveAlert(
                    id="alert_po_transport",
                    severity="high",
                    title="Confirmed Purchase Order Needs Transport",
                    message=f"Order {unarranged[0]['id']} ({unarranged[0]['quantity_kg']} kg {unarranged[0]['crop_name']}) is confirmed and awaiting transport booking.",
                    source="Smart Bidding Orders",
                    timestamp=str(unarranged[0].get("created_at") or now_iso),
                    action_route="/transport",
                )
            )
        for lst in bid_data.get("listings") or []:
            if lst.get("status") == "active" and (lst.get("buyer_count") or 0) > 0:
                alerts.append(
                    ProactiveAlert(
                        id=f"alert_new_bid_{lst['id']}",
                        severity="info",
                        title="Active Buyer Bids Received",
                        message=f"Listing {lst['id']} ({lst['crop_name']}) has {lst['buyer_count']} bid(s), highest ₹{lst.get('highest_bid_per_kg')}/kg.",
                        source="Smart Bidding Live Ledger",
                        timestamp=str(lst.get("created_at") or now_iso),
                        action_route="/smart-market?section=bidding",
                    )
                )
                break
        cards.append(
            ResponseCard(
                card_type="bidding",
                title="Smart Bidding & Purchase Orders",
                subtitle=f"{bid_data.get('active_listings_count')} active listings • {bid_data.get('confirmed_orders_count')} confirmed orders",
                badge="Live SQLite",
                data=bid_data,
                actions=[
                    SuggestedAction(
                        id="act_open_bidding",
                        label="Open Smart Bidding",
                        action_type="navigate",
                        route="/smart-market?section=bidding",
                    )
                ],
            )
        )

    # 9. Transport Card
    if "transport_connect" in tool_outputs and tool_outputs["transport_connect"].get("status") == "completed":
        tdata = tool_outputs["transport_connect"]["data"]
        cards.append(
            ResponseCard(
                card_type="transport",
                title="Transport Connect & Freight Estimates",
                subtitle=f"{len(tdata.get('available_drivers', []))} available vehicle(s) • {len(tdata.get('bookings', []))} booking(s)",
                badge="Live SQLite",
                data=tdata,
                actions=[
                    SuggestedAction(
                        id="act_open_transport",
                        label="Open Transport Connect",
                        action_type="navigate",
                        route="/transport",
                    )
                ],
            )
        )

    # 10. Labour Card
    if "labour_connect" in tool_outputs and tool_outputs["labour_connect"].get("status") == "completed":
        ldata = tool_outputs["labour_connect"]["data"]
        cards.append(
            ResponseCard(
                card_type="labour",
                title="Labour Connect & Crew Planning",
                subtitle=f"{ldata.get('available_workers_count')} available workers • Avg ₹{ldata.get('average_daily_wage_inr')}/day",
                badge="Live SQLite",
                data=ldata,
                actions=[
                    SuggestedAction(
                        id="act_open_labour",
                        label="Open Labour Connect",
                        action_type="navigate",
                        route="/labour",
                    )
                ],
            )
        )

    # 11. Finance Card
    if "finance" in tool_outputs and tool_outputs["finance"].get("status") == "completed":
        fdata = tool_outputs["finance"]["data"]
        cards.append(
            ResponseCard(
                card_type="finance",
                title="Farm Finance & Risk Simulation",
                subtitle=f"Registered Budget ₹{fdata.get('allocated_budget_inr', 0):,.0f}",
                badge="AD-24 Ready",
                data=fdata,
                actions=[
                    SuggestedAction(
                        id="act_open_finance",
                        label="Open Finance & Benefits",
                        action_type="navigate",
                        route="/finance-benefits?section=finance",
                    )
                ],
            )
        )

    # 12. Schemes Card
    if "government_schemes" in tool_outputs and tool_outputs["government_schemes"].get("status") == "completed":
        gdata = tool_outputs["government_schemes"]["data"]
        cards.append(
            ResponseCard(
                card_type="schemes",
                title="Eligible Government Schemes & Portals",
                subtitle="Informational eligibility only — verify & apply on official portals",
                badge="Official Links",
                data=gdata,
                actions=[
                    SuggestedAction(
                        id="act_open_schemes",
                        label="Open Schemes Directory",
                        action_type="navigate",
                        route="/finance-benefits?section=schemes",
                    )
                ],
            )
        )

    return {
        "cards": cards,
        "alerts": alerts,
        "citations": citations,
        "suggested_actions": suggested_actions,
    }


def build_deterministic_reply(
    intent: str,
    language: SupportedLanguage,
    tool_outputs: Dict[str, Dict[str, Any]],
    farm: Optional[Dict[str, Any]],
    memory: Dict[str, Any],
    confirmation_summary: Optional[str] = None,
) -> str:
    """
    Produces a truthful, non-hallucinated multilingual response directly from tool outputs.
    Used both as baseline context for the LLM and as the deterministic offline fallback.
    """
    if confirmation_summary:
        if language == "kn":
            return f"ಈ ಕ್ರಿಯೆಯನ್ನು ದೃಢೀಕರಿಸಿ: {confirmation_summary}. ಮುಂದುವರಿಯಲು Confirm ಒತ್ತಿರಿ ಅಥವಾ Cancel ಒತ್ತಿರಿ."
        if language == "hi":
            return f"कृपया इस कार्रवाई की पुष्टि करें: {confirmation_summary}। आगे बढ़ने के लिए Confirm या रद्द करने के लिए Cancel चुनें।"
        if language == "te":
            return f"దయచేసి ఈ చర్యను నిర్ధారించండి: {confirmation_summary}. కొనసాగించడానికి Confirm లేదా రద్దు చేయడానికి Cancel నొక్కండి."
        return f"Confirmation required before executing: {confirmation_summary}. Please click Confirm to proceed or Cancel to discard."

    lines: List[str] = []
    farm_loc = (
        f"{farm.get('village')}, {farm.get('district')}, {farm.get('state')}"
        if farm
        else "your selected farm region"
    )
    crop = memory.get("selected_crop") or (farm or {}).get("primary_crop") or "Tomato"
    area_acres = memory.get("area_acres") or (round(float((farm or {}).get("land_area_ha") or 2.0) * 2.471, 2))
    budget_inr = memory.get("budget_inr") or float((farm or {}).get("cultivation_budget_inr") or 50000.0)
    water_avail = memory.get("water_availability") or "Moderate"

    if intent in ("crop_recommendation", "crop_comparison", "seed_and_biointel"):
        bdata = (tool_outputs.get("biointel") or {}).get("data") or {}
        sel = bdata.get("selected_crop_economics") or {}
        top_crops = bdata.get("top_suitable_crops") or []
        comparisons = bdata.get("comparisons") or []
        sdata = (tool_outputs.get("soil_intelligence") or {}).get("data") or {}
        missing_soil = sdata.get("missing_soil_readings") or []

        if intent == "crop_comparison" and len(comparisons) >= 2:
            c1, c2 = comparisons[0], comparisons[1]
            if language == "kn":
                lines.append(
                    f"{area_acres} ಎಕರೆ ({farm_loc}) ಮತ್ತು ₹{budget_inr:,.0f} ಬಜೆಟ್‌ಗೆ {c1['crop']} vs {c2['crop']} ಹೋಲಿಕೆ:"
                )
            elif language == "hi":
                lines.append(
                    f"{area_acres} एकड़ ({farm_loc}) और ₹{budget_inr:,.0f} बजट के लिए {c1['crop']} बनाम {c2['crop']} तुलना:"
                )
            elif language == "te":
                lines.append(
                    f"{area_acres} ఎకరాలు ({farm_loc}) మరియు ₹{budget_inr:,.0f} బడ్జెట్‌కు {c1['crop']} vs {c2['crop']} పోలిక:"
                )
            else:
                lines.append(
                    f"Comparison for {area_acres} acres in {farm_loc} (Budget ₹{budget_inr:,.0f}, Water: {water_avail}):"
                )
            for c in comparisons[:2]:
                lines.append(
                    f"• {c['crop']} ({c['default_variety']}): Seed {c['seed_required_kg']} kg (₹{c['seed_cost_inr']:,.0f}), "
                    f"Total Est. Cost ₹{c['total_cultivation_investment_inr']:,.0f} ({'Within Budget' if c['within_budget'] else 'Exceeds Budget'}), "
                    f"Expected Yield {c['expected_production_kg']:,.0f} kg, Est. Profit ₹{c['estimated_profit_inr']:,.0f} (ROI {c['roi_pct']}%). "
                    f"Risks: {'; '.join(c['major_risks'][:2])}."
                )
        elif intent == "crop_recommendation" and top_crops:
            best = top_crops[0]
            if language == "kn":
                lines.append(
                    f"{farm_loc} ನಲ್ಲಿ {area_acres} ಎಕರೆ, ₹{budget_inr:,.0f} ಬಜೆಟ್ ಮತ್ತು {water_avail} ನೀರಿನ ಲಭ್ಯತೆಗೆ ಸೂಕ್ತ ಬೆಳೆಗಳು:"
                )
            elif language == "hi":
                lines.append(
                    f"{farm_loc} में {area_acres} एकड़, ₹{budget_inr:,.0f} बजट और {water_avail} पानी की उपलब्धता के लिए उपयुक्त फसलें:"
                )
            elif language == "te":
                lines.append(
                    f"{farm_loc} లో {area_acres} ఎకరాలు, ₹{budget_inr:,.0f} బడ్జెట్ మరియు {water_avail} నీటి లభ్యతకు తగిన పంటలు:"
                )
            else:
                lines.append(
                    f"Based on your location ({farm_loc}), soil ({(farm or {}).get('soil_type', 'Red Sandy Loam')}), {water_avail} water, {area_acres} acres, and ₹{budget_inr:,.0f} budget:"
                )
            for idx, c in enumerate(top_crops[:3], start=1):
                lines.append(
                    f"{idx}. {c['crop']} ({c['default_variety']}): Est. Investment ₹{c['total_cultivation_investment_inr']:,.0f}, "
                    f"Expected Production {c['expected_production_kg']:,.0f} kg, Est. Profit ₹{c['estimated_profit_inr']:,.0f} "
                    f"({'Fits budget' if c['within_budget'] else 'Exceeds budget by ₹' + str(int(abs(c['budget_gap_inr'])))}). Reasons: {', '.join(c.get('match_reasons', []))}."
                )
        elif sel:
            if language == "kn":
                lines.append(
                    f"{sel['crop']} ({area_acres} ಎಕರೆ): ಬೀಜದ ಪ್ರಮಾಣ {sel['seed_required_kg']} kg (₹{sel['seed_cost_inr']:,.0f}), "
                    f"ಒಟ್ಟು ಅಂದಾಜು ವೆಚ್ಚ ₹{sel['total_cultivation_investment_inr']:,.0f}, ಅಂದಾಜು ಇಳುವರಿ {sel['expected_production_kg']:,.0f} kg, "
                    f"ಅಂದಾಜು ಲಾಭ ₹{sel['estimated_profit_inr']:,.0f}."
                )
            elif language == "hi":
                lines.append(
                    f"{sel['crop']} ({area_acres} एकड़): आवश्यक बीज {sel['seed_required_kg']} kg (₹{sel['seed_cost_inr']:,.0f}), "
                    f"कुल अनुमानित लागत ₹{sel['total_cultivation_investment_inr']:,.0f}, संभावित उपज {sel['expected_production_kg']:,.0f} kg, "
                    f"अनुमानित लाभ ₹{sel['estimated_profit_inr']:,.0f}।"
                )
            elif language == "te":
                lines.append(
                    f"{sel['crop']} ({area_acres} ఎకరాలు): విత్తన మోతాదు {sel['seed_required_kg']} kg (₹{sel['seed_cost_inr']:,.0f}), "
                    f"మొత్తం అంచనా ఖర్చు ₹{sel['total_cultivation_investment_inr']:,.0f}, అంచనా దిగుబడి {sel['expected_production_kg']:,.0f} kg, "
                    f"అంచనా లాభం ₹{sel['estimated_profit_inr']:,.0f}."
                )
            else:
                lines.append(
                    f"For {sel['crop']} on {area_acres} acres ({sel['default_variety']}): "
                    f"Seed needed: {sel['seed_required_kg']} kg (₹{sel['seed_cost_inr']:,.0f}). "
                    f"Total estimated investment: ₹{sel['total_cultivation_investment_inr']:,.0f} vs budget ₹{budget_inr:,.0f}. "
                    f"Expected production: {sel['expected_production_kg']:,.0f} kg; Est. profit: ₹{sel['estimated_profit_inr']:,.0f} (Break-even ₹{sel['break_even_price_per_kg']}/kg)."
                )
        if missing_soil:
            lines.append(
                f"Missing essential input: Laboratory Soil Health Card values ({', '.join(missing_soil)}) are not recorded; please share them or run a Soil Health Card test before finalizing fertilizer doses."
            )

    elif intent == "irrigation_advisory":
        idata = (tool_outputs.get("precision_irrigation") or {}).get("data") or {}
        wdata = (tool_outputs.get("weather_intelligence") or {}).get("data") or {}
        rain48 = wdata.get("forecast_48h_rain_mm", idata.get("forecast_48h_rain_mm", 0.0))
        if language == "kn":
            lines.append(
                f"{idata.get('crop_type', crop)} ({idata.get('crop_stage', 'Mid-Season')}) ನೀರಾವರಿ ವಿಶ್ಲೇಷಣೆ: "
                f"ದೈನಂದಿನ ನೀರಿನ ಬೇಡಿಕೆ ETc={idata.get('etc_mm_day')} mm, ಒಟ್ಟು ಅಗತ್ಯ {idata.get('gross_irrigation_mm')} mm ({idata.get('gross_volume_m3')} m3). "
                f"ಮುಂದಿನ 48 ಗಂಟೆಗಳ ಮಳೆ ಮುನ್ಸೂಚನೆ: {rain48} mm."
            )
        elif language == "hi":
            lines.append(
                f"{idata.get('crop_type', crop)} ({idata.get('crop_stage', 'Mid-Season')}) सिंचाई विश्लेषण: "
                f"दैनिक जल आवश्यकता ETc={idata.get('etc_mm_day')} mm, कुल सिंचाई {idata.get('gross_irrigation_mm')} mm ({idata.get('gross_volume_m3')} m3)। "
                f"अगले 48 घंटे में संभावित वर्षा: {rain48} mm।"
            )
        elif language == "te":
            lines.append(
                f"{idata.get('crop_type', crop)} ({idata.get('crop_stage', 'Mid-Season')}) నీటిపారుదల విశ్లేషణ: "
                f"రోజువారీ నీటి అవసరం ETc={idata.get('etc_mm_day')} mm, మొత్తం అవసరం {idata.get('gross_irrigation_mm')} mm ({idata.get('gross_volume_m3')} m3). "
                f"రాబోయే 48 గంటల్లో వర్షపాతం అంచనా: {rain48} mm."
            )
        else:
            lines.append(
                f"FAO-56 Irrigation Assessment for {idata.get('crop_type', crop)} ({idata.get('crop_stage')} stage): "
                f"ETc = {idata.get('etc_mm_day')} mm/day, Gross Requirement = {idata.get('gross_irrigation_mm')} mm ({idata.get('gross_volume_m3')} m3) vs available {idata.get('available_water_m3')} m3."
            )
        lines.append(
            f"Weather & Rainfall (48h): {rain48} mm expected ({wdata.get('condition')}, {wdata.get('temperature_c')}°C). "
            + (" ".join(idata.get("recommended_actions") or []))
        )
        if idata.get("missing_measurements"):
            lines.append("Uncertainty / Missing Data: " + " ".join(idata["missing_measurements"]))

    elif intent == "weather_advisory":
        wdata = (tool_outputs.get("weather_intelligence") or {}).get("data") or {}
        lines.append(
            f"Weather at {farm_loc}: {wdata.get('temperature_c')}°C ({wdata.get('condition')}), Humidity {wdata.get('humidity_pct')}%, "
            f"Wind {wdata.get('wind_speed_kmh')} km/h, ET0 {wdata.get('et0_mm_day')} mm/day, 48h Forecast Rain {wdata.get('forecast_48h_rain_mm')} mm."
        )
        lines.append("Risks: " + " | ".join(wdata.get("agricultural_risks") or []))

    elif intent == "soil_advisory":
        sdata = (tool_outputs.get("soil_intelligence") or {}).get("data") or {}
        opt_ph = sdata.get("optimal_ph_range", (6.0, 7.5))
        missing = sdata.get("missing_soil_readings") or []
        lines.append(
            f"Soil Intelligence for {sdata.get('crop_type', crop)} on {sdata.get('soil_texture', 'Red Sandy Loam')}: "
            f"Optimal pH range is {opt_ph[0]}–{opt_ph[1]}."
        )
        if missing:
            lines.append(
                f"Laboratory soil readings not provided ({', '.join(missing)}). RaithaMitra never invents NPK readings from GPS; please enter your Soil Health Card values."
            )
        lines.extend(sdata.get("recommended_actions") or [])

    elif intent == "crop_diagnosis":
        cdata = (tool_outputs.get("crop_doctor") or {}).get("data") or {}
        if not cdata.get("ad22_available"):
            lines.append(
                "AD-22 Crop Doctor diagnostic model is currently unavailable on this server (pending integration). "
                "No disease score can be computed without an uploaded leaf scan processed by the verified model."
            )
            lines.append(cdata.get("safety_notice", ""))
        else:
            lines.append("Retrieved diagnostic records from Crop Doctor. Verify field symptoms before applying treatments.")

    elif intent == "market_intelligence":
        mdata = (tool_outputs.get("market_intelligence") or {}).get("data") or {}
        best = mdata.get("best_option") or {}
        sw = mdata.get("sell_vs_wait_analysis") or {}
        lines.append(
            f"Market Analysis for {mdata.get('quantity_kg')} kg {mdata.get('crop')}: Top listed option is {best.get('market')} "
            f"at ₹{best.get('price_per_kg')}/kg (Transport ₹{best.get('transport_cost_inr'):,.0f}, Est. Net Revenue ₹{best.get('net_revenue_inr'):,.0f}, Source: {best.get('source')})."
        )
        lines.append(
            f"Sell Today vs Wait {sw.get('wait_days_evaluated')} Days: Waiting carries ~{sw.get('estimated_spoilage_if_waiting_pct')}% spoilage risk and "
            f"₹{sw.get('estimated_storage_cost_inr'):,.0f} storage cost; future price must exceed ₹{sw.get('break_even_future_price_per_kg')}/kg just to break even. "
            f"{sw.get('uncertainty_note')}"
        )

    elif intent == "bidding_status":
        bdata = (tool_outputs.get("smart_bidding") or {}).get("data") or {}
        orders = bdata.get("confirmed_orders") or []
        listings = bdata.get("listings") or []
        lines.append(
            f"Smart Bidding Summary: {len(listings)} listing(s), {len(orders)} confirmed purchase order(s)."
        )
        for o in orders[:3]:
            lines.append(
                f"• Order {o['id']}: {o['quantity_kg']} kg {o['crop_name']} to {o['buyer_name']} at ₹{o['price_per_kg']}/kg "
                f"(Total ₹{o['total_amount']:,.0f}, Status: {o['status']})."
            )

    elif intent == "transport_status":
        tdata = (tool_outputs.get("transport_connect") or {}).get("data") or {}
        drivers = tdata.get("available_drivers") or []
        bookings = tdata.get("bookings") or []
        lines.append(
            f"Transport Connect: {len(drivers)} available vehicle(s), {len(bookings)} recorded booking(s). "
            f"Estimated {tdata.get('estimated_distance_km')} km freight: ₹{tdata.get('estimated_freight_inr'):,.0f} (Shared ~₹{tdata.get('estimated_shared_freight_inr'):,.0f})."
        )
        for b in bookings[:3]:
            lines.append(
                f"• Booking {b['id']}: {b['produce_type']} ({b['weight_kg']} kg) with {b['driver_name']} — Status: {b['status']} (Fare ₹{b['total_fare']:,.0f})."
            )

    elif intent == "labour_status":
        ldata = (tool_outputs.get("labour_connect") or {}).get("data") or {}
        lines.append(
            f"Labour Connect: {ldata.get('available_workers_count')} available worker(s) (avg ₹{ldata.get('average_daily_wage_inr')}/day), "
            f"{len(ldata.get('jobs', []))} recorded job(s). Estimated crew needed for {ldata.get('crop_stage')} stage: ~{ldata.get('recommended_workers_for_stage')} workers."
        )

    elif intent == "digital_farm_status":
        ddata = (tool_outputs.get("digital_farm") or {}).get("data") or {}
        lines.append(
            f"Digital Farm Twin for {ddata.get('crop')}: Current stage '{ddata.get('growth_stage')}', "
            f"estimated harvest around {ddata.get('expected_harvest_date')} (~{ddata.get('days_until_harvest')} days), "
            f"projected production {ddata.get('estimated_production_kg'):,.0f} kg."
        )

    elif intent == "government_schemes":
        gdata = (tool_outputs.get("government_schemes") or {}).get("data") or {}
        lines.append("Available Agricultural Government Schemes:")
        for s in (gdata.get("schemes") or [])[:4]:
            lines.append(f"• {s['name']}: {s['financial_benefit']} (Portal: {s['application_portal']})")
        lines.append(gdata.get("approval_disclaimer", ""))

    elif intent == "finance_overview":
        fdata = (tool_outputs.get("finance") or {}).get("data") or {}
        mc = fdata.get("monte_carlo_summary") or {}
        lines.append(
            f"Authorized Farm Finance Summary: Registered Budget ₹{fdata.get('allocated_budget_inr', 0):,.0f}; "
            f"Recorded Purchase Orders Revenue ₹{fdata.get('recorded_purchase_order_revenue_inr', 0):,.0f}; "
            f"Committed Labour ₹{fdata.get('committed_labour_obligation_inr', 0):,.0f}; "
            f"Committed Freight ₹{fdata.get('committed_transport_fare_inr', 0):,.0f}. "
            f"Modeled Median Net Profit (Monte Carlo): ₹{mc.get('median_p50_profit_inr', 0):,.0f}."
        )

    else:
        fc = (tool_outputs.get("farm_context") or {}).get("data") or {}
        wdata = (tool_outputs.get("weather_intelligence") or {}).get("data") or {}
        if fc.get("has_farm"):
            lines.append(
                f"Farm Overview ({fc.get('farm_name')} in {fc.get('location')}): {fc.get('crop')} ({fc.get('crop_stage')}), "
                f"{fc.get('area_acres')} acres, Budget ₹{fc.get('budget_inr', 0):,.0f}, Available Water {fc.get('available_water_m3', 0):,.0f} m3."
            )
        if wdata:
            lines.append(
                f"Current Weather: {wdata.get('temperature_c')}°C, {wdata.get('condition')}, Wind {wdata.get('wind_speed_kmh')} km/h, 48h Rain {wdata.get('forecast_48h_rain_mm')} mm."
            )

    return "\n".join(line for line in lines if line).strip()
