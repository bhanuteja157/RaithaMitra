# backend/app/api/endpoints/farms.py
from fastapi import APIRouter, Header, HTTPException, status
from typing import List, Optional
from backend.app.schemas.farm import Farm, FarmCreate, FarmUpdate, FarmSummary
from backend.app.services.farm_service import farm_service
from backend.app.services.weather_service import weather_service
from backend.app.features.auth.security import require_roles, resolve_authenticated_user

router = APIRouter()


def _assert_farm_access(farm: Optional[Farm], farm_id: str, user: dict) -> Farm:
    if not farm:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found")
    if user["role"] != "admin" and farm.farmer_id and farm.farmer_id != user["id"]:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: You cannot access or modify another farmer's farm.",
        )
    return farm


@router.get("/farms", response_model=List[Farm], summary="List authenticated farmer's farms")
async def list_farms(authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_user(authorization)
    if user["role"] == "admin":
        return farm_service.list_farms()
    return farm_service.list_farms(farmer_id=user["id"])


@router.post("/farms", response_model=Farm, status_code=status.HTTP_201_CREATED, summary="Create a new farm profile")
async def create_farm(farm_in: FarmCreate, authorization: Optional[str] = Header(None)):
    user = require_roles(authorization, ["farmer"], detail="Unauthorized: Only registered farmers can create farms.")
    return farm_service.create_farm(farm_in, farmer_id=user["id"])


@router.get("/farms/{farm_id}", response_model=Farm, summary="Get farm by ID")
async def get_farm(farm_id: str, authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_user(authorization)
    farm = farm_service.get_farm(farm_id)
    return _assert_farm_access(farm, farm_id, user)


@router.patch("/farms/{farm_id}", response_model=Farm, summary="Update farm profile")
async def update_farm(farm_id: str, farm_update: FarmUpdate, authorization: Optional[str] = Header(None)):
    user = require_roles(authorization, ["farmer"], detail="Unauthorized: Only registered farmers can update farms.")
    existing = farm_service.get_farm(farm_id)
    _assert_farm_access(existing, farm_id, user)
    farm = farm_service.update_farm(farm_id, farm_update)
    if not farm:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found")
    return farm


@router.get("/farms/{farm_id}/summary", response_model=FarmSummary, summary="Get live operational summary for a farm")
async def get_farm_summary(farm_id: str, authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_user(authorization)
    farm = _assert_farm_access(farm_service.get_farm(farm_id), farm_id, user)

    # Retrieve weather to get real ET0
    weather = await weather_service.get_weather(farm.latitude, farm.longitude)
    summary = farm_service.get_farm_summary(
        farm_id,
        et0_mm=weather.current.et0_fao56_mm,
        recent_rain_mm=weather.current.precipitation_mm
    )
    return summary
