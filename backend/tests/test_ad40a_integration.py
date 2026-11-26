"""
AD-40A Final Hindu Integration Regression Tests.
Verifies:
1. 4-language (en, kn, hi, te) localization across Recommendations, Schemes, and Crop Diagnostics APIs.
2. AD-37 RBAC & cross-account farm ownership isolation preserved on Crop Diagnostics & Satellite Monitoring.
3. Demonstration CSV dataset (agmarknet_sample_official.csv) isolated as `demonstration_csv` from real queries and assistant prices.
4. AD-36 binary ONNX model & PlantVillage fixture exclusion in .gitignore and Git index (`git ls-files`).
5. AD-39 Universal Voice Assistant directives remain functional alongside AD-40A Digital Farming updates.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
import io
import pathlib
import subprocess
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from PIL import Image
import pytest

import backend.app.db.database as database_module
from backend.app.db.database import get_db_connection, init_db
from backend.app.features.market_intelligence import service as market_intel_service
from backend.app.main import app
from backend.app.schemas.weather import CurrentWeather, DailyForecast, Provenance, WeatherResponse

client = TestClient(app)
REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]


def _make_jpeg_bytes(color=(42, 132, 54)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (128, 128), color=color).save(buf, format="JPEG")
    return buf.getvalue()


def _mock_weather_response() -> WeatherResponse:
    now = datetime.now(timezone.utc)
    return WeatherResponse(
        latitude=12.52,
        longitude=76.89,
        elevation_m=720.0,
        timezone="Asia/Kolkata",
        current=CurrentWeather(
            time=now,
            temperature_c=29.0,
            relative_humidity_pct=65,
            precipitation_mm=2.0,
            rain_probability_pct=20,
            wind_speed_kmh=9.0,
            wind_direction_deg=210,
            weather_code=1,
            condition_text="Partly cloudy",
            et0_fao56_mm=4.2,
        ),
        daily_forecast=[
            DailyForecast(
                date=date.today(),
                temp_max_c=31.0,
                temp_min_c=20.0,
                precipitation_sum_mm=2.0,
                rain_probability_max_pct=20,
                et0_fao56_mm=4.2,
                condition_text="Partly cloudy",
            )
        ],
        provenance=Provenance(source="mock_test", timestamp=now, quality="mock", is_live=False),
    )


@pytest.fixture()
def isolated_ad40a_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_ad40a.db"
    monkeypatch.setattr(database_module, "DB_PATH", test_db)
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    init_db()

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT OR REPLACE INTO user_sessions (token, user_id, role, created_at) "
        "VALUES ('tok_ad40a_farmer', 'usr_farmer', 'farmer', '2026-11-26T00:00:00Z')"
    )
    cur.execute(
        "INSERT OR REPLACE INTO user_sessions (token, user_id, role, created_at) "
        "VALUES ('tok_ad40a_buyer', 'usr_buyer1', 'buyer', '2026-11-26T00:00:00Z')"
    )
    conn.commit()
    conn.close()
    return test_db


@pytest.mark.parametrize(
    ("lang", "min_code", "max_code"),
    [
        ("kn", "\u0c80", "\u0cff"),
        ("hi", "\u0900", "\u097f"),
        ("te", "\u0c00", "\u0c7f"),
    ],
)
def test_multilingual_endpoints_kn_hi_te(isolated_ad40a_db, lang: str, min_code: str, max_code: str):
    # 1. Recommendations ?lang=...
    with patch(
        "backend.app.services.weather_service.weather_service.get_weather",
        new=AsyncMock(return_value=_mock_weather_response()),
    ):
        rec_res = client.get(f"/api/v1/recommendations?farm_id=farm_001&lang={lang}")
    assert rec_res.status_code == 200
    rec_body = rec_res.json()
    assert rec_body["lang"] == lang
    assert len(rec_body["recommendations"]) >= 1
    first_rec = rec_body["recommendations"][0]
    assert first_rec.get("localized_title")
    assert any(min_code <= ch <= max_code for ch in first_rec["localized_title"])

    # 2. Schemes ?lang=...
    sch_res = client.get(f"/api/v1/schemes?lang={lang}")
    assert sch_res.status_code == 200
    schemes = sch_res.json()
    assert len(schemes) >= 1
    assert schemes[0]["lang"] == lang
    assert any(min_code <= ch <= max_code for ch in schemes[0]["objective_localized"])

    # 3. Crop Diagnostics knowledge ?lang=...
    kn_res = client.get(f"/api/v1/crop-diagnostics/knowledge?crop=Tomato&disease=Early%20Blight&lang={lang}")
    assert kn_res.status_code == 200
    kn_body = kn_res.json()
    assert kn_body["lang"] == lang
    assert any(min_code <= ch <= max_code for ch in kn_body["localized_summary"]["advisory_note"])

    # 4. Crop Diagnostics analyze form lang=...
    diag_res = client.post(
        "/api/v1/crop-diagnostics/analyze",
        data={"crop": "Tomato", "lang": lang},
        files={"file": ("leaf.jpg", _make_jpeg_bytes(), "image/jpeg")},
    )
    assert diag_res.status_code == 200
    diag_body = diag_res.json()
    assert diag_body["lang"] == lang
    assert any(min_code <= ch <= max_code for ch in diag_body["localized_summary"]["advisory_note"])


def test_ad37_ownership_and_security_preserved_on_ad40a_endpoints(isolated_ad40a_db):
    farmer_headers = {"Authorization": "Bearer tok_ad40a_farmer"}
    buyer_headers = {"Authorization": "Bearer tok_ad40a_buyer"}

    # Unauthenticated access to private authenticated diagnostics & registered-farm satellite monitoring must fail
    assert (
        client.post(
            "/api/v1/crop-diagnostics/analyze-authenticated",
            data={"crop": "Tomato", "farm_id": "farm_001"},
            files={"file": ("leaf.jpg", _make_jpeg_bytes(), "image/jpeg")},
        ).status_code
        == 401
    )

    sample_poly = [[76.85, 12.51], [76.86, 12.51], [76.86, 12.52], [76.85, 12.52], [76.85, 12.51]]
    assert (
        client.post(
            "/api/v1/satellite-monitoring/timelapse",
            json={
                "coordinates": sample_poly,
                "start_date": "2026-10-01",
                "end_date": "2026-11-26",
                "farm_id": "farm_001",
            },
        ).status_code
        == 401
    )

    # Non-owner (buyer) cannot run authenticated diagnostics or satellite sync on usr_farmer's farm_001
    assert (
        client.post(
            "/api/v1/crop-diagnostics/analyze-authenticated",
            headers=buyer_headers,
            data={"crop": "Tomato", "farm_id": "farm_001", "lang": "te"},
            files={"file": ("leaf.jpg", _make_jpeg_bytes(), "image/jpeg")},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/v1/satellite-monitoring/parcels/sync",
            headers=buyer_headers,
            json={
                "farm_id": "farm_001",
                "farm_name": "Unauthorized Parcel",
                "crop_name": "Maize",
                "sowing_date": "2026-10-01",
                "area_acres": 2.0,
                "coordinates": sample_poly,
            },
        ).status_code
        == 403
    )

    # Unsafe/blocked upload payload rejected at validation layer (400); corrupted PNG rejected at decode layer (invalid_image)
    assert (
        client.post(
            "/api/v1/crop-diagnostics/analyze-authenticated",
            headers=farmer_headers,
            data={"crop": "Tomato", "farm_id": "farm_001"},
            files={"file": ("payload.svg", b"<svg onload='alert(1)'></svg>", "image/svg+xml")},
        ).status_code
        == 400
    )
    corrupt_res = client.post(
        "/api/v1/crop-diagnostics/analyze-authenticated",
        headers=farmer_headers,
        data={"crop": "Tomato", "farm_id": "farm_001"},
        files={"file": ("corrupt.png", b"\x89PNG\r\n\x1a\n" + b"\x00" * 32, "image/png")},
    )
    assert corrupt_res.status_code == 200
    assert corrupt_res.json()["diagnosis_status"] == "invalid_image"
    assert corrupt_res.json()["predicted_disease"] is None

    # Owner succeeds on authenticated diagnostics with localized Telugu summary
    ok_res = client.post(
        "/api/v1/crop-diagnostics/analyze-authenticated",
        headers=farmer_headers,
        data={"crop": "Tomato", "farm_id": "farm_001", "lang": "te"},
        files={"file": ("leaf.jpg", _make_jpeg_bytes(), "image/jpeg")},
    )
    assert ok_res.status_code == 200
    assert ok_res.json()["lang"] == "te"


def test_demonstration_csv_strictly_isolated_from_real_queries_and_voice_assistant(isolated_ad40a_db, monkeypatch):
    farmer_headers = {"Authorization": "Bearer tok_ad40a_farmer"}

    async def _no_live_gov(*args, **kwargs):
        return {"records": [], "nearby_records": []}

    monkeypatch.setattr(market_intel_service, "fetch_and_cache_live", _no_live_gov)

    load_res = client.post("/api/v1/market-intelligence/load-official-csv-fallback", headers=farmer_headers)
    assert load_res.status_code == 200
    assert load_res.json()["valid_records"] == 7

    # Default observations & history must NOT leak demonstration_csv rows
    obs_default = client.get("/api/v1/market-intelligence/observations?commodity=Tomato").json()
    assert obs_default["count"] == 0
    assert obs_default["observations"] == []

    hist_default = client.get("/api/v1/market-intelligence/history?commodity=Tomato").json()
    assert hist_default["history"]["observation_count"] == 0
    assert hist_default["forecast"]["available"] is False
    assert hist_default["forecast"]["training_observation_count"] == 0

    # Explicit include_demo=true exposes the labelled demonstration rows
    obs_demo = client.get("/api/v1/market-intelligence/observations?commodity=Tomato&include_demo=true").json()
    assert obs_demo["count"] >= 1
    assert all(row["source_type"] == "demonstration_csv" for row in obs_demo["observations"])

    # Voice assistant must not quote isolated demonstration rows when real prices are absent
    chat_res = client.post(
        "/api/v1/assistant/chat",
        headers=farmer_headers,
        json={"message": "Show today's market prices for Tomato.", "farm_id": "farm_001"},
    )
    assert chat_res.status_code == 200
    reply_lower = chat_res.json()["reply"].lower()
    assert "no persisted official or csv market observations" in reply_lower
    assert "kolar apmc" not in reply_lower
    assert "21.5" not in reply_lower


def test_restricted_onnx_and_plantvillage_fixtures_excluded_from_git_tracking():
    gitignore_text = (REPO_ROOT / ".gitignore").read_text(encoding="utf-8")
    assert "backend/app/models/plant_disease/*.onnx" in gitignore_text
    assert "backend/tests/fixtures/*.jpg" in gitignore_text

    proc = subprocess.run(
        [
            "git",
            "ls-files",
            "backend/app/models/plant_disease/model.onnx",
            "backend/tests/fixtures/sample_0.jpg",
            "backend/tests/fixtures/sample_1.jpg",
            "backend/tests/fixtures/sample_2.jpg",
            "backend/tests/fixtures/sample_3.jpg",
        ],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    assert proc.stdout.strip() == ""


def test_ad39_voice_assistant_digital_farming_continuity(isolated_ad40a_db):
    farmer_headers = {"Authorization": "Bearer tok_ad40a_farmer"}

    r_nav = client.post(
        "/api/v1/assistant/chat",
        headers=farmer_headers,
        json={"message": "Open Digital Farming.", "farm_id": "farm_001"},
    )
    assert r_nav.status_code == 200
    assert r_nav.json()["client_directive"]["route"] == "/digital-farming"

    r_pause = client.post(
        "/api/v1/assistant/chat",
        headers=farmer_headers,
        json={"message": "Pause the simulation.", "farm_id": "farm_001"},
    )
    assert r_pause.status_code == 200
    assert r_pause.json()["intent"] == "digital_farm_control"
    assert r_pause.json()["client_directive"]["payload"]["action"] == "pause"

    r_kn = client.post(
        "/api/v1/assistant/chat",
        headers=farmer_headers,
        json={"message": "Explain photosynthesis.", "farm_id": "farm_001"},
    )
    assert r_kn.status_code == 200
    conv_id = r_kn.json()["conversation_id"]

    r_follow = client.post(
        "/api/v1/assistant/chat",
        headers=farmer_headers,
        json={"message": "Explain that in Kannada.", "conversation_id": conv_id, "farm_id": "farm_001"},
    )
    assert r_follow.status_code == 200
    assert r_follow.json()["language"] == "kn"
