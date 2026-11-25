"""Pydantic schemas for AD-31 Offline Synchronization."""
from __future__ import annotations

from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field

AllowedOperationType = Literal[
    "create_manual_expense",
    "record_harvest_observation",
    "record_market_price",
    "equipment_booking_draft",
    "labour_job_draft",
    "transport_booking_draft",
    "bidding_listing_draft",
]


class SyncOperationSubmitRequest(BaseModel):
    operation_type: AllowedOperationType
    idempotency_key: str = Field(..., min_length=8, max_length=128)
    farm_id: Optional[str] = "farm_001"
    resource_version: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
