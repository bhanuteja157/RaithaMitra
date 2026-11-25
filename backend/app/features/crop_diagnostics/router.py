# backend/app/features/crop_diagnostics/router.py
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from backend.app.features.auth.router import get_current_user
from backend.app.features.crop_diagnostics.disease_knowledge import get_disease_knowledge
from backend.app.features.crop_diagnostics.model_registry import check_model_availability
from backend.app.features.crop_diagnostics.service import (
    analyze_multiple_images,
    analyze_single_image,
    get_surveillance_summary,
    get_user_diagnostic_history,
    submit_surveillance_report,
)

router = APIRouter(prefix="/crop-diagnostics", tags=["AI Crop Doctor (AD-22)"])


class SurveillanceReportRequest(BaseModel):
    crop: str
    suspected_disease: str
    region: str
    confidence: Optional[float] = None
    user_confirmed: bool


@router.get("/status")
def get_status():
    return check_model_availability()


@router.get("/supported-crops")
def get_supported_crops():
    avail = check_model_availability()
    return {
        "model_name": avail.get("model_name"),
        "model_version": avail.get("model_version"),
        "supported_crops": avail.get("supported_crops", []),
        "supported_classes": avail.get("supported_classes", []),
    }


@router.get("/knowledge")
def get_knowledge(crop: str = Query(...), disease: str = Query(...)):
    is_healthy = disease.strip().lower().startswith("healthy")
    return get_disease_knowledge(crop, disease, is_healthy)


@router.post("/analyze")
async def analyze_image(
    crop: str = Form(default="auto"),
    farm_id: Optional[str] = Form(default=None),
    temperature_c: Optional[float] = Form(default=None),
    humidity_pct: Optional[float] = Form(default=None),
    rainfall_mm: Optional[float] = Form(default=None),
    file: UploadFile = File(...),
):
    content = await file.read()
    return analyze_single_image(
        filename=file.filename or "leaf.jpg",
        content_type=file.content_type,
        image_bytes=content,
        crop=crop,
        farm_id=farm_id,
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        rainfall_mm=rainfall_mm,
        persist_history=False,
    )


@router.post("/analyze-authenticated")
async def analyze_image_authenticated(
    crop: str = Form(default="auto"),
    farm_id: Optional[str] = Form(default=None),
    temperature_c: Optional[float] = Form(default=None),
    humidity_pct: Optional[float] = Form(default=None),
    rainfall_mm: Optional[float] = Form(default=None),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    content = await file.read()
    return analyze_single_image(
        filename=file.filename or "leaf.jpg",
        content_type=file.content_type,
        image_bytes=content,
        crop=crop,
        farm_id=farm_id,
        user_id=current_user["id"],
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        rainfall_mm=rainfall_mm,
        persist_history=True,
    )


@router.post("/analyze-multi")
async def analyze_multi(
    crop: str = Form(default="auto"),
    farm_id: Optional[str] = Form(default=None),
    temperature_c: Optional[float] = Form(default=None),
    humidity_pct: Optional[float] = Form(default=None),
    rainfall_mm: Optional[float] = Form(default=None),
    files: List[UploadFile] = File(...),
    current_user=Depends(get_current_user),
):
    if len(files) == 0 or len(files) > 3:
        raise HTTPException(status_code=400, detail="Upload between 1 and 3 leaf images per session.")
    loaded = []
    for f in files:
        loaded.append(
            {
                "filename": f.filename or "leaf.jpg",
                "content_type": f.content_type,
                "bytes": await f.read(),
            }
        )
    return analyze_multiple_images(
        files=loaded,
        crop=crop,
        farm_id=farm_id,
        user_id=current_user["id"],
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        rainfall_mm=rainfall_mm,
    )


@router.get("/history")
def get_history(limit: int = Query(default=20, ge=1, le=100), current_user=Depends(get_current_user)):
    return {"items": get_user_diagnostic_history(current_user["id"], limit=limit)}


@router.post("/surveillance/report")
def report_surveillance(req: SurveillanceReportRequest, current_user=Depends(get_current_user)):
    try:
        return submit_surveillance_report(
            user_id=current_user["id"],
            crop=req.crop,
            suspected_disease=req.suspected_disease,
            region=req.region,
            confidence=req.confidence,
            user_confirmed=req.user_confirmed,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/surveillance/summary")
def surveillance_summary():
    return {"reports": get_surveillance_summary()}
