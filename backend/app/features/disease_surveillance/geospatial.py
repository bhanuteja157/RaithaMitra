"""
Geospatial Computation Utilities for AD-40C Disease Surveillance.

Provides:
- Exact spherical Haversine distance in kilometers.
- Initial geographic bearing & downwind vector alignment (using Open-Meteo wind_direction_10m
  convention where degrees represent direction wind blows FROM).
- Privacy-safe spatial heatmap grid aggregation.
"""
import math
from typing import Any, Dict, List


EARTH_RADIUS_KM = 6371.0088


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle Haversine distance in km between two WGS84 points."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(d_lam / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return round(EARTH_RADIUS_KM * c, 3)


def bearing_degrees(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes initial forward compass bearing (0-360 deg) from point 1 to point 2."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_lam = math.radians(lon2 - lon1)

    y = math.sin(d_lam) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lam)
    theta = math.degrees(math.atan2(y, x))
    return (theta + 360.0) % 360.0


def downwind_alignment_factor(
    source_lat: float,
    source_lon: float,
    target_lat: float,
    target_lon: float,
    wind_from_deg: float,
    wind_speed_kmh: float,
) -> float:
    """
    Calculates directional exposure score (0.0 to 1.0) indicating whether `target` lies
    downwind from `source`.
    Note: Meteorological wind_direction is where wind blows FROM; downwind plume travels toward
    (wind_from_deg + 180) % 360.
    """
    if wind_speed_kmh < 2.0:
        return 0.25  # calm conditions have weak directional transport
    if abs(source_lat - target_lat) < 1e-6 and abs(source_lon - target_lon) < 1e-6:
        return 0.5

    plume_dir = (wind_from_deg + 180.0) % 360.0
    source_to_target = bearing_degrees(source_lat, source_lon, target_lat, target_lon)
    diff = abs(((plume_dir - source_to_target + 180.0) % 360.0) - 180.0)
    # cos(diff) mapped cleanly: 0 deg diff -> 1.0, 90 deg -> 0.4, 180 deg -> 0.1
    cosine = math.cos(math.radians(diff))
    directional = max(0.1, 0.45 + 0.55 * cosine)
    speed_boost = min(1.0, 0.55 + (wind_speed_kmh / 35.0) * 0.45)
    return round(min(1.0, directional * speed_boost), 3)


def build_heatmap_cells(reports: List[Dict[str, Any]], cell_size_deg: float = 0.03) -> List[Dict[str, Any]]:
    """
    Aggregates anonymized observation reports into regional spatial density buckets.
    """
    buckets: Dict[tuple, Dict[str, Any]] = {}
    for r in reports:
        lat = float(r["latitude"])
        lon = float(r["longitude"])
        key = (round(lat / cell_size_deg) * cell_size_deg, round(lon / cell_size_deg) * cell_size_deg)
        if key not in buckets:
            buckets[key] = {
                "latitude": round(key[0], 4),
                "longitude": round(key[1], 4),
                "report_count": 0,
                "confirmed_count": 0,
                "crops": set(),
                "diseases": set(),
                "district": r.get("district") or "Region",
            }
        b = buckets[key]
        b["report_count"] += 1
        if r.get("verification_status") == "expert_confirmed":
            b["confirmed_count"] += 1
        b["crops"].add(r["crop"])
        b["diseases"].add(r["disease_name"])

    max_count = max((b["report_count"] for b in buckets.values()), default=1)
    cells: List[Dict[str, Any]] = []
    for b in buckets.values():
        intensity = round(min(1.0, 0.28 + 0.72 * (b["report_count"] / max_count)), 3)
        cells.append(
            {
                "latitude": b["latitude"],
                "longitude": b["longitude"],
                "intensity": intensity,
                "report_count": b["report_count"],
                "confirmed_count": b["confirmed_count"],
                "crops": sorted(b["crops"]),
                "diseases": sorted(b["diseases"]),
                "district": b["district"],
            }
        )
    return sorted(cells, key=lambda c: c["report_count"], reverse=True)
