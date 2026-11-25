# backend/app/schemas/weather.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date

class CurrentWeather(BaseModel):
    time: datetime
    temperature_c: float
    relative_humidity_pct: int
    precipitation_mm: float
    rain_probability_pct: int
    wind_speed_kmh: float
    wind_direction_deg: int
    weather_code: int
    condition_text: str
    et0_fao56_mm: float

class DailyForecast(BaseModel):
    date: date
    temp_max_c: float
    temp_min_c: float
    precipitation_sum_mm: float
    rain_probability_max_pct: int
    et0_fao56_mm: float
    condition_text: str

class Provenance(BaseModel):
    source: str
    timestamp: datetime
    quality: str
    is_live: bool = True

class WeatherResponse(BaseModel):
    latitude: float
    longitude: float
    elevation_m: float
    timezone: str
    current: CurrentWeather
    daily_forecast: List[DailyForecast]
    provenance: Provenance
