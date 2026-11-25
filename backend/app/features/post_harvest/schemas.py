"""Pydantic request schemas for AD-27 Post-Harvest Intelligence."""
from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field


class HarvestRecordCreate(BaseModel):
    farm_id: str = "farm_001"
    crop: str = Field(..., min_length=2, max_length=80)
    variety: Optional[str] = Field(None, max_length=120)
    cultivated_area_ha: float = Field(..., gt=0, le=5000)
    expected_harvest_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    estimated_yield_kg: float = Field(..., gt=0)
    actual_harvested_kg: Optional[float] = Field(None, ge=0)
    crop_maturity: str = Field("Optimal", max_length=60)
    harvest_quality: str = Field("Grade A", max_length=40)
    damaged_quantity_kg: float = Field(0.0, ge=0)
    is_simulated: bool = False
    digital_farming_notes: Optional[str] = Field(None, max_length=400)


class HarvestRecordUpdate(BaseModel):
    actual_harvested_kg: Optional[float] = Field(None, ge=0)
    crop_maturity: Optional[str] = Field(None, max_length=60)
    harvest_quality: Optional[str] = Field(None, max_length=40)
    damaged_quantity_kg: Optional[float] = Field(None, ge=0)


class InventoryLotCreate(BaseModel):
    farm_id: str = "farm_001"
    harvest_record_id: Optional[str] = None
    crop: str = Field(..., min_length=2, max_length=80)
    variety: Optional[str] = Field(None, max_length=120)
    harvest_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    initial_quantity_kg: float = Field(..., gt=0)
    quality_grade: str = Field("Grade A", max_length=40)
    storage_method: str = Field("Ambient Ventilated", max_length=100)
    storage_location: str = Field("On-Farm Shed", max_length=160)
    recorded_temp_c: Optional[float] = Field(None, ge=-10, le=60)
    recorded_humidity_pct: Optional[float] = Field(None, ge=0, le=100)
    packaging_type: str = Field("Ventilated Plastic Crates", max_length=100)


class InventoryConditionsUpdate(BaseModel):
    storage_method: Optional[str] = Field(None, max_length=100)
    storage_location: Optional[str] = Field(None, max_length=160)
    recorded_temp_c: Optional[float] = Field(None, ge=-10, le=60)
    recorded_humidity_pct: Optional[float] = Field(None, ge=0, le=100)
    packaging_type: Optional[str] = Field(None, max_length=100)
    quality_grade: Optional[str] = Field(None, max_length=40)


class InventoryEventRequest(BaseModel):
    event_type: Literal["damage", "sale", "transport", "discard", "reserve"]
    quantity_kg: float = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=300)
    reference_id: Optional[str] = Field(None, max_length=100)
    idempotency_key: Optional[str] = Field(None, max_length=120)


class StorageRecordCreate(BaseModel):
    farm_id: str = "farm_001"
    lot_id: Optional[str] = None
    facility_name: str = Field(..., min_length=2, max_length=160)
    facility_source: Literal["manual", "google_places", "demonstration"] = "manual"
    commodity: str = Field(..., min_length=2, max_length=80)
    quantity_kg: float = Field(..., gt=0)
    start_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    expected_retrieval_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    target_temp_c: Optional[float] = Field(None, ge=-10, le=50)
    target_humidity_pct: Optional[float] = Field(None, ge=0, le=100)
    storage_rate_inr_per_day: float = Field(0.0, ge=0)
    loading_charges_inr: float = Field(0.0, ge=0)
    handling_charges_inr: float = Field(0.0, ge=0)
    other_expenses_inr: float = Field(0.0, ge=0)
    reservation_status: Literal["draft", "requested"] = "draft"
    sync_to_finance: bool = True
    finance_status: Literal["estimated", "committed", "recorded"] = "estimated"


class ManualFacilityCreate(BaseModel):
    facility_name: str = Field(..., min_length=2, max_length=160)
    location: str = Field(..., min_length=2, max_length=200)
    district: Optional[str] = Field(None, max_length=80)
    state: Optional[str] = Field(None, max_length=80)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    contact_info: Optional[str] = Field(None, max_length=120)
    storage_categories: Optional[str] = Field("Cold Storage / Ambient Godown", max_length=200)
    notes: Optional[str] = Field(None, max_length=300)


class ShelfLifeRequest(BaseModel):
    crop: str = Field(..., min_length=2, max_length=80)
    variety: Optional[str] = None
    harvest_maturity: str = "Optimal"
    harvest_date: Optional[str] = None
    current_temp_c: Optional[float] = Field(None, ge=-10, le=60)
    current_rh_pct: Optional[float] = Field(None, ge=0, le=100)
    storage_method: str = "Ambient Ventilated"
    packaging: str = "Ventilated Plastic Crates"
    initial_quality: str = "Grade A"
    observed_damage_pct: float = Field(0.0, ge=0, le=100)


class SpoilageRiskRequest(BaseModel):
    crop: str = Field(..., min_length=2, max_length=80)
    storage_duration_days: int = Field(5, ge=0, le=730)
    current_temp_c: Optional[float] = Field(None, ge=-10, le=60)
    current_rh_pct: Optional[float] = Field(None, ge=0, le=100)
    temperature_source: Literal["manual", "open_meteo_ambient"] = "manual"
    observed_damage_pct: float = Field(0.0, ge=0, le=100)
    ventilation_adequate: bool = True
    moisture_exposure: bool = False


class EconomicCompareRequest(BaseModel):
    commodity: str = Field(..., min_length=2, max_length=80)
    available_quantity_kg: float = Field(..., gt=0)
    current_price_per_kg: float = Field(..., gt=0)
    immediate_transport_cost_inr: float = Field(0.0, ge=0)
    immediate_other_charges_inr: float = Field(0.0, ge=0)
    storage_duration_days: int = Field(5, ge=1, le=730)
    expected_future_price_per_kg: float = Field(..., gt=0)
    estimated_loss_pct: float = Field(8.0, ge=0, le=95)
    storage_charges_inr: float = Field(0.0, ge=0)
    future_transport_cost_inr: float = Field(0.0, ge=0)
    handling_charges_inr: float = Field(0.0, ge=0)
    other_storage_expenses_inr: float = Field(0.0, ge=0)
    run_monte_carlo: bool = True
    num_trials: int = Field(1000, ge=100, le=5000)
    random_seed: int = 42


class LotListingCreateRequest(BaseModel):
    quantity_kg: float = Field(..., gt=0)
    min_price_per_kg: float = Field(..., gt=0)
    bidding_deadline: str = Field(..., min_length=8)
    pickup_location: Optional[str] = None
    idempotency_key: Optional[str] = None


class LotTransportPrepRequest(BaseModel):
    quantity_kg: float = Field(..., gt=0)
    route_type: Literal["farm_to_market", "farm_to_storage", "storage_to_buyer"] = "farm_to_market"
    destination: str = Field(..., min_length=2, max_length=200)
    estimated_distance_km: float = Field(45.0, gt=0, le=2000)
