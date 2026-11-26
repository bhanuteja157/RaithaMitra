"""
AD-29: Market Intelligence Orchestration Service.
Connects AGMARKNET/Data.gov.in live retrieval, SQLite cache, CSV import,
manual entry, historical analysis, statistical forecasting, market optimization,
Smart Bidding benchmarks, Transport Connect, AD-27 Post-Harvest, and AD-24 Finance.
"""
from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.features.finance.service import compute_financial_summary
from backend.app.features.market_intelligence.cache import (
    persist_market_observations,
    query_market_observations,
)
from backend.app.features.market_intelligence.forecasting import forecast_market_prices
from backend.app.features.market_intelligence.historical_analysis import compute_historical_summary
from backend.app.features.market_intelligence.normalization import (
    KARNATAKA_PRIORITY_DISTRICTS,
    SUPPORTED_COMMODITIES,
    normalize_commodity_name,
    normalize_market_record,
)
from backend.app.features.market_intelligence.providers import (
    data_gov_configured,
    fetch_agmarknet_records,
)
from backend.app.features.market_intelligence.schemas import (
    CsvImportRequest,
    LiveFetchRequest,
    ManualMarketPriceCreate,
)
from backend.app.features.post_harvest.service import get_post_harvest_summary


def get_provider_status() -> Dict[str, Any]:
    configured = data_gov_configured()
    conn = get_db_connection()
    try:
        logs = [
            dict(r)
            for r in conn.execute(
                "SELECT provider, status, records_fetched, error_message, retrieved_at FROM market_provider_logs ORDER BY retrieved_at DESC LIMIT 5"
            ).fetchall()
        ]
        total_cached = conn.execute("SELECT COUNT(*) FROM market_price_observations").fetchone()[0]
    finally:
        conn.close()

    return {
        "official_api_configured": configured,
        "provider_name": "AGMARKNET / Data.gov.in (Resource 9ef84268-d588-465a-a308-a864a43d0070)",
        "supported_commodities": SUPPORTED_COMMODITIES,
        "karnataka_priority_districts": KARNATAKA_PRIORITY_DISTRICTS,
        "cached_observations_count": total_cached,
        "recent_provider_logs": logs,
        "message": (
            "DATA_GOV_IN_API_KEY configured; live AGMARKNET retrieval enabled."
            if configured
            else "DATA_GOV_IN_API_KEY is not configured in backend environment. Live retrieval is unverified; manual entry, CSV import, and cached observations remain active."
        ),
    }


async def fetch_and_cache_live(req: LiveFetchRequest) -> Dict[str, Any]:
    norm_comm = normalize_commodity_name(req.commodity) if req.commodity else None
    res = await fetch_agmarknet_records(
        commodity=norm_comm,
        state=req.state,
        district=req.district,
        market=req.market,
        variety=req.variety,
        arrival_date=req.arrival_date,
        limit=req.limit,
        offset=req.offset,
    )
    if res["status"] == "live" and res["records"]:
        persist_res = persist_market_observations(res["records"])
        return {
            "status": "live",
            "is_live": True,
            "cache_fallback": False,
            "district_match": True,
            "records": res["records"],
            "nearby_records": [],
            "persisted": persist_res,
            "provenance": "Official AGMARKNET / Data.gov.in",
        }

    # If exact district returned 0 live records, check nearby markets in the same state as a separate list
    nearby_records: List[Dict[str, Any]] = []
    if res["status"] == "live" and not res["records"] and req.district and req.include_nearby_fallback:
        nearby_res = await fetch_agmarknet_records(
            commodity=norm_comm,
            state=req.state,
            district=None,
            market=None,
            variety=req.variety,
            arrival_date=req.arrival_date,
            limit=min(req.limit, 25),
            offset=0,
        )
        if nearby_res["status"] == "live" and nearby_res["records"]:
            persist_market_observations(nearby_res["records"])
            nearby_records = nearby_res["records"]

    # Fallback to cached official observations (never substituting demo prices silently!)
    cached = query_market_observations(
        commodity=norm_comm,
        state=req.state,
        district=req.district,
        market=req.market,
        source_type="official_agmarknet",
        limit=req.limit,
    )
    return {
        "status": res["status"],
        "is_live": False,
        "cache_fallback": len(cached) > 0,
        "district_match": False if req.district else True,
        "records": cached,
        "nearby_records": nearby_records,
        "error": res.get("error") or (f"No matching observations found in {req.district}." if req.district and not cached else None),
        "provenance": "Cached Official AGMARKNET Observations (Stale / Offline Fallback)" if cached else "Unavailable",
    }


def add_manual_price(user_id: str, payload: ManualMarketPriceCreate) -> Dict[str, Any]:
    norm = normalize_market_record(
        commodity=payload.commodity,
        variety=payload.variety,
        grade=payload.grade,
        state=payload.state,
        district=payload.district,
        market=payload.market,
        observation_date=payload.observation_date,
        modal_price=payload.modal_price,
        min_price=payload.min_price,
        max_price=payload.max_price,
        unit=payload.unit,
        source_type="manual_farmer",
        source_name="Farmer Manual Entry",
        provenance_label="Farmer-Entered Market Price",
    )
    if not norm:
        raise HTTPException(status_code=422, detail="Invalid or inconsistent market price record.")
    res = persist_market_observations([norm], user_id=user_id)
    return {"record": norm, "persisted": res}


def import_csv_observations(user_id: str, payload: CsvImportRequest) -> Dict[str, Any]:
    reader = csv.DictReader(io.StringIO(payload.csv_text.strip()))
    valid_records: List[Dict[str, Any]] = []
    skipped = 0
    total_rows = 0

    for row in reader:
        total_rows += 1
        lower_row = {str(k).strip().lower(): str(v).strip() for k, v in row.items() if k is not None}
        comm = lower_row.get("commodity") or lower_row.get("crop") or ""
        state = lower_row.get("state") or "Karnataka"
        district = lower_row.get("district") or "Mandya"
        market = lower_row.get("market") or lower_row.get("mandi") or ""
        dt = lower_row.get("observation_date") or lower_row.get("arrival_date") or lower_row.get("date") or ""
        modal_raw = lower_row.get("modal_price") or lower_row.get("price") or lower_row.get("price_per_kg") or ""
        unit = lower_row.get("unit") or ("INR/kg" if "price_per_kg" in lower_row else "INR/Quintal")
        min_raw = lower_row.get("min_price")
        max_raw = lower_row.get("max_price")

        try:
            modal_val = float(modal_raw)
            min_val = float(min_raw) if min_raw else None
            max_val = float(max_raw) if max_raw else None
        except (TypeError, ValueError):
            skipped += 1
            continue

        norm = normalize_market_record(
            commodity=comm,
            variety=lower_row.get("variety") or "FAQ",
            grade=lower_row.get("grade") or "FAQ",
            state=state,
            district=district,
            market=market,
            observation_date=dt,
            modal_price=modal_val,
            min_price=min_val,
            max_price=max_val,
            unit=unit,
            source_type=getattr(payload, "source_type", "imported_csv") or "imported_csv",
            source_name=payload.filename,
            provenance_label=payload.source_label,
        )
        if norm:
            valid_records.append(norm)
        else:
            skipped += 1

    persisted = persist_market_observations(valid_records, user_id=user_id)
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO market_imported_datasets (
                id, user_id, filename, row_count, imported_count, skipped_count, source_label, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"mid_{uuid.uuid4().hex[:10]}",
                user_id,
                payload.filename,
                total_rows,
                persisted["inserted"],
                skipped + persisted["skipped"],
                payload.source_label,
                now_iso,
            ),
        )
        conn.commit()
    finally:
        conn.close()

    return {
        "filename": payload.filename,
        "total_rows": total_rows,
        "valid_records": len(valid_records),
        "inserted": persisted["inserted"],
        "skipped": skipped + persisted["skipped"],
    }


def get_historical_and_forecast(
    *,
    commodity: str,
    state: Optional[str] = None,
    district: Optional[str] = None,
    market: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    horizon_days: int = 7,
) -> Dict[str, Any]:
    canon = normalize_commodity_name(commodity)
    obs = query_market_observations(
        commodity=canon,
        state=state,
        district=district,
        market=market,
        start_date=start_date,
        end_date=end_date,
        limit=365,
    )
    history = compute_historical_summary(obs)
    forecast = forecast_market_prices(obs, horizon_days=horizon_days)
    return {
        "commodity": canon,
        "filters": {"state": state, "district": district, "market": market},
        "history": history,
        "forecast": forecast,
    }


def get_karnataka_markets_summary() -> Dict[str, Any]:
    obs = query_market_observations(state="Karnataka", limit=200)
    markets_map: Dict[str, Dict[str, Any]] = {}
    for o in obs:
        key = f"{o['market']}|{o['district']}"
        if key not in markets_map:
            markets_map[key] = {
                "market": o["market"],
                "district": o["district"],
                "state": o["state"],
                "latest_commodity": o["commodity"],
                "latest_modal_per_kg": o["modal_price_per_kg"],
                "latest_date": o["observation_date"],
                "source_type": o["source_type"],
            }
    return {
        "priority_districts": KARNATAKA_PRIORITY_DISTRICTS,
        "confirmed_markets": list(markets_map.values()),
    }


def get_cross_module_overview(user_id: str, role: str, farm_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = None
        if farm_id:
            f = cursor.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
            if f:
                if role != "admin" and f["farmer_id"] != user_id:
                    raise HTTPException(status_code=403, detail="Unauthorized: Farm belongs to another farmer.")
                farm = dict(f)
        if not farm:
            f = cursor.execute("SELECT * FROM farms WHERE farmer_id = ? LIMIT 1", (user_id,)).fetchone()
            farm = dict(f) if f else None

        fin_summary = compute_financial_summary(cursor, user_id, farm) if farm else None
        active_listings = [
            dict(r)
            for r in cursor.execute(
                "SELECT id, crop_name, quantity_kg, min_price_per_kg, status FROM bidding_listings WHERE farmer_id = ? AND status = 'active'",
                (user_id,),
            ).fetchall()
        ]
        available_vehicles = cursor.execute(
            "SELECT COUNT(*) FROM transport_vehicles WHERE availability_status = 'available'"
        ).fetchone()[0]
    finally:
        conn.close()

    ph_summary = get_post_harvest_summary(user_id, role, farm["id"] if farm else None)
    return {
        "farm_id": farm["id"] if farm else None,
        "farm_name": farm["farm_name"] if farm else None,
        "financial_summary": fin_summary,
        "post_harvest_summary": ph_summary,
        "active_bidding_listings": active_listings,
        "available_transport_vehicles": available_vehicles,
    }
