"""
AD-29: Official Data.gov.in AGMARKNET Provider Adapter.
Resource ID: 9ef84268-d588-465a-a308-a864a43d0070
Handles pagination, filtering, timeouts, limited retries, rate-limiting (429),
and strict server-side credential isolation (DATA_GOV_IN_API_KEY).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

from backend.app.db.database import get_db_connection
from backend.app.features.market_intelligence.normalization import normalize_market_record

logger = logging.getLogger(__name__)

AGMARKNET_RESOURCE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"

AGMARKNET_COMMODITY_QUERY_MAP: Dict[str, str] = {
    "Green Chilli": "Green Chilli",
    "Dry Chilli": "Dry Chillies",
    "Capsicum": "Capsicum",
    "Black Pepper": "Black Pepper",
    "White Pepper": "White Pepper",
    "Chilli": "Green Chilli",
    "Paddy": "Paddy(Dhan)(Common)",
    "Rice": "Paddy(Dhan)(Common)",
    "Tomato": "Tomato",
    "Onion": "Onion",
    "Maize": "Maize",
    "Cotton": "Cotton",
}


def get_data_gov_api_key() -> str:
    """Recognize DATA_GOV_IN_API_KEY, DATA_GOV_API_KEY, and MANDI_API_KEY aliases."""
    for env_name in ("DATA_GOV_IN_API_KEY", "DATA_GOV_API_KEY", "MANDI_API_KEY"):
        val = (os.getenv(env_name) or "").strip()
        if val:
            return val
    return ""


def data_gov_configured() -> bool:
    return bool(get_data_gov_api_key())


def resolve_agmarknet_commodity_query(commodity: Optional[str]) -> Optional[str]:
    if not commodity:
        return None
    clean = commodity.strip()
    if clean in AGMARKNET_COMMODITY_QUERY_MAP:
        return AGMARKNET_COMMODITY_QUERY_MAP[clean]
    return clean


def _log_provider_attempt(
    *,
    provider: str,
    params: Dict[str, Any],
    status: str,
    records_fetched: int = 0,
    error_message: Optional[str] = None,
) -> None:
    try:
        conn = get_db_connection()
        conn.execute(
            """
            INSERT INTO market_provider_logs (
                id, provider, query_params_json, status, records_fetched, error_message, retrieved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"mpl_{uuid.uuid4().hex[:10]}",
                provider,
                json.dumps(params),
                status,
                records_fetched,
                error_message,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
        conn.close()
    except Exception as exc:
        logger.debug("Provider log skipped: %s", exc)


async def fetch_agmarknet_records(
    *,
    commodity: Optional[str] = None,
    state: Optional[str] = "Karnataka",
    district: Optional[str] = None,
    market: Optional[str] = None,
    variety: Optional[str] = None,
    arrival_date: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    api_key = get_data_gov_api_key()
    provider_commodity = resolve_agmarknet_commodity_query(commodity)
    log_params = {
        "commodity": provider_commodity,
        "state": state,
        "district": district,
        "market": market,
        "variety": variety,
        "arrival_date": arrival_date,
        "limit": limit,
        "offset": offset,
    }
    if not api_key:
        _log_provider_attempt(
            provider="agmarknet_data_gov_in",
            params=log_params,
            status="not_configured",
            error_message="DATA_GOV_IN_API_KEY / DATA_GOV_API_KEY / MANDI_API_KEY not configured",
        )
        return {
            "status": "not_configured",
            "records": [],
            "error": "DATA_GOV_IN_API_KEY (or DATA_GOV_API_KEY / MANDI_API_KEY) is not configured in backend environment.",
        }

    query_params: Dict[str, Any] = {
        "api-key": api_key,
        "format": "json",
        "limit": max(1, min(200, limit)),
        "offset": max(0, offset),
    }
    if state:
        query_params["filters[state]"] = state
    if district:
        query_params["filters[district]"] = district
    if market:
        query_params["filters[market]"] = market
    if variety:
        query_params["filters[variety]"] = variety
    if provider_commodity:
        query_params["filters[commodity]"] = provider_commodity
    if arrival_date:
        query_params["filters[arrival_date]"] = arrival_date

    last_err: Optional[str] = None
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(AGMARKNET_RESOURCE_URL, params=query_params)
            if resp.status_code == 429:
                last_err = "Rate limited (HTTP 429) by Data.gov.in."
                await asyncio.sleep(0.5 * (attempt + 1))
                continue
            if resp.status_code in (401, 403):
                _log_provider_attempt(
                    provider="agmarknet_data_gov_in",
                    params=log_params,
                    status="auth_error",
                    error_message=f"HTTP {resp.status_code}",
                )
                return {"status": "auth_error", "records": [], "error": f"Data.gov.in rejected API key (HTTP {resp.status_code})."}
            if resp.status_code >= 500:
                last_err = f"Upstream server error (HTTP {resp.status_code})."
                await asyncio.sleep(0.3 * (attempt + 1))
                continue
            resp.raise_for_status()
            payload = resp.json()
            raw_records = payload.get("records") or []
            normalized: List[Dict[str, Any]] = []
            for rec in raw_records:
                norm = normalize_market_record(
                    commodity=str(rec.get("commodity") or ""),
                    variety=str(rec.get("variety") or "FAQ"),
                    grade=str(rec.get("grade") or "FAQ"),
                    state=str(rec.get("state") or state or "Karnataka"),
                    district=str(rec.get("district") or ""),
                    market=str(rec.get("market") or ""),
                    observation_date=str(rec.get("arrival_date") or ""),
                    modal_price=rec.get("modal_price"),
                    min_price=rec.get("min_price"),
                    max_price=rec.get("max_price"),
                    unit="INR/Quintal",
                    source_type="official_agmarknet",
                    source_name="AGMARKNET / Data.gov.in",
                    provenance_label="Official AGMARKNET Observation",
                )
                if norm:
                    normalized.append(norm)
            _log_provider_attempt(
                provider="agmarknet_data_gov_in",
                params=log_params,
                status="live",
                records_fetched=len(normalized),
            )
            return {"status": "live", "records": normalized, "total_raw": len(raw_records)}
        except httpx.TimeoutException:
            last_err = "Request timed out contacting Data.gov.in."
        except Exception as exc:
            last_err = f"AGMARKNET request error: {exc}"

    _log_provider_attempt(
        provider="agmarknet_data_gov_in",
        params=log_params,
        status="unavailable",
        error_message=last_err,
    )
    return {"status": "unavailable", "records": [], "error": last_err or "Provider unavailable."}
