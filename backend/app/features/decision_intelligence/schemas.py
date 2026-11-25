"""Pydantic schemas for AD-30 Centralized Agricultural Decision Intelligence."""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

PreferenceProfile = Literal[
    "max_profit",
    "min_cost",
    "water_conservation",
    "balanced",
    "low_risk",
    "sustainable",
]


class PreferenceUpdateRequest(BaseModel):
    preference_profile: PreferenceProfile = "balanced"
    custom_weights: Optional[Dict[str, float]] = None


class ScenarioSimulateRequest(BaseModel):
    farm_id: str = "farm_001"
    crop: str = Field("Tomato", min_length=2, max_length=80)
    farm_area_acres: float = Field(2.0, gt=0, le=5000)
    cultivation_budget_inr: float = Field(50000.0, ge=0)
    available_water_m3: float = Field(10000.0, ge=0)
    expected_yield_kg: float = Field(4000.0, gt=0)
    seed_expense_inr: float = Field(4000.0, ge=0)
    labour_expense_inr: float = Field(12000.0, ge=0)
    equipment_expense_inr: float = Field(5000.0, ge=0)
    other_cultivation_inr: float = Field(10000.0, ge=0)
    market_price_per_kg: float = Field(25.0, gt=0)
    transport_cost_inr: float = Field(3000.0, ge=0)
    storage_duration_days: int = Field(0, ge=0, le=365)
    storage_cost_inr: float = Field(0.0, ge=0)
    estimated_spoilage_pct: float = Field(5.0, ge=0, le=95)


class RecommendationStatusUpdate(BaseModel):
    status: Literal["accepted", "dismissed", "deferred", "completed"]


class DecisionFeedbackCreate(BaseModel):
    run_id: Optional[str] = None
    recommendation_id: Optional[str] = None
    farm_id: str = "farm_001"
    followed: bool = True
    actual_cost_inr: Optional[float] = Field(None, ge=0)
    actual_yield_kg: Optional[float] = Field(None, ge=0)
    actual_price_per_kg: Optional[float] = Field(None, ge=0)
    actual_water_m3: Optional[float] = Field(None, ge=0)
    outcome_notes: Optional[str] = Field(None, max_length=400)


class ActionPreviewRequest(BaseModel):
    run_id: Optional[str] = None
    recommendation_id: Optional[str] = None
    farm_id: str = "farm_001"
    action_type: Literal[
        "prepare_irrigation",
        "prepare_seed_plan",
        "prepare_labour_draft",
        "prepare_equipment_draft",
        "prepare_bidding_draft",
        "prepare_transport_draft",
        "prepare_storage_plan",
    ]
    payload: Dict[str, Any] = Field(default_factory=dict)
    idempotency_key: Optional[str] = None


class DecisionEvaluateRequest(BaseModel):
    farm_id: str = "farm_001"
    preference_profile: Optional[PreferenceProfile] = None
    persist_run: bool = True
    include_demo_context: bool = False
