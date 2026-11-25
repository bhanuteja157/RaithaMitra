"""
AD-24: Advanced Farm Financial Intelligence & Economic Optimization Service.
Provides persistent SQLite transaction ledger, idempotent cross-module synchronization
(Labour Connect, Smart Bidding, Transport Connect, BioIntel/Nursery),
scientific profit/ROI/break-even calculations, deterministic recommendations,
and safe CSV export.
"""
from __future__ import annotations

import csv
import io
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.db.database import get_db_connection

EXPENSE_CATEGORIES = {
    "seed_procurement",
    "fertilizers",
    "irrigation",
    "electricity",
    "soil_testing",
    "crop_protection",
    "equipment",
    "fuel",
    "land_preparation",
    "maintenance",
    "labour",
    "transport",
    "cultivation",
    "storage",
    "miscellaneous",
}

INCOME_CATEGORIES = {
    "produce_sale",
    "govt_subsidy",
    "byproduct_sale",
    "other_income",
}

VALID_STATUSES = {"estimated", "committed", "recorded", "settled", "cancelled"}


def resolve_authenticated_farmer(authorization: Optional[str]) -> Dict[str, str]:
    """
    Validate Bearer token against user_sessions and enforce Farmer/Admin role.
    In non-production development mode, allows rm_demo_token_farmer for 1-click demo evaluation,
    while strictly rejecting non-farmer demo tokens (buyer, labour, driver) with HTTP 403.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = authorization.replace("Bearer ", "", 1).strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authorization token.")

    env_mode = os.getenv("ENVIRONMENT", "development").strip().lower()
    if env_mode != "production" and token.startswith("rm_demo_token_"):
        demo_role = token.replace("rm_demo_token_", "", 1).strip()
        if demo_role != "farmer":
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: Financial intelligence is restricted to Farmer accounts.",
            )
        return {"user_id": "usr_farmer", "role": "farmer"}

    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT s.user_id, s.role, u.name
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ?
            """,
            (token,),
        ).fetchone()
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=401, detail="Invalid or expired session token.")
    if row["role"] not in ("farmer", "admin"):
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: Financial intelligence is restricted to Farmer accounts.",
        )
    return {"user_id": row["user_id"], "role": row["role"], "name": row["name"]}


def verify_farm_ownership(cursor, farm_id: str, user_id: str, role: str = "farmer") -> Dict[str, Any]:
    """Ensure the requested farm exists and belongs to the authenticated farmer."""
    farm = cursor.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
    if not farm:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found.")
    if role != "admin" and farm["farmer_id"] != user_id:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: You cannot access financial records for another farmer's farm.",
        )
    return dict(farm)


def _upsert_synced_transaction(
    cursor,
    *,
    user_id: str,
    farm_id: str,
    crop_season_id: Optional[str],
    category: str,
    tx_type: str,
    amount_inr: float,
    tx_date: str,
    description: str,
    source_module: str,
    related_id: str,
    status: str,
    provenance: str,
    sync_key: str,
) -> str:
    now = datetime.now(timezone.utc).isoformat()
    existing = cursor.execute(
        "SELECT id FROM financial_transactions WHERE sync_key = ?",
        (sync_key,),
    ).fetchone()
    if existing:
        cursor.execute(
            """
            UPDATE financial_transactions
            SET amount_inr = ?, status = ?, description = ?, provenance = ?, tx_date = ?, updated_at = ?
            WHERE id = ?
            """,
            (round(float(amount_inr), 2), status, description, provenance, tx_date, now, existing["id"]),
        )
        return existing["id"]

    tx_id = f"tx_{uuid.uuid4().hex[:10]}"
    cursor.execute(
        """
        INSERT INTO financial_transactions (
            id, user_id, farm_id, crop_season_id, category, tx_type, amount_inr,
            tx_date, description, source_module, related_id, status, provenance,
            payment_reference, sync_key, is_manual, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, ?, ?)
        """,
        (
            tx_id,
            user_id,
            farm_id,
            crop_season_id,
            category,
            tx_type,
            round(float(amount_inr), 2),
            tx_date,
            description,
            source_module,
            related_id,
            status,
            provenance,
            sync_key,
            now,
            now,
        ),
    )
    return tx_id


def sync_farm_financials(cursor, user_id: str, farm_id: str) -> Dict[str, int]:
    """
    Idempotently synchronize financial commitments and settled expenses from:
    1. Labour Connect (hired/in-progress -> committed, completed -> settled)
    2. Transport Connect (requested/in-transit -> committed, delivered -> settled)
    Uses unique sync_key values to prevent duplicate entries and double-counting.
    """
    farm = cursor.execute("SELECT primary_crop FROM farms WHERE id = ?", (farm_id,)).fetchone()
    season_label = f"{farm['primary_crop']}-current" if farm else None

    synced_labour = 0
    synced_transport = 0

    # 1. Labour Connect synchronization
    jobs = cursor.execute(
        """
        SELECT * FROM labour_jobs
        WHERE farmer_id = ? AND (farm_id = ? OR farm_id IS NULL)
        """,
        (user_id, farm_id),
    ).fetchall()

    for job in jobs:
        job_id = job["id"]
        sync_key = f"labour_job:{job_id}"
        j_status = (job["status"] or "").lower()
        hired = int(job["hired_workers_count"] or 0)
        wage = float(job["wage_per_day"] or 0.0)
        tx_date = (job["work_date"] or job["created_at"] or "")[:10]

        if j_status == "cancelled":
            existing = cursor.execute(
                "SELECT id FROM financial_transactions WHERE sync_key = ?", (sync_key,)
            ).fetchone()
            if existing:
                cursor.execute(
                    "UPDATE financial_transactions SET status = 'cancelled', updated_at = ? WHERE id = ?",
                    (datetime.now(timezone.utc).isoformat(), existing["id"]),
                )
            continue

        if j_status == "completed":
            earned_row = cursor.execute(
                "SELECT COALESCE(SUM(wages_earned), 0) AS total FROM labour_applications WHERE job_id = ? AND status = 'completed'",
                (job_id,),
            ).fetchone()
            settled_amt = float(earned_row["total"] or 0.0)
            if settled_amt <= 0 and hired > 0:
                settled_amt = wage * hired
            if settled_amt > 0:
                _upsert_synced_transaction(
                    cursor,
                    user_id=user_id,
                    farm_id=farm_id,
                    crop_season_id=season_label,
                    category="labour",
                    tx_type="expense",
                    amount_inr=settled_amt,
                    tx_date=tx_date,
                    description=f"Labour settled: {job['title']} ({max(hired, 1)} worker(s))",
                    source_module="Labour Connect",
                    related_id=job_id,
                    status="settled",
                    provenance="labour_connect_completed",
                    sync_key=sync_key,
                )
                synced_labour += 1
        elif hired > 0:
            committed_amt = wage * hired
            if committed_amt > 0:
                _upsert_synced_transaction(
                    cursor,
                    user_id=user_id,
                    farm_id=farm_id,
                    crop_season_id=season_label,
                    category="labour",
                    tx_type="expense",
                    amount_inr=committed_amt,
                    tx_date=tx_date,
                    description=f"Labour commitment: {job['title']} ({hired} worker(s) hired)",
                    source_module="Labour Connect",
                    related_id=job_id,
                    status="committed",
                    provenance="labour_connect_committed",
                    sync_key=sync_key,
                )
                synced_labour += 1

    # 2. Transport Connect synchronization
    bookings = cursor.execute(
        """
        SELECT tb.*, bl.farm_id AS linked_farm_id
        FROM transport_bookings tb
        LEFT JOIN purchase_orders po ON tb.purchase_order_id = po.id
        LEFT JOIN bidding_listings bl ON po.listing_id = bl.id
        WHERE tb.farmer_id = ? AND (bl.farm_id = ? OR bl.farm_id IS NULL)
        """,
        (user_id, farm_id),
    ).fetchall()

    for tb in bookings:
        tb_id = tb["id"]
        sync_key = f"transport_booking:{tb_id}"
        b_status = (tb["status"] or "").lower()
        fare = float(tb["total_fare"] or 0.0)
        tx_date = (tb["created_at"] or "")[:10]

        if b_status in ("rejected", "cancelled"):
            existing = cursor.execute(
                "SELECT id FROM financial_transactions WHERE sync_key = ?", (sync_key,)
            ).fetchone()
            if existing:
                cursor.execute(
                    "UPDATE financial_transactions SET status = 'cancelled', updated_at = ? WHERE id = ?",
                    (datetime.now(timezone.utc).isoformat(), existing["id"]),
                )
            continue

        if fare <= 0:
            continue

        if b_status == "delivered":
            _upsert_synced_transaction(
                cursor,
                user_id=user_id,
                farm_id=farm_id,
                crop_season_id=season_label,
                category="transport",
                tx_type="expense",
                amount_inr=fare,
                tx_date=tx_date,
                description=f"Transport delivered: {tb['produce_type']} ({tb['weight_kg']} kg via {tb['vehicle_type']})",
                source_module="Transport Connect",
                related_id=tb_id,
                status="settled",
                provenance="transport_delivered",
                sync_key=sync_key,
            )
            synced_transport += 1
        else:
            _upsert_synced_transaction(
                cursor,
                user_id=user_id,
                farm_id=farm_id,
                crop_season_id=season_label,
                category="transport",
                tx_type="expense",
                amount_inr=fare,
                tx_date=tx_date,
                description=f"Transport committed: {tb['produce_type']} ({tb['weight_kg']} kg, {b_status})",
                source_module="Transport Connect",
                related_id=tb_id,
                status="committed",
                provenance="transport_committed",
                sync_key=sync_key,
            )
            synced_transport += 1

    return {"labour_synced": synced_labour, "transport_synced": synced_transport}


def get_confirmed_orders_with_settlements(cursor, user_id: str, farm_id: str) -> List[Dict[str, Any]]:
    """
    Fetch confirmed purchase orders for this farmer & farm and compute
    manually recorded payments received and outstanding balances.
    Never treats a confirmed order as cash already received.
    """
    orders = cursor.execute(
        """
        SELECT po.*, bl.farm_id AS linked_farm_id
        FROM purchase_orders po
        LEFT JOIN bidding_listings bl ON po.listing_id = bl.id
        WHERE po.farmer_id = ?
          AND (bl.farm_id = ? OR bl.farm_id IS NULL)
          AND po.status != 'cancelled'
        ORDER BY po.created_at DESC
        """,
        (user_id, farm_id),
    ).fetchall()

    results: List[Dict[str, Any]] = []
    for o in orders:
        qty = float(o["quantity_kg"] or 0.0)
        unit_price = float(o["price_per_kg"] or 0.0)
        confirmed_val = round(qty * unit_price, 2)

        paid_row = cursor.execute(
            """
            SELECT COALESCE(SUM(amount_inr), 0) AS paid
            FROM financial_transactions
            WHERE user_id = ? AND farm_id = ? AND related_id = ?
              AND tx_type = 'income' AND status IN ('recorded', 'settled')
            """,
            (user_id, farm_id, o["id"]),
        ).fetchone()
        received = round(float(paid_row["paid"] or 0.0), 2)
        outstanding = round(max(0.0, confirmed_val - received), 2)
        if outstanding <= 0.01 and confirmed_val > 0:
            pay_status = "paid"
        elif received > 0:
            pay_status = "partial"
        else:
            pay_status = "unpaid"

        results.append(
            {
                "order_id": o["id"],
                "listing_id": o["listing_id"],
                "crop_name": o["crop_name"],
                "quantity_kg": qty,
                "price_per_kg": unit_price,
                "confirmed_value_inr": confirmed_val,
                "buyer_id": o["buyer_id"],
                "buyer_name": o["buyer_name"],
                "delivery_status": o["status"],
                "payment_status": pay_status,
                "amount_received_inr": received,
                "outstanding_balance_inr": outstanding,
                "created_at": o["created_at"],
            }
        )
    return results


def compute_financial_summary(
    cursor,
    user_id: str,
    farm: Dict[str, Any],
    estimated_cultivation_inr: float = 0.0,
) -> Dict[str, Any]:
    """
    Compute verified farm financial metrics, category breakdowns, cash flow series,
    and deterministic numerical recommendations from persistent SQLite records.
    """
    farm_id = farm["id"]
    allocated_budget = round(float(farm.get("cultivation_budget_inr") or 0.0), 2)

    tx_rows = cursor.execute(
        """
        SELECT * FROM financial_transactions
        WHERE user_id = ? AND farm_id = ? AND status != 'cancelled'
        ORDER BY tx_date ASC, created_at ASC
        """,
        (user_id, farm_id),
    ).fetchall()

    recorded_expenses = 0.0
    committed_expenses = 0.0
    received_sales_income = 0.0
    govt_benefits_received = 0.0
    other_income = 0.0

    expense_by_category: Dict[str, float] = {}
    cashflow_by_date: Dict[str, Dict[str, float]] = {}

    for row in tx_rows:
        amt = float(row["amount_inr"] or 0.0)
        t_type = row["tx_type"]
        status = row["status"]
        cat = row["category"]
        dt = (row["tx_date"] or "")[:10] or "unknown"

        if t_type == "expense":
            if status in ("recorded", "settled"):
                recorded_expenses += amt
                expense_by_category[cat] = round(expense_by_category.get(cat, 0.0) + amt, 2)
                cf = cashflow_by_date.setdefault(dt, {"date": dt, "income": 0.0, "expense": 0.0})
                cf["expense"] = round(cf["expense"] + amt, 2)
            elif status == "committed":
                committed_expenses += amt
                expense_by_category[cat] = round(expense_by_category.get(cat, 0.0) + amt, 2)
        elif t_type == "income" and status in ("recorded", "settled"):
            if cat == "govt_subsidy":
                govt_benefits_received += amt
            elif cat == "produce_sale":
                received_sales_income += amt
                cf = cashflow_by_date.setdefault(dt, {"date": dt, "income": 0.0, "expense": 0.0})
                cf["income"] = round(cf["income"] + amt, 2)
            else:
                other_income += amt
                cf = cashflow_by_date.setdefault(dt, {"date": dt, "income": 0.0, "expense": 0.0})
                cf["income"] = round(cf["income"] + amt, 2)

    recorded_expenses = round(recorded_expenses, 2)
    committed_expenses = round(committed_expenses, 2)
    total_cost = round(recorded_expenses + committed_expenses, 2)
    remaining_budget = round(allocated_budget - recorded_expenses - committed_expenses, 2)

    orders = get_confirmed_orders_with_settlements(cursor, user_id, farm_id)
    confirmed_sales_value = round(sum(o["confirmed_value_inr"] for o in orders), 2)
    confirmed_qty_kg = round(sum(o["quantity_kg"] for o in orders), 2)
    outstanding_payments = round(sum(o["outstanding_balance_inr"] for o in orders), 2)

    received_payments_total = round(received_sales_income + other_income, 2)

    # Profit & ROI formulas
    realized_net_profit = round(received_payments_total - recorded_expenses, 2)
    expected_revenue = confirmed_sales_value
    estimated_net_profit = round(expected_revenue - total_cost, 2)

    realized_roi_pct = round((realized_net_profit / recorded_expenses) * 100.0, 2) if recorded_expenses > 0 else 0.0
    projected_roi_pct = round((estimated_net_profit / total_cost) * 100.0, 2) if total_cost > 0 else 0.0
    break_even_price = round(total_cost / confirmed_qty_kg, 2) if confirmed_qty_kg > 0 else None

    # Deterministic Financial Recommendations with numerical reasoning
    recommendations: List[Dict[str, str]] = []
    if allocated_budget > 0 and remaining_budget < 0:
        overrun = abs(remaining_budget)
        recommendations.append(
            {
                "severity": "warning",
                "title": "Allocated Budget Exceeded",
                "detail": (
                    f"Recorded + committed expenses (₹{total_cost:,.0f}) exceed your allocated "
                    f"budget (₹{allocated_budget:,.0f}) by ₹{overrun:,.0f}."
                ),
            }
        )
    elif allocated_budget > 0 and total_cost > 0:
        util_pct = round((total_cost / allocated_budget) * 100.0, 1)
        recommendations.append(
            {
                "severity": "info",
                "title": "Budget Utilization Status",
                "detail": (
                    f"You have utilized {util_pct}% (₹{total_cost:,.0f}) of your ₹{allocated_budget:,.0f} "
                    f"budget, leaving ₹{remaining_budget:,.0f} remaining."
                ),
            }
        )

    if outstanding_payments > 0:
        recommendations.append(
            {
                "severity": "warning",
                "title": "Outstanding Buyer Payments Pending",
                "detail": (
                    f"₹{outstanding_payments:,.0f} remains unpaid across confirmed purchase orders "
                    f"(₹{confirmed_sales_value:,.0f} confirmed vs ₹{received_payments_total:,.0f} received)."
                ),
            }
        )

    labour_amt = expense_by_category.get("labour", 0.0)
    if total_cost > 0 and (labour_amt / total_cost) > 0.35:
        pct = round((labour_amt / total_cost) * 100.0, 1)
        recommendations.append(
            {
                "severity": "info",
                "title": "High Labour Cost Share",
                "detail": (
                    f"Labour expenses (₹{labour_amt:,.0f}) account for {pct}% of total costs "
                    f"(₹{total_cost:,.0f}). Consider pooled harvesting shifts to reduce wage variance."
                ),
            }
        )

    transport_amt = expense_by_category.get("transport", 0.0)
    if total_cost > 0 and (transport_amt / total_cost) > 0.20:
        pct = round((transport_amt / total_cost) * 100.0, 1)
        recommendations.append(
            {
                "severity": "info",
                "title": "Transport Optimization Opportunity",
                "detail": (
                    f"Transportation charges (₹{transport_amt:,.0f}) represent {pct}% of total costs. "
                    f"Use Transport Connect shared load pooling to save freight cost per trip."
                ),
            }
        )

    if break_even_price is not None and confirmed_qty_kg > 0:
        avg_sell_price = round(confirmed_sales_value / confirmed_qty_kg, 2)
        if avg_sell_price < break_even_price:
            recommendations.append(
                {
                    "severity": "warning",
                    "title": "Selling Price Below Break-Even",
                    "detail": (
                        f"Average selling price (₹{avg_sell_price}/kg) is below break-even "
                        f"(₹{break_even_price}/kg) on {confirmed_qty_kg:,.0f} kg."
                    ),
                }
            )
        else:
            margin = round(avg_sell_price - break_even_price, 2)
            recommendations.append(
                {
                    "severity": "positive",
                    "title": "Profitable Selling Margin Above Break-Even",
                    "detail": (
                        f"Confirmed selling price (₹{avg_sell_price}/kg) exceeds break-even "
                        f"(₹{break_even_price}/kg) by ₹{margin}/kg across {confirmed_qty_kg:,.0f} kg."
                    ),
                }
            )

    if not recommendations:
        recommendations.append(
            {
                "severity": "info",
                "title": "Record Farm Transactions to Unlock Insights",
                "detail": "Add manual cultivation expenses or sync Labour, Bidding, and Transport records to compute live ROI and break-even metrics.",
            }
        )

    category_breakdown = [
        {"category": k, "amount_inr": v}
        for k, v in sorted(expense_by_category.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "farm_id": farm_id,
        "farm_name": farm.get("farm_name"),
        "primary_crop": farm.get("primary_crop"),
        "land_area_ha": float(farm.get("land_area_ha") or 0.0),
        "allocated_budget_inr": allocated_budget,
        "estimated_cultivation_investment_inr": round(float(estimated_cultivation_inr), 2),
        "actual_recorded_expenses_inr": recorded_expenses,
        "committed_expenses_inr": committed_expenses,
        "total_cost_inr": total_cost,
        "remaining_budget_inr": remaining_budget,
        "expected_revenue_inr": expected_revenue,
        "confirmed_sales_value_inr": confirmed_sales_value,
        "confirmed_quantity_kg": confirmed_qty_kg,
        "received_payments_inr": received_payments_total,
        "outstanding_payments_inr": outstanding_payments,
        "govt_benefits_received_inr": round(govt_benefits_received, 2),
        "estimated_net_profit_inr": estimated_net_profit,
        "realized_net_profit_inr": realized_net_profit,
        "realized_roi_pct": realized_roi_pct,
        "projected_roi_pct": projected_roi_pct,
        "break_even_price_per_kg": break_even_price,
        "expense_breakdown": category_breakdown,
        "cashflow_series": list(cashflow_by_date.values()),
        "confirmed_orders": orders,
        "recommendations": recommendations,
    }


def export_transactions_csv(rows: List[Dict[str, Any]]) -> str:
    """Export ledger rows safely, neutralizing spreadsheet formula injection."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "Transaction ID",
            "Date",
            "Type",
            "Category",
            "Amount (INR)",
            "Status",
            "Source Module",
            "Related ID",
            "Description",
            "Provenance",
            "Payment Reference",
        ]
    )

    def _safe(val: Any) -> str:
        s = "" if val is None else str(val)
        if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
            return "'" + s
        return s

    for r in rows:
        writer.writerow(
            [
                _safe(r.get("id")),
                _safe(r.get("tx_date")),
                _safe(r.get("tx_type")),
                _safe(r.get("category")),
                r.get("amount_inr", 0.0),
                _safe(r.get("status")),
                _safe(r.get("source_module")),
                _safe(r.get("related_id")),
                _safe(r.get("description")),
                _safe(r.get("provenance")),
                _safe(r.get("payment_reference")),
            ]
        )
    return buf.getvalue()
