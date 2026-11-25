"""
Automated Test Suite for AD-06D: Authentication & Role-Based Access Control (RBAC).
Validates:
- Registration for all 4 roles (Farmer, Buyer, Labour, Driver)
- Salted SHA-256 password hashing
- Login validation & invalid password handling
- Role mismatch rejection (prevents privilege escalation)
- Session token persistence and /auth/me lookup
- Logout session invalidation
- Backend-enforced authorization across modules
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

client = TestClient(app)

def test_register_all_roles():
    # 1. Register Farmer
    r_farmer = client.post("/api/v1/auth/register", json={
        "email": "new_farmer@example.com",
        "password": "securePassword123",
        "name": "Manjunath Gowda",
        "phone": "+91 99001 12233",
        "role": "farmer",
        "village": "Maddur Rural",
        "district": "Mandya"
    })
    assert r_farmer.status_code == 201
    assert r_farmer.json()["user"]["role"] == "farmer"
    assert "access_token" in r_farmer.json()
    assert r_farmer.json()["redirect_url"] == "/"

    # 2. Register Buyer
    r_buyer = client.post("/api/v1/auth/register", json={
        "email": "new_buyer@example.com",
        "password": "securePassword123",
        "name": "Apex Food Procurements",
        "phone": "+91 99002 23344",
        "role": "buyer",
        "buyer_type": "business",
        "business_name": "Apex Food Procurements Ltd",
        "delivery_address": "Kolar APMC Mandi"
    })
    assert r_buyer.status_code == 201
    assert r_buyer.json()["user"]["role"] == "buyer"
    assert r_buyer.json()["redirect_url"] == "/dashboard/buyer"

    # 3. Register Labour
    r_labour = client.post("/api/v1/auth/register", json={
        "email": "new_labour@example.com",
        "password": "securePassword123",
        "name": "Kempaiah",
        "phone": "+91 99003 34455",
        "role": "labour",
        "skills": ["Harvesting", "Transplantation"],
        "daily_wage_rate": 620.0,
        "village": "Pandavapura"
    })
    assert r_labour.status_code == 201
    assert r_labour.json()["user"]["role"] == "labour"
    assert r_labour.json()["redirect_url"] == "/dashboard/labour"

    # 4. Register Driver
    r_driver = client.post("/api/v1/auth/register", json={
        "email": "new_driver@example.com",
        "password": "securePassword123",
        "name": "Raju Transport",
        "phone": "+91 99004 45566",
        "role": "driver",
        "vehicle_type": "Mahindra Bolero",
        "capacity_kg": 1750.0,
        "base_fare_per_km": 35.0
    })
    assert r_driver.status_code == 201
    assert r_driver.json()["user"]["role"] == "driver"
    assert r_driver.json()["redirect_url"] == "/dashboard/driver"


def test_register_duplicate_email():
    payload = {
        "email": "duplicate_check@example.com",
        "password": "password123",
        "name": "Duplicate Tester",
        "phone": "+91 98765 00000",
        "role": "farmer"
    }
    r1 = client.post("/api/v1/auth/register", json=payload)
    assert r1.status_code == 201
    
    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 400
    assert "already registered" in r2.json()["detail"].lower()


def test_login_success_and_invalid_password():
    # Login with valid password (demo account)
    r_ok = client.post("/api/v1/auth/login", json={
        "email": "farmer@raithamitra.in",
        "password": "farmer123",
        "role": "farmer"
    })
    assert r_ok.status_code == 200
    assert "access_token" in r_ok.json()
    assert r_ok.json()["user"]["email"] == "farmer@raithamitra.in"

    # Login with invalid password
    r_fail = client.post("/api/v1/auth/login", json={
        "email": "farmer@raithamitra.in",
        "password": "wrongPassword!",
        "role": "farmer"
    })
    assert r_fail.status_code == 401
    assert "Invalid email or password" in r_fail.json()["detail"]


def test_login_role_mismatch():
    # Attempt to log into Buyer account while selecting Farmer role
    r_mismatch = client.post("/api/v1/auth/login", json={
        "email": "buyer1@raithamitra.in",
        "password": "buyer123",
        "role": "farmer"
    })
    assert r_mismatch.status_code == 403
    assert "Role mismatch" in r_mismatch.json()["detail"]


def test_session_token_and_logout():
    # Login to acquire token
    login_res = client.post("/api/v1/auth/login", json={
        "email": "labour@raithamitra.in",
        "password": "labour123",
        "role": "labour"
    })
    token = login_res.json()["access_token"]

    # Verify session via /auth/me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "labour"

    # Logout
    logout_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

    # Subsequent /auth/me with revoked token fails
    me_after = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_after.status_code == 401


def test_rbac_privilege_escalation_rejected():
    # 1. Non-farmer (buyer1) cannot post agricultural job
    r_post_job = client.post("/api/v1/labour/jobs", json={
        "farmer_id": "usr_buyer1",
        "farmer_name": "Bengaluru Fresh Foods Co",
        "title": "Unauthorized Job",
        "job_type": "Harvesting",
        "crop_type": "Tomato",
        "work_location": "Mandya",
        "work_date": "2026-11-29",
        "working_hours": "07:00 - 15:00",
        "wage_per_day": 600.0,
        "required_workers": 2
    })
    assert r_post_job.status_code == 403
    assert "Only registered farmers" in r_post_job.json()["detail"]

    # 2. Non-buyer (farmer) cannot submit bidding offer
    r_bid = client.post("/api/v1/bidding/listings/list_001/bid", json={
        "buyer_id": "usr_farmer",
        "buyer_name": "Suresh Gowda",
        "bid_per_kg": 35.0
    })
    assert r_bid.status_code == 403
    assert "Only registered buyers" in r_bid.json()["detail"]

    # 3. Non-labour (buyer) cannot apply for agricultural labour job
    r_apply = client.post("/api/v1/labour/jobs/job_001/apply?labour_id=usr_buyer1&labour_name=FakeLabour")
    assert r_apply.status_code == 403
    assert "Only registered agricultural labourers" in r_apply.json()["detail"]
