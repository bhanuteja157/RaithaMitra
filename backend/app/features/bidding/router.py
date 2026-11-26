"""
Flagship 2: Smart Bidding (Competitive Agricultural Marketplace).
Implements produce listing, multi-buyer bidding competition, real-time bid ranking,
bidding intelligence metrics, farmer confirmation, and purchase order generation.
"""
from fastapi import APIRouter, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Literal, Optional, List
import json
import math
import uuid
from datetime import datetime, timedelta, timezone

from backend.app.db.database import get_db_connection
from backend.app.features.auth.security import require_roles, resolve_authenticated_user, verify_farm_ownership_row

router = APIRouter(prefix="/bidding", tags=["Smart Bidding & Marketplace"])


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * r * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1 - a))), 1)


def _is_past_deadline(deadline_str: Optional[str]) -> bool:
    if not deadline_str:
        return False
    try:
        dt = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt < datetime.now(timezone.utc)
    except ValueError:
        return False

class ListingCreate(BaseModel):
    farmer_id: str = "usr_farmer"
    farmer_name: str = "Suresh Gowda"
    farm_id: Optional[str] = "farm_001"
    crop_name: str = Field(..., description="Crop, e.g. Tomato, Wheat, Rice")
    variety: Optional[str] = Field(None, description="Cultivar or quality grade")
    quantity_kg: float = Field(..., gt=0, description="Available produce quantity in kg")
    min_price_per_kg: float = Field(..., gt=0, description="Floor / Reserve price in INR/kg")
    harvest_date: str = Field(..., description="YYYY-MM-DD")
    location: str = Field(..., description="Pickup location or farm address")
    bidding_deadline: str = Field(..., description="ISO timestamp or date")

class BidSubmit(BaseModel):
    buyer_id: str
    buyer_name: str
    buyer_phone: Optional[str] = "+91 98450 67890"
    bid_per_kg: float = Field(..., gt=0, description="Offered price per kilogram in INR")

@router.get("/listings")
def list_produce_listings(crop: Optional[str] = None, status_filter: Optional[str] = "active"):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM bidding_listings"
    params = []
    conditions = []
    
    if status_filter and status_filter != "all":
        conditions.append("status = ?")
        params.append(status_filter)
    if crop:
        conditions.append("LOWER(crop_name) LIKE ?")
        params.append(f"%{crop.lower()}%")
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY created_at DESC"
    
    rows = cursor.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("/listings", status_code=status.HTTP_201_CREATED)
def create_produce_listing(listing: ListingCreate, authorization: Optional[str] = Header(None)):
    user = require_roles(
        authorization,
        ["farmer"],
        detail="Unauthorized: Only registered farmers can list produce",
    )
    if user["role"] != "admin" and listing.farmer_id and listing.farmer_id != user["id"]:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: Cannot list produce on behalf of another farmer.",
        )
    actor_id = user["id"]
    actor_name = user.get("name") or listing.farmer_name
    conn = get_db_connection()
    cursor = conn.cursor()
    if listing.farm_id:
        verify_farm_ownership_row(cursor, listing.farm_id, actor_id, user["role"])
    listing_id = f"list_{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    
    cursor.execute("""
    INSERT INTO bidding_listings (
        id, farmer_id, farmer_name, farm_id, crop_name, variety, quantity_kg, min_price_per_kg,
        harvest_date, location, bidding_deadline, status, buyer_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?)
    """, (
        listing_id, actor_id, actor_name, listing.farm_id, listing.crop_name,
        listing.variety, listing.quantity_kg, listing.min_price_per_kg, listing.harvest_date,
        listing.location, listing.bidding_deadline, now
    ))
    conn.commit()
    created = cursor.execute("SELECT * FROM bidding_listings WHERE id = ?", (listing_id,)).fetchone()
    conn.close()
    return dict(created)

@router.get("/listings/{listing_id}")
def get_listing_details(listing_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    listing = cursor.execute("SELECT * FROM bidding_listings WHERE id = ?", (listing_id,)).fetchone()
    if not listing:
        conn.close()
        raise HTTPException(status_code=404, detail="Listing not found")
        
    bids = cursor.execute("""
    SELECT * FROM bidding_bids WHERE listing_id = ? ORDER BY bid_per_kg DESC, created_at ASC
    """, (listing_id,)).fetchall()
    conn.close()
    
    bids_list = [dict(b) for b in bids]
    highest_bid = bids_list[0] if bids_list else None
    
    # Calculate Bidding Intelligence metrics
    min_price = listing["min_price_per_kg"]
    highest_offer = highest_bid["bid_per_kg"] if highest_bid else min_price
    total_sale_value = highest_offer * listing["quantity_kg"]
    expected_baseline_rev = min_price * listing["quantity_kg"]
    premium_gain = total_sale_value - expected_baseline_rev
    
    return {
        **dict(listing),
        "bids": bids_list,
        "intelligence": {
            "highest_eligible_offer": highest_offer,
            "has_bids": len(bids_list) > 0,
            "total_sale_value_inr": total_sale_value,
            "expected_baseline_revenue_inr": expected_baseline_rev,
            "premium_gain_inr": premium_gain,
            "premium_gain_pct": round((premium_gain / expected_baseline_rev) * 100, 1) if expected_baseline_rev > 0 else 0.0,
            "competing_buyers_count": len(set(b["buyer_id"] for b in bids_list)),
            "is_above_reserve": highest_offer >= min_price,
            "highest_bidder": highest_bid["buyer_name"] if highest_bid else None,
            "highest_bid_id": highest_bid["id"] if highest_bid else None,
        }
    }

@router.post("/listings/{listing_id}/bid")
def submit_bid(listing_id: str, bid: BidSubmit, authorization: Optional[str] = Header(None)):
    user = require_roles(
        authorization,
        ["buyer"],
        detail="Unauthorized: Only registered buyers can submit bids",
    )
    if user["role"] != "admin" and bid.buyer_id and bid.buyer_id != user["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized: Cannot submit bids on behalf of another buyer.")
    actor_id = user["id"]
    actor_name = user.get("name") or bid.buyer_name
    conn = get_db_connection()
    cursor = conn.cursor()
    
    listing = cursor.execute("SELECT * FROM bidding_listings WHERE id = ?", (listing_id,)).fetchone()
    if not listing:
        conn.close()
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing["status"] != "active":
        conn.close()
        raise HTTPException(status_code=400, detail="This listing is closed or already confirmed")
    if _is_past_deadline(listing["bidding_deadline"]):
        cursor.execute("UPDATE bidding_listings SET status = 'expired' WHERE id = ?", (listing_id,))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=400, detail="Bidding deadline for this listing has expired.")
        
    if bid.bid_per_kg < listing["min_price_per_kg"]:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Bid must be at least the reserve price of ₹{listing['min_price_per_kg']}/kg")
        
    bid_id = f"bid_{uuid.uuid4().hex[:6]}"
    total_amount = bid.bid_per_kg * listing["quantity_kg"]
    now = datetime.now(timezone.utc).isoformat()
    
    # Insert new bid
    cursor.execute("""
    INSERT INTO bidding_bids (id, listing_id, buyer_id, buyer_name, buyer_phone, bid_per_kg, total_amount, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?)
    """, (bid_id, listing_id, actor_id, actor_name, bid.buyer_phone, bid.bid_per_kg, total_amount, now))
    
    unique_buyers = cursor.execute(
        "SELECT COUNT(DISTINCT buyer_id) FROM bidding_bids WHERE listing_id = ?",
        (listing_id,),
    ).fetchone()[0]

    # Update highest bid and accurate unique buyer count on listing
    cur_highest = listing["highest_bid_amount"] or 0.0
    if bid.bid_per_kg > cur_highest:
        cursor.execute("""
        UPDATE bidding_listings
        SET highest_bid_id = ?, highest_bid_amount = ?, buyer_count = ?
        WHERE id = ?
        """, (bid_id, bid.bid_per_kg, unique_buyers, listing_id))
    else:
        cursor.execute("UPDATE bidding_listings SET buyer_count = ? WHERE id = ?", (unique_buyers, listing_id))
        
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Bid placed successfully", "bid_id": bid_id, "total_value": total_amount}

@router.post("/listings/{listing_id}/confirm")
def confirm_sale(
    listing_id: str,
    farmer_id: Optional[str] = Query(None),
    bid_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    user = require_roles(
        authorization,
        ["farmer"],
        detail="Unauthorized: Only registered farmers can confirm produce sales",
    )
    if user["role"] != "admin" and farmer_id and farmer_id != user["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized: Cannot confirm sales on behalf of another farmer.")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    listing = cursor.execute("SELECT * FROM bidding_listings WHERE id = ?", (listing_id,)).fetchone()
    if not listing:
        conn.close()
        raise HTTPException(status_code=404, detail="Listing not found")
    if user["role"] != "admin" and listing["farmer_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Unauthorized: You can only confirm sales for your own listing.")
    if listing["status"] == "confirmed":
        conn.close()
        raise HTTPException(status_code=400, detail="This sale has already been confirmed. Duplicate confirmation prohibited.")
        
    # Allow farmer to select any eligible bid on this listing, defaulting to highest bid
    if bid_id:
        selected_bid = cursor.execute(
            "SELECT * FROM bidding_bids WHERE id = ? AND listing_id = ?",
            (bid_id, listing_id),
        ).fetchone()
        if not selected_bid:
            conn.close()
            raise HTTPException(status_code=404, detail="Selected bid not found for this listing.")
    else:
        selected_bid = cursor.execute("""
        SELECT * FROM bidding_bids WHERE listing_id = ? ORDER BY bid_per_kg DESC, created_at ASC LIMIT 1
        """, (listing_id,)).fetchone()
    
    if not selected_bid:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot confirm sale: No bids have been placed yet")

    buyer_prof = cursor.execute(
        "SELECT delivery_address, payment_terms FROM buyer_profiles WHERE user_id = ?",
        (selected_bid["buyer_id"],),
    ).fetchone()
    delivery_loc = (
        buyer_prof["delivery_address"]
        if buyer_prof and buyer_prof["delivery_address"]
        else f"{selected_bid['buyer_name']} Designated Yard"
    )
    pay_terms = (
        buyer_prof["payment_terms"]
        if buyer_prof and "payment_terms" in buyer_prof.keys() and buyer_prof["payment_terms"]
        else "Bank Transfer / UPI within 48h"
    )
        
    po_id = f"po_{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Atomic transaction: Update listing -> update bids -> create purchase order
    cursor.execute("UPDATE bidding_listings SET status = 'confirmed' WHERE id = ?", (listing_id,))
    cursor.execute("UPDATE bidding_bids SET status = 'accepted' WHERE id = ?", (selected_bid["id"],))
    cursor.execute("UPDATE bidding_bids SET status = 'outbid' WHERE listing_id = ? AND id != ?", (listing_id, selected_bid["id"]))
    
    cursor.execute("""
    INSERT INTO purchase_orders (
        id, listing_id, bid_id, farmer_id, farmer_name, buyer_id, buyer_name, buyer_phone,
        crop_name, quantity_kg, price_per_kg, total_amount, pickup_location, delivery_location,
        farm_id, payment_terms, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
    """, (
        po_id, listing_id, selected_bid["id"], listing["farmer_id"], listing["farmer_name"],
        selected_bid["buyer_id"], selected_bid["buyer_name"], selected_bid["buyer_phone"],
        listing["crop_name"], listing["quantity_kg"], selected_bid["bid_per_kg"], selected_bid["total_amount"],
        listing["location"], delivery_loc, listing["farm_id"], pay_terms, now
    ))
    
    conn.commit()
    order = cursor.execute("SELECT * FROM purchase_orders WHERE id = ?", (po_id,)).fetchone()
    conn.close()
    
    return {
        "status": "success",
        "message": "Sale confirmed! Purchase order generated. Ready for Transport Connect.",
        "order_id": po_id,
        "order": dict(order)
    }

@router.get("/orders")
def list_purchase_orders(user_id: Optional[str] = None, authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_user(authorization)
    conn = get_db_connection()
    cursor = conn.cursor()
    if user["role"] == "admin":
        if user_id:
            rows = cursor.execute(
                "SELECT * FROM purchase_orders WHERE farmer_id = ? OR buyer_id = ? ORDER BY created_at DESC",
                (user_id, user_id),
            ).fetchall()
        else:
            rows = cursor.execute("SELECT * FROM purchase_orders ORDER BY created_at DESC").fetchall()
    else:
        if user_id and user_id != user["id"]:
            conn.close()
            raise HTTPException(status_code=403, detail="Unauthorized: Cannot view another user's purchase orders.")
        rows = cursor.execute(
            "SELECT * FROM purchase_orders WHERE farmer_id = ? OR buyer_id = ? ORDER BY created_at DESC",
            (user["id"], user["id"]),
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ==============================================================================
# AD-38: REGISTERED BUYER DISCOVERY & DIRECT FARMER-TO-BUYER SELLING
# ==============================================================================

class BuyerProfileUpdate(BaseModel):
    business_name: Optional[str] = Field(None, min_length=2, max_length=120)
    buyer_category: Optional[Literal["wholesaler", "retailer", "supermarket", "food_processor", "fpo", "restaurant", "exporter"]] = None
    district: Optional[str] = Field(None, max_length=80)
    state: Optional[str] = Field(None, max_length=80)
    delivery_address: Optional[str] = Field(None, min_length=3, max_length=240)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    required_commodities: Optional[List[str]] = None
    preferred_varieties: Optional[List[str]] = None
    quality_requirements: Optional[str] = Field(None, max_length=160)
    min_quantity_kg: Optional[float] = Field(None, gt=0)
    max_quantity_kg: Optional[float] = Field(None, gt=0)
    expected_price_min_inr: Optional[float] = Field(None, gt=0)
    expected_price_max_inr: Optional[float] = Field(None, gt=0)
    payment_terms: Optional[str] = Field(None, max_length=160)
    procurement_schedule: Optional[str] = Field(None, max_length=160)


class DirectProposalCreate(BaseModel):
    farm_id: Optional[str] = "farm_001"
    buyer_id: str
    harvest_lot_id: Optional[str] = None
    crop_name: str = Field(..., min_length=2, max_length=80)
    variety: Optional[str] = Field(None, max_length=80)
    quantity_kg: float = Field(..., gt=0)
    proposed_price_per_kg: float = Field(..., gt=0)
    delivery_location: Optional[str] = Field(None, max_length=240)
    payment_terms: Optional[str] = Field(None, max_length=160)
    expires_in_hours: int = Field(72, ge=1, le=336)
    notes: Optional[str] = Field(None, max_length=300)


class DirectProposalRespond(BaseModel):
    action: Literal["accept", "counter", "reject"]
    counter_price_per_kg: Optional[float] = Field(None, gt=0)
    counter_quantity_kg: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = Field(None, max_length=300)


@router.get("/buyers")
def discover_registered_buyers(
    crop: Optional[str] = None,
    district: Optional[str] = None,
    category: Optional[str] = None,
    min_qty: Optional[float] = Query(None, gt=0),
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lon: Optional[float] = Query(None, ge=-180, le=180),
    max_distance_km: Optional[float] = Query(None, gt=0),
):
    """Discover registered buyers without exposing private personal phone/email."""
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT bp.*, u.name AS account_name
            FROM buyer_profiles bp
            JOIN users u ON bp.user_id = u.id
            WHERE COALESCE(bp.is_active, 1) = 1 AND u.role = 'buyer'
            """
        ).fetchall()
    finally:
        conn.close()

    results = []
    for r in rows:
        d = dict(r)
        comms = json.loads(d.get("required_commodities_json") or "[]")
        vars_list = json.loads(d.get("preferred_varieties_json") or "[]")
        if crop and not any(crop.strip().lower() in c.lower() for c in comms):
            continue
        if district and district.strip().lower() not in (d.get("district") or "").lower():
            continue
        if category and category.strip().lower() != (d.get("buyer_category") or "").lower():
            continue
        if min_qty is not None and d.get("max_quantity_kg") is not None and min_qty > float(d["max_quantity_kg"]):
            continue

        dist_km = None
        if lat is not None and lon is not None and d.get("latitude") is not None and d.get("longitude") is not None:
            dist_km = _haversine_km(lat, lon, float(d["latitude"]), float(d["longitude"]))
            if max_distance_km is not None and dist_km > max_distance_km:
                continue

        results.append({
            "buyer_id": d["user_id"],
            "profile_id": d["id"],
            "business_name": d.get("business_name") or d.get("account_name"),
            "buyer_type": d.get("buyer_type") or "business",
            "buyer_category": d.get("buyer_category") or "wholesaler",
            "district": d.get("district") or "Bengaluru Urban",
            "state": d.get("state") or "Karnataka",
            "delivery_address": d.get("delivery_address"),
            "distance_km": dist_km,
            "required_commodities": comms,
            "preferred_varieties": vars_list,
            "quality_requirements": d.get("quality_requirements"),
            "min_quantity_kg": float(d.get("min_quantity_kg") or 100.0),
            "max_quantity_kg": float(d.get("max_quantity_kg") or 10000.0),
            "expected_price_min_inr": d.get("expected_price_min_inr"),
            "expected_price_max_inr": d.get("expected_price_max_inr"),
            "payment_terms": d.get("payment_terms"),
            "procurement_schedule": d.get("procurement_schedule"),
            "verification_status": d.get("verification_status") or "unverified",
        })
    if lat is not None and lon is not None:
        results.sort(key=lambda x: x["distance_km"] if x["distance_km"] is not None else 99999.0)
    return results


@router.put("/buyers/profile")
def update_buyer_procurement_profile(
    payload: BuyerProfileUpdate,
    authorization: Optional[str] = Header(None),
):
    user = require_roles(authorization, ["buyer"], detail="Unauthorized: Only registered buyers can update buyer profiles.")
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        prof = cursor.execute("SELECT * FROM buyer_profiles WHERE user_id = ?", (user["id"],)).fetchone()
        if not prof:
            raise HTTPException(status_code=404, detail="Buyer profile not found.")
        updates = payload.model_dump(exclude_unset=True)
        if "required_commodities" in updates:
            updates["required_commodities_json"] = json.dumps(updates.pop("required_commodities") or [])
        if "preferred_varieties" in updates:
            updates["preferred_varieties_json"] = json.dumps(updates.pop("preferred_varieties") or [])
        if updates:
            cols = ", ".join(f"{k} = ?" for k in updates.keys())
            cursor.execute(f"UPDATE buyer_profiles SET {cols} WHERE user_id = ?", (*updates.values(), user["id"]))
            conn.commit()
        updated = cursor.execute("SELECT * FROM buyer_profiles WHERE user_id = ?", (user["id"],)).fetchone()
        return dict(updated)
    finally:
        conn.close()


@router.post("/direct-proposals", status_code=status.HTTP_201_CREATED)
def create_direct_proposal(
    payload: DirectProposalCreate,
    authorization: Optional[str] = Header(None),
):
    user = require_roles(authorization, ["farmer"], detail="Unauthorized: Only registered farmers can propose direct sales.")
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if payload.farm_id:
            verify_farm_ownership_row(cursor, payload.farm_id, user["id"], user["role"])
        buyer = cursor.execute(
            """
            SELECT u.id, u.name, bp.business_name, bp.delivery_address, bp.payment_terms
            FROM users u
            LEFT JOIN buyer_profiles bp ON u.id = bp.user_id
            WHERE u.id = ? AND u.role = 'buyer'
            """,
            (payload.buyer_id,),
        ).fetchone()
        if not buyer:
            raise HTTPException(status_code=404, detail="Registered buyer not found.")

        if payload.harvest_lot_id:
            lot = cursor.execute(
                "SELECT * FROM post_harvest_inventory WHERE id = ? AND farmer_id = ?",
                (payload.harvest_lot_id, user["id"]),
            ).fetchone()
            if not lot:
                raise HTTPException(status_code=404, detail="Harvest inventory lot not found for your account.")
            if float(payload.quantity_kg) > float(lot["available_quantity_kg"]):
                raise HTTPException(status_code=400, detail="Proposed quantity exceeds available harvest lot inventory.")

        prop_id = f"prop_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(hours=payload.expires_in_hours)).isoformat()
        delivery_loc = payload.delivery_location or buyer["delivery_address"] or "Buyer Designated Yard"
        pay_terms = payload.payment_terms or buyer["payment_terms"] or "Bank Transfer / UPI within 48h"
        buyer_name = buyer["business_name"] or buyer["name"]

        cursor.execute(
            """
            INSERT INTO direct_sale_proposals (
                id, farmer_id, farmer_name, farm_id, buyer_id, buyer_name, harvest_lot_id,
                crop_name, variety, quantity_kg, proposed_price_per_kg, delivery_location,
                payment_terms, status, farmer_confirmed, buyer_confirmed, expires_at, notes,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed', 1, 0, ?, ?, ?, ?)
            """,
            (
                prop_id, user["id"], user.get("name") or "Farmer", payload.farm_id,
                payload.buyer_id, buyer_name, payload.harvest_lot_id, payload.crop_name,
                payload.variety, payload.quantity_kg, payload.proposed_price_per_kg,
                delivery_loc, pay_terms, expires_at, payload.notes, now.isoformat(), now.isoformat(),
            ),
        )
        conn.commit()
        created = cursor.execute("SELECT * FROM direct_sale_proposals WHERE id = ?", (prop_id,)).fetchone()
        return dict(created)
    finally:
        conn.close()


@router.get("/direct-proposals")
def list_direct_proposals(authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_user(authorization)
    conn = get_db_connection()
    try:
        if user["role"] == "admin":
            rows = conn.execute("SELECT * FROM direct_sale_proposals ORDER BY created_at DESC").fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM direct_sale_proposals WHERE farmer_id = ? OR buyer_id = ? ORDER BY created_at DESC",
                (user["id"], user["id"]),
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.post("/direct-proposals/{proposal_id}/respond")
def respond_to_direct_proposal(
    proposal_id: str,
    payload: DirectProposalRespond,
    authorization: Optional[str] = Header(None),
):
    user = require_roles(authorization, ["buyer"], detail="Unauthorized: Only the target buyer can respond to a direct proposal.")
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        prop = cursor.execute("SELECT * FROM direct_sale_proposals WHERE id = ?", (proposal_id,)).fetchone()
        if not prop:
            raise HTTPException(status_code=404, detail="Direct sale proposal not found.")
        if user["role"] != "admin" and prop["buyer_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized: Proposal belongs to another buyer.")
        if prop["status"] in ("confirmed", "rejected", "expired", "cancelled"):
            raise HTTPException(status_code=400, detail=f"Proposal is already '{prop['status']}'.")
        if _is_past_deadline(prop["expires_at"]):
            cursor.execute("UPDATE direct_sale_proposals SET status = 'expired' WHERE id = ?", (proposal_id,))
            conn.commit()
            raise HTTPException(status_code=400, detail="Direct sale proposal has expired.")

        now_iso = datetime.now(timezone.utc).isoformat()
        if payload.action == "reject":
            cursor.execute(
                "UPDATE direct_sale_proposals SET status = 'rejected', buyer_confirmed = 0, notes = COALESCE(?, notes), updated_at = ? WHERE id = ?",
                (payload.notes, now_iso, proposal_id),
            )
        elif payload.action == "counter":
            if payload.counter_price_per_kg is None:
                raise HTTPException(status_code=400, detail="counter_price_per_kg is required for a counteroffer.")
            next_qty = payload.counter_quantity_kg if payload.counter_quantity_kg is not None else prop["quantity_kg"]
            cursor.execute(
                """
                UPDATE direct_sale_proposals
                SET status = 'countered', counter_price_per_kg = ?, quantity_kg = ?,
                    farmer_confirmed = 0, buyer_confirmed = 1, notes = COALESCE(?, notes), updated_at = ?
                WHERE id = ?
                """,
                (payload.counter_price_per_kg, next_qty, payload.notes, now_iso, proposal_id),
            )
        else:  # accept
            cursor.execute(
                """
                UPDATE direct_sale_proposals
                SET status = 'accepted_by_buyer', agreed_price_per_kg = proposed_price_per_kg,
                    buyer_confirmed = 1, notes = COALESCE(?, notes), updated_at = ?
                WHERE id = ?
                """,
                (payload.notes, now_iso, proposal_id),
            )
        conn.commit()
        updated = cursor.execute("SELECT * FROM direct_sale_proposals WHERE id = ?", (proposal_id,)).fetchone()
        return dict(updated)
    finally:
        conn.close()


@router.post("/direct-proposals/{proposal_id}/confirm")
def confirm_direct_proposal(
    proposal_id: str,
    authorization: Optional[str] = Header(None),
):
    """Explicit dual-party confirmation; generates exactly one purchase order once both parties confirm."""
    user = resolve_authenticated_user(authorization)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        prop = cursor.execute("SELECT * FROM direct_sale_proposals WHERE id = ?", (proposal_id,)).fetchone()
        if not prop:
            raise HTTPException(status_code=404, detail="Direct sale proposal not found.")
        if user["role"] != "admin" and user["id"] not in (prop["farmer_id"], prop["buyer_id"]):
            raise HTTPException(status_code=403, detail="Unauthorized: You are not a party to this proposal.")
        if prop["status"] == "confirmed" or prop["purchase_order_id"]:
            raise HTTPException(status_code=400, detail="Purchase order already generated for this proposal.")
        if prop["status"] in ("rejected", "expired", "cancelled"):
            raise HTTPException(status_code=400, detail=f"Cannot confirm a '{prop['status']}' proposal.")
        if _is_past_deadline(prop["expires_at"]):
            cursor.execute("UPDATE direct_sale_proposals SET status = 'expired' WHERE id = ?", (proposal_id,))
            conn.commit()
            raise HTTPException(status_code=400, detail="Direct sale proposal has expired.")

        f_conf = int(prop["farmer_confirmed"] or 0)
        b_conf = int(prop["buyer_confirmed"] or 0)
        if user["id"] == prop["farmer_id"]:
            f_conf = 1
        elif user["id"] == prop["buyer_id"]:
            b_conf = 1

        now_iso = datetime.now(timezone.utc).isoformat()
        agreed_price = float(prop["agreed_price_per_kg"] or prop["counter_price_per_kg"] or prop["proposed_price_per_kg"])

        if not (f_conf == 1 and b_conf == 1):
            cursor.execute(
                "UPDATE direct_sale_proposals SET farmer_confirmed = ?, buyer_confirmed = ?, updated_at = ? WHERE id = ?",
                (f_conf, b_conf, now_iso, proposal_id),
            )
            conn.commit()
            updated = cursor.execute("SELECT * FROM direct_sale_proposals WHERE id = ?", (proposal_id,)).fetchone()
            return {"status": "awaiting_counterparty", "proposal": dict(updated)}

        # Both parties confirmed -> atomically create backing listing/bid + single Purchase Order
        po_id = f"po_{uuid.uuid4().hex[:6]}"
        direct_list_id = f"dlist_{uuid.uuid4().hex[:6]}"
        direct_bid_id = f"dbid_{uuid.uuid4().hex[:6]}"
        total_amount = round(float(prop["quantity_kg"]) * agreed_price, 2)
        farm_row = cursor.execute("SELECT village, district FROM farms WHERE id = ?", (prop["farm_id"],)).fetchone() if prop["farm_id"] else None
        pickup_loc = f"{farm_row['village']}, {farm_row['district']}" if farm_row else "Farmer Farm Gate"

        cursor.execute(
            """
            INSERT INTO bidding_listings (
                id, farmer_id, farmer_name, farm_id, crop_name, variety, quantity_kg,
                min_price_per_kg, harvest_date, location, bidding_deadline, status,
                highest_bid_id, highest_bid_amount, buyer_count, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, 1, ?)
            """,
            (
                direct_list_id, prop["farmer_id"], prop["farmer_name"], prop["farm_id"],
                prop["crop_name"], prop["variety"], prop["quantity_kg"], agreed_price,
                now_iso[:10], pickup_loc, prop["expires_at"], direct_bid_id, agreed_price, now_iso,
            ),
        )
        cursor.execute(
            """
            INSERT INTO bidding_bids (
                id, listing_id, buyer_id, buyer_name, buyer_phone, bid_per_kg, total_amount, status, created_at
            ) VALUES (?, ?, ?, ?, '', ?, ?, 'accepted', ?)
            """,
            (direct_bid_id, direct_list_id, prop["buyer_id"], prop["buyer_name"], agreed_price, total_amount, now_iso),
        )
        cursor.execute(
            """
            INSERT INTO purchase_orders (
                id, listing_id, bid_id, farmer_id, farmer_name, buyer_id, buyer_name, buyer_phone,
                crop_name, quantity_kg, price_per_kg, total_amount, pickup_location, delivery_location,
                farm_id, proposal_id, payment_terms, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
            """,
            (
                po_id, direct_list_id, direct_bid_id, prop["farmer_id"], prop["farmer_name"],
                prop["buyer_id"], prop["buyer_name"], prop["crop_name"], prop["quantity_kg"],
                agreed_price, total_amount, pickup_loc, prop["delivery_location"],
                prop["farm_id"], proposal_id, prop["payment_terms"], now_iso,
            ),
        )
        cursor.execute(
            """
            UPDATE direct_sale_proposals
            SET status = 'confirmed', farmer_confirmed = 1, buyer_confirmed = 1,
                agreed_price_per_kg = ?, purchase_order_id = ?, updated_at = ?
            WHERE id = ?
            """,
            (agreed_price, po_id, now_iso, proposal_id),
        )
        conn.commit()
        order = cursor.execute("SELECT * FROM purchase_orders WHERE id = ?", (po_id,)).fetchone()
        updated_prop = cursor.execute("SELECT * FROM direct_sale_proposals WHERE id = ?", (proposal_id,)).fetchone()
        return {
            "status": "confirmed",
            "order_id": po_id,
            "order": dict(order),
            "proposal": dict(updated_prop),
        }
    finally:
        conn.close()
