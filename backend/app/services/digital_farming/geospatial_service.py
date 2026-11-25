# backend/app/services/digital_farming/geospatial_service.py
"""
Isolated FastAPI service & router for Digital Farming geospatial polygon validation
and deterministic area calculation (WGS84 spherical excess).
Ready for optional registration in backend/app/api/api.py by the main integration developer.
"""

import math
from typing import List, Tuple
from fastapi import APIRouter
from pydantic import BaseModel, Field

EARTH_RADIUS_M = 6378137.0
SQ_METERS_PER_ACRE = 4046.8564224

router = APIRouter(prefix="/digital-farming", tags=["Digital Farming"])


class PolygonAreaRequest(BaseModel):
    coordinates: List[Tuple[float, float]] = Field(
        ...,
        description="List of [lon, lat] GeoJSON coordinates forming the farm boundary",
    )


class PolygonAreaResponse(BaseModel):
    valid: bool
    error: str | None = None
    point_count: int
    sq_meters: float
    acres: float
    hectares: float
    guntas: float
    cents: float


def calculate_spherical_polygon_area_sq_m(coords: List[Tuple[float, float]]) -> float:
    if len(coords) < 3:
        return 0.0
    ring = list(coords)
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    total = 0.0
    n = len(ring) - 1
    for i in range(n):
        lower = ring[i]
        middle = ring[(i + 1) % n]
        upper = ring[(i + 2) % n]
        lower_x = math.radians(lower[0])
        middle_y = math.radians(middle[1])
        upper_x = math.radians(upper[0])
        total += (upper_x - lower_x) * math.sin(middle_y)
    return abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2.0)


@router.post("/calculate-area", response_model=PolygonAreaResponse)
async def calculate_area(payload: PolygonAreaRequest) -> PolygonAreaResponse:
    pts = payload.coordinates
    if len(pts) < 3:
        return PolygonAreaResponse(
            valid=False,
            error="At least 3 distinct [lon, lat] points are required.",
            point_count=len(pts),
            sq_meters=0.0,
            acres=0.0,
            hectares=0.0,
            guntas=0.0,
            cents=0.0,
        )
    sq_m = calculate_spherical_polygon_area_sq_m(pts)
    acres = sq_m / SQ_METERS_PER_ACRE
    return PolygonAreaResponse(
        valid=True,
        point_count=len(pts),
        sq_meters=round(sq_m, 2),
        acres=round(acres, 4),
        hectares=round(sq_m / 10000.0, 4),
        guntas=round(acres * 40.0, 2),
        cents=round(acres * 100.0, 2),
    )
