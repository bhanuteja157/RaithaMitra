"""
AD-32: Dynamic Journey Stage Progress Engine.
Calculates genuine progress from actual applicable stage statuses and linked records,
excluding 'not_applicable' stages, without hardcoding percentages.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Dict, List


def compute_journey_progress(
    journey: Dict[str, Any],
    stages: List[Dict[str, Any]],
) -> Dict[str, Any]:
    applicable = [s for s in stages if s["status"] != "not_applicable"]
    completed = [s for s in applicable if s["status"] == "completed"]
    in_prog = [s for s in applicable if s["status"] in ("in_progress", "planning", "needs_attention")]

    total_app = len(applicable)
    comp_cnt = len(completed)
    pct = round((comp_cnt / total_app) * 100.0, 1) if total_app > 0 else 0.0

    current_stage = (
        in_prog[0]
        if in_prog
        else next((s for s in applicable if s["status"] != "completed"), applicable[-1] if applicable else None)
    )

    days_since_sowing = None
    if journey.get("actual_sowing_date"):
        try:
            sd = date.fromisoformat(journey["actual_sowing_date"][:10])
            days_since_sowing = max(0, (datetime.now(timezone.utc).date() - sd).days)
        except ValueError:
            days_since_sowing = None

    return {
        "completed_stages": comp_cnt,
        "applicable_stages": total_app,
        "skipped_stages": len(stages) - total_app,
        "progress_pct": pct,
        "current_stage_key": current_stage["stage_key"] if current_stage else None,
        "current_stage_title": current_stage["title"] if current_stage else None,
        "days_since_sowing": days_since_sowing,
        "calculation_explanation": (
            f"{comp_cnt} of {total_app} applicable lifecycle stages completed "
            f"({len(stages) - total_app} marked not applicable)."
        ),
    }
