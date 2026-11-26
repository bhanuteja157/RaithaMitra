"""
AD-38: Unified Marketplace, Live AGMARKNET Intelligence & AgriFlow Integration Tests.
"""
from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.db.database import init_db
from backend.app.features.auth.security import reset_rate_limits
from backend.app.features.market_intelligence.normalization import normalize_commodity_name
from backend.app.features.market_intelligence.providers import (
    get_data_gov_api_key,
    resolve_agmarknet_commodity_query,
)
from backend.app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _setup():
    init_db()
    reset_rate_limits()
    yield
    reset_rate_limits()


def test_agmarknet_env_aliases_and_commodity_disambiguation():
    with patch.dict(os.environ, {"DATA_GOV_IN_API_KEY": "", "DATA_GOV_API_KEY": "alias-key-1", "MANDI_API_KEY": ""}, clear=False):
        assert get_data_gov_api_key() == "alias-key-1"
    with patch.dict(os.environ, {"DATA_GOV_IN_API_KEY": "", "DATA_GOV_API_KEY": "", "MANDI_API_KEY": "alias-key-2"}, clear=False):
        assert get_data_gov_api_key() == "alias-key-2"

    # Never confuse Green Chilli, Dry Chilli, Capsicum, Black Pepper, White Pepper
    assert normalize_commodity_name("Green Chilli") == "Green Chilli"
    assert normalize_commodity_name("Dry Chillies") == "Dry Chilli"
    assert normalize_commodity_name("Capsicum") == "Capsicum"
    assert normalize_commodity_name("Black Pepper") == "Black Pepper"
    assert normalize_commodity_name("White Pepper") == "White Pepper"

    assert resolve_agmarknet_commodity_query("Green Chilli") == "Green Chilli"
    assert resolve_agmarknet_commodity_query("Dry Chilli") == "Dry Chillies"
    assert resolve_agmarknet_commodity_query("Capsicum") == "Capsicum"
    assert resolve_agmarknet_commodity_query("Black Pepper") == "Black Pepper"
    assert resolve_agmarknet_commodity_query("White Pepper") == "White Pepper"


def test_live_fetch_missing_credentials_and_nearby_fallback():
    farmer_headers = {"Authorization": "Bearer rm_demo_token_farmer"}
    with patch.dict(os.environ, {"DATA_GOV_IN_API_KEY": "", "DATA_GOV_API_KEY": "", "MANDI_API_KEY": ""}, clear=False):
        res = client.post(
            "/api/v1/market-intelligence/fetch-live",
            headers=farmer_headers,
            json={"commodity": "Green Chilli", "state": "Karnataka", "district": "Ballari"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "not_configured"
        assert body["is_live"] is False

    # Mock district returning 0 records -> nearby_records fetched separately
    async def fake_fetch(**kwargs):
        if kwargs.get("district") == "Ballari":
            return {"status": "live", "records": []}
        return {
            "status": "live",
            "records": [
                {
                    "id": "obs_mock_kolar",
                    "commodity": "Tomato",
                    "variety": "Local",
                    "grade": "FAQ",
                    "state": "Karnataka",
                    "district": "Kolar",
                    "market": "Kolar APMC",
                    "observation_date": "2026-11-25",
                    "min_price_per_quintal": 1800.0,
                    "max_price_per_quintal": 2400.0,
                    "modal_price_per_quintal": 2100.0,
                    "modal_price_per_kg": 21.0,
                    "source_type": "official_agmarknet",
                    "source_name": "AGMARKNET / Data.gov.in",
                    "provenance_label": "Official AGMARKNET Observation",
                    "retrieved_at": "2026-11-26T00:00:00Z",
                }
            ],
        }

    with patch("backend.app.features.market_intelligence.service.fetch_agmarknet_records", side_effect=fake_fetch):
        res2 = client.post(
            "/api/v1/market-intelligence/fetch-live",
            headers=farmer_headers,
            json={"commodity": "Tomato", "state": "Karnataka", "district": "Ballari"},
        )
        assert res2.status_code == 200
        b2 = res2.json()
        assert b2["district_match"] is False
        assert len(b2["nearby_records"]) == 1
        assert b2["nearby_records"][0]["district"] == "Kolar"


def test_buyer_discovery_direct_selling_and_bidding_upgrades():
    farmer_headers = {"Authorization": "Bearer rm_demo_token_farmer"}
    buyer1_headers = {"Authorization": "Bearer rm_demo_token_buyer"}
    b2_login = client.post("/api/v1/auth/login", json={"email": "buyer2@raithamitra.in", "password": "buyer123", "role": "buyer"})
    buyer2_headers = {"Authorization": f"Bearer {b2_login.json()['access_token']}"}

    # 1. Registered buyer discovery (privacy-safe: no private phone/email)
    buyers_res = client.get("/api/v1/bidding/buyers?crop=Tomato&lat=12.52&lon=76.89")
    assert buyers_res.status_code == 200
    buyers = buyers_res.json()
    assert len(buyers) >= 2
    for b in buyers:
        assert "phone" not in b
        assert "email" not in b

    # 2. Direct proposal -> counteroffer -> dual-party confirmation -> single PO
    prop_res = client.post(
        "/api/v1/bidding/direct-proposals",
        headers=farmer_headers,
        json={
            "farm_id": "farm_001",
            "buyer_id": "usr_buyer2",
            "crop_name": "Tomato",
            "quantity_kg": 800.0,
            "proposed_price_per_kg": 26.0,
        },
    )
    assert prop_res.status_code == 201
    prop_id = prop_res.json()["id"]

    # Buyer counters at ₹24.5/kg
    cnt_res = client.post(
        f"/api/v1/bidding/direct-proposals/{prop_id}/respond",
        headers=buyer2_headers,
        json={"action": "counter", "counter_price_per_kg": 24.5, "notes": "Deliver to Bandipalya yard"},
    )
    assert cnt_res.status_code == 200
    assert cnt_res.json()["status"] == "countered"

    # Farmer confirms counteroffer -> generates single PO with actual buyer delivery address
    conf_res = client.post(f"/api/v1/bidding/direct-proposals/{prop_id}/confirm", headers=farmer_headers)
    assert conf_res.status_code == 200
    assert conf_res.json()["status"] == "confirmed"
    assert conf_res.json()["order"]["price_per_kg"] == 24.5
    assert "Bandipalya" in conf_res.json()["order"]["delivery_location"]

    # Duplicate confirmation rejected
    dup_conf = client.post(f"/api/v1/bidding/direct-proposals/{prop_id}/confirm", headers=farmer_headers)
    assert dup_conf.status_code == 400

    # 3. Bidding: expired deadline rejected & farmer can confirm selected non-highest bid
    past_deadline = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    exp_list = client.post(
        "/api/v1/bidding/listings",
        headers=farmer_headers,
        json={
            "farmer_id": "usr_farmer",
            "farmer_name": "Suresh Gowda",
            "farm_id": "farm_001",
            "crop_name": "Tomato",
            "quantity_kg": 500.0,
            "min_price_per_kg": 20.0,
            "harvest_date": "2026-11-26",
            "location": "Mandya",
            "bidding_deadline": past_deadline,
        },
    ).json()
    exp_bid = client.post(
        f"/api/v1/bidding/listings/{exp_list['id']}/bid",
        headers=buyer1_headers,
        json={"buyer_id": "usr_buyer1", "buyer_name": "Bengaluru Fresh Foods Co", "bid_per_kg": 22.0},
    )
    assert exp_bid.status_code == 400
    assert "expired" in exp_bid.json()["detail"].lower()

    future_deadline = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    live_list = client.post(
        "/api/v1/bidding/listings",
        headers=farmer_headers,
        json={
            "farmer_id": "usr_farmer",
            "farmer_name": "Suresh Gowda",
            "farm_id": "farm_001",
            "crop_name": "Tomato",
            "quantity_kg": 500.0,
            "min_price_per_kg": 20.0,
            "harvest_date": "2026-11-26",
            "location": "Mandya",
            "bidding_deadline": future_deadline,
        },
    ).json()
    b1 = client.post(
        f"/api/v1/bidding/listings/{live_list['id']}/bid",
        headers=buyer1_headers,
        json={"buyer_id": "usr_buyer1", "buyer_name": "Bengaluru Fresh Foods Co", "bid_per_kg": 22.0},
    ).json()
    client.post(
        f"/api/v1/bidding/listings/{live_list['id']}/bid",
        headers=buyer2_headers,
        json={"buyer_id": "usr_buyer2", "buyer_name": "Mysuru Organic Retail Ltd", "bid_per_kg": 26.0},
    )
    # Farmer chooses Buyer 1's bid (₹22/kg) explicitly
    sel_confirm = client.post(
        f"/api/v1/bidding/listings/{live_list['id']}/confirm?bid_id={b1['bid_id']}",
        headers=farmer_headers,
    )
    assert sel_confirm.status_code == 200
    assert sel_confirm.json()["order"]["price_per_kg"] == 22.0
    assert "Yeshwanthpur" in sel_confirm.json()["order"]["delivery_location"]


def test_packaging_cold_chain_and_qr_passport_privacy():
    farmer_headers = {"Authorization": "Bearer rm_demo_token_farmer"}

    pkg_res = client.post(
        "/api/v1/post-harvest/packaging/recommend",
        headers=farmer_headers,
        json={
            "crop_name": "Tomato",
            "quantity_kg": 2000.0,
            "ripeness": "ripe",
            "distance_km": 220.0,
            "market_type": "cold_chain_retail",
        },
    )
    assert pkg_res.status_code == 200
    pkg = pkg_res.json()
    assert pkg["is_estimate"] is True
    assert pkg["cold_chain_recommended"] is True
    assert pkg["recommended_units_count"] == 100  # 2000 / 20 kg crates
    assert pkg["transport_cost_comparison_inr"]["refrigerated_vehicle_estimate"] > pkg["transport_cost_comparison_inr"]["ordinary_vehicle_estimate"]

    # Create QR Produce Passport & verify public endpoint strips private farmer PII
    pass_res = client.post(
        "/api/v1/post-harvest/passports",
        headers=farmer_headers,
        json={
            "farm_id": "farm_001",
            "crop_name": "Tomato",
            "variety": "Arka Rakshak",
            "harvest_date": "2026-11-26",
            "quantity_kg": 2000.0,
            "packaging_summary": "100 Ventilated HDPE Crates with kraft liner",
            "storage_conditions": "10–13 °C Pre-cooled",
            "is_demonstration": True,
        },
    )
    assert pass_res.status_code == 201
    batch_code = pass_res.json()["batch_code"]

    pub_res = client.get(f"/api/v1/post-harvest/passports/public/{batch_code}")
    assert pub_res.status_code == 200
    pub = pub_res.json()
    assert pub["batch_code"] == batch_code
    assert "Karnataka" in pub["origin_region"]
    assert "farmer_id" not in pub
    assert "farm_id" not in pub
    assert "not blockchain" in pub["integrity_verification_method"].lower()


def test_official_csv_fallback_and_ad39_voice_assistant_queries():
    farmer_headers = {"Authorization": "Bearer rm_demo_token_farmer"}

    # 1. Bundled sample CSV loads explicitly labelled as demonstration_csv and isolated from real recommendations
    csv_res = client.post("/api/v1/market-intelligence/load-official-csv-fallback", headers=farmer_headers)
    assert csv_res.status_code == 200
    assert csv_res.json()["valid_records"] == 7
    assert csv_res.json()["total_rows"] == 7

    # Default observations / history must exclude demonstration_csv rows
    obs_default = client.get("/api/v1/market-intelligence/observations", params={"commodity": "Tomato"}).json()["observations"]
    assert all(r["source_type"] != "demonstration_csv" for r in obs_default)
    obs_demo = client.get(
        "/api/v1/market-intelligence/observations",
        params={"commodity": "Tomato", "source_type": "demonstration_csv", "include_demo": True},
    ).json()["observations"]
    assert len(obs_demo) >= 1

    # 2. AD-39 Voice Assistant: Buyer discovery query
    b_chat = client.post(
        "/api/v1/assistant/chat",
        headers=farmer_headers,
        json={"message": "Who wants to buy my tomatoes?", "farm_id": "farm_001", "language": "en"},
    )
    assert b_chat.status_code == 200
    assert b_chat.json()["intent"] == "buyer_discovery_query"
    assert any(c["card_type"] == "buyer_discovery" for c in b_chat.json()["cards"])

    # 3. AD-39 Voice Assistant: Packaging query
    p_chat = client.post(
        "/api/v1/assistant/chat",
        headers=farmer_headers,
        json={"message": "How should I pack 1000 kg of tomatoes?", "farm_id": "farm_001", "language": "en"},
    )
    assert p_chat.status_code == 200
    assert p_chat.json()["intent"] == "packaging_query"
    assert any(c["card_type"] == "packaging" for c in p_chat.json()["cards"])
