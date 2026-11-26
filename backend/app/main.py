import asyncio
import json
import os
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.core.config import settings
from backend.app.api.api import api_router
from backend.app.db.database import init_db


async def _daily_satellite_monitor_loop():
    """Checks monitored parcels daily while the backend service is running."""
    from backend.app.features.satellite_monitoring.monitoring_service import (
        list_monitored_parcels,
        register_and_sync_parcel,
    )

    while True:
        await asyncio.sleep(24 * 3600)
        try:
            parcels = list_monitored_parcels()
            for p in parcels:
                geo = json.loads(p.get("geojson_json") or "{}")
                coords = (geo.get("coordinates") or [[]])[0]
                if len(coords) >= 3:
                    nxt = p.get("next_check_at")
                    if not nxt or datetime.fromisoformat(nxt) <= datetime.now(timezone.utc):
                        register_and_sync_parcel(
                            farm_id=p["farm_id"],
                            farm_name=p["farm_name"],
                            crop_name=p["crop_name"],
                            sowing_date=p["sowing_date"],
                            area_acres=float(p["area_acres"] or 2.0),
                            coordinates=coords,
                        )
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and seed demo data on startup
    init_db()
    task = asyncio.create_task(_daily_satellite_monitor_loop())
    try:
        yield
    finally:
        task.cancel()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Unified API Engine for RaithaMitra — AI-Powered Agricultural Intelligence and Rural Economic Optimization System.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# Restricted CORS configuration for Next.js frontend
_extra_origins = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()
]
_allowed_origins = list(dict.fromkeys([*settings.CORS_ORIGINS, *_extra_origins]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to RaithaMitra API",
        "docs_url": f"{settings.API_V1_STR}/docs",
        "health_check": f"{settings.API_V1_STR}/health",
        "flagship_features": ["Labour Connect", "Smart Bidding", "Transport Connect", "BioIntel"]
    }
