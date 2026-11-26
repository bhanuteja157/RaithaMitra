# backend/tests/test_locations.py
"""
Targeted tests for Smart Location Selector:
- Forward geocoding search (/api/v1/locations/search)
- Reverse geocoding (/api/v1/locations/reverse)
- Coordinate validation
- Updating existing farm location via PATCH /api/v1/farms/{farm_id} without duplicating farms
- Weather API receiving updated coordinates
"""
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_location_search_nominatim_mock():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [
        {
            "display_name": "Tumakuru, Tumakuru district, Karnataka, 572101, India",
            "lat": "13.3409",
            "lon": "77.1010",
            "type": "city",
            "address": {
                "city": "Tumakuru",
                "state_district": "Tumakuru district",
                "state": "Karnataka",
                "country": "India",
                "postcode": "572101",
            },
        }
    ]
    with patch("backend.app.services.geocoding_service.requests.get", return_value=mock_resp):
        res = client.get("/api/v1/locations/search?q=Tumakuru")
        assert res.status_code == 200
        data = res.json()
        assert data["query"] == "Tumakuru"
        assert len(data["results"]) == 1
        first = data["results"][0]
        assert first["latitude"] == 13.3409
        assert first["longitude"] == 77.1010
        assert first["district"] == "Tumakuru"
        assert first["state"] == "Karnataka"
        assert first["pin_code"] == "572101"


def test_reverse_geocode_nominatim_mock():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "display_name": "Gubbi, Tumakuru, Karnataka, 572216, India",
        "address": {
            "town": "Gubbi",
            "state_district": "Tumakuru District",
            "state": "Karnataka",
            "country": "India",
            "postcode": "572216",
        },
    }
    with patch("backend.app.services.geocoding_service.requests.get", return_value=mock_resp):
        res = client.get("/api/v1/locations/reverse?lat=13.3112&lon=76.9425")
        assert res.status_code == 200
        data = res.json()
        assert data["village_or_locality"] == "Gubbi"
        assert data["district"] == "Tumakuru"
        assert data["state"] == "Karnataka"
        assert data["pin_code"] == "572216"


def test_coordinate_validation_rejects_out_of_range():
    res_lat = client.get("/api/v1/locations/reverse?lat=95.0&lon=77.0")
    assert res_lat.status_code == 422
    res_lon = client.get("/api/v1/locations/reverse?lat=13.0&lon=190.0")
    assert res_lon.status_code == 422


def test_patch_farm_location_without_duplicating():
    headers = {"Authorization": "Bearer rm_demo_token_farmer"}
    farms_before = client.get("/api/v1/farms", headers=headers).json()
    count_before = len(farms_before)

    patch_payload = {
        "latitude": 13.3409,
        "longitude": 77.1010,
        "village": "Gubbi",
        "district": "Tumakuru",
        "state": "Karnataka",
        "pin_code": "572216",
        "formatted_address": "Gubbi, Tumakuru, Karnataka, 572216",
        "location_source": "map",
        "location_accuracy_m": 12.0,
    }
    res = client.patch("/api/v1/farms/farm_001", json=patch_payload, headers=headers)
    assert res.status_code == 200
    updated = res.json()
    assert updated["id"] == "farm_001"
    assert updated["latitude"] == 13.3409
    assert updated["longitude"] == 77.1010
    assert updated["village"] == "Gubbi"
    assert updated["district"] == "Tumakuru"
    assert updated["pin_code"] == "572216"
    assert updated["location_source"] == "map"

    farms_after = client.get("/api/v1/farms", headers=headers).json()
    assert len(farms_after) == count_before

    # Verify weather endpoint accepts updated coordinates
    weather_res = client.get(f"/api/v1/weather?lat={updated['latitude']}&lon={updated['longitude']}")
    assert weather_res.status_code == 200
    w_data = weather_res.json()
    assert abs(w_data["latitude"] - 13.3409) < 0.5
    assert abs(w_data["longitude"] - 77.1010) < 0.5
