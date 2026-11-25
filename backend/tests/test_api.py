# backend/tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "RaithaMitra" in data["app_name"]
    assert "services" in data

def test_list_farms():
    response = client.get("/api/v1/farms")
    assert response.status_code == 200
    farms = response.json()
    assert len(farms) >= 2
    assert farms[0]["id"] == "farm_001"
    assert farms[0]["farmer_name"] == "Suresh Gowda"

def test_get_single_farm():
    response = client.get("/api/v1/farms/farm_001")
    assert response.status_code == 200
    farm = response.json()
    assert farm["primary_crop"] == "Tomato"
    assert farm["state"] == "Karnataka"

def test_create_farm():
    new_farm = {
        "farmer_name": "Rao Patil",
        "preferred_language": "kn",
        "farm_name": "Tungabhadra Green Estate",
        "village": "Hospet",
        "district": "Vijayanagara",
        "state": "Karnataka",
        "latitude": 15.27,
        "longitude": 76.39,
        "land_area_ha": 3.2,
        "primary_crop": "Maize",
        "crop_variety": "Hybrid Gold",
        "sowing_date": "2026-10-20",
        "crop_stage": "Crop Development",
        "soil_type": "Red Sandy Loam",
        "irrigation_method": "Drip Irrigation",
        "water_source": "Borewell",
        "available_water_m3": 18000.0,
        "cultivation_budget_inr": 65000.0
    }
    response = client.post("/api/v1/farms", json=new_farm)
    assert response.status_code == 201
    created = response.json()
    assert created["farmer_name"] == "Rao Patil"
    assert "farm_" in created["id"]

def test_weather_endpoint():
    response = client.get("/api/v1/weather?lat=12.52&lon=76.89")
    assert response.status_code == 200
    data = response.json()
    assert "current" in data
    assert "temperature_c" in data["current"]
    assert "et0_fao56_mm" in data["current"]
    assert "provenance" in data
    assert data["provenance"]["source"] != ""

def test_recommendations_endpoint():
    response = client.get("/api/v1/recommendations?farm_id=farm_001")
    assert response.status_code == 200
    data = response.json()
    assert data["farm_id"] == "farm_001"
    assert "recommendations" in data
    assert len(data["recommendations"]) > 0
    first_rec = data["recommendations"][0]
    assert "action" in first_rec
    assert "supporting_data" in first_rec
    assert "uncertainty" in first_rec["supporting_data"]

def test_schemes_endpoint():
    response = client.get("/api/v1/schemes")
    assert response.status_code == 200
    schemes = response.json()
    assert len(schemes) >= 5
    scheme_ids = [s["id"] for s in schemes]
    assert "pm_kisan" in scheme_ids
    assert "pmfby" in scheme_ids
