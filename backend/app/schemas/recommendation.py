# backend/app/schemas/recommendation.py
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime

class SupportingData(BaseModel):
    primary_driver: Optional[str] = "Agronomic Telemetry"
    key_metrics: Dict[str, Any]
    source: str
    timestamp: datetime
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
    uncertainty: str

class FarmRecommendation(BaseModel):
    id: str
    category: Literal[
        "irrigation",
        "nutrition",
        "crop_protection",
        "market",
        "risk",
        "biotech",
        "labour",
        "logistics"
    ]
    priority: Literal["critical", "high", "medium", "low"]
    title: Optional[str] = None
    action: str
    reason: str
    localized_title: Optional[str] = None
    localized_action: Optional[str] = None
    localized_reason: Optional[str] = None
    supporting_data: SupportingData
    alternative_action: Optional[str] = None
    action_deadline: Optional[str] = None
    estimated_cost_inr: Optional[float] = None
    conflict_detected: Optional[str] = None
    resolution_rationale: Optional[str] = None
    limitations: Optional[str] = None
    urgency: Optional[Literal["immediate", "today", "upcoming", "monitoring"]] = "today"

class ConflictResolutionRecord(BaseModel):
    conflict_type: str
    factors: List[str]
    tradeoff_analysis: str
    decision_outcome: str

class RecommendationResponse(BaseModel):
    farm_id: str
    generated_at: datetime
    overall_risk_level: Literal["low", "medium", "high"]
    lang: Optional[str] = "en"
    recommendations: List[FarmRecommendation]
    active_advisories_count: int
    conflicts_resolved: Optional[List[ConflictResolutionRecord]] = []
    decision_pipeline_stage: Optional[str] = "OBSERVE -> PREDICT -> SIMULATE -> OPTIMIZE -> ACT"
