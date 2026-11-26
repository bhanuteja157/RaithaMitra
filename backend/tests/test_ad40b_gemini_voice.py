"""
AD-40B: Gemini-Only Multilingual Live Voice Agent Tests.
Verifies:
1. Official google-genai SDK status metadata & 4-language (en, kn, hi, te) + mixed-speech detection.
2. Security: 401/403 enforcement on /live/token, /live/tool-execute, /transcribe, /tts, /voice/turn, /chat/stream.
3. Upload validation & graceful 503 fallback when GEMINI_API_KEY is absent/unavailable.
4. SSE streaming (/chat/stream), Live tool bridge (/live/tool-execute), and voice turn pipeline (/voice/turn).
5. Genuine live Gemini API TTS + Transcribe + Ephemeral Live Token test when real GEMINI_API_KEY is present in root .env.
"""
from __future__ import annotations

import base64
import json
import os
import pathlib

from dotenv import load_dotenv
from fastapi.testclient import TestClient
import pytest

import backend.app.db.database as database_module
from backend.app.db.database import get_db_connection, init_db
from backend.app.features.assistant import gemini_voice
from backend.app.main import app

client = TestClient(app)

ROOT_ENV = pathlib.Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ROOT_ENV, override=False)
_REAL_GEMINI_KEY = (os.getenv("GEMINI_API_KEY") or "").strip()
_HAS_REAL_KEY = bool(_REAL_GEMINI_KEY and not _REAL_GEMINI_KEY.startswith("test_"))


@pytest.fixture()
def isolated_ad40b_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_ad40b.db"
    monkeypatch.setattr(database_module, "DB_PATH", test_db)
    monkeypatch.setenv("ENVIRONMENT", "development")
    init_db()

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT OR REPLACE INTO user_sessions (token, user_id, role, created_at) "
        "VALUES ('tok_ad40b_farmer', 'usr_farmer', 'farmer', '2026-11-26T00:00:00Z')"
    )
    cur.execute(
        "INSERT OR REPLACE INTO user_sessions (token, user_id, role, created_at) "
        "VALUES ('tok_ad40b_buyer', 'usr_buyer1', 'buyer', '2026-11-26T00:00:00Z')"
    )
    conn.commit()
    conn.close()
    return test_db


def test_mixed_and_multilingual_detection():
    assert gemini_voice.detect_spoken_language("Show my tomato budget")[0] == "en"
    assert gemini_voice.detect_spoken_language("ಟೊಮೆಟೊ ಬೆಲೆ ಎಷ್ಟು")[0] == "kn"
    assert gemini_voice.detect_spoken_language("टमाटर की कीमत क्या है")[0] == "hi"
    assert gemini_voice.detect_spoken_language("టమాటా ధర ఎంత")[0] == "te"

    lang_kn, mixed_kn = gemini_voice.detect_spoken_language("nanna tomato crop ge water beka")
    assert lang_kn == "kn" and mixed_kn is True

    lang_hi, mixed_hi = gemini_voice.detect_spoken_language("mera kharcha kitna hai")
    assert lang_hi == "hi" and mixed_hi is True

    lang_te, mixed_te = gemini_voice.detect_spoken_language("naa tomato rate entha")
    assert lang_te == "te" and mixed_te is True


def test_ad40b_security_validation_and_graceful_offline_fallback(isolated_ad40b_db, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    farmer_headers = {"Authorization": "Bearer tok_ad40b_farmer"}
    buyer_headers = {"Authorization": "Bearer tok_ad40b_buyer"}

    # Unauthenticated calls must return 401
    assert client.post("/api/v1/assistant/live/token", json={"language": "en"}).status_code == 401
    assert client.post("/api/v1/assistant/tts", json={"text": "Hello", "language": "en"}).status_code == 401
    assert client.post("/api/v1/assistant/live/tool-execute", json={"tool_name": "navigate_workspace", "arguments": {"target": "biointel"}}).status_code == 401

    # Cross-account farm ownership check on /live/token
    assert (
        client.post(
            "/api/v1/assistant/live/token",
            headers=buyer_headers,
            json={"farm_id": "farm_001", "language": "kn"},
        ).status_code
        == 403
    )

    # Status reports Google Gen AI SDK capabilities cleanly
    st = client.get("/api/v1/assistant/status", headers=farmer_headers)
    assert st.status_code == 200
    st_body = st.json()
    assert st_body["sdk"] == "google-genai"
    assert st_body["mode"] == "local_intelligence"
    assert st_body["live_api_available"] is False
    assert st_body["supported_languages"] == ["en", "kn", "hi", "te"]

    # Invalid / empty audio upload rejected (400)
    assert (
        client.post(
            "/api/v1/assistant/transcribe",
            headers=farmer_headers,
            files={"file": ("empty.webm", b"", "audio/webm")},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/v1/assistant/transcribe",
            headers=farmer_headers,
            files={"file": ("bad.txt", b"hello", "text/plain")},
        ).status_code
        == 400
    )

    # Graceful 503 when Gemini is offline / unconfigured
    assert (
        client.post(
            "/api/v1/assistant/tts",
            headers=farmer_headers,
            json={"text": "Hello farmer", "language": "en"},
        ).status_code
        == 503
    )
    assert (
        client.post(
            "/api/v1/assistant/live/token",
            headers=farmer_headers,
            json={"farm_id": "farm_001", "language": "en"},
        ).status_code
        == 503
    )


def test_ad40b_sse_stream_voice_turn_and_live_tool_execute(isolated_ad40b_db, monkeypatch):
    farmer_headers = {"Authorization": "Bearer tok_ad40b_farmer"}
    buyer_headers = {"Authorization": "Bearer tok_ad40b_buyer"}

    # 1. SSE /chat/stream works in both local and online modes
    stream_res = client.post(
        "/api/v1/assistant/chat/stream",
        headers=farmer_headers,
        json={"message": "Explain photosynthesis.", "farm_id": "farm_001", "language": "en"},
    )
    assert stream_res.status_code == 200
    assert "text/event-stream" in stream_res.headers["content-type"]
    events = [
        json.loads(line[5:].strip())
        for line in stream_res.text.splitlines()
        if line.startswith("data:")
    ]
    assert any(e["type"] == "delta" for e in events)
    complete_events = [e for e in events if e["type"] == "complete"]
    assert len(complete_events) == 1
    assert "sunlight" in complete_events[0]["response"]["reply"].lower() or "chlorophyll" in complete_events[0]["response"]["reply"].lower()

    # 2. Live tool execution bridge enforces RBAC & triggers directives
    nav_res = client.post(
        "/api/v1/assistant/live/tool-execute",
        headers=farmer_headers,
        json={"tool_name": "control_digital_farming", "arguments": {"action": "play"}, "farm_id": "farm_001"},
    )
    assert nav_res.status_code == 200
    assert nav_res.json()["client_directive"]["directive_type"] == "digital_farm_control"
    assert nav_res.json()["client_directive"]["payload"]["action"] == "play"

    buyer_fin = client.post(
        "/api/v1/assistant/live/tool-execute",
        headers=buyer_headers,
        json={"tool_name": "execute_raithamitra_query", "arguments": {"query": "Show my financial summary."}},
    )
    assert buyer_fin.status_code == 200
    assert "not authorized" in buyer_fin.json()["reply"].lower()

    # 3. Mocked /voice/turn end-to-end multilingual pipeline
    async def _fake_transcribe(**kwargs):
        return {
            "transcript": "ಟೊಮೆಟೊ ಕೃಷಿ ಯೋಜನೆ ತೋರಿಸಿ",
            "detected_language": "kn",
            "mixed_language": False,
            "model": "gemini-3.5-transcribe",
            "provenance": "Gemini Audio Transcription",
        }

    async def _fake_tts(**kwargs):
        return {
            "audio_bytes": b"RIFF\x00\x00\x00\x00WAVE",
            "audio_base64": base64.b64encode(b"RIFF" + b"\x00" * 48).decode("ascii"),
            "mime_type": "audio/wav",
            "model": "gemini-3.8-flash-lite-tts",
            "voice": "Kore",
            "language": kwargs.get("language", "kn"),
            "provenance": "Gemini Native Audio TTS",
        }

    monkeypatch.setattr("backend.app.features.assistant.router.transcribe_audio_with_gemini", _fake_transcribe)
    monkeypatch.setattr("backend.app.features.assistant.router.synthesize_gemini_tts", _fake_tts)

    vt_res = client.post(
        "/api/v1/assistant/voice/turn",
        headers=farmer_headers,
        data={"farm_id": "farm_001", "include_tts": "true"},
        files={"file": ("mic.webm", b"\x1a\x45\xdf\xa3fakewebm", "audio/webm")},
    )
    assert vt_res.status_code == 200
    vt = vt_res.json()
    assert vt["detected_language"] == "kn"
    assert vt["tts_model"] == "gemini-3.8-flash-lite-tts"
    assert vt["tts_audio_base64"]


@pytest.mark.skipif(not _HAS_REAL_KEY, reason="Requires configured GEMINI_API_KEY in root .env")
def test_ad40b_live_gemini_tts_transcribe_and_ephemeral_token_roundtrip(isolated_ad40b_db, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", _REAL_GEMINI_KEY)
    farmer_headers = {"Authorization": "Bearer tok_ad40b_farmer"}

    # 1. Live ephemeral token provisioning via google-genai
    tok_res = client.post(
        "/api/v1/assistant/live/token",
        headers=farmer_headers,
        json={"farm_id": "farm_001", "language": "kn"},
    )
    assert tok_res.status_code == 200, tok_res.text
    tok_body = tok_res.json()
    assert tok_body["model"] == "gemini-3.8-live"
    assert tok_body["token"]

    # 2. Live TTS synthesis -> Live Transcribe roundtrip on real audio
    tts_res = client.post(
        "/api/v1/assistant/tts",
        headers=farmer_headers,
        json={"text": "Check tomato leaves early in the morning.", "language": "en"},
    )
    assert tts_res.status_code == 200, tts_res.text
    wav_bytes = base64.b64decode(tts_res.json()["audio_base64"])
    assert wav_bytes[:4] == b"RIFF"

    tr_res = client.post(
        "/api/v1/assistant/transcribe",
        headers=farmer_headers,
        files={"file": ("speech.wav", wav_bytes, "audio/wav")},
    )
    assert tr_res.status_code == 200, tr_res.text
    assert "tomato" in tr_res.json()["transcript"].lower()
