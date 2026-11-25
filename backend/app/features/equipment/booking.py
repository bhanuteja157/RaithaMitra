"""
AD-28: Transactional Equipment Booking Lifecycle & AD-24 Finance Synchronization.
Enforces state transitions, double-booking prevention, owner/renter authorization,
separate payment settlement, and idempotent financial_transactions sync.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.features.equipment.availability import check_equipment_availability
from backend.app.features.equipment.pricing import calculate_rental_cost
from backend.app.features.equipment.schemas import BookingStatusUpdate, EquipmentBookingCreate

VALID_TRANSITIONS: Dict[str, set[str]] = {
    "requested": {"accepted", "rejected", "cancelled"},
    "accepted": {"scheduled", "in_progress", "completed", "cancelled"},
    "scheduled": {"in_progress", "completed", "cancelled"},
    "in_progress": {"completed", "cancelled"},
    "completed": set(),
    "rejected": set(),
    "cancelled": set(),
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sync_booking_to_finance(cursor, booking: Dict[str, Any], fin_status: str, now_iso: str) -> str:
    tx_id = f"fin_eq_{booking['id']}"
    sync_key = f"equipment_booking:{booking['id']}"
    existing = cursor.execute("SELECT id FROM financial_transactions WHERE sync_key = ?", (sync_key,)).fetchone()
    if existing:
        cursor.execute(
            "UPDATE financial_transactions SET status = ?, updated_at = ? WHERE id = ?",
            (fin_status, now_iso, existing["id"]),
        )
        return existing["id"]

    cursor.execute(
        """
        INSERT INTO financial_transactions (
            id, user_id, farm_id, category, tx_type, amount_inr,
            tx_date, description, source_module, related_id,
            status, provenance, sync_key, is_manual, created_at, updated_at
        ) VALUES (?, ?, ?, 'equipment', 'expense', ?, ?, ?, 'equipment_connect', ?, ?, ?, ?, 0, ?, ?)
        """,
        (
            tx_id,
            booking["renter_user_id"],
            booking["farm_id"] or "farm_001",
            booking["total_cost_inr"],
            booking["booking_date"],
            f"Equipment rental ({booking['operation_type']}, {booking['duration_hours']}h)",
            booking["id"],
            fin_status,
            "AD-28 Equipment Connect Booking",
            sync_key,
            now_iso,
            now_iso,
        ),
    )
    return tx_id


def create_booking(user_id: str, role: str, payload: EquipmentBookingCreate) -> Dict[str, Any]:
    if payload.end_datetime <= payload.start_datetime:
        raise HTTPException(status_code=422, detail="end_datetime must be after start_datetime.")

    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if payload.idempotency_key:
            dup = cursor.execute(
                "SELECT id FROM equipment_bookings WHERE idempotency_key = ?",
                (payload.idempotency_key,),
            ).fetchone()
            if dup:
                raise HTTPException(status_code=409, detail="Duplicate booking request prevented (idempotency_key already used).")

        eq = cursor.execute("SELECT * FROM equipment_listings WHERE id = ?", (payload.equipment_id,)).fetchone()
        if not eq:
            raise HTTPException(status_code=404, detail="Equipment not found.")
        eq_d = dict(eq)

        if payload.duration_hours < float(eq_d["min_booking_duration"]):
            raise HTTPException(
                status_code=422,
                detail=f"Minimum booking duration for this equipment is {eq_d['min_booking_duration']} hours.",
            )

        avail = check_equipment_availability(
            cursor,
            equipment_id=payload.equipment_id,
            start_datetime=payload.start_datetime,
            end_datetime=payload.end_datetime,
        )
        if not avail["available"]:
            raise HTTPException(status_code=409, detail=avail["reason"])

        cost = calculate_rental_cost(
            rental_rate_inr=eq_d["rental_rate_inr"],
            rate_unit=eq_d["rate_unit"],
            duration_hours=payload.duration_hours,
            farm_area_acres=payload.farm_area_acres,
            operator_available=bool(eq_d["operator_available"]),
            include_operator=payload.include_operator,
            operator_charge_inr=eq_d["operator_charge_inr"],
            fuel_included=bool(eq_d["fuel_included"]),
            fuel_charge_inr=eq_d["fuel_charge_inr"],
            delivery_charge_inr=eq_d["delivery_charge_inr"],
            setup_charge_inr=eq_d["setup_charge_inr"],
            other_charges_inr=payload.other_charges_inr,
        )

        bk_id = f"eqb_{uuid.uuid4().hex[:10]}"
        cursor.execute(
            """
            INSERT INTO equipment_bookings (
                id, equipment_id, renter_user_id, owner_id, farm_id, operation_type,
                booking_date, start_datetime, end_datetime, duration_hours, farm_area_acres,
                base_rental_inr, operator_charge_inr, fuel_charge_inr, delivery_charge_inr,
                setup_charge_inr, other_charges_inr, total_cost_inr, status, payment_status,
                idempotency_key, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', 'unpaid', ?, ?, ?, ?)
            """,
            (
                bk_id,
                payload.equipment_id,
                user_id,
                eq_d["owner_id"],
                payload.farm_id,
                payload.operation_type,
                payload.booking_date,
                payload.start_datetime,
                payload.end_datetime,
                payload.duration_hours,
                payload.farm_area_acres,
                cost["base_rental_inr"],
                cost["operator_charge_inr"],
                cost["fuel_charge_inr"],
                cost["delivery_charge_inr"],
                cost["setup_charge_inr"],
                cost["other_charges_inr"],
                cost["total_cost_inr"],
                payload.idempotency_key,
                payload.notes,
                now_iso,
                now_iso,
            ),
        )
        bk_row = dict(cursor.execute("SELECT * FROM equipment_bookings WHERE id = ?", (bk_id,)).fetchone())
        tx_id = _sync_booking_to_finance(cursor, bk_row, "estimated", now_iso)
        cursor.execute("UPDATE equipment_bookings SET financial_tx_id = ? WHERE id = ?", (tx_id, bk_id))
        cursor.execute(
            """
            INSERT INTO equipment_booking_events (id, booking_id, actor_user_id, from_status, to_status, notes, created_at)
            VALUES (?, ?, ?, NULL, 'requested', ?, ?)
            """,
            (f"bke_{uuid.uuid4().hex[:10]}", bk_id, user_id, "Booking request submitted", now_iso),
        )
        conn.commit()
        return dict(cursor.execute("SELECT * FROM equipment_bookings WHERE id = ?", (bk_id,)).fetchone())
    finally:
        conn.close()


def transition_booking_status(
    user_id: str,
    role: str,
    booking_id: str,
    payload: BookingStatusUpdate,
) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        row = cursor.execute("SELECT * FROM equipment_bookings WHERE id = ?", (booking_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Booking not found.")
        bk = dict(row)

        is_owner = bk["owner_id"] == user_id
        is_renter = bk["renter_user_id"] == user_id
        if role != "admin" and not (is_owner or is_renter):
            raise HTTPException(status_code=403, detail="Unauthorized: You do not have access to this booking.")

        if payload.status in ("accepted", "rejected", "scheduled", "in_progress", "completed") and not (is_owner or role == "admin"):
            raise HTTPException(status_code=403, detail="Only the equipment owner can accept, reject, schedule, or complete bookings.")

        cur_status = bk["status"]
        if payload.status not in VALID_TRANSITIONS.get(cur_status, set()):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid booking state transition: '{cur_status}' -> '{payload.status}'.",
            )

        # Re-verify no overlapping confirmed booking when accepting!
        if payload.status == "accepted":
            avail = check_equipment_availability(
                cursor,
                equipment_id=bk["equipment_id"],
                start_datetime=bk["start_datetime"],
                end_datetime=bk["end_datetime"],
                exclude_booking_id=booking_id,
            )
            if not avail["available"]:
                raise HTTPException(status_code=409, detail=f"Cannot accept booking: {avail['reason']}")

        cursor.execute(
            "UPDATE equipment_bookings SET status = ?, updated_at = ? WHERE id = ?",
            (payload.status, now_iso, booking_id),
        )

        # Sync status to AD-24 Finance (completion does NOT mark payment settled!)
        if payload.status in ("accepted", "scheduled", "in_progress"):
            _sync_booking_to_finance(cursor, bk, "committed", now_iso)
        elif payload.status == "completed":
            _sync_booking_to_finance(cursor, bk, "recorded", now_iso)
        elif payload.status in ("rejected", "cancelled"):
            _sync_booking_to_finance(cursor, bk, "cancelled", now_iso)

        cursor.execute(
            """
            INSERT INTO equipment_booking_events (id, booking_id, actor_user_id, from_status, to_status, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (f"bke_{uuid.uuid4().hex[:10]}", booking_id, user_id, cur_status, payload.status, payload.notes, now_iso),
        )
        conn.commit()
        return dict(cursor.execute("SELECT * FROM equipment_bookings WHERE id = ?", (booking_id,)).fetchone())
    finally:
        conn.close()


def settle_booking_payment(user_id: str, role: str, booking_id: str) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        row = cursor.execute("SELECT * FROM equipment_bookings WHERE id = ?", (booking_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Booking not found.")
        bk = dict(row)
        if role != "admin" and bk["renter_user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Only the renting farmer can record payment settlement.")
        if bk["status"] != "completed":
            raise HTTPException(status_code=400, detail="Booking must be completed before recording payment settlement.")
        if bk["payment_status"] == "settled":
            return bk

        cursor.execute(
            "UPDATE equipment_bookings SET payment_status = 'settled', updated_at = ? WHERE id = ?",
            (now_iso, booking_id),
        )
        _sync_booking_to_finance(cursor, bk, "settled", now_iso)
        conn.commit()
        return dict(cursor.execute("SELECT * FROM equipment_bookings WHERE id = ?", (booking_id,)).fetchone())
    finally:
        conn.close()


def list_user_bookings(user_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT b.*, e.equipment_name, e.category, e.location_label
            FROM equipment_bookings b
            JOIN equipment_listings e ON b.equipment_id = e.id
            WHERE b.renter_user_id = ? OR b.owner_id = ?
            ORDER BY b.created_at DESC
            """,
            (user_id, user_id),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
