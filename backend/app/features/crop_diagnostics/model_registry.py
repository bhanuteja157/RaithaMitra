# backend/app/features/crop_diagnostics/model_registry.py
"""
Verified ONNX Model Registry for RaithaMitra AI Crop Doctor.
Loads model metadata, preprocessor configuration, class mappings, and SHA-256 checksums
strictly from the verified local model bundle without fabricating unsupported crops.
"""
import hashlib
import json
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

MODEL_DIR = os.getenv(
    "PLANT_DISEASE_MODEL_DIR",
    os.path.join("backend", "app", "models", "plant_disease"),
)
MODEL_FILE = os.path.join(MODEL_DIR, "model.onnx")
CONFIG_FILE = os.path.join(MODEL_DIR, "config.json")
PREPROCESSOR_FILE = os.path.join(MODEL_DIR, "preprocessor_config.json")
EVAL_FILE = os.path.join(MODEL_DIR, "eval_results.json")

MODEL_ID = "onnx-community/mobilenet_v2_1.0_224-plant-disease-identification-ONNX"
MODEL_VERSION = "1.0.0-plantvillage-38"
EXPECTED_SHA256 = "c209f96f0a87a265b0ff6765c2e84d48038a7d8b8692d7629445b4513c344eb7"

CROP_ALIASES: Dict[str, str] = {
    "maize": "Corn (Maize)",
    "corn": "Corn (Maize)",
    "corn (maize)": "Corn (Maize)",
    "bell pepper": "Bell Pepper",
    "pepper": "Bell Pepper",
    "capsicum": "Bell Pepper",
    "chilli": "Bell Pepper",
    "grape": "Grape",
    "grapes": "Grape",
}


def parse_class_label(raw_label: str) -> Tuple[str, str, bool]:
    """Parse a PlantVillage class label into (crop, disease_name, is_healthy)."""
    text = raw_label.strip()
    if text.startswith("Healthy "):
        crop = text[len("Healthy "):].removesuffix(" Plant").strip()
        return crop, "Healthy", True

    if " with " in text:
        crop, disease = text.split(" with ", 1)
        return crop.strip(), disease.strip(), False

    # Special labels without 'with'
    special_prefixes = [
        ("Apple ", "Apple"),
        ("Cedar Apple ", "Apple"),
        ("Tomato ", "Tomato"),
    ]
    if text == "Cedar Apple Rust":
        return "Apple", "Cedar Apple Rust", False
    for prefix, crop in special_prefixes:
        if text.startswith(prefix):
            return crop, text[len(prefix):].strip(), False

    return "Unknown", text, False


@lru_cache(maxsize=1)
def load_model_metadata() -> Dict[str, Any]:
    if not os.path.isfile(CONFIG_FILE):
        return {"available": False, "classes": {}, "supported_crops": []}

    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    preproc = {}
    if os.path.isfile(PREPROCESSOR_FILE):
        with open(PREPROCESSOR_FILE, "r", encoding="utf-8") as f:
            preproc = json.load(f)

    eval_metrics = {}
    if os.path.isfile(EVAL_FILE):
        with open(EVAL_FILE, "r", encoding="utf-8") as f:
            eval_metrics = json.load(f)

    id2label: Dict[int, str] = {int(k): v for k, v in cfg.get("id2label", {}).items()}
    parsed_classes: Dict[int, Dict[str, Any]] = {}
    crops_set = set()
    for idx, label in sorted(id2label.items()):
        crop, disease, is_healthy = parse_class_label(label)
        crops_set.add(crop)
        parsed_classes[idx] = {
            "index": idx,
            "raw_label": label,
            "crop": crop,
            "disease": disease,
            "is_healthy": is_healthy,
        }

    return {
        "available": True,
        "architecture": (cfg.get("architectures") or ["MobileNetV2ForImageClassification"])[0],
        "classes": parsed_classes,
        "supported_crops": sorted(crops_set),
        "preprocessor": preproc,
        "eval_metrics": eval_metrics,
    }


def compute_model_sha256() -> Optional[str]:
    if not os.path.isfile(MODEL_FILE):
        return None
    h = hashlib.sha256()
    with open(MODEL_FILE, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def normalize_requested_crop(crop: Optional[str]) -> Optional[str]:
    """Normalize user-selected crop to canonical model crop name, or None for auto-detect."""
    if not crop or crop.strip().lower() in {"auto", "automatic", "detect", "any"}:
        return None
    key = crop.strip().lower()
    if key in CROP_ALIASES:
        return CROP_ALIASES[key]
    meta = load_model_metadata()
    for supported in meta.get("supported_crops", []):
        if supported.lower() == key:
            return supported
    return crop.strip()


def is_crop_supported(crop: Optional[str]) -> bool:
    canonical = normalize_requested_crop(crop)
    if canonical is None:
        return True
    meta = load_model_metadata()
    return canonical in meta.get("supported_crops", [])


def check_model_availability() -> Dict[str, Any]:
    model_exists = os.path.isfile(MODEL_FILE)
    try:
        import onnxruntime  # noqa: F401
        ort_available = True
    except ImportError:
        ort_available = False

    meta = load_model_metadata()
    sha256 = compute_model_sha256() if model_exists else None
    checksum_verified = sha256 == EXPECTED_SHA256 if sha256 else False

    return {
        "model_available": model_exists and ort_available and meta.get("available", False),
        "model_file_found": model_exists,
        "onnxruntime_installed": ort_available,
        "expected_model_path": MODEL_FILE,
        "model_name": MODEL_ID,
        "model_version": MODEL_VERSION,
        "architecture": meta.get("architecture"),
        "sha256": sha256,
        "checksum_verified": checksum_verified,
        "supported_crops": meta.get("supported_crops", []),
        "supported_classes_count": len(meta.get("classes", {})),
        "supported_classes": [v["raw_label"] for v in meta.get("classes", {}).values()],
        "eval_metrics": meta.get("eval_metrics", {}),
    }
