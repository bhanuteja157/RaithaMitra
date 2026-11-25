"""
AD-28: Transparent Rental Pricing Engine.
Supports hourly, daily, per_acre, per_hectare, and fixed pricing models
with explicit itemized breakdown and zero hidden charges.
"""
from __future__ import annotations

import math
from typing import Any, Dict

from backend.app.features.equipment.compatibility import ACRE_TO_HA


def calculate_rental_cost(
    *,
    rental_rate_inr: float,
    rate_unit: str,
    duration_hours: float,
    farm_area_acres: float,
    operator_available: bool,
    include_operator: bool,
    operator_charge_inr: float,
    fuel_included: bool,
    fuel_charge_inr: float,
    delivery_charge_inr: float,
    setup_charge_inr: float,
    other_charges_inr: float = 0.0,
) -> Dict[str, Any]:
    rate = max(0.0, float(rental_rate_inr))
    hours = max(0.0, float(duration_hours))
    acres = max(0.0, float(farm_area_acres))
    hectares = acres * ACRE_TO_HA

    if rate_unit == "hourly":
        base_rental = rate * hours
    elif rate_unit == "daily":
        days = max(1, math.ceil(hours / 8.0))
        base_rental = rate * days
    elif rate_unit == "per_acre":
        base_rental = rate * acres
    elif rate_unit == "per_hectare":
        base_rental = rate * hectares
    else:  # fixed
        base_rental = rate

    op_fee = float(operator_charge_inr) if (operator_available and include_operator) else 0.0
    fuel_fee = 0.0 if fuel_included else float(fuel_charge_inr)
    delivery_fee = float(delivery_charge_inr)
    setup_fee = float(setup_charge_inr)
    other_fee = float(other_charges_inr)

    base_rental = round(base_rental, 2)
    op_fee = round(op_fee, 2)
    fuel_fee = round(fuel_fee, 2)
    delivery_fee = round(delivery_fee, 2)
    setup_fee = round(setup_fee, 2)
    other_fee = round(other_fee, 2)
    total = round(base_rental + op_fee + fuel_fee + delivery_fee + setup_fee + other_fee, 2)

    return {
        "rate_unit": rate_unit,
        "rental_rate_inr": rate,
        "duration_hours": hours,
        "farm_area_acres": acres,
        "base_rental_inr": base_rental,
        "operator_charge_inr": op_fee,
        "fuel_charge_inr": fuel_fee,
        "delivery_charge_inr": delivery_fee,
        "setup_charge_inr": setup_fee,
        "other_charges_inr": other_fee,
        "total_cost_inr": total,
    }
