"""
AD-31: Offline Synchronization Service.
Handles allowlisted operation submission, atomic idempotency receipts,
conflict detection, consequential revalidation, and bounded user-scoped farm snapshots.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.features.assistant.security import verify_authorized_farm
from backend.app.features.equipment.service import discover_equipment
from backend.app.features.finance.service import EXPENSE_CATEGORIES, compute_financial_summary
from backend.app.features.market_intelligence.cache import query_market_observations
from backend.app.features.market_intelligence.normalization import normalize_market_record
from backend.app.features.post_harvest.inventory import list_inventory_lots
from backend.app.features.post_harvest.service import get_post_harvest_summary
from backend.app.features.synchronization.conflict_detection import detect_sync_conflict
from backend.app.features.synchronization.idempotency import (
    check_existing_sync_receipt,
    compute_payload_hash,
)
from backend.app.features.synchronization.operation_registry import ALLOWED_OPERATIONS
from backend.app.features.synchronization.schemas import SyncOperationSubmitRequest


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def submit_sync_operation(
    *,
    user_id: str,
    role: str,
    req: SyncOperationSubmitRequest,
) -> Dict[str, Any]:
    if req.operation_type not in ALLOWED_OPERATIONS:
        raise HTTPException(status_code=400, detail="Unsupported synchronization operation type.")

    op_meta = ALLOWED_OPERATIONS[req.operation_type]
    payload_hash = compute_payload_hash(req.payload)
    now_iso = _now_iso()

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if req.farm_id:
            verify_authorized_farm(cursor, req.farm_id, user_id, role)

        # 1. Atomic Idempotency Check
        existing = check_existing_sync_receipt(
            cursor,
            user_id=user_id,
            operation_type=req.operation_type,
            idempotency_key=req.idempotency_key,
            payload_hash=payload_hash,
        )
        if existing:
            return existing

        # 2. Conflict Detection
        conflict = detect_sync_conflict(
            cursor,
            operation_type=req.operation_type,
            user_id=user_id,
            farm_id=req.farm_id,
            payload=req.payload,
            resource_version=req.resource_version,
        )
        if conflict:
            rec_id = f"srec_{uuid.uuid4().hex[:10]}"
            resp_obj = {
                "status": "conflict_detected",
                "conflict": conflict,
                "message": conflict["reason"],
            }
            cursor.execute(
                """
                INSERT INTO sync_operation_receipts (
                    id, user_id, farm_id, operation_type, idempotency_key, payload_hash,
                    risk_class, status, result_resource_id, response_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'conflict_detected', NULL, ?, ?)
                """,
                (
                    rec_id,
                    user_id,
                    req.farm_id,
                    req.operation_type,
                    req.idempotency_key,
                    payload_hash,
                    op_meta["risk_class"],
                    json.dumps(resp_obj),
                    now_iso,
                ),
            )
            conn.commit()
            return {
                "receipt_id": rec_id,
                "operation_type": req.operation_type,
                "idempotency_key": req.idempotency_key,
                "risk_class": op_meta["risk_class"],
                "status": "conflict_detected",
                "duplicate_prevented": False,
                "response": resp_obj,
                "created_at": now_iso,
            }

        # 3. Consequential operations NEVER auto-execute blindly -> require explicit confirmation
        if op_meta["risk_class"] == "consequential":
            rec_id = f"srec_{uuid.uuid4().hex[:10]}"
            resp_obj = {
                "status": "confirmation_required",
                "module": op_meta["module"],
                "revalidated_payload": req.payload,
                "message": "Resource availability revalidated. Explicit farmer confirmation required to execute.",
            }
            cursor.execute(
                """
                INSERT INTO sync_operation_receipts (
                    id, user_id, farm_id, operation_type, idempotency_key, payload_hash,
                    risk_class, status, result_resource_id, response_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'consequential', 'confirmation_required', NULL, ?, ?)
                """,
                (
                    rec_id,
                    user_id,
                    req.farm_id,
                    req.operation_type,
                    req.idempotency_key,
                    payload_hash,
                    json.dumps(resp_obj),
                    now_iso,
                ),
            )
            conn.commit()
            return {
                "receipt_id": rec_id,
                "operation_type": req.operation_type,
                "idempotency_key": req.idempotency_key,
                "risk_class": "consequential",
                "status": "confirmation_required",
                "duplicate_prevented": False,
                "response": resp_obj,
                "created_at": now_iso,
            }

        # 4. Low-Risk Operations Execution
        result_resource_id: Optional[str] = None
        resp_obj: Dict[str, Any] = {}

        if req.operation_type == "create_manual_expense":
            amount = float(req.payload.get("amount_inr") or 0)
            if amount <= 0:
                raise HTTPException(status_code=422, detail="amount_inr must be positive.")
            cat = str(req.payload.get("category") or "miscellaneous").strip().lower()
            if cat not in EXPENSE_CATEGORIES:
                cat = "miscellaneous"
            desc = str(req.payload.get("description") or "Offline-recorded agricultural expense")[:240]
            tx_date = str(req.payload.get("tx_date") or now_iso[:10])
            tx_id = f"fin_off_{uuid.uuid4().hex[:10]}"
            sync_key = f"offline_sync:{user_id}:{req.idempotency_key}"

            cursor.execute(
                """
                INSERT INTO financial_transactions (
                    id, user_id, farm_id, category, tx_type, amount_inr,
                    tx_date, description, source_module, related_id,
                    status, provenance, sync_key, is_manual, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'expense', ?, ?, ?, 'offline_sync', ?, 'recorded', 'AD-31 Offline Sync', ?, 1, ?, ?)
                """,
                (
                    tx_id,
                    user_id,
                    req.farm_id or "farm_001",
                    cat,
                    amount,
                    tx_date,
                    desc,
                    req.idempotency_key,
                    sync_key,
                    now_iso,
                    now_iso,
                ),
            )
            result_resource_id = tx_id
            resp_obj = {"transaction_id": tx_id, "amount_inr": amount, "category": cat, "status": "recorded"}

        elif req.operation_type == "record_harvest_observation":
            qty = float(req.payload.get("actual_harvested_kg") or req.payload.get("estimated_yield_kg") or 0)
            if qty <= 0:
                raise HTTPException(status_code=422, detail="Harvest quantity must be positive.")
            hrv_id = f"hrv_off_{uuid.uuid4().hex[:10]}"
            crop = str(req.payload.get("crop") or "Tomato")
            cursor.execute(
                """
                INSERT INTO harvest_records (
                    id, farmer_id, farm_id, crop, cultivated_area_ha,
                    expected_harvest_date, estimated_yield_kg, actual_harvested_kg,
                    crop_maturity, harvest_quality, is_simulated, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Optimal', 'Grade A', 0, ?, ?)
                """,
                (
                    hrv_id,
                    user_id,
                    req.farm_id or "farm_001",
                    crop,
                    float(req.payload.get("cultivated_area_ha") or 1.0),
                    str(req.payload.get("expected_harvest_date") or now_iso[:10]),
                    qty,
                    qty,
                    now_iso,
                    now_iso,
                ),
            )
            result_resource_id = hrv_id
            resp_obj = {"harvest_id": hrv_id, "crop": crop, "quantity_kg": qty}

        elif req.operation_type == "record_market_price":
            norm = normalize_market_record(
                commodity=str(req.payload.get("commodity") or "Tomato"),
                state=str(req.payload.get("state") or "Karnataka"),
                district=str(req.payload.get("district") or "Mandya"),
                market=str(req.payload.get("market") or "Local APMC"),
                observation_date=str(req.payload.get("observation_date") or now_iso[:10]),
                modal_price=float(req.payload.get("modal_price") or 0),
                unit=str(req.payload.get("unit") or "INR/kg"),
                source_type="manual_farmer",
                source_name="Offline Farmer Entry",
                provenance_label="Farmer-Entered Market Price (Synced)",
            )
            if not norm:
                raise HTTPException(status_code=422, detail="Invalid market price payload.")
            mkt_id = f"mkt_off_{uuid.uuid4().hex[:10]}"
            cursor.execute(
                """
                INSERT OR IGNORE INTO market_price_observations (
                    id, commodity, variety, grade, state, district, market,
                    observation_date, min_price_per_quintal, max_price_per_quintal,
                    modal_price_per_quintal, modal_price_per_kg, original_unit,
                    source_type, source_name, provenance_label, retrieved_at, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    mkt_id,
                    norm["commodity"],
                    norm["variety"],
                    norm["grade"],
                    norm["state"],
                    norm["district"],
                    norm["market"],
                    norm["observation_date"],
                    norm["min_price_per_quintal"],
                    norm["max_price_per_quintal"],
                    norm["modal_price_per_quintal"],
                    norm["modal_price_per_kg"],
                    norm["original_unit"],
                    norm["source_type"],
                    norm["source_name"],
                    norm["provenance_label"],
                    now_iso,
                    user_id,
                ),
            )
            result_resource_id = mkt_id
            resp_obj = {"observation_id": mkt_id, "commodity": norm["commodity"], "modal_price_per_kg": norm["modal_price_per_kg"]}

        rec_id = f"srec_{uuid.uuid4().hex[:10]}"
        cursor.execute(
            """
            INSERT INTO sync_operation_receipts (
                id, user_id, farm_id, operation_type, idempotency_key, payload_hash,
                risk_class, status, result_resource_id, response_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'low_risk', 'synchronized', ?, ?, ?)
            """,
            (
                rec_id,
                user_id,
                req.farm_id,
                req.operation_type,
                req.idempotency_key,
                payload_hash,
                result_resource_id,
                json.dumps(resp_obj),
                now_iso,
            ),
        )
        conn.commit()
        return {
            "receipt_id": rec_id,
            "operation_type": req.operation_type,
            "idempotency_key": req.idempotency_key,
            "risk_class": "low_risk",
            "status": "synchronized",
            "result_resource_id": result_resource_id,
            "duplicate_prevented": False,
            "response": resp_obj,
            "created_at": now_iso,
        }
    finally:
        conn.close()


def list_user_sync_receipts(user_id: str, limit: int = 30) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM sync_operation_receipts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["response"] = json.loads(d.pop("response_json") or "{}")
            out.append(d)
        return out
    finally:
        conn.close()


def get_bounded_user_snapshot(user_id: str, role: str, farm_id: Optional[str] = None) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farms = [
            dict(r)
            for r in cursor.execute(
                "SELECT * FROM farms WHERE farmer_id = ? ORDER BY created_at ASC",
                (user_id,),
            ).fetchall()
        ]
        target_farm = None
        if farm_id:
            target_farm = verify_authorized_farm(cursor, farm_id, user_id, role)
        elif farms:
            target_farm = farms[0]

        fin = compute_financial_summary(cursor, user_id, target_farm) if target_farm else None
        dec_run = None
        if target_farm:
            r = cursor.execute(
                "SELECT * FROM agricultural_decision_runs WHERE user_id = ? AND farm_id = ? ORDER BY created_at DESC LIMIT 1",
                (user_id, target_farm["id"]),
            ).fetchone()
            dec_run = dict(r) if r else None
    finally:
        conn.close()

    lots = list_inventory_lots(user_id, role, target_farm["id"] if target_farm else None)
    ph_sum = get_post_harvest_summary(user_id, role, target_farm["id"] if target_farm else None)
    mkt_obs = query_market_observations(limit=25)
    eq_listings = discover_equipment()

    return {
        "snapshot_timestamp": now_iso,
        "user_id": user_id,
        "farms": farms,
        "finance_snapshot": fin,
        "inventory_snapshot": {"summary": ph_sum, "lots": lots[:20]},
        "market_snapshot": mkt_obs,
        "equipment_snapshot": eq_listings[:20],
        "decision_snapshot": dec_run,
    }
