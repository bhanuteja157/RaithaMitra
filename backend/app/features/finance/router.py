"""
AD-24: Farm Financial Intelligence & Transaction Ledger FastAPI Router.
Provides authenticated, farm-isolated endpoints for financial summary,
transaction ledger CRUD, cross-module synchronization, order payment settlement,
and safe CSV statement export.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Header, HTTPException, Query, Response, status
from pydantic import BaseModel, Field

from backend.app.db.database import get_db_connection
from backend.app.features.finance.service import (
    EXPENSE_CATEGORIES,
    INCOME_CATEGORIES,
    VALID_STATUSES,
    compute_financial_summary,
    export_transactions_csv,
    resolve_authenticated_farmer,
    sync_farm_financials,
    verify_farm_ownership,
)

router = APIRouter(prefix="/finance", tags=["Financial Intelligence (AD-24)"])


class TransactionCreate(BaseModel):
    farm_id: str
    tx_type: Literal["income", "expense"]
    category: str = Field(..., min_length=2, max_length=64)
    amount_inr: float = Field(..., gt=0, description="Positive transaction amount in INR")
    tx_date: str = Field(..., description="YYYY-MM-DD")
    description: str = Field(..., min_length=2, max_length=300)
    crop_season_id: Optional[str] = None
    source_module: str = Field(default="Farm Management")
    related_id: Optional[str] = None
    status: Literal["estimated", "committed", "recorded", "settled"] = "recorded"
    payment_reference: Optional[str] = Field(default=None, max_length=120)


class TransactionUpdate(BaseModel):
    category: Optional[str] = Field(default=None, min_length=2, max_length=64)
    amount_inr: Optional[float] = Field(default=None, gt=0)
    tx_date: Optional[str] = None
    description: Optional[str] = Field(default=None, min_length=2, max_length=300)
    status: Optional[Literal["estimated", "committed", "recorded", "settled", "cancelled"]] = None
    payment_reference: Optional[str] = Field(default=None, max_length=120)


class OrderPaymentCreate(BaseModel):
    farm_id: str
    amount_inr: float = Field(..., gt=0)
    tx_date: Optional[str] = None
    payment_reference: Optional[str] = Field(default=None, max_length=120)
    notes: Optional[str] = Field(default=None, max_length=250)


@router.get("/summary")
def get_finance_summary(
    farm_id: str = Query(...),
    estimated_cultivation_inr: float = Query(0.0, ge=0),
    sync: bool = Query(True),
    authorization: Optional[str] = Header(None),
):
    auth = resolve_authenticated_farmer(authorization)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = verify_farm_ownership(cursor, farm_id, auth["user_id"], auth["role"])
        if sync:
            sync_farm_financials(cursor, farm["farmer_id"], farm_id)
            conn.commit()
        return compute_financial_summary(
            cursor,
            farm["farmer_id"],
            farm,
            estimated_cultivation_inr=estimated_cultivation_inr,
        )
    finally:
        conn.close()


@router.post("/sync")
def trigger_financial_sync(
    farm_id: str = Query(...),
    authorization: Optional[str] = Header(None),
):
    auth = resolve_authenticated_farmer(authorization)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = verify_farm_ownership(cursor, farm_id, auth["user_id"], auth["role"])
        counts = sync_farm_financials(cursor, farm["farmer_id"], farm_id)
        conn.commit()
        return {"status": "synced", **counts}
    finally:
        conn.close()


@router.get("/budget")
def get_budget_analysis(
    farm_id: str = Query(...),
    authorization: Optional[str] = Header(None),
):
    auth = resolve_authenticated_farmer(authorization)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = verify_farm_ownership(cursor, farm_id, auth["user_id"], auth["role"])
        summary = compute_financial_summary(cursor, farm["farmer_id"], farm)
        allocated = summary["allocated_budget_inr"]
        utilized = summary["total_cost_inr"]
        utilization_pct = round((utilized / allocated) * 100.0, 2) if allocated > 0 else 0.0
        return {
            "farm_id": farm_id,
            "allocated_budget_inr": allocated,
            "actual_recorded_expenses_inr": summary["actual_recorded_expenses_inr"],
            "committed_expenses_inr": summary["committed_expenses_inr"],
            "total_utilized_inr": utilized,
            "remaining_budget_inr": summary["remaining_budget_inr"],
            "utilization_pct": utilization_pct,
            "expense_breakdown": summary["expense_breakdown"],
        }
    finally:
        conn.close()


@router.get("/transactions")
def list_transactions(
    farm_id: str = Query(...),
    tx_type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    tx_status: Optional[str] = Query(None, alias="status"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    auth = resolve_authenticated_farmer(authorization)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = verify_farm_ownership(cursor, farm_id, auth["user_id"], auth["role"])
        query = "SELECT * FROM financial_transactions WHERE user_id = ? AND farm_id = ?"
        params: list = [farm["farmer_id"], farm_id]

        if tx_type in ("income", "expense"):
            query += " AND tx_type = ?"
            params.append(tx_type)
        if category and category != "all":
            query += " AND category = ?"
            params.append(category)
        if tx_status and tx_status != "all":
            query += " AND status = ?"
            params.append(tx_status)
        if start_date:
            query += " AND tx_date >= ?"
            params.append(start_date[:10])
        if end_date:
            query += " AND tx_date <= ?"
            params.append(end_date[:10])
        if search:
            query += " AND (LOWER(description) LIKE ? OR LOWER(category) LIKE ? OR LOWER(COALESCE(payment_reference, '')) LIKE ?)"
            q_like = f"%{search.strip().lower()}%"
            params.extend([q_like, q_like, q_like])

        query += " ORDER BY tx_date DESC, created_at DESC"
        rows = cursor.execute(query, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.post("/transactions", status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    authorization: Optional[str] = Header(None),
):
    auth = resolve_authenticated_farmer(authorization)
    allowed_cats = INCOME_CATEGORIES if payload.tx_type == "income" else EXPENSE_CATEGORIES
    clean_cat = payload.category.strip().lower()
    if clean_cat not in allowed_cats:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {payload.tx_type} category '{payload.category}'.",
        )

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = verify_farm_ownership(cursor, payload.farm_id, auth["user_id"], auth["role"])
        now = datetime.now(timezone.utc).isoformat()
        tx_id = f"tx_{uuid.uuid4().hex[:10]}"
        season_id = payload.crop_season_id or f"{farm.get('primary_crop', 'Crop')}-current"

        cursor.execute(
            """
            INSERT INTO financial_transactions (
                id, user_id, farm_id, crop_season_id, category, tx_type, amount_inr,
                tx_date, description, source_module, related_id, status, provenance,
                payment_reference, sync_key, is_manual, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual_farmer_entry', ?, NULL, 1, ?, ?)
            """,
            (
                tx_id,
                farm["farmer_id"],
                payload.farm_id,
                season_id,
                clean_cat,
                payload.tx_type,
                round(float(payload.amount_inr), 2),
                payload.tx_date[:10],
                payload.description.strip(),
                payload.source_module.strip(),
                payload.related_id,
                payload.status,
                payload.payment_reference,
                now,
                now,
            ),
        )
        conn.commit()
        created = cursor.execute(
            "SELECT * FROM financial_transactions WHERE id = ?", (tx_id,)
        ).fetchone()
        return dict(created)
    finally:
        conn.close()


@router.patch("/transactions/{tx_id}")
def update_transaction(
    tx_id: str,
    payload: TransactionUpdate,
    authorization: Optional[str] = Header(None),
):
    auth = resolve_authenticated_farmer(authorization)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        existing = cursor.execute(
            "SELECT * FROM financial_transactions WHERE id = ?", (tx_id,)
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Financial transaction not found.")
        if auth["role"] != "admin" and existing["user_id"] != auth["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: You cannot modify another farmer's financial transaction.",
            )
        if not existing["is_manual"]:
            raise HTTPException(
                status_code=400,
                detail="Synchronized module records cannot be edited manually; update the source job, order, or booking instead.",
            )

        next_cat = existing["category"]
        if payload.category is not None:
            clean_cat = payload.category.strip().lower()
            allowed_cats = INCOME_CATEGORIES if existing["tx_type"] == "income" else EXPENSE_CATEGORIES
            if clean_cat not in allowed_cats:
                raise HTTPException(status_code=400, detail=f"Invalid category '{payload.category}'.")
            next_cat = clean_cat

        next_amt = round(float(payload.amount_inr), 2) if payload.amount_inr is not None else existing["amount_inr"]
        next_date = payload.tx_date[:10] if payload.tx_date else existing["tx_date"]
        next_desc = payload.description.strip() if payload.description else existing["description"]
        next_status = payload.status if payload.status in VALID_STATUSES else existing["status"]
        next_ref = payload.payment_reference if payload.payment_reference is not None else existing["payment_reference"]
        now = datetime.now(timezone.utc).isoformat()

        cursor.execute(
            """
            UPDATE financial_transactions
            SET category = ?, amount_inr = ?, tx_date = ?, description = ?, status = ?, payment_reference = ?, updated_at = ?
            WHERE id = ?
            """,
            (next_cat, next_amt, next_date, next_desc, next_status, next_ref, now, tx_id),
        )
        conn.commit()
        updated = cursor.execute("SELECT * FROM financial_transactions WHERE id = ?", (tx_id,)).fetchone()
        return dict(updated)
    finally:
        conn.close()


@router.post("/orders/{order_id}/payments", status_code=status.HTTP_201_CREATED)
def record_order_payment(
    order_id: str,
    payload: OrderPaymentCreate,
    authorization: Optional[str] = Header(None),
):
    """Manually record full or partial payment received from a buyer against a confirmed purchase order."""
    auth = resolve_authenticated_farmer(authorization)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = verify_farm_ownership(cursor, payload.farm_id, auth["user_id"], auth["role"])
        order = cursor.execute(
            "SELECT * FROM purchase_orders WHERE id = ?", (order_id,)
        ).fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Confirmed purchase order not found.")
        if auth["role"] != "admin" and order["farmer_id"] != auth["user_id"]:
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: Purchase order belongs to another farmer.",
            )
        if order["status"] == "cancelled":
            raise HTTPException(status_code=400, detail="Cannot record payment for a cancelled order.")

        confirmed_total = round(float(order["quantity_kg"]) * float(order["price_per_kg"]), 2)
        paid_row = cursor.execute(
            """
            SELECT COALESCE(SUM(amount_inr), 0) AS paid
            FROM financial_transactions
            WHERE user_id = ? AND farm_id = ? AND related_id = ?
              AND tx_type = 'income' AND status IN ('recorded', 'settled')
            """,
            (farm["farmer_id"], payload.farm_id, order_id),
        ).fetchone()
        already_paid = round(float(paid_row["paid"] or 0.0), 2)
        remaining_due = round(max(0.0, confirmed_total - already_paid), 2)

        if remaining_due <= 0.01:
            raise HTTPException(status_code=400, detail="This purchase order is already fully paid.")
        if round(float(payload.amount_inr), 2) > remaining_due + 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Payment amount (₹{payload.amount_inr:,.2f}) exceeds outstanding balance (₹{remaining_due:,.2f}).",
            )

        now = datetime.now(timezone.utc).isoformat()
        tx_date = (payload.tx_date or now)[:10]
        tx_id = f"tx_{uuid.uuid4().hex[:10]}"
        desc = payload.notes.strip() if payload.notes else f"Buyer payment received for {order['crop_name']} ({order['buyer_name']})"

        cursor.execute(
            """
            INSERT INTO financial_transactions (
                id, user_id, farm_id, crop_season_id, category, tx_type, amount_inr,
                tx_date, description, source_module, related_id, status, provenance,
                payment_reference, sync_key, is_manual, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'produce_sale', 'income', ?, ?, ?, 'Smart Bidding', ?, 'settled', 'manual_buyer_settlement', ?, NULL, 1, ?, ?)
            """,
            (
                tx_id,
                farm["farmer_id"],
                payload.farm_id,
                f"{order['crop_name']}-current",
                round(float(payload.amount_inr), 2),
                tx_date,
                desc,
                order_id,
                payload.payment_reference or f"REC-{order_id[-6:].upper()}",
                now,
                now,
            ),
        )
        conn.commit()
        created = cursor.execute("SELECT * FROM financial_transactions WHERE id = ?", (tx_id,)).fetchone()
        return {
            "transaction": dict(created),
            "order_id": order_id,
            "confirmed_total_inr": confirmed_total,
            "total_received_inr": round(already_paid + float(payload.amount_inr), 2),
            "outstanding_balance_inr": round(max(0.0, remaining_due - float(payload.amount_inr)), 2),
        }
    finally:
        conn.close()


@router.get("/export/csv")
def export_financial_statement_csv(
    farm_id: str = Query(...),
    authorization: Optional[str] = Header(None),
):
    auth = resolve_authenticated_farmer(authorization)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = verify_farm_ownership(cursor, farm_id, auth["user_id"], auth["role"])
        rows = cursor.execute(
            """
            SELECT * FROM financial_transactions
            WHERE user_id = ? AND farm_id = ?
            ORDER BY tx_date DESC, created_at DESC
            """,
            (farm["farmer_id"], farm_id),
        ).fetchall()
        csv_content = export_transactions_csv([dict(r) for r in rows])
        return Response(
            content=csv_content,
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="raithamitra_finance_{farm_id}.csv"'
            },
        )
    finally:
        conn.close()


@router.post("/demo-scenario")
def seed_jury_demo_financial_scenario(
    farm_id: str = Query(...),
    authorization: Optional[str] = Header(None),
):
    """
    Populates the Section 19 Jury Demonstration Scenario using legitimate persistent
    ledger records and purchase orders (idempotent via sync_keys) in local development mode:
      - Seed procurement: ₹10,000
      - Cultivation expenses: ₹25,000
      - Labour expenses: ₹15,000
      - Transportation: ₹5,000
      - Confirmed produce order: 5,000 kg @ ₹20/kg = ₹1,00,000
      - Total Expenses = ₹55,000 | Net Profit = ₹45,000 | ROI = 81.82% | Break-even = ₹11/kg
    """
    env_mode = os.getenv("ENVIRONMENT", "development").strip().lower()
    if env_mode == "production":
        raise HTTPException(status_code=403, detail="Demo scenario seeding is disabled in production.")

    auth = resolve_authenticated_farmer(authorization)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = verify_farm_ownership(cursor, farm_id, auth["user_id"], auth["role"])
        farmer_id = farm["farmer_id"]
        now = datetime.now(timezone.utc).isoformat()
        today = now[:10]
        season_id = f"{farm.get('primary_crop', 'Tomato')}-demo"

        demo_expenses = [
            ("demo_seed", "seed_procurement", 10000.0, "Certified Tomato Hybrid Seed Procurement (Nursery)", "BioIntel & Nursery"),
            ("demo_cult", "fertilizers", 25000.0, "Organic NPK, Drip Fertilizers & Crop Protection", "Farm Management"),
            ("demo_lab", "labour", 15000.0, "Transplantation, Staking & Harvest Labour Wages", "Labour Connect"),
            ("demo_trans", "transport", 5000.0, "Farm-to-APMC Freight Delivery (Tata Ace)", "Transport Connect"),
        ]
        for key_suffix, cat, amt, desc, mod in demo_expenses:
            sync_key = f"ad24_demo:{farmer_id}:{farm_id}:{key_suffix}"
            existing = cursor.execute(
                "SELECT id FROM financial_transactions WHERE sync_key = ?", (sync_key,)
            ).fetchone()
            if not existing:
                cursor.execute(
                    """
                    INSERT INTO financial_transactions (
                        id, user_id, farm_id, crop_season_id, category, tx_type, amount_inr,
                        tx_date, description, source_module, related_id, status, provenance,
                        payment_reference, sync_key, is_manual, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'expense', ?, ?, ?, ?, NULL, 'settled', 'jury_demo_transaction', NULL, ?, 1, ?, ?)
                    """,
                    (f"tx_{uuid.uuid4().hex[:10]}", farmer_id, farm_id, season_id, cat, amt, today, desc, mod, sync_key, now, now),
                )

        # Create legitimate listing, bid, and confirmed purchase order for 5,000 kg @ ₹20/kg = ₹1,00,000
        demo_list_id = f"list_demo_{farm_id}"
        demo_po_id = f"po_demo_{farm_id}"
        existing_po = cursor.execute("SELECT id FROM purchase_orders WHERE id = ?", (demo_po_id,)).fetchone()
        if not existing_po:
            cursor.execute(
                """
                INSERT OR IGNORE INTO bidding_listings (
                    id, farmer_id, farmer_name, farm_id, crop_name, variety, quantity_kg,
                    min_price_per_kg, harvest_date, location, bidding_deadline, status,
                    highest_bid_id, highest_bid_amount, buyer_count, created_at
                ) VALUES (?, ?, ?, ?, 'Tomato', 'Arka Rakshak', 5000.0, 18.0, ?, ?, ?, 'confirmed', ?, 20.0, 1, ?)
                """,
                (demo_list_id, farmer_id, farm.get("farmer_name", "Farmer"), farm_id, today, farm.get("village", "Mandya"), today, f"bid_demo_{farm_id}", now),
            )
            cursor.execute(
                """
                INSERT OR IGNORE INTO bidding_bids (
                    id, listing_id, buyer_id, buyer_name, buyer_phone, bid_per_kg, total_amount, status, created_at
                ) VALUES (?, ?, 'usr_buyer1', 'Bengaluru Fresh Foods Co', '', 20.0, 100000.0, 'accepted', ?)
                """,
                (f"bid_demo_{farm_id}", demo_list_id, now),
            )
            cursor.execute(
                """
                INSERT OR IGNORE INTO purchase_orders (
                    id, listing_id, bid_id, farmer_id, farmer_name, buyer_id, buyer_name, buyer_phone,
                    crop_name, quantity_kg, price_per_kg, total_amount, pickup_location, delivery_location, status, created_at
                ) VALUES (?, ?, ?, ?, ?, 'usr_buyer1', 'Bengaluru Fresh Foods Co', '', 'Tomato', 5000.0, 20.0, 100000.0, ?, 'Yeshwanthpur APMC Yard, Bengaluru', 'fulfilled', ?)
                """,
                (demo_po_id, demo_list_id, f"bid_demo_{farm_id}", farmer_id, farm.get("farmer_name", "Farmer"), farm.get("village", "Mandya"), now),
            )

        conn.commit()
        return compute_financial_summary(cursor, farmer_id, farm)
    finally:
        conn.close()
