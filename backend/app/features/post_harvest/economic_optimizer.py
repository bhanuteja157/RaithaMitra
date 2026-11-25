"""
AD-27: Sell-Now vs Store Economic Optimizer & Monte Carlo Risk Simulator.
Implements exact deterministic trade-off formulas, break-even future price,
pessimistic/expected/optimistic scenarios, and reproducible NumPy Monte Carlo trials.
"""
from __future__ import annotations

from typing import Any, Dict, List

import numpy as np


def evaluate_sell_vs_store(
    *,
    commodity: str,
    available_quantity_kg: float,
    current_price_per_kg: float,
    immediate_transport_cost_inr: float = 0.0,
    immediate_other_charges_inr: float = 0.0,
    storage_duration_days: int = 5,
    expected_future_price_per_kg: float = 30.0,
    estimated_loss_pct: float = 8.0,
    storage_charges_inr: float = 0.0,
    future_transport_cost_inr: float = 0.0,
    handling_charges_inr: float = 0.0,
    other_storage_expenses_inr: float = 0.0,
    run_monte_carlo: bool = True,
    num_trials: int = 1000,
    random_seed: int = 42,
) -> Dict[str, Any]:
    qty = float(available_quantity_kg)
    cur_p = float(current_price_per_kg)
    imm_expenses = float(immediate_transport_cost_inr) + float(immediate_other_charges_inr)

    imm_gross_rev = round(qty * cur_p, 2)
    imm_net_return = round(imm_gross_rev - imm_expenses, 2)

    loss_frac = max(0.0, min(0.95, float(estimated_loss_pct) / 100.0))
    future_saleable_qty = round(qty * (1.0 - loss_frac), 2)
    fut_p = float(expected_future_price_per_kg)
    fut_gross_rev = round(future_saleable_qty * fut_p, 2)
    total_store_costs = round(
        float(storage_charges_inr)
        + float(future_transport_cost_inr)
        + float(handling_charges_inr)
        + float(other_storage_expenses_inr),
        2,
    )
    fut_net_return = round(fut_gross_rev - total_store_costs, 2)
    additional_return = round(fut_net_return - imm_net_return, 2)

    # Break-even future selling price required so Future Net Return == Immediate Net Return
    # future_saleable_qty * P_be - total_store_costs = imm_net_return
    break_even_price = (
        round((imm_net_return + total_store_costs) / future_saleable_qty, 2)
        if future_saleable_qty > 0
        else None
    )

    if additional_return > 0:
        recommendation = "store_for_future_sale"
        summary = (
            f"Under current assumptions, storing {qty:,.0f} kg of {commodity} for {storage_duration_days} days "
            f"yields an estimated ₹{additional_return:,.0f} additional net return (break-even future price: ₹{break_even_price}/kg)."
        )
    elif additional_return < 0:
        recommendation = "sell_immediately"
        summary = (
            f"Under current assumptions, selling immediately outperforms storing by ₹{abs(additional_return):,.0f} "
            f"(future price would need to exceed ₹{break_even_price}/kg to break even)."
        )
    else:
        recommendation = "indifferent"
        summary = "Immediate sale and delayed sale yield identical estimated net returns under current assumptions."

    # Pessimistic / Expected / Optimistic Scenarios
    def _scenario(label: str, price_mult: float, loss_delta_pct: float) -> Dict[str, Any]:
        s_loss = max(0.0, min(0.95, (estimated_loss_pct + loss_delta_pct) / 100.0))
        s_qty = round(qty * (1.0 - s_loss), 2)
        s_price = round(fut_p * price_mult, 2)
        s_rev = round(s_qty * s_price, 2)
        s_net = round(s_rev - total_store_costs, 2)
        return {
            "scenario": label,
            "future_price_per_kg": s_price,
            "loss_pct": round(s_loss * 100.0, 1),
            "saleable_quantity_kg": s_qty,
            "future_gross_revenue_inr": s_rev,
            "future_net_return_inr": s_net,
            "net_difference_vs_sell_now_inr": round(s_net - imm_net_return, 2),
        }

    scenarios: List[Dict[str, Any]] = [
        _scenario("Pessimistic", 0.88, +4.0),
        _scenario("Expected", 1.00, 0.0),
        _scenario("Optimistic", 1.12, -3.0),
    ]

    monte_carlo = None
    if run_monte_carlo and future_saleable_qty > 0:
        rng = np.random.default_rng(random_seed)
        n = max(100, min(5000, int(num_trials)))
        sim_price = np.clip(rng.normal(fut_p, max(0.5, fut_p * 0.12), size=n), a_min=1.0, a_max=fut_p * 2.5)
        sim_loss = np.clip(rng.normal(loss_frac, 0.035, size=n), a_min=0.0, a_max=0.90)
        sim_storage_cost = np.clip(
            rng.normal(float(storage_charges_inr) + float(handling_charges_inr) + float(other_storage_expenses_inr), max(50.0, total_store_costs * 0.05), size=n),
            a_min=0.0,
            a_max=total_store_costs * 2.0 + 1000.0,
        )
        sim_transport = np.clip(
            rng.normal(float(future_transport_cost_inr), max(50.0, float(future_transport_cost_inr) * 0.08), size=n),
            a_min=0.0,
            a_max=float(future_transport_cost_inr) * 2.0 + 1000.0,
        )
        sim_net_store = (qty * (1.0 - sim_loss) * sim_price) - (sim_storage_cost + sim_transport)
        sim_diff = sim_net_store - imm_net_return
        prob_outperform = round(float(np.mean(sim_diff > 0.0) * 100.0), 1)
        monte_carlo = {
            "is_stochastic_estimate": True,
            "num_trials": n,
            "random_seed": random_seed,
            "prob_store_outperforms_sell_now_pct": prob_outperform,
            "p10_net_difference_inr": round(float(np.percentile(sim_diff, 10)), 2),
            "p50_net_difference_inr": round(float(np.percentile(sim_diff, 50)), 2),
            "p90_net_difference_inr": round(float(np.percentile(sim_diff, 90)), 2),
            "assumptions": [
                "Monte Carlo simulation varies future selling price (SD ~12%), storage loss (SD 3.5%), storage charges (SD 5%), and transport (SD 8%).",
                "Simulation outputs are probabilistic estimates and do NOT guarantee future market prices or profits.",
            ],
        }

    return {
        "commodity": commodity,
        "available_quantity_kg": qty,
        "storage_duration_days": storage_duration_days,
        "immediate_sale": {
            "price_per_kg": cur_p,
            "gross_revenue_inr": imm_gross_rev,
            "expenses_inr": round(imm_expenses, 2),
            "net_return_inr": imm_net_return,
        },
        "delayed_sale": {
            "expected_future_price_per_kg": fut_p,
            "estimated_loss_pct": round(loss_frac * 100.0, 2),
            "future_saleable_quantity_kg": future_saleable_qty,
            "gross_revenue_inr": fut_gross_rev,
            "total_storage_and_selling_costs_inr": total_store_costs,
            "net_return_inr": fut_net_return,
        },
        "comparison": {
            "additional_return_from_storage_inr": additional_return,
            "break_even_future_price_per_kg": break_even_price,
            "recommendation": recommendation,
            "summary": summary,
        },
        "scenarios": scenarios,
        "monte_carlo": monte_carlo,
        "disclaimer": "All forward prices and spoilage estimates are user-adjustable assumptions, never guaranteed returns.",
    }
