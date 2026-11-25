"""Orchestration service for AD-25 Satellite & Geospatial Agricultural Intelligence."""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.engines.biophysical import calculate_crop_water_demand, estimate_root_zone_moisture
from backend.app.engines.decision_engine import decision_engine
from backend.app.features.assistant.security import verify_authorized_farm
from backend.app.features.satellite.geometry import validate_and_analyze_geometry
from backend.app.features.satellite.providers import (
    fetch_sentinel_hub_statistics,
    search_earth_search_stac,
    sentinel_hub_configured,
)
from backend.app.features.satellite.spectral_indices import (
    compute_all_indices_from_bands,
    summarize_pixel_distribution,
)
from backend.app.schemas.farm import Farm
from backend.app.services.weather_service import weather_service

logger = logging.getLogger(__name__)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_farm_model(farm_row: Optional[Dict[str, Any]], lat: float, lon: float, area_ha: float) -> Farm:
    if farm_row:
        try:
            return Farm(
                id=str(farm_row.get("id", "frm_sat")),
                farmer_name=str(farm_row.get("farmer_name") or "Farmer"),
                preferred_language=farm_row.get("preferred_language") or "en",
                farm_name=str(farm_row.get("farm_name") or "Selected Field"),
                village=str(farm_row.get("village") or "Mandya"),
                district=str(farm_row.get("district") or "Mandya"),
                state=str(farm_row.get("state") or "Karnataka"),
                latitude=float(farm_row.get("latitude") or lat),
                longitude=float(farm_row.get("longitude") or lon),
                land_area_ha=max(0.05, float(farm_row.get("land_area_ha") or area_ha or 1.0)),
                primary_crop=str(farm_row.get("primary_crop") or "Paddy"),
                crop_variety=farm_row.get("crop_variety"),
                sowing_date=farm_row.get("sowing_date") or datetime.now(timezone.utc).date().isoformat(),
                crop_stage=farm_row.get("crop_stage") or "Mid-Season",
                soil_type=str(farm_row.get("soil_type") or "Loamy"),
                irrigation_method=farm_row.get("irrigation_method") or "Drip Irrigation",
                water_source=farm_row.get("water_source") or "Borewell",
                available_water_m3=float(farm_row.get("available_water_m3") or 10000.0),
                cultivation_budget_inr=float(farm_row.get("cultivation_budget_inr") or 50000.0),
                created_at=farm_row.get("created_at") or _utc_now_iso(),
                updated_at=farm_row.get("updated_at") or _utc_now_iso(),
            )
        except Exception as exc:
            logger.debug("Fallback Farm construction after row parse issue: %s", exc)
    return Farm(
        id="frm_sat_context",
        farmer_name="Farmer",
        preferred_language="en",
        farm_name="Field Analysis",
        village="Mandya",
        district="Mandya",
        state="Karnataka",
        latitude=lat,
        longitude=lon,
        land_area_ha=max(0.05, area_ha or 1.0),
        primary_crop="Paddy",
        sowing_date=datetime.now(timezone.utc).date().isoformat(),
        crop_stage="Mid-Season",
        soil_type="Loamy",
        irrigation_method="Drip Irrigation",
        water_source="Borewell",
        available_water_m3=10000.0,
        cultivation_budget_inr=50000.0,
        created_at=_utc_now_iso(),
        updated_at=_utc_now_iso(),
    )


def _interpret_indices(
    indices: Dict[str, Optional[float]],
    weather: Any,
    farm_model: Farm,
    decision_summary: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    ndvi = indices.get("ndvi")
    ndmi = indices.get("ndmi")
    ndwi = indices.get("ndwi")
    evi = indices.get("evi")
    savi = indices.get("savi")
    ndre = indices.get("ndre")

    et0 = float(weather.current.et0_fao56_mm) if weather and weather.current else 4.5
    rain_now = float(weather.current.precipitation_mm) if weather and weather.current else 0.0
    rain_48h = 0.0
    if weather and getattr(weather, "daily_forecast", None):
        rain_48h = sum(float(d.precipitation_sum_mm) for d in weather.daily_forecast[:2])

    water_demand = calculate_crop_water_demand(farm_model.primary_crop, farm_model.crop_stage, et0)
    soil_moisture_est = estimate_root_zone_moisture(farm_model.soil_type, rain_now, water_demand)

    if ndvi is None:
        return {
            "indices_available": False,
            "canopy_status": "Awaiting Spectral Reflectance",
            "canopy_health_summary": (
                "Live satellite scene metadata is loaded. Connect Sentinel Hub credentials or enter "
                "field band reflectance values to compute NDVI, NDMI, NDWI, EVI, SAVI, and NDRE."
            ),
            "moisture_status": "Weather-only estimate",
            "irrigation_guidance": (
                f"FAO-56 crop water demand is {water_demand:.2f} mm/day with {rain_48h:.1f} mm rain forecast over 48h."
            ),
            "weather_fusion": {
                "et0_mm_day": round(et0, 2),
                "crop_water_demand_mm_day": round(water_demand, 2),
                "estimated_root_zone_moisture_pct": round(soil_moisture_est, 1),
                "rain_48h_mm": round(rain_48h, 1),
                "temperature_c": round(float(weather.current.temperature_c), 1) if weather and weather.current else None,
            },
            "crop_doctor_hint": None,
            "decision_engine_summary": decision_summary,
        }

    # Canopy classification
    if ndvi >= 0.65:
        canopy_status = "Dense Vigorous Canopy"
        canopy_summary = f"NDVI {ndvi:.3f} indicates strong chlorophyll density and active vegetative cover."
    elif ndvi >= 0.45:
        canopy_status = "Moderate Healthy Canopy"
        canopy_summary = f"NDVI {ndvi:.3f} indicates moderate canopy development with room for vigor optimization."
    elif ndvi >= 0.25:
        canopy_status = "Sparse or Early-Stage Canopy"
        canopy_summary = f"NDVI {ndvi:.3f} reflects sparse foliage, early establishment, or localized canopy stress."
    else:
        canopy_status = "Bare Soil / Severe Canopy Stress"
        canopy_summary = f"NDVI {ndvi:.3f} is very low, consistent with bare soil, post-harvest field, or severe stress."

    # Moisture stress fusion (NDMI + Weather)
    moisture_idx = ndmi if ndmi is not None else ndwi
    if moisture_idx is not None and moisture_idx < 0.0:
        if rain_48h >= 12.0:
            moisture_status = "Moisture Deficit (Rain Expected)"
            irrigation_guidance = (
                f"NDMI ({moisture_idx:.3f}) shows low canopy water content, but {rain_48h:.1f} mm rain is forecast "
                f"in 48h. Delay heavy irrigation and monitor soil drainage."
            )
        else:
            moisture_status = "Water Stress Detected"
            irrigation_guidance = (
                f"NDMI ({moisture_idx:.3f}) and ET0 ({et0:.2f} mm/day) indicate canopy water deficit with only "
                f"{rain_48h:.1f} mm rain expected. Schedule supplemental irrigation ({water_demand:.2f} mm/day demand)."
            )
    elif moisture_idx is not None and moisture_idx >= 0.20:
        moisture_status = "Adequate Canopy Hydration"
        irrigation_guidance = (
            f"NDMI ({moisture_idx:.3f}) indicates healthy tissue water content. Maintain normal {farm_model.irrigation_method} schedule."
        )
    else:
        moisture_status = "Moderate Canopy Hydration"
        irrigation_guidance = (
            f"Moderate moisture index; align irrigation with FAO-56 demand ({water_demand:.2f} mm/day) and "
            f"{rain_48h:.1f} mm 48h rainfall forecast."
        )

    # Non-diagnostic Crop Doctor hint if canopy or chlorophyll stress is visible
    crop_doctor_hint = None
    if ndvi < 0.40 or (ndre is not None and ndre < 0.25):
        crop_doctor_hint = {
            "recommended": True,
            "reason": (
                "Low satellite canopy vigor or chlorophyll edge reflectance detected. Satellite imagery alone "
                "cannot diagnose plant diseases, nutrient deficiencies, or pests."
            ),
            "action_label": "Inspect Leaves in Crop Doctor",
            "route": "/crop-doctor",
        }

    return {
        "indices_available": True,
        "canopy_status": canopy_status,
        "canopy_health_summary": canopy_summary,
        "moisture_status": moisture_status,
        "irrigation_guidance": irrigation_guidance,
        "index_notes": {
            "evi": f"{evi:.3f}" if evi is not None else None,
            "savi": f"{savi:.3f}" if savi is not None else None,
            "ndre": f"{ndre:.3f}" if ndre is not None else None,
        },
        "weather_fusion": {
            "et0_mm_day": round(et0, 2),
            "crop_water_demand_mm_day": round(water_demand, 2),
            "estimated_root_zone_moisture_pct": round(soil_moisture_est, 1),
            "rain_48h_mm": round(rain_48h, 1),
            "temperature_c": round(float(weather.current.temperature_c), 1) if weather and weather.current else None,
        },
        "crop_doctor_hint": crop_doctor_hint,
        "decision_engine_summary": decision_summary,
    }


def _cache_observation(
    *,
    farm_id: Optional[str],
    user_id: Optional[str],
    polygon_hash: str,
    provider: str,
    source_mode: str,
    acquisition_date: str,
    cloud_cover_pct: Optional[float],
    scene_id: Optional[str],
    thumbnail_url: Optional[str],
    area_ha: float,
    indices: Dict[str, Optional[float]],
    bands: Dict[str, Optional[float]],
    raw_meta: Dict[str, Any],
) -> None:
    if source_mode == "demo_observation" or not farm_id:
        return

    resolved_uid = user_id or "usr_farmer"
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    expires_iso = (now_dt + timedelta(days=30)).isoformat()
    payload_json = json.dumps({
        "indices": indices,
        "bands": bands,
        "area_ha": area_ha,
        "source_mode": source_mode,
        "meta": raw_meta,
    })

    conn = get_db_connection()
    try:
        existing = conn.execute(
            """
            SELECT id FROM satellite_observations_cache
            WHERE farm_id = ?
              AND polygon_hash = ?
              AND acquisition_timestamp = ?
              AND provider = ?
            LIMIT 1
            """,
            (farm_id, polygon_hash, acquisition_date, provider),
        ).fetchone()
        obs_id = existing["id"] if existing else f"sat_{uuid.uuid4().hex[:10]}"
        if existing:
            conn.execute(
                """
                UPDATE satellite_observations_cache
                SET user_id = ?, product_id = ?, processing_timestamp = ?,
                    cloud_coverage_pct = ?, indices_json = ?, source_reference = ?,
                    data_quality = ?, thumbnail_url = ?, expires_at = ?
                WHERE id = ?
                """,
                (
                    resolved_uid,
                    scene_id,
                    now_iso,
                    cloud_cover_pct,
                    payload_json,
                    source_mode,
                    "live" if "live" in source_mode or "stac" in source_mode else "manual",
                    thumbnail_url,
                    expires_iso,
                    obs_id,
                ),
            )
        else:
            conn.execute(
                """
                INSERT INTO satellite_observations_cache (
                    id, farm_id, user_id, provider, product_id, acquisition_timestamp,
                    processing_timestamp, cloud_coverage_pct, valid_pixel_coverage_pct,
                    indices_json, polygon_hash, source_reference, data_quality,
                    thumbnail_url, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    obs_id,
                    farm_id,
                    resolved_uid,
                    provider,
                    scene_id,
                    acquisition_date,
                    now_iso,
                    cloud_cover_pct,
                    raw_meta.get("valid_pixel_coverage_pct"),
                    payload_json,
                    polygon_hash,
                    source_mode,
                    "live" if "live" in source_mode or "stac" in source_mode else "manual",
                    thumbnail_url,
                    expires_iso,
                ),
            )
        conn.commit()
    finally:
        conn.close()


def _normalize_cached_row(r: Dict[str, Any]) -> Dict[str, Any]:
    parsed = {}
    try:
        parsed = json.loads(r.get("indices_json") or "{}")
    except Exception:
        parsed = {}
    indices = parsed.get("indices") or {}
    return {
        "id": r["id"],
        "farm_id": r["farm_id"],
        "polygon_hash": r["polygon_hash"],
        "provider": r["provider"],
        "source_mode": parsed.get("source_mode") or r.get("source_reference") or "cached_observation",
        "acquisition_date": r["acquisition_timestamp"],
        "cloud_cover_pct": r.get("cloud_coverage_pct"),
        "scene_id": r.get("product_id"),
        "thumbnail_url": r.get("thumbnail_url"),
        "area_ha": parsed.get("area_ha"),
        "ndvi": indices.get("ndvi"),
        "ndmi": indices.get("ndmi"),
        "ndwi": indices.get("ndwi"),
        "evi": indices.get("evi"),
        "savi": indices.get("savi"),
        "ndre": indices.get("ndre"),
        "bands": parsed.get("bands") or {},
        "cached_at": r.get("processing_timestamp"),
    }


def _read_cached_observations(
    *,
    farm_id: Optional[str],
    polygon_hash: Optional[str] = None,
    limit: int = 24,
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        if farm_id and polygon_hash:
            rows = conn.execute(
                """
                SELECT * FROM satellite_observations_cache
                WHERE farm_id = ? AND polygon_hash = ?
                ORDER BY acquisition_timestamp DESC, processing_timestamp DESC
                LIMIT ?
                """,
                (farm_id, polygon_hash, limit),
            ).fetchall()
        elif farm_id:
            rows = conn.execute(
                """
                SELECT * FROM satellite_observations_cache
                WHERE farm_id = ?
                ORDER BY acquisition_timestamp DESC, processing_timestamp DESC
                LIMIT ?
                """,
                (farm_id, limit),
            ).fetchall()
        elif polygon_hash:
            rows = conn.execute(
                """
                SELECT * FROM satellite_observations_cache
                WHERE polygon_hash = ?
                ORDER BY acquisition_timestamp DESC, processing_timestamp DESC
                LIMIT ?
                """,
                (polygon_hash, limit),
            ).fetchall()
        else:
            rows = []
        return [_normalize_cached_row(dict(r)) for r in rows]
    finally:
        conn.close()


def _compute_change_detection(chronological_obs: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    with_ndvi = [o for o in chronological_obs if o.get("ndvi") is not None]
    if len(with_ndvi) < 2:
        return None
    prev_obs = with_ndvi[-2]
    curr_obs = with_ndvi[-1]

    def _delta(key: str) -> Optional[Dict[str, Any]]:
        a = prev_obs.get(key)
        b = curr_obs.get(key)
        if a is None or b is None:
            return None
        diff = round(float(b) - float(a), 4)
        pct = round((diff / abs(float(a))) * 100.0, 2) if abs(float(a)) > 1e-6 else None
        direction = "stable" if abs(diff) < 0.02 else ("increasing" if diff > 0 else "decreasing")
        return {"previous": float(a), "current": float(b), "abs_change": diff, "pct_change": pct, "direction": direction}

    ndvi_delta = _delta("ndvi")
    ndmi_delta = _delta("ndmi")

    notes = []
    if ndvi_delta:
        if ndvi_delta["direction"] == "increasing":
            notes.append(f"Canopy greenness increased by {ndvi_delta['abs_change']:+.3f} NDVI since {prev_obs['acquisition_date'][:10]}.")
        elif ndvi_delta["direction"] == "decreasing":
            notes.append(f"Canopy greenness decreased by {ndvi_delta['abs_change']:+.3f} NDVI since {prev_obs['acquisition_date'][:10]}. Check moisture or field stress.")
        else:
            notes.append(f"Canopy greenness remained stable ({ndvi_delta['abs_change']:+.3f} NDVI) since {prev_obs['acquisition_date'][:10]}.")
    if ndmi_delta:
        notes.append(f"Canopy moisture index (NDMI) shifted by {ndmi_delta['abs_change']:+.3f} ({ndmi_delta['direction']}).")

    return {
        "previous_date": prev_obs["acquisition_date"],
        "current_date": curr_obs["acquisition_date"],
        "ndvi": ndvi_delta,
        "ndmi": ndmi_delta,
        "summary": " ".join(notes),
    }


class SatelliteIntelligenceService:
    """Service layer for AD-25 live satellite & geospatial intelligence."""

    def get_provider_status(self) -> Dict[str, Any]:
        sh_ready = sentinel_hub_configured()
        return {
            "providers": [
                {
                    "id": "earth_search_stac",
                    "name": "Element84 Earth Search STAC (Sentinel-2 L2A)",
                    "configured": True,
                    "live_capabilities": ["scene_discovery", "acquisition_timestamps", "cloud_cover", "true_color_thumbnails", "cog_asset_links"],
                    "note": "Public STAC catalog providing genuine Sentinel-2 L2A scene metadata and thumbnails.",
                },
                {
                    "id": "sentinel_hub",
                    "name": "Sentinel Hub Statistical API",
                    "configured": sh_ready,
                    "live_capabilities": ["cloud_masked_band_statistics", "ndvi_ndmi_ndwi_evi_savi_ndre", "pixel_distribution"] if sh_ready else [],
                    "note": (
                        "Configured and active for cloud-masked multi-band field statistics."
                        if sh_ready
                        else "Credentials (SENTINEL_HUB_CLIENT_ID / SENTINEL_HUB_CLIENT_SECRET) not configured."
                    ),
                },
            ],
            "sentinel_hub_configured": sh_ready,
            "stac_discovery_enabled": True,
            "timestamp": _utc_now_iso(),
        }

    async def analyze_observation(
        self,
        *,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
        farm_id: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        boundary_geojson: Optional[Dict[str, Any]] = None,
        nir_band: Optional[float] = None,
        red_band: Optional[float] = None,
        swir_band: Optional[float] = None,
        blue_band: Optional[float] = None,
        green_band: Optional[float] = None,
        red_edge_band: Optional[float] = None,
        use_demo_observation: bool = False,
        offline_only: bool = False,
        max_cloud_pct: float = 35.0,
        lookback_days: int = 45,
    ) -> Dict[str, Any]:
        farm_row: Optional[Dict[str, Any]] = None
        if farm_id:
            if role and role not in ("farmer", "admin"):
                raise HTTPException(
                    status_code=403,
                    detail="Unauthorized: You cannot access another farmer's farm satellite records.",
                )
            conn = get_db_connection()
            try:
                if user_id and role:
                    farm_row = verify_authorized_farm(conn.cursor(), farm_id, user_id, role)
                else:
                    row = conn.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
                    farm_row = dict(row) if row else None
                if not farm_row:
                    raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found.")
            finally:
                conn.close()

        resolved_lat = float(latitude if latitude is not None else (farm_row["latitude"] if farm_row else 12.5218))
        resolved_lon = float(longitude if longitude is not None else (farm_row["longitude"] if farm_row else 76.8951))
        area_hint = float(farm_row["land_area_ha"]) if farm_row and farm_row.get("land_area_ha") else 1.0

        geom = validate_and_analyze_geometry(
            latitude=resolved_lat,
            longitude=resolved_lon,
            boundary_geojson=boundary_geojson,
            area_ha_hint=area_hint,
        )

        centroid_lat = geom["centroid"]["latitude"]
        centroid_lon = geom["centroid"]["longitude"]
        farm_model = _build_farm_model(farm_row, centroid_lat, centroid_lon, geom["area_ha"])

        # Weather & Decision Engine fusion
        weather = None
        decision_summary = None
        try:
            weather = await weather_service.get_weather(centroid_lat, centroid_lon)
            dec_resp = decision_engine.evaluate_farm(farm_model, weather)
            decision_summary = {
                "overall_risk": dec_resp.overall_risk_level,
                "top_recommendation": dec_resp.recommendations[0].title if dec_resp.recommendations else None,
                "recommendation_count": len(dec_resp.recommendations),
            }
        except Exception as exc:
            logger.warning("Weather/decision engine fusion skipped in satellite analysis: %s", exc)

        # Manual bands supplied?
        manual_bands: Dict[str, Optional[float]] = {
            "nir": nir_band,
            "red": red_band,
            "swir": swir_band,
            "blue": blue_band,
            "green": green_band,
            "red_edge": red_edge_band,
        }
        has_manual_bands = nir_band is not None and red_band is not None

        if use_demo_observation:
            demo_bands = {
                "nir": 0.44,
                "red": 0.08,
                "swir": 0.22,
                "blue": 0.05,
                "green": 0.11,
                "red_edge": 0.24,
            }
            indices = compute_all_indices_from_bands(demo_bands)
            agronomic = _interpret_indices(indices, weather, farm_model, decision_summary)
            return {
                "status": "demo_mode",
                "source_mode": "demo_observation",
                "is_live": False,
                "is_demo": True,
                "cache_fallback": False,
                "provider": "Synthetic Demonstration Reflectance",
                "provider_note": "Demonstration mode active. Values are synthetic samples for testing and are NOT saved to field history.",
                "farm_id": farm_id,
                "farm_name": farm_model.farm_name,
                "geometry": geom,
                "acquisition_date": _utc_now_iso(),
                "cloud_cover_pct": None,
                "scene_id": "DEMO-S2-SAMPLE",
                "thumbnail_url": None,
                "band_statistics_available": True,
                "bands": demo_bands,
                "indices": indices,
                "distribution": summarize_pixel_distribution([indices["ndvi"] or 0.69]),
                "scenes": [],
                "agronomic_fusion": agronomic,
            }

        end_dt = datetime.now(timezone.utc)
        start_dt = end_dt - timedelta(days=max(7, lookback_days))
        start_iso = start_dt.strftime("%Y-%m-%dT00:00:00Z")
        end_iso = end_dt.strftime("%Y-%m-%dT23:59:59Z")

        sh_stats: Optional[List[Dict[str, Any]]] = None
        stac_scenes: List[Dict[str, Any]] = []
        provider_errors: List[str] = []

        if not offline_only:
            if sentinel_hub_configured():
                try:
                    sh_stats = await fetch_sentinel_hub_statistics(geom["polygon"], start_iso, end_iso)
                except Exception as exc:
                    provider_errors.append(f"Sentinel Hub error: {exc}")
                    logger.warning("Sentinel Hub fetch failed: %s", exc)

            try:
                stac_scenes = await search_earth_search_stac(
                    geom["polygon"],
                    start_iso,
                    end_iso,
                    max_cloud_pct=max_cloud_pct,
                    limit=8,
                )
            except Exception as exc:
                provider_errors.append(f"Earth Search STAC error: {exc}")
                logger.warning("Earth Search STAC fetch failed: %s", exc)

        # Case 1: Live Sentinel Hub band statistics succeeded
        if sh_stats:
            latest = sh_stats[-1]
            bands = latest["bands"]
            indices = compute_all_indices_from_bands(bands)
            matched_scene = stac_scenes[0] if stac_scenes else {}
            acq_date = latest.get("acquisition_date") or matched_scene.get("acquisition_date") or _utc_now_iso()
            scene_id = matched_scene.get("scene_id")
            thumb = matched_scene.get("thumbnail_url")
            cloud_pct = matched_scene.get("cloud_cover_pct")

            # Cache all returned dates
            for item in sh_stats:
                item_indices = compute_all_indices_from_bands(item["bands"])
                _cache_observation(
                    farm_id=farm_id,
                    user_id=user_id,
                    polygon_hash=geom["polygon_hash"],
                    provider="sentinel_hub",
                    source_mode="sentinel_hub_live",
                    acquisition_date=item["acquisition_date"],
                    cloud_cover_pct=cloud_pct if item is latest else None,
                    scene_id=scene_id if item is latest else None,
                    thumbnail_url=thumb if item is latest else None,
                    area_ha=geom["area_ha"],
                    indices=item_indices,
                    bands=item["bands"],
                    raw_meta={"valid_pixel_count": item.get("valid_pixel_count"), "total_pixel_count": item.get("total_pixel_count")},
                )

            agronomic = _interpret_indices(indices, weather, farm_model, decision_summary)
            return {
                "status": "live",
                "source_mode": "sentinel_hub_live",
                "is_live": True,
                "is_demo": False,
                "cache_fallback": False,
                "provider": "Sentinel Hub Statistical API (Sentinel-2 L2A)",
                "provider_note": "Cloud-masked Sentinel-2 L2A multi-band statistics computed over the exact field polygon.",
                "farm_id": farm_id,
                "farm_name": farm_model.farm_name,
                "geometry": geom,
                "acquisition_date": acq_date,
                "cloud_cover_pct": cloud_pct,
                "scene_id": scene_id,
                "thumbnail_url": thumb,
                "band_statistics_available": True,
                "bands": bands,
                "indices": indices,
                "distribution": latest.get("ndvi_distribution"),
                "scenes": stac_scenes,
                "agronomic_fusion": agronomic,
            }

        # Case 2: Live STAC scene discovery succeeded (with or without manual band inputs)
        if stac_scenes:
            top_scene = stac_scenes[0]
            indices = compute_all_indices_from_bands(manual_bands) if has_manual_bands else {
                "ndvi": None,
                "ndmi": None,
                "ndwi": None,
                "evi": None,
                "savi": None,
                "ndre": None,
            }
            mode = "stac_metadata_plus_manual" if has_manual_bands else "stac_metadata_only"
            provider_label = "Element84 Earth Search STAC (Sentinel-2 L2A)"

            # Cache STAC metadata observations (up to 4 most recent)
            for idx_s, sc in enumerate(stac_scenes[:4]):
                sc_indices = indices if (idx_s == 0 and has_manual_bands) else {
                    "ndvi": None, "ndmi": None, "ndwi": None, "evi": None, "savi": None, "ndre": None
                }
                _cache_observation(
                    farm_id=farm_id,
                    user_id=user_id,
                    polygon_hash=geom["polygon_hash"],
                    provider="earth_search_stac",
                    source_mode=mode if idx_s == 0 else "stac_metadata_only",
                    acquisition_date=sc["acquisition_date"],
                    cloud_cover_pct=sc.get("cloud_cover_pct"),
                    scene_id=sc.get("scene_id"),
                    thumbnail_url=sc.get("thumbnail_url"),
                    area_ha=geom["area_ha"],
                    indices=sc_indices,
                    bands=manual_bands if (idx_s == 0 and has_manual_bands) else {},
                    raw_meta={"platform": sc.get("platform"), "mgrs_tile": sc.get("mgrs_tile")},
                )

            agronomic = _interpret_indices(indices, weather, farm_model, decision_summary)
            return {
                "status": "live_metadata" if not has_manual_bands else "live_metadata_manual_bands",
                "source_mode": mode,
                "is_live": True,
                "is_demo": False,
                "cache_fallback": False,
                "provider": provider_label,
                "provider_note": (
                    "Live Sentinel-2 L2A scene metadata retrieved from Earth Search STAC, combined with user-entered band reflectance."
                    if has_manual_bands
                    else "Live Sentinel-2 L2A scene metadata retrieved from Earth Search STAC. Sentinel Hub credentials are not configured, so pixel band statistics are not fabricated."
                ),
                "farm_id": farm_id,
                "farm_name": farm_model.farm_name,
                "geometry": geom,
                "acquisition_date": top_scene["acquisition_date"],
                "cloud_cover_pct": top_scene.get("cloud_cover_pct"),
                "scene_id": top_scene.get("scene_id"),
                "thumbnail_url": top_scene.get("thumbnail_url"),
                "band_statistics_available": has_manual_bands,
                "bands": manual_bands if has_manual_bands else {},
                "indices": indices,
                "distribution": None,
                "scenes": stac_scenes,
                "agronomic_fusion": agronomic,
            }

        # Case 3: Manual bands without live provider response
        if has_manual_bands:
            indices = compute_all_indices_from_bands(manual_bands)
            acq_date = _utc_now_iso()
            _cache_observation(
                farm_id=farm_id,
                user_id=user_id,
                polygon_hash=geom["polygon_hash"],
                provider="manual_input",
                source_mode="manual_band_input",
                acquisition_date=acq_date,
                cloud_cover_pct=None,
                scene_id=None,
                thumbnail_url=None,
                area_ha=geom["area_ha"],
                indices=indices,
                bands=manual_bands,
                raw_meta={"provider_errors": provider_errors},
            )
            agronomic = _interpret_indices(indices, weather, farm_model, decision_summary)
            return {
                "status": "manual_input",
                "source_mode": "manual_band_input",
                "is_live": False,
                "is_demo": False,
                "cache_fallback": False,
                "provider": "Manual Field Band Reflectance",
                "provider_note": "Indices computed deterministically from user-supplied spectral band reflectance.",
                "farm_id": farm_id,
                "farm_name": farm_model.farm_name,
                "geometry": geom,
                "acquisition_date": acq_date,
                "cloud_cover_pct": None,
                "scene_id": None,
                "thumbnail_url": None,
                "band_statistics_available": True,
                "bands": manual_bands,
                "indices": indices,
                "distribution": None,
                "scenes": [],
                "agronomic_fusion": agronomic,
            }

        # Case 4: Offline / Provider failed -> SQLite Cache Fallback
        cached = _read_cached_observations(farm_id=farm_id, polygon_hash=geom["polygon_hash"], limit=8)
        if not cached and farm_id:
            cached = _read_cached_observations(farm_id=farm_id, polygon_hash=None, limit=8)
        if cached:
            latest_c = cached[0]
            indices = {
                "ndvi": latest_c.get("ndvi"),
                "ndmi": latest_c.get("ndmi"),
                "ndwi": latest_c.get("ndwi"),
                "evi": latest_c.get("evi"),
                "savi": latest_c.get("savi"),
                "ndre": latest_c.get("ndre"),
            }
            bands = latest_c.get("bands") or {}
            agronomic = _interpret_indices(indices, weather, farm_model, decision_summary)
            return {
                "status": "cached_fallback",
                "source_mode": "cached_observation",
                "is_live": False,
                "is_demo": False,
                "cache_fallback": True,
                "fallback_reason": "; ".join(provider_errors) if provider_errors else "Offline mode or no matching cloud-free scenes.",
                "provider": f"Cached ({latest_c.get('provider')})",
                "provider_note": "Live satellite providers unavailable; serving most recent persisted observation from SQLite cache.",
                "farm_id": farm_id,
                "farm_name": farm_model.farm_name,
                "geometry": geom,
                "acquisition_date": latest_c["acquisition_date"],
                "cloud_cover_pct": latest_c.get("cloud_cover_pct"),
                "scene_id": latest_c.get("scene_id"),
                "thumbnail_url": latest_c.get("thumbnail_url"),
                "band_statistics_available": indices.get("ndvi") is not None,
                "bands": bands,
                "indices": indices,
                "distribution": None,
                "scenes": [],
                "agronomic_fusion": agronomic,
            }

        # Case 5: Honest unavailable state (never fabricates fake numbers)
        agronomic = _interpret_indices(
            {"ndvi": None, "ndmi": None, "ndwi": None, "evi": None, "savi": None, "ndre": None},
            weather,
            farm_model,
            decision_summary,
        )
        return {
            "status": "unavailable",
            "source_mode": "unavailable",
            "is_live": False,
            "is_demo": False,
            "cache_fallback": False,
            "provider": "None Available",
            "provider_note": (
                "; ".join(provider_errors)
                if provider_errors
                else "No cloud-free Sentinel-2 scenes found in lookback window and no cached observations exist."
            ),
            "farm_id": farm_id,
            "farm_name": farm_model.farm_name,
            "geometry": geom,
            "acquisition_date": None,
            "cloud_cover_pct": None,
            "scene_id": None,
            "thumbnail_url": None,
            "band_statistics_available": False,
            "bands": {},
            "indices": {"ndvi": None, "ndmi": None, "ndwi": None, "evi": None, "savi": None, "ndre": None},
            "distribution": None,
            "scenes": [],
            "agronomic_fusion": agronomic,
        }

    def get_history(
        self,
        *,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
        farm_id: str,
        polygon_hash: Optional[str] = None,
        limit: int = 24,
    ) -> Dict[str, Any]:
        if role and role not in ("farmer", "admin"):
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: You cannot access another farmer's farm satellite history.",
            )
        conn = get_db_connection()
        try:
            if user_id and role:
                farm_row = verify_authorized_farm(conn.cursor(), farm_id, user_id, role)
            else:
                row = conn.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
                farm_row = dict(row) if row else None
            if not farm_row:
                raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found.")
        finally:
            conn.close()

        rows = _read_cached_observations(farm_id=farm_id, polygon_hash=polygon_hash, limit=limit)
        chronological = list(reversed(rows))
        change = _compute_change_detection(chronological)

        return {
            "farm_id": farm_id,
            "farm_name": farm_row.get("farm_name"),
            "observation_count": len(chronological),
            "observations": [
                {
                    "id": r["id"],
                    "acquisition_date": r["acquisition_date"],
                    "provider": r["provider"],
                    "source_mode": r["source_mode"],
                    "cloud_cover_pct": r.get("cloud_cover_pct"),
                    "scene_id": r.get("scene_id"),
                    "thumbnail_url": r.get("thumbnail_url"),
                    "area_ha": r.get("area_ha"),
                    "ndvi": r.get("ndvi"),
                    "ndmi": r.get("ndmi"),
                    "ndwi": r.get("ndwi"),
                    "evi": r.get("evi"),
                    "savi": r.get("savi"),
                    "ndre": r.get("ndre"),
                    "cached_at": r.get("cached_at"),
                }
                for r in chronological
            ],
            "change_detection": change,
        }


satellite_intelligence_service = SatelliteIntelligenceService()
