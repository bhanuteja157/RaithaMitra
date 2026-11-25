"""
AD-28: Equipment Maintenance Management.
Tracks service history, operating hours, and creates availability blocks during maintenance.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.features.equipment.schemas import MaintenanceRecordCreate


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def record_maintenance(
    user_id: str,
    role: str,
    equipment_id: str,
    payload: MaintenanceRecordCreate,
) -> Dict[str, Any]:
    now_iso = _now_iso()
    rec_id = f"mnt_{uuid.uuid4().hex[:10]}"
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        eq = cursor.execute("SELECT * FROM equipment_listings WHERE id = ?", (equipment_id,)).fetchone()
        if not eq:
            raise HTTPException(status_code=404, detail="Equipment not found.")
        if role != "admin" and eq["owner_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized: Only the equipment owner can record maintenance.")

        cursor.execute(
            """
            INSERT INTO equipment_maintenance_records (
                id, equipment_id, owner_id, maintenance_type, maintenance_date,
                operating_hours, next_due_date, cost_inr, notes,
                block_start_datetime, block_end_datetime, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rec_id,
                equipment_id,
                user_id,
                payload.maintenance_type,
                payload.maintenance_date,
                payload.operating_hours,
                payload.next_due_date,
                payload.cost_inr,
                payload.notes,
                payload.block_start_datetime,
                payload.block_end_datetime,
                now_iso,
            ),
        )

        if payload.block_start_datetime and payload.block_end_datetime:
            blk_id = f"blk_{uuid.uuid4().hex[:10]}"
            cursor.execute(
                """
                INSERT INTO equipment_availability_blocks (
                    id, equipment_id, owner_id, block_type, start_datetime, end_datetime, notes, created_at
                ) VALUES (?, ?, ?, 'maintenance', ?, ?, ?, ?)
                """,
                (
                    blk_id,
                    equipment_id,
                    user_id,
                    payload.block_start_datetime,
                    payload.block_end_datetime,
                    f"Maintenance: {payload.maintenance_type}",
                    now_iso,
                ),
            )

        conn.commit()
        return dict(cursor.execute("SELECT * FROM equipment_maintenance_records WHERE id = ?", (rec_id,)).fetchone())
    finally:
        conn.close()


def list_maintenance_records(equipment_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM equipment_maintenance_records WHERE equipment_id = ? ORDER BY maintenance_date DESC",
            (equipment_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
