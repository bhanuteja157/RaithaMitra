"""Comprehensive tests for AD-25 Satellite & Geospatial Agricultural Intelligence."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.app.db.database import get_db_connection, init_db
from backend.app.features.satellite.geometry import validate_and_analyze_geometry
from backend.app.features.satellite.spectral_indices import (
    compute_all_indices_from_bands,
    compute_evi,
    compute_ndmi,
    compute_ndre,
    compute_ndvi,
    compute_ndwi,
    compute_savi,
    summarize_pixel_distribution,
)
from backend.app.main import app


@pytest.fixture(autouse=True)
def _ensure_db():
    init_db()


def _valid_mandya_polygon() -> dict:
    return {
        "type": "Polygon",
        "coordinates": [
            [
                [76.8940, 12.5210],
                [76.8965, 12.5210],
                [76.8965, 12.5230],
                [76.8940, 12.5230],
                [76.8940, 12.5210],
            ]
        ],
    }


def _farmer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_farmer"}


def _buyer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_buyer"}


def test_geometry_validation_and_area():
    geom = validate_and_analyze_geometry(
        latitude=12.522,
        longitude=76.895,
        boundary_geojson=_valid_mandya_polygon(),
    )
    assert geom["is_user_polygon"] is True
    assert 4.0 < geom["area_ha"] < 8.0
    assert len(geom["polygon_hash"]) == 16
    assert geom["resolution_warning"] is None


def test_geometry_rejects_self_intersection_and_tiny_polygon():
    bowtie = {
        "type": "Polygon",
        "coordinates": [
            [
                [76.894, 12.521],
                [76.896, 12.523],
                [76.896, 12.521],
                [76.894, 12.523],
                [76.894, 12.521],
            ]
        ],
    }
    with pytest.raises(ValueError, match="self-intersecting"):
        validate_and_analyze_geometry(latitude=12.522, longitude=76.895, boundary_geojson=bowtie)

    tiny = {
        "type": "Polygon",
        "coordinates": [
            [
                [76.89500, 12.52200],
                [76.89505, 12.52200],
                [76.89505, 12.52205],
                [76.89500, 12.52205],
                [76.89500, 12.52200],
            ]
        ],
    }
    with pytest.raises(ValueError, match="below minimum valid area"):
        validate_and_analyze_geometry(latitude=12.522, longitude=76.895, boundary_geojson=tiny)


def test_geometry_resolution_warning_under_quarter_hectare():
    # ~0.12 ha polygon
    small = {
        "type": "Polygon",
        "coordinates": [
            [
                [76.89500, 12.52200],
                [76.89535, 12.52200],
                [76.89535, 12.52230],
                [76.89500, 12.52230],
                [76.89500, 12.52200],
            ]
        ],
    }
    geom = validate_and_analyze_geometry(latitude=12.522, longitude=76.895, boundary_geojson=small)
    assert 0.05 <= geom["area_ha"] < 0.25
    assert geom["resolution_warning"] is not None


def test_spectral_indices_math_and_zero_guards():
    assert compute_ndvi(0.44, 0.08) == pytest.approx(0.6923, abs=1e-4)
    assert compute_ndmi(0.44, 0.22) == pytest.approx(0.3333, abs=1e-4)
    assert compute_ndwi(0.12, 0.44) == pytest.approx(-0.5714, abs=1e-4)
    assert compute_savi(0.44, 0.08) == pytest.approx(0.5294, abs=1e-4)
    assert compute_ndre(0.44, 0.24) == pytest.approx(0.2941, abs=1e-4)
    assert compute_evi(0.44, 0.08, 0.05) is not None

    # Zero denominator guards
    assert compute_ndvi(0.0, 0.0) is None
    assert compute_ndmi(0.0, 0.0) is None
    assert compute_evi(0.0, 0.0, 0.0) == 0.0

    bundle = compute_all_indices_from_bands(
        {"nir": 0.44, "red": 0.08, "swir": 0.22, "blue": 0.05, "green": 0.12, "red_edge": 0.24}
    )
    assert set(bundle.keys()) == {"ndvi", "ndmi", "ndwi", "evi", "savi", "ndre"}
    dist = summarize_pixel_distribution([0.4, 0.6, 0.7, 0.8])
    assert dist["mean"] == 0.625


def test_live_sentinel_hub_persistence_and_change_detection():
    client = TestClient(app)

    # Clear test cache rows for farm_001
    conn = get_db_connection()
    conn.execute("DELETE FROM satellite_observations_cache WHERE farm_id = 'farm_001'")
    conn.commit()
    conn.close()

    mock_sh = [
        {
            "acquisition_date": "2026-11-10T05:18:00Z",
            "bands": {"nir": 0.36, "red": 0.12, "swir": 0.20, "blue": 0.06, "green": 0.11, "red_edge": 0.22},
            "valid_pixel_count": 120,
            "total_pixel_count": 130,
            "ndvi_distribution": {"mean": 0.50, "median": 0.51, "min": 0.35, "max": 0.65},
        },
        {
            "acquisition_date": "2026-11-20T05:18:00Z",
            "bands": {"nir": 0.48, "red": 0.08, "swir": 0.18, "blue": 0.05, "green": 0.10, "red_edge": 0.25},
            "valid_pixel_count": 128,
            "total_pixel_count": 130,
            "ndvi_distribution": {"mean": 0.71, "median": 0.72, "min": 0.55, "max": 0.82},
        },
    ]
    mock_stac = [
        {
            "scene_id": "S2A_43PFP_20261120_L2A",
            "acquisition_date": "2026-11-20T05:18:00Z",
            "cloud_cover_pct": 4.2,
            "platform": "sentinel-2a",
            "mgrs_tile": "43PFP",
            "thumbnail_url": "https://example.org/thumb.jpg",
            "band_assets": {},
        }
    ]

    with (
        patch("backend.app.features.satellite.service.sentinel_hub_configured", return_value=True),
        patch(
            "backend.app.features.satellite.service.fetch_sentinel_hub_statistics",
            new=AsyncMock(return_value=mock_sh),
        ),
        patch(
            "backend.app.features.satellite.service.search_earth_search_stac",
            new=AsyncMock(return_value=mock_stac),
        ),
    ):
        resp = client.post(
            "/api/v1/satellite/observations",
            json={"farm_id": "farm_001", "boundary_geojson": _valid_mandya_polygon()},
            headers=_farmer_headers(),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["source_mode"] == "sentinel_hub_live"
        assert body["is_live"] is True
        assert body["is_demo"] is False
        assert body["indices"]["ndvi"] > 0.70

    # History + change detection
    hist_resp = client.get("/api/v1/satellite/history/farm_001", headers=_farmer_headers())
    assert hist_resp.status_code == 200
    hist = hist_resp.json()
    assert hist["observation_count"] >= 2
    assert hist["change_detection"] is not None
    assert hist["change_detection"]["ndvi"]["direction"] == "increasing"
    assert hist["change_detection"]["ndvi"]["abs_change"] > 0

    # Offline cache fallback serves persisted data
    offline_resp = client.post(
        "/api/v1/satellite/observations",
        json={"farm_id": "farm_001", "boundary_geojson": _valid_mandya_polygon(), "offline_only": True},
        headers=_farmer_headers(),
    )
    assert offline_resp.status_code == 200
    off = offline_resp.json()
    assert off["cache_fallback"] is True
    assert off["source_mode"] == "cached_observation"
    assert off["indices"]["ndvi"] > 0.70


def test_stac_metadata_only_does_not_fabricate_ndvi():
    client = TestClient(app)
    mock_stac = [
        {
            "scene_id": "S2C_43PFP_20261123_0_L2A",
            "acquisition_date": "2026-11-23T05:18:00Z",
            "cloud_cover_pct": 1.8,
            "platform": "sentinel-2c",
            "mgrs_tile": "43PFP",
            "thumbnail_url": "https://example.org/s2c_thumb.jpg",
            "band_assets": {},
        }
    ]
    with (
        patch("backend.app.features.satellite.service.sentinel_hub_configured", return_value=False),
        patch(
            "backend.app.features.satellite.service.search_earth_search_stac",
            new=AsyncMock(return_value=mock_stac),
        ),
    ):
        resp = client.post(
            "/api/v1/satellite/observations",
            json={"farm_id": "farm_001", "boundary_geojson": _valid_mandya_polygon()},
            headers=_farmer_headers(),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["source_mode"] == "stac_metadata_only"
        assert body["band_statistics_available"] is False
        assert body["indices"]["ndvi"] is None
        assert body["cloud_cover_pct"] == 1.8


def test_demo_mode_never_persists_to_cache_and_farm_isolation_enforced():
    client = TestClient(app)
    conn = get_db_connection()
    before_count = conn.execute("SELECT COUNT(*) FROM satellite_observations_cache").fetchone()[0]
    conn.close()

    demo_resp = client.post(
        "/api/v1/satellite/observations",
        json={"farm_id": "farm_001", "use_demo_observation": True},
        headers=_farmer_headers(),
    )
    assert demo_resp.status_code == 200
    assert demo_resp.json()["is_demo"] is True
    assert demo_resp.json()["is_live"] is False

    conn = get_db_connection()
    after_count = conn.execute("SELECT COUNT(*) FROM satellite_observations_cache").fetchone()[0]
    conn.close()
    assert after_count == before_count

    # Buyer attempting to access farmer's farm satellite history gets 403
    unauth = client.get("/api/v1/satellite/history/farm_001", headers=_buyer_headers())
    assert unauth.status_code == 403


def test_assistant_read_only_satellite_tool():
    client = TestClient(app)
    with (
        patch("backend.app.features.satellite.service.sentinel_hub_configured", return_value=False),
        patch(
            "backend.app.features.satellite.service.search_earth_search_stac",
            new=AsyncMock(return_value=[]),
        ),
    ):
        resp = client.post(
            "/api/v1/assistant/chat",
            json={"farm_id": "farm_001", "message": "Check satellite NDVI and moisture stress for my farm"},
            headers=_farmer_headers(),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["intent"] == "satellite_intelligence"
        assert "get_satellite_intelligence" in body["tools_used"]
        assert len(body["cards"]) >= 1
