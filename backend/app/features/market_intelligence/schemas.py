"""Pydantic request schemas for AD-29 Live Agricultural Market Intelligence."""
from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class LiveFetchRequest(BaseModel):
    commodity: Optional[str] = None
    state: Optional[str] = "Karnataka"
    district: Optional[str] = None
    market: Optional[str] = None
    variety: Optional[str] = None
    arrival_date: Optional[str] = None
    include_nearby_fallback: bool = True
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)


class ManualMarketPriceCreate(BaseModel):
    commodity: str = Field(..., min_length=2, max_length=80)
    variety: str = Field("FAQ", max_length=80)
    grade: str = Field("FAQ", max_length=40)
    state: str = Field("Karnataka", min_length=2, max_length=80)
    district: str = Field(..., min_length=2, max_length=80)
    market: str = Field(..., min_length=2, max_length=120)
    observation_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    modal_price: float = Field(..., gt=0)
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    unit: Literal["INR/kg", "INR/Quintal", "INR/Tonne"] = "INR/kg"


class CsvImportRequest(BaseModel):
    filename: str = Field("imported_prices.csv", min_length=1, max_length=160)
    csv_text: str = Field(..., min_length=10)
    source_label: str = Field("Imported Historical Dataset", max_length=120)
    source_type: Literal["imported_csv", "demonstration_csv"] = "imported_csv"


class MarketCandidateInput(BaseModel):
    market_name: str = Field(..., min_length=2, max_length=140)
    district: Optional[str] = None
    selling_price_per_kg: float = Field(..., gt=0)
    distance_km: float = Field(0.0, ge=0)
    transport_cost_inr: float = Field(0.0, ge=0)
    loading_cost_inr: float = Field(0.0, ge=0)
    market_fee_inr: float = Field(0.0, ge=0)
    handling_cost_inr: float = Field(0.0, ge=0)
    other_expenses_inr: float = Field(0.0, ge=0)
    estimated_loss_kg: float = Field(0.0, ge=0)
    price_source_label: str = Field("Manual / Assumed", max_length=80)


class MarketComparisonRequest(BaseModel):
    commodity: str = Field(..., min_length=2, max_length=80)
    available_quantity_kg: float = Field(..., gt=0)
    markets: List[MarketCandidateInput] = Field(..., min_length=1, max_length=15)


class BuyerOfferCompareRequest(BaseModel):
    commodity: str = Field(..., min_length=2, max_length=80)
    variety: Optional[str] = None
    quantity_kg: float = Field(..., gt=0)
    buyer_offer_per_kg: float = Field(..., gt=0)
    buyer_transport_cost_inr: float = Field(0.0, ge=0)
    benchmark_market_name: Optional[str] = None
    benchmark_price_per_kg: Optional[float] = Field(None, gt=0)
    benchmark_transport_cost_inr: float = Field(0.0, ge=0)


class MarketAlertPreferenceCreate(BaseModel):
    commodity: str = Field(..., min_length=2, max_length=80)
    preferred_market: Optional[str] = Field(None, max_length=120)
    target_price_per_kg: Optional[float] = Field(None, gt=0)
    max_transport_cost_inr: Optional[float] = Field(None, ge=0)
    min_net_return_inr: Optional[float] = Field(None, ge=0)
