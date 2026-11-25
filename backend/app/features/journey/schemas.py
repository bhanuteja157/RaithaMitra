"""Pydantic request schemas for AD-32 Seed-to-Sale Journey."""
from __future__ import annotations

from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field

StageKey = Literal[
    "crop_seed_selection",
    "land_prep_sowing",
    "crop_growth_monitoring",
    "crop_health_protection",
    "harvest_planning",
    "post_harvest_storage",
    "market_selling",
    "transport_delivery",
    "income_profit_outcome",
]

StageStatus = Literal[
    "not_started",
    "planning",
    "in_progress",
    "completed",
    "needs_attention",
    "blocked",
    "not_applicable",
]


class JourneyCreateRequest(BaseModel):
    farm_id: str = "farm_001"
    crop_name: str = Field(..., min_length=2, max_length=80)
    crop_variety: Optional[str] = Field(None, max_length=120)
    season: str = Field("Kharif 2026", min_length=2, max_length=60)
    cultivated_area_acres: float = Field(..., gt=0, le=5000)
    cultivation_budget_inr: float = Field(50000.0, ge=0)
    planned_sowing_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    expected_harvest_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    seed_plan: Optional[Dict[str, Any]] = None


class JourneyUpdateRequest(BaseModel):
    crop_variety: Optional[str] = None
    cultivation_budget_inr: Optional[float] = Field(None, ge=0)
    actual_sowing_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    actual_harvest_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    status: Optional[Literal["active", "completed", "archived"]] = None
    seed_plan: Optional[Dict[str, Any]] = None


class StageStatusUpdateRequest(BaseModel):
    status: StageStatus
    notes: Optional[str] = Field(None, max_length=300)


class JourneyActivityCreateRequest(BaseModel):
    stage_key: StageKey
    activity_type: str = Field(..., min_length=2, max_length=60)
    title: str = Field(..., min_length=2, max_length=140)
    notes: Optional[str] = Field(None, max_length=400)
    recorded_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    quantity_value: Optional[float] = Field(None, ge=0)
    quantity_unit: Optional[str] = Field(None, max_length=30)
    cost_inr: float = Field(0.0, ge=0)
    idempotency_key: Optional[str] = Field(None, max_length=120)


class JourneyLinkRecordRequest(BaseModel):
    stage_key: StageKey
    source_module: Literal[
        "biointel",
        "equipment",
        "labour",
        "post_harvest_harvest",
        "post_harvest_lot",
        "post_harvest_storage",
        "bidding_listing",
        "bidding_order",
        "transport_booking",
        "finance_transaction",
    ]
    record_id: str = Field(..., min_length=2, max_length=120)
    summary_label: Optional[str] = Field(None, max_length=180)
