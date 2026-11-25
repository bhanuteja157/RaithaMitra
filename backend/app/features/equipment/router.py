"""Authenticated FastAPI router for AD-28 Equipment Connect."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Header, Query

from backend.app.features.equipment.booking import (
    create_booking,
    list_user_bookings,
    settle_booking_payment,
    transition_booking_status,
)
from backend.app.features.equipment.maintenance import (
    list_maintenance_records,
    record_maintenance,
)
from backend.app.features.equipment.optimizer import optimize_shared_equipment
from backend.app.features.equipment.schemas import (
    AvailabilityBlockCreate,
    BookingStatusUpdate,
    EQUIPMENT_CATEGORIES,
    EquipmentBookingCreate,
    EquipmentCreate,
    EquipmentUpdate,
    MaintenanceRecordCreate,
    SharedOptimizationRequest,
)
from backend.app.features.equipment.service import (
    add_availability_block,
    discover_equipment,
    get_equipment_details,
    get_equipment_financial_summary,
    recommend_equipment_for_farm,
    register_equipment,
    update_equipment,
)
from backend.app.features.finance.service import resolve_authenticated_farmer

router = APIRouter(prefix="/equipment", tags=["Equipment Connect (AD-28)"])


@router.get("/categories")
def get_categories():
    return {"categories": EQUIPMENT_CATEGORIES}


@router.post("/listings")
def create_equipment_listing(
    req: EquipmentCreate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return register_equipment(user["user_id"], req)


@router.patch("/listings/{equipment_id}")
def patch_equipment_listing(
    equipment_id: str,
    req: EquipmentUpdate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return update_equipment(user["user_id"], user["role"], equipment_id, req)


@router.get("/listings")
def list_equipment(
    category: Optional[str] = Query(None),
    operation: Optional[str] = Query(None),
    crop: Optional[str] = Query(None),
    max_rate_inr: Optional[float] = Query(None, ge=0),
    operator_only: bool = Query(False),
    fuel_included_only: bool = Query(False),
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    max_distance_km: Optional[float] = Query(None, gt=0),
    availability_date: Optional[str] = Query(None),
):
    return {
        "equipment": discover_equipment(
            category=category,
            operation=operation,
            crop=crop,
            max_rate_inr=max_rate_inr,
            operator_only=operator_only,
            fuel_included_only=fuel_included_only,
            latitude=latitude,
            longitude=longitude,
            max_distance_km=max_distance_km,
            availability_date=availability_date,
        )
    }


@router.get("/listings/{equipment_id}")
def get_equipment_detail(equipment_id: str):
    return get_equipment_details(equipment_id)


@router.post("/listings/{equipment_id}/availability")
def post_availability_block(
    equipment_id: str,
    req: AvailabilityBlockCreate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return add_availability_block(user["user_id"], user["role"], equipment_id, req)


@router.post("/listings/{equipment_id}/maintenance")
def post_maintenance_record(
    equipment_id: str,
    req: MaintenanceRecordCreate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return record_maintenance(user["user_id"], user["role"], equipment_id, req)


@router.get("/listings/{equipment_id}/maintenance")
def get_maintenance_history(equipment_id: str):
    return {"maintenance_records": list_maintenance_records(equipment_id)}


@router.get("/recommendations")
async def get_recommendations(
    farm_id: Optional[str] = Query(None),
    operation_type: str = Query("Land Preparation"),
    crop: Optional[str] = Query(None),
    farm_area_acres: Optional[float] = Query(None, gt=0),
    budget_inr: Optional[float] = Query(None, ge=0),
    authorization: Optional[str] = Header(None),
):
    resolve_authenticated_farmer(authorization)
    return await recommend_equipment_for_farm(
        farm_id=farm_id,
        operation_type=operation_type,
        crop=crop,
        farm_area_acres=farm_area_acres,
        budget_inr=budget_inr,
    )


@router.post("/bookings")
def post_booking(
    req: EquipmentBookingCreate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return create_booking(user["user_id"], user["role"], req)


@router.get("/bookings")
def get_my_bookings(authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_farmer(authorization)
    return {"bookings": list_user_bookings(user["user_id"])}


@router.patch("/bookings/{booking_id}/status")
def patch_booking_status(
    booking_id: str,
    req: BookingStatusUpdate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return transition_booking_status(user["user_id"], user["role"], booking_id, req)


@router.post("/bookings/{booking_id}/settle")
def post_settle_booking(
    booking_id: str,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return settle_booking_payment(user["user_id"], user["role"], booking_id)


@router.post("/shared-optimize")
def post_shared_optimize(
    req: SharedOptimizationRequest,
    persist: bool = Query(True),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return optimize_shared_equipment(requester_user_id=user["user_id"], payload=req, persist=persist)


@router.get("/financial-summary")
def get_financial_summary(authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_farmer(authorization)
    return get_equipment_financial_summary(user["user_id"])
