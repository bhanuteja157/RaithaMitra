# backend/app/api/endpoints/scientific.py
"""
Dedicated Scientific Agricultural Intelligence Router (AD-04).
Modular router for:
- P0: /scientific/irrigation/calculate
- P1: /scientific/soil/analyze
- P1: /scientific/simulation/financial
- P2: /scientific/farm-twin/simulate
- P3: /scientific/satellite/analyze
- P4: /scientific/diagnostics/status & /scientific/diagnostics/analyze

To register in central API router (backend/app/api/api.py):
    from backend.app.api.endpoints import scientific
    api_router.include_router(scientific.router)
"""
from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional
from backend.app.schemas.scientific import (
    ScientificModuleOutput,
    IrrigationRequest,
    SoilAnalysisRequest,
    FinancialSimulationRequest,
    FarmTwinRequest,
    SatelliteRequest,
)
from backend.app.services.scientific_irrigation_service import scientific_irrigation_service
from backend.app.services.soil_service import soil_service
from backend.app.services.simulation_service import simulation_service
from backend.app.services.farm_twin_service import farm_twin_service
from backend.app.services.satellite_service import satellite_service
from backend.app.services.diagnostics_service import diagnostics_service

router = APIRouter(prefix="/scientific", tags=["Scientific Intelligence (AD-04)"])


@router.post("/irrigation/calculate", response_model=ScientificModuleOutput)
async def calculate_scientific_irrigation(req: IrrigationRequest):
    return await scientific_irrigation_service.calculate_irrigation(req)


@router.post("/soil/analyze", response_model=ScientificModuleOutput)
def analyze_soil_nutrients(req: SoilAnalysisRequest):
    return soil_service.analyze_soil(req)


@router.post("/simulation/financial", response_model=ScientificModuleOutput)
def run_financial_simulation(req: FinancialSimulationRequest):
    return simulation_service.run_financial_simulation(req)


@router.post("/farm-twin/simulate", response_model=ScientificModuleOutput)
async def simulate_digital_farm_twin(req: FarmTwinRequest):
    return await farm_twin_service.simulate_twin(req)


@router.post("/satellite/analyze", response_model=ScientificModuleOutput)
def analyze_satellite_field(req: SatelliteRequest):
    return satellite_service.analyze_field(req)


@router.get("/diagnostics/status")
def get_diagnostics_model_status():
    return diagnostics_service.check_model_availability()


@router.post("/diagnostics/analyze", response_model=ScientificModuleOutput)
async def analyze_crop_leaf_image(
    crop: str = Form(default="Tomato"),
    farm_id: Optional[str] = Form(default=None),
    file: UploadFile = File(...),
):
    content = await file.read()
    return diagnostics_service.analyze_leaf_image(
        farm_id=farm_id,
        crop=crop,
        filename=file.filename or "leaf.jpg",
        content_type=file.content_type,
        image_bytes=content,
    )
