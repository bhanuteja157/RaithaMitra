"""
AD-23: Server-Side Authentication, RBAC, Farm Ownership & Prompt-Injection Guards.
Never trusts role claims inside chat messages; always derives identity from session tokens.
"""
from __future__ import annotations

import hashlib
import os
import re
from typing import Any, Dict, Optional

from fastapi import HTTPException

from backend.app.db.database import get_db_connection

MAX_MESSAGE_LENGTH = 1500

INJECTION_PATTERNS = [
    r"ignore\s+(?:all\s+)?previous\s+instructions",
    r"system\s+prompt",
    r"drop\s+table",
    r"union\s+select",
    r"execute\s+sql",
    r"run\s+shell",
    r"reveal\s+.*(?:api_key|otp|password|\.env|secret)",
]


def hash_session_token(token: str) -> str:
    pepper = os.getenv("OTP_PEPPER") or "raithamitra-dev-session-pepper"
    return hashlib.sha256(f"{pepper}:{token}".encode("utf-8")).hexdigest()


def resolve_authenticated_user(authorization: Optional[str]) -> Dict[str, str]:
    """
    Validate Bearer token against user_sessions.
    In local non-production mode, supports rm_demo_token_{role} for 1-click demo evaluation.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required to use the AI Assistant.")
    token = authorization.replace("Bearer ", "", 1).strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authorization token.")

    env_mode = os.getenv("ENVIRONMENT", "development").strip().lower()
    if env_mode != "production" and token.startswith("rm_demo_token_"):
        demo_role = token.replace("rm_demo_token_", "", 1).strip()
        demo_map = {
            "farmer": ("usr_farmer", "farmer", "Suresh Gowda"),
            "buyer": ("usr_buyer1", "buyer", "Bengaluru Fresh Foods Co"),
            "labour": ("usr_labour", "labour", "Basavaraj Koravara"),
            "driver": ("usr_driver", "driver", "Manjunath Transport"),
        }
        if demo_role not in demo_map:
            raise HTTPException(status_code=401, detail="Invalid demo session token.")
        uid, role, name = demo_map[demo_role]
        return {
            "user_id": uid,
            "role": role,
            "name": name,
            "session_hash": hash_session_token(token),
        }

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
    return {
        "user_id": row["user_id"],
        "role": row["role"],
        "name": row["name"],
        "session_hash": hash_session_token(token),
    }


def verify_authorized_farm(
    cursor, farm_id: Optional[str], user_id: str, role: str
) -> Optional[Dict[str, Any]]:
    """
    Return authorized farm dict for a farmer/admin, or None for non-farm roles.
    Strictly blocks cross-user farm access with HTTP 403.
    """
    if role not in ("farmer", "admin"):
        return None
    if farm_id:
        farm = cursor.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
        if not farm:
            raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found.")
        if role != "admin" and farm["farmer_id"] != user_id:
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: You cannot access another farmer's farm context.",
            )
        return dict(farm)

    # Default to user's own first farm if not specified
    own_farm = cursor.execute(
        "SELECT * FROM farms WHERE farmer_id = ? ORDER BY created_at ASC LIMIT 1",
        (user_id,),
    ).fetchone()
    return dict(own_farm) if own_farm else None


def sanitize_and_check_injection(raw_text: str) -> str:
    text = (raw_text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(text) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Message exceeds maximum allowed length of {MAX_MESSAGE_LENGTH} characters.",
        )
    lowered = text.lower()
    for pat in INJECTION_PATTERNS:
        if re.search(pat, lowered):
            raise HTTPException(
                status_code=400,
                detail="Request blocked by security policy: arbitrary instructions, SQL, shell, or secret disclosure queries are prohibited.",
            )
    return text
