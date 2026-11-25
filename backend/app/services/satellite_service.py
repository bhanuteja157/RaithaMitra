# backend/app/services/satellite_service.py
"""
P3: Satellite & Geospatial Intelligence Service.
Computes exact vegetation indices (NDVI, and NDWI/EVI when required bands are supplied),
validates Sentinel-2 credentials, supports GeoJSON boundaries, and strictly separates
demonstration observations from live satellite retrievals.
"""
import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.app.schemas.scientific import SatelliteRequest, ScientificModuleOutput


def compute_ndvi(nir: float, red: float) -> Optional[float]:
    denom = nir + red
    if denom == 0.0:
        return None
    return round((nir - red) / denom, 4)


def compute_ndwi(nir: float, swir: float) -> Optional[float]:
    denom = nir + swir
    if denom == 0.0:
        return None
    return round((nir - swir) / denom, 4)


def compute_evi(nir: float, red: float, blue: float) -> Optional[float]:
    denom = nir + 6.0 * red - 7.5 * blue + 1.0
    if denom == 0.0:
        return None
    return round(2.5 * (nir - red) / denom, 4)


class SatelliteService:
    def analyze_field(self, req: SatelliteRequest) -> ScientificModuleOutput:
        has_sentinel_creds = bool(
            os.getenv("SENTINEL_HUB_CLIENT_ID") and os.getenv("SENTINEL_HUB_CLIENT_SECRET")
        )

        # Case 1: User-supplied spectral bands (exact mathematical calculation)
        if req.nir_band is not None and req.red_band is not None:
            ndvi = compute_ndvi(req.nir_band, req.red_band)
            ndwi = compute_ndwi(req.nir_band, req.swir_band) if req.swir_band is not None else None
            evi = compute_evi(req.nir_band, req.red_band, req.blue_band) if req.blue_band is not None else None

            if ndvi is None:
                stress_zone = "Indeterminate (NIR + Red = 0)"
            elif ndvi >= 0.6:
                stress_zone = "Low Stress (Dense healthy canopy)"
            elif ndvi >= 0.35:
                stress_zone = "Moderate Vigor / Potential Early Stress Zone"
            else:
                stress_zone = "High Stress or Bare Soil / Sparse Canopy"

            return ScientificModuleOutput(
                farm_id=req.farm_id,
                module="satellite_geospatial_intelligence",
                source="User-Supplied Sentinel-2 Spectral Reflectance Bands",
                timestamp=datetime.now(timezone.utc),
                units={"ndvi": "index (-1 to +1)", "ndwi": "index (-1 to +1)", "evi": "index"},
                data_quality="user_provided",
                is_live=False,
                assumptions=[
                    "NDVI = (NIR - Red) / (NIR + Red) computed directly from user-supplied bands.",
                    "NDWI and EVI are computed ONLY when required SWIR (B11) and Blue (B2) bands are provided.",
                    "Satellite vegetation indices indicate canopy vigor/stress only and CANNOT independently diagnose crop diseases.",
                ],
                uncertainty="±0.03 index units (atmospheric/sensor calibration dependent)",
                results={
                    "coordinates": {"latitude": req.latitude, "longitude": req.longitude},
                    "boundary_provided": req.boundary_geojson is not None,
                    "sentinel_credentials_configured": has_sentinel_creds,
                    "observation_timestamp": datetime.now(timezone.utc).isoformat(),
                    "cloud_coverage_pct": None,
                    "indices": {
                        "ndvi": ndvi,
                        "ndwi": ndwi,
                        "evi": evi,
                    },
                    "stress_assessment": stress_zone,
                    "is_demonstration_data": False,
                },
                recommended_actions=[
                    "Scout any zones showing NDVI < 0.40 on the ground before applying inputs.",
                    "Use AI Crop Diagnostics or field scouting to verify cause of canopy stress.",
                ],
            )

        # Case 2: Retrieve real open Copernicus Sentinel-2 L2A COG observations when boundary/coords provided
        from datetime import timedelta
        from backend.app.features.satellite_monitoring.monitoring_service import retrieve_historical_timelapse

        coords = None
        if req.boundary_geojson and isinstance(req.boundary_geojson, dict):
            ring = req.boundary_geojson.get("coordinates", [[]])[0]
            if isinstance(ring, list) and len(ring) >= 3:
                coords = ring
        if coords is None:
            d = 0.0012
            coords = [
                [req.longitude - d, req.latitude - d],
                [req.longitude + d, req.latitude - d],
                [req.longitude + d, req.latitude + d],
                [req.longitude - d, req.latitude + d],
                [req.longitude - d, req.latitude - d],
            ]

        now = datetime.now(timezone.utc)
        tl = retrieve_historical_timelapse(
            coordinates=coords,
            start_date=(now - timedelta(days=35)).date().isoformat(),
            end_date=now.date().isoformat(),
            farm_id=req.farm_id,
            max_scenes=3,
        )
        latest = tl.get("latest_usable")
        if latest:
            indices = latest.get("indices") or {}
            ndvi_val = indices.get("ndvi_mean")
            stress_zone = (
                "Low Stress (Dense healthy canopy)"
                if (ndvi_val or 0) >= 0.6
                else ("Moderate Vigor / Early Stress Watch" if (ndvi_val or 0) >= 0.35 else "Bare Soil / Sparse Canopy / High Stress")
            )
            return ScientificModuleOutput(
                farm_id=req.farm_id,
                module="satellite_geospatial_intelligence",
                source=latest.get("provider", "Copernicus Sentinel-2 L2A COG"),
                timestamp=datetime.now(timezone.utc),
                units={"ndvi": "index (-1 to +1)", "ndwi": "index (-1 to +1)", "evi": "index", "cloud_coverage": "%"},
                data_quality="live",
                is_live=True,
                assumptions=[
                    f"Real 10m/20m Sentinel-2 L2A bands retrieved for scene {latest.get('scene_id')} on {latest.get('acquisition_date')}.",
                    f"SCL cloud/shadow mask applied; valid parcel pixels: {latest.get('valid_pixel_coverage_pct')}%.",
                ],
                uncertainty="±0.03 reflectance index units (10m Sentinel-2 L2A)",
                results={
                    "coordinates": {"latitude": req.latitude, "longitude": req.longitude},
                    "boundary_provided": req.boundary_geojson is not None,
                    "sentinel_credentials_configured": has_sentinel_creds,
                    "scene_id": latest.get("scene_id"),
                    "observation_timestamp": latest.get("acquisition_date"),
                    "cloud_coverage_pct": latest.get("parcel_cloud_cover_pct"),
                    "valid_pixel_coverage_pct": latest.get("valid_pixel_coverage_pct"),
                    "indices": {
                        "ndvi": indices.get("ndvi_mean"),
                        "ndwi": indices.get("ndmi_mean"),
                        "evi": indices.get("evi_mean"),
                    },
                    "layers": latest.get("layers"),
                    "stress_assessment": stress_zone,
                    "is_demonstration_data": False,
                },
                recommended_actions=[
                    "Inspect the Observed Satellite Data timeline for multi-date vegetation trends.",
                    "Use AI Crop Doctor or field scouting if NDVI is below crop expectations.",
                ],
            )

        return ScientificModuleOutput(
            farm_id=req.farm_id,
            module="satellite_geospatial_intelligence",
            source="Copernicus Sentinel-2 L2A (Cloudy / Unavailable Overpass)",
            timestamp=datetime.now(timezone.utc),
            units={"ndvi": "index (-1 to +1)"},
            data_quality="unavailable",
            is_live=False,
            assumptions=["No cloud-free Sentinel-2 L2A scene was available in the last 35 days."],
            uncertainty="Unavailable due to cloud cover or network",
            results={
                "coordinates": {"latitude": req.latitude, "longitude": req.longitude},
                "available": False,
                "message": tl.get("error") or tl.get("insufficient_history_note") or "No usable cloud-free Sentinel-2 scene found.",
            },
            recommended_actions=["Check back after the next 5-day Sentinel-2 overpass or widen the historical date range."],
        )


satellite_service = SatelliteService()
