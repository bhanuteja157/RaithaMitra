"""
Database Module for RaithaMitra.
Provides unified SQLite database connection, table initialization,
and seeding of safe demonstration accounts and initial flagship records.
Parity with Supabase schema structure.
"""
import sqlite3
import json
import os
import re
from pathlib import Path
from datetime import datetime, date, timezone

DB_DIR = Path("database")
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "raithamitra.db"


def normalize_phone_e164(phone_raw: str, country_code: str = "+91") -> str:
    """Normalize a phone number to strict E.164 format (defaults to +91)."""
    if not phone_raw or not isinstance(phone_raw, str):
        raise ValueError("Mobile number is required.")
    cleaned = re.sub(r"[\s\-\(\)]", "", phone_raw.strip())
    cc = re.sub(r"[^\d+]", "", (country_code or "+91").strip())
    if not cc.startswith("+"):
        cc = f"+{cc}"

    if cleaned.startswith("+"):
        normalized = cleaned
    elif cleaned.startswith("00"):
        normalized = f"+{cleaned[2:]}"
    elif cc == "+91" and len(cleaned) == 12 and cleaned.startswith("91"):
        normalized = f"+{cleaned}"
    elif cc == "+91" and len(cleaned) == 11 and cleaned.startswith("0"):
        normalized = f"+91{cleaned[1:]}"
    elif re.fullmatch(r"\d{10}", cleaned):
        normalized = f"{cc}{cleaned}"
    else:
        raise ValueError("Enter a valid mobile number with 10 digits or E.164 format.")

    if normalized.startswith("+91"):
        if not re.fullmatch(r"\+91[6-9]\d{9}", normalized):
            raise ValueError("Enter a valid 10-digit Indian mobile number.")
    elif not re.fullmatch(r"\+[1-9]\d{7,14}", normalized):
        raise ValueError("Enter a valid international E.164 mobile number.")
    return normalized

def get_db_connection():
    conn = sqlite3.connect(str(DB_PATH), timeout=15.0)
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

    # 13. Safe backward-compatible migration for Mobile OTP & Unique Phone Ownership (AD-14)
    for alter_sql in [
        "ALTER TABLE users ADD COLUMN phone_normalized TEXT",
        "ALTER TABLE users ADD COLUMN phone_verified INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'",
    ]:
        try:
            cursor.execute(alter_sql)
        except sqlite3.OperationalError:
            pass

    cursor.execute("SELECT id, phone FROM users WHERE phone_normalized IS NULL AND phone IS NOT NULL")
    for u_row in cursor.fetchall():
        try:
            norm = normalize_phone_e164(u_row["phone"])
            existing = cursor.execute(
                "SELECT id FROM users WHERE phone_normalized = ? AND id != ?",
                (norm, u_row["id"]),
            ).fetchone()
            if not existing:
                cursor.execute(
                    "UPDATE users SET phone_normalized = ? WHERE id = ?",
                    (norm, u_row["id"]),
                )
        except (ValueError, sqlite3.IntegrityError):
            pass

    # Clean up any historical duplicate phone_normalized values before creating unique index
    cursor.execute("""
    SELECT phone_normalized, min(created_at) as min_created
    FROM users
    WHERE phone_normalized IS NOT NULL AND phone_normalized != ''
    GROUP BY phone_normalized
    HAVING count(*) > 1
    """)
    for dup in cursor.fetchall():
        cursor.execute(
            "UPDATE users SET phone_normalized = NULL WHERE phone_normalized = ? AND created_at != ?",
            (dup["phone_normalized"], dup["min_created"]),
        )

    cursor.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_normalized_unique
    ON users(phone_normalized)
    WHERE phone_normalized IS NOT NULL AND phone_normalized != ''
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS phone_otps (
        id TEXT PRIMARY KEY,
        phone_normalized TEXT NOT NULL,
        otp_hash TEXT NOT NULL,
        purpose TEXT NOT NULL DEFAULT 'auth',
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        expires_at TEXT NOT NULL,
        consumed_at TEXT,
        created_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS otp_verification_tokens (
        token_hash TEXT PRIMARY KEY,
        phone_normalized TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        consumed_at TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 14. Persistent Farm Financial Transaction Ledger (AD-24)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS financial_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        farm_id TEXT NOT NULL,
        crop_season_id TEXT,
        category TEXT NOT NULL,
        tx_type TEXT NOT NULL CHECK(tx_type IN ('income', 'expense')),
        amount_inr REAL NOT NULL CHECK(amount_inr >= 0),
        tx_date TEXT NOT NULL,
        description TEXT NOT NULL,
        source_module TEXT NOT NULL,
        related_id TEXT,
        status TEXT NOT NULL CHECK(status IN ('estimated', 'committed', 'recorded', 'settled', 'cancelled')),
        provenance TEXT NOT NULL,
        payment_reference TEXT,
        sync_key TEXT,
        is_manual INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
    )
    """)
    cursor.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_tx_sync_key
    ON financial_transactions(sync_key)
    WHERE sync_key IS NOT NULL
    """)
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_fin_tx_user_farm
    ON financial_transactions(user_id, farm_id, tx_date)
    """)

    # 15. Multilingual Agentic Assistant Conversations & Pending Actions (AD-23)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS assistant_conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        farm_id TEXT,
        language TEXT NOT NULL DEFAULT 'en',
        title TEXT NOT NULL,
        messages_json TEXT NOT NULL DEFAULT '[]',
        pending_task_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS assistant_pending_actions (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        session_token_hash TEXT NOT NULL,
        action_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        summary TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'expired')),
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # 16. Satellite Observation Metadata Cache (AD-25)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS satellite_observations_cache (
        id TEXT PRIMARY KEY,
        farm_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        product_id TEXT,
        acquisition_timestamp TEXT NOT NULL,
        processing_timestamp TEXT NOT NULL,
        cloud_coverage_pct REAL,
        valid_pixel_coverage_pct REAL,
        indices_json TEXT NOT NULL,
        polygon_hash TEXT NOT NULL,
        source_reference TEXT NOT NULL,
        data_quality TEXT NOT NULL,
        thumbnail_url TEXT,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_sat_cache_farm_acq
    ON satellite_observations_cache(farm_id, acquisition_timestamp DESC)
    """)

    # 17. Post-Harvest Management & Cold Storage Intelligence (AD-27)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS harvest_records (
        id TEXT PRIMARY KEY,
        farmer_id TEXT NOT NULL,
        farm_id TEXT NOT NULL,
        crop TEXT NOT NULL,
        variety TEXT,
        cultivated_area_ha REAL NOT NULL,
        expected_harvest_date TEXT NOT NULL,
        estimated_yield_kg REAL NOT NULL,
        actual_harvested_kg REAL,
        crop_maturity TEXT DEFAULT 'Optimal',
        harvest_quality TEXT DEFAULT 'Grade A',
        damaged_quantity_kg REAL DEFAULT 0.0,
        is_simulated INTEGER NOT NULL DEFAULT 0,
        digital_farming_notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS post_harvest_lots (
        id TEXT PRIMARY KEY,
        farmer_id TEXT NOT NULL,
        farm_id TEXT NOT NULL,
        harvest_record_id TEXT,
        crop TEXT NOT NULL,
        variety TEXT,
        harvest_date TEXT NOT NULL,
        initial_quantity_kg REAL NOT NULL,
        available_quantity_kg REAL NOT NULL,
        reserved_quantity_kg REAL NOT NULL DEFAULT 0.0,
        sold_quantity_kg REAL NOT NULL DEFAULT 0.0,
        transported_quantity_kg REAL NOT NULL DEFAULT 0.0,
        damaged_quantity_kg REAL NOT NULL DEFAULT 0.0,
        discarded_quantity_kg REAL NOT NULL DEFAULT 0.0,
        quality_grade TEXT NOT NULL DEFAULT 'Grade A',
        storage_method TEXT NOT NULL DEFAULT 'Ambient Ventilated',
        storage_location TEXT NOT NULL DEFAULT 'On-Farm Shed',
        recorded_temp_c REAL,
        recorded_humidity_pct REAL,
        packaging_type TEXT DEFAULT 'Ventilated Plastic Crates',
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'reserved', 'depleted', 'discarded')),
        linked_listing_id TEXT,
        linked_transport_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS post_harvest_lot_events (
        id TEXT PRIMARY KEY,
        lot_id TEXT NOT NULL,
        farmer_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        quantity_kg REAL NOT NULL DEFAULT 0.0,
        delta_available_kg REAL NOT NULL DEFAULT 0.0,
        notes TEXT,
        reference_id TEXT,
        idempotency_key TEXT UNIQUE,
        created_at TEXT NOT NULL,
        FOREIGN KEY (lot_id) REFERENCES post_harvest_lots(id) ON DELETE CASCADE,
        FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS post_harvest_storage_records (
        id TEXT PRIMARY KEY,
        farmer_id TEXT NOT NULL,
        farm_id TEXT NOT NULL,
        lot_id TEXT,
        facility_name TEXT NOT NULL,
        facility_source TEXT NOT NULL DEFAULT 'manual',
        commodity TEXT NOT NULL,
        quantity_kg REAL NOT NULL,
        start_date TEXT NOT NULL,
        expected_retrieval_date TEXT NOT NULL,
        target_temp_c REAL,
        target_humidity_pct REAL,
        storage_rate_inr_per_day REAL NOT NULL DEFAULT 0.0,
        loading_charges_inr REAL NOT NULL DEFAULT 0.0,
        handling_charges_inr REAL NOT NULL DEFAULT 0.0,
        other_expenses_inr REAL NOT NULL DEFAULT 0.0,
        total_estimated_cost_inr REAL NOT NULL DEFAULT 0.0,
        reservation_status TEXT NOT NULL DEFAULT 'draft' CHECK(reservation_status IN ('draft', 'requested', 'confirmed_external', 'completed', 'cancelled')),
        financial_tx_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS post_harvest_manual_facilities (
        id TEXT PRIMARY KEY,
        farmer_id TEXT NOT NULL,
        facility_name TEXT NOT NULL,
        location TEXT NOT NULL,
        district TEXT,
        state TEXT,
        latitude REAL,
        longitude REAL,
        contact_info TEXT,
        storage_categories TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ph_lots_farmer ON post_harvest_lots(farmer_id, farm_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ph_events_lot ON post_harvest_lot_events(lot_id, created_at DESC)")

    conn.commit()
    seed_demo_accounts(cursor)
    # Backfill phone_normalized for any newly seeded accounts
    cursor.execute("SELECT id, phone FROM users WHERE phone_normalized IS NULL AND phone IS NOT NULL")
    for u_row in cursor.fetchall():
        try:
            norm = normalize_phone_e164(u_row["phone"])
            existing = cursor.execute(
                "SELECT id FROM users WHERE phone_normalized = ? AND id != ?",
                (norm, u_row["id"]),
            ).fetchone()
            if not existing:
                cursor.execute(
                    "UPDATE users SET phone_normalized = ? WHERE id = ?",
                    (norm, u_row["id"]),
                )
        except (ValueError, sqlite3.IntegrityError):
            pass

    sync_demo_otp_phones(cursor)
    conn.commit()
    conn.close()


DEMO_ACCOUNT_IDS = {"usr_farmer", "usr_buyer1", "usr_buyer2", "usr_labour", "usr_driver"}


def sync_single_demo_phone(cursor, user_id: str, phone_raw: str) -> bool:
    """
    Idempotently update a seeded demo user's phone number using its stable user_id.
    Validates phone uniqueness and rejects conflicts with existing non-demo accounts
    instead of overwriting them. Preserves name, email, password_hash, role, and related records.
    Returns True if updated or already in sync, False if user_id does not exist.
    """
    phone_norm = normalize_phone_e164(phone_raw)
    target = cursor.execute(
        "SELECT id, phone, phone_normalized, phone_verified FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    if not target:
        return False

    conflict = cursor.execute(
        "SELECT id, role FROM users WHERE phone_normalized = ? AND id != ?",
        (phone_norm, user_id),
    ).fetchone()
    if conflict:
        if conflict["id"] not in DEMO_ACCOUNT_IDS:
            raise ValueError(
                f"Phone number {phone_norm} conflicts with existing non-demo account ({conflict['id']})."
            )
        # Clear previous demo holder's phone_normalized only if swapping between demo accounts
        cursor.execute(
            "UPDATE users SET phone_normalized = NULL WHERE id = ?",
            (conflict["id"],),
        )

    if (
        target["phone"] != phone_norm
        or target["phone_normalized"] != phone_norm
        or not target["phone_verified"]
    ):
        cursor.execute(
            "UPDATE users SET phone = ?, phone_normalized = ?, phone_verified = 1 WHERE id = ?",
            (phone_norm, phone_norm, user_id),
        )

    if user_id == "usr_labour":
        cursor.execute(
            "UPDATE labour_profiles SET phone = ? WHERE user_id = ? AND phone != ?",
            (phone_norm, user_id, phone_norm),
        )
    elif user_id == "usr_driver":
        cursor.execute(
            "UPDATE transport_vehicles SET driver_phone = ? WHERE driver_id = ? AND driver_phone != ?",
            (phone_norm, user_id, phone_norm),
        )
    return True


def sync_demo_otp_phones(cursor) -> None:
    """
    Idempotently synchronize local demo account mobile numbers from private .env configuration
    when running in non-production environments with DEMO_OTP_ENABLED=true.
    """
    env_mode = os.getenv("ENVIRONMENT", "development").strip().lower()
    if env_mode == "production":
        return
    enabled = os.getenv("DEMO_OTP_ENABLED", "false").strip().lower() in ("true", "1", "yes")
    if not enabled:
        return

    pairs = []
    raw_json = os.getenv("DEMO_OTP_ACCOUNTS", "").strip()
    if raw_json:
        try:
            parsed = json.loads(raw_json)
            if isinstance(parsed, dict):
                for uid, cfg in parsed.items():
                    if isinstance(cfg, dict) and cfg.get("phone"):
                        pairs.append((str(uid).strip(), str(cfg["phone"]).strip()))
        except json.JSONDecodeError:
            pass

    raw_map = os.getenv("DEMO_OTP_MAP", "").strip()
    if raw_map:
        for item in raw_map.split(","):
            part = item.strip()
            if not part:
                continue
            pieces = part.split(":")
            if len(pieces) == 3:
                pairs.append((pieces[0].strip(), pieces[1].strip()))

    for uid, phone_raw in pairs:
        if uid not in DEMO_ACCOUNT_IDS:
            continue
        try:
            sync_single_demo_phone(cursor, uid, phone_raw)
        except ValueError as exc:
            print(f"[WARN] Demo phone sync skipped for {uid}: {exc}")


def seed_demo_accounts(cursor):
    now = datetime.now(timezone.utc).isoformat()

    demo_users = [
        ("usr_farmer", "farmer@raithamitra.in", "farmer123", "Suresh Gowda", "+91 90000 00001", "farmer", "kn", "Mandya Rural", "Mandya", "Karnataka", now),
        ("usr_buyer1", "buyer1@raithamitra.in", "buyer123", "Bengaluru Fresh Foods Co", "+91 90000 00002", "buyer", "en", "Yeshwanthpur APMC", "Bengaluru Urban", "Karnataka", now),
        ("usr_buyer2", "buyer2@raithamitra.in", "buyer123", "Mysuru Organic Retail Ltd", "+91 90000 00003", "buyer", "en", "Bandipalya Mandi", "Mysuru", "Karnataka", now),
        ("usr_labour", "labour@raithamitra.in", "labour123", "Basavaraj Koravara", "+91 90000 00004", "labour", "kn", "Maddur", "Mandya", "Karnataka", now),
        ("usr_driver", "driver@raithamitra.in", "driver123", "Manjunath Transport", "+91 90000 00005", "driver", "kn", "Mandya Town", "Mandya", "Karnataka", now),
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
        'labour_001', 'usr_labour', 'Basavaraj Koravara', '+91 90000 00004', ?, 600.0, 'available', 'Mandya Rural', 4.9, 14, 8400.0
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
        'veh_001', 'usr_driver', 'Manjunath Transport', '+91 90000 00005', 'Tata Ace', 'KA-11-EA-4521', 1500.0, 32.0, 'Mandya, Mysuru, Ramanagara, Bengaluru Rural', 'available'
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
