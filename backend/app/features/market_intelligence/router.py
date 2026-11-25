"""Authenticated FastAPI router for AD-29 Live Agricultural Market Intelligence."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Header, Query

from backend.app.features.finance.service import resolve_authenticated_farmer
from backend.app.features.market_intelligence.alerts import (
    create_alert_preference,
    evaluate_and_list_alerts,
)
from backend.app.features.market_intelligence.cache import query_market_observations
from backend.app.features.market_intelligence.market_optimizer import (
    compare_buyer_offer,
    compare_markets,
)
from backend.app.features.market_intelligence.normalization import normalize_commodity_name
from backend.app.features.market_intelligence.schemas import (
    BuyerOfferCompareRequest,
    CsvImportRequest,
    LiveFetchRequest,
    ManualMarketPriceCreate,
    MarketAlertPreferenceCreate,
    MarketComparisonRequest,
)
from backend.app.features.market_intelligence.service import (
    add_manual_price,
    fetch_and_cache_live,
    get_cross_module_overview,
    get_historical_and_forecast,
    get_karnataka_markets_summary,
    get_provider_status,
    import_csv_observations,
)

router = APIRouter(prefix="/market-intelligence", tags=["Market Intelligence (AD-29)"])


@router.get("/status")
def market_status():
    return get_provider_status()


@router.get("/observations")
def list_observations(
    commodity: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    market: Optional[str] = Query(None),
    source_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    canon = normalize_commodity_name(commodity) if commodity else None
    rows = query_market_observations(
        commodity=canon,
        state=state,
        district=district,
        market=market,
        source_type=source_type,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )
    return {"count": len(rows), "observations": rows}


@router.post("/fetch-live")
async def fetch_live_prices(
    req: LiveFetchRequest,
    authorization: Optional[str] = Header(None),
):
    resolve_authenticated_farmer(authorization)
    return await fetch_and_cache_live(req)


@router.post("/manual")
def create_manual_price(
    req: ManualMarketPriceCreate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return add_manual_price(user["user_id"], req)


@router.post("/import-csv")
def import_csv_prices(
    req: CsvImportRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return import_csv_observations(user["user_id"], req)


@router.get("/karnataka-markets")
def karnataka_markets():
    return get_karnataka_markets_summary()


@router.get("/history")
def get_market_history_and_forecast(
    commodity: str = Query("Tomato"),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    market: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    horizon_days: int = Query(7, ge=1, le=30),
):
    return get_historical_and_forecast(
        commodity=commodity,
        state=state,
        district=district,
        market=market,
        start_date=start_date,
        end_date=end_date,
        horizon_days=horizon_days,
    )


@router.post("/compare-markets")
def run_market_comparison(
    req: MarketComparisonRequest,
    authorization: Optional[str] = Header(None),
):
    resolve_authenticated_farmer(authorization)
    return compare_markets(req)


@router.post("/compare-offer")
def run_buyer_offer_comparison(
    req: BuyerOfferCompareRequest,
    authorization: Optional[str] = Header(None),
):
    resolve_authenticated_farmer(authorization)
    return compare_buyer_offer(req)


@router.post("/alerts/preferences")
def add_alert_preference(
    req: MarketAlertPreferenceCreate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return create_alert_preference(user["user_id"], req)


@router.get("/alerts")
def get_alerts(authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_farmer(authorization)
    return evaluate_and_list_alerts(user["user_id"])


@router.get("/overview")
def get_overview(
    farm_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return get_cross_module_overview(user["user_id"], user["role"], farm_id)
