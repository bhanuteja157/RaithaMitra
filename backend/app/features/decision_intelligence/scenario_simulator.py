"""
AD-30: Interactive Cross-Module What-If Scenario Simulator.
Recalculates investment, water demand, saleable quantity, profit, ROI,
and break-even price without writing to actual SQLite ledgers.
"""
from __future__ import annotations

from typing import Any, Dict

from backend.app.engines.biophysical import calculate_crop_water_demand
from backend.app.features.decision_intelligence.schemas import ScenarioSimulateRequest
from backend.app.features.equipment.compatibility import ACRE_TO_HA


def simulate_cross_module_scenario(req: ScenarioSimulateRequest) -> Dict[str, Any]:
    area_ha = round(req.farm_area_acres * ACRE_TO_HA, 4)
    total_cultivation_cost = round(
        req.seed_expense_inr + req.labour_expense_inr + req.equipment_expense_inr + req.other_cultivation_inr,
        2,
    )
    total_investment = round(total_cultivation_cost + req.transport_cost_inr + req.storage_cost_inr, 2)
    budget_shortfall = round(max(0.0, total_cultivation_cost - req.cultivation_budget_inr), 2)
    budget_feasible = total_cultivation_cost <= req.cultivation_budget_inr

    # Water demand (~100 day season rough reference at ET0=4.5 mm/day)
    daily_water_mm = calculate_crop_water_demand(req.crop, "Mid-Season", 4.5)
    est_seasonal_water_m3 = round(daily_water_mm * area_ha * 10.0 * 90.0, 1)
    water_feasible = est_seasonal_water_m3 <= req.available_water_m3

    spoilage_frac = max(0.0, min(0.95, req.estimated_spoilage_pct / 100.0))
    saleable_qty_kg = round(req.expected_yield_kg * (1.0 - spoilage_frac), 2)
    gross_revenue = round(saleable_qty_kg * req.market_price_per_kg, 2)
    net_profit = round(gross_revenue - total_investment, 2)
    roi_pct = round((net_profit / total_investment) * 100.0, 2) if total_investment > 0 else 0.0
    break_even_price = round(total_investment / saleable_qty_kg, 2) if saleable_qty_kg > 0 else None

    def _band(label: str, price_mult: float, yield_mult: float) -> Dict[str, Any]:
        s_qty = round(saleable_qty_kg * yield_mult, 2)
        s_rev = round(s_qty * (req.market_price_per_kg * price_mult), 2)
        s_net = round(s_rev - total_investment, 2)
        return {"scenario": label, "saleable_kg": s_qty, "gross_revenue_inr": s_rev, "net_profit_inr": s_net}

    return {
        "is_simulation": True,
        "persisted_to_ledger": False,
        "crop": req.crop,
        "farm_area_acres": req.farm_area_acres,
        "farm_area_ha": area_ha,
        "economics": {
            "total_cultivation_cost_inr": total_cultivation_cost,
            "total_investment_inr": total_investment,
            "allocated_budget_inr": req.cultivation_budget_inr,
            "budget_feasible": budget_feasible,
            "budget_shortfall_inr": budget_shortfall,
            "saleable_quantity_kg": saleable_qty_kg,
            "gross_revenue_inr": gross_revenue,
            "net_profit_inr": net_profit,
            "roi_pct": roi_pct,
            "break_even_price_per_kg": break_even_price,
        },
        "water": {
            "daily_crop_demand_mm": round(daily_water_mm, 2),
            "estimated_seasonal_water_m3": est_seasonal_water_m3,
            "available_water_m3": req.available_water_m3,
            "water_feasible": water_feasible,
        },
        "sensitivity_bands": [
            _band("Pessimistic", 0.85, 0.88),
            _band("Expected", 1.00, 1.00),
            _band("Optimistic", 1.15, 1.10),
        ],
        "disclaimer": "Interactive scenario estimate only; does not modify actual financial, booking, or inventory records.",
    }
