# backend/app/api/endpoints/health.py
from fastapi import APIRouter
from datetime import datetime, timezone
from backend.app.core.config import settings

router = APIRouter()

@router.get("/health", summary="Service Health and Diagnostics")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.ENVIRONMENT,
        "services": {
            "database": "operational_local_adapter",
            "weather_service": "operational_open_meteo",
            "decision_engine": "operational_rule_based"
        }
    }
