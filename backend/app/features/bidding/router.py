"""
Flagship 2: Smart Bidding (Competitive Agricultural Marketplace).
Implements produce listing, multi-buyer bidding competition, real-time bid ranking,
bidding intelligence metrics, farmer confirmation, and purchase order generation.
"""
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime, timezone

from backend.app.db.database import get_db_connection

router = APIRouter(prefix="/bidding", tags=["Smart Bidding"])

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
def create_produce_listing(listing: ListingCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    listing_id = f"list_{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    
    cursor.execute("""
    INSERT INTO bidding_listings (
        id, farmer_id, farmer_name, farm_id, crop_name, variety, quantity_kg, min_price_per_kg,
        harvest_date, location, bidding_deadline, status, buyer_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, ?)
    """, (
        listing_id, listing.farmer_id, listing.farmer_name, listing.farm_id, listing.crop_name,
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
def submit_bid(listing_id: str, bid: BidSubmit):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    listing = cursor.execute("SELECT * FROM bidding_listings WHERE id = ?", (listing_id,)).fetchone()
    if not listing:
        conn.close()
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing["status"] != "active":
        conn.close()
        raise HTTPException(status_code=400, detail="This listing is closed or already confirmed")
        
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
    """, (bid_id, listing_id, bid.buyer_id, bid.buyer_name, bid.buyer_phone, bid.bid_per_kg, total_amount, now))
    
    # Update highest bid on listing
    cur_highest = listing["highest_bid_amount"] or 0.0
    if bid.bid_per_kg > cur_highest:
        cursor.execute("""
        UPDATE bidding_listings
        SET highest_bid_id = ?, highest_bid_amount = ?, buyer_count = buyer_count + 1
        WHERE id = ?
        """, (bid_id, bid.bid_per_kg, listing_id))
    else:
        cursor.execute("UPDATE bidding_listings SET buyer_count = buyer_count + 1 WHERE id = ?", (listing_id,))
        
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Bid placed successfully", "bid_id": bid_id, "total_value": total_amount}

@router.post("/listings/{listing_id}/confirm")
def confirm_sale(listing_id: str, farmer_id: str = Query("usr_farmer")):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    listing = cursor.execute("SELECT * FROM bidding_listings WHERE id = ?", (listing_id,)).fetchone()
    if not listing:
        conn.close()
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing["status"] == "confirmed":
        conn.close()
        raise HTTPException(status_code=400, detail="This sale has already been confirmed. Duplicate confirmation prohibited.")
        
    # Find highest bid
    highest_bid = cursor.execute("""
    SELECT * FROM bidding_bids WHERE listing_id = ? ORDER BY bid_per_kg DESC, created_at ASC LIMIT 1
    """, (listing_id,)).fetchone()
    
    if not highest_bid:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot confirm sale: No bids have been placed yet")
        
    po_id = f"po_{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Atomic transaction: Update listing -> update bids -> create purchase order
    cursor.execute("UPDATE bidding_listings SET status = 'confirmed' WHERE id = ?", (listing_id,))
    cursor.execute("UPDATE bidding_bids SET status = 'accepted' WHERE id = ?", (highest_bid["id"],))
    cursor.execute("UPDATE bidding_bids SET status = 'outbid' WHERE listing_id = ? AND id != ?", (listing_id, highest_bid["id"]))
    
    cursor.execute("""
    INSERT INTO purchase_orders (
        id, listing_id, bid_id, farmer_id, farmer_name, buyer_id, buyer_name, buyer_phone,
        crop_name, quantity_kg, price_per_kg, total_amount, pickup_location, delivery_location, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
    """, (
        po_id, listing_id, highest_bid["id"], listing["farmer_id"], listing["farmer_name"],
        highest_bid["buyer_id"], highest_bid["buyer_name"], highest_bid["buyer_phone"],
        listing["crop_name"], listing["quantity_kg"], highest_bid["bid_per_kg"], highest_bid["total_amount"],
        listing["location"], "Yeshwanthpur APMC Yard, Bengaluru", now
    ))
    
    conn.commit()
    order = cursor.execute("SELECT * FROM purchase_orders WHERE id = ?", (po_id,)).fetchone()
    conn.close()
    
    return {
        "status": "success",
        "message": "Sale confirmed! Purchase order generated. Ready for Transport Connect.",
        "order": dict(order)
    }

@router.get("/orders")
def list_purchase_orders(user_id: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_id:
        rows = cursor.execute("""
        SELECT * FROM purchase_orders WHERE farmer_id = ? OR buyer_id = ? ORDER BY created_at DESC
        """, (user_id, user_id)).fetchall()
    else:
        rows = cursor.execute("SELECT * FROM purchase_orders ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]
