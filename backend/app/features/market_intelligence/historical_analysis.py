"""
AD-29: Historical Market Price Analysis.
Computes volatility, median, average, min/max, and period-over-period change
from genuine persisted observations without interpolating fake missing dates.
"""
from __future__ import annotations

from typing import Any, Dict, List

import numpy as np


def compute_historical_summary(observations: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not observations:
        return {
            "observation_count": 0,
            "date_range": None,
            "statistics": None,
            "series": [],
            "note": "No historical observations available for the selected filters.",
        }

    chronological = sorted(observations, key=lambda x: x["observation_date"])
    prices = [float(o["modal_price_per_kg"]) for o in chronological]
    first_p = prices[0]
    last_p = prices[-1]
    abs_change = round(last_p - first_p, 2)
    pct_change = round((abs_change / first_p) * 100.0, 2) if first_p > 0 else 0.0

    return {
        "observation_count": len(chronological),
        "date_range": {
            "start": chronological[0]["observation_date"],
            "end": chronological[-1]["observation_date"],
        },
        "statistics": {
            "latest_modal_per_kg": round(last_p, 2),
            "earliest_modal_per_kg": round(first_p, 2),
            "price_change_per_kg": abs_change,
            "pct_change": pct_change,
            "highest_modal_per_kg": round(float(np.max(prices)), 2),
            "lowest_modal_per_kg": round(float(np.min(prices)), 2),
            "mean_modal_per_kg": round(float(np.mean(prices)), 2),
            "median_modal_per_kg": round(float(np.median(prices)), 2),
            "volatility_std_per_kg": round(float(np.std(prices)), 2),
        },
        "series": [
            {
                "date": o["observation_date"],
                "modal_price_per_kg": round(float(o["modal_price_per_kg"]), 2),
                "min_price_per_kg": round(float(o["min_price_per_quintal"]) / 100.0, 2),
                "max_price_per_kg": round(float(o["max_price_per_quintal"]) / 100.0, 2),
                "market": o["market"],
                "source_type": o["source_type"],
            }
            for o in chronological
        ],
    }
