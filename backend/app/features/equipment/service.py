"""
AD-28: Equipment Connect Service Layer.
Handles equipment owner registration, marketplace discovery, intelligent recommendations,
weather-aware scheduling, calendar blocks, and financial summaries.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.features.equipment.availability import check_equipment_availability
from backend.app.features.equipment.compatibility import (
    estimate_operation_duration,
    evaluate_weather_scheduling_constraints,
    is_equipment_compatible,
)
from backend.app.features.equipment.schemas import (
    AvailabilityBlockCreate,
    EquipmentCreate,
    EquipmentUpdate,
)
from backend.app.services.nursery_service import calculate_haversine_distance
from backend.app.services.weather_service import weather_service

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_listing(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        **row,
        "suitable_operations": json.loads(row.get("suitable_operations_json") or "[]"),
        "suitable_crops": json.loads(row.get("suitable_crops_json") or "[]"),
        "operator_available": bool(row.get("operator_available")),
        "fuel_included": bool(row.get("fuel_included")),
        "is_active": bool(row.get("is_active")),
        "is_demonstration": bool(row.get("is_demonstration")),
    }


def register_equipment(user_id: str, payload: EquipmentCreate) -> Dict[str, Any]:
    now_iso = _now_iso()
    eq_id = f"eqp_{uuid.uuid4().hex[:10]}"
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        user_row = cursor.execute("SELECT name, phone FROM users WHERE id = ?", (user_id,)).fetchone()
        owner_name = user_row["name"] if user_row else "Registered Farmer Owner"
        owner_phone = user_row["phone"] if user_row else None

        cursor.execute(
            """
            INSERT OR IGNORE INTO equipment_owner_profiles (
                user_id, owner_name, phone, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, 1, ?, ?)
            """,
            (user_id, owner_name, owner_phone, now_iso, now_iso),
        )

        cursor.execute(
            """
            INSERT INTO equipment_listings (
                id, owner_id, equipment_name, category, manufacturer, model,
                manufacturing_year, power_or_capacity, effective_field_capacity_ha_hr,
                theoretical_capacity_ha_hr, suitable_operations_json, suitable_crops_json,
                condition_status, rental_rate_inr, rate_unit, min_booking_duration,
                operator_available, operator_charge_inr, fuel_included, fuel_charge_inr,
                delivery_charge_inr, setup_charge_inr, location_label, latitude, longitude,
                service_radius_km, maintenance_status, is_active, is_demonstration,
                photo_url, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'operational', 1, 0, ?, ?, ?)
            """,
            (
                eq_id,
                user_id,
                payload.equipment_name,
                payload.category,
                payload.manufacturer,
                payload.model,
                payload.manufacturing_year,
                payload.power_or_capacity,
                payload.effective_field_capacity_ha_hr,
                payload.theoretical_capacity_ha_hr,
                json.dumps(payload.suitable_operations),
                json.dumps(payload.suitable_crops),
                payload.condition_status,
                payload.rental_rate_inr,
                payload.rate_unit,
                payload.min_booking_duration,
                1 if payload.operator_available else 0,
                payload.operator_charge_inr,
                1 if payload.fuel_included else 0,
                payload.fuel_charge_inr,
                payload.delivery_charge_inr,
                payload.setup_charge_inr,
                payload.location_label,
                payload.latitude,
                payload.longitude,
                payload.service_radius_km,
                payload.photo_url,
                now_iso,
                now_iso,
            ),
        )
        conn.commit()
        row = dict(cursor.execute("SELECT * FROM equipment_listings WHERE id = ?", (eq_id,)).fetchone())
        return _parse_listing(row)
    finally:
        conn.close()


def update_equipment(user_id: str, role: str, equipment_id: str, payload: EquipmentUpdate) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        row = cursor.execute("SELECT * FROM equipment_listings WHERE id = ?", (equipment_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Equipment not found.")
        if role != "admin" and row["owner_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized: Equipment belongs to another owner.")
        eq = dict(row)
        cursor.execute(
            """
            UPDATE equipment_listings
            SET equipment_name = ?, rental_rate_inr = ?, condition_status = ?,
                maintenance_status = ?, is_active = ?, location_label = ?,
                service_radius_km = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload.equipment_name if payload.equipment_name is not None else eq["equipment_name"],
                payload.rental_rate_inr if payload.rental_rate_inr is not None else eq["rental_rate_inr"],
                payload.condition_status if payload.condition_status is not None else eq["condition_status"],
                payload.maintenance_status if payload.maintenance_status is not None else eq["maintenance_status"],
                (1 if payload.is_active else 0) if payload.is_active is not None else eq["is_active"],
                payload.location_label if payload.location_label is not None else eq["location_label"],
                payload.service_radius_km if payload.service_radius_km is not None else eq["service_radius_km"],
                now_iso,
                equipment_id,
            ),
        )
        conn.commit()
        updated = dict(cursor.execute("SELECT * FROM equipment_listings WHERE id = ?", (equipment_id,)).fetchone())
        return _parse_listing(updated)
    finally:
        conn.close()


def discover_equipment(
    *,
    category: Optional[str] = None,
    operation: Optional[str] = None,
    crop: Optional[str] = None,
    max_rate_inr: Optional[float] = None,
    operator_only: bool = False,
    fuel_included_only: bool = False,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    max_distance_km: Optional[float] = None,
    availability_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        rows = [
            dict(r)
            for r in cursor.execute(
                """
                SELECT e.*, COALESCE(p.owner_name, u.name) AS owner_name
                FROM equipment_listings e
                LEFT JOIN equipment_owner_profiles p ON e.owner_id = p.user_id
                LEFT JOIN users u ON e.owner_id = u.id
                WHERE e.is_active = 1
                ORDER BY e.created_at DESC
                """
            ).fetchall()
        ]
        results = []
        for r in rows:
            item = _parse_listing(r)
            if category and category.lower() != "all" and item["category"].lower() != category.lower():
                continue
            if operation and not is_equipment_compatible(item["category"], item["suitable_operations"], operation):
                continue
            if crop:
                crops_l = [c.lower() for c in item["suitable_crops"]]
                if "all crops" not in crops_l and not any(crop.lower() in c for c in crops_l):
                    continue
            if max_rate_inr is not None and float(item["rental_rate_inr"]) > max_rate_inr:
                continue
            if operator_only and not item["operator_available"]:
                continue
            if fuel_included_only and not item["fuel_included"]:
                continue

            if latitude is not None and longitude is not None:
                dist = round(
                    calculate_haversine_distance(latitude, longitude, float(item["latitude"]), float(item["longitude"])),
                    1,
                )
                item["distance_km"] = dist
                if max_distance_km is not None and dist > max_distance_km:
                    continue

            if availability_date:
                avail = check_equipment_availability(
                    cursor,
                    equipment_id=item["id"],
                    start_datetime=f"{availability_date}T08:00:00",
                    end_datetime=f"{availability_date}T12:00:00",
                )
                item["available_on_date"] = avail["available"]
                item["availability_note"] = avail["reason"]

            results.append(item)
        return results
    finally:
        conn.close()


def get_equipment_details(equipment_id: str) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        row = cursor.execute(
            """
            SELECT e.*, COALESCE(p.owner_name, u.name) AS owner_name
            FROM equipment_listings e
            LEFT JOIN equipment_owner_profiles p ON e.owner_id = p.user_id
            LEFT JOIN users u ON e.owner_id = u.id
            WHERE e.id = ?
            """,
            (equipment_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Equipment not found.")
        item = _parse_listing(dict(row))
        bookings = [
            dict(r)
            for r in cursor.execute(
                """
                SELECT id, booking_date, start_datetime, end_datetime, status
                FROM equipment_bookings
                WHERE equipment_id = ? AND status IN ('requested', 'accepted', 'scheduled', 'in_progress')
                ORDER BY start_datetime ASC
                """,
                (equipment_id,),
            ).fetchall()
        ]
        blocks = [
            dict(r)
            for r in cursor.execute(
                "SELECT * FROM equipment_availability_blocks WHERE equipment_id = ? ORDER BY start_datetime ASC",
                (equipment_id,),
            ).fetchall()
        ]
        maint = [
            dict(r)
            for r in cursor.execute(
                "SELECT * FROM equipment_maintenance_records WHERE equipment_id = ? ORDER BY maintenance_date DESC",
                (equipment_id,),
            ).fetchall()
        ]
        return {
            "equipment": item,
            "bookings": bookings,
            "availability_blocks": blocks,
            "maintenance_records": maint,
        }
    finally:
        conn.close()


def add_availability_block(
    user_id: str,
    role: str,
    equipment_id: str,
    payload: AvailabilityBlockCreate,
) -> Dict[str, Any]:
    if payload.end_datetime <= payload.start_datetime:
        raise HTTPException(status_code=422, detail="end_datetime must be after start_datetime.")
    now_iso = _now_iso()
    blk_id = f"blk_{uuid.uuid4().hex[:10]}"
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        eq = cursor.execute("SELECT * FROM equipment_listings WHERE id = ?", (equipment_id,)).fetchone()
        if not eq:
            raise HTTPException(status_code=404, detail="Equipment not found.")
        if role != "admin" and eq["owner_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized: Equipment belongs to another owner.")

        cursor.execute(
            """
            INSERT INTO equipment_availability_blocks (
                id, equipment_id, owner_id, block_type, start_datetime, end_datetime, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (blk_id, equipment_id, user_id, payload.block_type, payload.start_datetime, payload.end_datetime, payload.notes, now_iso),
        )
        conn.commit()
        return dict(cursor.execute("SELECT * FROM equipment_availability_blocks WHERE id = ?", (blk_id,)).fetchone())
    finally:
        conn.close()


async def recommend_equipment_for_farm(
    *,
    farm_id: Optional[str],
    operation_type: str,
    crop: Optional[str] = None,
    farm_area_acres: Optional[float] = None,
    budget_inr: Optional[float] = None,
) -> Dict[str, Any]:
    lat, lon = 12.5234, 76.8976
    area_acres = farm_area_acres or 2.0
    resolved_crop = crop or "Tomato"

    if farm_id:
        conn = get_db_connection()
        try:
            f = conn.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
            if f:
                lat = float(f["latitude"])
                lon = float(f["longitude"])
                if farm_area_acres is None:
                    area_acres = round(float(f["land_area_ha"]) / 0.404686, 2)
                if crop is None:
                    resolved_crop = str(f["primary_crop"])
        finally:
            conn.close()

    candidates = discover_equipment(
        operation=operation_type,
        crop=resolved_crop,
        latitude=lat,
        longitude=lon,
    )

    rain_48h, wind_kmh, temp_c = 0.0, 8.0, 27.0
    try:
        weather = await weather_service.get_weather(lat, lon)
        rain_48h = sum(float(d.precipitation_sum_mm) for d in weather.daily_forecast[:2]) if weather.daily_forecast else 0.0
        wind_kmh = float(weather.current.wind_speed_kmh)
        temp_c = float(weather.current.temperature_c)
    except Exception as exc:
        logger.debug("Weather check skipped in equipment recommendation: %s", exc)

    recommendations = []
    for eq in candidates:
        work_est = estimate_operation_duration(
            farm_area_acres=area_acres,
            effective_field_capacity_ha_hr=float(eq["effective_field_capacity_ha_hr"]),
            theoretical_capacity_ha_hr=eq.get("theoretical_capacity_ha_hr"),
        )
        weather_eval = evaluate_weather_scheduling_constraints(
            operation_type=operation_type,
            category=eq["category"],
            rain_48h_mm=rain_48h,
            wind_speed_kmh=wind_kmh,
            temperature_c=temp_c,
        )
        est_cost = round(float(eq["rental_rate_inr"]) * work_est["estimated_operating_hours"], 2)
        if budget_inr is not None and est_cost > budget_inr:
            continue
        recommendations.append({
            "equipment": eq,
            "work_estimation": work_est,
            "weather_advisory": weather_eval,
            "estimated_base_cost_inr": est_cost,
        })

    return {
        "operation_type": operation_type,
        "crop": resolved_crop,
        "farm_area_acres": area_acres,
        "recommended_count": len(recommendations),
        "recommendations": recommendations,
    }


def get_equipment_financial_summary(user_id: str) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        bookings = [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM equipment_bookings WHERE renter_user_id = ?",
                (user_id,),
            ).fetchall()
        ]
        shared = [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM shared_equipment_requests WHERE requester_user_id = ?",
                (user_id,),
            ).fetchall()
        ]
        return {
            "total_bookings": len(bookings),
            "estimated_cost_inr": round(sum(float(b["total_cost_inr"]) for b in bookings if b["status"] == "requested"), 2),
            "committed_cost_inr": round(sum(float(b["total_cost_inr"]) for b in bookings if b["status"] in ("accepted", "scheduled", "in_progress")), 2),
            "completed_obligation_inr": round(sum(float(b["total_cost_inr"]) for b in bookings if b["status"] == "completed" and b["payment_status"] == "unpaid"), 2),
            "settled_payments_inr": round(sum(float(b["total_cost_inr"]) for b in bookings if b["payment_status"] == "settled"), 2),
            "estimated_shared_savings_inr": round(sum(float(s["total_savings_inr"]) for s in shared), 2),
        }
    finally:
        conn.close()
