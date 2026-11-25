# backend/app/api/endpoints/locations.py
"""
FastAPI endpoints for Smart Location Selector (Forward Search & Reverse Geocoding).
"""
from fastapi import APIRouter, Query
from backend.app.schemas.location import GeocodeSearchResponse, ReverseGeocodeResponse
from backend.app.services.geocoding_service import geocoding_service

router = APIRouter(prefix="/locations", tags=["Locations & Geocoding"])

@router.get(
    "/search",
    response_model=GeocodeSearchResponse,
    summary="Search village, town, district, state, or PIN code",
    description="Explicit search via OpenStreetMap Nominatim with rate limiting and caching."
)
def search_locations(
    q: str = Query(..., min_length=2, description="Village, city, district, state, or PIN code"),
    limit: int = Query(default=6, ge=1, le=10)
):
    return geocoding_service.search_location(query=q, limit=limit)

@router.get(
    "/reverse",
    response_model=ReverseGeocodeResponse,
    summary="Reverse geocode coordinates to address components",
    description="Converts latitude/longitude into village, district, state, country, and PIN code."
)
def reverse_geocode(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude")
):
    return geocoding_service.reverse_geocode(lat=lat, lon=lon)
