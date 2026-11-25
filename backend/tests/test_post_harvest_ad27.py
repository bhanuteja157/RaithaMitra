"""Comprehensive tests for AD-27 Post-Harvest Intelligence, Cold Storage & Economic Optimization."""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from backend.app.db.database import get_db_connection, init_db
from backend.app.features.post_harvest.storage_knowledge import list_supported_crops
from backend.app.main import app


@pytest.fixture(autouse=True)
def _ensure_db():
    init_db()


def _farmer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_farmer"}


def _buyer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_buyer"}


def test_storage_knowledge_base_covers_15_crops_and_non_refrigerated_grains():
    crops = list_supported_crops()
    names = {c["crop"] for c in crops}
    required = {
        "Tomato", "Potato", "Onion", "Paddy", "Wheat", "Maize",
        "Banana", "Mango", "Chilli", "Groundnut", "Cotton", "Ragi",
        "Carrot", "Cabbage", "Grapes",
    }
    assert required.issubset(names)

    by_name = {c["crop"]: c for c in crops}
    assert by_name["Paddy"]["requires_refrigeration"] is False
    assert by_name["Cotton"]["requires_refrigeration"] is False
    assert by_name["Tomato"]["requires_refrigeration"] is True
    assert by_name["Banana"]["chilling_threshold_c"] == 12.0


def test_jury_demonstration_economic_formulas_and_monte_carlo():
    client = TestClient(app)
    resp = client.post(
        "/api/v1/post-harvest/economic-compare",
        json={
            "commodity": "Tomato",
            "available_quantity_kg": 2000,
            "current_price_per_kg": 25,
            "immediate_transport_cost_inr": 3000,
            "storage_duration_days": 5,
            "expected_future_price_per_kg": 30,
            "estimated_loss_pct": 8,
            "storage_charges_inr": 4000,
            "future_transport_cost_inr": 3000,
            "run_monte_carlo": True,
            "num_trials": 1000,
            "random_seed": 42,
        },
        headers=_farmer_headers(),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["immediate_sale"]["gross_revenue_inr"] == 50000.0
    assert body["immediate_sale"]["net_return_inr"] == 47000.0
    assert body["delayed_sale"]["future_saleable_quantity_kg"] == 1840.0
    assert body["delayed_sale"]["gross_revenue_inr"] == 55200.0
    assert body["delayed_sale"]["net_return_inr"] == 48200.0
    assert body["comparison"]["additional_return_from_storage_inr"] == 1200.0
    assert body["comparison"]["break_even_future_price_per_kg"] == pytest.approx(29.35, abs=0.01)
    assert body["comparison"]["recommendation"] == "store_for_future_sale"
    assert body["monte_carlo"]["is_stochastic_estimate"] is True
    assert 0.0 <= body["monte_carlo"]["prob_store_outperforms_sell_now_pct"] <= 100.0

    # Higher spoilage makes storage unprofitable
    worse = client.post(
        "/api/v1/post-harvest/economic-compare",
        json={
            "commodity": "Tomato",
            "available_quantity_kg": 2000,
            "current_price_per_kg": 25,
            "immediate_transport_cost_inr": 3000,
            "storage_duration_days": 5,
            "expected_future_price_per_kg": 30,
            "estimated_loss_pct": 25,
            "storage_charges_inr": 4000,
            "future_transport_cost_inr": 3000,
        },
        headers=_farmer_headers(),
    )
    assert worse.status_code == 200
    assert worse.json()["comparison"]["recommendation"] == "sell_immediately"


def test_shelf_life_and_spoilage_risk_engines():
    client = TestClient(app)
    sl = client.post(
        "/api/v1/post-harvest/shelf-life",
        json={"crop": "Tomato", "current_temp_c": 29.0, "current_rh_pct": 80.0, "observed_damage_pct": 5.0},
        headers=_farmer_headers(),
    )
    assert sl.status_code == 200
    assert sl.json()["is_rule_based_estimate"] is True
    assert sl.json()["estimated_remaining_shelf_life_days"]["min"] >= 0

    rk = client.post(
        "/api/v1/post-harvest/spoilage-risk",
        json={
            "crop": "Banana",
            "storage_duration_days": 10,
            "current_temp_c": 8.0,  # Below Banana 12°C chilling threshold!
            "observed_damage_pct": 10.0,
            "moisture_exposure": True,
        },
        headers=_farmer_headers(),
    )
    assert rk.status_code == 200
    rk_body = rk.json()
    assert rk_body["risk_level"] in ("high", "critical")
    assert any("Chilling stress" in f for f in rk_body["contributing_factors"])


def test_harvest_inventory_lifecycle_guards_bidding_transport_and_finance():
    client = TestClient(app)

    # 1. Create Harvest
    hrv = client.post(
        "/api/v1/post-harvest/harvests",
        json={
            "farm_id": "farm_001",
            "crop": "Tomato",
            "cultivated_area_ha": 1.0,
            "expected_harvest_date": "2026-11-26",
            "estimated_yield_kg": 2000,
            "actual_harvested_kg": 1950,
        },
        headers=_farmer_headers(),
    )
    assert hrv.status_code == 200
    hrv_id = hrv.json()["id"]

    # 2. Create Inventory Lot
    lot_resp = client.post(
        "/api/v1/post-harvest/inventory",
        json={
            "farm_id": "farm_001",
            "harvest_record_id": hrv_id,
            "crop": "Tomato",
            "harvest_date": "2026-11-26",
            "initial_quantity_kg": 1000,
        },
        headers=_farmer_headers(),
    )
    assert lot_resp.status_code == 200
    lot_id = lot_resp.json()["id"]

    # 3. Invalid negative / zero quantity rejected
    bad_qty = client.post(
        "/api/v1/post-harvest/inventory",
        json={"farm_id": "farm_001", "crop": "Tomato", "harvest_date": "2026-11-26", "initial_quantity_kg": -10},
        headers=_farmer_headers(),
    )
    assert bad_qty.status_code == 422

    # 4. Prevent negative inventory
    over_draw = client.post(
        f"/api/v1/post-harvest/inventory/{lot_id}/events",
        json={"event_type": "sale", "quantity_kg": 1500},
        headers=_farmer_headers(),
    )
    assert over_draw.status_code == 400

    # 5. Idempotency prevents duplicate deduction
    idem_key = f"test_idem_{uuid.uuid4().hex[:8]}"
    ev1 = client.post(
        f"/api/v1/post-harvest/inventory/{lot_id}/events",
        json={"event_type": "damage", "quantity_kg": 100, "idempotency_key": idem_key},
        headers=_farmer_headers(),
    )
    assert ev1.status_code == 200
    assert ev1.json()["lot"]["available_quantity_kg"] == 900.0

    ev2 = client.post(
        f"/api/v1/post-harvest/inventory/{lot_id}/events",
        json={"event_type": "damage", "quantity_kg": 100, "idempotency_key": idem_key},
        headers=_farmer_headers(),
    )
    assert ev2.status_code == 409

    # 6. Smart Bidding listing reservation from remaining 900 kg
    bid = client.post(
        f"/api/v1/post-harvest/inventory/{lot_id}/create-listing",
        json={"quantity_kg": 400, "min_price_per_kg": 26, "bidding_deadline": "2026-12-05"},
        headers=_farmer_headers(),
    )
    assert bid.status_code == 200
    assert bid.json()["lot"]["available_quantity_kg"] == 500.0
    assert bid.json()["lot"]["reserved_quantity_kg"] == 400.0

    # 7. Transport Connect compatibility check
    tr = client.post(
        f"/api/v1/post-harvest/inventory/{lot_id}/prepare-transport",
        json={"quantity_kg": 500, "route_type": "farm_to_market", "destination": "Mandya APMC", "estimated_distance_km": 30},
        headers=_farmer_headers(),
    )
    assert tr.status_code == 200
    assert tr.json()["crop"] == "Tomato"

    # 8. Storage plan syncs to AD-24 financial_transactions
    stg = client.post(
        "/api/v1/post-harvest/storage",
        json={
            "farm_id": "farm_001",
            "lot_id": lot_id,
            "facility_name": "Mandya Test Cold Store",
            "commodity": "Tomato",
            "quantity_kg": 500,
            "start_date": "2026-11-26",
            "expected_retrieval_date": "2026-12-01",
            "storage_rate_inr_per_day": 800,
            "sync_to_finance": True,
            "finance_status": "estimated",
        },
        headers=_farmer_headers(),
    )
    assert stg.status_code == 200
    fin_tx_id = stg.json()["financial_tx_id"]
    conn = get_db_connection()
    tx_row = conn.execute("SELECT * FROM financial_transactions WHERE id = ?", (fin_tx_id,)).fetchone()
    conn.close()
    assert tx_row is not None
    assert tx_row["category"] == "storage"
    assert tx_row["status"] == "estimated"


def test_cross_user_isolation_and_assistant_post_harvest_query():
    client = TestClient(app)

    # Buyer rejected with 403
    unauth = client.get("/api/v1/post-harvest/summary?farm_id=farm_001", headers=_buyer_headers())
    assert unauth.status_code == 403

    # Assistant query
    chat = client.post(
        "/api/v1/assistant/chat",
        json={"farm_id": "farm_001", "message": "How long can I store my tomatoes and what is my inventory level?"},
        headers=_farmer_headers(),
    )
    assert chat.status_code == 200
    body = chat.json()
    assert body["intent"] == "post_harvest_query"
    assert "get_post_harvest_intelligence" in body["tools_used"]
    assert len(body["cards"]) >= 1
