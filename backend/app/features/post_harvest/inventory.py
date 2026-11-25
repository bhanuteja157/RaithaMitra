"""
AD-27: Persistent SQLite Inventory & Harvest Lot Ledger.
Enforces strict farmer ownership, positive quantities, non-negative stock,
and idempotency keys to prevent duplicate deductions.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.features.post_harvest.schemas import (
    InventoryConditionsUpdate,
    InventoryEventRequest,
    InventoryLotCreate,
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _verify_farm_owner(cursor, farm_id: str, user_id: str, role: str) -> Dict[str, Any]:
    row = cursor.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found.")
    if role != "admin" and row["farmer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized: Farm belongs to another farmer.")
    return dict(row)


def _get_owned_lot(cursor, lot_id: str, user_id: str, role: str) -> Dict[str, Any]:
    row = cursor.execute("SELECT * FROM post_harvest_lots WHERE id = ?", (lot_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Inventory lot '{lot_id}' not found.")
    if role != "admin" and row["farmer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized: Inventory lot belongs to another farmer.")
    return dict(row)


def create_inventory_lot(user_id: str, role: str, payload: InventoryLotCreate) -> Dict[str, Any]:
    now_iso = _now_iso()
    lot_id = f"lot_{uuid.uuid4().hex[:10]}"
    evt_id = f"ev_{uuid.uuid4().hex[:10]}"

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        _verify_farm_owner(cursor, payload.farm_id, user_id, role)
        cursor.execute(
            """
            INSERT INTO post_harvest_lots (
                id, farmer_id, farm_id, harvest_record_id, crop, variety, harvest_date,
                initial_quantity_kg, available_quantity_kg, reserved_quantity_kg,
                sold_quantity_kg, transported_quantity_kg, damaged_quantity_kg, discarded_quantity_kg,
                quality_grade, storage_method, storage_location, recorded_temp_c,
                recorded_humidity_pct, packaging_type, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, 0.0, 0.0, 0.0, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
            """,
            (
                lot_id,
                user_id,
                payload.farm_id,
                payload.harvest_record_id,
                payload.crop,
                payload.variety,
                payload.harvest_date,
                payload.initial_quantity_kg,
                payload.initial_quantity_kg,
                payload.quality_grade,
                payload.storage_method,
                payload.storage_location,
                payload.recorded_temp_c,
                payload.recorded_humidity_pct,
                payload.packaging_type,
                now_iso,
                now_iso,
            ),
        )
        cursor.execute(
            """
            INSERT INTO post_harvest_lot_events (
                id, lot_id, farmer_id, event_type, quantity_kg, delta_available_kg, notes, created_at
            ) VALUES (?, ?, ?, 'created', ?, ?, ?, ?)
            """,
            (evt_id, lot_id, user_id, payload.initial_quantity_kg, payload.initial_quantity_kg, "Initial harvest lot recorded", now_iso),
        )
        conn.commit()
        return dict(cursor.execute("SELECT * FROM post_harvest_lots WHERE id = ?", (lot_id,)).fetchone())
    finally:
        conn.close()


def list_inventory_lots(user_id: str, role: str, farm_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if farm_id:
            _verify_farm_owner(cursor, farm_id, user_id, role)
            rows = cursor.execute(
                "SELECT * FROM post_harvest_lots WHERE farmer_id = ? AND farm_id = ? ORDER BY created_at DESC",
                (user_id, farm_id),
            ).fetchall()
        else:
            rows = cursor.execute(
                "SELECT * FROM post_harvest_lots WHERE farmer_id = ? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_lot_conditions(user_id: str, role: str, lot_id: str, payload: InventoryConditionsUpdate) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        lot = _get_owned_lot(cursor, lot_id, user_id, role)
        cursor.execute(
            """
            UPDATE post_harvest_lots
            SET storage_method = ?, storage_location = ?, recorded_temp_c = ?,
                recorded_humidity_pct = ?, packaging_type = ?, quality_grade = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload.storage_method if payload.storage_method is not None else lot["storage_method"],
                payload.storage_location if payload.storage_location is not None else lot["storage_location"],
                payload.recorded_temp_c if payload.recorded_temp_c is not None else lot["recorded_temp_c"],
                payload.recorded_humidity_pct if payload.recorded_humidity_pct is not None else lot["recorded_humidity_pct"],
                payload.packaging_type if payload.packaging_type is not None else lot["packaging_type"],
                payload.quality_grade if payload.quality_grade is not None else lot["quality_grade"],
                now_iso,
                lot_id,
            ),
        )
        cursor.execute(
            """
            INSERT INTO post_harvest_lot_events (
                id, lot_id, farmer_id, event_type, quantity_kg, delta_available_kg, notes, created_at
            ) VALUES (?, ?, ?, 'conditions_updated', 0.0, 0.0, ?, ?)
            """,
            (f"ev_{uuid.uuid4().hex[:10]}", lot_id, user_id, "Storage conditions updated", now_iso),
        )
        conn.commit()
        return dict(cursor.execute("SELECT * FROM post_harvest_lots WHERE id = ?", (lot_id,)).fetchone())
    finally:
        conn.close()


def record_lot_event(user_id: str, role: str, lot_id: str, payload: InventoryEventRequest) -> Dict[str, Any]:
    now_iso = _now_iso()
    qty = float(payload.quantity_kg)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if payload.idempotency_key:
            dup = cursor.execute(
                "SELECT id FROM post_harvest_lot_events WHERE idempotency_key = ?",
                (payload.idempotency_key,),
            ).fetchone()
            if dup:
                raise HTTPException(
                    status_code=409,
                    detail="Duplicate inventory deduction prevented (idempotency_key already processed).",
                )

        lot = _get_owned_lot(cursor, lot_id, user_id, role)
        avail = float(lot["available_quantity_kg"])
        reserved = float(lot["reserved_quantity_kg"])
        sold = float(lot["sold_quantity_kg"])
        transported = float(lot["transported_quantity_kg"])
        damaged = float(lot["damaged_quantity_kg"])
        discarded = float(lot["discarded_quantity_kg"])

        if qty > avail + 1e-6:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient available inventory: requested {qty} kg, only {avail} kg available.",
            )

        new_avail = round(avail - qty, 3)
        if payload.event_type == "damage":
            damaged = round(damaged + qty, 3)
        elif payload.event_type == "discard":
            discarded = round(discarded + qty, 3)
        elif payload.event_type == "sale":
            sold = round(sold + qty, 3)
        elif payload.event_type == "transport":
            transported = round(transported + qty, 3)
        elif payload.event_type == "reserve":
            reserved = round(reserved + qty, 3)

        if new_avail <= 0 and reserved <= 0:
            new_status = "discarded" if (discarded + damaged >= float(lot["initial_quantity_kg"])) else "depleted"
        elif new_avail <= 0 and reserved > 0:
            new_status = "reserved"
        else:
            new_status = "active"

        cursor.execute(
            """
            UPDATE post_harvest_lots
            SET available_quantity_kg = ?, reserved_quantity_kg = ?, sold_quantity_kg = ?,
                transported_quantity_kg = ?, damaged_quantity_kg = ?, discarded_quantity_kg = ?,
                status = ?, updated_at = ?
            WHERE id = ?
            """,
            (new_avail, reserved, sold, transported, damaged, discarded, new_status, now_iso, lot_id),
        )
        cursor.execute(
            """
            INSERT INTO post_harvest_lot_events (
                id, lot_id, farmer_id, event_type, quantity_kg, delta_available_kg,
                notes, reference_id, idempotency_key, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"ev_{uuid.uuid4().hex[:10]}",
                lot_id,
                user_id,
                payload.event_type,
                qty,
                -qty,
                payload.notes,
                payload.reference_id,
                payload.idempotency_key,
                now_iso,
            ),
        )
        conn.commit()
        updated = dict(cursor.execute("SELECT * FROM post_harvest_lots WHERE id = ?", (lot_id,)).fetchone())
        events = [
            dict(r)
            for r in cursor.execute(
                "SELECT * FROM post_harvest_lot_events WHERE lot_id = ? ORDER BY created_at DESC LIMIT 20",
                (lot_id,),
            ).fetchall()
        ]
        return {"lot": updated, "events": events}
    finally:
        conn.close()


def get_lot_history(user_id: str, role: str, lot_id: str) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        lot = _get_owned_lot(cursor, lot_id, user_id, role)
        events = [
            dict(r)
            for r in cursor.execute(
                "SELECT * FROM post_harvest_lot_events WHERE lot_id = ? ORDER BY created_at DESC",
                (lot_id,),
            ).fetchall()
        ]
        return {"lot": lot, "events": events}
    finally:
        conn.close()
