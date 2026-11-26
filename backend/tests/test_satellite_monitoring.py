# backend/tests/test_satellite_monitoring.py
from __future__ import annotations

from typing import Any, Dict, List
from fastapi.testclient import TestClient

from backend.app.db.database import get_db_connection, init_db
from backend.app.features.satellite_monitoring import monitoring_service
from backend.app.main import app

client = TestClient(app)

# Genuine Tumakuru agricultural parcel polygon (~1.9 acres)
TUMAKURU_POLYGON = [
    [77.1135, 13.3412],
    [77.1144, 13.3412],
    [77.1145, 13.3403],
    [77.1134, 13.3402],
    [77.1135, 13.3412],
]


def test_satellite_provider_status():
    res = client.get("/api/v1/satellite-monitoring/provider-status")
    assert res.status_code == 200
    data = res.json()
    assert data["open_sentinel2_stac_active"] is True
    assert data["collection"] == "sentinel-2-l2a"
    assert data["spatial_resolution_m"]["rgb_nir"] == 10


def test_maize_agronomy_seed_and_population():
    res = client.post(
        "/api/v1/satellite-monitoring/maize-agronomy",
        json={
            "area_acres": 2.0,
            "variety_id": "nah-1137",
            "sowing_date": "2026-09-01",
            "row_spacing_cm": 60,
            "plant_spacing_cm": 20,
            "germination_pct": 90,
            "mean_daily_temp_c": 26.0,
        },
    )
    assert res.status_code == 200
    d = res.json()
    assert d["data_quality"] == "ESTIMATED"
    assert d["theoretical_plant_population"] > 60000
    assert d["estimated_established_population"] < d["theoretical_plant_population"]
    assert d["required_seed_kg"] > 10.0
    assert len(d["biological_stages"]) == 15
    assert d["biological_stages"][8]["code"] == "VT"
    assert d["biological_stages"][9]["code"] == "R1"


def test_tumakuru_sentinel2_timelapse_caching_and_rbac(monkeypatch):
    init_db()

    def _fake_search(coords: List[List[float]], start_iso: str, end_iso: str, max_cloud_pct: float = 85.0, limit: int = 12):
        _, poly, poly_hash = monitoring_service._polygon_to_bbox_and_geom(coords)
        features = [
            {
                "id": "S2B_43PGQ_20261118_0_L2A",
                "properties": {"datetime": "2026-11-18T05:25:21.132Z", "eo:cloud_cover": 2.5},
                "assets": {"red": {"href": "https://example.invalid/red.tif"}, "nir": {"href": "https://example.invalid/nir.tif"}, "scl": {"href": "https://example.invalid/scl.tif"}},
            },
            {
                "id": "S2C_43PGQ_20261123_0_L2A",
                "properties": {"datetime": "2026-11-23T05:25:19.018Z", "eo:cloud_cover": 4.0},
                "assets": {"red": {"href": "https://example.invalid/red2.tif"}, "nir": {"href": "https://example.invalid/nir2.tif"}, "scl": {"href": "https://example.invalid/scl2.tif"}},
            },
        ]
        return features, [77.11, 13.34, 77.12, 13.35], poly, poly_hash

    call_count = {"n": 0}

    def _fake_process(feature: Dict[str, Any], view_bbox: List[float], parcel_poly: Any) -> Dict[str, Any]:
        call_count["n"] += 1
        sid = feature["id"]
        ndvi = 0.28 if "1118" in sid else 0.42
        return {
            "scene_id": sid,
            "provider": "Copernicus Sentinel-2 L2A (STAC COG)",
            "acquisition_date": feature["properties"]["datetime"],
            "resolution_m": 10,
            "scene_cloud_cover_pct": feature["properties"]["eo:cloud_cover"],
            "parcel_cloud_cover_pct": 0.0,
            "valid_pixel_coverage_pct": 100.0,
            "total_parcel_pixels": 82,
            "valid_parcel_pixels": 82,
            "usable": True,
            "cached": False,
            "indices": {"ndvi_mean": ndvi, "ndvi_min": ndvi - 0.05, "ndvi_max": ndvi + 0.06, "ndmi_mean": 0.01, "evi_mean": 0.21},
            "layers": {
                "true_color_png": "data:image/png;base64,iVBORw0KGgo=",
                "false_color_png": "data:image/png;base64,iVBORw0KGgo=",
                "ndvi_png": "data:image/png;base64,iVBORw0KGgo=",
            },
        }

    # Clear prior cache for deterministic test
    conn = get_db_connection()
    conn.execute("DELETE FROM satellite_monitoring_observations_cache WHERE farm_id = 'tumakuru_maize_test'")
    conn.commit()
    conn.close()

    monkeypatch.setattr(monitoring_service, "search_sentinel2_scenes", _fake_search)
    monkeypatch.setattr(monitoring_service, "process_sentinel2_scene", _fake_process)

    res1 = client.post(
        "/api/v1/satellite-monitoring/timelapse",
        json={
            "coordinates": TUMAKURU_POLYGON,
            "start_date": "2026-10-15",
            "end_date": "2026-11-26",
            "farm_id": "tumakuru_maize_test",
            "sowing_date": "2026-09-01",
            "total_days": 110,
            "max_scenes": 3,
        },
    )
    assert res1.status_code == 200
    body = res1.json()
    assert body["available"] is True
    assert body["data_quality"] == "OBSERVED"
    assert body["usable_scenes_count"] == 2
    assert call_count["n"] == 2

    # Second query must hit SQLite cache without calling COG processor again
    res2 = client.post(
        "/api/v1/satellite-monitoring/timelapse",
        json={
            "coordinates": TUMAKURU_POLYGON,
            "start_date": "2026-10-15",
            "end_date": "2026-11-26",
            "farm_id": "tumakuru_maize_test",
            "sowing_date": "2026-09-01",
            "total_days": 110,
            "max_scenes": 3,
        },
    )
    assert res2.status_code == 200
    assert call_count["n"] == 2
    assert all(o.get("cached") is True for o in res2.json()["observations"])

    # Registered DB farm requires authentication & ownership (AD-37 + AD-40A)
    unauth = client.post(
        "/api/v1/satellite-monitoring/timelapse",
        json={
            "coordinates": TUMAKURU_POLYGON,
            "start_date": "2026-10-15",
            "end_date": "2026-11-26",
            "farm_id": "farm_001",
        },
    )
    assert unauth.status_code == 401
