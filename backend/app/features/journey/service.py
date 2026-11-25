"""
AD-32: Unified Seed-to-Sale Journey Orchestration Service.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.features.assistant.security import verify_authorized_farm
from backend.app.features.decision_intelligence.schemas import DecisionEvaluateRequest
from backend.app.features.decision_intelligence.service import evaluate_unified_decisions
from backend.app.features.journey.module_adapters import (
    build_journey_financial_overview,
    verify_and_describe_linked_record,
)
from backend.app.features.journey.progress_engine import compute_journey_progress
from backend.app.features.journey.schemas import (
    JourneyActivityCreateRequest,
    JourneyCreateRequest,
    JourneyLinkRecordRequest,
    JourneyUpdateRequest,
    StageStatusUpdateRequest,
)
from backend.app.features.journey.stage_registry import NINE_STAGES

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_owned_journey(cursor, journey_id: str, user_id: str, role: str) -> Dict[str, Any]:
    row = cursor.execute("SELECT * FROM crop_journeys WHERE id = ?", (journey_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Journey '{journey_id}' not found.")
    if role != "admin" and row["farmer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized: Crop journey belongs to another farmer.")
    return dict(row)


def create_journey(user_id: str, role: str, payload: JourneyCreateRequest) -> Dict[str, Any]:
    now_iso = _now_iso()
    jrn_id = f"jrn_{uuid.uuid4().hex[:10]}"
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        verify_authorized_farm(cursor, payload.farm_id, user_id, role)
        cursor.execute(
            """
            INSERT INTO crop_journeys (
                id, farmer_id, farm_id, crop_name, crop_variety, season,
                cultivated_area_acres, cultivation_budget_inr, planned_sowing_date,
                expected_harvest_date, status, is_demonstration, seed_plan_json,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?, ?, ?)
            """,
            (
                jrn_id,
                user_id,
                payload.farm_id,
                payload.crop_name,
                payload.crop_variety,
                payload.season,
                payload.cultivated_area_acres,
                payload.cultivation_budget_inr,
                payload.planned_sowing_date,
                payload.expected_harvest_date,
                json.dumps(payload.seed_plan) if payload.seed_plan else None,
                now_iso,
                now_iso,
            ),
        )

        for st in NINE_STAGES:
            initial_status = "completed" if (st["stage_key"] == "crop_seed_selection" and payload.seed_plan) else (
                "planning" if st["stage_key"] == "crop_seed_selection" else "not_started"
            )
            cursor.execute(
                """
                INSERT INTO crop_journey_stages (
                    id, journey_id, stage_key, stage_order, title, status, completed_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"jst_{uuid.uuid4().hex[:10]}",
                    jrn_id,
                    st["stage_key"],
                    st["order"],
                    st["title"],
                    initial_status,
                    now_iso if initial_status == "completed" else None,
                    now_iso,
                ),
            )
        conn.commit()
        jrn = dict(cursor.execute("SELECT * FROM crop_journeys WHERE id = ?", (jrn_id,)).fetchone())
        stages = [
            dict(r)
            for r in cursor.execute(
                "SELECT * FROM crop_journey_stages WHERE journey_id = ? ORDER BY stage_order ASC",
                (jrn_id,),
            ).fetchall()
        ]
        return {**jrn, "is_demonstration": bool(jrn["is_demonstration"]), "progress": compute_journey_progress(jrn, stages)}
    finally:
        conn.close()


def list_journeys(user_id: str, role: str, farm_id: Optional[str] = None, include_archived: bool = False) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        clauses = ["farmer_id = ?"]
        params: List[Any] = [user_id]
        if farm_id:
            verify_authorized_farm(cursor, farm_id, user_id, role)
            clauses.append("farm_id = ?")
            params.append(farm_id)
        if not include_archived:
            clauses.append("status != 'archived'")
        rows = cursor.execute(
            f"SELECT * FROM crop_journeys WHERE {' AND '.join(clauses)} ORDER BY is_demonstration ASC, updated_at DESC",
            params,
        ).fetchall()

        results = []
        for r in rows:
            j = dict(r)
            stages = [
                dict(s)
                for s in cursor.execute(
                    "SELECT * FROM crop_journey_stages WHERE journey_id = ? ORDER BY stage_order ASC",
                    (j["id"],),
                ).fetchall()
            ]
            j["is_demonstration"] = bool(j["is_demonstration"])
            j["progress"] = compute_journey_progress(j, stages)
            results.append(j)
        return results
    finally:
        conn.close()


async def get_journey_detail(user_id: str, role: str, journey_id: str) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        jrn = _get_owned_journey(cursor, journey_id, user_id, role)
        farm_row = dict(cursor.execute("SELECT * FROM farms WHERE id = ?", (jrn["farm_id"],)).fetchone())
        stages_db = [
            dict(r)
            for r in cursor.execute(
                "SELECT * FROM crop_journey_stages WHERE journey_id = ? ORDER BY stage_order ASC",
                (journey_id,),
            ).fetchall()
        ]
        activities = [
            dict(r)
            for r in cursor.execute(
                "SELECT * FROM crop_journey_activities WHERE journey_id = ? ORDER BY recorded_date DESC, created_at DESC",
                (journey_id,),
            ).fetchall()
        ]
        links = [
            dict(r)
            for r in cursor.execute(
                "SELECT * FROM crop_journey_module_links WHERE journey_id = ? ORDER BY created_at DESC",
                (journey_id,),
            ).fetchall()
        ]
        fin_overview = build_journey_financial_overview(
            cursor, user_id=user_id, farm_row=farm_row, journey=jrn, activities=activities
        )
    finally:
        conn.close()

    meta_by_key = {m["stage_key"]: m for m in NINE_STAGES}
    enriched_stages = []
    for s in stages_db:
        meta = meta_by_key.get(s["stage_key"], {})
        enriched_stages.append({
            **s,
            "kannada": meta.get("kannada"),
            "primary_module": meta.get("primary_module"),
            "route": meta.get("route"),
            "secondary_routes": meta.get("secondary_routes", []),
            "completion_rule": meta.get("completion_rule"),
            "activities": [a for a in activities if a["stage_key"] == s["stage_key"]],
            "linked_records": [l for l in links if l["stage_key"] == s["stage_key"]],
        })

    progress = compute_journey_progress(jrn, stages_db)

    # AD-30 Next Recommended Actions
    next_actions: List[Dict[str, Any]] = []
    try:
        dec = await evaluate_unified_decisions(
            user_id=user_id,
            role=role,
            req=DecisionEvaluateRequest(farm_id=jrn["farm_id"], persist_run=False),
        )
        next_actions = dec["action_plan"]["ranked_recommendations"][:4]
    except Exception as exc:
        logger.debug("AD-30 recommendation fetch skipped in journey detail: %s", exc)

    jrn["is_demonstration"] = bool(jrn["is_demonstration"])
    jrn["seed_plan"] = json.loads(jrn["seed_plan_json"]) if jrn.get("seed_plan_json") else None

    return {
        "journey": jrn,
        "farm_name": farm_row["farm_name"],
        "progress": progress,
        "stages": enriched_stages,
        "activities": activities,
        "linked_records": links,
        "financial_overview": fin_overview,
        "recommended_next_actions": next_actions,
    }


def update_journey(user_id: str, role: str, journey_id: str, payload: JourneyUpdateRequest) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        jrn = _get_owned_journey(cursor, journey_id, user_id, role)
        cursor.execute(
            """
            UPDATE crop_journeys
            SET crop_variety = ?, cultivation_budget_inr = ?, actual_sowing_date = ?,
                actual_harvest_date = ?, status = ?, seed_plan_json = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload.crop_variety if payload.crop_variety is not None else jrn["crop_variety"],
                payload.cultivation_budget_inr if payload.cultivation_budget_inr is not None else jrn["cultivation_budget_inr"],
                payload.actual_sowing_date if payload.actual_sowing_date is not None else jrn["actual_sowing_date"],
                payload.actual_harvest_date if payload.actual_harvest_date is not None else jrn["actual_harvest_date"],
                payload.status if payload.status is not None else jrn["status"],
                json.dumps(payload.seed_plan) if payload.seed_plan is not None else jrn["seed_plan_json"],
                now_iso,
                journey_id,
            ),
        )
        if payload.seed_plan is not None:
            cursor.execute(
                "UPDATE crop_journey_stages SET status = 'completed', completed_at = ?, updated_at = ? WHERE journey_id = ? AND stage_key = 'crop_seed_selection'",
                (now_iso, now_iso, journey_id),
            )
        conn.commit()
        return dict(cursor.execute("SELECT * FROM crop_journeys WHERE id = ?", (journey_id,)).fetchone())
    finally:
        conn.close()


def update_stage_status(
    user_id: str,
    role: str,
    journey_id: str,
    stage_key: str,
    payload: StageStatusUpdateRequest,
) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        _get_owned_journey(cursor, journey_id, user_id, role)
        st = cursor.execute(
            "SELECT * FROM crop_journey_stages WHERE journey_id = ? AND stage_key = ?",
            (journey_id, stage_key),
        ).fetchone()
        if not st:
            raise HTTPException(status_code=404, detail=f"Stage '{stage_key}' not found in journey.")
        comp_at = now_iso if payload.status == "completed" else None
        cursor.execute(
            "UPDATE crop_journey_stages SET status = ?, completed_at = ?, notes = ?, updated_at = ? WHERE id = ?",
            (payload.status, comp_at, payload.notes, now_iso, st["id"]),
        )
        cursor.execute("UPDATE crop_journeys SET updated_at = ? WHERE id = ?", (now_iso, journey_id))
        conn.commit()
        return dict(cursor.execute("SELECT * FROM crop_journey_stages WHERE id = ?", (st["id"],)).fetchone())
    finally:
        conn.close()


def record_journey_activity(
    user_id: str,
    role: str,
    journey_id: str,
    payload: JourneyActivityCreateRequest,
) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        _get_owned_journey(cursor, journey_id, user_id, role)
        if payload.idempotency_key:
            dup = cursor.execute(
                "SELECT id FROM crop_journey_activities WHERE idempotency_key = ?",
                (payload.idempotency_key,),
            ).fetchone()
            if dup:
                raise HTTPException(status_code=409, detail="Duplicate journey activity prevented.")

        act_id = f"jact_{uuid.uuid4().hex[:10]}"
        cursor.execute(
            """
            INSERT INTO crop_journey_activities (
                id, journey_id, farmer_id, stage_key, activity_type, title,
                notes, recorded_date, quantity_value, quantity_unit, cost_inr,
                idempotency_key, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                act_id,
                journey_id,
                user_id,
                payload.stage_key,
                payload.activity_type,
                payload.title,
                payload.notes,
                payload.recorded_date,
                payload.quantity_value,
                payload.quantity_unit,
                payload.cost_inr,
                payload.idempotency_key,
                now_iso,
            ),
        )

        # Genuine milestone updates driven by actual recorded activities
        if payload.stage_key == "land_prep_sowing" and "sow" in payload.activity_type.lower():
            cursor.execute(
                "UPDATE crop_journeys SET actual_sowing_date = COALESCE(actual_sowing_date, ?), updated_at = ? WHERE id = ?",
                (payload.recorded_date, now_iso, journey_id),
            )
            cursor.execute(
                "UPDATE crop_journey_stages SET status = 'completed', completed_at = ?, updated_at = ? WHERE journey_id = ? AND stage_key = 'land_prep_sowing'",
                (now_iso, now_iso, journey_id),
            )
        else:
            cursor.execute(
                "UPDATE crop_journey_stages SET status = CASE WHEN status = 'not_started' THEN 'in_progress' ELSE status END, updated_at = ? WHERE journey_id = ? AND stage_key = ?",
                (now_iso, journey_id, payload.stage_key),
            )
            cursor.execute("UPDATE crop_journeys SET updated_at = ? WHERE id = ?", (now_iso, journey_id))

        conn.commit()
        return dict(cursor.execute("SELECT * FROM crop_journey_activities WHERE id = ?", (act_id,)).fetchone())
    finally:
        conn.close()


def link_module_record(
    user_id: str,
    role: str,
    journey_id: str,
    payload: JourneyLinkRecordRequest,
) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        _get_owned_journey(cursor, journey_id, user_id, role)
        label = payload.summary_label or verify_and_describe_linked_record(
            cursor,
            user_id=user_id,
            role=role,
            source_module=payload.source_module,
            record_id=payload.record_id,
        )
        # Always verify ownership even when summary_label was provided
        if payload.summary_label:
            verify_and_describe_linked_record(
                cursor,
                user_id=user_id,
                role=role,
                source_module=payload.source_module,
                record_id=payload.record_id,
            )

        lnk_id = f"jlnk_{uuid.uuid4().hex[:10]}"
        cursor.execute(
            """
            INSERT OR IGNORE INTO crop_journey_module_links (
                id, journey_id, farmer_id, stage_key, source_module, record_id, summary_label, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (lnk_id, journey_id, user_id, payload.stage_key, payload.source_module, payload.record_id, label, now_iso),
        )
        if payload.source_module == "post_harvest_harvest":
            cursor.execute(
                "UPDATE crop_journey_stages SET status = 'completed', completed_at = ?, updated_at = ? WHERE journey_id = ? AND stage_key = 'harvest_planning'",
                (now_iso, now_iso, journey_id),
            )
        conn.commit()
        row = cursor.execute(
            "SELECT * FROM crop_journey_module_links WHERE journey_id = ? AND source_module = ? AND record_id = ?",
            (journey_id, payload.source_module, payload.record_id),
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


async def generate_journey_report(user_id: str, role: str, journey_id: str) -> Dict[str, Any]:
    detail = await get_journey_detail(user_id, role, journey_id)
    j = detail["journey"]
    fin = detail["financial_overview"]
    return {
        "report_title": f"RaithaMitra Seed-to-Sale Report — {j['crop_name']} ({j['season']})",
        "generated_at": _now_iso(),
        "farm_name": detail["farm_name"],
        "journey": j,
        "progress": detail["progress"],
        "stages_summary": [
            {"order": s["stage_order"], "title": s["title"], "status": s["status"], "completed_at": s["completed_at"]}
            for s in detail["stages"]
        ],
        "activities_count": len(detail["activities"]),
        "activities": detail["activities"],
        "linked_records": detail["linked_records"],
        "financial_overview": fin,
    }
