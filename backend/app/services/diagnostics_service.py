# backend/app/services/diagnostics_service.py
"""
Backward-compatible adapter delegating /scientific/diagnostics/* calls to
the real ONNX RaithaMitra AI Crop Doctor engine (backend.app.features.crop_diagnostics).
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from backend.app.schemas.scientific import ScientificModuleOutput
from backend.app.features.crop_diagnostics.image_quality import validate_image_bytes
from backend.app.features.crop_diagnostics.model_registry import check_model_availability
from backend.app.features.crop_diagnostics.service import analyze_single_image


def validate_image_upload(
    filename: str, content_type: Optional[str], data: bytes
) -> Tuple[bool, Optional[str]]:
    return validate_image_bytes(filename, content_type, data)


class DiagnosticsService:
    def check_model_availability(self) -> Dict[str, Any]:
        return check_model_availability()

    def analyze_leaf_image(
        self,
        farm_id: Optional[str],
        crop: str,
        filename: str,
        content_type: Optional[str],
        image_bytes: bytes,
    ) -> ScientificModuleOutput:
        res = analyze_single_image(
            filename=filename,
            content_type=content_type,
            image_bytes=image_bytes,
            crop=crop,
            farm_id=farm_id,
            persist_history=False,
        )
        status = res.get("diagnosis_status", "unavailable")
        quality_flag = (
            "unavailable"
            if status in {"invalid_image", "model_unavailable", "unsupported_crop"}
            else ("estimated" if status in {"uncertain", "crop_mismatch"} else "modeled")
        )
        return ScientificModuleOutput(
            farm_id=farm_id,
            module="ai_crop_diagnostics",
            source=f"RaithaMitra AI Crop Doctor ({res.get('model_name') or 'ONNX'})",
            timestamp=datetime.now(timezone.utc),
            units={"confidence": "softmax score (0-1)"},
            data_quality=quality_flag,
            is_live=bool(res.get("model_available")),
            assumptions=res.get("limitations", []),
            uncertainty=res.get("uncertainty") or "None",
            results={**res, "valid_image": status != "invalid_image"},
            recommended_actions=res.get("recommended_actions", []),
        )


diagnostics_service = DiagnosticsService()
