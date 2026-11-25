"""Comprehensive tests for AD-29 Live Agricultural Market Intelligence & Statistical Forecasting."""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.app.db.database import get_db_connection, init_db
from backend.app.features.market_intelligence.normalization import (
    normalize_commodity_name,
    normalize_market_record,
    sanitize_csv_cell,
)
from backend.app.main import app


@pytest.fixture(autouse=True)
def _ensure_db():
    init_db()


def _farmer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_farmer"}


def _buyer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_buyer"}


def test_normalization_unit_conversions_and_formula_sanitization():
    assert normalize_commodity_name("Paddy(Dhan)(Common)") == "Paddy"
    assert normalize_commodity_name("tamatar") == "Tomato"
    assert sanitize_csv_cell("=CMD('calc')") == "CMD('calc')"

    qtl = normalize_market_record(
        commodity="Tomato",
        state="Karnataka",
        district="Mandya",
        market="Mandya APMC",
        observation_date="20/11/2026",
        modal_price=2400.0,
        min_price=2000.0,
        max_price=2700.0,
        unit="INR/Quintal",
    )
    assert qtl is not None
    assert qtl["observation_date"] == "2026-11-20"
    assert qtl["modal_price_per_quintal"] == 2400.0
    assert qtl["modal_price_per_kg"] == 24.0

    # Rejects negative or min > max
    assert normalize_market_record(
        commodity="Tomato", state="Karnataka", district="Mandya", market="Mandya",
        observation_date="2026-11-20", modal_price=-10,
    ) is None
    assert normalize_market_record(
        commodity="Tomato", state="Karnataka", district="Mandya", market="Mandya",
        observation_date="2026-11-20", modal_price=20, min_price=30, max_price=25,
    ) is None


def test_mocked_agmarknet_fetch_persistence_dedup_and_offline_cache_fallback():
    client = TestClient(app)
    conn = get_db_connection()
    conn.execute("DELETE FROM market_price_observations WHERE market = 'Tumakuru Test APMC'")
    conn.commit()
    conn.close()

    mock_live = {
        "status": "live",
        "records": [
            normalize_market_record(
                commodity="Tomato",
                state="Karnataka",
                district="Tumakuru",
                market="Tumakuru Test APMC",
                observation_date="2026-11-22",
                modal_price=2600.0,
                min_price=2200.0,
                max_price=2800.0,
                unit="INR/Quintal",
                source_type="official_agmarknet",
            )
        ],
    }

    with patch(
        "backend.app.features.market_intelligence.service.fetch_agmarknet_records",
        new=AsyncMock(return_value=mock_live),
    ):
        r1 = client.post(
            "/api/v1/market-intelligence/fetch-live",
            json={"commodity": "Tomato", "state": "Karnataka", "district": "Tumakuru"},
            headers=_farmer_headers(),
        )
        assert r1.status_code == 200
        assert r1.json()["is_live"] is True
        assert r1.json()["persisted"]["inserted"] == 1

        # Second fetch of same scene deduplicates cleanly
        r2 = client.post(
            "/api/v1/market-intelligence/fetch-live",
            json={"commodity": "Tomato", "state": "Karnataka", "district": "Tumakuru"},
            headers=_farmer_headers(),
        )
        assert r2.status_code == 200
        assert r2.json()["persisted"]["skipped"] == 1

    # Provider failure falls back to cached official observations
    with patch(
        "backend.app.features.market_intelligence.service.fetch_agmarknet_records",
        new=AsyncMock(return_value={"status": "unavailable", "records": [], "error": "Timeout"}),
    ):
        fb = client.post(
            "/api/v1/market-intelligence/fetch-live",
            json={"commodity": "Tomato", "state": "Karnataka", "district": "Tumakuru"},
            headers=_farmer_headers(),
        )
        assert fb.status_code == 200
        assert fb.json()["is_live"] is False
        assert fb.json()["cache_fallback"] is True
        assert len(fb.json()["records"]) >= 1


def test_csv_import_and_walk_forward_forecasting_vs_insufficient_data():
    client = TestClient(app)
    conn = get_db_connection()
    conn.execute("DELETE FROM market_price_observations WHERE commodity = 'Onion'")
    conn.commit()
    conn.close()

    # Insufficient data (< 5 records)
    no_fc = client.get("/api/v1/market-intelligence/history?commodity=Onion&horizon_days=7")
    assert no_fc.status_code == 200
    assert no_fc.json()["forecast"]["available"] is False

    # Import 7 chronological Onion observations via CSV
    csv_payload = "\n".join([
        "commodity,state,district,market,observation_date,modal_price,unit",
        "Onion,Karnataka,Kolar,Kolar APMC,2026-11-10,2000,INR/Quintal",
        "Onion,Karnataka,Kolar,Kolar APMC,2026-11-12,2100,INR/Quintal",
        "Onion,Karnataka,Kolar,Kolar APMC,2026-11-14,2150,INR/Quintal",
        "Onion,Karnataka,Kolar,Kolar APMC,2026-11-16,2250,INR/Quintal",
        "Onion,Karnataka,Kolar,Kolar APMC,2026-11-18,2300,INR/Quintal",
        "Onion,Karnataka,Kolar,Kolar APMC,2026-11-20,2400,INR/Quintal",
        "Onion,Karnataka,Kolar,Kolar APMC,2026-11-22,2500,INR/Quintal",
    ])
    imp = client.post(
        "/api/v1/market-intelligence/import-csv",
        json={"filename": "kolar_onion.csv", "csv_text": csv_payload},
        headers=_farmer_headers(),
    )
    assert imp.status_code == 200
    assert imp.json()["inserted"] == 7

    fc = client.get("/api/v1/market-intelligence/history?commodity=Onion&horizon_days=7")
    assert fc.status_code == 200
    body = fc.json()
    assert body["history"]["observation_count"] == 7
    assert body["forecast"]["available"] is True
    assert len(body["forecast"]["forecast"]) == 7
    assert body["forecast"]["validation_metrics"]["rmse_per_kg"] >= 0.0


def test_jury_demonstration_market_net_return_and_buyer_offer():
    client = TestClient(app)
    resp = client.post(
        "/api/v1/market-intelligence/compare-markets",
        json={
            "commodity": "Tomato",
            "available_quantity_kg": 2000,
            "markets": [
                {"market_name": "Market A", "selling_price_per_kg": 25, "transport_cost_inr": 8000},
                {"market_name": "Market B", "selling_price_per_kg": 23, "transport_cost_inr": 2000},
            ],
        },
        headers=_farmer_headers(),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["recommended_market"] == "Market B"
    assert body["recommended_net_return_inr"] == 44000.0
    assert body["net_advantage_over_next_inr"] == 2000.0
    assert body["ranked_markets"][1]["gross_revenue_inr"] == 50000.0
    assert body["ranked_markets"][1]["net_selling_return_inr"] == 42000.0

    offer = client.post(
        "/api/v1/market-intelligence/compare-offer",
        json={
            "commodity": "Tomato",
            "quantity_kg": 2000,
            "buyer_offer_per_kg": 24,
            "buyer_transport_cost_inr": 1000,
            "benchmark_market_name": "Market B",
            "benchmark_price_per_kg": 23,
            "benchmark_transport_cost_inr": 2000,
        },
        headers=_farmer_headers(),
    )
    assert offer.status_code == 200
    assert offer.json()["offer_net_return_inr"] == 47000.0
    assert offer.json()["auto_accept"] is False


def test_alerts_cross_user_isolation_and_assistant_market_query():
    client = TestClient(app)

    # Buyer blocked from farmer-only market endpoints
    unauth = client.get("/api/v1/market-intelligence/alerts", headers=_buyer_headers())
    assert unauth.status_code == 403

    # Save alert target & evaluate against Onion 25/kg
    pref = client.post(
        "/api/v1/market-intelligence/alerts/preferences",
        json={"commodity": "Onion", "target_price_per_kg": 24.0},
        headers=_farmer_headers(),
    )
    assert pref.status_code == 200
    alerts = client.get("/api/v1/market-intelligence/alerts", headers=_farmer_headers())
    assert alerts.status_code == 200
    assert len(alerts.json()["alerts"]) >= 1

    # Assistant query
    chat = client.post(
        "/api/v1/assistant/chat",
        json={"farm_id": "farm_001", "message": "What is the latest market price for onion?"},
        headers=_farmer_headers(),
    )
    assert chat.status_code == 200
    body = chat.json()
    assert body["intent"] == "market_intelligence_query"
    assert "get_market_intelligence" in body["tools_used"]
    assert len(body["cards"]) >= 1
