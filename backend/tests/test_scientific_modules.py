# backend/tests/test_scientific_modules.py
"""
Targeted Backend Tests for AD-04 Scientific Agricultural Intelligence.
Uses a dedicated FastAPI TestClient app mounting the modular scientific router
without modifying the shared central API router (backend/app/api/api.py).
"""
import io
from unittest.mock import patch
from PIL import Image
from fastapi import FastAPI
from fastapi.testclient import TestClient
from backend.app.api.endpoints.scientific import router as scientific_router
from backend.app.services.satellite_service import compute_ndvi, compute_ndwi, compute_evi

# Dedicated test app for modular verification
test_app = FastAPI()
test_app.include_router(scientific_router, prefix="/api/v1")
client = TestClient(test_app)


# ---------------------------------------------------------------------------
# P0: Scientific Irrigation & Unit Conversion Tests
# ---------------------------------------------------------------------------
def test_irrigation_fao56_and_unit_conversion():
    payload = {
        "farm_id": "farm_001",
        "crop_type": "Tomato",
        "crop_stage": "Mid-Season",  # Kc = 1.15
        "farm_area_ha": 2.0,
        "reference_et0_mm": 5.0,
        "effective_rainfall_mm": 1.0,
        "irrigation_method": "Drip Irrigation",  # eff = 0.90
        "available_water_m3": 10000.0,
        "flow_rate_m3_per_hr": 20.0,
    }
    res = client.post("/api/v1/scientific/irrigation/calculate", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["module"] == "scientific_precision_irrigation"
    r = body["results"]
    # ETc = 1.15 * 5.0 = 5.75 mm
    assert r["etc_mm_day"] == 5.75
    # Net = 5.75 - 1.0 = 4.75 mm
    assert r["net_irrigation_mm"] == 4.75
    # Gross = 4.75 / 0.90 = 5.28 mm
    assert r["gross_irrigation_mm"] == 5.28
    # Volume: 1 mm/ha = 10 m3 -> 4.75 * 2 * 10 = 95.0 m3; 5.28 * 2 * 10 = 105.6 m3
    assert r["net_volume_m3"] == 95.0
    assert r["gross_volume_m3"] == 105.6
    # Duration: 105.6 / 20.0 = 5.28 hrs
    assert r["estimated_duration_hours"] == 5.28
    assert r["soil_moisture_is_measured"] is False


def test_irrigation_invalid_inputs_rejected():
    res = client.post(
        "/api/v1/scientific/irrigation/calculate",
        json={"farm_area_ha": -1.0, "irrigation_efficiency": 1.5},
    )
    assert res.status_code == 422


# ---------------------------------------------------------------------------
# P1: Soil Analysis & Validation Tests
# ---------------------------------------------------------------------------
def test_soil_analysis_thresholds_and_no_fabricated_npk():
    # Omit phosphorus & potassium -> must remain not_measured, never fabricated
    payload = {
        "farm_id": "farm_001",
        "crop_type": "Tomato",
        "nitrogen_kg_ha": 200.0,  # Low (<280)
        "soil_ph": 5.2,           # Acidic for Tomato (6.0-7.0)
        "organic_carbon_pct": 0.40,
        "measurement_source": "laboratory_soil_health_card",
        "fetch_soilgrids": False,
    }
    res = client.post("/api/v1/scientific/soil/analyze", json=payload)
    assert res.status_code == 200
    r = res.json()["results"]
    assert r["nutrient_status"]["nitrogen"]["status"] == "low_deficient"
    assert r["nutrient_status"]["phosphorus"]["status"] == "not_measured"
    assert r["nutrient_status"]["phosphorus"]["value_kg_ha"] is None
    assert r["nutrient_status"]["soil_ph"]["compatibility"] == "acidic_below_optimal"
    assert len(r["deficiencies"]) >= 3


def test_soil_invalid_ph_rejected():
    res = client.post("/api/v1/scientific/soil/analyze", json={"soil_ph": 14.0})
    assert res.status_code == 422


# ---------------------------------------------------------------------------
# P1: Financial Calculations & Monte Carlo Reproducibility
# ---------------------------------------------------------------------------
def test_financial_simulation_and_monte_carlo_reproducibility():
    payload = {
        "farm_id": "farm_001",
        "crop_type": "Tomato",
        "farm_area_ha": 2.0,
        "expected_yield_t_per_ha": 25.0,
        "yield_std_pct": 15.0,
        "market_price_inr_per_t": 20000.0,
        "price_std_pct": 20.0,
        "crop_loss_pct": 10.0,
        "water_availability_pct": 100.0,
        "cultivation_expenses_inr": 100000.0,
        "transportation_expenses_inr": 20000.0,
        "num_trials": 2000,
        "random_seed": 12345,
    }
    res1 = client.post("/api/v1/scientific/simulation/financial", json=payload)
    res2 = client.post("/api/v1/scientific/simulation/financial", json=payload)
    assert res1.status_code == 200
    d1 = res1.json()["results"]
    d2 = res2.json()["results"]

    # Deterministic checks: 2 * 25 * 0.90 = 45.0 t; revenue = 900,000; cost = 120,000; profit = 780,000
    assert d1["deterministic"]["saleable_harvest_tonnes"] == 45.0
    assert d1["deterministic"]["expected_revenue_inr"] == 900000.0
    assert d1["deterministic"]["net_profit_inr"] == 780000.0
    assert d1["deterministic"]["break_even_price_inr_per_t"] == round(120000.0 / 45.0, 2)

    # Exact Monte Carlo reproducibility with same seed
    assert d1["monte_carlo"] == d2["monte_carlo"]


# ---------------------------------------------------------------------------
# P2: Digital Farm Twin Water-Balance Tests
# ---------------------------------------------------------------------------
def test_digital_farm_twin_water_balance():
    payload = {
        "farm_id": "farm_001",
        "farm_area_ha": 2.5,
        "crop_type": "Tomato",
        "sowing_date": "2026-10-15",
        "crop_stage": "Mid-Season",
        "rainfall_scenario_multiplier": 1.0,
        "irrigation_deficit_pct": 25.0,
    }
    res = client.post("/api/v1/scientific/farm-twin/simulate", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["module"] == "digital_farm_twin"
    assert "Non-AquaCrop" in body["results"]["model_type"]
    assert len(body["results"]["daily_water_balance"]) == 7
    assert len(body["results"]["zones"]) == 3


# ---------------------------------------------------------------------------
# P3: Satellite NDVI & Missing Credentials Handling
# ---------------------------------------------------------------------------
def test_ndvi_ndwi_evi_calculations():
    assert compute_ndvi(0.5, 0.1) == round((0.5 - 0.1) / (0.5 + 0.1), 4)
    assert compute_ndvi(0.0, 0.0) is None
    assert compute_ndwi(0.5, 0.2) == round((0.5 - 0.2) / (0.5 + 0.2), 4)
    assert compute_evi(0.44, 0.08, 0.05) is not None


def test_satellite_user_bands_vs_missing_credentials():
    # User-supplied NIR & Red only -> NDWI & EVI must stay None
    res_user = client.post(
        "/api/v1/scientific/satellite/analyze",
        json={"latitude": 12.52, "longitude": 76.89, "nir_band": 0.45, "red_band": 0.09},
    )
    assert res_user.status_code == 200
    body_user = res_user.json()
    assert body_user["data_quality"] == "user_provided"
    assert body_user["results"]["indices"]["ndvi"] == 0.6667
    assert body_user["results"]["indices"]["ndwi"] is None
    assert body_user["results"]["indices"]["evi"] is None

    # Without user bands & demo disabled -> live open STAC or unavailable (never demo data)
    res_unavail = client.post(
        "/api/v1/scientific/satellite/analyze",
        json={"latitude": 12.52, "longitude": 76.89, "use_demo_observation": False},
    )
    assert res_unavail.status_code == 200
    unavail_body = res_unavail.json()
    assert unavail_body["data_quality"] in {"live", "unavailable"}
    assert unavail_body["results"].get("is_demonstration_data", False) is False


# ---------------------------------------------------------------------------
# P4: AI Crop Diagnostics Image Validation & Model Unavailable Guard
# ---------------------------------------------------------------------------
def test_diagnostics_image_validation_and_unavailable_model():
    # 1. Invalid / corrupted image bytes must still be rejected cleanly
    res_bad = client.post(
        "/api/v1/scientific/diagnostics/analyze",
        data={"crop": "Tomato"},
        files={"file": ("bad.png", b"not-an-image", "image/png")},
    )
    assert res_bad.status_code == 200
    assert res_bad.json()["results"]["valid_image"] is False

    # 2. Valid PNG image when ONNX model is unavailable -> unavailable state (never random)
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), (48, 128, 48)).save(buf, format="PNG")
    valid_png_bytes = buf.getvalue()

    with patch(
        "backend.app.features.crop_diagnostics.service.check_model_availability",
        return_value={"model_available": False, "supported_crops": ["Tomato"], "supported_classes": []},
    ):
        res_valid = client.post(
            "/api/v1/scientific/diagnostics/analyze",
            data={"crop": "Tomato"},
            files={"file": ("leaf.png", valid_png_bytes, "image/png")},
        )
    assert res_valid.status_code == 200
    body = res_valid.json()
    assert body["data_quality"] == "unavailable"
    assert body["results"]["valid_image"] is True
    assert body["results"]["model_available"] is False
