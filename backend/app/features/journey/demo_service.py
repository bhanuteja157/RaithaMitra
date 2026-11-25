"""
AD-32: Isolated Jury Demonstration Journey Service.
Generates all numerical outputs dynamically via AD-27, AD-28, and AD-29 engines
and keeps demonstration journeys strictly isolated (is_demonstration = 1).
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from backend.app.db.database import get_db_connection
from backend.app.features.equipment.optimizer import optimize_shared_equipment
from backend.app.features.equipment.schemas import SharedFarmerParticipant, SharedOptimizationRequest
from backend.app.features.journey.stage_registry import NINE_STAGES
from backend.app.features.market_intelligence.market_optimizer import compare_markets
from backend.app.features.market_intelligence.schemas import MarketCandidateInput, MarketComparisonRequest
from backend.app.features.post_harvest.economic_optimizer import evaluate_sell_vs_store


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_demo_journey(user_id: str, farm_id: str = "farm_001") -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM crop_journeys WHERE farmer_id = ? AND is_demonstration = 1 LIMIT 1",
            (user_id,),
        ).fetchone()
        if existing:
            return {"already_exists": True, "journey_id": existing["id"], "calculations": _run_demo_calculations()}

        jrn_id = f"jrn_demo_{uuid.uuid4().hex[:8]}"
        seed_plan = {
            "crop": "Tomato",
            "variety": "Arka Rakshak (ICAR-IIHR)",
            "seed_required_kg": 0.3,
            "estimated_total_cost_inr": 38000.0,
            "cultivation_budget_inr": 50000.0,
            "is_demonstration": True,
        }
        conn.execute(
            """
            INSERT INTO crop_journeys (
                id, farmer_id, farm_id, crop_name, crop_variety, season,
                cultivated_area_acres, cultivation_budget_inr, planned_sowing_date,
                actual_sowing_date, expected_harvest_date, status, is_demonstration,
                seed_plan_json, created_at, updated_at
            ) VALUES (?, ?, ?, 'Tomato', 'Arka Rakshak (ICAR-IIHR)', 'Demo Season 2026', 2.0, 50000.0, '2026-09-01', '2026-09-02', '2026-11-26', 'active', 1, ?, ?, ?)
            """,
            (jrn_id, user_id, farm_id, json.dumps(seed_plan), now_iso, now_iso),
        )
        for st in NINE_STAGES:
            st_status = "completed" if st["order"] <= 5 else ("in_progress" if st["order"] in (6, 7) else "not_started")
            conn.execute(
                """
                INSERT INTO crop_journey_stages (
                    id, journey_id, stage_key, stage_order, title, status, completed_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"jst_{uuid.uuid4().hex[:10]}",
                    jrn_id,
                    st["stage_key"],
                    st["order"],
                    st["title"],
                    st_status,
                    now_iso if st_status == "completed" else None,
                    now_iso,
                ),
            )
        conn.commit()
        return {"already_exists": False, "journey_id": jrn_id, "calculations": _run_demo_calculations()}
    finally:
        conn.close()


def reset_demo_journeys(user_id: str) -> Dict[str, int]:
    conn = get_db_connection()
    try:
        cur = conn.execute(
            "DELETE FROM crop_journeys WHERE farmer_id = ? AND is_demonstration = 1",
            (user_id,),
        )
        conn.commit()
        return {"deleted_demo_journeys": cur.rowcount}
    finally:
        conn.close()


def _run_demo_calculations() -> Dict[str, Any]:
    market_cmp = compare_markets(
        MarketComparisonRequest(
            commodity="Tomato",
            available_quantity_kg=2000,
            markets=[
                MarketCandidateInput(market_name="Market A (Demo)", selling_price_per_kg=25, transport_cost_inr=8000),
                MarketCandidateInput(market_name="Market B (Demo)", selling_price_per_kg=23, transport_cost_inr=2000),
            ],
        )
    )
    storage_cmp = evaluate_sell_vs_store(
        commodity="Tomato",
        available_quantity_kg=2000,
        current_price_per_kg=25,
        immediate_transport_cost_inr=3000,
        storage_duration_days=5,
        expected_future_price_per_kg=30,
        estimated_loss_pct=8,
        storage_charges_inr=4000,
        future_transport_cost_inr=3000,
        run_monte_carlo=False,
    )
    shared_eq = optimize_shared_equipment(
        requester_user_id="usr_farmer",
        payload=SharedOptimizationRequest(
            operation_type="Land Preparation",
            target_date="2026-12-01",
            hourly_rate_inr=800,
            individual_delivery_charge_inr=1200,
            shared_delivery_charge_inr=1500,
            setup_minutes_between_farms=0,
            participants=[
                SharedFarmerParticipant(farmer_label="Farmer A", area_acres=2, required_hours=2, consented=True),
                SharedFarmerParticipant(farmer_label="Farmer B", area_acres=3, required_hours=3, consented=True),
                SharedFarmerParticipant(farmer_label="Farmer C", area_acres=1, required_hours=1, consented=True),
            ],
        ),
        persist=False,
    )
    return {
        "market_comparison": market_cmp,
        "sell_vs_store": storage_cmp,
        "shared_machinery": shared_eq,
    }
