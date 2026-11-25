# backend/app/api/endpoints/farms.py
from fastapi import APIRouter, HTTPException, Query, status
from typing import List
from backend.app.schemas.farm import Farm, FarmCreate, FarmUpdate, FarmSummary
from backend.app.services.farm_service import farm_service
from backend.app.services.weather_service import weather_service

router = APIRouter()

@router.get("/farms", response_model=List[Farm], summary="List all farms")
async def list_farms():
    return farm_service.list_farms()

@router.post("/farms", response_model=Farm, status_code=status.HTTP_201_CREATED, summary="Create a new farm profile")
async def create_farm(farm_in: FarmCreate):
    return farm_service.create_farm(farm_in)

@router.get("/farms/{farm_id}", response_model=Farm, summary="Get farm by ID")
async def get_farm(farm_id: str):
    farm = farm_service.get_farm(farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found")
    return farm

@router.patch("/farms/{farm_id}", response_model=Farm, summary="Update farm profile")
async def update_farm(farm_id: str, farm_update: FarmUpdate):
    farm = farm_service.update_farm(farm_id, farm_update)
    if not farm:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found")
    return farm

@router.get("/farms/{farm_id}/summary", response_model=FarmSummary, summary="Get live operational summary for a farm")
async def get_farm_summary(farm_id: str):
    farm = farm_service.get_farm(farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found")
    
    # Retrieve weather to get real ET0
    weather = await weather_service.get_weather(farm.latitude, farm.longitude)
    summary = farm_service.get_farm_summary(
        farm_id,
        et0_mm=weather.current.et0_fao56_mm,
        recent_rain_mm=weather.current.precipitation_mm
    )
    return summary
