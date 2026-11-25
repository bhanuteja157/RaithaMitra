"""
AD-31: Server-Side Resource Version & Conflict Detection for Offline Drafts.
Detects when equipment availability, inventory stock, or farm state changed while offline.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from backend.app.features.equipment.availability import check_equipment_availability


def detect_sync_conflict(
    cursor,
    *,
    operation_type: str,
    user_id: str,
    farm_id: Optional[str],
    payload: Dict[str, Any],
    resource_version: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    if operation_type == "equipment_booking_draft":
        eq_id = payload.get("equipment_id")
        start_dt = payload.get("start_datetime")
        end_dt = payload.get("end_datetime")
        if eq_id and start_dt and end_dt:
            avail = check_equipment_availability(
                cursor,
                equipment_id=str(eq_id),
                start_datetime=str(start_dt),
                end_datetime=str(end_dt),
            )
            if not avail["available"]:
                return {
                    "conflict_type": "equipment_unavailable",
                    "reason": avail["reason"],
                    "server_state": avail,
                }

    if operation_type == "bidding_listing_draft":
        lot_id = payload.get("lot_id")
        qty = float(payload.get("quantity_kg") or 0)
        if lot_id:
            lot = cursor.execute(
                "SELECT id, available_quantity_kg, status, updated_at FROM post_harvest_lots WHERE id = ? AND farmer_id = ?",
                (str(lot_id), user_id),
            ).fetchone()
            if not lot:
                return {"conflict_type": "lot_missing", "reason": "Referenced inventory lot no longer exists."}
            if qty > float(lot["available_quantity_kg"]) + 1e-6:
                return {
                    "conflict_type": "insufficient_inventory",
                    "reason": f"Requested {qty} kg exceeds current available stock ({lot['available_quantity_kg']} kg).",
                    "server_state": dict(lot),
                }

    if resource_version and farm_id:
        f = cursor.execute("SELECT updated_at FROM farms WHERE id = ?", (farm_id,)).fetchone()
        if f and f["updated_at"] != resource_version:
            return {
                "conflict_type": "stale_farm_version",
                "reason": "Farm profile was updated on the server while offline.",
                "server_version": f["updated_at"],
            }

    return None
