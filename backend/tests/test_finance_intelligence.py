"""
Comprehensive regression & security tests for AD-24:
Advanced Farm Financial Intelligence & Transaction Ledger.
Uses an isolated temporary SQLite database.
"""
import pytest
from fastapi.testclient import TestClient

import backend.app.db.database as database_module
from backend.app.db.database import get_db_connection, init_db
from backend.app.main import app

client = TestClient(app)


@pytest.fixture()
def isolated_finance_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_finance.db"
    monkeypatch.setattr(database_module, "DB_PATH", test_db)
    monkeypatch.setenv("ENVIRONMENT", "development")
    init_db()

    conn = get_db_connection()
    cur = conn.cursor()
    # Create session tokens for usr_farmer, usr_buyer1, and a second isolated farmer usr_farmer2
    cur.execute(
        "INSERT OR REPLACE INTO user_sessions (token, user_id, role, created_at) VALUES ('tok_farmer1', 'usr_farmer', 'farmer', '2026-11-26T00:00:00Z')"
    )
    cur.execute(
        "INSERT OR REPLACE INTO user_sessions (token, user_id, role, created_at) VALUES ('tok_buyer1', 'usr_buyer1', 'buyer', '2026-11-26T00:00:00Z')"
    )
    cur.execute(
        """
        INSERT OR IGNORE INTO users (id, email, password_hash, name, phone, role, preferred_language, created_at)
        VALUES ('usr_farmer2', 'farmer2@example.com', 'hash', 'Other Farmer', '+919000099999', 'farmer', 'en', '2026-11-26T00:00:00Z')
        """
    )
    cur.execute(
        "INSERT OR REPLACE INTO user_sessions (token, user_id, role, created_at) VALUES ('tok_farmer2', 'usr_farmer2', 'farmer', '2026-11-26T00:00:00Z')"
    )
    cur.execute(
        """
        INSERT OR IGNORE INTO farms (
            id, farmer_id, farmer_name, farm_name, village, district, state, latitude, longitude,
            land_area_ha, primary_crop, crop_variety, sowing_date, crop_stage, soil_type,
            irrigation_method, water_source, available_water_m3, cultivation_budget_inr, created_at, updated_at
        ) VALUES (
            'farm_002', 'usr_farmer2', 'Other Farmer', 'Other Farm', 'Hassan', 'Hassan', 'Karnataka',
            13.0, 76.1, 1.5, 'Maize', 'Pioneer', '2026-10-01', 'Mid', 'Loam',
            'Rainfed', 'Pond', 5000.0, 40000.0, '2026-11-26T00:00:00Z', '2026-11-26T00:00:00Z'
        )
        """
    )
    # Remove seeded open job/listing from farm_001 so tests start with clean ledger math
    cur.execute("DELETE FROM labour_jobs WHERE farm_id = 'farm_001'")
    cur.execute("DELETE FROM purchase_orders")
    cur.execute("DELETE FROM transport_bookings")
    conn.commit()
    conn.close()
    return test_db


def test_manual_expense_crud_and_safe_csv_export(isolated_finance_db):
    headers = {"Authorization": "Bearer tok_farmer1"}

    # 1. Create manual expense with formula-like description to test CSV neutralization
    create_res = client.post(
        "/api/v1/finance/transactions",
        headers=headers,
        json={
            "farm_id": "farm_001",
            "tx_type": "expense",
            "category": "fertilizers",
            "amount_inr": 4500.0,
            "tx_date": "2026-11-20",
            "description": "=CMD('calc') NPK Fertilizer Bag",
            "status": "recorded",
        },
    )
    assert create_res.status_code == 201
    tx_id = create_res.json()["id"]

    # 2. Edit manual transaction
    patch_res = client.patch(
        f"/api/v1/finance/transactions/{tx_id}",
        headers=headers,
        json={"amount_inr": 5000.0, "status": "settled"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["amount_inr"] == 5000.0
    assert patch_res.json()["status"] == "settled"

    # 3. Verify summary reflects ₹5,000 recorded expense
    sum_res = client.get("/api/v1/finance/summary?farm_id=farm_001", headers=headers)
    assert sum_res.status_code == 200
    assert sum_res.json()["actual_recorded_expenses_inr"] == 5000.0
    assert sum_res.json()["remaining_budget_inr"] == 80000.0  # 85,000 - 5,000

    # 4. CSV Export neutralizes leading '='
    csv_res = client.get("/api/v1/finance/export/csv?farm_id=farm_001", headers=headers)
    assert csv_res.status_code == 200
    assert "'=CMD('calc') NPK Fertilizer Bag" in csv_res.text


def test_cross_module_labour_bidding_transport_sync_and_no_duplicates(isolated_finance_db):
    headers = {"Authorization": "Bearer tok_farmer1"}
    labour_headers = {"Authorization": "Bearer rm_demo_token_labour"}
    driver_headers = {"Authorization": "Bearer rm_demo_token_driver"}
    buyer_headers = {"Authorization": "Bearer tok_buyer1"}

    # 1. Post Labour job -> apply -> accept -> verify committed expense (₹650)
    job_res = client.post(
        "/api/v1/labour/jobs",
        headers=headers,
        json={
            "farmer_id": "usr_farmer",
            "farmer_name": "Suresh Gowda",
            "farm_id": "farm_001",
            "title": "Harvesting",
            "job_type": "Harvesting",
            "crop_type": "Tomato",
            "work_location": "Mandya",
            "work_date": "2026-11-25",
            "wage_per_day": 650.0,
            "required_workers": 2,
        },
    )
    assert job_res.status_code == 201
    job_id = job_res.json()["id"]
    assert client.post(f"/api/v1/labour/jobs/{job_id}/apply?labour_id=usr_labour", headers=labour_headers).status_code == 200
    assert client.post(f"/api/v1/labour/jobs/{job_id}/accept/usr_labour", headers=headers).status_code == 200

    s1 = client.get("/api/v1/finance/summary?farm_id=farm_001", headers=headers).json()
    assert s1["committed_expenses_inr"] == 650.0
    assert s1["actual_recorded_expenses_inr"] == 0.0

    # Complete job -> transitions committed -> recorded payable (zero double-counting!)
    assert client.post(f"/api/v1/labour/jobs/{job_id}/complete", headers=headers).status_code == 200
    # Sync twice to verify duplicate prevention
    assert client.post("/api/v1/finance/sync?farm_id=farm_001", headers=headers).status_code == 200
    assert client.post("/api/v1/finance/sync?farm_id=farm_001", headers=headers).status_code == 200

    s2 = client.get("/api/v1/finance/summary?farm_id=farm_001", headers=headers).json()
    assert s2["committed_expenses_inr"] == 0.0
    assert s2["actual_recorded_expenses_inr"] == 650.0

    # 2. Transport booking -> requested (committed) -> delivered (recorded payable) -> cancelled booking excluded
    tb1 = client.post(
        "/api/v1/transport/bookings",
        headers=headers,
        json={
            "farmer_id": "usr_farmer",
            "farmer_name": "Suresh Gowda",
            "driver_id": "usr_driver",
            "driver_name": "Manjunath Transport",
            "produce_type": "Tomato",
            "weight_kg": 1000.0,
            "pickup_location": "Mandya",
            "delivery_destination": "Bengaluru",
            "vehicle_type": "Tata Ace",
            "estimated_distance_km": 50.0,
            "total_fare": 1600.0,
        },
    ).json()
    s3 = client.get("/api/v1/finance/summary?farm_id=farm_001", headers=headers).json()
    assert s3["committed_expenses_inr"] == 1600.0
    assert s3["actual_recorded_expenses_inr"] == 650.0

    for st in ("accepted", "pickup_scheduled", "picked_up", "in_transit", "delivered"):
        assert client.patch(f"/api/v1/transport/bookings/{tb1['id']}/status", json={"status": st}, headers=driver_headers).status_code == 200

    s4 = client.get("/api/v1/finance/summary?farm_id=farm_001", headers=headers).json()
    assert s4["committed_expenses_inr"] == 0.0
    assert s4["actual_recorded_expenses_inr"] == 2250.0  # 650 + 1600

    # Cancelled transport booking must NOT be counted
    tb2 = client.post(
        "/api/v1/transport/bookings",
        headers=headers,
        json={
            "farmer_id": "usr_farmer",
            "farmer_name": "Suresh Gowda",
            "driver_id": "usr_driver",
            "driver_name": "Manjunath Transport",
            "produce_type": "Tomato",
            "weight_kg": 500.0,
            "pickup_location": "Mandya",
            "delivery_destination": "Mysuru",
            "vehicle_type": "Tata Ace",
            "estimated_distance_km": 30.0,
            "total_fare": 900.0,
        },
    ).json()
    assert client.patch(f"/api/v1/transport/bookings/{tb2['id']}/status", json={"status": "rejected"}, headers=driver_headers).status_code == 200
    s5 = client.get("/api/v1/finance/summary?farm_id=farm_001", headers=headers).json()
    assert s5["committed_expenses_inr"] == 0.0
    assert s5["actual_recorded_expenses_inr"] == 2250.0

    # 3. Smart Bidding confirmed order -> partial payment -> full payment -> overpayment rejected
    list_res = client.post(
        "/api/v1/bidding/listings",
        headers=headers,
        json={
            "farmer_id": "usr_farmer",
            "farmer_name": "Suresh Gowda",
            "farm_id": "farm_001",
            "crop_name": "Tomato",
            "quantity_kg": 1000.0,
            "min_price_per_kg": 18.0,
            "harvest_date": "2026-11-26",
            "location": "Mandya",
            "bidding_deadline": "2026-11-28T18:00:00Z",
        },
    ).json()
    assert (
        client.post(
            f"/api/v1/bidding/listings/{list_res['id']}/bid",
            headers=buyer_headers,
            json={"buyer_id": "usr_buyer1", "buyer_name": "Bengaluru Fresh Foods Co", "bid_per_kg": 25.0},
        ).status_code
        == 200
    )
    confirm = client.post(f"/api/v1/bidding/listings/{list_res['id']}/confirm?farmer_id=usr_farmer", headers=headers).json()
    po_id = confirm["order"]["id"]

    # Confirmed order MUST NOT be treated as cash already received!
    s6 = client.get("/api/v1/finance/summary?farm_id=farm_001", headers=headers).json()
    assert s6["confirmed_sales_value_inr"] == 25000.0
    assert s6["received_payments_inr"] == 0.0
    assert s6["outstanding_payments_inr"] == 25000.0

    # Record partial payment of ₹10,000
    p1 = client.post(
        f"/api/v1/finance/orders/{po_id}/payments",
        headers=headers,
        json={"farm_id": "farm_001", "amount_inr": 10000.0, "payment_reference": "UTR-001"},
    )
    assert p1.status_code == 201
    assert p1.json()["outstanding_balance_inr"] == 15000.0

    # Overpayment > ₹15,000 must be rejected
    over = client.post(
        f"/api/v1/finance/orders/{po_id}/payments",
        headers=headers,
        json={"farm_id": "farm_001", "amount_inr": 16000.0},
    )
    assert over.status_code == 400


def test_jury_demonstration_scenario_exact_calculations(isolated_finance_db):
    headers = {"Authorization": "Bearer tok_farmer1"}
    res = client.post("/api/v1/finance/demo-scenario?farm_id=farm_001", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["actual_recorded_expenses_inr"] == 55000.0
    assert data["confirmed_sales_value_inr"] == 100000.0
    assert data["estimated_net_profit_inr"] == 45000.0
    assert data["projected_roi_pct"] == 81.82
    assert data["break_even_price_per_kg"] == 11.0
    # Confirmed sale is distinct from received payments until farmer records settlement
    assert data["received_payments_inr"] == 0.0
    assert data["outstanding_payments_inr"] == 100000.0

    # Persistence after init_db() restart
    init_db()
    after_restart = client.get("/api/v1/finance/summary?farm_id=farm_001", headers=headers).json()
    assert after_restart["actual_recorded_expenses_inr"] == 55000.0
    assert after_restart["confirmed_sales_value_inr"] == 100000.0


def test_financial_security_user_and_farm_isolation(isolated_finance_db):
    # 1. Unauthenticated rejected (401)
    assert client.get("/api/v1/finance/summary?farm_id=farm_001").status_code == 401

    # 2. Buyer role rejected (403)
    assert (
        client.get("/api/v1/finance/summary?farm_id=farm_001", headers={"Authorization": "Bearer tok_buyer1"}).status_code
        == 403
    )

    # 3. Farmer 2 cannot access Farmer 1's farm (403)
    assert (
        client.get("/api/v1/finance/summary?farm_id=farm_001", headers={"Authorization": "Bearer tok_farmer2"}).status_code
        == 403
    )

    # 4. Farmer 2 CAN access their own farm_002
    f2_res = client.get(
        "/api/v1/finance/summary?farm_id=farm_002",
        headers={"Authorization": "Bearer tok_farmer2"},
    )
    assert f2_res.status_code == 200
    assert f2_res.json()["farm_id"] == "farm_002"
    assert f2_res.json()["allocated_budget_inr"] == 40000.0
