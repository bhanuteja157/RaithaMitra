"""Comprehensive tests for AD-30 Centralized Agricultural Decision Intelligence."""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from backend.app.db.database import init_db
from backend.app.features.decision_intelligence.conflict_resolver import detect_and_resolve_conflicts
from backend.app.features.decision_intelligence.evidence_registry import (
    is_actionable_evidence,
    make_evidence,
)
from backend.app.features.decision_intelligence.optimizer import rank_decision_alternatives
from backend.app.main import app
from backend.app.schemas.farm import Farm


@pytest.fixture(autouse=True)
def _ensure_db():
    init_db()


def _farmer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_farmer"}


def _buyer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_buyer"}


def test_evidence_isolation_and_budget_hard_constraints():
    demo_ev = make_evidence(
        farm_id="farm_001",
        source_module="market",
        source_provider="Demo",
        observed_value=25.0,
        unit="INR/kg",
        classification="demonstration",
        data_quality="demo",
        freshness="static",
    )
    real_ev = make_evidence(
        farm_id="farm_001",
        source_module="finance",
        source_provider="AD-24",
        observed_value=50000.0,
        unit="INR",
        classification="user_entered",
        data_quality="verified_ledger",
        freshness="current",
    )
    assert is_actionable_evidence(demo_ev) is False
    assert is_actionable_evidence(real_ev) is True

    # Scenario 1: Premium cultivation plan ₹71,350 vs ₹50,000 budget -> shortfall ₹21,350
    ranked = rank_decision_alternatives(
        candidates=[
            {"id": "prem", "title": "Premium Hybrid Plan", "estimated_cost_inr": 71350.0, "profit_score": 95},
            {"id": "op", "title": "Feasible Open-Pollinated Plan", "estimated_cost_inr": 38000.0, "profit_score": 72},
        ],
        preference_profile="max_profit",
        remaining_budget_inr=50000.0,
    )
    top = ranked["ranked_alternatives"][0]
    infeasible = ranked["ranked_alternatives"][1]
    assert top["id"] == "op"
    assert top["feasible"] is True
    assert infeasible["id"] == "prem"
    assert infeasible["feasible"] is False
    assert any("21,350" in msg for msg in infeasible["hard_constraint_failures"])


def test_conflict_detection_irrigation_rain_and_satellite_stress():
    farm = Farm(
        id="farm_001",
        farmer_name="Suresh",
        preferred_language="en",
        farm_name="Test Farm",
        village="Mandya",
        district="Mandya",
        state="Karnataka",
        latitude=12.52,
        longitude=76.89,
        land_area_ha=1.0,
        primary_crop="Tomato",
        sowing_date="2026-10-01",
        crop_stage="Mid-Season",
        soil_type="Loamy",
        irrigation_method="Drip Irrigation",
        water_source="Borewell",
        available_water_m3=10000.0,
        cultivation_budget_inr=50000.0,
        created_at="2026-10-01T00:00:00Z",
        updated_at="2026-10-01T00:00:00Z",
    )
    ctx = {
        "farm": farm,
        "weather": {"available": True, "rain_48h_mm": 24.0, "water_demand_mm_day": 4.5},
        "finance": {"allocated_budget_inr": 50000.0, "remaining_budget_inr": -2000.0, "committed_expenses_inr": 52000.0, "actual_recorded_expenses_inr": 30000.0},
        "satellite": {"ndvi": 0.32, "acquisition_date": "2026-11-22"},
        "post_harvest": {"summary": {"total_available_kg": 1000.0}, "harvests": []},
        "equipment": {"bookings": [{"id": "b1"}]},
        "labour": {"open_jobs": []},
        "market": {"observations": []},
    }
    conflicts = detect_and_resolve_conflicts(ctx)
    ids = {c["conflict_id"] for c in conflicts}
    assert "CONF_A_IRRIGATION_RAIN" in ids
    assert "CONF_BH_BUDGET_PRESSURE" in ids
    assert "CONF_D_STORAGE_SPOILAGE" in ids
    assert "CONF_F_EQUIPMENT_LABOUR" in ids
    assert "CONF_G_SATELLITE_STRESS" in ids


def test_unified_evaluate_history_actions_preferences_and_simulator():
    client = TestClient(app)

    # Update preference profile
    pref = client.put(
        "/api/v1/decision-intelligence/preferences",
        json={"preference_profile": "water_conservation"},
        headers=_farmer_headers(),
    )
    assert pref.status_code == 200
    assert pref.json()["preference_profile"] == "water_conservation"

    # Evaluate unified decisions (persisted)
    ev = client.post(
        "/api/v1/decision-intelligence/evaluate",
        json={"farm_id": "farm_001", "persist_run": True},
        headers=_farmer_headers(),
    )
    assert ev.status_code == 200
    body = ev.json()
    assert body["action_plan"]["preference_profile"] == "water_conservation"
    assert len(body["evidence"]) >= 4
    assert len(body["action_plan"]["ranked_recommendations"]) >= 2
    rec_id = body["action_plan"]["ranked_recommendations"][0]["id"]

    # Update recommendation status (does not execute external transaction)
    st = client.patch(
        f"/api/v1/decision-intelligence/recommendations/{rec_id}/status",
        json={"status": "accepted"},
        headers=_farmer_headers(),
    )
    assert st.status_code == 200
    assert st.json()["status"] == "accepted"

    # Authorized action preview + confirm + replay protection (409)
    idem = f"dact_{uuid.uuid4().hex[:8]}"
    prev = client.post(
        "/api/v1/decision-intelligence/actions/preview",
        json={
            "run_id": body["run_id"],
            "recommendation_id": rec_id,
            "farm_id": "farm_001",
            "action_type": "prepare_irrigation",
            "payload": {"delay_hours": 48},
            "idempotency_key": idem,
        },
        headers=_farmer_headers(),
    )
    assert prev.status_code == 200
    act_id = prev.json()["id"]

    conf1 = client.post(
        f"/api/v1/decision-intelligence/actions/{act_id}/confirm",
        headers=_farmer_headers(),
    )
    assert conf1.status_code == 200
    assert conf1.json()["status"] == "confirmed"

    conf2 = client.post(
        f"/api/v1/decision-intelligence/actions/{act_id}/confirm",
        headers=_farmer_headers(),
    )
    assert conf2.status_code == 409

    # What-if simulator
    sim = client.post(
        "/api/v1/decision-intelligence/simulate",
        json={
            "farm_id": "farm_001",
            "crop": "Tomato",
            "farm_area_acres": 2.0,
            "cultivation_budget_inr": 50000,
            "expected_yield_kg": 4000,
            "market_price_per_kg": 25,
            "estimated_spoilage_pct": 10,
        },
        headers=_farmer_headers(),
    )
    assert sim.status_code == 200
    assert sim.json()["persisted_to_ledger"] is False
    assert sim.json()["economics"]["saleable_quantity_kg"] == 3600.0

    # History & Feedback
    fb = client.post(
        "/api/v1/decision-intelligence/feedback",
        json={"run_id": body["run_id"], "farm_id": "farm_001", "followed": True, "outcome_notes": "Saved electricity"},
        headers=_farmer_headers(),
    )
    assert fb.status_code == 200
    hist = client.get("/api/v1/decision-intelligence/history?farm_id=farm_001", headers=_farmer_headers())
    assert hist.status_code == 200
    assert len(hist.json()["runs"]) >= 1
    assert len(hist.json()["feedback"]) >= 1


def test_cross_account_isolation_and_assistant_decision_query():
    client = TestClient(app)

    unauth = client.post(
        "/api/v1/decision-intelligence/evaluate",
        json={"farm_id": "farm_001"},
        headers=_buyer_headers(),
    )
    assert unauth.status_code == 403

    chat = client.post(
        "/api/v1/assistant/chat",
        json={"farm_id": "farm_001", "message": "What should I do on my farm today?"},
        headers=_farmer_headers(),
    )
    assert chat.status_code == 200
    body = chat.json()
    assert body["intent"] == "decision_intelligence_query"
    assert "get_farm_decision_summary" in body["tools_used"]
    assert len(body["cards"]) >= 1
