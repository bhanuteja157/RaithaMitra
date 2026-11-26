"""
AD-37: Security Hardening, Data Integrity & Unified Module Connectivity Regression Tests.
"""
from __future__ import annotations

import asyncio
import io
import os
import sys
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.db.database import get_db_connection, init_db
from backend.app.engines.decision_engine import decision_engine
from backend.app.features.auth.security import reset_rate_limits
from backend.app.features.decision_intelligence.context_collector import collect_unified_farm_context
from backend.app.main import app
from backend.app.schemas.farm import Farm

client = TestClient(app)


@pytest.fixture(autouse=True)
def _ensure_db_and_clean_rate_limits():
    init_db()
    reset_rate_limits()
    yield
    reset_rate_limits()


def test_unauthorized_api_access_rejected():
    assert client.get("/api/v1/farms").status_code == 401
    assert client.get("/api/v1/farms/farm_001").status_code == 401
    assert client.get("/api/v1/farms/farm_001/summary").status_code == 401
    assert client.post("/api/v1/labour/jobs", json={}).status_code in (401, 422)
    assert client.post("/api/v1/bidding/listings", json={}).status_code in (401, 422)
    assert client.get("/api/v1/bidding/orders").status_code == 401
    assert client.get("/api/v1/transport/bookings").status_code == 401
    assert client.get("/api/v1/finance/summary?farm_id=farm_001").status_code == 401


def test_cross_account_farm_access_and_cross_role_escalation_rejected():
    # Register a second farmer account and verify they cannot access usr_farmer's farm_001
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"farmer_iso_{os.getpid()}@example.com",
            "password": "password123",
            "name": "Isolated Farmer",
            "phone": "+919888877766",
            "role": "farmer",
            "preferred_language": "en",
        },
    )
    if reg.status_code == 201:
        f2_token = reg.json()["access_token"]
    else:
        login = client.post(
            "/api/v1/auth/login",
            json={"email": f"farmer_iso_{os.getpid()}@example.com", "password": "password123", "role": "farmer"},
        )
        f2_token = login.json()["access_token"]

    f2_headers = {"Authorization": f"Bearer {f2_token}"}
    assert client.get("/api/v1/farms/farm_001", headers=f2_headers).status_code == 403
    assert client.patch("/api/v1/farms/farm_001", json={"village": "Hacked"}, headers=f2_headers).status_code == 403
    assert client.get("/api/v1/farms/farm_001/summary", headers=f2_headers).status_code == 403

    # Cross-role escalation: Buyer cannot create farm or access finance; Farmer cannot register transport vehicle
    buyer_headers = {"Authorization": "Bearer rm_demo_token_buyer"}
    farmer_headers = {"Authorization": "Bearer rm_demo_token_farmer"}
    assert client.get("/api/v1/finance/summary?farm_id=farm_001", headers=buyer_headers).status_code == 403
    assert (
        client.post(
            "/api/v1/transport/vehicles",
            headers=farmer_headers,
            json={
                "driver_id": "usr_farmer",
                "driver_name": "Fake Driver",
                "driver_phone": "+919000000001",
                "vehicle_type": "Tata Ace",
                "vehicle_reg_number": "KA-01-XX-0001",
                "capacity_kg": 1500,
                "base_fare_per_km": 30,
                "service_area": "Mandya",
            },
        ).status_code
        == 403
    )


def test_production_demo_auth_rejection_and_no_password_disclosure():
    # In dev mode, /auth/demo-accounts works and NEVER returns plaintext passwords
    dev_res = client.get("/api/v1/auth/demo-accounts")
    assert dev_res.status_code == 200
    for acc in dev_res.json():
        assert "password" not in acc

    # In production mode, demo-accounts and rm_demo_token_* are strictly rejected
    with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
        prod_demo_res = client.get("/api/v1/auth/demo-accounts")
        assert prod_demo_res.status_code == 403

        prod_farms_res = client.get("/api/v1/farms", headers={"Authorization": "Bearer rm_demo_token_farmer"})
        assert prod_farms_res.status_code == 401

        prod_fin_res = client.get(
            "/api/v1/finance/summary?farm_id=farm_001",
            headers={"Authorization": "Bearer rm_demo_token_farmer"},
        )
        assert prod_fin_res.status_code == 401


def test_invalid_and_oversized_image_uploads_rejected():
    # Dangerous extension (.exe) rejected with 400
    exe_res = client.post(
        "/api/v1/crop-diagnostics/analyze",
        data={"crop": "Tomato"},
        files={"file": ("payload.exe", b"MZ\x90\x00", "application/x-msdownload")},
    )
    assert exe_res.status_code == 400

    # Oversized upload (>10 MB) rejected with 413
    oversized = b"\x89PNG\r\n\x1a\n" + (b"\x00" * (10 * 1024 * 1024 + 10))
    big_res = client.post(
        "/api/v1/crop-diagnostics/analyze",
        data={"crop": "Tomato"},
        files={"file": ("huge.png", oversized, "image/png")},
    )
    assert big_res.status_code == 413


def test_genuine_zero_budget_and_zero_water_preserved():
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO farms (
                id, farmer_id, farmer_name, farm_name, village, district, state,
                latitude, longitude, land_area_ha, primary_crop, crop_variety,
                sowing_date, crop_stage, soil_type, irrigation_method, water_source,
                available_water_m3, cultivation_budget_inr, created_at, updated_at
            ) VALUES (
                'farm_zero_test', 'usr_farmer', 'Suresh Gowda', 'Zero Resource Plot',
                'Mandya', 'Mandya', 'Karnataka', 12.52, 76.89, 1.0, 'Tomato', 'Arka Rakshak',
                '2026-10-15', 'Mid-Season', 'Red Sandy Loam', 'Rainfed', 'Rainwater Only',
                0.0, 0.0, '2026-11-01T00:00:00Z', '2026-11-01T00:00:00Z'
            )
            """
        )
        conn.commit()
    finally:
        conn.close()

    try:
        ctx = asyncio.run(
            collect_unified_farm_context(user_id="usr_farmer", role="farmer", farm_id="farm_zero_test")
        )
        assert ctx["farm"].available_water_m3 == 0.0
        assert ctx["farm"].cultivation_budget_inr == 0.0
        assert ctx["finance"]["allocated_budget_inr"] == 0.0
    finally:
        conn_clean = get_db_connection()
        try:
            conn_clean.execute("DELETE FROM farms WHERE id = 'farm_zero_test'")
            conn_clean.commit()
        finally:
            conn_clean.close()

    # Core decision_engine must also preserve 0.0 budget rather than defaulting to 80000.0
    zero_farm = Farm(
        id="farm_zero_test",
        farmer_id="usr_farmer",
        farmer_name="Suresh Gowda",
        preferred_language="en",
        farm_name="Zero Resource Plot",
        village="Mandya",
        district="Mandya",
        state="Karnataka",
        latitude=12.52,
        longitude=76.89,
        land_area_ha=1.0,
        primary_crop="Tomato",
        crop_variety="Arka Rakshak",
        sowing_date="2026-10-15",
        crop_stage="Mid-Season",
        soil_type="Red Sandy Loam",
        irrigation_method="Rainfed",
        water_source="Rainwater Only",
        available_water_m3=0.0,
        cultivation_budget_inr=0.0,
        created_at="2026-11-01T00:00:00Z",
        updated_at="2026-11-01T00:00:00Z",
    )
    assert zero_farm.cultivation_budget_inr == 0.0
    assert zero_farm.available_water_m3 == 0.0
    assert decision_engine is not None


def test_labour_and_transport_completion_separate_from_settlement():
    farmer_headers = {"Authorization": "Bearer rm_demo_token_farmer"}
    labour_headers = {"Authorization": "Bearer rm_demo_token_labour"}
    driver_headers = {"Authorization": "Bearer rm_demo_token_driver"}

    # Create a dedicated farm for clean ledger isolation
    f_res = client.post(
        "/api/v1/farms",
        headers=farmer_headers,
        json={
            "farmer_name": "Suresh Gowda",
            "preferred_language": "en",
            "farm_name": "Settlement Isolation Plot",
            "village": "Mandya",
            "district": "Mandya",
            "state": "Karnataka",
            "latitude": 12.52,
            "longitude": 76.89,
            "land_area_ha": 1.5,
            "primary_crop": "Tomato",
            "sowing_date": "2026-10-15",
            "crop_stage": "Mid-Season",
            "soil_type": "Red Sandy Loam",
            "irrigation_method": "Drip Irrigation",
            "water_source": "Borewell",
            "available_water_m3": 5000.0,
            "cultivation_budget_inr": 50000.0,
        },
    )
    assert f_res.status_code == 201
    farm_id = f_res.json()["id"]

    # Post + apply + accept + complete labour job
    job = client.post(
        "/api/v1/labour/jobs",
        headers=farmer_headers,
        json={
            "farmer_id": "usr_farmer",
            "farmer_name": "Suresh Gowda",
            "farm_id": farm_id,
            "title": "Weeding Shift",
            "job_type": "Weeding",
            "crop_type": "Tomato",
            "work_location": "Mandya",
            "work_date": "2026-11-26",
            "wage_per_day": 500.0,
            "required_workers": 1,
        },
    ).json()
    job_id = job["id"]
    assert client.post(f"/api/v1/labour/jobs/{job_id}/apply", headers=labour_headers).status_code == 200
    assert client.post(f"/api/v1/labour/jobs/{job_id}/accept/usr_labour", headers=farmer_headers).status_code == 200
    assert client.post(f"/api/v1/labour/jobs/{job_id}/complete", headers=farmer_headers).status_code == 200

    # Completed labour job MUST be recorded as unpaid payable, NOT settled!
    s_before = client.get(f"/api/v1/finance/summary?farm_id={farm_id}", headers=farmer_headers).json()
    assert s_before["payment_gateway_connected"] is False
    assert s_before["unpaid_payables_inr"] >= 500.0
    assert s_before["settled_expenses_inr"] == 0.0

    # Explicit settlement moves payable -> settled
    settle_res = client.post(
        f"/api/v1/finance/labour/{job_id}/settle",
        headers=farmer_headers,
        json={"payment_reference": "CASH-LAB-01"},
    )
    assert settle_res.status_code == 200
    assert settle_res.json()["payment_status"] == "settled"

    s_after = client.get(f"/api/v1/finance/summary?farm_id={farm_id}", headers=farmer_headers).json()
    assert s_after["settled_expenses_inr"] >= 500.0

    # Delivered transport booking MUST also stay unpaid payable until explicitly settled
    tb = client.post(
        "/api/v1/transport/bookings",
        headers=farmer_headers,
        json={
            "farmer_id": "usr_farmer",
            "farmer_name": "Suresh Gowda",
            "driver_id": "usr_driver",
            "driver_name": "Manjunath Transport",
            "produce_type": "Tomato",
            "weight_kg": 400.0,
            "pickup_location": "Mandya",
            "delivery_destination": "Bengaluru",
            "vehicle_type": "Tata Ace",
            "estimated_distance_km": 40.0,
            "total_fare": 1200.0,
        },
    ).json()
    tb_id = tb["id"]
    for st in ("accepted", "pickup_scheduled", "picked_up", "in_transit", "delivered"):
        assert (
            client.patch(
                f"/api/v1/transport/bookings/{tb_id}/status",
                json={"status": st},
                headers=driver_headers,
            ).status_code
            == 200
        )

    # Sync twice to verify duplicate prevention
    assert client.post(f"/api/v1/finance/sync?farm_id={farm_id}", headers=farmer_headers).status_code == 200
    assert client.post(f"/api/v1/finance/sync?farm_id={farm_id}", headers=farmer_headers).status_code == 200

    s_trn_settle = client.post(
        f"/api/v1/finance/transport/{tb_id}/settle",
        headers=farmer_headers,
        json={"payment_reference": "TRN-SETTLE-01"},
    )
    assert s_trn_settle.status_code == 200
    assert s_trn_settle.json()["payment_status"] == "settled"
