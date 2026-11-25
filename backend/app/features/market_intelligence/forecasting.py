"""
AD-29: Statistical Market Price Forecasting with Walk-Forward Backtesting.
Evaluates Naive, Moving Average (3), Exponential Smoothing, and Linear Trend,
selects the lowest-RMSE model via chronological validation, and reports uncertainty intervals.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, List

import numpy as np


def _mae_rmse(actuals: List[float], preds: List[float]) -> Dict[str, float]:
    arr_a = np.array(actuals, dtype=float)
    arr_p = np.array(preds, dtype=float)
    err = arr_a - arr_p
    return {
        "mae": round(float(np.mean(np.abs(err))), 3),
        "rmse": round(float(np.sqrt(np.mean(err ** 2))), 3),
    }


def forecast_market_prices(
    observations: List[Dict[str, Any]],
    horizon_days: int = 7,
) -> Dict[str, Any]:
    chronological = sorted(observations, key=lambda x: x["observation_date"])
    min_required = 8 if horizon_days >= 30 else 5

    if len(chronological) < min_required:
        return {
            "available": False,
            "horizon_days": horizon_days,
            "training_observation_count": len(chronological),
            "minimum_required": min_required,
            "reason": (
                f"Insufficient historical observations ({len(chronological)} available, "
                f"at least {min_required} chronological records required for a {horizon_days}-day statistical forecast)."
            ),
            "forecast": [],
            "disclaimer": "Historical observations are never fabricated to force a forecast.",
        }

    prices = [float(o["modal_price_per_kg"]) for o in chronological]
    n = len(prices)

    # Walk-forward chronological backtest starting at index 3
    start_idx = 3
    actuals = prices[start_idx:]
    preds_naive: List[float] = []
    preds_ma3: List[float] = []
    preds_exp: List[float] = []
    preds_lin: List[float] = []

    for t in range(start_idx, n):
        hist = prices[:t]
        preds_naive.append(hist[-1])
        preds_ma3.append(float(np.mean(hist[-3:])))
        # Exponential smoothing alpha=0.4
        s = hist[0]
        for v in hist[1:]:
            s = 0.4 * v + 0.6 * s
        preds_exp.append(s)
        # Linear trend
        x = np.arange(len(hist), dtype=float)
        slope, intercept = np.polyfit(x, np.array(hist, dtype=float), 1)
        preds_lin.append(max(0.5, float(slope * len(hist) + intercept)))

    candidates = [
        ("Naive Last-Observation", preds_naive),
        ("Moving Average (3-Obs)", preds_ma3),
        ("Exponential Smoothing (alpha=0.4)", preds_exp),
        ("Linear Trend (OLS)", preds_lin),
    ]

    scored = []
    for name, p_list in candidates:
        metrics = _mae_rmse(actuals, p_list)
        scored.append({"method": name, **metrics})

    best = min(scored, key=lambda m: m["rmse"])
    best_method = best["method"]
    rmse = max(0.5, best["rmse"])

    # Generate horizon forecast using selected model
    last_date = date.fromisoformat(chronological[-1]["observation_date"])
    forecast_points: List[Dict[str, Any]] = []

    if best_method == "Linear Trend (OLS)":
        x_full = np.arange(n, dtype=float)
        slope, intercept = np.polyfit(x_full, np.array(prices, dtype=float), 1)
        for d in range(1, horizon_days + 1):
            pt = max(1.0, round(float(slope * (n - 1 + d * 0.35) + intercept), 2))
            spread = round(1.96 * rmse * (1.0 + 0.04 * d), 2)
            forecast_points.append({
                "date": (last_date + timedelta(days=d)).isoformat(),
                "predicted_modal_per_kg": pt,
                "lower_bound_per_kg": max(0.5, round(pt - spread, 2)),
                "upper_bound_per_kg": round(pt + spread, 2),
                "is_forecast": True,
            })
    else:
        if best_method == "Naive Last-Observation":
            base_pt = prices[-1]
        elif best_method == "Moving Average (3-Obs)":
            base_pt = float(np.mean(prices[-3:]))
        else:
            s = prices[0]
            for v in prices[1:]:
                s = 0.4 * v + 0.6 * s
            base_pt = s
        base_pt = round(base_pt, 2)
        for d in range(1, horizon_days + 1):
            spread = round(1.96 * rmse * (1.0 + 0.04 * d), 2)
            forecast_points.append({
                "date": (last_date + timedelta(days=d)).isoformat(),
                "predicted_modal_per_kg": base_pt,
                "lower_bound_per_kg": max(0.5, round(base_pt - spread, 2)),
                "upper_bound_per_kg": round(base_pt + spread, 2),
                "is_forecast": True,
            })

    return {
        "available": True,
        "commodity": chronological[-1]["commodity"],
        "horizon_days": horizon_days,
        "selected_method": best_method,
        "training_observation_count": n,
        "historical_date_range": {
            "start": chronological[0]["observation_date"],
            "end": chronological[-1]["observation_date"],
        },
        "validation_metrics": {
            "mae_per_kg": best["mae"],
            "rmse_per_kg": best["rmse"],
            "all_models_evaluated": scored,
        },
        "forecast": forecast_points,
        "limitations": [
            "Lightweight statistical forecast derived strictly from historical modal observations.",
            "Does not account for sudden weather shocks, export bans, or mandi arrivals spikes.",
            "Forecast intervals are statistical uncertainty estimates, NEVER guaranteed future prices.",
        ],
    }
