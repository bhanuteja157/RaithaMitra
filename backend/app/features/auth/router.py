"""
Feature: Authentication & Role-Based Access Control (RBAC).
Provides registration, login, user profiling, session management, and quick demo switching for judging.
Enforces password hashing (SHA-256 + Salt) and role authorization checks.
"""
from fastapi import APIRouter, HTTPException, Header, Depends, Request, status
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal, List
import uuid
import hashlib
import secrets
import json
import sqlite3
from datetime import datetime, timedelta, timezone

from backend.app.db.database import get_db_connection, normalize_phone_e164
from backend.app.features.auth.otp_service import (
    consume_verification_token,
    dispatch_otp,
    issue_verification_token,
    mask_phone,
    verify_submitted_otp,
)
from backend.app.features.auth.security import (
    check_rate_limit,
    is_demo_auth_allowed,
    is_production_env,
)

SESSION_TTL_DAYS = 7

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


def hash_password(password: str) -> str:
    """Generate a NIST-compliant PBKDF2-HMAC-SHA256 password hash (100,000 iterations)."""
    salt = secrets.token_hex(16)
    iterations = 100000
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations).hex()
    return f"pbkdf2_sha256${iterations}${salt}${key}"


def verify_password(plain_password: str, stored_hash: str) -> tuple[bool, bool]:
    """
    Verify plain password against stored hash or legacy demo plaintext.
    Returns: (is_valid: bool, needs_migration_to_pbkdf2: bool)
    """
    if not stored_hash or not plain_password:
        return False, False
        
    # 1. PBKDF2-HMAC-SHA256 (Current Standard)
    if stored_hash.startswith("pbkdf2_sha256$"):
        parts = stored_hash.split("$")
        if len(parts) == 4:
            _, iters_str, salt, expected_key = parts
            iters = int(iters_str)
            computed_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), iters).hex()
            return secrets.compare_digest(computed_key, expected_key), False

    # 2. Legacy salted SHA-256 (Automatic Migration Target)
    if stored_hash.startswith("sha256$"):
        parts = stored_hash.split("$")
        if len(parts) == 3:
            _, salt, expected_hash = parts
            computed_hash = hashlib.sha256((salt + plain_password).encode("utf-8")).hexdigest()
            if secrets.compare_digest(computed_hash, expected_hash):
                return True, True

    # 3. Legacy demo plaintext passwords (e.g. 'farmer123', 'buyer123')
    if "$" not in stored_hash:
        if secrets.compare_digest(plain_password, stored_hash):
            return True, True

    return False, False


def verify_user_role_in_db(user_id: str, allowed_roles: List[str]) -> bool:
    """Verify that a given user possesses an allowed role."""
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not row:
        return False
    return row["role"] in allowed_roles


class UserRegister(BaseModel):
    email: str
    password: str = Field(..., min_length=6, description="Password (at least 6 characters)")
    name: str = Field(..., min_length=2, description="Full Name")
    phone: str = Field(..., description="Mobile Phone Number")
    role: Literal["farmer", "buyer", "labour", "driver"]
    preferred_language: Literal["en", "kn", "hi"] = "en"
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = "Karnataka"
    
    # Buyer specific fields
    buyer_type: Optional[Literal["individual", "business"]] = "individual"
    business_name: Optional[str] = None
    delivery_address: Optional[str] = None
    
    # Labour specific fields
    skills: Optional[List[str]] = None
    daily_wage_rate: Optional[float] = None
    
    # Driver specific fields
    vehicle_type: Optional[str] = None
    vehicle_reg_number: Optional[str] = None
    capacity_kg: Optional[float] = None
    base_fare_per_km: Optional[float] = None


class UserLogin(BaseModel):
    email: str
    password: str
    role: Optional[Literal["farmer", "buyer", "labour", "driver"]] = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: str
    role: str
    preferred_language: str
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    created_at: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"auth_register:{client_ip}", max_requests=30, window_seconds=60)
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check existing email
    existing = cursor.execute("SELECT id FROM users WHERE email = ?", (user_in.email.strip().lower(),)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="User with this email is already registered")
        
    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    hashed_pwd = hash_password(user_in.password)
    
    cursor.execute("""
    INSERT INTO users (id, email, password_hash, name, phone, role, preferred_language, village, district, state, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, user_in.email.strip().lower(), hashed_pwd, user_in.name.strip(), user_in.phone.strip(),
        user_in.role, user_in.preferred_language, user_in.village, user_in.district, user_in.state, now
    ))
    
    # Initialize role-specific profile records
    if user_in.role == "buyer":
        buyer_id = f"buyer_{uuid.uuid4().hex[:6]}"
        cursor.execute("""
        INSERT INTO buyer_profiles (id, user_id, buyer_type, business_name, delivery_address, authorized_for_nursery)
        VALUES (?, ?, ?, ?, ?, 0)
        """, (
            buyer_id, user_id, user_in.buyer_type or "individual",
            user_in.business_name or user_in.name,
            user_in.delivery_address or f"{user_in.village or ''}, {user_in.district or 'Karnataka'}"
        ))
        
    elif user_in.role == "labour":
        labour_id = f"labour_{uuid.uuid4().hex[:6]}"
        skills_json = json.dumps(user_in.skills if user_in.skills else ["Harvesting", "Transplantation", "Weeding"])
        wage = float(user_in.daily_wage_rate) if user_in.daily_wage_rate and user_in.daily_wage_rate > 0 else 550.0
        location = f"{user_in.village or ''}, {user_in.district or 'Karnataka'}".strip(", ")
        cursor.execute("""
        INSERT INTO labour_profiles (id, user_id, name, phone, skills_json, daily_wage_rate, availability_status, location, rating, total_jobs_completed, total_earnings)
        VALUES (?, ?, ?, ?, ?, ?, 'available', ?, 5.0, 0, 0.0)
        """, (labour_id, user_id, user_in.name, user_in.phone, skills_json, wage, location))
        
    elif user_in.role == "driver":
        veh_id = f"veh_{uuid.uuid4().hex[:6]}"
        veh_type = user_in.vehicle_type or "Tata Ace"
        reg_num = user_in.vehicle_reg_number or f"KA-{secrets.randbelow(89)+10}-TR-{secrets.randbelow(8999)+1000}"
        cap = float(user_in.capacity_kg) if user_in.capacity_kg and user_in.capacity_kg > 0 else 1500.0
        fare = float(user_in.base_fare_per_km) if user_in.base_fare_per_km and user_in.base_fare_per_km > 0 else 30.0
        service_area = f"{user_in.district or 'Karnataka'}, State Highway routes"
        cursor.execute("""
        INSERT INTO transport_vehicles (id, driver_id, driver_name, driver_phone, vehicle_type, vehicle_reg_number, capacity_kg, base_fare_per_km, service_area, availability_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
        """, (veh_id, user_id, user_in.name, user_in.phone, veh_type, reg_num, cap, fare, service_area))
        
    # Create persistent session token with explicit expiry
    session_token = f"rm_token_{user_id}_{secrets.token_hex(12)}"
    expires_at = (datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)).isoformat()
    cursor.execute("""
    INSERT INTO user_sessions (token, user_id, role, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
    """, (session_token, user_id, user_in.role, now, expires_at))
    
    conn.commit()
    row = cursor.execute("""
    SELECT id, email, name, phone, role, preferred_language, village, district, state, created_at 
    FROM users WHERE id = ?
    """, (user_id,)).fetchone()
    conn.close()
    
    user_dict = dict(row)
    user_dict["is_demo"] = False
    return {
        "access_token": session_token,
        "token_type": "bearer",
        "user": user_dict,
        "redirect_url": "/" if user_in.role == "farmer" else f"/dashboard/{user_in.role}"
    }


@router.post("/login")
def login(credentials: UserLogin, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"auth_login:{client_ip}", max_requests=60, window_seconds=60)
    conn = get_db_connection()
    cursor = conn.cursor()
    user = cursor.execute("""
    SELECT id, email, password_hash, name, phone, role, preferred_language, village, district, state, created_at
    FROM users WHERE LOWER(email) = ?
    """, (credentials.email.strip().lower(),)).fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    is_valid, needs_rehash = verify_password(credentials.password, user["password_hash"])
    if not is_valid:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    # Check role mismatch if role was selected on login screen
    if credentials.role and user["role"] != credentials.role:
        conn.close()
        raise HTTPException(
            status_code=403,
            detail=f"Role mismatch: account is registered as '{user['role'].capitalize()}', not '{credentials.role.capitalize()}'."
        )
        
    # Seamless in-place password migration to PBKDF2-HMAC-SHA256 upon successful login
    if needs_rehash:
        migrated_hash = hash_password(credentials.password)
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (migrated_hash, user["id"]))
        
    now = datetime.now(timezone.utc).isoformat()
    expires_at = (datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)).isoformat()
    session_token = f"rm_token_{user['id']}_{secrets.token_hex(12)}"
    cursor.execute("""
    INSERT INTO user_sessions (token, user_id, role, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
    """, (session_token, user["id"], user["role"], now, expires_at))
    conn.commit()
    conn.close()
    
    user_dict = {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "phone": user["phone"],
        "role": user["role"],
        "preferred_language": user["preferred_language"],
        "village": user["village"],
        "district": user["district"],
        "state": user["state"],
        "created_at": user["created_at"],
        "is_demo": user["id"].startswith("usr_farmer") or user["id"].startswith("usr_buyer") or user["id"].startswith("usr_labour") or user["id"].startswith("usr_driver")
    }
    
    redirect_map = {
        "farmer": "/",
        "buyer": "/dashboard/buyer",
        "labour": "/dashboard/labour",
        "driver": "/dashboard/driver"
    }
    
    return {
        "access_token": session_token,
        "token_type": "bearer",
        "user": user_dict,
        "redirect_url": redirect_map.get(user["role"], "/")
    }


@router.get("/me")
def get_current_user(authorization: Optional[str] = Header(None)):
    """Validates session token and returns authenticated user profile."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")
        
    token = authorization.replace("Bearer ", "").strip()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    session = cursor.execute("SELECT user_id, role, expires_at FROM user_sessions WHERE token = ?", (token,)).fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

    if session["expires_at"]:
        try:
            exp_dt = datetime.fromisoformat(session["expires_at"])
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if exp_dt < datetime.now(timezone.utc):
                cursor.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
                conn.commit()
                conn.close()
                raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
        except ValueError:
            pass
        
    user = cursor.execute("""
    SELECT id, email, name, phone, role, preferred_language, village, district, state, created_at
    FROM users WHERE id = ?
    """, (session["user_id"],)).fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User account not found")
        
    user_dict = dict(user)
    user_dict["is_demo"] = user["id"].startswith("usr_farmer") or user["id"].startswith("usr_buyer") or user["id"].startswith("usr_labour") or user["id"].startswith("usr_driver")
    return user_dict


@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    """Revokes active session token."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
        conn.commit()
        conn.close()
    return {"message": "Session logged out successfully"}


@router.get("/demo-accounts")
def get_demo_accounts():
    """Returns demonstration account metadata (never passwords) in non-production dev/test mode only."""
    if is_production_env() or not is_demo_auth_allowed():
        raise HTTPException(
            status_code=403,
            detail="Demo accounts are disabled in production environments.",
        )
    conn = get_db_connection()
    phone_by_id = {}
    try:
        rows = conn.execute(
            "SELECT id, phone FROM users WHERE id IN ('usr_farmer', 'usr_buyer1', 'usr_buyer2', 'usr_labour', 'usr_driver')"
        ).fetchall()
        phone_by_id = {r["id"]: r["phone"] for r in rows}
    finally:
        conn.close()

    return [
        {
            "id": "usr_farmer",
            "role": "farmer",
            "name": "Suresh Gowda",
            "email": "farmer@raithamitra.in",
            "phone": phone_by_id.get("usr_farmer", ""),
            "description": "Mandya Organic Farmer (Tomato, Drip, 2.5 ha)",
            "redirect_url": "/"
        },
        {
            "id": "usr_buyer1",
            "role": "buyer",
            "name": "Bengaluru Fresh Foods Co",
            "email": "buyer1@raithamitra.in",
            "phone": phone_by_id.get("usr_buyer1", ""),
            "description": "APMC Licensed Wholesale Buyer A",
            "redirect_url": "/dashboard/buyer"
        },
        {
            "id": "usr_buyer2",
            "role": "buyer",
            "name": "Mysuru Organic Retail Ltd",
            "email": "buyer2@raithamitra.in",
            "phone": phone_by_id.get("usr_buyer2", ""),
            "description": "Retail Supermarket Chain Buyer B",
            "redirect_url": "/dashboard/buyer"
        },
        {
            "id": "usr_labour",
            "role": "labour",
            "name": "Basavaraj Koravara",
            "email": "labour@raithamitra.in",
            "phone": phone_by_id.get("usr_labour", ""),
            "description": "Skilled Agricultural Worker (Harvesting, Sowing)",
            "redirect_url": "/dashboard/labour"
        },
        {
            "id": "usr_driver",
            "role": "driver",
            "name": "Manjunath Transport",
            "email": "driver@raithamitra.in",
            "phone": phone_by_id.get("usr_driver", ""),
            "description": "Local Goods Carrier (Tata Ace, 1500kg Capacity)",
            "redirect_url": "/dashboard/driver"
        },
    ]


# ==============================================================================
# AD-14: SECURE MOBILE NUMBER & OTP AUTHENTICATION (ONE PHONE = ONE ACCOUNT/ROLE)
# ==============================================================================

class OtpSendRequest(BaseModel):
    phone: str = Field(..., description="Mobile number")
    country_code: str = Field(default="+91", description="Country code, defaults to +91")


class OtpVerifyRequest(BaseModel):
    phone: str
    country_code: str = "+91"
    otp: str = Field(..., min_length=6, max_length=6)


class OtpRegisterRequest(BaseModel):
    verification_token: str = Field(..., min_length=10)
    name: str = Field(..., min_length=2, max_length=80)
    role: Literal["farmer", "buyer", "labour", "driver"]
    preferred_language: Literal["en", "kn", "hi", "te"] = "en"
    village: Optional[str] = "Mandya Rural"
    district: Optional[str] = "Mandya"
    state: Optional[str] = "Karnataka"
    buyer_type: Optional[Literal["individual", "business"]] = "individual"
    business_name: Optional[str] = None
    delivery_address: Optional[str] = None
    skills: Optional[List[str]] = None
    daily_wage_rate: Optional[float] = None
    vehicle_type: Optional[str] = None
    vehicle_reg_number: Optional[str] = None
    capacity_kg: Optional[float] = None
    base_fare_per_km: Optional[float] = None


class OtpLinkPhoneRequest(BaseModel):
    verification_token: str = Field(..., min_length=10)


def _redirect_for_role(role: str) -> str:
    return "/" if role == "farmer" else f"/dashboard/{role}"


def _build_user_response(row) -> dict:
    d = dict(row)
    d["phone_verified"] = bool(d.get("phone_verified", 0))
    d["is_demo"] = (
        d["id"].startswith("usr_farmer")
        or d["id"].startswith("usr_buyer")
        or d["id"].startswith("usr_labour")
        or d["id"].startswith("usr_driver")
    )
    return d


@router.post("/otp/send")
async def send_otp(payload: OtpSendRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"otp_send:{client_ip}", max_requests=30, window_seconds=60)
    try:
        phone_norm = normalize_phone_e164(payload.phone, payload.country_code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        result = await dispatch_otp(cursor, phone_norm)
        conn.commit()
        return result
    except HTTPException:
        conn.rollback()
        raise
    finally:
        conn.close()


@router.post("/otp/verify")
async def verify_otp(payload: OtpVerifyRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"otp_verify:{client_ip}", max_requests=40, window_seconds=60)
    try:
        phone_norm = normalize_phone_e164(payload.phone, payload.country_code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        await verify_submitted_otp(cursor, phone_norm, payload.otp)

        existing = cursor.execute(
            """
            SELECT id, email, name, phone, phone_normalized, phone_verified, role,
                   preferred_language, village, district, state, created_at
            FROM users WHERE phone_normalized = ?
            """,
            (phone_norm,),
        ).fetchone()

        if existing:
            now = datetime.now(timezone.utc).isoformat()
            if not existing["phone_verified"]:
                cursor.execute(
                    "UPDATE users SET phone_verified = 1 WHERE id = ?",
                    (existing["id"],),
                )
            session_token = f"rm_token_{existing['id']}_{secrets.token_hex(12)}"
            expires_at = (datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)).isoformat()
            cursor.execute(
                "INSERT INTO user_sessions (token, user_id, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
                (session_token, existing["id"], existing["role"], now, expires_at),
            )
            conn.commit()
            refreshed = cursor.execute(
                """
                SELECT id, email, name, phone, phone_normalized, phone_verified, role,
                       preferred_language, village, district, state, created_at
                FROM users WHERE id = ?
                """,
                (existing["id"],),
            ).fetchone()
            return {
                "status": "authenticated",
                "access_token": session_token,
                "token_type": "bearer",
                "user": _build_user_response(refreshed),
                "redirect_url": _redirect_for_role(existing["role"]),
            }

        # New phone number: issue single-use server-verified proof token
        verification_token = issue_verification_token(cursor, phone_norm)
        conn.commit()
        return {
            "status": "needs_registration",
            "verification_token": verification_token,
            "masked_phone": mask_phone(phone_norm),
        }
    except HTTPException:
        conn.commit()  # persist failed attempt count / consumed timestamp
        raise
    finally:
        conn.close()


@router.post("/otp/register", status_code=status.HTTP_201_CREATED)
def register_with_otp(payload: OtpRegisterRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("BEGIN IMMEDIATE")
        phone_norm = consume_verification_token(cursor, payload.verification_token)

        existing = cursor.execute(
            "SELECT id FROM users WHERE phone_normalized = ?",
            (phone_norm,),
        ).fetchone()
        if existing:
            conn.rollback()
            raise HTTPException(
                status_code=409,
                detail="This mobile number is already registered with RaithaMitra. Please continue using your existing account.",
            )

        user_id = f"usr_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        synthetic_email = f"{phone_norm.replace('+', '')}@mobile.raithamitra.in"
        random_pwd_hash = hash_password(secrets.token_urlsafe(24))

        cursor.execute(
            """
            INSERT INTO users (
                id, email, password_hash, name, phone, phone_normalized,
                phone_verified, role, preferred_language, village, district, state, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                synthetic_email,
                random_pwd_hash,
                payload.name.strip(),
                phone_norm,
                phone_norm,
                payload.role,
                payload.preferred_language,
                payload.village,
                payload.district,
                payload.state,
                now,
            ),
        )

        if payload.role == "buyer":
            cursor.execute(
                """
                INSERT INTO buyer_profiles (id, user_id, buyer_type, business_name, delivery_address, authorized_for_nursery)
                VALUES (?, ?, ?, ?, ?, 0)
                """,
                (
                    f"buyer_{uuid.uuid4().hex[:6]}",
                    user_id,
                    payload.buyer_type or "individual",
                    payload.business_name or payload.name.strip(),
                    payload.delivery_address or f"{payload.village or ''}, {payload.district or 'Karnataka'}",
                ),
            )
        elif payload.role == "labour":
            skills_json = json.dumps(payload.skills or ["Harvesting", "Transplantation", "Weeding"])
            wage = float(payload.daily_wage_rate) if payload.daily_wage_rate and payload.daily_wage_rate > 0 else 550.0
            loc = f"{payload.village or ''}, {payload.district or 'Karnataka'}".strip(", ")
            cursor.execute(
                """
                INSERT INTO labour_profiles (id, user_id, name, phone, skills_json, daily_wage_rate, availability_status, location, rating, total_jobs_completed, total_earnings)
                VALUES (?, ?, ?, ?, ?, ?, 'available', ?, 5.0, 0, 0.0)
                """,
                (f"labour_{uuid.uuid4().hex[:6]}", user_id, payload.name.strip(), phone_norm, skills_json, wage, loc),
            )
        elif payload.role == "driver":
            cursor.execute(
                """
                INSERT INTO transport_vehicles (id, driver_id, driver_name, driver_phone, vehicle_type, vehicle_reg_number, capacity_kg, base_fare_per_km, service_area, availability_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
                """,
                (
                    f"veh_{uuid.uuid4().hex[:6]}",
                    user_id,
                    payload.name.strip(),
                    phone_norm,
                    payload.vehicle_type or "Tata Ace",
                    payload.vehicle_reg_number or f"KA-{secrets.randbelow(89)+10}-TR-{secrets.randbelow(8999)+1000}",
                    float(payload.capacity_kg) if payload.capacity_kg and payload.capacity_kg > 0 else 1500.0,
                    float(payload.base_fare_per_km) if payload.base_fare_per_km and payload.base_fare_per_km > 0 else 30.0,
                    f"{payload.district or 'Karnataka'}, State Highway routes",
                ),
            )

        session_token = f"rm_token_{user_id}_{secrets.token_hex(12)}"
        expires_at = (datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)).isoformat()
        cursor.execute(
            "INSERT INTO user_sessions (token, user_id, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
            (session_token, user_id, payload.role, now, expires_at),
        )
        conn.commit()

        row = cursor.execute(
            """
            SELECT id, email, name, phone, phone_normalized, phone_verified, role,
                   preferred_language, village, district, state, created_at
            FROM users WHERE id = ?
            """,
            (user_id,),
        ).fetchone()
        return {
            "access_token": session_token,
            "token_type": "bearer",
            "user": _build_user_response(row),
            "redirect_url": _redirect_for_role(payload.role),
        }
    except sqlite3.IntegrityError:
        conn.rollback()
        raise HTTPException(
            status_code=409,
            detail="This mobile number is already registered with RaithaMitra. Please continue using your existing account.",
        )
    except HTTPException:
        conn.rollback()
        raise
    finally:
        conn.close()


@router.post("/otp/link-phone")
def link_verified_phone(payload: OtpLinkPhoneRequest, authorization: Optional[str] = Header(None)):
    """Safely links a verified phone number to an existing password-authenticated account."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")
    token = authorization.replace("Bearer ", "").strip()

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("BEGIN IMMEDIATE")
        session = cursor.execute("SELECT user_id FROM user_sessions WHERE token = ?", (token,)).fetchone()
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired session token")

        phone_norm = consume_verification_token(cursor, payload.verification_token)
        owner = cursor.execute(
            "SELECT id FROM users WHERE phone_normalized = ? AND id != ?",
            (phone_norm, session["user_id"]),
        ).fetchone()
        if owner:
            raise HTTPException(
                status_code=409,
                detail="This mobile number is already registered with RaithaMitra. Please continue using your existing account.",
            )

        cursor.execute(
            "UPDATE users SET phone = ?, phone_normalized = ?, phone_verified = 1 WHERE id = ?",
            (phone_norm, phone_norm, session["user_id"]),
        )
        conn.commit()
        return {"linked": True, "phone_normalized": phone_norm}
    except sqlite3.IntegrityError:
        conn.rollback()
        raise HTTPException(
            status_code=409,
            detail="This mobile number is already registered with RaithaMitra. Please continue using your existing account.",
        )
    except HTTPException:
        conn.rollback()
        raise
    finally:
        conn.close()
