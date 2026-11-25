# backend/app/features/agri_assistant/service.py
"""
Core Orchestration Service for AD-23 RaithaMitra AI.
Connects NLU, Intent Classification, Authorized Farm Context, Multi-Tool Execution,
Proactive Alerts, Grounded LLM Synthesis, Conversation Memory, and Safe Action Confirmation.
"""
import asyncio
import json
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.features.agri_assistant.context import (
    classify_agricultural_intent,
    resolve_authorized_farm,
    update_memory_with_query,
)
from backend.app.features.agri_assistant.conversation_store import (
    append_message,
    create_conversation,
    create_pending_confirmation,
    finalize_confirmation_status,
    get_conversation_messages,
    get_owned_confirmation,
    get_owned_conversation,
    update_conversation_state,
)
from backend.app.features.agri_assistant.llm_provider import llm_provider
from backend.app.features.agri_assistant.response_builder import (
    build_cards_alerts_citations,
    build_deterministic_reply,
    get_follow_ups,
)
from backend.app.features.agri_assistant.safety import (
    enforce_rate_limit,
    is_action_allowed_for_role,
    is_tool_allowed_for_role,
    sanitize_and_validate_message,
)
from backend.app.features.agri_assistant.schemas import (
    ChatMessageRequest,
    ChatMessageResponse,
    ConfirmActionRequest,
    ConfirmActionResponse,
    ResponseCard,
    SuggestedAction,
    ToolExecutionStep,
)
from backend.app.features.agri_assistant.tool_registry import tool_registry
from backend.app.features.auth.router import verify_user_role_in_db

TOOL_LABELS: Dict[str, str] = {
    "farm_context": "Checking farm details",
    "weather_intelligence": "Retrieving weather information",
    "biointel": "Comparing crop varieties & BioIntel",
    "precision_irrigation": "Calculating irrigation requirements",
    "soil_intelligence": "Evaluating soil & nutrient intelligence",
    "crop_doctor": "Checking Crop Doctor diagnostics",
    "digital_farm": "Checking Digital Farm simulation",
    "labour_connect": "Checking Labour Connect availability",
    "smart_bidding": "Checking Smart Bidding listings & orders",
    "transport_connect": "Checking Transport Connect vehicles & bookings",
    "market_intelligence": "Checking available markets & prices",
    "finance": "Reviewing farm finance & projections",
    "government_schemes": "Retrieving government schemes",
}


class AgriAssistantService:
    async def handle_chat(
        self,
        user: Dict[str, Any],
        req: ChatMessageRequest,
    ) -> ChatMessageResponse:
        enforce_rate_limit(user["id"])
        clean_text = sanitize_and_validate_message(req.message)
        farm = resolve_authorized_farm(user, req.farm_id)

        # Load or create conversation
        if req.conversation_id:
            conv = get_owned_conversation(req.conversation_id, user["id"])
            memory = dict(conv.memory or {})
            # If user switched farm context explicitly, update it
            active_farm_id = req.farm_id or conv.farm_id or (farm["id"] if farm else None)
            if active_farm_id and not farm:
                farm = resolve_authorized_farm(user, active_farm_id)
        else:
            active_farm_id = req.farm_id or (farm["id"] if farm else None)
            conv = create_conversation(
                user_id=user["id"],
                farm_id=active_farm_id,
                language=req.language,
                title=clean_text[:72],
                initial_memory={},
            )
            memory = {}

        # Update conversation memory with newly mentioned crop / area / budget / water / soil
        memory, turn_extracted = update_memory_with_query(clean_text, memory, farm)
        intent = classify_agricultural_intent(clean_text, memory, turn_extracted)
        memory["last_intent"] = intent

        # Record user turn first
        append_message(
            conversation_id=conv.id,
            user_id=user["id"],
            role="user",
            content=clean_text,
            language=req.language,
            intent=intent,
        )

        # Handle consequential action draft intents with strict RBAC + confirmation card
        confirmation_card: Optional[ResponseCard] = None
        confirmation_summary: Optional[str] = None
        if intent.startswith("action_draft_"):
            confirmation_card, confirmation_summary = self._prepare_action_confirmation(
                intent=intent,
                clean_text=clean_text,
                user=user,
                farm=farm,
                conversation_id=conv.id,
                memory=memory,
            )

        # Select tools based on intent (multi-tool reasoning!)
        selected_tools = self._select_tools_for_intent(intent, user.get("role", "farmer"))

        # Execute read-only tools in parallel
        tool_params = {
            "selected_crop": memory.get("selected_crop"),
            "comparison_crops": memory.get("comparison_crops") or [],
            "area_acres": memory.get("area_acres"),
            "budget_inr": memory.get("budget_inr"),
            "water_availability": memory.get("water_availability"),
            "soil_ph": memory.get("soil_ph"),
            "nitrogen_kg_ha": memory.get("nitrogen_kg_ha"),
            "phosphorus_kg_ha": memory.get("phosphorus_kg_ha"),
            "potassium_kg_ha": memory.get("potassium_kg_ha"),
            "digital_farm_context": req.digital_farm_context,
            "market_context": req.market_context,
            "query": clean_text,
        }

        # Run weather first if both weather and precision_irrigation are selected so we can share weather_obj
        tool_outputs: Dict[str, Dict[str, Any]] = {}
        if "weather_intelligence" in selected_tools:
            w_out = await tool_registry.execute_tool("weather_intelligence", user, farm, tool_params)
            tool_outputs["weather_intelligence"] = w_out
            w_obj = (w_out.get("data") or {}).get("weather_obj")
            if w_obj is not None:
                tool_params["weather_obj"] = w_obj

        remaining_tools = [t for t in selected_tools if t != "weather_intelligence"]
        if remaining_tools:
            results = await asyncio.gather(
                *[tool_registry.execute_tool(t, user, farm, tool_params) for t in remaining_tools]
            )
            for t_name, res in zip(remaining_tools, results):
                tool_outputs[t_name] = res

        # Build transparent execution steps (strip heavy internal objects before returning/serializing)
        steps: List[ToolExecutionStep] = []
        llm_tool_summaries: Dict[str, Any] = {}
        for t_name in selected_tools:
            out = tool_outputs.get(t_name, {})
            steps.append(
                ToolExecutionStep(
                    tool_name=t_name,
                    label=TOOL_LABELS.get(t_name, t_name),
                    status=out.get("status", "failed"),
                    summary=str(out.get("summary") or ""),
                    duration_ms=int(out.get("duration_ms") or 0),
                    data_quality=out.get("data_quality"),
                )
            )
            data_copy = dict(out.get("data") or {})
            data_copy.pop("weather_obj", None)
            llm_tool_summaries[t_name] = {
                "status": out.get("status"),
                "source": out.get("source"),
                "data_quality": out.get("data_quality"),
                "summary": out.get("summary"),
                "data": data_copy,
            }

        # Clean weather_obj before passing to card builder / serialization
        if "weather_intelligence" in tool_outputs and isinstance(tool_outputs["weather_intelligence"].get("data"), dict):
            tool_outputs["weather_intelligence"]["data"].pop("weather_obj", None)

        built = build_cards_alerts_citations(
            intent=intent,
            language=req.language,
            tool_outputs=tool_outputs,
            farm=farm,
            memory=memory,
            confirmation_card=confirmation_card,
        )

        deterministic_draft = build_deterministic_reply(
            intent=intent,
            language=req.language,
            tool_outputs=tool_outputs,
            farm=farm,
            memory=memory,
            confirmation_summary=confirmation_summary,
        )

        # Fetch prior turns for conversational continuity
        prior_msgs = get_conversation_messages(conv.id, user["id"], limit=10)
        history_turns = [{"role": m.role, "content": m.content} for m in prior_msgs[:-1]]

        # Synthesize final multilingual reply (Gemini / OpenAI-compatible / deterministic offline fallback)
        if confirmation_summary:
            reply_text = deterministic_draft
            provider_used = "deterministic_safety_confirmation"
            offline_fallback = False
        else:
            reply_text, provider_used, offline_fallback = await llm_provider.synthesize_response(
                user_query=clean_text,
                language=req.language,
                intent=intent,
                tool_summaries=llm_tool_summaries,
                memory=memory,
                history_turns=history_turns,
                deterministic_draft=deterministic_draft,
            )

        follow_ups = get_follow_ups(req.language)
        now_iso = datetime.now(timezone.utc).isoformat()

        # Persist conversation memory & assistant message
        update_conversation_state(
            conversation_id=conv.id,
            user_id=user["id"],
            farm_id=active_farm_id,
            language=req.language,
            memory=memory,
            title=conv.title if conv.message_count > 0 else clean_text[:72],
        )

        msg_id = append_message(
            conversation_id=conv.id,
            user_id=user["id"],
            role="assistant",
            content=reply_text,
            language=req.language,
            intent=intent,
            tools_executed=[s.model_dump() for s in steps],
            cards=[c.model_dump() for c in built["cards"]],
            alerts=[a.model_dump() for a in built["alerts"]],
            citations=[c.model_dump() for c in built["citations"]],
            suggested_actions=[a.model_dump() for a in built["suggested_actions"]],
            follow_ups=follow_ups,
            metadata={"llm_provider_used": provider_used, "offline_fallback": offline_fallback},
        )

        return ChatMessageResponse(
            conversation_id=conv.id,
            message_id=msg_id,
            reply=reply_text,
            language=req.language,
            intent=intent,
            tools_executed=steps,
            cards=built["cards"],
            alerts=built["alerts"],
            citations=built["citations"],
            suggested_actions=built["suggested_actions"],
            follow_up_questions=follow_ups,
            memory_snapshot=memory,
            llm_provider_used=provider_used,
            offline_fallback=offline_fallback,
            timestamp=now_iso,
        )

    def _select_tools_for_intent(self, intent: str, role: str) -> List[str]:
        intent_map: Dict[str, List[str]] = {
            "crop_recommendation": ["farm_context", "weather_intelligence", "soil_intelligence", "biointel"],
            "crop_comparison": ["farm_context", "weather_intelligence", "soil_intelligence", "biointel"],
            "seed_and_biointel": ["farm_context", "biointel", "soil_intelligence"],
            "irrigation_advisory": ["farm_context", "weather_intelligence", "precision_irrigation"],
            "weather_advisory": ["farm_context", "weather_intelligence"],
            "soil_advisory": ["farm_context", "soil_intelligence"],
            "crop_diagnosis": ["farm_context", "weather_intelligence", "crop_doctor"],
            "digital_farm_status": ["farm_context", "weather_intelligence", "digital_farm"],
            "market_intelligence": ["farm_context", "digital_farm", "market_intelligence", "transport_connect", "smart_bidding"],
            "bidding_status": ["smart_bidding", "transport_connect"],
            "transport_status": ["farm_context", "transport_connect", "smart_bidding"],
            "labour_status": ["farm_context", "labour_connect"],
            "finance_overview": ["farm_context", "finance", "smart_bidding"],
            "government_schemes": ["farm_context", "government_schemes"],
            "action_draft_labour": ["farm_context", "labour_connect"],
            "action_draft_bidding": ["farm_context", "smart_bidding"],
            "action_draft_transport": ["farm_context", "transport_connect"],
            "general_farm_advisory": ["farm_context", "weather_intelligence", "precision_irrigation", "smart_bidding"],
        }
        candidates = intent_map.get(intent, ["farm_context", "weather_intelligence"])
        return [t for t in candidates if is_tool_allowed_for_role(t, role)]

    def _prepare_action_confirmation(
        self,
        intent: str,
        clean_text: str,
        user: Dict[str, Any],
        farm: Optional[Dict[str, Any]],
        conversation_id: str,
        memory: Dict[str, Any],
    ) -> Tuple[ResponseCard, str]:
        role = user.get("role", "")
        q = clean_text.lower()
        location = (
            f"{farm.get('village')}, {farm.get('district')}"
            if farm
            else f"{user.get('village') or 'Mandya Rural'}, {user.get('district') or 'Mandya'}"
        )
        crop = memory.get("selected_crop") or (farm or {}).get("primary_crop") or "Tomato"

        if intent == "action_draft_labour":
            if not is_action_allowed_for_role("labour_post", role):
                raise HTTPException(
                    status_code=403,
                    detail="Unauthorized: Only registered farmers can post agricultural labour jobs.",
                )
            m_cnt = re.search(r"(\d+)\s*(?:worker|workers|labour|labor|people)", q)
            workers_count = max(1, min(100, int(m_cnt.group(1)))) if m_cnt else 2
            work_type = "Harvesting"
            if "weed" in q:
                work_type = "Weeding"
            elif "plant" in q or "sow" in q:
                work_type = "Planting"
            elif "irrigat" in q or "water" in q:
                work_type = "Irrigation"
            elif "spray" in q:
                work_type = "Spraying"
            work_date = (datetime.now(timezone.utc) + timedelta(days=1)).date().isoformat()
            wage = 650.0
            payload = {
                "farmer_id": user["id"],
                "farmer_name": user["name"],
                "farm_id": (farm or {}).get("id"),
                "title": f"{crop} {work_type}",
                "job_type": work_type,
                "crop_type": crop,
                "work_location": location,
                "work_date": work_date,
                "working_hours": "07:00 - 15:00",
                "wage_per_day": wage,
                "required_workers": workers_count,
            }
            summary = f"Publish Labour Connect job: {workers_count} workers for {crop} {work_type} on {work_date} at ₹{wage:.0f}/day in {location}"
            conf_id = create_pending_confirmation(conversation_id, user["id"], (farm or {}).get("id"), "labour_post", payload, summary)
            est_cost = wage * workers_count
            card = self._build_confirmation_card(conf_id, "labour_post", summary, f"{workers_count} workers", est_cost)
            return card, summary

        if intent == "action_draft_bidding":
            if not is_action_allowed_for_role("bidding_post", role):
                raise HTTPException(
                    status_code=403,
                    detail="Unauthorized: Only registered farmers can publish produce listings.",
                )
            m_qty = re.search(r"(\d+(?:\.\d+)?)\s*(?:kg|quintal)", q)
            qty_kg = float(m_qty.group(1)) if m_qty else 500.0
            if "quintal" in q and m_qty:
                qty_kg *= 100.0
            m_price = re.search(r"(?:at|min|minimum|₹|rs\.?)\s*(\d+(?:\.\d+)?)", q)
            min_price = float(m_price.group(1)) if m_price else 25.0
            payload = {
                "farmer_id": user["id"],
                "farmer_name": user["name"],
                "farm_id": (farm or {}).get("id"),
                "crop_name": crop,
                "variety": (farm or {}).get("crop_variety") or "Standard Grade",
                "quantity_kg": qty_kg,
                "min_price_per_kg": min_price,
                "harvest_date": datetime.now(timezone.utc).date().isoformat(),
                "location": location,
                "bidding_deadline": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            }
            summary = f"Publish Smart Bidding lot: {qty_kg:.0f} kg {crop} at minimum ₹{min_price:.0f}/kg in {location}"
            conf_id = create_pending_confirmation(conversation_id, user["id"], (farm or {}).get("id"), "bidding_post", payload, summary)
            card = self._build_confirmation_card(conf_id, "bidding_post", summary, f"{qty_kg:.0f} kg", qty_kg * min_price)
            return card, summary

        # action_draft_transport
        if not is_action_allowed_for_role("transport_book", role):
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: Your role cannot create transport booking requests.",
            )
        m_wt = re.search(r"(\d+(?:\.\d+)?)\s*(?:kg|ton|tons)", q)
        weight_kg = float(m_wt.group(1)) if m_wt else 500.0
        if "ton" in q and m_wt:
            weight_kg *= 1000.0
        conn = get_db_connection()
        try:
            drv = conn.execute(
                "SELECT * FROM transport_vehicles WHERE availability_status = 'available' AND capacity_kg >= ? ORDER BY capacity_kg ASC LIMIT 1",
                (weight_kg,),
            ).fetchone()
            if not drv:
                drv = conn.execute("SELECT * FROM transport_vehicles WHERE availability_status = 'available' LIMIT 1").fetchone()
        finally:
            conn.close()
        if not drv:
            raise HTTPException(status_code=400, detail="No available transport vehicles found for booking.")
        est_dist = 45.0
        total_fare = round(est_dist * float(drv["base_fare_per_km"]), 2)
        payload = {
            "farmer_id": user["id"],
            "farmer_name": user["name"],
            "driver_id": drv["driver_id"],
            "driver_name": drv["driver_name"],
            "driver_phone": drv["driver_phone"],
            "produce_type": crop,
            "weight_kg": weight_kg,
            "pickup_location": location,
            "delivery_destination": "Bengaluru APMC Yard",
            "pickup_time": "Tomorrow 06:30 AM",
            "vehicle_type": drv["vehicle_type"],
            "estimated_distance_km": est_dist,
            "total_fare": total_fare,
        }
        summary = f"Book {drv['vehicle_type']} ({drv['driver_name']}) for {weight_kg:.0f} kg {crop} from {location} to Bengaluru APMC (est. ₹{total_fare:,.0f})"
        conf_id = create_pending_confirmation(conversation_id, user["id"], (farm or {}).get("id"), "transport_book", payload, summary)
        card = self._build_confirmation_card(conf_id, "transport_book", summary, f"{weight_kg:.0f} kg", total_fare)
        return card, summary

    def _build_confirmation_card(
        self,
        confirmation_id: str,
        action_kind: str,
        summary: str,
        quantity_label: str,
        estimated_cost_inr: float,
    ) -> ResponseCard:
        return ResponseCard(
            card_type="transaction_confirmation",
            title="Action Confirmation Required",
            subtitle=summary,
            badge="Pending Confirmation",
            data={
                "confirmation_id": confirmation_id,
                "action_kind": action_kind,
                "proposed_action": summary,
                "relevant_quantity": quantity_label,
                "estimated_cost_inr": round(estimated_cost_inr, 2),
                "status": "pending",
            },
            actions=[
                SuggestedAction(
                    id=f"confirm_{confirmation_id}",
                    label="Confirm",
                    action_type="execute_confirmed",
                    requires_confirmation=True,
                    confirmation_id=confirmation_id,
                    action_kind=action_kind,
                    payload={"decision": "confirm"},
                ),
                SuggestedAction(
                    id=f"cancel_{confirmation_id}",
                    label="Cancel",
                    action_type="execute_confirmed",
                    requires_confirmation=True,
                    confirmation_id=confirmation_id,
                    action_kind=action_kind,
                    payload={"decision": "cancel"},
                ),
            ],
        )

    def confirm_action(
        self,
        user: Dict[str, Any],
        req: ConfirmActionRequest,
    ) -> ConfirmActionResponse:
        conf = get_owned_confirmation(req.confirmation_id, user["id"])
        if conf["status"] != "pending":
            raise HTTPException(
                status_code=409,
                detail=f"Action '{req.confirmation_id}' is already {conf['status']}. Duplicate execution is prohibited.",
            )

        if req.decision == "cancel":
            finalize_confirmation_status(req.confirmation_id, user["id"], "cancelled")
            return ConfirmActionResponse(
                confirmation_id=req.confirmation_id,
                status="cancelled",
                message="Action cancelled. No changes were written to RaithaMitra records.",
            )

        action_type = conf["action_type"]
        if not is_action_allowed_for_role(action_type, user["role"]) or not verify_user_role_in_db(
            user["id"], ["farmer", "buyer", "admin"]
        ):
            raise HTTPException(status_code=403, detail="Unauthorized role for this action.")

        payload = json.loads(conf["payload_json"])
        conn = get_db_connection()
        now = datetime.now(timezone.utc).isoformat()
        try:
            conn.execute("BEGIN IMMEDIATE")
            current = conn.execute(
                "SELECT status FROM agri_action_confirmations WHERE id = ?",
                (req.confirmation_id,),
            ).fetchone()
            if not current or current["status"] != "pending":
                conn.rollback()
                raise HTTPException(
                    status_code=409,
                    detail="Duplicate transaction execution prevented: confirmation already processed.",
                )

            result_obj: Dict[str, Any] = {}
            route = "/"

            if action_type == "labour_post":
                if not verify_user_role_in_db(user["id"], ["farmer", "admin"]):
                    conn.rollback()
                    raise HTTPException(status_code=403, detail="Only farmers can publish labour jobs.")
                job_id = f"job_{uuid.uuid4().hex[:6]}"
                conn.execute(
                    """
                    INSERT INTO labour_jobs (
                        id, farmer_id, farmer_name, farm_id, title, job_type, crop_type,
                        work_location, work_date, working_hours, wage_per_day, required_workers,
                        hired_workers_count, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'open', ?)
                    """,
                    (
                        job_id,
                        user["id"],
                        user["name"],
                        payload.get("farm_id"),
                        payload["title"],
                        payload["job_type"],
                        payload["crop_type"],
                        payload["work_location"],
                        payload["work_date"],
                        payload.get("working_hours", "07:00 - 15:00"),
                        payload["wage_per_day"],
                        payload["required_workers"],
                        now,
                    ),
                )
                result_obj = {"job_id": job_id, "status": "open"}
                route = "/labour"

            elif action_type == "bidding_post":
                if not verify_user_role_in_db(user["id"], ["farmer", "admin"]):
                    conn.rollback()
                    raise HTTPException(status_code=403, detail="Only farmers can publish bidding listings.")
                list_id = f"list_{uuid.uuid4().hex[:6]}"
                conn.execute(
                    """
                    INSERT INTO bidding_listings (
                        id, farmer_id, farmer_name, farm_id, crop_name, variety, quantity_kg,
                        min_price_per_kg, harvest_date, location, bidding_deadline, status,
                        buyer_count, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?)
                    """,
                    (
                        list_id,
                        user["id"],
                        user["name"],
                        payload.get("farm_id"),
                        payload["crop_name"],
                        payload.get("variety"),
                        payload["quantity_kg"],
                        payload["min_price_per_kg"],
                        payload["harvest_date"],
                        payload["location"],
                        payload["bidding_deadline"],
                        now,
                    ),
                )
                result_obj = {"listing_id": list_id, "status": "active"}
                route = "/smart-market?section=bidding"

            elif action_type == "transport_book":
                book_id = f"tb_{uuid.uuid4().hex[:6]}"
                conn.execute(
                    """
                    INSERT INTO transport_bookings (
                        id, farmer_id, farmer_name, driver_id, driver_name, driver_phone,
                        purchase_order_id, produce_type, weight_kg, pickup_location,
                        delivery_destination, pickup_time, vehicle_type, estimated_distance_km,
                        total_fare, status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?)
                    """,
                    (
                        book_id,
                        user["id"],
                        user["name"],
                        payload["driver_id"],
                        payload["driver_name"],
                        payload.get("driver_phone"),
                        payload.get("purchase_order_id"),
                        payload["produce_type"],
                        payload["weight_kg"],
                        payload["pickup_location"],
                        payload["delivery_destination"],
                        payload["pickup_time"],
                        payload["vehicle_type"],
                        payload["estimated_distance_km"],
                        payload["total_fare"],
                        now,
                        now,
                    ),
                )
                result_obj = {"booking_id": book_id, "status": "requested"}
                route = "/transport"

            else:
                conn.rollback()
                raise HTTPException(status_code=400, detail=f"Unsupported action type: {action_type}")

            conn.execute(
                """
                UPDATE agri_action_confirmations
                SET status = 'executed', result_json = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (json.dumps(result_obj), now, req.confirmation_id, user["id"]),
            )
            conn.commit()
            return ConfirmActionResponse(
                confirmation_id=req.confirmation_id,
                status="executed",
                message=f"Confirmed and executed {action_type} successfully.",
                result=result_obj,
                route=route,
            )
        except HTTPException:
            raise
        except Exception as exc:
            conn.rollback()
            finalize_confirmation_status(req.confirmation_id, user["id"], "failed", {"error": str(exc)})
            raise HTTPException(status_code=500, detail="Failed to execute confirmed action safely.")
        finally:
            conn.close()


agri_assistant_service = AgriAssistantService()
