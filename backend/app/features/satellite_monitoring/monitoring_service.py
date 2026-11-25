# backend/app/features/satellite_monitoring/monitoring_service.py
"""
Persistent Satellite Observation Cache & Automatic Daily Monitoring Service.
Stores dated Sentinel-2 observations in SQLite so identical scenes are never re-downloaded.
Compares observed NDVI against modeled crop NDVI expectation and tracks monitoring freshness.
"""
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from backend.app.db.database import get_db_connection
from backend.app.features.satellite_monitoring.cdse_client import (
    _polygon_to_bbox_and_geom,
    get_provider_status,
    process_sentinel2_scene,
    search_sentinel2_scenes,
)


def ensure_satellite_tables() -> None:
    conn = get_db_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS satellite_observations_cache (
                cache_key TEXT PRIMARY KEY,
                farm_id TEXT,
                polygon_hash TEXT NOT NULL,
                scene_id TEXT NOT NULL,
                acquisition_date TEXT NOT NULL,
                cloud_cover_pct REAL,
                valid_pixel_pct REAL,
                usable INTEGER NOT NULL,
                ndvi_mean REAL,
                ndmi_mean REAL,
                evi_mean REAL,
                payload_json TEXT NOT NULL,
                retrieved_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS monitored_parcels (
                farm_id TEXT PRIMARY KEY,
                farm_name TEXT NOT NULL,
                crop_name TEXT NOT NULL,
                sowing_date TEXT NOT NULL,
                area_acres REAL NOT NULL,
                geojson_json TEXT NOT NULL,
                polygon_hash TEXT NOT NULL,
                last_sync_at TEXT,
                next_check_at TEXT,
                latest_scene_id TEXT,
                latest_acquisition_date TEXT,
                latest_ndvi REAL,
                latest_valid_pixel_pct REAL,
                monitoring_status TEXT NOT NULL,
                alert_message TEXT
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def _get_cached_observation(cache_key: str) -> Optional[Dict[str, Any]]:
    ensure_satellite_tables()
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT payload_json, retrieved_at FROM satellite_observations_cache WHERE cache_key = ?",
            (cache_key,),
        ).fetchone()
    finally:
        conn.close()
    if not row:
        return None
    data = json.loads(row["payload_json"])
    data["cached"] = True
    data["retrieved_at"] = row["retrieved_at"]
    return data


def _save_cached_observation(
    cache_key: str,
    farm_id: Optional[str],
    polygon_hash: str,
    obs: Dict[str, Any],
) -> None:
    ensure_satellite_tables()
    now_iso = datetime.now(timezone.utc).isoformat()
    indices = obs.get("indices") or {}
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO satellite_observations_cache (
                cache_key, farm_id, polygon_hash, scene_id, acquisition_date,
                cloud_cover_pct, valid_pixel_pct, usable, ndvi_mean, ndmi_mean, evi_mean,
                payload_json, retrieved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                cache_key,
                farm_id,
                polygon_hash,
                obs["scene_id"],
                obs["acquisition_date"],
                obs.get("parcel_cloud_cover_pct"),
                obs.get("valid_pixel_coverage_pct"),
                1 if obs.get("usable") else 0,
                indices.get("ndvi_mean"),
                indices.get("ndmi_mean"),
                indices.get("evi_mean"),
                json.dumps(obs),
                now_iso,
            ),
        )
        conn.commit()
    finally:
        conn.close()


def expected_crop_ndvi(days_after_sowing: int, total_days: int = 110) -> float:
    """Generic illustrative NDVI trajectory from bare soil (~0.18) -> peak canopy (~0.74) -> senescence (~0.35)."""
    if days_after_sowing <= 0:
        return 0.18
    p = min(1.0, days_after_sowing / max(1, total_days))
    if p < 0.12:
        return round(0.18 + (p / 0.12) * 0.08, 3)
    if p < 0.62:
        return round(0.26 + ((p - 0.12) / 0.50) * 0.48, 3)
    if p < 0.80:
        return round(0.74 - ((p - 0.62) / 0.18) * 0.08, 3)
    return round(0.66 - ((p - 0.80) / 0.20) * 0.30, 3)


def retrieve_historical_timelapse(
    *,
    coordinates: List[List[float]],
    start_date: str,
    end_date: str,
    farm_id: Optional[str] = None,
    sowing_date: Optional[str] = None,
    total_days: int = 110,
    max_scenes: int = 8,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    start_iso = f"{start_date}T00:00:00Z" if "T" not in start_date else start_date
    end_iso = f"{end_date}T23:59:59Z" if "T" not in end_date else end_date

    try:
        features, view_bbox, parcel_poly, poly_hash = search_sentinel2_scenes(
            coordinates, start_iso, end_iso, max_cloud_pct=90.0, limit=max_scenes * 2
        )
    except Exception as exc:
        return {
            "available": False,
            "data_quality": "UNAVAILABLE",
            "error": f"Failed to query Sentinel-2 catalog: {exc}",
            "provider_status": get_provider_status(),
            "observations": [],
        }

    # Subsample evenly if many scenes exist so latency remains fast
    if len(features) > max_scenes:
        idxs = [round(i * (len(features) - 1) / (max_scenes - 1)) for i in range(max_scenes)]
        features = [features[i] for i in idxs]

    observations: List[Dict[str, Any]] = []
    usable_count = 0
    sow_dt = None
    if sowing_date:
        try:
            sow_dt = datetime.fromisoformat(sowing_date).date()
        except ValueError:
            sow_dt = None

    prev_ndvi: Optional[float] = None
    for feat in features:
        scene_id = feat["id"]
        cache_key = f"{poly_hash}__{scene_id}"
        obs = _get_cached_observation(cache_key)
        if obs is None:
            try:
                obs = process_sentinel2_scene(feat, view_bbox, parcel_poly)
                obs["cached"] = False
                obs["retrieved_at"] = now.isoformat()
                _save_cached_observation(cache_key, farm_id, poly_hash, obs)
            except Exception as exc:
                obs = {
                    "scene_id": scene_id,
                    "provider": "Copernicus Sentinel-2 L2A (Element84 Earth Search COG)",
                    "acquisition_date": feat.get("properties", {}).get("datetime"),
                    "usable": False,
                    "limitation_note": f"Scene read failed: {exc}",
                    "indices": {"ndvi_mean": None, "ndmi_mean": None, "evi_mean": None},
                }

        # Attach cultivation days-after-sowing & development trend
        acq_str = obs.get("acquisition_date") or ""
        das = None
        exp_ndvi = None
        if sow_dt and len(acq_str) >= 10:
            try:
                obs_date = datetime.fromisoformat(acq_str[:10]).date()
                das = (obs_date - sow_dt).days
                exp_ndvi = expected_crop_ndvi(das, total_days=total_days)
            except ValueError:
                pass

        cur_ndvi = (obs.get("indices") or {}).get("ndvi_mean")
        trend = "stable"
        if cur_ndvi is not None and prev_ndvi is not None:
            diff = cur_ndvi - prev_ndvi
            trend = "increasing" if diff > 0.03 else ("declining" if diff < -0.03 else "stable")
        if obs.get("usable") and cur_ndvi is not None:
            prev_ndvi = cur_ndvi
            usable_count += 1

        obs["days_after_sowing"] = das
        obs["modeled_expected_ndvi"] = exp_ndvi
        obs["vegetation_trend"] = trend
        observations.append(obs)

    usable_obs = [o for o in observations if o.get("usable") and (o.get("indices") or {}).get("ndvi_mean") is not None]
    latest_usable = usable_obs[-1] if usable_obs else None

    freshness_days = None
    comparison_alert = None
    if latest_usable and latest_usable.get("acquisition_date"):
        try:
            acq_dt = datetime.fromisoformat(latest_usable["acquisition_date"].replace("Z", "+00:00"))
            freshness_days = round((now - acq_dt).total_seconds() / 86400.0, 1)
        except Exception:
            pass
        obs_ndvi = latest_usable["indices"]["ndvi_mean"]
        exp_n = latest_usable.get("modeled_expected_ndvi")
        if exp_n is not None and abs(obs_ndvi - exp_n) > 0.18:
            comparison_alert = (
                f"Observed vegetation development differs from the predicted growth trend "
                f"(Observed NDVI {obs_ndvi:.2f} vs Predicted {exp_n:.2f}). "
                "Plausible factors include delayed germination, intercropping/weeds, moisture deficit, "
                "residual pre-sowing vegetation, or atmospheric haze — ground scouting is advised."
            )

    insufficient_note = None
    if len(observations) < 2:
        insufficient_note = "Insufficient cloud-free Sentinel-2 acquisitions in this date window (nominal 5-day revisit)."

    return {
        "available": True,
        "data_quality": "OBSERVED" if usable_count > 0 else "UNAVAILABLE",
        "polygon_hash": poly_hash,
        "total_scenes_found": len(observations),
        "usable_scenes_count": usable_count,
        "latest_usable": latest_usable,
        "latest_acquisition_date": latest_usable.get("acquisition_date") if latest_usable else None,
        "last_sync_at": now.isoformat(),
        "next_scheduled_check_at": (now + timedelta(days=1)).isoformat(),
        "data_freshness_days": freshness_days,
        "comparison_alert": comparison_alert,
        "insufficient_history_note": insufficient_note,
        "provider_status": get_provider_status(),
        "observations": observations,
    }


def register_and_sync_parcel(
    *,
    farm_id: Optional[str],
    farm_name: str,
    crop_name: str,
    sowing_date: str,
    area_acres: float,
    coordinates: List[List[float]],
    total_days: int = 110,
) -> Dict[str, Any]:
    ensure_satellite_tables()
    fid = farm_id or f"parcel_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)
    start_dt = (now - timedelta(days=45)).date().isoformat()
    end_dt = now.date().isoformat()

    res = retrieve_historical_timelapse(
        coordinates=coordinates,
        start_date=start_dt,
        end_date=end_dt,
        farm_id=fid,
        sowing_date=sowing_date,
        total_days=total_days,
        max_scenes=6,
    )

    latest = res.get("latest_usable") or {}
    latest_ndvi = (latest.get("indices") or {}).get("ndvi_mean")
    valid_pct = latest.get("valid_pixel_coverage_pct")
    status = "Active — Observed Satellite Synced" if latest else "Waiting for Cloud-Free Overpass"

    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO monitored_parcels (
                farm_id, farm_name, crop_name, sowing_date, area_acres, geojson_json,
                polygon_hash, last_sync_at, next_check_at, latest_scene_id,
                latest_acquisition_date, latest_ndvi, latest_valid_pixel_pct,
                monitoring_status, alert_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                fid,
                farm_name,
                crop_name,
                sowing_date,
                area_acres,
                json.dumps({"type": "Polygon", "coordinates": [coordinates]}),
                res.get("polygon_hash", ""),
                res.get("last_sync_at"),
                res.get("next_scheduled_check_at"),
                latest.get("scene_id"),
                latest.get("acquisition_date"),
                latest_ndvi,
                valid_pct,
                status,
                res.get("comparison_alert"),
            ),
        )
        conn.commit()
    finally:
        conn.close()

    res["farm_id"] = fid
    res["monitoring_status"] = status
    return res


def list_monitored_parcels() -> List[Dict[str, Any]]:
    ensure_satellite_tables()
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT * FROM monitored_parcels ORDER BY last_sync_at DESC").fetchall()
    finally:
        conn.close()
    return [dict(r) for r in rows]
