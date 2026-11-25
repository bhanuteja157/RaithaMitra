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

        # Case 2: No live Sentinel-2 credentials configured
        if not has_sentinel_creds:
            if not req.use_demo_observation:
                return ScientificModuleOutput(
                    farm_id=req.farm_id,
                    module="satellite_geospatial_intelligence",
                    source="Sentinel-2 L2A Provider (Credentials Not Configured)",
                    timestamp=datetime.now(timezone.utc),
                    units={"ndvi": "index (-1 to +1)"},
                    data_quality="unavailable",
                    is_live=False,
                    assumptions=[
                        "Live Sentinel-2 API requires SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET.",
                        "No live satellite observations were fabricated.",
                    ],
                    uncertainty="Unavailable",
                    results={
                        "coordinates": {"latitude": req.latitude, "longitude": req.longitude},
                        "sentinel_credentials_configured": False,
                        "available": False,
                        "message": "Sentinel-2 API credentials are not configured. Supply spectral bands manually or enable Demonstration Mode.",
                    },
                    recommended_actions=[
                        "Configure SENTINEL_HUB_CLIENT_ID / SENTINEL_HUB_CLIENT_SECRET or enter NIR/Red band reflectance manually.",
                    ],
                )

            # Clearly labelled Demonstration Observation (derived from documented sample bands: NIR=0.44, Red=0.08, SWIR=0.22, Blue=0.05)
            demo_nir, demo_red, demo_swir, demo_blue = 0.44, 0.08, 0.22, 0.05
            return ScientificModuleOutput(
                farm_id=req.farm_id,
                module="satellite_geospatial_intelligence",
                source="DEMONSTRATION DATA — Sentinel-2 Sample Spectral Profile (Not Live Retrieval)",
                timestamp=datetime.now(timezone.utc),
                units={"ndvi": "index (-1 to +1)", "ndwi": "index (-1 to +1)", "evi": "index", "cloud_coverage": "%"},
                data_quality="demonstration",
                is_live=False,
                assumptions=[
                    "DEMONSTRATION DATA ONLY: Live Sentinel-2 credentials (SENTINEL_HUB_CLIENT_ID / SECRET) are not configured.",
                    "Indices are computed from sample reflectance values (NIR=0.44, Red=0.08, SWIR=0.22, Blue=0.05).",
                    "Satellite imagery monitors vegetation vigor and moisture stress; it does NOT independently diagnose crop diseases.",
                ],
                uncertainty="Demonstration sample (not a live measurement)",
                results={
                    "coordinates": {"latitude": req.latitude, "longitude": req.longitude},
                    "boundary_provided": req.boundary_geojson is not None,
                    "sentinel_credentials_configured": False,
                    "is_demonstration_data": True,
                    "observation_timestamp": "2026-11-22T05:18:00Z",
                    "cloud_coverage_pct": 8.4,
                    "sample_bands": {"nir_b8": demo_nir, "red_b4": demo_red, "swir_b11": demo_swir, "blue_b2": demo_blue},
                    "indices": {
                        "ndvi": compute_ndvi(demo_nir, demo_red),
                        "ndwi": compute_ndwi(demo_nir, demo_swir),
                        "evi": compute_evi(demo_nir, demo_red, demo_blue),
                    },
                    "stress_assessment": "Demo Sample: Healthy canopy with minor eastern-edge moisture variation",
                },
                recommended_actions=[
                    "Connect Sentinel Hub credentials in backend .env for live field imagery.",
                    "Perform ground scouting to verify any localized canopy stress.",
                ],
            )

        # Case 3: Credentials present — live Sentinel Hub Statistical API integration
        return ScientificModuleOutput(
            farm_id=req.farm_id,
            module="satellite_geospatial_intelligence",
            source="Sentinel Hub Configured (Use async endpoint for live stats)",
            timestamp=datetime.now(timezone.utc),
            units={"ndvi": "index (-1 to +1)"},
            data_quality="unavailable",
            is_live=False,
            assumptions=["Use /api/v1/satellite/observations or /api/v1/scientific/satellite/analyze for live retrieval."],
            uncertainty="Pending live tile retrieval",
            results={"coordinates": {"latitude": req.latitude, "longitude": req.longitude}, "sentinel_credentials_configured": True},
            recommended_actions=["Call /api/v1/satellite/observations for live Sentinel-2 L2A field statistics."],
        )

    async def analyze_field_async(self, req: SatelliteRequest) -> ScientificModuleOutput:
        """Async wrapper supporting live Sentinel Hub + Earth Search STAC retrieval."""
        if (req.nir_band is not None and req.red_band is not None) or not (
            os.getenv("SENTINEL_HUB_CLIENT_ID") and os.getenv("SENTINEL_HUB_CLIENT_SECRET")
        ):
            return self.analyze_field(req)

        from backend.app.features.satellite.service import satellite_intelligence_service

        live = await satellite_intelligence_service.analyze_observation(
            farm_id=req.farm_id,
            latitude=req.latitude,
            longitude=req.longitude,
            boundary_geojson=req.boundary_geojson,
            nir_band=req.nir_band,
            red_band=req.red_band,
            swir_band=req.swir_band,
            blue_band=req.blue_band,
            green_band=getattr(req, "green_band", None),
            red_edge_band=getattr(req, "red_edge_band", None),
            use_demo_observation=req.use_demo_observation,
        )
        return ScientificModuleOutput(
            farm_id=req.farm_id,
            module="satellite_geospatial_intelligence",
            source=live.get("provider", "Sentinel Hub"),
            timestamp=datetime.now(timezone.utc),
            units={"ndvi": "index (-1 to +1)", "ndmi": "index (-1 to +1)", "ndwi": "index (-1 to +1)", "evi": "index", "savi": "index", "ndre": "index"},
            data_quality="live" if live.get("is_live") else "unavailable",
            is_live=bool(live.get("is_live")),
            assumptions=[live.get("provider_note", "")],
            uncertainty="Cloud-masked Sentinel-2 L2A field statistics" if live.get("band_statistics_available") else "Metadata only",
            results=live,
            recommended_actions=[
                live.get("agronomic_fusion", {}).get("irrigation_guidance", "Monitor field conditions.")
            ],
        )


satellite_service = SatelliteService()
