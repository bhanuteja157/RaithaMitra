# backend/tests/test_disease_surveillance.py
"""
Comprehensive Automated Test Suite for AD-40C:
Community Crop Disease Surveillance and Predictive Outbreak Intelligence.
"""
from datetime import date, datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

import backend.app.db.database as database
from backend.app.db.database import get_db_connection, init_db
from backend.app.features.disease_surveillance.geospatial import haversine_km
from backend.app.features.disease_surveillance.outbreak_detector import detect_outbreak_clusters
from backend.app.features.disease_surveillance.risk_engine import assess_farm_disease_risk
from backend.app.main import app


@pytest.fixture(autouse=True)
def isolated_surveillance_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_ad40c_surveillance.db"
    monkeypatch.setattr(database, "DB_PATH", test_db)
    init_db()
    yield


client = TestClient(app)


def _login(email: str, password: str) -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def _register_second_farmer(name: str = "Kavitha Devi", phone: str = "+919845099887") -> tuple[str, str]:
    email = f"kavitha_{phone[-4:]}@raithamitra.in"
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123",
            "name": name,
            "phone": phone,
            "role": "farmer",
            "district": "Mandya",
            "state": "Karnataka",
        },
    )
    assert reg.status_code == 201, reg.text
    token = reg.json()["access_token"]
    user_id = reg.json()["user"]["id"]

    # Insert a neighbouring farm owned by this second farmer
    now = datetime.now(timezone.utc).isoformat()
    farm_id = f"farm_peer_{user_id[-4:]}"
    conn = get_db_connection()
    conn.execute(
        """
        INSERT INTO farms (
            id, farmer_id, farmer_name, farm_name, village, district, state,
            latitude, longitude, land_area_ha, primary_crop, crop_variety, sowing_date,
            crop_stage, soil_type, irrigation_method, water_source, created_at, updated_at
        ) VALUES (?, ?, ?, 'Peer Valley Farm', 'Maddur', 'Mandya', 'Karnataka',
                  12.5510, 76.9210, 1.8, 'Tomato', 'Arka Rakshak', '2026-10-20',
                  'Mid-Season', 'Red Sandy Loam', 'Drip Irrigation', 'Borewell', ?, ?)
        """,
        (farm_id, user_id, name, now, now),
    )
    conn.commit()
    conn.close()
    return token, farm_id


def test_01_auth_and_ownership_enforcement():
    # Unauthenticated request must fail with 401
    unauth = client.get("/api/v1/surveillance/reports")
    assert unauth.status_code == 401

    # Buyer account attempting to submit disease report for farmer's farm must fail with 403
    buyer_token = _login("buyer1@raithamitra.in", "buyer123")
    res_buyer = client.post(
        "/api/v1/surveillance/reports",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "farm_id": "farm_001",
            "crop": "Tomato",
            "disease_name": "Early Blight (Alternaria solani)",
            "affected_area_ha": 0.5,
            "anonymous_community_consent": True,
        },
    )
    assert res_buyer.status_code == 403

    # Second farmer attempting to report on Suresh's farm_001 must fail with 403
    peer_token, _ = _register_second_farmer()
    res_cross = client.post(
        "/api/v1/surveillance/reports",
        headers={"Authorization": f"Bearer {peer_token}"},
        json={
            "farm_id": "farm_001",
            "crop": "Tomato",
            "disease_name": "Early Blight (Alternaria solani)",
            "affected_area_ha": 0.5,
            "anonymous_community_consent": True,
        },
    )
    assert res_cross.status_code == 403


def test_02_report_creation_consent_privacy_and_duplicates():
    farmer_token = _login("farmer@raithamitra.in", "farmer123")
    peer_token, peer_farm_id = _register_second_farmer()
    today = datetime.now(timezone.utc).date().isoformat()

    # 1) Create a PRIVATE report (anonymous_community_consent=False) on peer farm
    private_res = client.post(
        "/api/v1/surveillance/reports",
        headers={"Authorization": f"Bearer {peer_token}"},
        json={
            "farm_id": peer_farm_id,
            "crop": "Tomato",
            "disease_name": "Late Blight (Phytophthora infestans)",
            "observation_date": today,
            "affected_area_ha": 0.4,
            "symptoms": ["Water-soaked dark spots"],
            "notes": "Private owner note near well",
            "anonymous_community_consent": False,
        },
    )
    assert private_res.status_code == 201, private_res.text

    # Community query by Suresh must NOT see peer's non-consented report
    comm_res = client.get(
        "/api/v1/surveillance/reports",
        headers={"Authorization": f"Bearer {farmer_token}"},
        params={"farm_id": "farm_001", "radius_km": 50},
    )
    assert comm_res.status_code == 200
    assert comm_res.json()["total_reports"] == 0

    # 2) Duplicate submission on same farm + crop + disease + date must fail with 409
    dup_res = client.post(
        "/api/v1/surveillance/reports",
        headers={"Authorization": f"Bearer {peer_token}"},
        json={
            "farm_id": peer_farm_id,
            "crop": "Tomato",
            "disease_name": "Late Blight (Phytophthora infestans)",
            "observation_date": today,
            "affected_area_ha": 0.4,
            "anonymous_community_consent": True,
        },
    )
    assert dup_res.status_code == 409

    # 3) Create CONSENTED community report for a different disease on peer farm
    consented_res = client.post(
        "/api/v1/surveillance/reports",
        headers={"Authorization": f"Bearer {peer_token}"},
        json={
            "farm_id": peer_farm_id,
            "crop": "Tomato",
            "disease_name": "Early Blight (Alternaria solani)",
            "observation_date": today,
            "affected_area_ha": 0.8,
            "symptoms": ["Target rings on lower leaves"],
            "notes": "Confidential farm note near borewell",
            "anonymous_community_consent": True,
        },
    )
    assert consented_res.status_code == 201

    # Suresh sees anonymized projection without private coordinates, farm_id, or notes
    comm_after = client.get(
        "/api/v1/surveillance/reports",
        headers={"Authorization": f"Bearer {farmer_token}"},
        params={"farm_id": "farm_001", "radius_km": 50},
    )
    assert comm_after.status_code == 200
    reports = comm_after.json()["reports"]
    assert len(reports) == 1
    rep = reports[0]
    assert rep["is_coordinate_anonymized"] is True
    assert rep["farm_id"] is None
    assert rep["notes"] is None
    assert "Verified Community Grower" in rep["reporter_label"]
    # Exact peer lat/lon (12.5510, 76.9210) must differ from coarsened community point
    assert (rep["latitude"], rep["longitude"]) != (12.5510, 76.9210)


def test_03_diagnostic_promotion_workflow():
    farmer_token = _login("farmer@raithamitra.in", "farmer123")
    res = client.post(
        "/api/v1/surveillance/reports/from-diagnostic",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "farm_id": "farm_001",
            "crop": "Tomato",
            "suspected_disease": "Early Blight (Alternaria solani)",
            "diagnostic_confidence": 0.87,
            "affected_area_ha": 0.6,
            "symptoms": ["Concentric lesions detected via leaf scan"],
            "image_reference": "leaf_001.jpg",
            "anonymous_community_consent": True,
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["verification_status"] == "ai_suspected"
    assert data["data_source"] == "crop_diagnostics_ai"
    assert data["diagnostic_confidence"] == pytest.approx(0.87, abs=0.01)


def test_04_haversine_distance_and_transmission_profiles():
    # Mandya (12.5234, 76.8976) to Bengaluru center (~12.9716, 77.5946) ~ 90.4 km
    d_km = haversine_km(12.5234, 76.8976, 12.9716, 77.5946)
    assert 85.0 <= d_km <= 95.0

    today_str = date(2026, 11, 26).isoformat()
    weather = {
        "temperature_c": 26.0,
        "relative_humidity_pct": 86,
        "precipitation_mm": 4.0,
        "wind_speed_kmh": 14.0,
        "wind_direction_deg": 270,  # blowing FROM west TOWARD east
    }

    # Airborne disease (Early Blight) uses directional wind
    airborne_reports = [
        {
            "id": "r_air",
            "farm_id": "farm_west",
            "crop": "Tomato",
            "disease_name": "Early Blight (Alternaria solani)",
            "observation_date": today_str,
            "latitude": 12.5234,
            "longitude": 76.8500,  # directly upwind (west) of 76.8976
            "verification_status": "expert_confirmed",
        }
    ]
    air_risk = assess_farm_disease_risk(
        target_lat=12.5234,
        target_lon=76.8976,
        target_crop="Tomato",
        crop_stage="Mid-Season",
        reports=airborne_reports,
        weather=weather,
        reference_date=date(2026, 11, 26),
    )
    assert air_risk["wind_dispersal_considered"] is True
    assert air_risk["risk_level"] in ("Moderate", "High", "Critical")
    assert "NOT a scientifically validated" in air_risk["disclaimer"]

    # Soil-borne disease (Bacterial Wilt) must NOT assume wind spread
    soil_reports = [
        {
            "id": "r_soil",
            "farm_id": "farm_west",
            "crop": "Tomato",
            "disease_name": "Bacterial Wilt (Ralstonia solanacearum)",
            "observation_date": today_str,
            "latitude": 12.5234,
            "longitude": 76.8500,
            "verification_status": "expert_confirmed",
        }
    ]
    soil_risk = assess_farm_disease_risk(
        target_lat=12.5234,
        target_lon=76.8976,
        target_crop="Tomato",
        crop_stage="Mid-Season",
        reports=soil_reports,
        weather=weather,
        reference_date=date(2026, 11, 26),
    )
    assert soil_risk["transmission_mode"] == "soil_water_borne"
    assert soil_risk["wind_dispersal_considered"] is False


def test_05_missing_weather_and_insufficient_evidence():
    today_str = date(2026, 11, 26).isoformat()
    # 1) Zero nearby reports -> Insufficient evidence
    insufficient = assess_farm_disease_risk(
        target_lat=12.5234,
        target_lon=76.8976,
        target_crop="Tomato",
        crop_stage="Mid-Season",
        reports=[],
        weather=None,
        reference_date=date(2026, 11, 26),
    )
    assert insufficient["risk_level"] == "Insufficient evidence"
    assert insufficient["heuristic_risk_index"] is None
    assert insufficient["weather_summary"]["weather_available"] is False

    # 2) Valid report with weather=None -> degrades gracefully without crashing or inventing temp
    no_weather_risk = assess_farm_disease_risk(
        target_lat=12.5234,
        target_lon=76.8976,
        target_crop="Tomato",
        crop_stage="Mid-Season",
        reports=[
            {
                "id": "r1",
                "farm_id": "f_near",
                "crop": "Tomato",
                "disease_name": "Early Blight (Alternaria solani)",
                "observation_date": today_str,
                "latitude": 12.5400,
                "longitude": 76.9050,
                "verification_status": "farmer_reported",
            }
        ],
        weather=None,
        reference_date=date(2026, 11, 26),
    )
    assert no_weather_risk["weather_summary"]["weather_available"] is False
    assert no_weather_risk["risk_level"] in ("Low", "Moderate", "High")
    assert any("unavailable" in l.lower() for l in no_weather_risk["limitations"])


def test_06_outbreak_clustering_single_farm_spam_protection():
    ref = date(2026, 11, 26)
    today_str = ref.isoformat()

    # 4 repeated reports from ONE single farm MUST NOT form a regional outbreak cluster
    single_farm_spam = [
        {
            "id": f"rep_{i}",
            "farm_id": "same_farm_only",
            "crop": "Tomato",
            "disease_name": "Early Blight (Alternaria solani)",
            "observation_date": today_str,
            "latitude": 12.5234,
            "longitude": 76.8976,
            "district": "Mandya",
            "verification_status": "expert_confirmed",
            "is_demonstration": False,
        }
        for i in range(4)
    ]
    res_single = detect_outbreak_clusters(single_farm_spam, reference_date=ref)
    assert len(res_single["clusters"]) == 0

    # 2 independent farms -> suspected_cluster
    two_farms = [
        {**single_farm_spam[0], "id": "r_a", "farm_id": "farm_a", "verification_status": "farmer_reported"},
        {
            **single_farm_spam[0],
            "id": "r_b",
            "farm_id": "farm_b",
            "latitude": 12.5410,
            "longitude": 76.9120,
            "verification_status": "ai_suspected",
        },
    ]
    res_two = detect_outbreak_clusters(two_farms, reference_date=ref)
    assert len(res_two["clusters"]) == 1
    assert res_two["clusters"][0]["classification"] == "suspected_cluster"

    # 3 independent farms + 1 expert confirmed -> confirmed_outbreak
    three_farms = two_farms + [
        {
            **single_farm_spam[0],
            "id": "r_c",
            "farm_id": "farm_c",
            "latitude": 12.5550,
            "longitude": 76.9300,
            "verification_status": "expert_confirmed",
        }
    ]
    res_three = detect_outbreak_clusters(three_farms, reference_date=ref)
    assert len(res_three["clusters"]) == 1
    assert res_three["clusters"][0]["classification"] == "confirmed_outbreak"
    assert res_three["clusters"][0]["independent_farms_count"] == 3


def test_07_demo_isolation_and_alert_lifecycle():
    farmer_token = _login("farmer@raithamitra.in", "farmer123")
    buyer_token = _login("buyer1@raithamitra.in", "buyer123")

    # 1) Activate Demonstration Mode map & risk evaluation
    demo_map = client.get(
        "/api/v1/surveillance/map",
        headers={"Authorization": f"Bearer {farmer_token}"},
        params={"farm_id": "farm_001", "demo_mode": True},
    )
    assert demo_map.status_code == 200
    demo_body = demo_map.json()
    assert demo_body["is_demonstration"] is True
    assert len(demo_body["markers"]) >= 4
    assert all(m["is_demonstration"] is True for m in demo_body["markers"])

    # 2) Verify LIVE map stays completely empty & isolated from demo records!
    live_map = client.get(
        "/api/v1/surveillance/map",
        headers={"Authorization": f"Bearer {farmer_token}"},
        params={"farm_id": "farm_001", "demo_mode": False},
    )
    assert live_map.status_code == 200
    assert len(live_map.json()["markers"]) == 0

    # 3) Demo risk evaluation generates deduplicated alerts for Suresh
    eval_res = client.post(
        "/api/v1/surveillance/alerts/evaluate",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={"farm_id": "farm_001", "demo_mode": True},
    )
    assert eval_res.status_code == 200, eval_res.text
    eval_data = eval_res.json()
    assert eval_data["risk_level"] in ("Moderate", "High", "Critical")
    assert len(eval_data["alerts"]) >= 1
    alert_id = eval_data["alerts"][0]["id"]
    assert eval_data["alerts"][0]["delivery_channel"] == "in_app_only"

    # Re-evaluating must NOT create duplicate alerts
    eval_again = client.post(
        "/api/v1/surveillance/alerts/evaluate",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={"farm_id": "farm_001", "demo_mode": True},
    )
    assert len(eval_again.json()["alerts"]) == len(eval_data["alerts"])

    # Unauthorized user cannot modify Suresh's alert
    unauth_patch = client.patch(
        f"/api/v1/surveillance/alerts/{alert_id}",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"status": "acknowledged"},
    )
    assert unauth_patch.status_code == 403

    # Suresh acknowledges & then dismisses alert
    ack_res = client.patch(
        f"/api/v1/surveillance/alerts/{alert_id}",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={"status": "acknowledged"},
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "acknowledged"


def test_08_voice_assistant_integration_contract_and_guidance():
    farmer_token = _login("farmer@raithamitra.in", "farmer123")

    contracts = client.get(
        "/api/v1/surveillance/assistant-tools",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert contracts.status_code == 200
    names = [t["name"] for t in contracts.json()["tools"]]
    for expected in [
        "get_nearby_disease_reports",
        "get_farm_disease_risk",
        "get_regional_outbreak_summary",
        "get_disease_prevention_actions",
        "get_active_disease_alerts",
        "prepare_community_disease_report",
    ]:
        assert expected in names

    # Test executing assistant tools via contract
    risk_call = client.post(
        "/api/v1/surveillance/assistant-tools/get_farm_disease_risk",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={"farm_id": "farm_001", "crop": "Tomato", "demo_mode": True},
    )
    assert risk_call.status_code == 200
    assert risk_call.json()["risk_assessment"]["crop"] == "Tomato"

    prep_call = client.post(
        "/api/v1/surveillance/assistant-tools/prepare_community_disease_report",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={"farm_id": "farm_001", "crop": "Tomato", "disease_name": "Early Blight"},
    )
    assert prep_call.status_code == 200
    assert prep_call.json()["requires_confirmation"] is True
    assert prep_call.json()["draft_report"]["anonymous_community_consent"] is False

    # Guidance must cover all 8 required priority crops
    guidance = client.get(
        "/api/v1/surveillance/guidance",
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert guidance.status_code == 200
    crops_covered = {g["crop"] for g in guidance.json()["guidance"]}
    for required_crop in ["Tomato", "Chilli", "Paddy", "Maize", "Potato", "Cotton", "Onion", "Groundnut"]:
        assert required_crop in crops_covered
