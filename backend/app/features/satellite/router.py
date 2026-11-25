"""Authenticated FastAPI router for AD-25 Satellite & Geospatial Agricultural Intelligence."""
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.features.assistant.security import resolve_authenticated_user
from backend.app.features.satellite.service import (
    _read_cached_observations,
    satellite_intelligence_service,
)

router = APIRouter(prefix="/satellite", tags=["Satellite Intelligence"])


class SatelliteObservationRequest(BaseModel):
    farm_id: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    boundary_geojson: Optional[Dict[str, Any]] = None
    nir_band: Optional[float] = Field(None, ge=0, le=1)
    red_band: Optional[float] = Field(None, ge=0, le=1)
    swir_band: Optional[float] = Field(None, ge=0, le=1)
    blue_band: Optional[float] = Field(None, ge=0, le=1)
    green_band: Optional[float] = Field(None, ge=0, le=1)
    red_edge_band: Optional[float] = Field(None, ge=0, le=1)
    use_demo_observation: bool = False
    offline_only: bool = False
    max_cloud_pct: float = Field(35.0, ge=0, le=100)
    lookback_days: int = Field(45, ge=7, le=180)


@router.get("/providers")
def get_satellite_providers(authorization: Optional[str] = Header(None)):
    """Return configured satellite providers and live capability status."""
    resolve_authenticated_user(authorization)
    return satellite_intelligence_service.get_provider_status()


@router.post("/observations")
async def analyze_satellite_observation(
    req: SatelliteObservationRequest,
    authorization: Optional[str] = Header(None),
):
    """Run live satellite scene discovery, spectral index calculation, and agronomic fusion."""
    user = resolve_authenticated_user(authorization)
    try:
        return await satellite_intelligence_service.analyze_observation(
            user_id=user["user_id"],
            role=user["role"],
            farm_id=req.farm_id,
            latitude=req.latitude,
            longitude=req.longitude,
            boundary_geojson=req.boundary_geojson,
            nir_band=req.nir_band,
            red_band=req.red_band,
            swir_band=req.swir_band,
            blue_band=req.blue_band,
            green_band=req.green_band,
            red_edge_band=req.red_edge_band,
            use_demo_observation=req.use_demo_observation,
            offline_only=req.offline_only,
            max_cloud_pct=req.max_cloud_pct,
            lookback_days=req.lookback_days,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/history/{farm_id}")
def get_satellite_history(
    farm_id: str,
    polygon_hash: Optional[str] = Query(None),
    limit: int = Query(24, ge=1, le=100),
    authorization: Optional[str] = Header(None),
):
    """Return cached chronological satellite observations and change detection for a farm."""
    user = resolve_authenticated_user(authorization)
    return satellite_intelligence_service.get_history(
        user_id=user["user_id"],
        role=user["role"],
        farm_id=farm_id,
        polygon_hash=polygon_hash,
        limit=limit,
    )


@router.get("/cache/{farm_id}")
def get_satellite_cache(
    farm_id: str,
    limit: int = Query(12, ge=1, le=50),
    authorization: Optional[str] = Header(None),
):
    """Inspect persisted satellite observation cache entries for an authorized farm."""
    user = resolve_authenticated_user(authorization)
    # Reuse ownership check via get_history
    history = satellite_intelligence_service.get_history(
        user_id=user["user_id"],
        role=user["role"],
        farm_id=farm_id,
        limit=limit,
    )
    return {
        "farm_id": farm_id,
        "cached_count": history["observation_count"],
        "entries": history["observations"],
    }
