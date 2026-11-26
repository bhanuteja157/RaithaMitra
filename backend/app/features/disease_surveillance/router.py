"""Authenticated FastAPI Router for AD-40C Community Crop Disease Surveillance."""
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status

from backend.app.features.agri_assistant.context import authenticate_bearer_user
from backend.app.features.disease_surveillance.assistant_tools import (
    TOOL_CONTRACTS,
    TOOL_REGISTRY,
)
from backend.app.features.disease_surveillance.schemas import (
    AlertStatusUpdateRequest,
    AssistantToolExecuteRequest,
    DiagnosticPromotionRequest,
    DiseaseReportCreate,
    OutbreakEvaluationRequest,
    ReportVerifyRequest,
)
from backend.app.features.disease_surveillance.service import surveillance_service

router = APIRouter(prefix="/surveillance", tags=["Disease Surveillance (AD-40C)"])


def _get_auth_user(authorization: Optional[str] = Header(None)):
    return authenticate_bearer_user(authorization)


@router.post("/reports", status_code=status.HTTP_201_CREATED)
def submit_disease_report(
    payload: DiseaseReportCreate,
    user: dict = Depends(_get_auth_user),
):
    return surveillance_service.create_report(user, payload)


@router.post("/reports/from-diagnostic", status_code=status.HTTP_201_CREATED)
def promote_diagnostic_report(
    payload: DiagnosticPromotionRequest,
    user: dict = Depends(_get_auth_user),
):
    return surveillance_service.promote_from_diagnostic(user, payload)


@router.patch("/reports/{report_id}/verify")
def verify_disease_report(
    report_id: str,
    payload: ReportVerifyRequest,
    user: dict = Depends(_get_auth_user),
):
    return surveillance_service.verify_report(user, report_id, payload.verification_status, payload.notes)


@router.get("/reports")
def list_disease_reports(
    farm_id: Optional[str] = Query(None),
    crop: Optional[str] = Query(None),
    disease: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    radius_km: float = Query(50.0, ge=2.0, le=500.0),
    mine_only: bool = Query(False),
    demo_mode: bool = Query(False),
    user: dict = Depends(_get_auth_user),
):
    return surveillance_service.get_reports(
        user=user,
        farm_id=farm_id,
        crop=crop,
        disease=disease,
        date_from=date_from,
        date_to=date_to,
        radius_km=radius_km,
        mine_only=mine_only,
        demo_mode=demo_mode,
    )


@router.get("/map")
def get_geospatial_surveillance_map(
    farm_id: Optional[str] = Query(None),
    crop: Optional[str] = Query(None),
    disease: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    radius_km: float = Query(40.0, ge=2.0, le=500.0),
    demo_mode: bool = Query(False),
    user: dict = Depends(_get_auth_user),
):
    return surveillance_service.get_map_intelligence(
        user=user,
        farm_id=farm_id,
        crop=crop,
        disease=disease,
        date_from=date_from,
        date_to=date_to,
        radius_km=radius_km,
        demo_mode=demo_mode,
    )


@router.get("/risk")
async def get_farm_risk_assessment(
    farm_id: Optional[str] = Query(None),
    radius_km: float = Query(25.0, ge=2.0, le=200.0),
    disease: Optional[str] = Query(None),
    crop: Optional[str] = Query(None),
    demo_mode: bool = Query(False),
    sync_alerts: bool = Query(True),
    user: dict = Depends(_get_auth_user),
):
    return await surveillance_service.get_farm_risk_and_sync_alerts(
        user=user,
        farm_id=farm_id,
        radius_km=radius_km,
        focus_disease=disease,
        crop_override=crop,
        demo_mode=demo_mode,
        sync_alerts=sync_alerts,
    )


@router.get("/outbreaks")
def get_outbreak_summary(
    crop: Optional[str] = Query(None),
    demo_mode: bool = Query(False),
    user: dict = Depends(_get_auth_user),
):
    return surveillance_service.get_outbreak_summary(demo_mode=demo_mode, crop=crop)


@router.get("/guidance")
def get_scientific_prevention_guidance(
    crop: Optional[str] = Query(None),
    disease_name: Optional[str] = Query(None),
    user: dict = Depends(_get_auth_user),
):
    return surveillance_service.get_guidance(crop=crop, disease_name=disease_name)


@router.get("/alerts")
def get_farmer_alerts(
    demo_mode: bool = Query(False),
    include_dismissed: bool = Query(False),
    user: dict = Depends(_get_auth_user),
):
    return surveillance_service.get_alerts(
        user=user, demo_mode=demo_mode, include_dismissed=include_dismissed
    )


@router.post("/alerts/evaluate")
async def evaluate_alerts_now(
    payload: OutbreakEvaluationRequest,
    user: dict = Depends(_get_auth_user),
):
    res = await surveillance_service.get_farm_risk_and_sync_alerts(
        user=user,
        farm_id=payload.farm_id,
        demo_mode=payload.demo_mode,
        sync_alerts=True,
    )
    alerts = surveillance_service.get_alerts(user=user, demo_mode=payload.demo_mode)
    return {
        "evaluated": True,
        "risk_level": res["risk_assessment"]["risk_level"],
        "alerts_synced_count": res["alerts_synced_count"],
        "alerts": alerts["alerts"],
    }


@router.patch("/alerts/{alert_id}")
def update_alert_status(
    alert_id: str,
    payload: AlertStatusUpdateRequest,
    user: dict = Depends(_get_auth_user),
):
    return surveillance_service.update_alert_status(user, alert_id, payload.status)


@router.get("/assistant-tools")
def list_assistant_integration_contracts(user: dict = Depends(_get_auth_user)):
    return {
        "module": "disease_surveillance_ad40c",
        "integration_note": "Read-only contract endpoints exposed for Gemini Voice Assistant tool registration.",
        "tools": TOOL_CONTRACTS,
    }


@router.post("/assistant-tools/{tool_name}")
async def invoke_surveillance_assistant_tool(
    tool_name: str,
    req: AssistantToolExecuteRequest,
    user: dict = Depends(_get_auth_user),
):
    fn = TOOL_REGISTRY.get(tool_name)
    if not fn:
        raise HTTPException(status_code=404, detail=f"Unknown surveillance tool '{tool_name}'.")
    if tool_name == "get_nearby_disease_reports":
        return await fn(user=user, farm_id=req.farm_id, crop=req.crop, radius_km=req.radius_km, demo_mode=req.demo_mode)
    if tool_name == "get_farm_disease_risk":
        return await fn(user=user, farm_id=req.farm_id, crop=req.crop, radius_km=req.radius_km, demo_mode=req.demo_mode)
    if tool_name == "get_regional_outbreak_summary":
        return await fn(user=user, crop=req.crop, demo_mode=req.demo_mode)
    if tool_name == "get_disease_prevention_actions":
        return await fn(user=user, crop=req.crop, disease_name=req.disease_name)
    if tool_name == "get_active_disease_alerts":
        return await fn(user=user, demo_mode=req.demo_mode)
    if tool_name == "prepare_community_disease_report":
        return await fn(user=user, farm_id=req.farm_id, crop=req.crop, disease_name=req.disease_name)
    raise HTTPException(status_code=400, detail="Unsupported tool invocation.")
