# backend/app/api/endpoints/weather.py
from fastapi import APIRouter, Query
from backend.app.schemas.weather import WeatherResponse
from backend.app.services.weather_service import weather_service

router = APIRouter()

@router.get("/weather", response_model=WeatherResponse, summary="Get live agrometeorological observations and 7-day forecast")
async def get_weather(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude")
):
    return await weather_service.get_weather(lat, lon)
