# backend/app/schemas/scientific_contract.py
"""
Standardized Scientific Module Output Contracts.
Prepared for integration with AD-04 (Scientific Agricultural Intelligence)
and AD-05 (Advanced Biotechnology Intelligence).
"""
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, Literal
from datetime import datetime

class ScientificModuleOutput(BaseModel):
    farm_id: str
    module: Literal[
        "scientific_irrigation",
        "soil_intelligence",
        "financial_simulation",
        "digital_farm_twin",
        "satellite_analysis",
        "crop_diagnostics",
        "advanced_biointel"
    ]
    source: str
    timestamp: datetime
    units: Optional[Dict[str, str]] = {}
    data_quality: Literal[
        "live",
        "measured",
        "user_provided",
        "forecast",
        "estimated",
        "simulated",
        "demo",
        "cached",
        "unavailable"
    ]
    is_live: bool = False
    assumptions: List[str] = []
    uncertainty: str = "±5%"
    results: Dict[str, Any]
    recommended_actions: List[Dict[str, Any]] = []

class ScientificEnvelopeAdapter:
    """
    Adapter interface consumed by DecisionEngine to ingest outputs from
    independent scientific modules without hard dependencies.
    """
    @staticmethod
    def extract_decision_factors(output: ScientificModuleOutput) -> Dict[str, Any]:
        return {
            "module": output.module,
            "data_quality": output.data_quality,
            "results": output.results,
            "actions": output.recommended_actions,
            "uncertainty": output.uncertainty,
        }
