"""
AD-30: Multi-Objective Decision Ranking & Hard Constraint Filter.
Applies feasibility constraints (budget, water, inventory/equipment) before scoring
alternatives under configurable farmer preference profiles.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

PREFERENCE_WEIGHTS: Dict[str, Dict[str, float]] = {
    "balanced": {"profit": 0.30, "cost_saving": 0.25, "water": 0.20, "risk_reduction": 0.25},
    "max_profit": {"profit": 0.55, "cost_saving": 0.15, "water": 0.10, "risk_reduction": 0.20},
    "min_cost": {"profit": 0.15, "cost_saving": 0.50, "water": 0.15, "risk_reduction": 0.20},
    "water_conservation": {"profit": 0.15, "cost_saving": 0.15, "water": 0.50, "risk_reduction": 0.20},
    "low_risk": {"profit": 0.15, "cost_saving": 0.20, "water": 0.15, "risk_reduction": 0.50},
    "sustainable": {"profit": 0.15, "cost_saving": 0.20, "water": 0.35, "risk_reduction": 0.30},
}


def rank_decision_alternatives(
    *,
    candidates: List[Dict[str, Any]],
    preference_profile: str = "balanced",
    remaining_budget_inr: float = 50000.0,
    available_water_m3: float = 10000.0,
    custom_weights: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    weights = PREFERENCE_WEIGHTS.get(preference_profile, PREFERENCE_WEIGHTS["balanced"]).copy()
    if custom_weights:
        for k, v in custom_weights.items():
            if k in weights and v >= 0:
                weights[k] = float(v)
    w_sum = sum(weights.values()) or 1.0
    norm_w = {k: round(v / w_sum, 3) for k, v in weights.items()}

    scored: List[Dict[str, Any]] = []
    for c in candidates:
        est_cost = float(c.get("estimated_cost_inr") or 0.0)
        est_water = float(c.get("estimated_water_m3") or 0.0)
        hard_failures: List[str] = []

        if est_cost > remaining_budget_inr and est_cost > 0:
            shortfall = round(est_cost - remaining_budget_inr, 2)
            hard_failures.append(
                f"Exceeds remaining budget by ₹{shortfall:,.0f} (requires ₹{est_cost:,.0f}, remaining ₹{remaining_budget_inr:,.0f})."
            )
        if est_water > available_water_m3 and est_water > 0:
            hard_failures.append(
                f"Exceeds available water ({est_water:,.0f} m³ > {available_water_m3:,.0f} m³)."
            )
        if c.get("explicit_infeasible_reason"):
            hard_failures.append(str(c["explicit_infeasible_reason"]))

        feasible = len(hard_failures) == 0

        # Heuristic weighted score (0-100) — explicitly NOT a calibrated probability
        profit_sub = min(100.0, max(0.0, float(c.get("profit_score", 50.0))))
        cost_sub = min(100.0, max(0.0, float(c.get("cost_saving_score", 50.0))))
        water_sub = min(100.0, max(0.0, float(c.get("water_score", 50.0))))
        risk_sub = min(100.0, max(0.0, float(c.get("risk_reduction_score", 50.0))))

        raw_score = (
            norm_w["profit"] * profit_sub
            + norm_w["cost_saving"] * cost_sub
            + norm_w["water"] * water_sub
            + norm_w["risk_reduction"] * risk_sub
        )
        final_score = round(raw_score if feasible else raw_score * 0.25, 2)

        scored.append({
            **c,
            "feasible": feasible,
            "hard_constraint_failures": hard_failures,
            "heuristic_ranking_score": final_score,
        })

    # Feasible alternatives always outrank infeasible ones
    ranked = sorted(scored, key=lambda x: (1 if x["feasible"] else 0, x["heuristic_ranking_score"]), reverse=True)
    return {
        "preference_profile": preference_profile,
        "weights_applied": norm_w,
        "ranked_alternatives": ranked,
        "scoring_note": "Heuristic multi-objective ranking score (0–100) with hard constraints applied first; NOT a statistical probability.",
    }
