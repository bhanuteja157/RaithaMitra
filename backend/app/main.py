import asyncio
import json
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
                    register_and_sync_parcel(
                        farm_id=p["farm_id"],
                        farm_name=p["farm_name"],
                        crop_name=p["crop_name"],
                        sowing_date=p["sowing_date"],
                        area_acres=p["area_acres"],
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

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
