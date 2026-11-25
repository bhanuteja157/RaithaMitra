# backend/app/api/api.py
from fastapi import APIRouter
from backend.app.api.endpoints import health, farms, weather, recommendations, schemes, biotech, nurseries, locations

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(farms.router, tags=["Farms"])
api_router.include_router(weather.router, tags=["Weather"])
api_router.include_router(recommendations.router, tags=["Recommendations"])
api_router.include_router(schemes.router, tags=["Government Schemes"])
api_router.include_router(biotech.router)
api_router.include_router(nurseries.router)
api_router.include_router(locations.router)

