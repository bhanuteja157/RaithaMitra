# backend/app/schemas/recommendation.py
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime

class SupportingData(BaseModel):
    key_metrics: Dict[str, Any]
    source: str
    timestamp: datetime
    data_quality: Literal["live", "measured", "user_provided", "estimated", "simulated"]
    uncertainty: str

class FarmRecommendation(BaseModel):
    id: str
    category: Literal["irrigation", "nutrition", "crop_protection", "market", "risk"]
    priority: Literal["critical", "high", "medium", "low"]
    action: str
    reason: str
    supporting_data: SupportingData
    alternative_action: Optional[str] = None
    action_deadline: Optional[str] = None

class RecommendationResponse(BaseModel):
    farm_id: str
    generated_at: datetime
    overall_risk_level: Literal["low", "medium", "high"]
    recommendations: List[FarmRecommendation]
    active_advisories_count: int
