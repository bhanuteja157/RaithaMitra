# backend/app/features/crop_diagnostics/inference.py
"""
Cached ONNX Runtime CPU inference engine for RaithaMitra AI Crop Doctor.
"""
import threading
import time
from typing import Any, Dict, List, Optional
import numpy as np
from PIL import Image

from backend.app.features.crop_diagnostics.model_registry import (
    MODEL_FILE,
    MODEL_ID,
    MODEL_VERSION,
    check_model_availability,
    load_model_metadata,
)
from backend.app.features.crop_diagnostics.preprocessing import preprocess_leaf_image

CONFIDENCE_THRESHOLD = 0.45
_SESSION_LOCK = threading.Lock()
_CACHED_SESSION = None
_CACHED_INPUT_NAME: Optional[str] = None
_LOAD_TIME_MS: Optional[float] = None


def _get_session():
    global _CACHED_SESSION, _CACHED_INPUT_NAME, _LOAD_TIME_MS
    if _CACHED_SESSION is not None:
        return _CACHED_SESSION, _CACHED_INPUT_NAME, _LOAD_TIME_MS

    with _SESSION_LOCK:
        if _CACHED_SESSION is not None:
            return _CACHED_SESSION, _CACHED_INPUT_NAME, _LOAD_TIME_MS

        import onnxruntime as ort

        t0 = time.perf_counter()
        sess = ort.InferenceSession(MODEL_FILE, providers=["CPUExecutionProvider"])
        _LOAD_TIME_MS = round((time.perf_counter() - t0) * 1000.0, 2)
        _CACHED_INPUT_NAME = sess.get_inputs()[0].name
        _CACHED_SESSION = sess
        return _CACHED_SESSION, _CACHED_INPUT_NAME, _LOAD_TIME_MS


def _softmax(logits: np.ndarray) -> np.ndarray:
    shifted = logits - np.max(logits)
    exp = np.exp(shifted)
    return exp / np.sum(exp)


def run_onnx_inference(rgb_image: Image.Image, top_k: int = 3) -> Dict[str, Any]:
    """Execute cached ONNX CPU inference and return ranked top-k predictions."""
    status = check_model_availability()
    if not status["model_available"]:
        return {
            "model_available": False,
            "unavailable_reason": "ONNX model or onnxruntime is unavailable on this machine.",
        }

    meta = load_model_metadata()
    classes = meta["classes"]

    sess, input_name, load_ms = _get_session()
    tensor = preprocess_leaf_image(rgb_image)

    t0 = time.perf_counter()
    outputs = sess.run(None, {input_name: tensor})
    infer_ms = round((time.perf_counter() - t0) * 1000.0, 2)

    logits = np.asarray(outputs[0][0], dtype=np.float32)
    probs = _softmax(logits)
    ranked_indices = np.argsort(probs)[::-1][:top_k]

    top_predictions: List[Dict[str, Any]] = []
    for idx in ranked_indices:
        cls_info = classes.get(int(idx), {})
        top_predictions.append(
            {
                "class_index": int(idx),
                "raw_label": cls_info.get("raw_label", f"Class {idx}"),
                "crop": cls_info.get("crop", "Unknown"),
                "disease": cls_info.get("disease", "Unknown"),
                "is_healthy": bool(cls_info.get("is_healthy", False)),
                "score": round(float(probs[idx]), 4),
                "model_id": MODEL_ID,
            }
        )

    return {
        "model_available": True,
        "model_name": MODEL_ID,
        "model_version": MODEL_VERSION,
        "load_time_ms": load_ms,
        "inference_time_ms": infer_ms,
        "top_predictions": top_predictions,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
    }
