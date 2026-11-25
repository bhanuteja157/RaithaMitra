# backend/tests/test_scientific_regression.py
"""
AD-05B Targeted Regression & Demonstration Scenario Tests.
Covers:
- GBIF Cotton -> Gossypium hirsutum regression (never Plantae)
- Europe PMC query formatting regression
- All 4 Judges' Demonstration Scenarios (A, B, C, D)
- Multilingual numerical consistency (en, kn, hi)
"""
import asyncio
from unittest.mock import AsyncMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.api.endpoints.scientific import router as scientific_router
from backend.app.api.endpoints.biointel_advanced import router as advanced_router
from backend.app.services.taxonomy_genomics_service import taxonomy_genomics_service
from backend.app.services.biotech_service import biotech_service
from backend.app.services.gemini_grounding_service import gemini_grounding_service

test_app = FastAPI()
test_app.include_router(scientific_router, prefix="/api/v1")
test_app.include_router(advanced_router, prefix="/api/v1")
client = TestClient(test_app)


def test_gbif_cotton_never_resolves_to_kingdom_plantae():
    """Regression: GBIF returning higher-rank Plantae must fall back to Gossypium hirsutum."""
    higher_rank_mock = {"usageKey": 6, "rank": "KINGDOM", "kingdom": "Plantae", "matchType": "EXACT"}
    with patch(
        "backend.app.services.taxonomy_genomics_service.fetch_json_with_resilience",
        new=AsyncMock(return_value=higher_rank_mock),
    ):
        sp = asyncio.run(taxonomy_genomics_service.validate_species_gbif("Cotton"))
        assert sp.accepted_scientific_name == "Gossypium hirsutum"
        assert sp.taxon_key == 2877842
        assert sp.family == "Malvaceae"


def test_europe_pmc_query_format_clean():
    q = biotech_service.construct_europe_pmc_query("Tomato", problem="Bacterial Wilt")
    assert '"Tomato"' in q
    assert "OR" not in q


def test_scenario_a_biotech_and_procurement_multilingual():
    for lang in ("en", "kn", "hi"):
        text, used_gemini = asyncio.run(
            gemini_grounding_service.generate_grounded_explanation(
                lang,
                "Tomato",
                "Solanum lycopersicum",
                "Arka Rakshak (F1 Hybrid)",
                "Strong",
                "26°C",
                "Red Sandy Loam (pH 6.5)",
                "Allocated 5000 seedlings",
                ["10.1007/s10681-023-03185-4"],
            )
        )
        assert used_gemini is False
        assert "Solanum lycopersicum" in text
        assert "Arka Rakshak" in text


def test_scenario_b_water_scarcity_irrigation():
    res = client.post(
        "/api/v1/scientific/irrigation/calculate",
        json={
            "farm_id": "farm_001",
            "crop_type": "Tomato",
            "crop_stage": "Mid-Season",
            "farm_area_ha": 2.5,
            "reference_et0_mm": 4.8,
            "effective_rainfall_mm": 0.0,
            "irrigation_method": "Drip Irrigation",
            "available_water_m3": 100.0,  # Scarce water triggers warning
            "flow_rate_m3_per_hr": 20.0,
        },
    )
    assert res.status_code == 200
    r = res.json()["results"]
    assert r["etc_mm_day"] == 5.52
    assert r["gross_volume_m3"] > 100.0
    assert len(r["water_availability_warnings"]) >= 1


def test_scenario_c_financial_risk_monte_carlo():
    res = client.post(
        "/api/v1/scientific/simulation/financial",
        json={
            "farm_id": "farm_001",
            "farm_area_ha": 2.5,
            "expected_yield_t_per_ha": 25.0,
            "market_price_inr_per_t": 22000.0,
            "crop_loss_pct": 8.0,
            "water_availability_pct": 90.0,
            "cultivation_expenses_inr": 85000.0,
            "transportation_expenses_inr": 18000.0,
            "num_trials": 5000,
            "random_seed": 42,
        },
    )
    assert res.status_code == 200
    mc = res.json()["results"]["monte_carlo"]
    assert mc["p10_downside_profit_inr"] < mc["median_p50_profit_inr"] < mc["p90_upside_profit_inr"]


def test_scenario_d_satellite_and_farm_twin():
    sat_res = client.post(
        "/api/v1/scientific/satellite/analyze",
        json={
            "farm_id": "farm_001",
            "latitude": 12.5234,
            "longitude": 76.8976,
            "nir_band": 0.44,
            "red_band": 0.08,
            "swir_band": 0.22,
            "blue_band": 0.05,
        },
    )
    assert sat_res.status_code == 200
    idx = sat_res.json()["results"]["indices"]
    assert idx["ndvi"] == 0.6923
    assert idx["ndwi"] == 0.3333
    assert idx["evi"] == 0.5825

    twin_res = client.post(
        "/api/v1/scientific/farm-twin/simulate",
        json={
            "farm_id": "farm_001",
            "farm_area_ha": 2.5,
            "crop_type": "Tomato",
            "rainfall_scenario_multiplier": 0.5,
            "irrigation_deficit_pct": 25.0,
        },
    )
    assert twin_res.status_code == 200
    assert len(twin_res.json()["results"]["zones"]) == 3
