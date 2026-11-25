"""
AD-30: Standardized Centralized Evidence Registry.
Classifies every piece of farm evidence with provenance, freshness, quality,
assumptions, and limitations, and prevents demonstration/unavailable items
from silently influencing real farm recommendations.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

EvidenceClassification = Literal[
    "measured",
    "official_observation",
    "cached_observation",
    "user_entered",
    "scientifically_calculated",
    "estimated",
    "simulated",
    "demonstration",
    "unavailable",
]


def make_evidence(
    *,
    farm_id: str,
    source_module: str,
    source_provider: str,
    observed_value: Any,
    unit: Optional[str],
    classification: EvidenceClassification,
    data_quality: str,
    freshness: str,
    observation_timestamp: Optional[str] = None,
    applicable_crop: Optional[str] = None,
    applicable_growth_stage: Optional[str] = None,
    assumptions: Optional[List[str]] = None,
    source_reference: Optional[str] = None,
    limitations: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "evidence_id": f"evd_{uuid.uuid4().hex[:10]}",
        "farm_id": farm_id,
        "source_module": source_module,
        "source_provider": source_provider,
        "observed_value": observed_value,
        "unit": unit,
        "classification": classification,
        "data_quality": data_quality,
        "freshness": freshness,
        "observation_timestamp": observation_timestamp,
        "retrieval_timestamp": datetime.now(timezone.utc).isoformat(),
        "applicable_crop": applicable_crop,
        "applicable_growth_stage": applicable_growth_stage,
        "assumptions": assumptions or [],
        "source_reference": source_reference or source_provider,
        "limitations": limitations,
    }


def is_actionable_evidence(item: Dict[str, Any]) -> bool:
    """Demonstration and unavailable items must never silently drive real farm decisions."""
    return item.get("classification") not in ("demonstration", "unavailable")
