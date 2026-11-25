# backend/app/services/http_client.py
"""
Shared Asynchronous HTTP Reliability & 12-Provider Status Registry (AD-05).
Provides timeouts, exponential backoff retries, TTL caching, request deduplication,
and honest live provider status tracking.
"""
import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from backend.app.schemas.biointel_advanced import ProviderStatusItem

logger = logging.getLogger("raithamitra.biointel.http")

_TTL_CACHE: Dict[str, Dict[str, Any]] = {}
_INFLIGHT: Dict[str, asyncio.Task] = {}

# Tracks verified runtime status per provider (never marks Connected without actual success)
_PROVIDER_RUNTIME: Dict[str, Dict[str, Any]] = {}


def record_provider_result(
    provider_key: str,
    success: bool,
    error_note: Optional[str] = None,
) -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    entry = _PROVIDER_RUNTIME.setdefault(provider_key, {})
    if success:
        entry["last_success"] = now_iso
        entry["last_error"] = None
        entry["verified"] = True
    else:
        entry["last_error"] = error_note or "Request failed"
        if "verified" not in entry:
            entry["verified"] = False


async def fetch_json_with_resilience(
    provider_key: str,
    url: str,
    method: str = "GET",
    params: Optional[Dict[str, Any]] = None,
    json_body: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout_s: float = 5.0,
    max_retries: int = 2,
    cache_ttl_s: int = 1800,
    cache_key_extra: str = "",
) -> Optional[Any]:
    """
    Executes async HTTP request with TTL caching, request deduplication,
    and bounded exponential backoff retries on transient failures.
    """
    cache_key = f"{provider_key}:{method}:{url}:{str(params)}:{cache_key_extra}"
    now = time.time()
    if cache_ttl_s > 0 and cache_key in _TTL_CACHE:
        entry = _TTL_CACHE[cache_key]
        if now - entry["ts"] < cache_ttl_s:
            return entry["data"]

    if cache_key in _INFLIGHT:
        return await _INFLIGHT[cache_key]

    async def _do_request() -> Optional[Any]:
        backoff = 0.4
        async with httpx.AsyncClient(timeout=timeout_s) as client:
            for attempt in range(max_retries + 1):
                try:
                    if method.upper() == "POST":
                        resp = await client.post(url, params=params, json=json_body, headers=headers)
                    else:
                        resp = await client.get(url, params=params, headers=headers)

                    if resp.status_code == 200:
                        data = resp.json()
                        record_provider_result(provider_key, True)
                        if cache_ttl_s > 0:
                            _TTL_CACHE[cache_key] = {"ts": time.time(), "data": data}
                        return data

                    if resp.status_code in (429, 500, 502, 503, 504) and attempt < max_retries:
                        await asyncio.sleep(backoff)
                        backoff *= 2
                        continue

                    record_provider_result(provider_key, False, f"HTTP {resp.status_code}")
                    return None
                except (httpx.TimeoutException, httpx.RequestError) as exc:
                    if attempt < max_retries:
                        await asyncio.sleep(backoff)
                        backoff *= 2
                        continue
                    logger.warning("Provider %s error: %s", provider_key, exc)
                    record_provider_result(provider_key, False, str(exc))
                    return None
        return None

    task = asyncio.create_task(_do_request())
    _INFLIGHT[cache_key] = task
    try:
        return await task
    finally:
        _INFLIGHT.pop(cache_key, None)


def get_all_provider_statuses() -> List[ProviderStatusItem]:
    """
    Returns honest status for all 12 required API and service integrations.
    Never displays 'Connected and verified' unless an actual request succeeded.
    """
    def _env_status(
        key: str,
        name: str,
        endpoint: str,
        env_vars: List[str],
        classification: Any,
        fallback: str,
        limitations: str,
        requires_key: bool = True,
    ) -> ProviderStatusItem:
        rt = _PROVIDER_RUNTIME.get(key, {})
        missing = [v for v in env_vars if not os.getenv(v)]
        if requires_key and missing:
            status = "Missing credentials"
        elif rt.get("verified") and rt.get("last_success"):
            status = "Connected and verified"
        elif rt.get("last_error"):
            status = "Temporarily unavailable"
        else:
            status = "Configured but unverified"

        return ProviderStatusItem(
            provider_name=name,
            status=status,
            endpoint_or_library=endpoint,
            last_successful_retrieval=rt.get("last_success"),
            missing_configuration=", ".join(missing) if missing else None,
            data_classification=classification,
            fallback_availability=fallback,
            known_limitations=limitations,
        )

    ortools_ok = False
    try:
        import ortools.sat.python.cp_model  # noqa: F401
        ortools_ok = True
    except ImportError:
        pass

    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY") or ""

    return [
        _env_status(
            "europe_pmc",
            "1. Europe PMC",
            "https://www.ebi.ac.uk/europepmc/webservices/rest/search",
            [],
            "Scientific research evidence",
            "Curated verified peer-reviewed citation index",
            "Public REST API; timeout or rate spikes fall back to curated citations.",
            requires_key=False,
        ),
        _env_status(
            "ncbi",
            "2. NCBI E-utilities",
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/",
            ["NCBI_API_KEY", "NCBI_EMAIL"],
            "Scientific research evidence",
            "Proceeds without blocking; optional key increases 3->10 req/s",
            "Gene records do not prove commercial cultivar traits without breeding pedigree.",
            requires_key=False,
        ),
        _env_status(
            "ensembl_plants",
            "3. Ensembl Plants",
            "https://rest.ensembl.org/",
            [],
            "Scientific research evidence",
            "Graceful species limitation notice",
            "Not all commercial crops/cultivars have annotated Ensembl Plants assemblies.",
            requires_key=False,
        ),
        _env_status(
            "gbif",
            "4. GBIF",
            "https://api.gbif.org/v1/species/match",
            [],
            "Official documented information",
            "Curated binomial crop taxonomy map",
            "Species taxonomy only; occurrence does not indicate local seed stock.",
            requires_key=False,
        ),
        _env_status(
            "open_meteo",
            "5. Open-Meteo",
            "https://api.open-meteo.com/v1/forecast",
            [],
            "Forecast data",
            "Deterministic climate baseline cache",
            "Short-term forecasts only; modeled soil moisture is not a physical sensor.",
            requires_key=False,
        ),
        _env_status(
            "soilgrids",
            "6. SoilGrids",
            "https://rest.isric.org/soilgrids/v2.0/properties/query",
            [],
            "Model-estimated data",
            "Farmer Soil Health Card & manual soil profile",
            "250m global modeled estimates only; never provides plant-available P or K.",
            requires_key=False,
        ),
        _env_status(
            "google_places",
            "7. Google Places (New)",
            "https://places.googleapis.com/v1/places:searchText",
            ["GOOGLE_PLACES_API_KEY"],
            "Supplier-reported data",
            "Clearly labelled demonstration nursery directory",
            "Business discovery only; never confirms live seedling stock or unit price.",
            requires_key=True,
        ),
        _env_status(
            "google_routes",
            "8. Google Routes",
            "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
            ["GOOGLE_ROUTES_API_KEY"],
            "Model-estimated data",
            "Haversine straight-line distance estimate",
            "Road distance unavailable without key; fallback is explicitly straight-line.",
            requires_key=True,
        ),
        ProviderStatusItem(
            provider_name="9. National Nursery Portal",
            status="Official resource only",
            endpoint_or_library="https://nhb.gov.in/nnp",
            missing_configuration=None,
            data_classification="Official documented information",
            fallback_availability="Official portal link & manual accreditation verification workflow",
            known_limitations="No authorized public REST API; registration does not guarantee current stock.",
        ),
        ProviderStatusItem(
            provider_name="10. Supabase",
            status="Configured but unverified" if (supabase_url and supabase_key) else "Missing credentials",
            endpoint_or_library=supabase_url or "Local SQLite/In-Memory Persistence Adapter",
            missing_configuration=None if (supabase_url and supabase_key) else "SUPABASE_URL, SUPABASE_ANON_KEY",
            data_classification="Supplier-reported data",
            fallback_availability="Local persistence adapter operational with demo inventory separated",
            known_limitations="Live DB writes require valid Supabase URL, keys, and migration applied.",
        ),
        ProviderStatusItem(
            provider_name="11. Google OR-Tools",
            status="Local service operational" if ortools_ok else "Temporarily unavailable",
            endpoint_or_library="ortools.sat.python.cp_model (CP-SAT)",
            missing_configuration=None if ortools_ok else "ortools Python package",
            data_classification="Model-estimated data",
            fallback_availability="Deterministic linear procurement calculator",
            known_limitations="Optimizes only confirmed priced & in-stock inventory (uses integer paise).",
        ),
        _env_status(
            "gemini",
            "12. Gemini",
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash",
            ["GEMINI_API_KEY"],
            "Scientific research evidence",
            "Deterministic evidence-based multilingual explanations (EN/KN/HI)",
            "Explanations only; strictly barred from inventing papers, prices, or math.",
            requires_key=True,
        ),
    ]
