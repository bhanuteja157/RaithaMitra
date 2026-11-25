# backend/tests/test_satellite_monitoring.py
from fastapi.testclient import TestClient
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


def test_real_tumakuru_sentinel2_timelapse_and_caching():
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
    assert body["total_scenes_found"] >= 1
    assert body["data_quality"] == "OBSERVED"
    obs = body["observations"]
    assert any(o.get("usable") and o["indices"]["ndvi_mean"] is not None for o in obs)
    first_usable = next(o for o in obs if o.get("usable"))
    assert first_usable["resolution_m"] == 10
    assert first_usable["layers"]["true_color_png"].startswith("data:image/png;base64,")
    assert first_usable["layers"]["false_color_png"].startswith("data:image/png;base64,")
    assert first_usable["layers"]["ndvi_png"].startswith("data:image/png;base64,")

    # Second query must hit SQLite cache
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
    assert any(o.get("cached") is True for o in res2.json()["observations"])


def test_parcel_sync_and_scientific_satellite_endpoint():
    sync_res = client.post(
        "/api/v1/satellite-monitoring/parcels/sync",
        json={
            "farm_id": "tumakuru_maize_test",
            "farm_name": "Tumakuru Maize Validation Parcel",
            "crop_name": "Maize",
            "sowing_date": "2026-09-01",
            "area_acres": 1.9,
            "coordinates": TUMAKURU_POLYGON,
            "total_days": 110,
        },
    )
    assert sync_res.status_code == 200
    assert sync_res.json()["data_quality"] == "OBSERVED"

    # Existing /scientific/satellite/analyze must now return live Sentinel-2 data
    sci_res = client.post(
        "/api/v1/scientific/satellite/analyze",
        json={
            "farm_id": "tumakuru_maize_test",
            "latitude": 13.3407,
            "longitude": 77.1140,
            "boundary_geojson": {"type": "Polygon", "coordinates": [TUMAKURU_POLYGON]},
        },
    )
    assert sci_res.status_code == 200
    sci_body = sci_res.json()
    assert sci_body["is_live"] is True
    assert sci_body["data_quality"] == "live"
    assert sci_body["results"]["indices"]["ndvi"] is not None
