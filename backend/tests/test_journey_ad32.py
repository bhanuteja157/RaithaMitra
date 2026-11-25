"""Comprehensive tests for AD-32 Unified Seed-to-Sale Journey."""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from backend.app.db.database import init_db
from backend.app.main import app


@pytest.fixture(autouse=True)
def _ensure_db():
    init_db()


def _farmer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_farmer"}


def _buyer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_buyer"}


def test_journey_creation_multiple_journeys_progress_and_optional_stages():
    client = TestClient(app)

    # Create Journey 1 (with seed_plan -> stage 1 auto-completed = 1/9 = 11.1%)
    j1 = client.post(
        "/api/v1/journeys",
        json={
            "farm_id": "farm_001",
            "crop_name": "Tomato",
            "crop_variety": "Arka Rakshak",
            "season": "Kharif 2026",
            "cultivated_area_acres": 2.0,
            "cultivation_budget_inr": 50000.0,
            "planned_sowing_date": "2026-09-01",
            "expected_harvest_date": "2026-12-01",
            "seed_plan": {"variety": "Arka Rakshak", "seed_kg": 0.3},
        },
        headers=_farmer_headers(),
    )
    assert j1.status_code == 200
    j1_id = j1.json()["id"]
    assert j1.json()["progress"]["completed_stages"] == 1
    assert j1.json()["progress"]["applicable_stages"] == 9

    # Create independent Journey 2 on the same farm
    j2 = client.post(
        "/api/v1/journeys",
        json={
            "farm_id": "farm_001",
            "crop_name": "Ragi",
            "season": "Rabi 2026",
            "cultivated_area_acres": 1.5,
            "cultivation_budget_inr": 25000.0,
            "planned_sowing_date": "2026-11-01",
            "expected_harvest_date": "2027-02-15",
        },
        headers=_farmer_headers(),
    )
    assert j2.status_code == 200
    assert j2.json()["id"] != j1_id

    # Mark stage 6 (post_harvest_storage) not_applicable on j1 -> applicable_stages becomes 8 (1/8 = 12.5%)
    na = client.patch(
        f"/api/v1/journeys/{j1_id}/stages/post_harvest_storage",
        json={"status": "not_applicable", "notes": "Direct farm-gate sale"},
        headers=_farmer_headers(),
    )
    assert na.status_code == 200

    # Record actual sowing activity with idempotency key -> completes land_prep_sowing (2/8 = 25.0%)
    idem = f"sow_{uuid.uuid4().hex[:8]}"
    act1 = client.post(
        f"/api/v1/journeys/{j1_id}/activities",
        json={
            "stage_key": "land_prep_sowing",
            "activity_type": "sowing",
            "title": "Transplanted Arka Rakshak seedlings",
            "recorded_date": "2026-09-03",
            "cost_inr": 2500.0,
            "idempotency_key": idem,
        },
        headers=_farmer_headers(),
    )
    assert act1.status_code == 200

    # Duplicate activity idempotency key rejected (409)
    act_dup = client.post(
        f"/api/v1/journeys/{j1_id}/activities",
        json={
            "stage_key": "land_prep_sowing",
            "activity_type": "sowing",
            "title": "Transplanted Arka Rakshak seedlings",
            "recorded_date": "2026-09-03",
            "cost_inr": 2500.0,
            "idempotency_key": idem,
        },
        headers=_farmer_headers(),
    )
    assert act_dup.status_code == 409

    det = client.get(f"/api/v1/journeys/{j1_id}", headers=_farmer_headers())
    assert det.status_code == 200
    d_body = det.json()
    assert d_body["journey"]["actual_sowing_date"] == "2026-09-03"
    assert d_body["progress"]["completed_stages"] == 2
    assert d_body["progress"]["applicable_stages"] == 8
    assert d_body["progress"]["progress_pct"] == 25.0
    assert d_body["financial_overview"]["recorded_journey_activity_costs_inr"] == 2500.0

    # Report endpoint
    rpt = client.get(f"/api/v1/journeys/{j1_id}/report", headers=_farmer_headers())
    assert rpt.status_code == 200
    assert rpt.json()["activities_count"] == 1


def test_module_linking_ownership_and_unauthorized_rejection():
    client = TestClient(app)

    j = client.post(
        "/api/v1/journeys",
        json={
            "farm_id": "farm_001",
            "crop_name": "Tomato",
            "season": "Test Link",
            "cultivated_area_acres": 1.0,
            "cultivation_budget_inr": 40000.0,
            "planned_sowing_date": "2026-10-01",
            "expected_harvest_date": "2026-12-20",
        },
        headers=_farmer_headers(),
    )
    j_id = j.json()["id"]

    # Create a harvest record owned by farmer & link it
    hrv = client.post(
        "/api/v1/post-harvest/harvests",
        json={
            "farm_id": "farm_001",
            "crop": "Tomato",
            "cultivated_area_ha": 0.4,
            "expected_harvest_date": "2026-12-20",
            "estimated_yield_kg": 1000,
            "actual_harvested_kg": 980,
        },
        headers=_farmer_headers(),
    )
    hrv_id = hrv.json()["id"]

    lnk = client.post(
        f"/api/v1/journeys/{j_id}/links",
        json={"stage_key": "harvest_planning", "source_module": "post_harvest_harvest", "record_id": hrv_id},
        headers=_farmer_headers(),
    )
    assert lnk.status_code == 200

    # Linking non-existent record rejected (404)
    bad_lnk = client.post(
        f"/api/v1/journeys/{j_id}/links",
        json={"stage_key": "harvest_planning", "source_module": "post_harvest_harvest", "record_id": "hrv_missing_999"},
        headers=_farmer_headers(),
    )
    assert bad_lnk.status_code == 404


def test_isolated_demo_journey_idempotency_and_calculations():
    client = TestClient(app)

    client.delete("/api/v1/journeys/demo/reset", headers=_farmer_headers())

    d1 = client.post("/api/v1/journeys/demo/init?farm_id=farm_001", headers=_farmer_headers())
    assert d1.status_code == 200
    assert d1.json()["already_exists"] is False
    calc = d1.json()["calculations"]
    assert calc["market_comparison"]["recommended_market"] == "Market B (Demo)"
    assert calc["market_comparison"]["net_advantage_over_next_inr"] == 2000.0
    assert calc["sell_vs_store"]["comparison"]["additional_return_from_storage_inr"] == 1200.0
    assert calc["shared_machinery"]["total_savings_inr"] == 2100.0

    # Calling init again is idempotent (no duplicate demo journey)
    d2 = client.post("/api/v1/journeys/demo/init?farm_id=farm_001", headers=_farmer_headers())
    assert d2.status_code == 200
    assert d2.json()["already_exists"] is True
    assert d2.json()["journey_id"] == d1.json()["journey_id"]


def test_cross_account_isolation_and_assistant_journey_query():
    client = TestClient(app)

    # Buyer blocked from farmer journeys (403)
    unauth = client.get("/api/v1/journeys", headers=_buyer_headers())
    assert unauth.status_code == 403

    # Assistant query
    chat = client.post(
        "/api/v1/assistant/chat",
        json={"farm_id": "farm_001", "message": "Show my tomato journey and current stage"},
        headers=_farmer_headers(),
    )
    assert chat.status_code == 200
    body = chat.json()
    assert body["intent"] == "crop_journey_query"
    assert "get_active_crop_journey" in body["tools_used"]
    assert len(body["cards"]) >= 1
