# backend/app/features/satellite_monitoring/router.py
from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.app.features.satellite_monitoring.cdse_client import get_provider_status
from backend.app.features.satellite_monitoring.maize_model import MAIZE_VARIETIES, compute_maize_agronomy
from backend.app.features.satellite_monitoring.monitoring_service import (
    list_monitored_parcels,
    register_and_sync_parcel,
    retrieve_historical_timelapse,
)

router = APIRouter(prefix="/satellite-monitoring", tags=["Real Satellite Monitoring (AD-33)"])


class TimelapseRequest(BaseModel):
    coordinates: List[List[float]] = Field(..., description="GeoJSON polygon ring [[lon, lat], ...]")
    start_date: str = Field(..., description="ISO start date YYYY-MM-DD")
    end_date: str = Field(..., description="ISO end date YYYY-MM-DD")
    farm_id: Optional[str] = None
    sowing_date: Optional[str] = None
    total_days: int = Field(default=110, ge=30, le=365)
    max_scenes: int = Field(default=6, ge=1, le=12)


class ParcelSyncRequest(BaseModel):
    farm_id: Optional[str] = None
    farm_name: str = Field(default="My Agricultural Parcel")
    crop_name: str = Field(default="Maize")
    sowing_date: str = Field(default="2026-09-01")
    area_acres: float = Field(default=2.0, gt=0.01)
    coordinates: List[List[float]]
    total_days: int = Field(default=110, ge=30, le=365)


class MaizeAgronomyRequest(BaseModel):
    area_acres: float = Field(default=2.0, gt=0.01)
    variety_id: str = Field(default="nah-1137")
    sowing_date: Optional[str] = None
    row_spacing_cm: Optional[float] = Field(default=None, gt=15, le=200)
    plant_spacing_cm: Optional[float] = Field(default=None, gt=5, le=150)
    germination_pct: Optional[float] = Field(default=None, ge=10, le=100)
    custom_seed_rate_kg_per_acre: Optional[float] = Field(default=None, gt=0.1, le=100)
    mean_daily_temp_c: float = Field(default=25.5, ge=5, le=45)


@router.get("/provider-status")
def provider_status():
    return get_provider_status()


@router.post("/timelapse")
def get_satellite_timelapse(req: TimelapseRequest):
    return retrieve_historical_timelapse(
        coordinates=req.coordinates,
        start_date=req.start_date,
        end_date=req.end_date,
        farm_id=req.farm_id,
        sowing_date=req.sowing_date,
        total_days=req.total_days,
        max_scenes=req.max_scenes,
    )


@router.post("/parcels/sync")
def sync_parcel(req: ParcelSyncRequest):
    return register_and_sync_parcel(
        farm_id=req.farm_id,
        farm_name=req.farm_name,
        crop_name=req.crop_name,
        sowing_date=req.sowing_date,
        area_acres=req.area_acres,
        coordinates=req.coordinates,
        total_days=req.total_days,
    )


@router.get("/parcels")
def get_monitored_parcels():
    return {"parcels": list_monitored_parcels()}


@router.get("/maize-varieties")
def get_maize_varieties():
    return {"varieties": list(MAIZE_VARIETIES.values())}


@router.post("/maize-agronomy")
def maize_agronomy(req: MaizeAgronomyRequest):
    return compute_maize_agronomy(
        area_acres=req.area_acres,
        variety_id=req.variety_id,
        sowing_date=req.sowing_date,
        row_spacing_cm=req.row_spacing_cm,
        plant_spacing_cm=req.plant_spacing_cm,
        germination_pct=req.germination_pct,
        custom_seed_rate_kg_per_acre=req.custom_seed_rate_kg_per_acre,
        mean_daily_temp_c=req.mean_daily_temp_c,
    )
