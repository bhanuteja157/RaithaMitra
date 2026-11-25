"""
AD-25: Field Boundary Geometry & GeoJSON Validator.
Validates lat/lon, GeoJSON coordinate order [lon, lat], closed polygons,
self-intersecting rings, geodesic area in hectares, and spatial resolution bounds.
"""
from __future__ import annotations

import hashlib
import json
import math
from typing import Any, Dict, List, Optional, Tuple

MIN_AREA_HA = 0.05
MAX_AREA_HA = 5000.0
SENTINEL2_RELIABLE_MIN_HA = 0.25  # 25 Sentinel-2 10m pixels


def validate_coordinates(lat: float, lon: float) -> None:
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
        raise ValueError("Latitude must be in [-90, 90] and longitude in [-180, 180].")


def _segments_intersect(
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    p3: Tuple[float, float],
    p4: Tuple[float, float],
) -> bool:
    def ccw(a: Tuple[float, float], b: Tuple[float, float], c: Tuple[float, float]) -> float:
        return (c[1] - a[1]) * (b[0] - a[0]) - (b[1] - a[1]) * (c[0] - a[0])

    d1 = ccw(p3, p4, p1)
    d2 = ccw(p3, p4, p2)
    d3 = ccw(p1, p2, p3)
    d4 = ccw(p1, p2, p4)
    return ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and (
        (d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)
    )


def _ring_has_self_intersection(ring: List[Tuple[float, float]]) -> bool:
    n = len(ring) - 1  # closed ring: last == first
    if n < 4:
        return False
    for i in range(n):
        a1, a2 = ring[i], ring[i + 1]
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue  # adjacent closing edge
            b1, b2 = ring[j], ring[j + 1]
            if _segments_intersect(a1, a2, b1, b2):
                return True
    return False


def _geodesic_ring_area_ha(ring: List[Tuple[float, float]]) -> float:
    """Compute approximate spherical polygon area in hectares from [lon, lat] degrees."""
    if len(ring) < 4:
        return 0.0
    r_earth = 6378137.0
    total = 0.0
    for i in range(len(ring) - 1):
        lon1, lat1 = math.radians(ring[i][0]), math.radians(ring[i][1])
        lon2, lat2 = math.radians(ring[i + 1][0]), math.radians(ring[i + 1][1])
        total += (lon2 - lon1) * (2.0 + math.sin(lat1) + math.sin(lat2))
    area_m2 = abs(total * r_earth * r_earth / 2.0)
    return round(area_m2 / 10000.0, 4)


def build_default_polygon_for_farm(lat: float, lon: float, area_ha: float = 1.0) -> Dict[str, Any]:
    """Build a square GeoJSON Polygon centered at (lat, lon) matching area_ha."""
    validate_coordinates(lat, lon)
    safe_area = max(MIN_AREA_HA, min(MAX_AREA_HA, float(area_ha or 1.0)))
    side_m = math.sqrt(safe_area * 10000.0)
    half_lat = (side_m / 2.0) / 111320.0
    cos_lat = max(0.1, math.cos(math.radians(lat)))
    half_lon = (side_m / 2.0) / (111320.0 * cos_lat)
    coords = [
        [round(lon - half_lon, 6), round(lat - half_lat, 6)],
        [round(lon + half_lon, 6), round(lat - half_lat, 6)],
        [round(lon + half_lon, 6), round(lat + half_lat, 6)],
        [round(lon - half_lon, 6), round(lat + half_lat, 6)],
        [round(lon - half_lon, 6), round(lat - half_lat, 6)],
    ]
    return {"type": "Polygon", "coordinates": [coords]}


def validate_and_analyze_geometry(
    *,
    latitude: float,
    longitude: float,
    boundary_geojson: Optional[Dict[str, Any]] = None,
    area_ha_hint: float = 1.0,
) -> Dict[str, Any]:
    validate_coordinates(latitude, longitude)

    if boundary_geojson is None:
        polygon = build_default_polygon_for_farm(latitude, longitude, area_ha_hint)
        is_user_polygon = False
    else:
        geom = boundary_geojson.get("geometry", boundary_geojson) if isinstance(boundary_geojson, dict) else None
        if not isinstance(geom, dict) or geom.get("type") != "Polygon":
            raise ValueError("GeoJSON boundary must be a valid Polygon or Feature with Polygon geometry.")
        rings = geom.get("coordinates")
        if not isinstance(rings, list) or not rings or not isinstance(rings[0], list):
            raise ValueError("GeoJSON Polygon must contain a non-empty coordinate ring.")
        outer = rings[0]
        if len(outer) < 4:
            raise ValueError("GeoJSON Polygon ring must have at least 4 coordinates (closed ring).")

        pts: List[Tuple[float, float]] = []
        for pt in outer:
            if not isinstance(pt, (list, tuple)) or len(pt) < 2:
                raise ValueError("Each GeoJSON coordinate must be [longitude, latitude].")
            lon_v, lat_v = float(pt[0]), float(pt[1])
            validate_coordinates(lat_v, lon_v)
            pts.append((lon_v, lat_v))

        if pts[0] != pts[-1]:
            raise ValueError("GeoJSON Polygon ring must be closed (first coordinate must equal last coordinate).")
        if _ring_has_self_intersection(pts):
            raise ValueError("GeoJSON Polygon has self-intersecting edges.")
        polygon = {"type": "Polygon", "coordinates": [[[p[0], p[1]] for p in pts]]}
        is_user_polygon = True

    ring_pts = [(float(p[0]), float(p[1])) for p in polygon["coordinates"][0]]
    area_ha = _geodesic_ring_area_ha(ring_pts)
    if area_ha < MIN_AREA_HA:
        raise ValueError(f"Field area ({area_ha} ha) is below minimum valid area ({MIN_AREA_HA} ha).")
    if area_ha > MAX_AREA_HA:
        raise ValueError(f"Field area ({area_ha} ha) exceeds maximum request limit ({MAX_AREA_HA} ha).")

    lons = [p[0] for p in ring_pts[:-1]]
    lats = [p[1] for p in ring_pts[:-1]]
    centroid_lon = round(sum(lons) / len(lons), 6)
    centroid_lat = round(sum(lats) / len(lats), 6)
    bbox = [min(lons), min(lats), max(lons), max(lats)]

    poly_hash = hashlib.sha256(json.dumps(polygon, sort_keys=True).encode("utf-8")).hexdigest()[:16]
    resolution_warning = None
    if area_ha < SENTINEL2_RELIABLE_MIN_HA:
        resolution_warning = (
            f"Field area ({area_ha} ha) is small relative to Sentinel-2 10m–20m spatial resolution; "
            "edge pixels may mix adjacent land cover. Do not use for individual plant monitoring."
        )

    return {
        "polygon": polygon,
        "is_user_polygon": is_user_polygon,
        "area_ha": area_ha,
        "centroid": {"latitude": centroid_lat, "longitude": centroid_lon},
        "bbox": bbox,
        "polygon_hash": poly_hash,
        "resolution_warning": resolution_warning,
    }
