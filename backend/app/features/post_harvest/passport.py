"""
AD-38 (P1): Lightweight QR Produce Passport & Privacy-Safe Public Verification.
Uses SHA-256 record integrity hashes (explicitly NOT blockchain) and strips private farmer PII.
"""
from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.db.database import get_db_connection


def _compute_integrity_hash(payload: Dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def create_produce_passport(
    *,
    farmer_id: str,
    farm_id: str,
    crop_name: str,
    quantity_kg: float,
    harvest_date: str,
    variety: Optional[str] = None,
    harvest_record_id: Optional[str] = None,
    inventory_lot_id: Optional[str] = None,
    purchase_order_id: Optional[str] = None,
    transport_booking_id: Optional[str] = None,
    packaging_summary: Optional[str] = None,
    storage_conditions: Optional[str] = None,
    quality_observations: Optional[str] = None,
    is_demonstration: bool = False,
) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = cursor.execute(
            "SELECT id, farmer_id, district, state FROM farms WHERE id = ?",
            (farm_id,),
        ).fetchone()
        if not farm:
            raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found.")
        if farm["farmer_id"] != farmer_id:
            raise HTTPException(status_code=403, detail="Unauthorized: Cannot issue passport for another farmer's farm.")

        origin_region = f"{farm['district']}, {farm['state']}"
        now_iso = datetime.now(timezone.utc).isoformat()
        pid = f"pass_{uuid.uuid4().hex[:10]}"
        crop_prefix = "".join(ch for ch in crop_name.upper() if ch.isalpha())[:3] or "CRP"
        batch_code = f"RM-{crop_prefix}-{harvest_date[:4]}-{uuid.uuid4().hex[:6].upper()}"

        milestones: List[Dict[str, str]] = [
            {"stage": "Harvest Recorded", "status": "recorded", "timestamp": harvest_date}
        ]
        if packaging_summary:
            milestones.append({"stage": "Packaging Planned", "status": "recorded", "timestamp": now_iso[:10]})
        if purchase_order_id:
            po = cursor.execute("SELECT status, created_at FROM purchase_orders WHERE id = ?", (purchase_order_id,)).fetchone()
            if po:
                milestones.append({"stage": "Purchase Order", "status": po["status"], "timestamp": po["created_at"][:10]})
        if transport_booking_id:
            tb = cursor.execute("SELECT status, updated_at FROM transport_bookings WHERE id = ?", (transport_booking_id,)).fetchone()
            if tb:
                milestones.append({"stage": "Transport", "status": tb["status"], "timestamp": tb["updated_at"][:10]})

        hash_input = {
            "batch_code": batch_code,
            "farm_id": farm_id,
            "crop_name": crop_name,
            "variety": variety,
            "harvest_date": harvest_date,
            "origin_region": origin_region,
            "quantity_kg": round(float(quantity_kg), 2),
        }
        integrity_hash = _compute_integrity_hash(hash_input)

        cursor.execute(
            """
            INSERT INTO produce_passports (
                id, batch_code, farmer_id, farm_id, harvest_record_id, inventory_lot_id,
                purchase_order_id, transport_booking_id, crop_name, variety, harvest_date,
                origin_region, quantity_kg, packaging_summary, storage_conditions,
                quality_observations, milestones_json, integrity_hash, is_demonstration,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                pid, batch_code, farmer_id, farm_id, harvest_record_id, inventory_lot_id,
                purchase_order_id, transport_booking_id, crop_name, variety, harvest_date,
                origin_region, round(float(quantity_kg), 2), packaging_summary, storage_conditions,
                quality_observations, json.dumps(milestones), integrity_hash,
                1 if is_demonstration else 0, now_iso, now_iso,
            ),
        )
        conn.commit()
        row = cursor.execute("SELECT * FROM produce_passports WHERE id = ?", (pid,)).fetchone()
        return _format_passport(dict(row), include_private=True)
    finally:
        conn.close()


def _format_passport(row: Dict[str, Any], *, include_private: bool) -> Dict[str, Any]:
    data = {
        "id": row["id"],
        "batch_code": row["batch_code"],
        "crop_name": row["crop_name"],
        "variety": row.get("variety"),
        "harvest_date": row["harvest_date"],
        "origin_region": row["origin_region"],
        "quantity_kg": row["quantity_kg"],
        "packaging_summary": row.get("packaging_summary"),
        "storage_conditions": row.get("storage_conditions"),
        "quality_observations": row.get("quality_observations"),
        "milestones": json.loads(row.get("milestones_json") or "[]"),
        "integrity_hash": row["integrity_hash"],
        "integrity_verification_method": "SHA-256 record integrity hash (not blockchain)",
        "is_demonstration": bool(row.get("is_demonstration", 0)),
        "qr_verification_path": f"/passport/{row['batch_code']}",
        "created_at": row["created_at"],
    }
    if include_private:
        data["farm_id"] = row["farm_id"]
        data["purchase_order_id"] = row.get("purchase_order_id")
        data["transport_booking_id"] = row.get("transport_booking_id")
    return data


def list_farmer_passports(farmer_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM produce_passports WHERE farmer_id = ? ORDER BY created_at DESC",
            (farmer_id,),
        ).fetchall()
        return [_format_passport(dict(r), include_private=True) for r in rows]
    finally:
        conn.close()


def get_public_passport(batch_code: str) -> Dict[str, Any]:
    """Return privacy-safe public traceability view without exposing farmer PII."""
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT * FROM produce_passports WHERE batch_code = ?",
            (batch_code.strip(),),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Produce passport '{batch_code}' not found.")
        return _format_passport(dict(row), include_private=False)
    finally:
        conn.close()
