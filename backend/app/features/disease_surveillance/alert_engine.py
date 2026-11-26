"""
Early Warning Alert Generation & Persistence Engine for AD-40C.

Creates deduplicated in-app alerts for farmers whose crop is at Moderate, High, or Critical risk.
Never fabricates SMS/WhatsApp delivery claims.
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from backend.app.db.database import get_db_connection
from backend.app.features.disease_surveillance.disease_knowledge import resolve_disease_profile


def _build_fingerprint(user_id: str, farm_id: str, crop: str, disease: str, is_demo: bool) -> str:
    return f"{user_id}|{farm_id}|{crop.strip().lower()}|{disease.strip().lower()}|{1 if is_demo else 0}"


def generate_or_update_alerts_for_farm(
    recipient_user_id: str,
    farm: Dict[str, Any],
    risk_assessment: Dict[str, Any],
    is_demonstration: bool = False,
) -> List[Dict[str, Any]]:
    """
    Evaluates disease risk breakdown and upserts deduplicated alerts in SQLite
    whenever risk_level is Moderate, High, or Critical.
    """
    created_or_updated: List[Dict[str, Any]] = []
    breakdown = risk_assessment.get("disease_breakdown") or []
    qualifying = [
        b for b in breakdown if b.get("risk_level") in ("Moderate", "High", "Critical")
    ]
    if not qualifying:
        return created_or_updated

    now = datetime.now(timezone.utc).isoformat()
    approx_region = f"{farm.get('district', 'Local Region')}, {farm.get('state', 'Karnataka')}"
    demo_int = 1 if is_demonstration else 0

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        for item in qualifying:
            disease = item["disease_name"]
            crop = risk_assessment["crop"]
            fp = _build_fingerprint(recipient_user_id, farm["id"], crop, disease, is_demonstration)
            profile, _ = resolve_disease_profile(crop, disease)

            followup = (
                "Scout 20–30 plants across 4 corners and center row within 24–48 hours; confirm symptoms with local KVK."
                if item["risk_level"] in ("High", "Critical")
                else "Inspect lower canopy and new shoots within 3–4 days; log any spots via Check Crop Symptoms."
            )
            reason = (
                f"{item['independent_farms_count']} independent farm(s) within {item['nearest_distance_km']} km "
                f"reported {disease} ({item['most_recent_days']}d ago). "
                f"Modeled risk: {item['risk_level']} (heuristic index {item['heuristic_risk_index']}/100)."
            )

            existing = cursor.execute(
                "SELECT id, status, risk_level FROM disease_alerts WHERE alert_fingerprint = ? AND status != 'dismissed'",
                (fp,),
            ).fetchone()

            if existing:
                cursor.execute(
                    """
                    UPDATE disease_alerts
                    SET risk_level = ?, observation_recency_days = ?, reason = ?,
                        preventive_actions_json = ?, scientific_references_json = ?,
                        followup_inspection = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        item["risk_level"],
                        int(item["most_recent_days"]),
                        reason,
                        json.dumps(profile["preventive_actions"]),
                        json.dumps(profile["scientific_references"]),
                        followup,
                        now,
                        existing["id"],
                    ),
                )
                alert_id = existing["id"]
                status_val = existing["status"]
            else:
                # Also skip if user already dismissed this exact active threat recently
                dismissed_row = cursor.execute(
                    "SELECT id FROM disease_alerts WHERE alert_fingerprint = ? AND status = 'dismissed'",
                    (fp,),
                ).fetchone()
                if dismissed_row:
                    continue

                alert_id = f"alrt_{uuid.uuid4().hex[:10]}"
                status_val = "unread"
                cursor.execute(
                    """
                    INSERT INTO disease_alerts (
                        id, recipient_user_id, farm_id, disease_name, crop, approximate_region,
                        risk_level, observation_recency_days, reason, preventive_actions_json,
                        scientific_references_json, followup_inspection, alert_fingerprint,
                        status, is_demonstration, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?, ?, ?)
                    """,
                    (
                        alert_id,
                        recipient_user_id,
                        farm["id"],
                        disease,
                        crop,
                        approx_region,
                        item["risk_level"],
                        int(item["most_recent_days"]),
                        reason,
                        json.dumps(profile["preventive_actions"]),
                        json.dumps(profile["scientific_references"]),
                        followup,
                        fp,
                        demo_int,
                        now,
                        now,
                    ),
                )

            created_or_updated.append(
                {
                    "id": alert_id,
                    "farm_id": farm["id"],
                    "disease_name": disease,
                    "crop": crop,
                    "approximate_region": approx_region,
                    "risk_level": item["risk_level"],
                    "observation_recency_days": int(item["most_recent_days"]),
                    "reason": reason,
                    "preventive_actions": profile["preventive_actions"],
                    "scientific_references": profile["scientific_references"],
                    "followup_inspection": followup,
                    "status": status_val,
                    "is_demonstration": is_demonstration,
                    "delivery_channel": "in_app_only",
                    "delivery_note": "In-app surveillance warning only (SMS/WhatsApp not configured).",
                    "updated_at": now,
                }
            )
        conn.commit()
    finally:
        conn.close()
    return created_or_updated
