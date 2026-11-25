"""Authenticated FastAPI router for AD-32 Seed-to-Sale Crop Journeys."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Header, Query

from backend.app.features.finance.service import resolve_authenticated_farmer
from backend.app.features.journey.demo_service import init_demo_journey, reset_demo_journeys
from backend.app.features.journey.schemas import (
    JourneyActivityCreateRequest,
    JourneyCreateRequest,
    JourneyLinkRecordRequest,
    JourneyUpdateRequest,
    StageStatusUpdateRequest,
)
from backend.app.features.journey.service import (
    create_journey,
    generate_journey_report,
    get_journey_detail,
    link_module_record,
    list_journeys,
    record_journey_activity,
    update_journey,
    update_stage_status,
)
from backend.app.features.journey.stage_registry import NINE_STAGES

router = APIRouter(prefix="/journeys", tags=["Seed-to-Sale Journey (AD-32)"])


@router.get("/stages-catalog")
def get_stages_catalog():
    return {"stages": NINE_STAGES}


@router.post("")
def post_create_journey(
    req: JourneyCreateRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return create_journey(user["user_id"], user["role"], req)


@router.get("")
def get_my_journeys(
    farm_id: Optional[str] = Query(None),
    include_archived: bool = Query(False),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return {"journeys": list_journeys(user["user_id"], user["role"], farm_id, include_archived)}


@router.post("/demo/init")
def post_init_demo_journey(
    farm_id: str = Query("farm_001"),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return init_demo_journey(user["user_id"], farm_id)


@router.delete("/demo/reset")
def delete_reset_demo_journeys(authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_farmer(authorization)
    return reset_demo_journeys(user["user_id"])


@router.get("/{journey_id}")
async def get_single_journey(
    journey_id: str,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return await get_journey_detail(user["user_id"], user["role"], journey_id)


@router.patch("/{journey_id}")
def patch_journey(
    journey_id: str,
    req: JourneyUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return update_journey(user["user_id"], user["role"], journey_id, req)


@router.patch("/{journey_id}/stages/{stage_key}")
def patch_stage_status(
    journey_id: str,
    stage_key: str,
    req: StageStatusUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return update_stage_status(user["user_id"], user["role"], journey_id, stage_key, req)


@router.post("/{journey_id}/activities")
def post_journey_activity(
    journey_id: str,
    req: JourneyActivityCreateRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return record_journey_activity(user["user_id"], user["role"], journey_id, req)


@router.post("/{journey_id}/links")
def post_link_record(
    journey_id: str,
    req: JourneyLinkRecordRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return link_module_record(user["user_id"], user["role"], journey_id, req)


@router.get("/{journey_id}/report")
async def get_journey_report(
    journey_id: str,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return await generate_journey_report(user["user_id"], user["role"], journey_id)
