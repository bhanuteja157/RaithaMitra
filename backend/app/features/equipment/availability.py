"""
AD-28: Equipment Availability & Conflict Enforcement.
Prevents overlapping confirmed bookings and respects maintenance / owner-unavailable blocks.
"""
from __future__ import annotations

from typing import Any, Dict, List

ACTIVE_BLOCKING_STATUSES = ("accepted", "scheduled", "in_progress")


def check_equipment_availability(
    cursor,
    *,
    equipment_id: str,
    start_datetime: str,
    end_datetime: str,
    exclude_booking_id: str | None = None,
) -> Dict[str, Any]:
    eq = cursor.execute("SELECT * FROM equipment_listings WHERE id = ?", (equipment_id,)).fetchone()
    if not eq:
        return {"available": False, "reason": "Equipment not found."}
    if not eq["is_active"] or eq["maintenance_status"] in ("under_maintenance", "inactive"):
        return {
            "available": False,
            "reason": f"Equipment is currently unavailable (status: {eq['maintenance_status']}).",
        }

    # Check overlapping confirmed/active bookings: NOT (existing_end <= new_start OR existing_start >= new_end)
    q = """
        SELECT id, start_datetime, end_datetime, status
        FROM equipment_bookings
        WHERE equipment_id = ?
          AND status IN ('accepted', 'scheduled', 'in_progress')
          AND NOT (end_datetime <= ? OR start_datetime >= ?)
    """
    params: List[Any] = [equipment_id, start_datetime, end_datetime]
    if exclude_booking_id:
        q += " AND id != ?"
        params.append(exclude_booking_id)

    conflicts = [dict(r) for r in cursor.execute(q, params).fetchall()]
    if conflicts:
        return {
            "available": False,
            "reason": f"Overlaps with existing {conflicts[0]['status']} booking ({conflicts[0]['start_datetime']} to {conflicts[0]['end_datetime']}).",
            "conflicting_bookings": conflicts,
        }

    # Check maintenance / owner_unavailable blocks
    blocks = [
        dict(r)
        for r in cursor.execute(
            """
            SELECT id, block_type, start_datetime, end_datetime, notes
            FROM equipment_availability_blocks
            WHERE equipment_id = ?
              AND block_type IN ('maintenance', 'owner_unavailable')
              AND NOT (end_datetime <= ? OR start_datetime >= ?)
            """,
            (equipment_id, start_datetime, end_datetime),
        ).fetchall()
    ]
    if blocks:
        return {
            "available": False,
            "reason": f"Blocked due to {blocks[0]['block_type']} ({blocks[0]['start_datetime']} to {blocks[0]['end_datetime']}).",
            "conflicting_blocks": blocks,
        }

    return {"available": True, "reason": "Available for requested window."}
