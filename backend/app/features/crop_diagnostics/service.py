# backend/app/features/crop_diagnostics/service.py
"""
Core AI Crop Doctor Service:
- Single & multi-image analysis (up to 3 images)
- Quality + ONNX inference + uncertainty + crop-mismatch handling
- Honest severity (unavailable for classification-only model) & XAI omission
- User-isolated SQLite diagnostic history
- Explicit-confirmation community surveillance reporting (region-level only)
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.db.database import get_db_connection
from backend.app.features.crop_diagnostics.disease_knowledge import get_disease_knowledge
from backend.app.features.crop_diagnostics.image_quality import (
    decode_and_assess_quality,
    validate_image_bytes,
)
from backend.app.features.crop_diagnostics.inference import CONFIDENCE_THRESHOLD, run_onnx_inference
from backend.app.features.crop_diagnostics.model_registry import (
    MODEL_ID,
    MODEL_VERSION,
    check_model_availability,
    is_crop_supported,
    load_model_metadata,
    normalize_requested_crop,
)
from backend.app.features.crop_diagnostics.risk_assessment import assess_weather_disease_risk


def ensure_diagnostics_tables() -> None:
    conn = get_db_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS crop_diagnostic_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                farm_id TEXT,
                requested_crop TEXT,
                predicted_crop TEXT,
                predicted_disease TEXT,
                diagnosis_status TEXT NOT NULL,
                confidence REAL,
                model_name TEXT,
                model_version TEXT,
                image_quality TEXT,
                severity_json TEXT,
                recommended_actions_json TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS community_disease_reports (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                crop TEXT NOT NULL,
                suspected_disease TEXT NOT NULL,
                region TEXT NOT NULL,
                confidence REAL,
                verification_status TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def _save_history_record(
    user_id: Optional[str],
    farm_id: Optional[str],
    requested_crop: Optional[str],
    result: Dict[str, Any],
) -> Optional[str]:
    if not user_id:
        return None
    ensure_diagnostics_tables()
    rec_id = f"diag_{uuid.uuid4().hex[:12]}"
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO crop_diagnostic_history (
                id, user_id, farm_id, requested_crop, predicted_crop, predicted_disease,
                diagnosis_status, confidence, model_name, model_version, image_quality,
                severity_json, recommended_actions_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rec_id,
                user_id,
                farm_id,
                requested_crop,
                result.get("crop"),
                result.get("predicted_disease"),
                result.get("diagnosis_status", "unavailable"),
                result.get("confidence"),
                result.get("model_name"),
                result.get("model_version"),
                (result.get("image_quality") or {}).get("quality_rating"),
                json.dumps(result.get("severity")),
                json.dumps(result.get("recommended_actions", [])),
                result.get("timestamp"),
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return rec_id


def analyze_single_image(
    *,
    filename: str,
    content_type: Optional[str],
    image_bytes: bytes,
    crop: Optional[str] = "auto",
    farm_id: Optional[str] = None,
    user_id: Optional[str] = None,
    temperature_c: Optional[float] = None,
    humidity_pct: Optional[float] = None,
    rainfall_mm: Optional[float] = None,
    persist_history: bool = True,
) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    req_id = f"req_{uuid.uuid4().hex[:12]}"
    avail = check_model_availability()
    supported_crops = avail.get("supported_crops", [])

    # 1. Validate raw image bytes
    valid_bytes, byte_err = validate_image_bytes(filename, content_type, image_bytes)
    if not valid_bytes:
        return {
            "request_id": req_id,
            "farm_id": farm_id,
            "crop": crop,
            "model_available": avail["model_available"],
            "model_name": avail.get("model_name"),
            "model_version": avail.get("model_version"),
            "supported_crops": supported_crops,
            "supported_classes": avail.get("supported_classes", []),
            "image_quality": {"decodable": False, "suitable_for_diagnosis": False, "warnings": [byte_err]},
            "diagnosis_status": "invalid_image",
            "predicted_disease": None,
            "confidence": None,
            "top_predictions": [],
            "severity": {"available": False, "reason": "Image failed format validation."},
            "uncertainty": byte_err,
            "recommended_actions": ["Upload a valid JPEG, PNG, or WEBP leaf photo under 10 MB."],
            "preventive_measures": [],
            "weather_risk": None,
            "evidence_sources": [],
            "limitations": ["Uploaded file failed format or signature validation."],
            "timestamp": now_iso,
        }

    # 2. Decode safely & evaluate image quality
    rgb_img, quality = decode_and_assess_quality(image_bytes)
    if rgb_img is None:
        return {
            "request_id": req_id,
            "farm_id": farm_id,
            "crop": crop,
            "model_available": avail["model_available"],
            "model_name": avail.get("model_name"),
            "model_version": avail.get("model_version"),
            "supported_crops": supported_crops,
            "supported_classes": avail.get("supported_classes", []),
            "image_quality": quality,
            "diagnosis_status": "invalid_image",
            "predicted_disease": None,
            "confidence": None,
            "top_predictions": [],
            "severity": {"available": False, "reason": "Corrupted or undecodable image."},
            "uncertainty": quality.get("error"),
            "recommended_actions": ["Capture a fresh, uncorrupted JPEG or PNG photo of the leaf."],
            "preventive_measures": [],
            "weather_risk": None,
            "evidence_sources": [],
            "limitations": ["Image decoding failed safely."],
            "timestamp": now_iso,
        }

    # 3. Check model availability
    if not avail["model_available"]:
        return {
            "request_id": req_id,
            "farm_id": farm_id,
            "crop": crop,
            "model_available": False,
            "model_name": avail.get("model_name"),
            "model_version": avail.get("model_version"),
            "supported_crops": supported_crops,
            "supported_classes": avail.get("supported_classes", []),
            "image_quality": quality,
            "diagnosis_status": "model_unavailable",
            "predicted_disease": None,
            "confidence": None,
            "top_predictions": [],
            "severity": {"available": False, "reason": "ONNX model unavailable."},
            "uncertainty": "Model unavailable",
            "recommended_actions": ["Install the verified PlantVillage ONNX model and onnxruntime."],
            "preventive_measures": [],
            "weather_risk": None,
            "evidence_sources": [],
            "limitations": ["No ONNX model weights available on this system; no prediction generated."],
            "timestamp": now_iso,
        }

    # 4. Check explicit crop support (never silently substitute another crop)
    canonical_requested = normalize_requested_crop(crop)
    if canonical_requested is not None and not is_crop_supported(canonical_requested):
        return {
            "request_id": req_id,
            "farm_id": farm_id,
            "crop": crop,
            "model_available": True,
            "model_name": MODEL_ID,
            "model_version": MODEL_VERSION,
            "supported_crops": supported_crops,
            "supported_classes": avail.get("supported_classes", []),
            "image_quality": quality,
            "diagnosis_status": "unsupported_crop",
            "predicted_disease": None,
            "confidence": None,
            "top_predictions": [],
            "severity": {"available": False, "reason": f"Crop '{crop}' is not supported by the verified model."},
            "uncertainty": f"'{crop}' is not in the model's supported crop list ({', '.join(supported_crops)}).",
            "recommended_actions": [
                f"Select one of the supported crops or choose 'Auto-detect Crop'. Supported: {', '.join(supported_crops)}.",
                "Consult your local Krishi Vigyan Kendra (KVK) for crops outside the PlantVillage model.",
            ],
            "preventive_measures": [],
            "weather_risk": None,
            "evidence_sources": [],
            "limitations": [f"Model does not include training classes for '{crop}'."],
            "timestamp": now_iso,
        }

    # 5. Image suitability check
    if not quality.get("suitable_for_diagnosis", True):
        return {
            "request_id": req_id,
            "farm_id": farm_id,
            "crop": canonical_requested or crop,
            "model_available": True,
            "model_name": MODEL_ID,
            "model_version": MODEL_VERSION,
            "supported_crops": supported_crops,
            "supported_classes": avail.get("supported_classes", []),
            "image_quality": quality,
            "diagnosis_status": "uncertain",
            "predicted_disease": None,
            "confidence": None,
            "top_predictions": [],
            "severity": {"available": False, "reason": "Image quality too low for reliable diagnosis."},
            "uncertainty": "Unable to identify the disease reliably. Please upload another clear image or consult an agricultural expert.",
            "recommended_actions": quality.get("capture_tips", []),
            "preventive_measures": [],
            "weather_risk": None,
            "evidence_sources": [],
            "limitations": ["Image failed minimum resolution or brightness checks."],
            "timestamp": now_iso,
        }

    # 6. Execute real ONNX Runtime CPU inference
    inf = run_onnx_inference(rgb_img, top_k=3)
    top3 = inf["top_predictions"]
    best = top3[0]
    top_score = best["score"]
    pred_crop = best["crop"]
    pred_disease = best["disease"]
    is_healthy = best["is_healthy"]

    crop_mismatch = bool(canonical_requested and canonical_requested.lower() != pred_crop.lower())
    low_confidence = top_score < CONFIDENCE_THRESHOLD

    if low_confidence:
        status_str = "uncertain"
        uncertainty_msg = (
            "Unable to identify the disease reliably. Please upload another clear image or consult an agricultural expert."
        )
    elif crop_mismatch:
        status_str = "crop_mismatch"
        uncertainty_msg = (
            f"You selected '{canonical_requested}', but the model detected '{pred_crop}' "
            f"({round(top_score * 100, 1)}% score). Please confirm the crop or upload a clearer leaf photo."
        )
    elif is_healthy:
        status_str = "healthy"
        uncertainty_msg = None
    else:
        status_str = "diseased"
        uncertainty_msg = None

    knowledge = get_disease_knowledge(pred_crop, pred_disease, is_healthy)
    weather_risk = assess_weather_disease_risk(pred_disease, temperature_c, humidity_pct, rainfall_mm)

    recommended_actions = (
        [
            "Unable to identify the disease reliably. Please upload another clear image or consult an agricultural expert.",
            *quality.get("capture_tips", []),
        ]
        if low_confidence
        else knowledge.get("immediate_actions", [])
    )

    result = {
        "request_id": req_id,
        "farm_id": farm_id,
        "crop": pred_crop,
        "requested_crop": canonical_requested or "auto",
        "crop_mismatch": crop_mismatch,
        "is_healthy": is_healthy if not low_confidence else None,
        "model_available": True,
        "model_name": inf["model_name"],
        "model_version": inf["model_version"],
        "inference_time_ms": inf["inference_time_ms"],
        "load_time_ms": inf["load_time_ms"],
        "supported_crops": supported_crops,
        "supported_classes": avail.get("supported_classes", []),
        "image_quality": quality,
        "diagnosis_status": status_str,
        "predicted_disease": None if low_confidence else pred_disease,
        "confidence": top_score,
        "top_predictions": top3,
        "severity": {
            "available": False,
            "reason": "Classification model only (MobileNetV2); lesion segmentation is unavailable without a dedicated segmentation model.",
        },
        "explainability": {
            "available": False,
            "reason": "ONNX classification graph exposes logits only; Grad-CAM spatial attention is omitted rather than fabricated.",
        },
        "uncertainty": uncertainty_msg,
        "knowledge": None if low_confidence else knowledge,
        "recommended_actions": recommended_actions,
        "preventive_measures": [] if low_confidence else knowledge.get("preventive_measures", []),
        "weather_risk": weather_risk,
        "evidence_sources": [] if low_confidence else knowledge.get("sources", []),
        "limitations": [
            "Model trained on PlantVillage (38 classes across 14 crops); field lighting and background clutter can reduce accuracy.",
            "Raw softmax score is a model confidence indicator, not a calibrated diagnostic probability or lab confirmation.",
            "Disease severity percentage is unavailable because this model performs image classification, not lesion segmentation.",
        ],
        "timestamp": now_iso,
    }

    if persist_history:
        history_id = _save_history_record(user_id, farm_id, canonical_requested or "auto", result)
        result["history_id"] = history_id

    return result


def analyze_multiple_images(
    *,
    files: List[Dict[str, Any]],
    crop: Optional[str] = "auto",
    farm_id: Optional[str] = None,
    user_id: Optional[str] = None,
    temperature_c: Optional[float] = None,
    humidity_pct: Optional[float] = None,
    rainfall_mm: Optional[float] = None,
) -> Dict[str, Any]:
    if len(files) == 0 or len(files) > 3:
        raise ValueError("Provide between 1 and 3 images per multi-image diagnostic session.")

    individual = [
        analyze_single_image(
            filename=f["filename"],
            content_type=f.get("content_type"),
            image_bytes=f["bytes"],
            crop=crop,
            farm_id=farm_id,
            user_id=user_id,
            temperature_c=temperature_c,
            humidity_pct=humidity_pct,
            rainfall_mm=rainfall_mm,
            persist_history=(i == 0),
        )
        for i, f in enumerate(files)
    ]

    valid_preds = [
        (r.get("crop"), r.get("predicted_disease"), r.get("confidence"))
        for r in individual
        if r.get("predicted_disease")
    ]
    unique_labels = {f"{c}: {d}" for c, d, _ in valid_preds}

    agreement = len(unique_labels) <= 1 and len(valid_preds) == len(individual)
    disagreement_note = None
    if len(unique_labels) > 1:
        disagreement_note = (
            "Images produced differing predictions ("
            + ", ".join(sorted(unique_labels))
            + "). Do not treat these as a single confirmed diagnosis; upload clearer photos or consult an agronomist."
        )
    elif len(valid_preds) < len(individual):
        disagreement_note = "One or more images were uncertain or invalid; review each image result individually."

    return {
        "session_id": f"multi_{uuid.uuid4().hex[:10]}",
        "image_count": len(individual),
        "predictions_agree": agreement,
        "disagreement_warning": disagreement_note,
        "primary_result": individual[0],
        "individual_results": individual,
    }


def get_user_diagnostic_history(user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    ensure_diagnostics_tables()
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, user_id, farm_id, requested_crop, predicted_crop, predicted_disease,
                   diagnosis_status, confidence, model_name, model_version, image_quality,
                   severity_json, recommended_actions_json, created_at
            FROM crop_diagnostic_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
    finally:
        conn.close()
    out = []
    for row in rows:
        out.append(
            {
                "id": row["id"],
                "farm_id": row["farm_id"],
                "requested_crop": row["requested_crop"],
                "predicted_crop": row["predicted_crop"],
                "predicted_disease": row["predicted_disease"],
                "diagnosis_status": row["diagnosis_status"],
                "confidence": row["confidence"],
                "model_name": row["model_name"],
                "model_version": row["model_version"],
                "image_quality": row["image_quality"],
                "recommended_actions": json.loads(row["recommended_actions_json"] or "[]"),
                "created_at": row["created_at"],
            }
        )
    return out


def submit_surveillance_report(
    *,
    user_id: str,
    crop: str,
    suspected_disease: str,
    region: str,
    confidence: Optional[float],
    user_confirmed: bool,
) -> Dict[str, Any]:
    if not user_confirmed:
        raise ValueError("Explicit user confirmation is required before publishing a community surveillance report.")
    ensure_diagnostics_tables()
    rep_id = f"surv_{uuid.uuid4().hex[:10]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO community_disease_reports (
                id, user_id, crop, suspected_disease, region, confidence, verification_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (rep_id, user_id, crop, suspected_disease, region, confidence, "AI-Suspected (Unverified)", now_iso),
        )
        conn.commit()
    finally:
        conn.close()
    return {
        "id": rep_id,
        "crop": crop,
        "suspected_disease": suspected_disease,
        "region": region,
        "verification_status": "AI-Suspected (Unverified)",
        "created_at": now_iso,
    }


def get_surveillance_summary() -> List[Dict[str, Any]]:
    ensure_diagnostics_tables()
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT crop, suspected_disease, region, verification_status,
                   COUNT(*) as observation_count, MAX(created_at) as latest_report_date
            FROM community_disease_reports
            GROUP BY crop, suspected_disease, region, verification_status
            ORDER BY latest_report_date DESC
            LIMIT 25
            """
        ).fetchall()
    finally:
        conn.close()
    return [
        {
            "crop": r["crop"],
            "suspected_disease": r["suspected_disease"],
            "region": r["region"],
            "verification_status": r["verification_status"],
            "observation_count": r["observation_count"],
            "latest_report_date": r["latest_report_date"],
        }
        for r in rows
    ]
