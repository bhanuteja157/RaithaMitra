"""Authenticated FastAPI router for AD-30 Centralized Agricultural Decision Intelligence."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Header, Query

from backend.app.features.decision_intelligence.scenario_simulator import simulate_cross_module_scenario
from backend.app.features.decision_intelligence.schemas import (
    ActionPreviewRequest,
    DecisionEvaluateRequest,
    DecisionFeedbackCreate,
    PreferenceUpdateRequest,
    RecommendationStatusUpdate,
    ScenarioSimulateRequest,
)
from backend.app.features.decision_intelligence.service import (
    confirm_decision_action,
    create_action_preview,
    evaluate_unified_decisions,
    get_decision_history,
    get_user_preference,
    record_decision_feedback,
    update_recommendation_status,
    update_user_preference,
)
from backend.app.features.finance.service import resolve_authenticated_farmer

router = APIRouter(prefix="/decision-intelligence", tags=["Decision Intelligence (AD-30)"])


@router.post("/evaluate")
async def evaluate_farm_decisions(
    req: DecisionEvaluateRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return await evaluate_unified_decisions(user_id=user["user_id"], role=user["role"], req=req)


@router.get("/preferences")
def get_preferences(authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_farmer(authorization)
    return get_user_preference(user["user_id"])


@router.put("/preferences")
def put_preferences(
    req: PreferenceUpdateRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return update_user_preference(user["user_id"], req)


@router.post("/simulate")
def simulate_scenario(
    req: ScenarioSimulateRequest,
    authorization: Optional[str] = Header(None),
):
    resolve_authenticated_farmer(authorization)
    return simulate_cross_module_scenario(req)


@router.get("/history")
def list_history(
    farm_id: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=50),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return get_decision_history(user["user_id"], farm_id, limit)


@router.patch("/recommendations/{rec_id}/status")
def patch_recommendation_status(
    rec_id: str,
    req: RecommendationStatusUpdate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return update_recommendation_status(user["user_id"], user["role"], rec_id, req)


@router.post("/actions/preview")
def post_action_preview(
    req: ActionPreviewRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return create_action_preview(user["user_id"], user["role"], req)


@router.post("/actions/{action_id}/confirm")
def post_confirm_action(
    action_id: str,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return confirm_decision_action(user["user_id"], user["role"], action_id)


@router.post("/feedback")
def post_feedback(
    req: DecisionFeedbackCreate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return record_decision_feedback(user["user_id"], user["role"], req)
