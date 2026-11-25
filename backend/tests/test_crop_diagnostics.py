# backend/tests/test_crop_diagnostics.py
import io
import json
import os
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import app
from backend.app.features.crop_diagnostics import model_registry

client = TestClient(app)
FIXTURES_DIR = os.path.join("backend", "tests", "fixtures")


def _login_token(email: str, password: str) -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def test_model_availability_and_checksum():
    res = client.get("/api/v1/crop-diagnostics/status")
    assert res.status_code == 200
    data = res.json()
    assert data["model_available"] is True
    assert data["onnxruntime_installed"] is True
    assert data["checksum_verified"] is True
    assert data["supported_classes_count"] == 38
    assert "Tomato" in data["supported_crops"]


def test_real_independent_plantvillage_samples():
    with open(os.path.join(FIXTURES_DIR, "manifest.json"), "r") as f:
        manifest = json.load(f)

    for item in manifest:
        with open(os.path.join(FIXTURES_DIR, item["file"]), "rb") as img_f:
            res = client.post(
                "/api/v1/crop-diagnostics/analyze",
                data={"crop": "auto", "temperature_c": "26", "humidity_pct": "82", "rainfall_mm": "3"},
                files={"file": (item["file"], img_f, "image/jpeg")},
            )
        assert res.status_code == 200
        body = res.json()
        assert body["model_available"] is True
        assert body["confidence"] is not None and body["confidence"] > 0.0
        assert len(body["top_predictions"]) == 3
        assert body["severity"]["available"] is False
        assert body["explainability"]["available"] is False
        assert body["inference_time_ms"] >= 0
        # Verify crop & disease match the independent PlantVillage test split ground truth
        expected_crop_prefix = item["true_label"].split("___")[0].lower()
        assert expected_crop_prefix in body["crop"].lower() or body["crop"].lower() in expected_crop_prefix
        if "healthy" in item["true_label"].lower():
            assert body["diagnosis_status"] == "healthy"
        else:
            assert body["diagnosis_status"] == "diseased"
            assert body["knowledge"] is not None
            assert len(body["recommended_actions"]) > 0


def test_scientific_diagnostics_backward_compatible_endpoint():
    with open(os.path.join(FIXTURES_DIR, "sample_3.jpg"), "rb") as img_f:
        res = client.post(
            "/api/v1/scientific/diagnostics/analyze",
            data={"crop": "Tomato"},
            files={"file": ("sample_3.jpg", img_f, "image/jpeg")},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["module"] == "ai_crop_diagnostics"
    assert body["results"]["model_available"] is True
    assert body["results"]["crop"] == "Tomato"


def test_invalid_and_corrupted_images():
    res1 = client.post(
        "/api/v1/crop-diagnostics/analyze",
        data={"crop": "Tomato"},
        files={"file": ("bad.txt", b"not an image", "text/plain")},
    )
    assert res1.status_code == 200
    assert res1.json()["diagnosis_status"] == "invalid_image"

    res2 = client.post(
        "/api/v1/crop-diagnostics/analyze",
        data={"crop": "Tomato"},
        files={"file": ("corrupt.jpg", b"\xff\xd8\xff\xe0corruptedbytes", "image/jpeg")},
    )
    assert res2.status_code == 200
    assert res2.json()["diagnosis_status"] == "invalid_image"


def test_unsupported_crop_rejected_honestly():
    with open(os.path.join(FIXTURES_DIR, "sample_3.jpg"), "rb") as img_f:
        res = client.post(
            "/api/v1/crop-diagnostics/analyze",
            data={"crop": "Mango"},
            files={"file": ("sample_3.jpg", img_f, "image/jpeg")},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["diagnosis_status"] == "unsupported_crop"
    assert body["predicted_disease"] is None


def test_low_quality_dark_tiny_image():
    buf = io.BytesIO()
    Image.new("RGB", (32, 32), color=(5, 5, 5)).save(buf, format="JPEG")
    buf.seek(0)
    res = client.post(
        "/api/v1/crop-diagnostics/analyze",
        data={"crop": "auto"},
        files={"file": ("tiny_dark.jpg", buf.read(), "image/jpeg")},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["diagnosis_status"] == "uncertain"
    assert body["image_quality"]["suitable_for_diagnosis"] is False


def test_model_unavailable_fallback(monkeypatch):
    monkeypatch.setattr(model_registry, "MODEL_FILE", "backend/app/models/nonexistent.onnx")
    with open(os.path.join(FIXTURES_DIR, "sample_3.jpg"), "rb") as img_f:
        res = client.post(
            "/api/v1/crop-diagnostics/analyze",
            data={"crop": "auto"},
            files={"file": ("sample_3.jpg", img_f, "image/jpeg")},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["model_available"] is False
    assert body["diagnosis_status"] == "model_unavailable"


def test_multi_image_disagreement_and_history_isolation():
    farmer_tok = _login_token("farmer@raithamitra.in", "farmer123")
    buyer_tok = _login_token("buyer1@raithamitra.in", "buyer123")

    # Unauthorized history check
    assert client.get("/api/v1/crop-diagnostics/history").status_code == 401

    with open(os.path.join(FIXTURES_DIR, "sample_0.jpg"), "rb") as f0, open(
        os.path.join(FIXTURES_DIR, "sample_3.jpg"), "rb"
    ) as f3:
        res = client.post(
            "/api/v1/crop-diagnostics/analyze-multi",
            headers={"Authorization": f"Bearer {farmer_tok}"},
            data={"crop": "auto"},
            files=[
                ("files", ("sample_0.jpg", f0, "image/jpeg")),
                ("files", ("sample_3.jpg", f3, "image/jpeg")),
            ],
        )
    assert res.status_code == 200
    multi = res.json()
    assert multi["image_count"] == 2
    assert multi["predictions_agree"] is False
    assert multi["disagreement_warning"] is not None

    # Cross-account isolation
    farmer_hist = client.get(
        "/api/v1/crop-diagnostics/history",
        headers={"Authorization": f"Bearer {farmer_tok}"},
    ).json()["items"]
    buyer_hist = client.get(
        "/api/v1/crop-diagnostics/history",
        headers={"Authorization": f"Bearer {buyer_tok}"},
    ).json()["items"]
    assert len(farmer_hist) >= 1
    assert all(item["id"] not in {b["id"] for b in buyer_hist} for item in farmer_hist)

    # Surveillance requires explicit user confirmation
    bad_surv = client.post(
        "/api/v1/crop-diagnostics/surveillance/report",
        headers={"Authorization": f"Bearer {farmer_tok}"},
        json={
            "crop": "Tomato",
            "suspected_disease": "Early Blight",
            "region": "Mandya",
            "confidence": 0.9,
            "user_confirmed": False,
        },
    )
    assert bad_surv.status_code == 400
