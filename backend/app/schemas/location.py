# backend/app/schemas/location.py
"""
Pydantic Schemas for Smart Location Selector: Forward & Reverse Geocoding.
"""
from pydantic import BaseModel, Field
from typing import List, Optional

class GeocodeSearchResult(BaseModel):
    display_name: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    village_or_locality: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pin_code: Optional[str] = None
    place_type: Optional[str] = None

class GeocodeSearchResponse(BaseModel):
    query: str
    results: List[GeocodeSearchResult]
    attribution: str = "© OpenStreetMap contributors (Nominatim)"
    cached: bool = False
    is_live: bool = True
    error_message: Optional[str] = None

class ReverseGeocodeResponse(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    formatted_address: Optional[str] = None
    village_or_locality: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pin_code: Optional[str] = None
    attribution: str = "© OpenStreetMap contributors (Nominatim)"
    cached: bool = False
    is_live: bool = True
    unavailable_reason: Optional[str] = None
