from fastapi import APIRouter
from backend.app.api.endpoints import health, farms, weather, recommendations, schemes, biotech, nurseries, locations, scientific, biointel_advanced
from backend.app.features.auth import router as auth_router
from backend.app.features.labour import router as labour_router
from backend.app.features.bidding import router as bidding_router
from backend.app.features.transportation import router as transport_router
from backend.app.features.biointel import router as biointel_router
from backend.app.features.finance import router as finance_router
from backend.app.features.assistant import router as assistant_router
from backend.app.features.satellite import router as satellite_router
from backend.app.features.post_harvest import router as post_harvest_router
from backend.app.features.equipment import router as equipment_router
from backend.app.features.market_intelligence import router as market_router
from backend.app.features.decision_intelligence import router as decision_router

api_router = APIRouter()

# Core Services
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(farms.router, tags=["Farms"])
api_router.include_router(weather.router, tags=["Weather"])
api_router.include_router(recommendations.router, tags=["Recommendations"])
api_router.include_router(schemes.router, tags=["Government Schemes"])

# Canonical Biotechnology, Nursery Marketplace, and Smart Location Services
api_router.include_router(biotech.router)
api_router.include_router(nurseries.router)
api_router.include_router(locations.router)

# Scientific Intelligence and Advanced BioIntel
api_router.include_router(scientific.router)
api_router.include_router(biointel_advanced.router)

# Flagship Multi-Role Platform Routers
api_router.include_router(auth_router.router)
api_router.include_router(labour_router.router)
api_router.include_router(bidding_router.router)
api_router.include_router(transport_router.router)
api_router.include_router(biointel_router.router)
api_router.include_router(finance_router.router)
api_router.include_router(assistant_router.router)
api_router.include_router(satellite_router.router)
api_router.include_router(post_harvest_router.router)
api_router.include_router(equipment_router.router)
api_router.include_router(market_router.router)
api_router.include_router(decision_router.router)
