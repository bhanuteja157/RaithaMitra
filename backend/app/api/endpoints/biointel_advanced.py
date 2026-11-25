# backend/app/api/endpoints/biointel_advanced.py
"""
Dedicated FastAPI Router for AD-05 Advanced BioIntel & Scientific Procurement.
Mount in backend/app/api/api.py:
    from backend.app.api.endpoints import biointel_advanced
    api_router.include_router(biointel_advanced.router)
"""
from fastapi import APIRouter, Query
from typing import List, Optional

from backend.app.schemas.biointel_advanced import (
    UnifiedBioIntelRequest,
    UnifiedBioIntelResponse,
    ProviderStatusItem,
    ORToolsProcurementRequest,
    ORToolsProcurementResponse,
    GBIFSpeciesMatch,
    IndianAgEvidenceRecord,
)
from backend.app.services.unified_biointel_service import unified_biointel_service
from backend.app.services.http_client import get_all_provider_statuses
from backend.app.services.routing_ortools_service import routing_ortools_service
from backend.app.services.taxonomy_genomics_service import taxonomy_genomics_service
from backend.app.data.indian_ag_evidence import get_indian_evidence_for_crop, get_national_nursery_portal_info

router = APIRouter(prefix="/biotech/advanced", tags=["Advanced BioIntel (AD-05)"])


@router.post("/workflow", response_model=UnifiedBioIntelResponse)
async def run_unified_biointel_workflow(req: UnifiedBioIntelRequest):
    return await unified_biointel_service.run_unified_workflow(req)


@router.get("/providers", response_model=List[ProviderStatusItem])
def get_provider_statuses():
    return get_all_provider_statuses()


@router.post("/optimize-ortools", response_model=ORToolsProcurementResponse)
def optimize_procurement_ortools(req: ORToolsProcurementRequest):
    return routing_ortools_service.optimize_procurement_cp_sat(req)


@router.get("/species", response_model=GBIFSpeciesMatch)
async def validate_crop_species(crop: str = Query(..., min_length=2)):
    return await taxonomy_genomics_service.validate_species_gbif(crop)


@router.get("/genomics")
async def get_crop_genomics(crop: str = Query(..., min_length=2)):
    sp = await taxonomy_genomics_service.validate_species_gbif(crop)
    ncbi = await taxonomy_genomics_service.fetch_ncbi_genetics(sp.accepted_scientific_name, [])
    ensembl = await taxonomy_genomics_service.fetch_ensembl_plants(crop, sp.accepted_scientific_name)
    return {"species": sp, "ncbi": ncbi, "ensembl_plants": ensembl}


@router.get("/indian-evidence")
def get_indian_evidence(crop: str = Query(..., min_length=2)):
    return {
        "crop": crop,
        "records": get_indian_evidence_for_crop(crop),
        "national_nursery_portal": get_national_nursery_portal_info(),
    }
