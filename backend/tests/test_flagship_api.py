"""
Comprehensive Automated Test Suite for RaithaMitra Flagship Features.
Tests end-to-end workflows:
1. Auth & RBAC
2. Labour Connect (Job post -> Apply -> Accept -> Complete)
3. Smart Bidding (List produce -> Buyer A bids -> Buyer B bids -> Farmer confirms -> PO created)
4. Transport Connect (Driver search -> Booking -> Status update -> OR-Tools shared load)
5. BioIntel (Biotech research search -> Nursery lookup)
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import init_db

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

client = TestClient(app)

def test_auth_login():
    res = client.post("/api/v1/auth/login", json={"email": "farmer@raithamitra.in", "password": "farmer123"})
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "farmer"
    assert data["user"]["name"] == "Suresh Gowda"

def test_labour_connect_workflow():
    farmer_headers = {"Authorization": "Bearer rm_demo_token_farmer"}
    labour_headers = {"Authorization": "Bearer rm_demo_token_labour"}

    # 1. Farmer posts job
    job_payload = {
        "farmer_id": "usr_farmer",
        "farmer_name": "Suresh Gowda",
        "farm_id": "farm_001",
        "title": "Chilli Harvesting & Drying",
        "job_type": "Harvesting",
        "crop_type": "Chilli",
        "work_location": "Mandya South",
        "work_date": "2026-11-29",
        "working_hours": "07:00 - 14:00",
        "wage_per_day": 700.0,
        "required_workers": 2
    }
    r_post = client.post("/api/v1/labour/jobs", json=job_payload, headers=farmer_headers)
    assert r_post.status_code == 201
    job_id = r_post.json()["id"]

    # 2. Labour applies for job
    r_apply = client.post(f"/api/v1/labour/jobs/{job_id}/apply?labour_id=usr_labour&labour_name=Basavaraj", headers=labour_headers)
    assert r_apply.status_code == 200

    # 3. Farmer accepts applicant
    r_accept = client.post(f"/api/v1/labour/jobs/{job_id}/accept/usr_labour", headers=farmer_headers)
    assert r_accept.status_code == 200
    assert r_accept.json()["hired_count"] == 1

    # 4. Farmer completes job
    r_complete = client.post(f"/api/v1/labour/jobs/{job_id}/complete", headers=farmer_headers)
    assert r_complete.status_code == 200

    # 5. Verify labour earnings recorded
    r_my_jobs = client.get("/api/v1/labour/my-jobs?labour_id=usr_labour", headers=labour_headers)
    assert r_my_jobs.status_code == 200
    assert len(r_my_jobs.json()) > 0

def test_smart_bidding_workflow():
    farmer_headers = {"Authorization": "Bearer rm_demo_token_farmer"}
    buyer1_headers = {"Authorization": "Bearer rm_demo_token_buyer"}
    b2_login = client.post("/api/v1/auth/login", json={"email": "buyer2@raithamitra.in", "password": "buyer123", "role": "buyer"})
    buyer2_headers = {"Authorization": f"Bearer {b2_login.json()['access_token']}"}

    # 1. Farmer creates listing
    listing_payload = {
        "farmer_id": "usr_farmer",
        "farmer_name": "Suresh Gowda",
        "farm_id": "farm_001",
        "crop_name": "Tomato",
        "variety": "Arka Rakshak (A-Grade)",
        "quantity_kg": 2000.0,
        "min_price_per_kg": 20.0,
        "harvest_date": "2026-11-28",
        "location": "Mandya Farm Gate",
        "bidding_deadline": "2026-11-27T18:00:00Z"
    }
    r_list = client.post("/api/v1/bidding/listings", json=listing_payload, headers=farmer_headers)
    assert r_list.status_code == 201
    list_id = r_list.json()["id"]

    # 2. Buyer A bids ₹22/kg
    r_bid_a = client.post(f"/api/v1/bidding/listings/{list_id}/bid", headers=buyer1_headers, json={
        "buyer_id": "usr_buyer1",
        "buyer_name": "Bengaluru Fresh Foods Co",
        "bid_per_kg": 22.0
    })
    assert r_bid_a.status_code == 200

    # 3. Buyer B bids higher at ₹25/kg
    r_bid_b = client.post(f"/api/v1/bidding/listings/{list_id}/bid", headers=buyer2_headers, json={
        "buyer_id": "usr_buyer2",
        "buyer_name": "Mysuru Organic Retail Ltd",
        "bid_per_kg": 25.0
    })
    assert r_bid_b.status_code == 200

    # 4. Check listing details & Bidding Intelligence
    r_details = client.get(f"/api/v1/bidding/listings/{list_id}")
    assert r_details.status_code == 200
    intel = r_details.json()["intelligence"]
    assert intel["highest_eligible_offer"] == 25.0
    assert intel["competing_buyers_count"] == 2
    assert intel["total_sale_value_inr"] == 50000.0

    # 5. Farmer confirms sale -> exactly one purchase order generated
    r_confirm = client.post(f"/api/v1/bidding/listings/{list_id}/confirm?farmer_id=usr_farmer", headers=farmer_headers)
    assert r_confirm.status_code == 200
    order = r_confirm.json()["order"]
    assert order["price_per_kg"] == 25.0
    assert order["total_amount"] == 50000.0

    # 6. Verify duplicate confirmation is prohibited
    r_dup = client.post(f"/api/v1/bidding/listings/{list_id}/confirm?farmer_id=usr_farmer", headers=farmer_headers)
    assert r_dup.status_code == 400

def test_transport_connect_workflow():
    farmer_headers = {"Authorization": "Bearer rm_demo_token_farmer"}
    driver_headers = {"Authorization": "Bearer rm_demo_token_driver"}

    # 1. Farmer searches drivers with capacity >= 1000kg
    r_drivers = client.get("/api/v1/transport/drivers?min_capacity_kg=1000")
    assert r_drivers.status_code == 200
    drivers = r_drivers.json()
    assert len(drivers) > 0
    driver = drivers[0]

    # 2. Farmer requests booking
    booking_payload = {
        "farmer_id": "usr_farmer",
        "farmer_name": "Suresh Gowda",
        "driver_id": driver["driver_id"],
        "driver_name": driver["driver_name"],
        "produce_type": "Tomato",
        "weight_kg": 1200.0,
        "pickup_location": "Mandya Rural Farm",
        "delivery_destination": "Bengaluru APMC",
        "pickup_time": "Tomorrow 06:00 AM",
        "vehicle_type": driver["vehicle_type"],
        "estimated_distance_km": 60.0,
        "total_fare": 1920.0
    }
    r_book = client.post("/api/v1/transport/bookings", json=booking_payload, headers=farmer_headers)
    assert r_book.status_code == 201
    booking_id = r_book.json()["id"]

    # 3. Driver accepts booking
    r_accept = client.patch(f"/api/v1/transport/bookings/{booking_id}/status", json={"status": "accepted"}, headers=driver_headers)
    assert r_accept.status_code == 200
    assert r_accept.json()["status"] == "accepted"

    # 4. Driver transitions to in_transit -> delivered
    client.patch(f"/api/v1/transport/bookings/{booking_id}/status", json={"status": "pickup_scheduled"}, headers=driver_headers)
    client.patch(f"/api/v1/transport/bookings/{booking_id}/status", json={"status": "picked_up"}, headers=driver_headers)
    client.patch(f"/api/v1/transport/bookings/{booking_id}/status", json={"status": "in_transit"}, headers=driver_headers)
    r_delivered = client.patch(f"/api/v1/transport/bookings/{booking_id}/status", json={"status": "delivered"}, headers=driver_headers)
    assert r_delivered.status_code == 200
    assert r_delivered.json()["status"] == "delivered"

    # 5. Test OR-Tools shared load optimization
    r_opt = client.post("/api/v1/transport/optimize-shared", json={
        "total_produce_kg": 1400.0,
        "farmers_count": 2,
        "distance_km": 65.0,
        "vehicle_type": "Tata Ace"
    })
    assert r_opt.status_code == 200
    opt_data = r_opt.json()
    assert opt_data["is_feasible"] is True
    assert opt_data["savings_per_farmer_inr"] > 0

def test_biointel_search():
    res = client.get("/api/v1/biointel/search?crop=Tomato&topic=disease_resistance")
    assert res.status_code == 200
    data = res.json()
    assert data["crop"] == "Tomato"
    assert len(data["publications"]) > 0
    first_pub = data["publications"][0]
    assert "title" in first_pub
    assert "farmer_takeaway" in first_pub

def test_biointel_nurseries():
    res = client.get("/api/v1/biointel/nurseries?district=Mandya")
    assert res.status_code == 200
    data = res.json()
    assert len(data["suppliers"]) >= 3
    assert data["suppliers"][0]["verified"] is True
