# backend/app/services/simulation_service.py
"""
P1: Predictive Agricultural & Financial Simulation Service.
Implements deterministic what-if economics and reproducible Monte Carlo stochastic trials
using NumPy with explicit random seed control.
"""
from datetime import datetime, timezone
from typing import Dict, Any, List
import numpy as np
from backend.app.schemas.scientific import FinancialSimulationRequest, ScientificModuleOutput


class SimulationService:
    def run_financial_simulation(self, req: FinancialSimulationRequest) -> ScientificModuleOutput:
        # 1. Deterministic Baseline What-If Calculations
        # Water stress yield multiplier: concave response above/below 100% water availability
        water_factor = min(1.05, (req.water_availability_pct / 100.0) ** 0.65)
        gross_harvest_t = req.farm_area_ha * req.expected_yield_t_per_ha * water_factor
        saleable_harvest_t = round(gross_harvest_t * (1.0 - req.crop_loss_pct / 100.0), 3)
        expected_revenue_inr = round(saleable_harvest_t * req.market_price_inr_per_t, 2)
        total_cost_inr = round(req.cultivation_expenses_inr + req.transportation_expenses_inr, 2)
        deterministic_profit_inr = round(expected_revenue_inr - total_cost_inr, 2)
        break_even_price = round(total_cost_inr / saleable_harvest_t, 2) if saleable_harvest_t > 0 else None

        # 2. Reproducible Monte Carlo Simulation
        rng = np.random.default_rng(req.random_seed)
        n = req.num_trials

        yield_sd = max(0.001, (req.yield_std_pct / 100.0) * req.expected_yield_t_per_ha)
        price_sd = max(0.01, (req.price_std_pct / 100.0) * req.market_price_inr_per_t)

        sim_yield_per_ha = np.clip(
            rng.normal(req.expected_yield_t_per_ha * water_factor, yield_sd, size=n),
            a_min=0.5,
            a_max=req.expected_yield_t_per_ha * 1.6,
        )
        sim_loss_frac = np.clip(
            rng.normal(req.crop_loss_pct / 100.0, 0.03, size=n),
            a_min=0.0,
            a_max=0.95,
        )
        sim_price = np.clip(
            rng.normal(req.market_price_inr_per_t, price_sd, size=n),
            a_min=req.market_price_inr_per_t * 0.25,
            a_max=req.market_price_inr_per_t * 2.5,
        )

        sim_saleable = req.farm_area_ha * sim_yield_per_ha * (1.0 - sim_loss_frac)
        sim_revenue = sim_saleable * sim_price
        sim_profit = sim_revenue - total_cost_inr

        mean_profit = round(float(np.mean(sim_profit)), 2)
        median_profit = round(float(np.percentile(sim_profit, 50)), 2)
        p10_profit = round(float(np.percentile(sim_profit, 10)), 2)
        p90_profit = round(float(np.percentile(sim_profit, 90)), 2)
        var_95_profit = round(float(np.percentile(sim_profit, 5)), 2)
        worst_profit = round(float(np.min(sim_profit)), 2)
        best_profit = round(float(np.max(sim_profit)), 2)
        loss_probability_pct = round(float(np.mean(sim_profit < 0.0) * 100.0), 2)

        # Histogram distribution (8 bins) for chart visualization
        counts, bin_edges = np.histogram(sim_profit, bins=8)
        distribution_bins: List[Dict[str, Any]] = []
        for i in range(len(counts)):
            mid_val = round(float((bin_edges[i] + bin_edges[i + 1]) / 2.0), 0)
            distribution_bins.append({
                "range_label": f"₹{int(bin_edges[i] / 1000)}k–{int(bin_edges[i + 1] / 1000)}k",
                "midpoint_inr": mid_val,
                "trial_count": int(counts[i]),
            })

        actions: List[str] = []
        if loss_probability_pct > 20.0:
            actions.append(
                f"High financial loss risk ({loss_probability_pct}%): Lock in buyer forward contracts or reduce input cost exposure."
            )
        else:
            actions.append(
                f"Favorable risk profile ({loss_probability_pct}% loss probability); break-even selling price is ₹{break_even_price}/tonne."
            )
        if req.water_availability_pct < 80.0:
            actions.append("Water availability below 80% reduces projected yield; prioritize drip irrigation efficiency.")

        return ScientificModuleOutput(
            farm_id=req.farm_id,
            module="predictive_financial_simulation",
            source=f"Deterministic What-If + Monte Carlo Engine ({n} trials, seed={req.random_seed})",
            timestamp=datetime.now(timezone.utc),
            units={
                "saleable_harvest": "tonnes",
                "revenue": "INR",
                "profit": "INR",
                "break_even_price": "INR/tonne",
                "loss_probability": "%",
            },
            data_quality="modeled",
            is_live=False,
            assumptions=[
                "Results are model-based stochastic estimates using user-controlled assumptions, NOT guaranteed market forecasts.",
                f"Clipped normal distributions applied with Yield SD={req.yield_std_pct}% and Price SD={req.price_std_pct}%.",
                f"Water stress yield response modeled via concave exponent (availability={req.water_availability_pct}%).",
                f"Reproducible pseudo-random seed = {req.random_seed}.",
            ],
            uncertainty=f"P10–P90 spread: ₹{p10_profit:,.0f} to ₹{p90_profit:,.0f}",
            results={
                "model_disclaimer": "Model-based estimate, not a guaranteed forecast.",
                "random_seed": req.random_seed,
                "num_trials": n,
                "deterministic": {
                    "water_stress_factor": round(water_factor, 3),
                    "saleable_harvest_tonnes": saleable_harvest_t,
                    "expected_revenue_inr": expected_revenue_inr,
                    "total_cost_inr": total_cost_inr,
                    "net_profit_inr": deterministic_profit_inr,
                    "break_even_price_inr_per_t": break_even_price,
                },
                "monte_carlo": {
                    "expected_mean_profit_inr": mean_profit,
                    "median_p50_profit_inr": median_profit,
                    "p10_downside_profit_inr": p10_profit,
                    "p90_upside_profit_inr": p90_profit,
                    "var_95_profit_inr": var_95_profit,
                    "worst_plausible_profit_inr": worst_profit,
                    "best_plausible_profit_inr": best_profit,
                    "probability_of_loss_pct": loss_probability_pct,
                },
                "distribution_bins": distribution_bins,
            },
            recommended_actions=actions,
        )


simulation_service = SimulationService()
