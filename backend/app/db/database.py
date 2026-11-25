"""
Database Module for RaithaMitra.
Provides unified SQLite database connection, table initialization,
and seeding of safe demonstration accounts and initial flagship records.
Parity with Supabase schema structure.
"""
import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime, date, timezone

DB_DIR = Path("database")
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "raithamitra.db"

def get_db_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table (RBAC: farmer, buyer, labour, driver)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('farmer', 'buyer', 'labour', 'driver', 'admin')),
        preferred_language TEXT NOT NULL DEFAULT 'en',
        village TEXT,
        district TEXT,
        state TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 2. Farms Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS farms (
        id TEXT PRIMARY KEY,
        farmer_id TEXT NOT NULL,
        farmer_name TEXT NOT NULL,
        farm_name TEXT NOT NULL,
        village TEXT NOT NULL,
        district TEXT NOT NULL,
        state TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        land_area_ha REAL NOT NULL,
        primary_crop TEXT NOT NULL,
        crop_variety TEXT,
        sowing_date TEXT NOT NULL,
        crop_stage TEXT NOT NULL,
        soil_type TEXT NOT NULL,
        irrigation_method TEXT NOT NULL,
        water_source TEXT NOT NULL,
        available_water_m3 REAL NOT NULL DEFAULT 10000.0,
        cultivation_budget_inr REAL NOT NULL DEFAULT 50000.0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 3. Labour Profiles Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS labour_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        skills_json TEXT NOT NULL,
        daily_wage_rate REAL NOT NULL,
        availability_status TEXT NOT NULL DEFAULT 'available' CHECK(availability_status IN ('available', 'busy', 'unavailable')),
        location TEXT NOT NULL,
        rating REAL NOT NULL DEFAULT 4.8,
        total_jobs_completed INTEGER NOT NULL DEFAULT 0,
        total_earnings REAL NOT NULL DEFAULT 0.0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 4. Labour Jobs Table (Posted by Farmer)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS labour_jobs (
        id TEXT PRIMARY KEY,
        farmer_id TEXT NOT NULL,
        farmer_name TEXT NOT NULL,
        farm_id TEXT,
        title TEXT NOT NULL,
        job_type TEXT NOT NULL,
        crop_type TEXT NOT NULL,
        work_location TEXT NOT NULL,
        work_date TEXT NOT NULL,
        working_hours TEXT NOT NULL,
        wage_per_day REAL NOT NULL,
        required_workers INTEGER NOT NULL,
        hired_workers_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'completed', 'cancelled')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 5. Labour Applications Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS labour_applications (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        labour_id TEXT NOT NULL,
        labour_name TEXT NOT NULL,
        labour_phone TEXT,
        status TEXT NOT NULL DEFAULT 'applied' CHECK(status IN ('applied', 'accepted', 'rejected', 'completed')),
        applied_at TEXT NOT NULL,
        wages_earned REAL NOT NULL DEFAULT 0.0,
        UNIQUE(job_id, labour_id),
        FOREIGN KEY (job_id) REFERENCES labour_jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (labour_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 6. Smart Bidding Listings (Produce Listings by Farmer)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bidding_listings (
        id TEXT PRIMARY KEY,
        farmer_id TEXT NOT NULL,
        farmer_name TEXT NOT NULL,
        farm_id TEXT,
        crop_name TEXT NOT NULL,
        variety TEXT,
        quantity_kg REAL NOT NULL,
        min_price_per_kg REAL NOT NULL,
        harvest_date TEXT NOT NULL,
        location TEXT NOT NULL,
        bidding_deadline TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'confirmed', 'expired', 'cancelled')),
        highest_bid_id TEXT,
        highest_bid_amount REAL,
        buyer_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 7. Smart Bidding Bids (Submitted by Buyers)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bidding_bids (
        id TEXT PRIMARY KEY,
        listing_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        buyer_name TEXT NOT NULL,
        buyer_phone TEXT,
        bid_per_kg REAL NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'accepted', 'outbid', 'rejected')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (listing_id) REFERENCES bidding_listings(id) ON DELETE CASCADE,
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 8. Purchase Orders (Generated upon Farmer Confirmation)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        listing_id TEXT UNIQUE NOT NULL,
        bid_id TEXT NOT NULL,
        farmer_id TEXT NOT NULL,
        farmer_name TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        buyer_name TEXT NOT NULL,
        buyer_phone TEXT,
        crop_name TEXT NOT NULL,
        quantity_kg REAL NOT NULL,
        price_per_kg REAL NOT NULL,
        total_amount REAL NOT NULL,
        pickup_location TEXT NOT NULL,
        delivery_location TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'transport_arranged', 'fulfilled')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (listing_id) REFERENCES bidding_listings(id),
        FOREIGN KEY (bid_id) REFERENCES bidding_bids(id)
    )
    """)

    # 9. Transport Vehicles (Registered by Driver)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transport_vehicles (
        id TEXT PRIMARY KEY,
        driver_id TEXT UNIQUE NOT NULL,
        driver_name TEXT NOT NULL,
        driver_phone TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        vehicle_reg_number TEXT NOT NULL,
        capacity_kg REAL NOT NULL,
        base_fare_per_km REAL NOT NULL,
        service_area TEXT NOT NULL,
        availability_status TEXT NOT NULL DEFAULT 'available' CHECK(availability_status IN ('available', 'on_trip', 'unavailable')),
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 10. Transport Bookings (Farmer requests, Driver accepts & executes)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transport_bookings (
        id TEXT PRIMARY KEY,
        farmer_id TEXT NOT NULL,
        farmer_name TEXT NOT NULL,
        driver_id TEXT NOT NULL,
        driver_name TEXT NOT NULL,
        driver_phone TEXT,
        purchase_order_id TEXT,
        produce_type TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        pickup_location TEXT NOT NULL,
        delivery_destination TEXT NOT NULL,
        pickup_time TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        estimated_distance_km REAL NOT NULL,
        total_fare REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested', 'accepted', 'pickup_scheduled', 'picked_up', 'in_transit', 'delivered', 'rejected', 'cancelled')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 11. Buyer Profiles (Registered by Buyer)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS buyer_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        buyer_type TEXT NOT NULL DEFAULT 'individual',
        business_name TEXT,
        delivery_address TEXT,
        authorized_for_nursery INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 12. User Sessions (Active tokens & RBAC verification)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    conn.commit()
    seed_demo_accounts(cursor)
    conn.commit()
    conn.close()

def seed_demo_accounts(cursor):
    now = datetime.now(timezone.utc).isoformat()

    demo_users = [
        ("usr_farmer", "farmer@raithamitra.in", "farmer123", "Suresh Gowda", "+91 98450 12345", "farmer", "kn", "Mandya Rural", "Mandya", "Karnataka", now),
        ("usr_buyer1", "buyer1@raithamitra.in", "buyer123", "Bengaluru Fresh Foods Co", "+91 98450 67890", "buyer", "en", "Yeshwanthpur APMC", "Bengaluru Urban", "Karnataka", now),
        ("usr_buyer2", "buyer2@raithamitra.in", "buyer123", "Mysuru Organic Retail Ltd", "+91 98450 11223", "buyer", "en", "Bandipalya Mandi", "Mysuru", "Karnataka", now),
        ("usr_labour", "labour@raithamitra.in", "labour123", "Basavaraj Koravara", "+91 98450 44556", "labour", "kn", "Maddur", "Mandya", "Karnataka", now),
        ("usr_driver", "driver@raithamitra.in", "driver123", "Manjunath Transport", "+91 98450 77889", "driver", "kn", "Mandya Town", "Mandya", "Karnataka", now),
    ]

    for u in demo_users:
        cursor.execute("""
        INSERT OR IGNORE INTO users (id, email, password_hash, name, phone, role, preferred_language, village, district, state, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, u)

    # Seed Buyer Profiles
    cursor.execute("""
    INSERT OR IGNORE INTO buyer_profiles (
        id, user_id, buyer_type, business_name, delivery_address, authorized_for_nursery
    ) VALUES (
        'buyer_prof_001', 'usr_buyer1', 'business', 'Bengaluru Fresh Foods Co', 'Yeshwanthpur APMC Yard, Bengaluru Urban', 0
    )
    """)
    cursor.execute("""
    INSERT OR IGNORE INTO buyer_profiles (
        id, user_id, buyer_type, business_name, delivery_address, authorized_for_nursery
    ) VALUES (
        'buyer_prof_002', 'usr_buyer2', 'business', 'Mysuru Organic Retail Ltd', 'Bandipalya APMC Mandi, Mysuru', 0
    )
    """)

    # Seed Farmer's Farm
    cursor.execute("""
    INSERT OR IGNORE INTO farms (
        id, farmer_id, farmer_name, farm_name, village, district, state, latitude, longitude,
        land_area_ha, primary_crop, crop_variety, sowing_date, crop_stage, soil_type,
        irrigation_method, water_source, available_water_m3, cultivation_budget_inr, created_at, updated_at
    ) VALUES (
        'farm_001', 'usr_farmer', 'Suresh Gowda', 'Cauvery Valley Organic Farm', 'Mandya Rural', 'Mandya', 'Karnataka',
        12.5234, 76.8976, 2.5, 'Tomato', 'Arka Rakshak', '2026-10-15', 'Mid-Season', 'Red Sandy Loam',
        'Drip Irrigation', 'Borewell', 14500.0, 85000.0, ?, ?
    )
    """, (now, now))

    # Seed Labour Profile
    skills = json.dumps(["Harvesting", "Transplantation", "Weeding", "Loading & Unloading"])
    cursor.execute("""
    INSERT OR IGNORE INTO labour_profiles (
        id, user_id, name, phone, skills_json, daily_wage_rate, availability_status, location, rating, total_jobs_completed, total_earnings
    ) VALUES (
        'labour_001', 'usr_labour', 'Basavaraj Koravara', '+91 98450 44556', ?, 600.0, 'available', 'Mandya Rural', 4.9, 14, 8400.0
    )
    """, (skills,))

    # Seed an open agricultural job
    cursor.execute("""
    INSERT OR IGNORE INTO labour_jobs (
        id, farmer_id, farmer_name, farm_id, title, job_type, crop_type, work_location, work_date, working_hours, wage_per_day, required_workers, hired_workers_count, status, created_at
    ) VALUES (
        'job_001', 'usr_farmer', 'Suresh Gowda', 'farm_001', 'Tomato Harvesting & Crating', 'Harvesting', 'Tomato', 'Mandya Rural', '2026-11-28', '07:00 - 15:00', 650.0, 4, 1, 'open', ?
    )
    """, (now,))

    # Seed Driver Vehicle
    cursor.execute("""
    INSERT OR IGNORE INTO transport_vehicles (
        id, driver_id, driver_name, driver_phone, vehicle_type, vehicle_reg_number, capacity_kg, base_fare_per_km, service_area, availability_status
    ) VALUES (
        'veh_001', 'usr_driver', 'Manjunath Transport', '+91 98450 77889', 'Tata Ace', 'KA-11-EA-4521', 1500.0, 32.0, 'Mandya, Mysuru, Ramanagara, Bengaluru Rural', 'available'
    )
    """)

    # Seed an initial Bidding Listing
    cursor.execute("""
    INSERT OR IGNORE INTO bidding_listings (
        id, farmer_id, farmer_name, farm_id, crop_name, variety, quantity_kg, min_price_per_kg, harvest_date, location, bidding_deadline, status, created_at
    ) VALUES (
        'list_001', 'usr_farmer', 'Suresh Gowda', 'farm_001', 'Tomato', 'Arka Rakshak (Export Grade)', 3000.0, 22.0, '2026-11-30', 'Cauvery Valley Farm, Mandya', '2026-11-28T18:00:00Z', 'active', ?
    )
    """, (now,))
