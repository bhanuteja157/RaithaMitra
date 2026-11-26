"""
AD-39 Universal Agentic Voice & Conversational Intelligence Tests.
Verifies all 15 Mandatory Demonstration Commands across:
- Intent classification & entity extraction (weights vs budgets, incremental BioIntel slots)
- Conversational context & follow-up language adaptation ("Explain photosynthesis" -> "Explain that in Kannada")
- Online Gemini mocked path + Deterministic offline local knowledge fallback
- Module execution (BioIntel, Digital Farming, Market Prices, Buyer Discovery 500 kg, Crop Doctor, Finance Summary, Decision Summary)
- Role-based navigation & RBAC enforcement
"""
from __future__ import annotations

from typing import Any, Dict
from fastapi.testclient import TestClient
import pytest

import backend.app.db.database as database_module
from backend.app.db.database import get_db_connection, init_db
from backend.app.features.assistant import general_qa
from backend.app.features.market_intelligence import service as market_intel_service
from backend.app.main import app

client = TestClient(app)


@pytest.fixture()
def isolated_ad39_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_ad39_voice.db"
    monkeypatch.setattr(database_module, "DB_PATH", test_db)
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    init_db()

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT OR REPLACE INTO user_sessions (token, user_id, role, created_at) VALUES ('tok_f_ad39', 'usr_farmer', 'farmer', '2026-11-26T00:00:00Z')"
    )
    cur.execute(
        "INSERT OR REPLACE INTO user_sessions (token, user_id, role, created_at) VALUES ('tok_b_ad39', 'usr_buyer1', 'buyer', '2026-11-26T00:00:00Z')"
    )
    conn.commit()
    conn.close()
    return test_db


def test_ad39_all_15_mandatory_commands_offline(isolated_ad39_db, monkeypatch):
    async def _no_live_gov(*args, **kwargs):
        return {"records": [], "nearby_records": []}

    monkeypatch.setattr(market_intel_service, "fetch_and_cache_live", _no_live_gov)

    headers = {"Authorization": "Bearer tok_f_ad39"}

    # 1. Go to BioIntel.
    r1 = client.post("/api/v1/assistant/chat", headers=headers, json={"message": "Go to BioIntel.", "farm_id": "farm_001"})
    assert r1.status_code == 200
    assert r1.json()["intent"] == "navigate"
    assert r1.json()["client_directive"]["route"] == "/biointel"

    # 2. Select tomato. (incremental BioIntel slot fill)
    r2 = client.post("/api/v1/assistant/chat", headers=headers, json={"message": "Select tomato.", "farm_id": "farm_001"})
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["intent"] == "biointel_slot"
    assert d2["client_directive"]["directive_type"] == "biointel_fill"
    assert d2["client_directive"]["payload"]["crop"] == "Tomato"
    assert d2["client_directive"]["payload"]["autoGenerate"] is False
    bio_conv_id = d2["conversation_id"]

    # 3. Set my budget to ₹50,000. (preserves Tomato in same conversation)
    r3 = client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={"message": "Set my budget to ₹50,000.", "conversation_id": bio_conv_id, "farm_id": "farm_001"},
    )
    assert r3.status_code == 200
    d3 = r3.json()
    assert d3["intent"] == "biointel_slot"
    assert d3["client_directive"]["payload"]["budgetInr"] == 50000.0
    assert "Tomato" in d3["reply"]

    # 4. Calculate my cultivation investment. (runs full calculation with merged slots)
    r4 = client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={"message": "Calculate my cultivation investment.", "conversation_id": bio_conv_id, "farm_id": "farm_001"},
    )
    assert r4.status_code == 200
    d4 = r4.json()
    assert "generate_seed_investment_plan" in d4["tools_used"]
    assert d4["client_directive"]["directive_type"] == "biointel_fill"
    assert d4["client_directive"]["payload"]["crop"] == "Tomato"
    assert d4["client_directive"]["payload"]["budgetInr"] == 50000.0
    assert d4["client_directive"]["payload"]["autoGenerate"] is True

    # 5. Open Digital Farming.
    r5 = client.post("/api/v1/assistant/chat", headers=headers, json={"message": "Open Digital Farming.", "farm_id": "farm_001"})
    assert r5.status_code == 200
    assert r5.json()["intent"] == "navigate"
    assert r5.json()["client_directive"]["route"] == "/digital-farming"

    # 6. Start the simulation.
    r6 = client.post("/api/v1/assistant/chat", headers=headers, json={"message": "Start the simulation.", "farm_id": "farm_001"})
    assert r6.status_code == 200
    assert r6.json()["intent"] == "digital_farm_control"
    assert r6.json()["client_directive"]["payload"]["action"] == "play"

    # 7. Pause the simulation.
    r7 = client.post("/api/v1/assistant/chat", headers=headers, json={"message": "Pause the simulation.", "farm_id": "farm_001"})
    assert r7.status_code == 200
    assert r7.json()["intent"] == "digital_farm_control"
    assert r7.json()["client_directive"]["payload"]["action"] == "pause"

    # 8. Show today's market prices.
    r8 = client.post("/api/v1/assistant/chat", headers=headers, json={"message": "Show today's market prices.", "farm_id": "farm_001"})
    assert r8.status_code == 200
    assert "get_market_intelligence" in r8.json()["tools_used"]

    # 9. Find buyers for 500 kg of tomatoes.
    r9 = client.post("/api/v1/assistant/chat", headers=headers, json={"message": "Find buyers for 500 kg of tomatoes.", "farm_id": "farm_001"})
    assert r9.status_code == 200
    d9 = r9.json()
    assert d9["intent"] == "buyer_discovery_query"
    assert "discover_buyers_tool" in d9["tools_used"]
    assert d9["client_directive"]["route"] == "/smart-market?section=find_buyers"
    assert d9["client_directive"]["payload"]["crop"] == "Tomato"
    assert d9["client_directive"]["payload"]["quantity_kg"] == 500.0

    # 10. Open Crop Doctor.
    r10 = client.post("/api/v1/assistant/chat", headers=headers, json={"message": "Open Crop Doctor.", "farm_id": "farm_001"})
    assert r10.status_code == 200
    d10 = r10.json()
    assert "check_crop_health_adapter" in d10["tools_used"]
    assert d10["client_directive"]["route"] == "/crop-health?section=diagnostics"

    # 11. Show my financial summary.
    assert client.post("/api/v1/finance/demo-scenario?farm_id=farm_001", headers=headers).status_code == 200
    r11 = client.post("/api/v1/assistant/chat", headers=headers, json={"message": "Show my financial summary.", "farm_id": "farm_001"})
    assert r11.status_code == 200
    assert r11.json()["intent"] == "finance_query"
    assert "get_financial_intelligence" in r11.json()["tools_used"]

    # 12. What should I do today?
    r12 = client.post("/api/v1/assistant/chat", headers=headers, json={"message": "What should I do today?", "farm_id": "farm_001"})
    assert r12.status_code == 200
    assert "get_farm_decision_summary" in r12.json()["tools_used"]

    # 13. Explain photosynthesis.
    r13 = client.post("/api/v1/assistant/chat", headers=headers, json={"message": "Explain photosynthesis.", "farm_id": "farm_001"})
    assert r13.status_code == 200
    d13 = r13.json()
    assert d13["intent"] == "general_question"
    assert "chlorophyll" in d13["reply"].lower() or "sunlight" in d13["reply"].lower()
    assert "could not match" not in d13["reply"].lower()
    qa_conv_id = d13["conversation_id"]

    # 14. Explain that in Kannada. (conversational follow-up in SAME conversation)
    r14 = client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={"message": "Explain that in Kannada.", "conversation_id": qa_conv_id, "farm_id": "farm_001"},
    )
    assert r14.status_code == 200
    d14 = r14.json()
    assert d14["intent"] == "followup_context"
    assert d14["language"] == "kn"
    assert "ದ್ವಿತಿಸಂಶ್ಲೇಷಣೆ" in d14["reply"] or any("\u0c80" <= ch <= "\u0cff" for ch in d14["reply"])

    # 15. Take me back to the dashboard.
    r15 = client.post("/api/v1/assistant/chat", headers=headers, json={"message": "Take me back to the dashboard.", "farm_id": "farm_001"})
    assert r15.status_code == 200
    assert r15.json()["intent"] == "navigate"
    assert r15.json()["client_directive"]["route"] == "/"


def test_ad39_gemini_online_mode_and_history_followup(isolated_ad39_db, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test_gemini_key_redacted")
    captured_prompts = []

    async def _fake_fetch_json(*, url: str, json_body: Dict[str, Any], **kwargs):
        prompt_text = json_body["contents"][0]["parts"][0]["text"]
        captured_prompts.append(prompt_text)
        if "Kannada" in prompt_text:
            return {"candidates": [{"content": {"parts": [{"text": "ದ್ವಿತಿಸಂಶ್ಲೇಷಣೆ ಎಂದರೆ ಸಸ್ಯಗಳು ಸೂರ್ಯನ ಬೆಳಕಿನಿಂದ ಆಹಾರ ತಯಾರಿಸುವ ಪ್ರಕ್ರಿಯೆ."}]}}]}
        return {"candidates": [{"content": {"parts": [{"text": "Photosynthesis converts sunlight, water, and CO2 into glucose and oxygen."}]}}]}

    monkeypatch.setattr(general_qa, "fetch_json_with_resilience", _fake_fetch_json)
    headers = {"Authorization": "Bearer tok_f_ad39"}

    res1 = client.post("/api/v1/assistant/chat", headers=headers, json={"message": "Explain photosynthesis.", "farm_id": "farm_001"})
    assert res1.status_code == 200
    assert res1.json()["mode"] == "online_gemini"
    conv_id = res1.json()["conversation_id"]

    res2 = client.post(
        "/api/v1/assistant/chat",
        headers=headers,
        json={"message": "Explain that in Kannada.", "conversation_id": conv_id, "farm_id": "farm_001"},
    )
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["mode"] == "online_gemini"
    assert d2["language"] == "kn"
    assert "ಸಸ್ಯಗಳು" in d2["reply"]
    assert "Photosynthesis converts sunlight" in captured_prompts[1]


def test_ad39_rbac_isolation_across_roles(isolated_ad39_db):
    buyer_headers = {"Authorization": "Bearer tok_b_ad39"}

    # Buyer dashboard navigation goes to /dashboard/buyer
    r_nav = client.post("/api/v1/assistant/chat", headers=buyer_headers, json={"message": "Take me back to the dashboard."})
    assert r_nav.status_code == 200
    assert r_nav.json()["client_directive"]["route"] == "/dashboard/buyer"

    # Buyer cannot trigger farmer-only BioIntel slot updates or financial summary
    r_bio = client.post("/api/v1/assistant/chat", headers=buyer_headers, json={"message": "Select tomato."})
    assert r_bio.status_code == 200
    assert "restricted" in r_bio.json()["reply"].lower()

    r_fin = client.post("/api/v1/assistant/chat", headers=buyer_headers, json={"message": "Show my financial summary."})
    assert r_fin.status_code == 200
    assert "not authorized" in r_fin.json()["reply"].lower()
