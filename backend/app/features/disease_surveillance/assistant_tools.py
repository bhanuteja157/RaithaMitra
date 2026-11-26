"""
Voice / Gemini Assistant Integration Contract for AD-40C Disease Surveillance.

Exports clean authenticated Python functions and JSON schema definitions so the
main laptop's upgraded Gemini assistant can register these surveillance tools
without modifying or conflicting with the assistant core files.
"""
from typing import Any, Dict, List, Optional

from backend.app.features.disease_surveillance.service import surveillance_service


async def get_nearby_disease_reports(
    user: Dict[str, Any],
    farm_id: Optional[str] = None,
    crop: Optional[str] = None,
    radius_km: float = 25.0,
    demo_mode: bool = False,
) -> Dict[str, Any]:
    """Answers: 'Are there any diseases spreading near my farm?'"""
    return surveillance_service.get_reports(
        user=user,
        farm_id=farm_id,
        crop=crop,
        radius_km=radius_km,
        demo_mode=demo_mode,
    )


async def get_farm_disease_risk(
    user: Dict[str, Any],
    farm_id: Optional[str] = None,
    crop: Optional[str] = None,
    radius_km: float = 25.0,
    demo_mode: bool = False,
) -> Dict[str, Any]:
    """Answers: 'Is my tomato crop at risk?'"""
    return await surveillance_service.get_farm_risk_and_sync_alerts(
        user=user,
        farm_id=farm_id,
        radius_km=radius_km,
        crop_override=crop,
        demo_mode=demo_mode,
        sync_alerts=True,
    )


async def get_regional_outbreak_summary(
    user: Dict[str, Any],
    crop: Optional[str] = None,
    demo_mode: bool = False,
) -> Dict[str, Any]:
    """Summarizes suspected clusters, confirmed outbreaks, and district activity."""
    return surveillance_service.get_outbreak_summary(demo_mode=demo_mode, crop=crop)


async def get_disease_prevention_actions(
    user: Dict[str, Any],
    crop: Optional[str] = None,
    disease_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Answers: 'What precautions should I take?'"""
    return surveillance_service.get_guidance(crop=crop, disease_name=disease_name)


async def get_active_disease_alerts(
    user: Dict[str, Any],
    demo_mode: bool = False,
) -> Dict[str, Any]:
    """Answers: 'Why did I receive this disease warning?'"""
    return surveillance_service.get_alerts(user=user, demo_mode=demo_mode, include_dismissed=False)


async def prepare_community_disease_report(
    user: Dict[str, Any],
    farm_id: Optional[str] = None,
    crop: Optional[str] = None,
    disease_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Prepares a pre-filled draft community disease report requiring explicit farmer review
    and anonymous_community_consent confirmation before database submission.
    """
    from backend.app.features.agri_assistant.context import resolve_authorized_farm

    farm = resolve_authorized_farm(user, farm_id)
    guidance = surveillance_service.get_guidance(crop=crop, disease_name=disease_name)
    return {
        "requires_confirmation": True,
        "draft_report": {
            "farm_id": farm["id"] if farm else farm_id,
            "farm_name": farm.get("farm_name") if farm else None,
            "crop": crop or (farm.get("primary_crop") if farm else "Tomato"),
            "disease_name": disease_name or "",
            "district": farm.get("district") if farm else user.get("district"),
            "state": farm.get("state") if farm else user.get("state", "Karnataka"),
            "anonymous_community_consent": False,
            "verification_status": "farmer_reported",
            "data_source": "manual_farmer_report",
        },
        "suggested_symptoms": (
            guidance["guidance"][0].get("typical_symptoms", [])
            if guidance.get("guidance")
            else []
        ),
        "confirmation_prompt": (
            "Please review the crop, suspected symptoms, and decide whether to opt in "
            "to anonymous community reporting before submitting."
        ),
    }


TOOL_REGISTRY = {
    "get_nearby_disease_reports": get_nearby_disease_reports,
    "get_farm_disease_risk": get_farm_disease_risk,
    "get_regional_outbreak_summary": get_regional_outbreak_summary,
    "get_disease_prevention_actions": get_disease_prevention_actions,
    "get_active_disease_alerts": get_active_disease_alerts,
    "prepare_community_disease_report": prepare_community_disease_report,
}


TOOL_CONTRACTS: List[Dict[str, Any]] = [
    {
        "name": "get_nearby_disease_reports",
        "description": "Retrieve privacy-anonymized community crop disease observations near the farmer's authorized farm.",
        "required_roles": ["farmer", "admin"],
        "input_schema": {
            "type": "object",
            "properties": {
                "farm_id": {"type": "string"},
                "crop": {"type": "string"},
                "radius_km": {"type": "number", "default": 25.0},
                "demo_mode": {"type": "boolean", "default": False},
            },
        },
        "example_questions": ["Are there any diseases spreading near my farm?"],
    },
    {
        "name": "get_farm_disease_risk",
        "description": "Compute explainable weather- and distance-informed crop disease risk for an owned farm.",
        "required_roles": ["farmer", "admin"],
        "input_schema": {
            "type": "object",
            "properties": {
                "farm_id": {"type": "string"},
                "crop": {"type": "string"},
                "radius_km": {"type": "number", "default": 25.0},
                "demo_mode": {"type": "boolean", "default": False},
            },
        },
        "example_questions": ["Is my tomato crop at risk?"],
    },
    {
        "name": "get_regional_outbreak_summary",
        "description": "Retrieve DBSCAN suspected clusters, confirmed outbreaks, and 14-day disease activity trends.",
        "required_roles": ["farmer", "buyer", "labour", "driver", "admin"],
        "input_schema": {
            "type": "object",
            "properties": {
                "crop": {"type": "string"},
                "demo_mode": {"type": "boolean", "default": False},
            },
        },
        "example_questions": ["Are there any regional disease outbreaks right now?"],
    },
    {
        "name": "get_disease_prevention_actions",
        "description": "Retrieve evidence-based non-prescriptive IPM and cultural precautions for crops and diseases.",
        "required_roles": ["farmer", "buyer", "labour", "driver", "admin"],
        "input_schema": {
            "type": "object",
            "properties": {
                "crop": {"type": "string"},
                "disease_name": {"type": "string"},
            },
        },
        "example_questions": ["What precautions should I take?"],
    },
    {
        "name": "get_active_disease_alerts",
        "description": "Retrieve personalized early warning alerts with explanation reasons and follow-up inspection guidance.",
        "required_roles": ["farmer", "admin"],
        "input_schema": {
            "type": "object",
            "properties": {
                "demo_mode": {"type": "boolean", "default": False},
            },
        },
        "example_questions": ["Why did I receive this disease warning?"],
    },
    {
        "name": "prepare_community_disease_report",
        "description": "Prepare a confirmation-required community disease report draft for the farmer's owned farm.",
        "required_roles": ["farmer", "admin"],
        "input_schema": {
            "type": "object",
            "properties": {
                "farm_id": {"type": "string"},
                "crop": {"type": "string"},
                "disease_name": {"type": "string"},
            },
        },
        "example_questions": ["Help me report leaf spot disease in my tomato field"],
    },
]
