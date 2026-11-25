"""
Feature: Authentication & Role-Based Access Control (RBAC).
Provides registration, login, user profiling, session management, and quick demo switching for judging.
Enforces password hashing (SHA-256 + Salt) and role authorization checks.
"""
from fastapi import APIRouter, HTTPException, Header, Depends, status
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal, List
import uuid
import hashlib
import secrets
import json
from datetime import datetime, timezone

from backend.app.db.database import get_db_connection

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


def hash_password(password: str) -> str:
    """Generate a salted SHA-256 password hash."""
    salt = secrets.token_hex(16)
    hash_val = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return f"sha256${salt}${hash_val}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verify plain password against stored hash or legacy demo plaintext."""
    if not stored_hash or not plain_password:
        return False
    # Legacy demo accounts use unhashed plaintext passwords for simplicity
    if "$" not in stored_hash:
        return secrets.compare_digest(plain_password, stored_hash)
    parts = stored_hash.split("$")
    if len(parts) == 3 and parts[0] == "sha256":
        salt, expected_hash = parts[1], parts[2]
        computed_hash = hashlib.sha256((salt + plain_password).encode("utf-8")).hexdigest()
        return secrets.compare_digest(computed_hash, expected_hash)
    return False


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
def register(user_in: UserRegister):
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
        
    # Create persistent session token
    session_token = f"rm_token_{user_id}_{secrets.token_hex(12)}"
    cursor.execute("""
    INSERT INTO user_sessions (token, user_id, role, created_at)
    VALUES (?, ?, ?, ?)
    """, (session_token, user_id, user_in.role, now))
    
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
def login(credentials: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    user = cursor.execute("""
    SELECT id, email, password_hash, name, phone, role, preferred_language, village, district, state, created_at
    FROM users WHERE LOWER(email) = ?
    """, (credentials.email.strip().lower(),)).fetchone()
    
    if not user or not verify_password(credentials.password, user["password_hash"]):
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    # Check role mismatch if role was selected on login screen
    if credentials.role and user["role"] != credentials.role:
        conn.close()
        raise HTTPException(
            status_code=403,
            detail=f"Role mismatch: account is registered as '{user['role'].capitalize()}', not '{credentials.role.capitalize()}'."
        )
        
    now = datetime.now(timezone.utc).isoformat()
    session_token = f"rm_token_{user['id']}_{secrets.token_hex(12)}"
    cursor.execute("""
    INSERT INTO user_sessions (token, user_id, role, created_at)
    VALUES (?, ?, ?, ?)
    """, (session_token, user["id"], user["role"], now))
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
    
    session = cursor.execute("SELECT user_id, role FROM user_sessions WHERE token = ?", (token,)).fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
        
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
    """Returns safe demonstration accounts for 1-click judging evaluation."""
    return [
        {
            "role": "farmer",
            "name": "Suresh Gowda",
            "email": "farmer@raithamitra.in",
            "password": "farmer123",
            "description": "Mandya Organic Farmer (Tomato, Drip, 2.5 ha)",
            "redirect_url": "/"
        },
        {
            "role": "buyer",
            "name": "Bengaluru Fresh Foods Co",
            "email": "buyer1@raithamitra.in",
            "password": "buyer123",
            "description": "APMC Licensed Wholesale Buyer A",
            "redirect_url": "/dashboard/buyer"
        },
        {
            "role": "buyer",
            "name": "Mysuru Organic Retail Ltd",
            "email": "buyer2@raithamitra.in",
            "password": "buyer123",
            "description": "Retail Supermarket Chain Buyer B",
            "redirect_url": "/dashboard/buyer"
        },
        {
            "role": "labour",
            "name": "Basavaraj Koravara",
            "email": "labour@raithamitra.in",
            "password": "labour123",
            "description": "Skilled Agricultural Worker (Harvesting, Sowing)",
            "redirect_url": "/dashboard/labour"
        },
        {
            "role": "driver",
            "name": "Manjunath Transport",
            "email": "driver@raithamitra.in",
            "password": "driver123",
            "description": "Local Goods Carrier (Tata Ace, 1500kg Capacity)",
            "redirect_url": "/dashboard/driver"
        },
    ]
