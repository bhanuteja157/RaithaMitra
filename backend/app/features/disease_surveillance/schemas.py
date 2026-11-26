"""Pydantic Schemas for AD-40C Community Crop Disease Surveillance."""
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

VerificationStatus = Literal["farmer_reported", "ai_suspected", "expert_confirmed", "dismissed"]
DataSourceType = Literal[
    "manual_farmer_report",
    "crop_diagnostics_ai",
    "agronomist_verification",
    "demonstration_simulation",
]
RiskLevelType = Literal["Low", "Moderate", "High", "Critical", "Insufficient evidence"]
AlertStatusType = Literal["unread", "read", "acknowledged", "dismissed"]


class DiseaseReportCreate(BaseModel):
    farm_id: str = Field(..., min_length=1)
    crop: str = Field(..., min_length=2, max_length=60)
    disease_name: str = Field(..., min_length=2, max_length=120)
    observation_date: Optional[str] = Field(None, description="YYYY-MM-DD (defaults to today UTC)")
    affected_area_ha: float = Field(0.5, gt=0.0, le=5000.0)
    symptoms: List[str] = Field(default_factory=list)
    notes: Optional[str] = Field(None, max_length=1000)
    diagnostic_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    district: Optional[str] = Field(None, max_length=80)
    state: Optional[str] = Field(None, max_length=80)
    image_reference: Optional[str] = Field(None, max_length=300)
    verification_status: VerificationStatus = "farmer_reported"
    data_source: DataSourceType = "manual_farmer_report"
    anonymous_community_consent: bool = Field(
        False,
        description="Explicit farmer opt-in to share anonymized regional signal with neighbouring growers.",
    )


class DiagnosticPromotionRequest(BaseModel):
    farm_id: str = Field(..., min_length=1)
    crop: str = Field(..., min_length=2, max_length=60)
    suspected_disease: str = Field(..., min_length=2, max_length=120)
    diagnostic_confidence: float = Field(..., ge=0.0, le=1.0)
    observation_date: Optional[str] = None
    affected_area_ha: float = Field(0.5, gt=0.0, le=5000.0)
    symptoms: List[str] = Field(default_factory=list)
    image_reference: Optional[str] = None
    anonymous_community_consent: bool = False


class ReportVerifyRequest(BaseModel):
    verification_status: VerificationStatus
    notes: Optional[str] = Field(None, max_length=500)


class AlertStatusUpdateRequest(BaseModel):
    status: AlertStatusType


class OutbreakEvaluationRequest(BaseModel):
    farm_id: Optional[str] = None
    demo_mode: bool = False


class AssistantToolExecuteRequest(BaseModel):
    farm_id: Optional[str] = None
    crop: Optional[str] = None
    disease_name: Optional[str] = None
    radius_km: float = Field(25.0, ge=2.0, le=200.0)
    demo_mode: bool = False
    params: Dict[str, Any] = Field(default_factory=dict)
