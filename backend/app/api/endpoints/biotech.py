# backend/app/api/endpoints/biotech.py
"""
FastAPI router for Feature 17: Agricultural Biotechnology Intelligence (BioIntel).
Exposes endpoints for live Europe PMC research search, evidence summarization,
verified crop varieties, and personalized biotech recommendations.
"""
from fastapi import APIRouter, Query, HTTPException, status
from typing import Optional, List

from backend.app.schemas.biotech import (
    BiotechResearchResponse,
    BiotechRecommendationResponse,
    FarmerProfileInput,
    CropVarietyProfile,
)
from backend.app.schemas.nursery import (
    ProcurementCalculationRequest,
    ProcurementOptimizationResponse,
)
from backend.app.services.biotech_service import biotech_service
from backend.app.services.nursery_service import nursery_service

router = APIRouter(prefix="/biotech", tags=["Biotechnology Intelligence (BioIntel)"])

@router.get(
    "/research",
    response_model=BiotechResearchResponse,
    summary="Live Europe PMC scientific research query and evidence extraction",
    description="Fetches live peer-reviewed agricultural research papers from Europe PMC REST API with asynchronous caching and evidence synthesis."
)
def get_biotech_research(
    crop: str = Query(..., min_length=2, description="Target crop e.g. Tomato, Rice, Banana, Chilli"),
    problem: Optional[str] = Query(None, description="Agronomic issue e.g. bacterial wilt, drought tolerance, biofertilizer"),
    category: Optional[str] = Query(None, description="Biotech category filter"),
    page_size: int = Query(default=10, ge=1, le=25, description="Number of scientific papers to retrieve")
):
    try:
        return biotech_service.fetch_research_papers(
            crop=crop,
            problem=problem,
            category=category,
            page_size=page_size
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query scientific research engine: {str(e)}"
        )

@router.get(
    "/crop-varieties",
    response_model=List[CropVarietyProfile],
    summary="Get verified scientific crop varieties and genetic profiles",
    description="Returns institutionally certified crop cultivars, hybrids, grafted rootstocks, and tissue-cultured varieties."
)
def get_crop_varieties(
    crop: Optional[str] = Query(None, description="Crop filter e.g. Tomato, Rice"),
    category: Optional[str] = Query(None, description="Category filter e.g. disease_resistant_varieties")
):
    return biotech_service.get_crop_varieties(crop=crop, category=category)

@router.post(
    "/recommendations",
    response_model=BiotechRecommendationResponse,
    summary="Generate evidence-grounded biotechnology recommendations",
    description="Evaluates farm soil, pH, water availability, and disease history to recommend suitable biotech varieties and interventions with supporting scientific citations."
)
def get_biotech_recommendations(profile: FarmerProfileInput):
    try:
        return biotech_service.generate_recommendations(profile)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate biotechnology recommendations: {str(e)}"
        )

@router.post(
    "/procurement-optimize",
    response_model=ProcurementOptimizationResponse,
    summary="Deterministic procurement optimization for planting materials",
    description="Calculates planting material expenses, transport freight, and suitability score against farmer budget."
)
def optimize_procurement(req: ProcurementCalculationRequest):
    try:
        return nursery_service.optimize_procurement(req)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Procurement calculation failure: {str(e)}"
        )
