"""
AD-27: Cold Storage Discovery Provider.
Queries Google Places API if GOOGLE_PLACES_API_KEY / GOOGLE_MAPS_API_KEY is configured,
loads farmer's manually entered facilities from SQLite, and provides clearly labelled
demonstration facilities separately without ever fabricating live capacity or booking availability.
"""
from __future__ import annotations

import logging
import math
import os
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

DEMO_FACILITIES: List[Dict[str, Any]] = [
    {
        "id": "demo_fac_1",
        "facility_name": "DEMO — Mandya Cold Chain Hub (Sample)",
        "location": "Industrial Estate, Mandya, Karnataka",
        "distance_km": 8.5,
        "contact_info": "Demo entry — no live booking connection",
        "source": "demonstration",
        "is_demonstration": True,
        "storage_categories": ["Chilled Produce (10–13°C)", "Multi-Commodity Cool Room"],
        "note": "Demonstration entry only. Real capacity, tariffs, and availability are not verified.",
    },
    {
        "id": "demo_fac_2",
        "facility_name": "DEMO — Cauvery WDRA Dry Godown (Sample)",
        "location": "APMC Yard, Maddur, Karnataka",
        "distance_km": 16.2,
        "contact_info": "Demo entry — no live booking connection",
        "source": "demonstration",
        "is_demonstration": True,
        "storage_categories": ["Dry Grain / Paddy / Millet Warehouse", "e-NWR Eligible Sample"],
        "note": "Demonstration entry only. Contact local APMC / WDRA directory for actual rates.",
    },
]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 1)


async def discover_cold_storage_facilities(
    *,
    latitude: float,
    longitude: float,
    manual_facilities: List[Dict[str, Any]],
    include_demo: bool = True,
) -> Dict[str, Any]:
    api_key = (os.getenv("GOOGLE_PLACES_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY") or "").strip()
    live_facilities: List[Dict[str, Any]] = []
    live_status = "not_configured"

    if api_key:
        try:
            url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
            params = {
                "query": "cold storage warehouse agriculture",
                "location": f"{latitude},{longitude}",
                "radius": 50000,
                "key": api_key,
            }
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("results", [])[:8]:
                    loc = item.get("geometry", {}).get("location", {})
                    f_lat = loc.get("lat")
                    f_lon = loc.get("lng")
                    dist = _haversine_km(latitude, longitude, float(f_lat), float(f_lon)) if f_lat and f_lon else None
                    live_facilities.append({
                        "id": item.get("place_id"),
                        "facility_name": item.get("name"),
                        "location": item.get("formatted_address"),
                        "distance_km": dist,
                        "contact_info": "Verify via Google Places / facility front desk",
                        "source": "google_places",
                        "is_demonstration": False,
                        "storage_categories": ["Commercial Storage / Cold Chain"],
                        "note": "Live directory result. Live capacity and storage rates are not provided by Places API.",
                    })
                live_status = "live" if live_facilities else "no_results"
            else:
                live_status = "unavailable"
        except Exception as exc:
            logger.warning("Google Places cold storage lookup failed: %s", exc)
            live_status = "unavailable"

    return {
        "live_discovery_status": live_status,
        "google_places_configured": bool(api_key),
        "live_facilities": live_facilities,
        "manual_facilities": [
            {**m, "source": "manual_user_record", "is_demonstration": False}
            for m in manual_facilities
        ],
        "demonstration_facilities": DEMO_FACILITIES if include_demo else [],
        "transparency_note": (
            "RaithaMitra never fabricates cold storage capacity, tariffs, or live booking availability. "
            "Demonstration facilities are clearly labelled and separated from manual and live directory results."
        ),
    }
