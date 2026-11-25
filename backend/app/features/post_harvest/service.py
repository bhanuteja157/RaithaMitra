"""
AD-27: Post-Harvest Intelligence Orchestration Service.
Connects Harvest Planning, Weather-Aware Harvest Guidance, Persistent Inventory,
Storage Management, Finance (AD-24), Smart Bidding, and Transport Connect.
"""
from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.features.post_harvest.facility_provider import discover_cold_storage_facilities
from backend.app.features.post_harvest.inventory import (
    _get_owned_lot,
    _verify_farm_owner,
    list_inventory_lots,
    record_lot_event,
)
from backend.app.features.post_harvest.schemas import (
    HarvestRecordCreate,
    HarvestRecordUpdate,
    InventoryEventRequest,
    LotListingCreateRequest,
    LotTransportPrepRequest,
    ManualFacilityCreate,
    StorageRecordCreate,
)
from backend.app.features.post_harvest.storage_knowledge import get_crop_storage_profile
from backend.app.services.weather_service import weather_service

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def create_harvest_record(user_id: str, role: str, payload: HarvestRecordCreate) -> Dict[str, Any]:
    now_iso = _now_iso()
    rec_id = f"hrv_{uuid.uuid4().hex[:10]}"
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = _verify_farm_owner(cursor, payload.farm_id, user_id, role)
        cursor.execute(
            """
            INSERT INTO harvest_records (
                id, farmer_id, farm_id, crop, variety, cultivated_area_ha,
                expected_harvest_date, estimated_yield_kg, actual_harvested_kg,
                crop_maturity, harvest_quality, damaged_quantity_kg,
                is_simulated, digital_farming_notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rec_id,
                user_id,
                payload.farm_id,
                payload.crop,
                payload.variety,
                payload.cultivated_area_ha,
                payload.expected_harvest_date,
                payload.estimated_yield_kg,
                payload.actual_harvested_kg,
                payload.crop_maturity,
                payload.harvest_quality,
                payload.damaged_quantity_kg,
                1 if payload.is_simulated else 0,
                payload.digital_farming_notes,
                now_iso,
                now_iso,
            ),
        )
        conn.commit()
        row = dict(cursor.execute("SELECT * FROM harvest_records WHERE id = ?", (rec_id,)).fetchone())
    finally:
        conn.close()

    weather_advice = await _harvest_weather_advice(farm["latitude"], farm["longitude"], payload.crop)
    return {**row, "weather_harvest_advice": weather_advice}


async def _harvest_weather_advice(lat: float, lon: float, crop: str) -> Dict[str, Any]:
    try:
        weather = await weather_service.get_weather(lat, lon)
        rain_48h = sum(float(d.precipitation_sum_mm) for d in weather.daily_forecast[:2]) if weather.daily_forecast else 0.0
        temp_c = float(weather.current.temperature_2m if hasattr(weather.current, "temperature_2m") else weather.current.temperature_c)
        rh_pct = float(weather.current.relative_humidity_pct)
        profile = get_crop_storage_profile(crop)
        if rain_48h >= 12.0:
            window = "Caution: Significant Rain Forecast (48h)"
            guidance = (
                f"{rain_48h:.1f} mm rain expected in next 48h. Harvest mature {crop} early in dry morning hours "
                f"and move promptly under covered shed to avoid surface moisture rot."
            )
        elif temp_c > 32.0 and profile["requires_refrigeration"]:
            window = "Harvest Early Morning (Cool Hours)"
            guidance = (
                f"High ambient heat ({temp_c:.1f}°C). Harvest {crop} before 09:00 AM to minimize field heat "
                f"and pre-cool immediately."
            )
        else:
            window = "Favorable Harvest Window"
            guidance = (
                f"Ambient weather ({temp_c:.1f}°C, {rh_pct:.0f}% RH, {rain_48h:.1f} mm 48h rain) supports dry harvesting and sorting."
            )
        return {
            "source": "Open-Meteo Live Weather",
            "temperature_c": round(temp_c, 1),
            "relative_humidity_pct": round(rh_pct, 1),
            "rain_48h_mm": round(rain_48h, 1),
            "window_status": window,
            "guidance": guidance,
        }
    except Exception as exc:
        logger.debug("Weather advice skipped in harvest record: %s", exc)
        return {
            "source": "Weather Unavailable",
            "window_status": "Manual Check Recommended",
            "guidance": "Verify local dry-weather window before harvesting.",
        }


def list_harvest_records(user_id: str, role: str, farm_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if farm_id:
            _verify_farm_owner(cursor, farm_id, user_id, role)
            rows = cursor.execute(
                "SELECT * FROM harvest_records WHERE farmer_id = ? AND farm_id = ? ORDER BY expected_harvest_date DESC",
                (user_id, farm_id),
            ).fetchall()
        else:
            rows = cursor.execute(
                "SELECT * FROM harvest_records WHERE farmer_id = ? ORDER BY expected_harvest_date DESC",
                (user_id,),
            ).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            d["is_simulated"] = bool(d["is_simulated"])
            est = float(d["estimated_yield_kg"] or 0)
            act = d["actual_harvested_kg"]
            d["variance_kg"] = round(float(act) - est, 2) if act is not None else None
            results.append(d)
        return results
    finally:
        conn.close()


def update_harvest_record(user_id: str, role: str, record_id: str, payload: HarvestRecordUpdate) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        row = cursor.execute("SELECT * FROM harvest_records WHERE id = ?", (record_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Harvest record '{record_id}' not found.")
        if role != "admin" and row["farmer_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized: Harvest record belongs to another farmer.")
        rec = dict(row)
        cursor.execute(
            """
            UPDATE harvest_records
            SET actual_harvested_kg = ?, crop_maturity = ?, harvest_quality = ?,
                damaged_quantity_kg = ?, is_simulated = 0, updated_at = ?
            WHERE id = ?
            """,
            (
                payload.actual_harvested_kg if payload.actual_harvested_kg is not None else rec["actual_harvested_kg"],
                payload.crop_maturity if payload.crop_maturity is not None else rec["crop_maturity"],
                payload.harvest_quality if payload.harvest_quality is not None else rec["harvest_quality"],
                payload.damaged_quantity_kg if payload.damaged_quantity_kg is not None else rec["damaged_quantity_kg"],
                now_iso,
                record_id,
            ),
        )
        conn.commit()
        updated = dict(cursor.execute("SELECT * FROM harvest_records WHERE id = ?", (record_id,)).fetchone())
        updated["is_simulated"] = bool(updated["is_simulated"])
        return updated
    finally:
        conn.close()


def create_storage_record(user_id: str, role: str, payload: StorageRecordCreate) -> Dict[str, Any]:
    now_iso = _now_iso()
    try:
        d1 = date.fromisoformat(payload.start_date)
        d2 = date.fromisoformat(payload.expected_retrieval_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid start_date or expected_retrieval_date.")
    if d2 < d1:
        raise HTTPException(status_code=422, detail="expected_retrieval_date cannot be before start_date.")

    duration_days = max(1, (d2 - d1).days)
    total_est = round(
        (payload.storage_rate_inr_per_day * duration_days)
        + payload.loading_charges_inr
        + payload.handling_charges_inr
        + payload.other_expenses_inr,
        2,
    )

    rec_id = f"stg_{uuid.uuid4().hex[:10]}"
    fin_tx_id: Optional[str] = None

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        _verify_farm_owner(cursor, payload.farm_id, user_id, role)
        if payload.lot_id:
            _get_owned_lot(cursor, payload.lot_id, user_id, role)

        # Idempotent sync with AD-24 financial_transactions ledger
        if payload.sync_to_finance and total_est > 0:
            fin_tx_id = f"fin_ph_{rec_id}"
            cursor.execute(
                """
                INSERT OR IGNORE INTO financial_transactions (
                    id, user_id, farm_id, category, tx_type, amount_inr,
                    tx_date, description, source_module, related_id,
                    status, provenance, sync_key, is_manual, created_at, updated_at
                ) VALUES (?, ?, ?, 'storage', 'expense', ?, ?, ?, 'post_harvest', ?, ?, ?, ?, 0, ?, ?)
                """,
                (
                    fin_tx_id,
                    user_id,
                    payload.farm_id,
                    total_est,
                    payload.start_date,
                    f"Post-harvest storage ({duration_days}d) for {payload.commodity} ({payload.quantity_kg} kg) at {payload.facility_name}",
                    rec_id,
                    payload.finance_status,
                    "AD-27 Post-Harvest Storage Plan",
                    f"post_harvest:{rec_id}",
                    now_iso,
                    now_iso,
                ),
            )

        cursor.execute(
            """
            INSERT INTO post_harvest_storage_records (
                id, farmer_id, farm_id, lot_id, facility_name, facility_source, commodity,
                quantity_kg, start_date, expected_retrieval_date, target_temp_c, target_humidity_pct,
                storage_rate_inr_per_day, loading_charges_inr, handling_charges_inr,
                other_expenses_inr, total_estimated_cost_inr, reservation_status,
                financial_tx_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rec_id,
                user_id,
                payload.farm_id,
                payload.lot_id,
                payload.facility_name,
                payload.facility_source,
                payload.commodity,
                payload.quantity_kg,
                payload.start_date,
                payload.expected_retrieval_date,
                payload.target_temp_c,
                payload.target_humidity_pct,
                payload.storage_rate_inr_per_day,
                payload.loading_charges_inr,
                payload.handling_charges_inr,
                payload.other_expenses_inr,
                total_est,
                payload.reservation_status,
                fin_tx_id,
                now_iso,
                now_iso,
            ),
        )
        conn.commit()
        return dict(cursor.execute("SELECT * FROM post_harvest_storage_records WHERE id = ?", (rec_id,)).fetchone())
    finally:
        conn.close()


def list_storage_records(user_id: str, role: str, farm_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if farm_id:
            _verify_farm_owner(cursor, farm_id, user_id, role)
            rows = cursor.execute(
                "SELECT * FROM post_harvest_storage_records WHERE farmer_id = ? AND farm_id = ? ORDER BY created_at DESC",
                (user_id, farm_id),
            ).fetchall()
        else:
            rows = cursor.execute(
                "SELECT * FROM post_harvest_storage_records WHERE farmer_id = ? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_manual_facility(user_id: str, payload: ManualFacilityCreate) -> Dict[str, Any]:
    now_iso = _now_iso()
    fac_id = f"fac_{uuid.uuid4().hex[:10]}"
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO post_harvest_manual_facilities (
                id, farmer_id, facility_name, location, district, state,
                latitude, longitude, contact_info, storage_categories, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                fac_id,
                user_id,
                payload.facility_name,
                payload.location,
                payload.district,
                payload.state,
                payload.latitude,
                payload.longitude,
                payload.contact_info,
                payload.storage_categories,
                payload.notes,
                now_iso,
            ),
        )
        conn.commit()
        return dict(conn.execute("SELECT * FROM post_harvest_manual_facilities WHERE id = ?", (fac_id,)).fetchone())
    finally:
        conn.close()


async def find_facilities(
    user_id: str,
    role: str,
    farm_id: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    include_demo: bool = True,
) -> Dict[str, Any]:
    lat = latitude if latitude is not None else 12.5234
    lon = longitude if longitude is not None else 76.8976
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if farm_id:
            farm = _verify_farm_owner(cursor, farm_id, user_id, role)
            if latitude is None:
                lat = float(farm["latitude"])
            if longitude is None:
                lon = float(farm["longitude"])
        manual_rows = [
            dict(r)
            for r in cursor.execute(
                "SELECT * FROM post_harvest_manual_facilities WHERE farmer_id = ? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        ]
    finally:
        conn.close()

    return await discover_cold_storage_facilities(
        latitude=lat,
        longitude=lon,
        manual_facilities=manual_rows,
        include_demo=include_demo,
    )


def create_bidding_listing_from_lot(
    user_id: str,
    role: str,
    lot_id: str,
    payload: LotListingCreateRequest,
) -> Dict[str, Any]:
    now_iso = _now_iso()
    idem = payload.idempotency_key or f"bid_lot_{lot_id}_{uuid.uuid4().hex[:8]}"

    # Reserve quantity atomically via inventory module (prevents negative & duplicate deductions)
    res = record_lot_event(
        user_id,
        role,
        lot_id,
        InventoryEventRequest(
            event_type="reserve",
            quantity_kg=payload.quantity_kg,
            notes="Reserved for Smart Bidding produce listing",
            idempotency_key=idem,
        ),
    )
    lot = res["lot"]

    conn = get_db_connection()
    try:
        user_row = conn.execute("SELECT name FROM users WHERE id = ?", (user_id,)).fetchone()
        farmer_name = user_row["name"] if user_row else "Farmer"
        listing_id = f"lst_{uuid.uuid4().hex[:8]}"
        conn.execute(
            """
            INSERT INTO bidding_listings (
                id, farmer_id, farmer_name, farm_id, crop_name, variety,
                quantity_kg, min_price_per_kg, harvest_date, location,
                bidding_deadline, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
            """,
            (
                listing_id,
                user_id,
                farmer_name,
                lot["farm_id"],
                lot["crop"],
                lot.get("variety") or lot.get("quality_grade"),
                payload.quantity_kg,
                payload.min_price_per_kg,
                lot["harvest_date"],
                payload.pickup_location or lot["storage_location"],
                payload.bidding_deadline,
                now_iso,
            ),
        )
        conn.execute(
            "UPDATE post_harvest_lots SET linked_listing_id = ?, updated_at = ? WHERE id = ?",
            (listing_id, now_iso, lot_id),
        )
        conn.commit()
        listing = dict(conn.execute("SELECT * FROM bidding_listings WHERE id = ?", (listing_id,)).fetchone())
        return {"listing": listing, "lot": dict(conn.execute("SELECT * FROM post_harvest_lots WHERE id = ?", (lot_id,)).fetchone())}
    finally:
        conn.close()


def prepare_transport_from_lot(
    user_id: str,
    role: str,
    lot_id: str,
    payload: LotTransportPrepRequest,
) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        lot = _get_owned_lot(cursor, lot_id, user_id, role)
        if payload.quantity_kg > float(lot["available_quantity_kg"]) + float(lot["reserved_quantity_kg"]) + 1e-6:
            raise HTTPException(
                status_code=400,
                detail="Requested transport quantity exceeds lot stock.",
            )
        vehicles = [
            dict(r)
            for r in cursor.execute(
                """
                SELECT * FROM transport_vehicles
                WHERE availability_status = 'available' AND capacity_kg >= ?
                ORDER BY base_fare_per_km ASC, capacity_kg ASC
                """,
                (payload.quantity_kg,),
            ).fetchall()
        ]
    finally:
        conn.close()

    profile = get_crop_storage_profile(lot["crop"])
    refrigerated_available = any("refrigerat" in (v.get("vehicle_type") or "").lower() for v in vehicles)

    options = []
    for v in vehicles[:5]:
        est_fare = round(float(v["base_fare_per_km"]) * payload.estimated_distance_km, 2)
        options.append({
            **v,
            "estimated_fare_inr": est_fare,
        })

    return {
        "lot_id": lot_id,
        "crop": lot["crop"],
        "quantity_kg": payload.quantity_kg,
        "route_type": payload.route_type,
        "pickup_location": lot["storage_location"],
        "destination": payload.destination,
        "estimated_distance_km": payload.estimated_distance_km,
        "requires_refrigeration": profile["requires_refrigeration"],
        "refrigerated_vehicle_available": refrigerated_available,
        "crop_transport_guidance": (
            f"Recommended transit temp: {profile['recommended_temp_c']['min']}–{profile['recommended_temp_c']['max']}°C; {profile['packaging']}."
            + ("" if refrigerated_available else " Note: No refrigerated vehicles are currently registered in Transport Connect; transport during cool early-morning hours with ventilated crates.")
        ),
        "compatible_vehicles": options,
    }


def get_post_harvest_summary(user_id: str, role: str, farm_id: Optional[str] = None) -> Dict[str, Any]:
    lots = list_inventory_lots(user_id, role, farm_id)
    harvests = list_harvest_records(user_id, role, farm_id)
    storages = list_storage_records(user_id, role, farm_id)

    return {
        "farm_id": farm_id,
        "harvest_record_count": len(harvests),
        "total_estimated_yield_kg": round(sum(float(h["estimated_yield_kg"] or 0) for h in harvests), 2),
        "total_actual_harvested_kg": round(sum(float(h["actual_harvested_kg"] or 0) for h in harvests), 2),
        "lot_count": len(lots),
        "total_available_kg": round(sum(float(l["available_quantity_kg"] or 0) for l in lots), 2),
        "total_reserved_kg": round(sum(float(l["reserved_quantity_kg"] or 0) for l in lots), 2),
        "total_sold_kg": round(sum(float(l["sold_quantity_kg"] or 0) for l in lots), 2),
        "total_damaged_kg": round(sum(float(l["damaged_quantity_kg"] or 0) for l in lots), 2),
        "total_discarded_kg": round(sum(float(l["discarded_quantity_kg"] or 0) for l in lots), 2),
        "storage_record_count": len(storages),
        "total_estimated_storage_cost_inr": round(sum(float(s["total_estimated_cost_inr"] or 0) for s in storages), 2),
    }
