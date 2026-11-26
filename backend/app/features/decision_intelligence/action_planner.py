"""
AD-30: Prioritized Daily Action Plan & Agricultural Decision Dependency Graph.
Builds farm-specific, explainable recommendations grouped into 5 operational buckets
and maps explicit seed-to-sale dependencies.
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, List

from backend.app.features.decision_intelligence.optimizer import rank_decision_alternatives


def build_decision_graph(ctx: Dict[str, Any]) -> List[Dict[str, Any]]:
    wx_ok = ctx["weather"]["available"]
    has_lots = ctx["post_harvest"]["summary"]["lot_count"] > 0
    has_eq_bk = len(ctx["equipment"]["bookings"]) > 0
    has_mkt = len(ctx["market"]["observations"]) > 0
    has_bid = len(ctx["bidding"]["active_listings"]) > 0
    outstanding = float(ctx["finance"]["outstanding_payments_inr"])

    latest_diag = (ctx.get("crop_doctor") or {}).get("latest_diagnosis")
    diag_detail = (
        f"Latest AD-22 scan: {latest_diag.get('predicted_disease') or latest_diag.get('diagnosis_status')}"
        if latest_diag
        else "Verify actual field health via AD-22 Crop Doctor before chemical/harvest actions"
    )

    return [
        {"step": 1, "node": "Crop Growth & Maturity", "status": "active", "detail": f"{ctx['farm'].primary_crop} ({ctx['farm'].crop_stage})", "depends_on": []},
        {"step": 2, "node": "Weather & Irrigation Check", "status": "ready" if wx_ok else "pending_data", "detail": f"48h Rain: {ctx['weather']['rain_48h_mm']} mm" if wx_ok else "Weather unavailable", "depends_on": [1]},
        {"step": 3, "node": "Field Inspection / Crop Doctor", "status": "ready" if latest_diag else "recommended", "detail": diag_detail, "depends_on": [1, 2]},
        {"step": 4, "node": "Equipment & Labour Prep", "status": "ready" if has_eq_bk else "pending_action", "detail": f"{len(ctx['equipment']['bookings'])} eq bookings, {len(ctx['labour']['open_jobs'])} labour jobs", "depends_on": [3]},
        {"step": 5, "node": "Harvest & Post-Harvest Inventory", "status": "ready" if has_lots else "pending_action", "detail": f"{ctx['post_harvest']['summary']['total_available_kg']:,.0f} kg available", "depends_on": [4]},
        {"step": 6, "node": "Market & Bidding Comparison", "status": "ready" if (has_lots and (has_mkt or has_bid)) else "blocked_by_prereq", "detail": f"{len(ctx['market']['observations'])} market obs, {len(ctx['bidding']['active_listings'])} active listings", "depends_on": [5]},
        {"step": 7, "node": "Transport & Payment Settlement", "status": "pending_settlement" if outstanding > 0 else "ready", "detail": f"Outstanding buyer payments: ₹{outstanding:,.0f}", "depends_on": [6]},
    ]


def build_prioritized_action_plan(
    *,
    ctx: Dict[str, Any],
    conflicts: List[Dict[str, Any]],
    preference_profile: str,
) -> Dict[str, Any]:
    farm = ctx["farm"]
    wx = ctx["weather"]
    fin = ctx["finance"]
    ph = ctx["post_harvest"]["summary"]
    sat = ctx["satellite"]
    mkt = ctx["market"]["observations"]

    candidates: List[Dict[str, Any]] = []

    # 1. Irrigation / Weather action
    if wx["available"]:
        rain_48h = float(wx["rain_48h_mm"])
        demand = float(wx["water_demand_mm_day"] or 4.0)
        if rain_48h >= 12.0:
            candidates.append({
                "id": f"act_{uuid.uuid4().hex[:8]}",
                "title": "Adjust Irrigation for Forecast Rainfall",
                "description": f"Delay heavy irrigation by 24–48h because {rain_48h:.1f} mm rain is forecast against {demand:.2f} mm/day crop demand.",
                "category": "irrigation",
                "priority": "high",
                "action_group": "immediate_attention",
                "route": "/irrigation",
                "estimated_cost_inr": 0.0,
                "estimated_benefit_inr": 380.0,
                "estimated_water_m3": 0.0,
                "profit_score": 60,
                "cost_saving_score": 85,
                "water_score": 95,
                "risk_reduction_score": 80,
                "dependencies": ["Open-Meteo 48h Forecast"],
                "explanation": {
                    "what": "Postpone routine irrigation cycle for 24–48 hours.",
                    "why": f"Forecasted rain ({rain_48h:.1f} mm) offsets FAO-56 daily demand ({demand:.2f} mm/day), saving pumping electricity and preventing root hypoxia.",
                    "modules_contributed": ["Weather (Open-Meteo)", "Irrigation (FAO-56)"],
                    "data_used": f"ET0/water demand {demand:.2f} mm/day; 48h rainfall {rain_48h:.1f} mm.",
                    "alternatives_considered": ["Run full irrigation today (ranked lower due to runoff & ₹380 pumping cost)."],
                    "assumptions": ["Forecasted rainfall reaches the field; verify actual rain gauge before skipping critical flowering irrigation."],
                    "what_could_change": "If rainfall fails to occur within 24 hours, resume scheduled drip/furrow irrigation.",
                    "unavailable_info": "In-situ soil moisture probe readings.",
                },
            })
        else:
            candidates.append({
                "id": f"act_{uuid.uuid4().hex[:8]}",
                "title": "Maintain Scheduled Crop Irrigation",
                "description": f"Supply ~{demand:.2f} mm/day via {farm.irrigation_method} ({rain_48h:.1f} mm 48h rain forecast).",
                "category": "irrigation",
                "priority": "medium",
                "action_group": "todays_activities",
                "route": "/irrigation",
                "estimated_cost_inr": 250.0,
                "estimated_benefit_inr": 1500.0,
                "estimated_water_m3": round(demand * farm.land_area_ha * 10.0, 1),
                "profit_score": 70,
                "cost_saving_score": 60,
                "water_score": 75,
                "risk_reduction_score": 85,
                "dependencies": [],
                "explanation": {
                    "what": f"Apply {demand:.2f} mm/day irrigation.",
                    "why": "Low 48h rainfall forecast requires scheduled irrigation to avoid moisture stress.",
                    "modules_contributed": ["Weather (Open-Meteo)", "Irrigation (FAO-56)"],
                    "data_used": f"Crop demand {demand:.2f} mm/day, 48h rain {rain_48h:.1f} mm.",
                    "alternatives_considered": ["Skip irrigation (risks moisture deficit)."],
                    "assumptions": ["Uniform emitter/furrow distribution."],
                    "what_could_change": "Unexpected local rainfall.",
                    "unavailable_info": "In-situ root-zone sensor.",
                },
            })

    # 2. Budget & Financial Review
    rem_budget = float(fin["remaining_budget_inr"])
    if rem_budget < float(fin["allocated_budget_inr"]) * 0.25 or float(fin["outstanding_payments_inr"]) > 0:
        candidates.append({
            "id": f"act_{uuid.uuid4().hex[:8]}",
            "title": "Review Farm Budget & Outstanding Payments",
            "description": f"Remaining budget: ₹{rem_budget:,.0f}; outstanding buyer payments: ₹{fin['outstanding_payments_inr']:,.0f}.",
            "category": "finance",
            "priority": "high" if rem_budget < 0 else "medium",
            "action_group": "immediate_attention" if rem_budget < 0 else "financial_opportunities",
            "route": "/finance",
            "estimated_cost_inr": 0.0,
            "estimated_benefit_inr": float(fin["outstanding_payments_inr"]),
            "profit_score": 75,
            "cost_saving_score": 90,
            "water_score": 50,
            "risk_reduction_score": 90,
            "dependencies": [],
            "explanation": {
                "what": "Audit committed expenses and follow up on unsettled buyer receivables.",
                "why": "Protects working capital and prevents unbudgeted cultivation shortfalls.",
                "modules_contributed": ["AD-24 Financial Intelligence"],
                "data_used": f"Allocated ₹{fin['allocated_budget_inr']:,.0f}, Remaining ₹{rem_budget:,.0f}.",
                "alternatives_considered": ["Unmonitored spending (increases debt risk)."],
                "assumptions": ["Recorded ledger reflects current commitments."],
                "what_could_change": "Settlement of outstanding buyer invoices.",
                "unavailable_info": "Off-platform cash expenses not entered.",
            },
        })

    # 3. Post-Harvest Inventory & Market Opportunity
    if ph["total_available_kg"] > 0:
        mkt_note = f"Latest price at {mkt[0]['market']}: ₹{mkt[0]['modal_price_per_kg']}/kg." if mkt else "Enter local mandi price or check buyer offers."
        candidates.append({
            "id": f"act_{uuid.uuid4().hex[:8]}",
            "title": f"Evaluate Sell-Now vs Store for {ph['total_available_kg']:,.0f} kg Inventory",
            "description": f"Compare immediate transport-adjusted market returns against cold storage holding fees and spoilage risk. {mkt_note}",
            "category": "market_post_harvest",
            "priority": "high",
            "action_group": "financial_opportunities",
            "route": "/post-harvest",
            "estimated_cost_inr": 0.0,
            "estimated_benefit_inr": round(ph["total_available_kg"] * 2.0, 2),
            "profit_score": 90,
            "cost_saving_score": 75,
            "water_score": 50,
            "risk_reduction_score": 80,
            "dependencies": ["Available Harvest Lot"],
            "explanation": {
                "what": "Run Sell-Now vs Store and Transport-Adjusted Market Ranking.",
                "why": "Prevents spoilage losses while capturing net-return maximizing market channels.",
                "modules_contributed": ["AD-27 Post-Harvest", "AD-29 Market Intelligence", "Smart Bidding"],
                "data_used": f"{ph['total_available_kg']:,.0f} kg available inventory.",
                "alternatives_considered": ["Sell blindly at nearest market without transport deduction."],
                "assumptions": ["Transport and storage rates entered reflect local quotes."],
                "what_could_change": "Sudden mandi price shifts or rising storage temperature.",
                "unavailable_info": "Live AGMARKNET feed when DATA_GOV_IN_API_KEY is unset." if not mkt else "None.",
            },
        })

    # 4. Shared Equipment Opportunity
    candidates.append({
        "id": f"act_{uuid.uuid4().hex[:8]}",
        "title": "Coordinate Shared Machinery Schedule (Equipment Connect)",
        "description": "Use Google OR-Tools shared tractor scheduling with neighbouring farmers to reduce per-farm delivery charges.",
        "category": "equipment",
        "priority": "medium",
        "action_group": "upcoming_activities",
        "route": "/resources",
        "estimated_cost_inr": 2100.0,
        "estimated_benefit_inr": 700.0,
        "profit_score": 70,
        "cost_saving_score": 92,
        "water_score": 50,
        "risk_reduction_score": 70,
        "dependencies": ["Participant Consent", "Owner Approval"],
        "explanation": {
            "what": "Pool contiguous tractor/harvester slots with neighbouring farms.",
            "why": "Splits fixed equipment delivery charges across participating farmers.",
            "modules_contributed": ["AD-28 Equipment Connect (OR-Tools)"],
            "data_used": f"Farm area {farm.land_area_ha:.2f} ha.",
            "alternatives_considered": ["Individual machinery rental (higher delivery fee)."],
            "assumptions": ["Neighbouring farmers consent to contiguous time windows."],
            "what_could_change": "Equipment maintenance block or rain delay.",
            "unavailable_info": "Neighbour schedules until entered.",
        },
    })

    # 5. Monitoring & Crop Doctor Inspection Task (AD-22 Integrated)
    crop_doc = ctx.get("crop_doctor") or {}
    latest_diag = crop_doc.get("latest_diagnosis")
    if latest_diag and latest_diag.get("diagnosis_status") == "diseased" and latest_diag.get("predicted_disease"):
        pred_dis = latest_diag["predicted_disease"]
        conf = latest_diag.get("confidence")
        conf_txt = f" ({float(conf) * 100:.1f}% model confidence)" if conf is not None else ""
        candidates.append({
            "id": f"act_{uuid.uuid4().hex[:8]}",
            "title": f"Targeted Management for {pred_dis}",
            "description": f"AD-22 Crop Doctor detected {pred_dis} on {farm.primary_crop}{conf_txt}. Review ICAR-grounded treatment guidance and confirm before spraying.",
            "category": "crop_protection",
            "priority": "critical",
            "action_group": "immediate_attention",
            "route": "/crop-health",
            "estimated_cost_inr": 650.0,
            "estimated_benefit_inr": 4500.0,
            "profit_score": 82,
            "cost_saving_score": 70,
            "water_score": 60,
            "risk_reduction_score": 98,
            "dependencies": ["AD-22 Crop Doctor Scan"],
            "explanation": {
                "what": f"Inspect affected plants and apply targeted treatment for {pred_dis}.",
                "why": f"Verified leaf scan on {(latest_diag.get('created_at') or '')[:10]} flagged {pred_dis}{conf_txt}.",
                "modules_contributed": ["AD-22 AI Crop Doctor", "AD-24 Financial Ledger"],
                "data_used": f"Scan ID {latest_diag.get('id')} ({latest_diag.get('diagnosis_status')}).",
                "alternatives_considered": ["Blanket fungicide/bactericide spray without targeted diagnosis."],
                "assumptions": ["Visual leaf symptoms represent active field infection."],
                "what_could_change": "Expert agronomic verification or lab assay.",
                "unavailable_info": "In-situ spore trap / laboratory PCR confirmation.",
            },
        })

    sat_msg = (
        f"Cached NDVI {sat['ndvi']:.3f} ({sat['acquisition_date'][:10]})."
        if sat and sat.get("ndvi") is not None
        else "Satellite spectral bands pending; conduct physical leaf & moisture scouting."
    )
    candidates.append({
        "id": f"act_{uuid.uuid4().hex[:8]}",
        "title": "Field Scouting & Crop Health Inspection",
        "description": f"Inspect {farm.primary_crop} leaves and root zone. {sat_msg}",
        "category": "monitoring",
        "priority": "high" if (sat and sat.get("ndvi") is not None and float(sat["ndvi"]) < 0.4) else "low",
        "action_group": "monitoring_tasks",
        "route": "/crop-health",
        "estimated_cost_inr": 0.0,
        "estimated_benefit_inr": 0.0,
        "profit_score": 55,
        "cost_saving_score": 70,
        "water_score": 65,
        "risk_reduction_score": 95,
        "dependencies": [],
        "explanation": {
            "what": "Perform physical crop scouting and upload leaf photos if symptoms appear.",
            "why": "Early visual detection avoids unnecessary blanket spraying.",
            "modules_contributed": ["AD-25 Satellite", "AD-22 AI Crop Doctor"],
            "data_used": sat_msg,
            "alternatives_considered": ["Preventive chemical spray without diagnosis (discouraged)."],
            "assumptions": ["Visual inspection covers representative field corners."],
            "what_could_change": "Confirmation of pest/pathogen symptoms.",
            "unavailable_info": "None for AD-22" if crop_doc.get("model_available") else "AD-22 ONNX model weights not loaded locally.",
        },
    })

    ranked_res = rank_decision_alternatives(
        candidates=candidates,
        preference_profile=preference_profile,
        remaining_budget_inr=max(0.0, rem_budget) if rem_budget > 0 else 0.0,
        available_water_m3=farm.available_water_m3,
    )

    grouped: Dict[str, List[Dict[str, Any]]] = {
        "immediate_attention": [],
        "todays_activities": [],
        "upcoming_activities": [],
        "financial_opportunities": [],
        "monitoring_tasks": [],
    }
    for item in ranked_res["ranked_alternatives"]:
        grp = item.get("action_group", "todays_activities")
        grouped.setdefault(grp, []).append(item)

    return {
        "preference_profile": preference_profile,
        "weights_applied": ranked_res["weights_applied"],
        "scoring_note": ranked_res["scoring_note"],
        "ranked_recommendations": ranked_res["ranked_alternatives"],
        "grouped_action_plan": grouped,
        "decision_graph": build_decision_graph(ctx),
        "conflicts_detected": conflicts,
    }
