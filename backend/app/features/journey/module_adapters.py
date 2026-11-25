"""
AD-32: Cross-Module Ownership Verification & Financial Aggregation Adapters.
Verifies strict user/farm ownership before linking any existing module record
and aggregates verified financial transactions without confusing confirmed orders with received cash.
"""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import HTTPException

from backend.app.features.finance.service import compute_financial_summary


def verify_and_describe_linked_record(
    cursor,
    *,
    user_id: str,
    role: str,
    source_module: str,
    record_id: str,
) -> str:
    table_map = {
        "post_harvest_harvest": ("harvest_records", "farmer_id", "crop"),
        "post_harvest_lot": ("post_harvest_lots", "farmer_id", "crop"),
        "post_harvest_storage": ("post_harvest_storage_records", "farmer_id", "facility_name"),
        "equipment": ("equipment_bookings", "renter_user_id", "operation_type"),
        "labour": ("labour_jobs", "farmer_id", "status"),
        "bidding_listing": ("bidding_listings", "farmer_id", "crop_name"),
        "bidding_order": ("purchase_orders", "farmer_id", "status"),
        "transport_booking": ("transport_bookings", "farmer_id", "produce_type"),
        "finance_transaction": ("financial_transactions", "user_id", "description"),
    }
    if source_module not in table_map:
        raise HTTPException(status_code=400, detail=f"Unsupported source module: {source_module}")

    tbl, owner_col, label_col = table_map[source_module]
    row = cursor.execute(f"SELECT * FROM {tbl} WHERE id = ?", (record_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Record '{record_id}' not found in {source_module}.")
    if role != "admin" and row[owner_col] != user_id:
        raise HTTPException(
            status_code=403,
            detail=f"Unauthorized: Record '{record_id}' in {source_module} belongs to another account.",
        )
    return f"{source_module}: {row[label_col]} ({record_id})"


def build_journey_financial_overview(
    cursor,
    *,
    user_id: str,
    farm_row: Dict[str, Any],
    journey: Dict[str, Any],
    activities: List[Dict[str, Any]],
) -> Dict[str, Any]:
    farm_fin = compute_financial_summary(cursor, user_id, farm_row)
    activity_cost = round(sum(float(a.get("cost_inr") or 0.0) for a in activities), 2)

    return {
        "cultivation_budget_inr": float(journey["cultivation_budget_inr"]),
        "recorded_journey_activity_costs_inr": activity_cost,
        "farm_ledger_summary": {
            "actual_recorded_expenses_inr": farm_fin["actual_recorded_expenses_inr"],
            "committed_expenses_inr": farm_fin["committed_expenses_inr"],
            "confirmed_sales_value_inr": farm_fin["confirmed_sales_value_inr"],
            "received_payments_inr": farm_fin["received_payments_inr"],
            "outstanding_payments_inr": farm_fin["outstanding_payments_inr"],
            "realized_net_profit_inr": farm_fin["realized_net_profit_inr"],
            "estimated_net_profit_inr": farm_fin["estimated_net_profit_inr"],
            "break_even_price_per_kg": farm_fin["break_even_price_per_kg"],
        },
        "separation_notice": (
            "Confirmed sales and operational completions are tracked separately from verified received cash payments."
        ),
    }
