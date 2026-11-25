# backend/app/services/market_intelligence/market_service.py
"""
Isolated FastAPI service & router for Agricultural Market Intelligence.
Provides server-side normalization and optional Data.gov.in / AGMARKNET proxy hooks
when DATA_GOV_IN_API_KEY is configured in environment variables.
Ready for optional registration in backend/app/api/api.py by the main integration developer.
"""

import os
from typing import List
from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/market-intelligence", tags=["Market Intelligence"])


class MarketPriceItem(BaseModel):
    crop: str
    state: str
    district: str
    market: str
    modal_price_per_quintal: float
    price_per_kg: float
    source: str
    is_demo: bool


@router.get("/status")
async def market_data_status():
    has_key = bool(os.getenv("DATA_GOV_IN_API_KEY"))
    return {
        "official_api_configured": has_key,
        "supported_sources": ["AGMARKNET / Data.gov.in (server-side key)", "Manual farmer entry", "Illustrative demonstration dataset"],
        "message": "Official API key detected." if has_key else "No DATA_GOV_IN_API_KEY set; frontend uses manual entry and clearly labelled demo datasets.",
    }
