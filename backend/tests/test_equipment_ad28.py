"""Comprehensive tests for AD-28 Equipment Sharing & Resource Optimization."""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from backend.app.db.database import get_db_connection, init_db
from backend.app.features.equipment.compatibility import estimate_operation_duration
from backend.app.features.equipment.pricing import calculate_rental_cost
from backend.app.main import app


@pytest.fixture(autouse=True)
def _ensure_db():
    init_db()


def _farmer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_farmer"}


def _buyer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_buyer"}


def test_pricing_models_and_work_duration_formulas():
    dur = estimate_operation_duration(
        farm_area_acres=2.0,
        effective_field_capacity_ha_hr=0.404686,
        theoretical_capacity_ha_hr=0.55,
        setup_minutes=0,
        travel_minutes=0,
    )
    assert dur["farm_area_ha"] == pytest.approx(0.8094, abs=1e-4)
    assert dur["estimated_operating_hours"] == pytest.approx(2.0, abs=0.05)

    hourly = calculate_rental_cost(
        rental_rate_inr=800,
        rate_unit="hourly",
        duration_hours=3,
        farm_area_acres=2,
        operator_available=True,
        include_operator=True,
        operator_charge_inr=200,
        fuel_included=False,
        fuel_charge_inr=300,
        delivery_charge_inr=500,
        setup_charge_inr=100,
    )
    assert hourly["base_rental_inr"] == 2400.0
    assert hourly["total_cost_inr"] == 3500.0

    per_acre = calculate_rental_cost(
        rental_rate_inr=600,
        rate_unit="per_acre",
        duration_hours=2,
        farm_area_acres=3,
        operator_available=False,
        include_operator=False,
        operator_charge_inr=0,
        fuel_included=True,
        fuel_charge_inr=0,
        delivery_charge_inr=0,
        setup_charge_inr=0,
    )
    assert per_acre["base_rental_inr"] == 1800.0


def test_ortools_shared_jury_demo_and_infeasible_scenarios():
    client = TestClient(app)

    # Jury Demo Scenario: 3 farmers, 800/hr, 1200 ind delivery vs 1500 shared delivery
    resp = client.post(
        "/api/v1/equipment/shared-optimize?persist=false",
        json={
            "operation_type": "Land Preparation",
            "target_date": "2026-12-01",
            "hourly_rate_inr": 800,
            "individual_delivery_charge_inr": 1200,
            "shared_delivery_charge_inr": 1500,
            "setup_minutes_between_farms": 0,
            "participants": [
                {"farmer_label": "Farmer A", "area_acres": 2, "required_hours": 2, "consented": True},
                {"farmer_label": "Farmer B", "area_acres": 3, "required_hours": 3, "consented": True},
                {"farmer_label": "Farmer C", "area_acres": 1, "required_hours": 1, "consented": True},
            ],
        },
        headers=_farmer_headers(),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["feasible"] is True
    assert body["total_operating_hours"] == 6.0
    assert body["base_rental_total_inr"] == 4800.0
    assert body["total_individual_cost_inr"] == 8400.0
    assert body["total_shared_cost_inr"] == 6300.0
    assert body["total_savings_inr"] == 2100.0
    assert body["savings_pct"] == 25.0

    allocs = {row["farmer_label"]: row for row in body["schedule"]}
    assert allocs["Farmer A"]["individual_cost_inr"] == 2800.0
    assert allocs["Farmer A"]["allocated_total_inr"] == 2100.0
    assert allocs["Farmer A"]["savings_inr"] == 700.0
    assert allocs["Farmer B"]["individual_cost_inr"] == 3600.0
    assert allocs["Farmer B"]["allocated_total_inr"] == 2900.0
    assert allocs["Farmer C"]["individual_cost_inr"] == 2000.0
    assert allocs["Farmer C"]["allocated_total_inr"] == 1300.0

    # Infeasible: missing consent
    no_consent = client.post(
        "/api/v1/equipment/shared-optimize?persist=false",
        json={
            "operation_type": "Land Preparation",
            "target_date": "2026-12-01",
            "hourly_rate_inr": 800,
            "participants": [
                {"farmer_label": "Farmer A", "area_acres": 2, "required_hours": 2, "consented": True},
                {"farmer_label": "Farmer B", "area_acres": 3, "required_hours": 3, "consented": False},
            ],
        },
        headers=_farmer_headers(),
    )
    assert no_consent.status_code == 200
    assert no_consent.json()["feasible"] is False

    # Infeasible: exceeds daily 14h operating window
    too_long = client.post(
        "/api/v1/equipment/shared-optimize?persist=false",
        json={
            "operation_type": "Land Preparation",
            "target_date": "2026-12-01",
            "hourly_rate_inr": 800,
            "participants": [
                {"farmer_label": "Farmer A", "area_acres": 8, "required_hours": 10, "consented": True},
                {"farmer_label": "Farmer B", "area_acres": 8, "required_hours": 10, "consented": True},
            ],
        },
        headers=_farmer_headers(),
    )
    assert too_long.status_code == 200
    assert too_long.json()["feasible"] is False


def test_equipment_registration_booking_double_booking_maintenance_and_finance():
    client = TestClient(app)

    # 1. Register equipment
    reg = client.post(
        "/api/v1/equipment/listings",
        json={
            "equipment_name": "John Deere 5050D Test Tractor",
            "category": "Tractor",
            "rental_rate_inr": 800,
            "rate_unit": "hourly",
            "effective_field_capacity_ha_hr": 0.45,
            "suitable_operations": ["Land Preparation", "Sowing"],
            "location_label": "Mandya, Karnataka",
        },
        headers=_farmer_headers(),
    )
    assert reg.status_code == 200
    eq_id = reg.json()["id"]

    # 2. Discovery finds the registered tractor
    disc = client.get("/api/v1/equipment/listings?category=Tractor")
    assert disc.status_code == 200
    assert any(item["id"] == eq_id for item in disc.json()["equipment"])

    # 3. Record maintenance block on 2026-12-10 08:00-12:00
    mnt = client.post(
        f"/api/v1/equipment/listings/{eq_id}/maintenance",
        json={
            "maintenance_type": "Oil & Filter Service",
            "maintenance_date": "2026-12-10",
            "operating_hours": 150,
            "cost_inr": 1500,
            "block_start_datetime": "2026-12-10T08:00:00",
            "block_end_datetime": "2026-12-10T12:00:00",
        },
        headers=_farmer_headers(),
    )
    assert mnt.status_code == 200

    # Booking overlapping maintenance window is rejected with 409
    blk_bk = client.post(
        "/api/v1/equipment/bookings",
        json={
            "equipment_id": eq_id,
            "farm_id": "farm_001",
            "operation_type": "Land Preparation",
            "booking_date": "2026-12-10",
            "start_datetime": "2026-12-10T09:00:00",
            "end_datetime": "2026-12-10T11:00:00",
            "duration_hours": 2,
        },
        headers=_farmer_headers(),
    )
    assert blk_bk.status_code == 409

    # 4. Valid booking on 2026-12-12 08:00-10:00
    idem = f"eq_idem_{uuid.uuid4().hex[:8]}"
    bk1 = client.post(
        "/api/v1/equipment/bookings",
        json={
            "equipment_id": eq_id,
            "farm_id": "farm_001",
            "operation_type": "Land Preparation",
            "booking_date": "2026-12-12",
            "start_datetime": "2026-12-12T08:00:00",
            "end_datetime": "2026-12-12T10:00:00",
            "duration_hours": 2,
            "idempotency_key": idem,
        },
        headers=_farmer_headers(),
    )
    assert bk1.status_code == 200
    bk1_id = bk1.json()["id"]
    fin_tx_id = bk1.json()["financial_tx_id"]

    # Duplicate idempotency key rejected (409)
    dup_bk = client.post(
        "/api/v1/equipment/bookings",
        json={
            "equipment_id": eq_id,
            "farm_id": "farm_001",
            "operation_type": "Land Preparation",
            "booking_date": "2026-12-12",
            "start_datetime": "2026-12-12T08:00:00",
            "end_datetime": "2026-12-12T10:00:00",
            "duration_hours": 2,
            "idempotency_key": idem,
        },
        headers=_farmer_headers(),
    )
    assert dup_bk.status_code == 409

    # Accept booking -> reserves equipment
    acc = client.patch(
        f"/api/v1/equipment/bookings/{bk1_id}/status",
        json={"status": "accepted"},
        headers=_farmer_headers(),
    )
    assert acc.status_code == 200
    assert acc.json()["status"] == "accepted"

    # Overlapping booking now rejected (double-booking prevention)
    overlap = client.post(
        "/api/v1/equipment/bookings",
        json={
            "equipment_id": eq_id,
            "farm_id": "farm_001",
            "operation_type": "Land Preparation",
            "booking_date": "2026-12-12",
            "start_datetime": "2026-12-12T09:00:00",
            "end_datetime": "2026-12-12T11:00:00",
            "duration_hours": 2,
        },
        headers=_farmer_headers(),
    )
    assert overlap.status_code == 409

    # Complete booking -> payment_status remains unpaid!
    comp = client.patch(
        f"/api/v1/equipment/bookings/{bk1_id}/status",
        json={"status": "completed"},
        headers=_farmer_headers(),
    )
    assert comp.status_code == 200
    assert comp.json()["status"] == "completed"
    assert comp.json()["payment_status"] == "unpaid"

    # Invalid transition from completed -> cancelled rejected (400)
    bad_tr = client.patch(
        f"/api/v1/equipment/bookings/{bk1_id}/status",
        json={"status": "cancelled"},
        headers=_farmer_headers(),
    )
    assert bad_tr.status_code == 400

    # Separate payment settlement
    settle = client.post(
        f"/api/v1/equipment/bookings/{bk1_id}/settle",
        headers=_farmer_headers(),
    )
    assert settle.status_code == 200
    assert settle.json()["payment_status"] == "settled"

    # Verify AD-24 financial_transactions synced as settled
    conn = get_db_connection()
    tx = conn.execute("SELECT * FROM financial_transactions WHERE id = ?", (fin_tx_id,)).fetchone()
    conn.close()
    assert tx is not None
    assert tx["category"] == "equipment"
    assert tx["status"] == "settled"


def test_cross_account_isolation_and_assistant_equipment_query():
    client = TestClient(app)

    # Buyer rejected with 403
    unauth = client.get("/api/v1/equipment/bookings", headers=_buyer_headers())
    assert unauth.status_code == 403

    # Assistant query
    chat = client.post(
        "/api/v1/assistant/chat",
        json={"farm_id": "farm_001", "message": "Find a tractor near my farm and show my shared rental savings"},
        headers=_farmer_headers(),
    )
    assert chat.status_code == 200
    body = chat.json()
    assert body["intent"] == "equipment_query"
    assert "get_equipment_intelligence" in body["tools_used"]
    assert len(body["cards"]) >= 1
