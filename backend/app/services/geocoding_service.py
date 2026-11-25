# backend/app/services/geocoding_service.py
"""
OpenStreetMap Nominatim Geocoding & Reverse Geocoding Service.
Implements provider-compliant User-Agent, 1 req/sec rate limiting,
TTL caching, and graceful failure without fabricating addresses.
"""
from typing import Dict, Any, List, Optional
import time
import threading
import requests

from backend.app.schemas.location import (
    GeocodeSearchResult,
    GeocodeSearchResponse,
    ReverseGeocodeResponse,
)

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "RaithaMitra-AgriTech/1.0 (syntax-squad@raithamitra.in)"

_CACHE_TTL_SECONDS = 3600
_SEARCH_CACHE: Dict[str, Dict[str, Any]] = {}
_REVERSE_CACHE: Dict[str, Dict[str, Any]] = {}
_RATE_LOCK = threading.Lock()
_LAST_REQUEST_TS = 0.0

def _respect_rate_limit():
    """Enforces Nominatim's maximum 1 request per second policy."""
    global _LAST_REQUEST_TS
    with _RATE_LOCK:
        now = time.time()
        elapsed = now - _LAST_REQUEST_TS
        if elapsed < 1.05:
            time.sleep(1.05 - elapsed)
        _LAST_REQUEST_TS = time.time()

def _extract_address_components(addr: Dict[str, Any]) -> Dict[str, Optional[str]]:
    village = (
        addr.get("village")
        or addr.get("hamlet")
        or addr.get("suburb")
        or addr.get("town")
        or addr.get("city")
        or addr.get("locality")
    )
    district = (
        addr.get("state_district")
        or addr.get("county")
        or addr.get("district")
        or addr.get("city_district")
    )
    state = addr.get("state")
    country = addr.get("country")
    pin_code = addr.get("postcode")
    return {
        "village_or_locality": village,
        "district": district.replace(" district", "").replace(" District", "") if district else None,
        "state": state,
        "country": country,
        "pin_code": pin_code,
    }

class GeocodingService:
    def search_location(self, query: str, limit: int = 6) -> GeocodeSearchResponse:
        clean_q = query.strip()
        if len(clean_q) < 2:
            return GeocodeSearchResponse(
                query=clean_q,
                results=[],
                is_live=False,
                error_message="Please enter at least 2 characters to search."
            )

        cache_key = f"{clean_q.lower()}::{limit}"
        now = time.time()
        if cache_key in _SEARCH_CACHE and (now - _SEARCH_CACHE[cache_key]["ts"]) < _CACHE_TTL_SECONDS:
            cached_resp = _SEARCH_CACHE[cache_key]["data"].model_copy()
            cached_resp.cached = True
            return cached_resp

        try:
            _respect_rate_limit()
            params = {
                "q": clean_q,
                "format": "jsonv2",
                "addressdetails": 1,
                "limit": min(max(limit, 1), 10),
                "countrycodes": "in",
            }
            headers = {"User-Agent": USER_AGENT, "Accept-Language": "en"}
            resp = requests.get(NOMINATIM_SEARCH_URL, params=params, headers=headers, timeout=5.0)
            if resp.status_code != 200:
                return GeocodeSearchResponse(
                    query=clean_q,
                    results=[],
                    is_live=False,
                    error_message=f"Geocoding service returned status {resp.status_code}."
                )

            raw_items = resp.json()
            # If no India-specific results found, retry globally once
            if not raw_items:
                _respect_rate_limit()
                params.pop("countrycodes", None)
                resp2 = requests.get(NOMINATIM_SEARCH_URL, params=params, headers=headers, timeout=5.0)
                if resp2.status_code == 200:
                    raw_items = resp2.json()

            results: List[GeocodeSearchResult] = []
            for item in raw_items:
                try:
                    lat = float(item["lat"])
                    lon = float(item["lon"])
                except (KeyError, ValueError, TypeError):
                    continue
                addr_parts = _extract_address_components(item.get("address", {}))
                results.append(GeocodeSearchResult(
                    display_name=item.get("display_name", f"{lat:.4f}, {lon:.4f}"),
                    latitude=round(lat, 6),
                    longitude=round(lon, 6),
                    village_or_locality=addr_parts["village_or_locality"],
                    district=addr_parts["district"],
                    state=addr_parts["state"],
                    country=addr_parts["country"],
                    pin_code=addr_parts["pin_code"],
                    place_type=item.get("type")
                ))

            result_obj = GeocodeSearchResponse(
                query=clean_q,
                results=results,
                is_live=True,
                cached=False
            )
            _SEARCH_CACHE[cache_key] = {"ts": now, "data": result_obj}
            return result_obj

        except requests.Timeout:
            return GeocodeSearchResponse(
                query=clean_q,
                results=[],
                is_live=False,
                error_message="Location search timed out. You can still select a point on the map or enter coordinates manually."
            )
        except Exception:
            return GeocodeSearchResponse(
                query=clean_q,
                results=[],
                is_live=False,
                error_message="Geocoding service temporarily unavailable. Please use map pin or manual coordinates."
            )

    def reverse_geocode(self, lat: float, lon: float) -> ReverseGeocodeResponse:
        # Round to 5 decimals (~1m precision) for cache efficiency
        r_lat = round(lat, 5)
        r_lon = round(lon, 5)
        cache_key = f"{r_lat}::{r_lon}"
        now = time.time()

        if cache_key in _REVERSE_CACHE and (now - _REVERSE_CACHE[cache_key]["ts"]) < _CACHE_TTL_SECONDS:
            cached_resp = _REVERSE_CACHE[cache_key]["data"].model_copy()
            cached_resp.cached = True
            return cached_resp

        try:
            _respect_rate_limit()
            params = {
                "lat": r_lat,
                "lon": r_lon,
                "format": "jsonv2",
                "addressdetails": 1,
                "zoom": 16,
            }
            headers = {"User-Agent": USER_AGENT, "Accept-Language": "en"}
            resp = requests.get(NOMINATIM_REVERSE_URL, params=params, headers=headers, timeout=5.0)
            if resp.status_code != 200:
                return ReverseGeocodeResponse(
                    latitude=r_lat,
                    longitude=r_lon,
                    is_live=False,
                    unavailable_reason=f"Reverse geocoding returned HTTP {resp.status_code}."
                )

            data = resp.json()
            if "error" in data:
                return ReverseGeocodeResponse(
                    latitude=r_lat,
                    longitude=r_lon,
                    is_live=True,
                    unavailable_reason="Address details unavailable for these coordinates."
                )

            addr_parts = _extract_address_components(data.get("address", {}))
            result_obj = ReverseGeocodeResponse(
                latitude=r_lat,
                longitude=r_lon,
                formatted_address=data.get("display_name"),
                village_or_locality=addr_parts["village_or_locality"],
                district=addr_parts["district"],
                state=addr_parts["state"],
                country=addr_parts["country"],
                pin_code=addr_parts["pin_code"],
                is_live=True,
                cached=False
            )
            _REVERSE_CACHE[cache_key] = {"ts": now, "data": result_obj}
            return result_obj

        except Exception:
            return ReverseGeocodeResponse(
                latitude=r_lat,
                longitude=r_lon,
                is_live=False,
                unavailable_reason="Address lookup unavailable offline; coordinates preserved."
            )

geocoding_service = GeocodingService()
