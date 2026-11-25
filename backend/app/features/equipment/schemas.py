"""Pydantic request schemas for AD-28 Equipment Sharing & Resource Optimization."""
from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field

EQUIPMENT_CATEGORIES = [
    "Tractor",
    "Rotavator",
    "Plough",
    "Cultivator",
    "Seed Drill",
    "Paddy Transplanter",
    "Combine Harvester",
    "Thresher",
    "Sprayer",
    "Agricultural Drone",
    "Irrigation Pump",
    "Power Tiller",
    "Earth Auger",
    "Chaff Cutter",
    "Baling Machine",
    "Other",
]


class EquipmentCreate(BaseModel):
    equipment_name: str = Field(..., min_length=2, max_length=140)
    category: str = Field(..., min_length=2, max_length=60)
    manufacturer: Optional[str] = Field(None, max_length=80)
    model: Optional[str] = Field(None, max_length=80)
    manufacturing_year: Optional[int] = Field(None, ge=1970, le=2030)
    power_or_capacity: Optional[str] = Field(None, max_length=80)
    effective_field_capacity_ha_hr: float = Field(0.4, gt=0.01, le=20.0)
    theoretical_capacity_ha_hr: Optional[float] = Field(None, gt=0.01, le=25.0)
    suitable_operations: List[str] = Field(default_factory=lambda: ["Land Preparation"])
    suitable_crops: List[str] = Field(default_factory=lambda: ["All Crops"])
    condition_status: str = Field("Good", max_length=40)
    rental_rate_inr: float = Field(..., ge=0)
    rate_unit: Literal["hourly", "daily", "per_acre", "per_hectare", "fixed"] = "hourly"
    min_booking_duration: float = Field(1.0, gt=0, le=72)
    operator_available: bool = True
    operator_charge_inr: float = Field(0.0, ge=0)
    fuel_included: bool = True
    fuel_charge_inr: float = Field(0.0, ge=0)
    delivery_charge_inr: float = Field(0.0, ge=0)
    setup_charge_inr: float = Field(0.0, ge=0)
    location_label: str = Field("Mandya, Karnataka", min_length=2, max_length=160)
    latitude: float = Field(12.5234, ge=-90, le=90)
    longitude: float = Field(76.8976, ge=-180, le=180)
    service_radius_km: float = Field(25.0, gt=0, le=500)
    photo_url: Optional[str] = Field(None, max_length=300)


class EquipmentUpdate(BaseModel):
    equipment_name: Optional[str] = Field(None, min_length=2, max_length=140)
    rental_rate_inr: Optional[float] = Field(None, ge=0)
    condition_status: Optional[str] = None
    maintenance_status: Optional[Literal["operational", "maintenance_scheduled", "under_maintenance", "inactive"]] = None
    is_active: Optional[bool] = None
    location_label: Optional[str] = None
    service_radius_km: Optional[float] = Field(None, gt=0, le=500)


class AvailabilityBlockCreate(BaseModel):
    block_type: Literal["available_window", "maintenance", "owner_unavailable"] = "owner_unavailable"
    start_datetime: str = Field(..., min_length=10)
    end_datetime: str = Field(..., min_length=10)
    notes: Optional[str] = Field(None, max_length=250)


class EquipmentBookingCreate(BaseModel):
    equipment_id: str
    farm_id: Optional[str] = "farm_001"
    operation_type: str = Field(..., min_length=2, max_length=80)
    booking_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    start_datetime: str = Field(..., min_length=10)
    end_datetime: str = Field(..., min_length=10)
    duration_hours: float = Field(..., gt=0, le=72)
    farm_area_acres: float = Field(1.0, gt=0, le=5000)
    include_operator: bool = True
    other_charges_inr: float = Field(0.0, ge=0)
    notes: Optional[str] = Field(None, max_length=300)
    idempotency_key: Optional[str] = Field(None, max_length=120)


class BookingStatusUpdate(BaseModel):
    status: Literal["accepted", "rejected", "scheduled", "in_progress", "completed", "cancelled"]
    notes: Optional[str] = Field(None, max_length=300)


class SharedFarmerParticipant(BaseModel):
    farmer_label: str = Field(..., min_length=1, max_length=80)
    farm_id: Optional[str] = None
    area_acres: float = Field(..., gt=0, le=500)
    required_hours: float = Field(..., gt=0, le=24)
    latitude: float = Field(12.5234, ge=-90, le=90)
    longitude: float = Field(76.8976, ge=-180, le=180)
    max_wait_hours: float = Field(12.0, ge=1, le=48)
    consented: bool = True


class SharedOptimizationRequest(BaseModel):
    equipment_id: Optional[str] = None
    operation_type: str = "Land Preparation"
    target_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    hourly_rate_inr: Optional[float] = Field(None, ge=0)
    individual_delivery_charge_inr: float = Field(1200.0, ge=0)
    shared_delivery_charge_inr: float = Field(1500.0, ge=0)
    setup_minutes_between_farms: int = Field(0, ge=0, le=180)
    participants: List[SharedFarmerParticipant] = Field(..., min_length=2, max_length=10)


class MaintenanceRecordCreate(BaseModel):
    maintenance_type: str = Field(..., min_length=2, max_length=100)
    maintenance_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    operating_hours: float = Field(0.0, ge=0)
    next_due_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    cost_inr: float = Field(0.0, ge=0)
    notes: Optional[str] = Field(None, max_length=300)
    block_start_datetime: Optional[str] = None
    block_end_datetime: Optional[str] = None
