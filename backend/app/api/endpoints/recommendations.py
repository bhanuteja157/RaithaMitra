# backend/app/api/endpoints/recommendations.py
from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas.recommendation import RecommendationResponse
from backend.app.services.farm_service import farm_service
from backend.app.services.weather_service import weather_service
from backend.app.engines.decision_engine import decision_engine

router = APIRouter()

@router.get("/recommendations", response_model=RecommendationResponse, summary="Get evidence-grounded action recommendations")
async def get_recommendations(farm_id: str = Query(..., description="ID of farm")):
    farm = farm_service.get_farm(farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found")
    
    weather = await weather_service.get_weather(farm.latitude, farm.longitude)
    return decision_engine.evaluate_farm(farm, weather)
