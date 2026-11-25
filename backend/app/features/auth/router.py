"""
Feature: Authentication & Role-Based Access Control (RBAC).
Provides registration, login, user profiling, and quick demo switching for judging.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Literal, List
import uuid
from datetime import datetime, timezone

from backend.app.db.database import get_db_connection

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    phone: str
    role: Literal["farmer", "buyer", "labour", "driver"]
    preferred_language: Literal["en", "kn", "hi"] = "en"
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = "Karnataka"

class UserLogin(BaseModel):
    email: str
    password: str

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

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check existing email
    existing = cursor.execute("SELECT id FROM users WHERE email = ?", (user_in.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="User with this email already registered")
        
    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    
    cursor.execute("""
    INSERT INTO users (id, email, password_hash, name, phone, role, preferred_language, village, district, state, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, user_in.email, user_in.password, user_in.name, user_in.phone,
        user_in.role, user_in.preferred_language, user_in.village, user_in.district, user_in.state, now
    ))
    
    # If labour, initialize labour profile
    if user_in.role == "labour":
        labour_id = f"labour_{uuid.uuid4().hex[:6]}"
        skills = '["Harvesting", "Transplantation", "Weeding"]'
        cursor.execute("""
        INSERT INTO labour_profiles (id, user_id, name, phone, skills_json, daily_wage_rate, availability_status, location, rating, total_jobs_completed, total_earnings)
        VALUES (?, ?, ?, ?, ?, 550.0, 'available', ?, 5.0, 0, 0.0)
        """, (labour_id, user_id, user_in.name, user_in.phone, skills, user_in.village or user_in.district or "Karnataka"))
        
    # If driver, initialize transport vehicle
    if user_in.role == "driver":
        veh_id = f"veh_{uuid.uuid4().hex[:6]}"
        cursor.execute("""
        INSERT INTO transport_vehicles (id, driver_id, driver_name, driver_phone, vehicle_type, vehicle_reg_number, capacity_kg, base_fare_per_km, service_area, availability_status)
        VALUES (?, ?, ?, ?, 'Tata Ace', 'KA-01-EXP', 1500.0, 30.0, ?, 'available')
        """, (veh_id, user_id, user_in.name, user_in.phone, user_in.district or "Karnataka"))
        
    conn.commit()
    row = cursor.execute("SELECT id, email, name, phone, role, preferred_language, village, district, state, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row)

@router.post("/login")
def login(credentials: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    user = cursor.execute("""
    SELECT id, email, password_hash, name, phone, role, preferred_language, village, district, state, created_at
    FROM users WHERE email = ?
    """, (credentials.email,)).fetchone()
    conn.close()
    
    if not user or user["password_hash"] != credentials.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    return {
        "access_token": f"token_{user['id']}_{uuid.uuid4().hex[:6]}",
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "phone": user["phone"],
            "role": user["role"],
            "preferred_language": user["preferred_language"],
            "village": user["village"],
            "district": user["district"],
            "state": user["state"],
            "created_at": user["created_at"]
        }
    }

@router.get("/demo-accounts")
def get_demo_accounts():
    """Returns safe demonstration accounts for 1-click judging evaluation."""
    return [
        {"role": "farmer", "name": "Suresh Gowda", "email": "farmer@raithamitra.in", "password": "farmer123", "description": "Mandya Organic Farmer (Tomato, Drip, 2.5 ha)"},
        {"role": "buyer", "name": "Bengaluru Fresh Foods Co", "email": "buyer1@raithamitra.in", "password": "buyer123", "description": "APMC Licensed Wholesale Buyer A"},
        {"role": "buyer", "name": "Mysuru Organic Retail Ltd", "email": "buyer2@raithamitra.in", "password": "buyer123", "description": "Retail Supermarket Chain Buyer B"},
        {"role": "labour", "name": "Basavaraj Koravara", "email": "labour@raithamitra.in", "password": "labour123", "description": "Skilled Agricultural Worker (Harvesting, Sowing)"},
        {"role": "driver", "name": "Manjunath Transport", "email": "driver@raithamitra.in", "password": "driver123", "description": "Local Goods Carrier (Tata Ace, 1500kg Capacity)"},
    ]
