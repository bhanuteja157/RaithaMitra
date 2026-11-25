"""
AD-30: Centralized Agricultural Decision Intelligence Service.
Orchestrates OBSERVE -> PREDICT -> SIMULATE -> OPTIMIZE -> ACT -> EVALUATE
with persistent decision history, preferences, authorized action previews, and feedback.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.features.assistant.security import verify_authorized_farm
from backend.app.features.decision_intelligence.action_planner import build_prioritized_action_plan
from backend.app.features.decision_intelligence.conflict_resolver import detect_and_resolve_conflicts
from backend.app.features.decision_intelligence.context_collector import collect_unified_farm_context
from backend.app.features.decision_intelligence.schemas import (
    ActionPreviewRequest,
    DecisionEvaluateRequest,
    DecisionFeedbackCreate,
    PreferenceUpdateRequest,
    RecommendationStatusUpdate,
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_user_preference(user_id: str) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT * FROM agricultural_decision_preferences WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        if not row:
            return {"user_id": user_id, "preference_profile": "balanced", "custom_weights": None}
        d = dict(row)
        return {
            "user_id": d["user_id"],
            "preference_profile": d["preference_profile"],
            "custom_weights": json.loads(d["custom_weights_json"]) if d.get("custom_weights_json") else None,
            "updated_at": d["updated_at"],
        }
    finally:
        conn.close()


def update_user_preference(user_id: str, payload: PreferenceUpdateRequest) -> Dict[str, Any]:
    now_iso = _now_iso()
    cw_json = json.dumps(payload.custom_weights) if payload.custom_weights else None
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO agricultural_decision_preferences (user_id, preference_profile, custom_weights_json, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                preference_profile = excluded.preference_profile,
                custom_weights_json = excluded.custom_weights_json,
                updated_at = excluded.updated_at
            """,
            (user_id, payload.preference_profile, cw_json, now_iso),
        )
        conn.commit()
        return get_user_preference(user_id)
    finally:
        conn.close()


async def evaluate_unified_decisions(
    *,
    user_id: str,
    role: str,
    req: DecisionEvaluateRequest,
) -> Dict[str, Any]:
    pref = req.preference_profile or get_user_preference(user_id)["preference_profile"]
    ctx = await collect_unified_farm_context(user_id=user_id, role=role, farm_id=req.farm_id)
    conflicts = detect_and_resolve_conflicts(ctx)
    plan = build_prioritized_action_plan(ctx=ctx, conflicts=conflicts, preference_profile=pref)

    run_id = f"drun_{uuid.uuid4().hex[:10]}"
    now_iso = _now_iso()
    summary_text = (
        f"Evaluated {len(ctx['evidence'])} evidence items across {ctx['farm'].farm_name} "
        f"({ctx['farm'].primary_crop}, {ctx['farm'].crop_stage}); detected {len(conflicts)} cross-module conflicts "
        f"and prioritized {len(plan['ranked_recommendations'])} actions under '{pref}' profile."
    )

    if req.persist_run:
        conn = get_db_connection()
        try:
            conn.execute(
                """
                INSERT INTO agricultural_decision_runs (
                    id, user_id, farm_id, preference_profile, evidence_count,
                    conflicts_count, recommendations_count, summary_text, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    user_id,
                    req.farm_id,
                    pref,
                    len(ctx["evidence"]),
                    len(conflicts),
                    len(plan["ranked_recommendations"]),
                    summary_text,
                    now_iso,
                ),
            )
            for ev in ctx["evidence"]:
                conn.execute(
                    """
                    INSERT INTO agricultural_decision_evidence (
                        id, run_id, farm_id, source_module, source_provider,
                        observed_value, unit, classification, data_quality, freshness,
                        observation_timestamp, retrieval_timestamp, applicable_crop, limitations
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        ev["evidence_id"],
                        run_id,
                        req.farm_id,
                        ev["source_module"],
                        ev["source_provider"],
                        json.dumps(ev["observed_value"]),
                        ev.get("unit"),
                        ev["classification"],
                        ev["data_quality"],
                        ev["freshness"],
                        ev.get("observation_timestamp"),
                        ev["retrieval_timestamp"],
                        ev.get("applicable_crop"),
                        ev.get("limitations"),
                    ),
                )
            for rec in plan["ranked_recommendations"]:
                conn.execute(
                    """
                    INSERT INTO agricultural_decision_recommendations (
                        id, run_id, user_id, farm_id, title, category, priority,
                        action_group, route, score, feasible, status,
                        explanation_json, dependencies_json, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
                    """,
                    (
                        rec["id"],
                        run_id,
                        user_id,
                        req.farm_id,
                        rec["title"],
                        rec["category"],
                        rec["priority"],
                        rec["action_group"],
                        rec["route"],
                        rec["heuristic_ranking_score"],
                        1 if rec["feasible"] else 0,
                        json.dumps(rec["explanation"]),
                        json.dumps(rec.get("dependencies", [])),
                        now_iso,
                        now_iso,
                    ),
                )
            conn.commit()
        finally:
            conn.close()

    return {
        "run_id": run_id,
        "timestamp": now_iso,
        "summary_text": summary_text,
        "farm_context": {
            "farm_id": ctx["farm"].id,
            "farm_name": ctx["farm"].farm_name,
            "crop": ctx["farm"].primary_crop,
            "crop_stage": ctx["farm"].crop_stage,
            "land_area_ha": ctx["farm"].land_area_ha,
            "available_water_m3": ctx["farm"].available_water_m3,
            "budget_allocated_inr": ctx["finance"]["allocated_budget_inr"],
            "budget_remaining_inr": ctx["finance"]["remaining_budget_inr"],
            "weather": ctx["weather"],
            "adapters": ctx["adapters"],
        },
        "evidence": ctx["evidence"],
        "unavailable_modules": ctx["unavailable_modules"],
        "conflicts": conflicts,
        "action_plan": plan,
        "schemes": ctx["schemes"],
    }


def update_recommendation_status(
    user_id: str,
    role: str,
    rec_id: str,
    payload: RecommendationStatusUpdate,
) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT * FROM agricultural_decision_recommendations WHERE id = ?",
            (rec_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Recommendation not found.")
        if role != "admin" and row["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized: Recommendation belongs to another farmer.")
        conn.execute(
            "UPDATE agricultural_decision_recommendations SET status = ?, updated_at = ? WHERE id = ?",
            (payload.status, now_iso, rec_id),
        )
        conn.commit()
        return dict(conn.execute("SELECT * FROM agricultural_decision_recommendations WHERE id = ?", (rec_id,)).fetchone())
    finally:
        conn.close()


def create_action_preview(user_id: str, role: str, payload: ActionPreviewRequest) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        verify_authorized_farm(cursor, payload.farm_id, user_id, role)
        if payload.idempotency_key:
            dup = cursor.execute(
                "SELECT id FROM agricultural_decision_actions WHERE idempotency_key = ?",
                (payload.idempotency_key,),
            ).fetchone()
            if dup:
                raise HTTPException(status_code=409, detail="Duplicate action preview prevented.")

        act_id = f"dact_{uuid.uuid4().hex[:10]}"
        target_map = {
            "prepare_irrigation": "irrigation",
            "prepare_seed_plan": "biointel",
            "prepare_labour_draft": "labour",
            "prepare_equipment_draft": "equipment",
            "prepare_bidding_draft": "bidding",
            "prepare_transport_draft": "transportation",
            "prepare_storage_plan": "post_harvest",
        }
        cursor.execute(
            """
            INSERT INTO agricultural_decision_actions (
                id, run_id, recommendation_id, user_id, farm_id,
                action_type, target_module, preview_payload_json,
                status, idempotency_key, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'previewed', ?, ?, ?)
            """,
            (
                act_id,
                payload.run_id,
                payload.recommendation_id,
                user_id,
                payload.farm_id,
                payload.action_type,
                target_map[payload.action_type],
                json.dumps(payload.payload),
                payload.idempotency_key,
                now_iso,
                now_iso,
            ),
        )
        conn.commit()
        return dict(cursor.execute("SELECT * FROM agricultural_decision_actions WHERE id = ?", (act_id,)).fetchone())
    finally:
        conn.close()


def confirm_decision_action(user_id: str, role: str, action_id: str) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        row = conn.execute("SELECT * FROM agricultural_decision_actions WHERE id = ?", (action_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Action preview not found.")
        if role != "admin" and row["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized: Action belongs to another user.")
        if row["status"] == "confirmed":
            raise HTTPException(status_code=409, detail="Action already confirmed; replay prevented.")
        if row["status"] != "previewed":
            raise HTTPException(status_code=400, detail=f"Cannot confirm action in status '{row['status']}'.")

        ref = f"confirmed_{row['target_module']}_{uuid.uuid4().hex[:8]}"
        conn.execute(
            "UPDATE agricultural_decision_actions SET status = 'confirmed', result_reference = ?, updated_at = ? WHERE id = ?",
            (ref, now_iso, action_id),
        )
        conn.commit()
        return dict(conn.execute("SELECT * FROM agricultural_decision_actions WHERE id = ?", (action_id,)).fetchone())
    finally:
        conn.close()


def get_decision_history(user_id: str, farm_id: Optional[str] = None, limit: int = 15) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        if farm_id:
            runs = [
                dict(r)
                for r in conn.execute(
                    "SELECT * FROM agricultural_decision_runs WHERE user_id = ? AND farm_id = ? ORDER BY created_at DESC LIMIT ?",
                    (user_id, farm_id, limit),
                ).fetchall()
            ]
        else:
            runs = [
                dict(r)
                for r in conn.execute(
                    "SELECT * FROM agricultural_decision_runs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                    (user_id, limit),
                ).fetchall()
            ]
        feedback = [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM agricultural_decision_feedback WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
                (user_id,),
            ).fetchall()
        ]
        return {"runs": runs, "feedback": feedback}
    finally:
        conn.close()


def record_decision_feedback(user_id: str, role: str, payload: DecisionFeedbackCreate) -> Dict[str, Any]:
    now_iso = _now_iso()
    fb_id = f"dfb_{uuid.uuid4().hex[:10]}"
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        verify_authorized_farm(cursor, payload.farm_id, user_id, role)
        cursor.execute(
            """
            INSERT INTO agricultural_decision_feedback (
                id, run_id, recommendation_id, user_id, farm_id,
                followed, actual_cost_inr, actual_yield_kg, actual_price_per_kg,
                actual_water_m3, outcome_notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                fb_id,
                payload.run_id,
                payload.recommendation_id,
                user_id,
                payload.farm_id,
                1 if payload.followed else 0,
                payload.actual_cost_inr,
                payload.actual_yield_kg,
                payload.actual_price_per_kg,
                payload.actual_water_m3,
                payload.outcome_notes,
                now_iso,
            ),
        )
        conn.commit()
        return dict(cursor.execute("SELECT * FROM agricultural_decision_feedback WHERE id = ?", (fb_id,)).fetchone())
    finally:
        conn.close()
