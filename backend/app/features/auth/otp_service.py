"""
Secure SMS OTP Verification Service (AD-14).
Uses Twilio Verify when configured in environment variables, with hashed single-use
local OTP fallback strictly for ENVIRONMENT=development testing.
Never stores or logs raw OTP codes and never returns OTP codes in API responses.
"""
import hashlib
import hmac
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import HTTPException

OTP_TTL_SECONDS = 300
RESEND_COOLDOWN_SECONDS = 30
RATE_LIMIT_WINDOW_SECONDS = 900
RATE_LIMIT_MAX_REQUESTS = 5
MAX_VERIFY_ATTEMPTS = 5
VERIFICATION_TOKEN_TTL_SECONDS = 600


def _otp_pepper() -> str:
    return os.getenv("OTP_PEPPER") or "raithamitra-dev-otp-pepper-change-in-prod"


def hash_otp(phone_normalized: str, otp_code: str) -> str:
    msg = f"{phone_normalized}:{otp_code}".encode("utf-8")
    return hmac.new(_otp_pepper().encode("utf-8"), msg, hashlib.sha256).hexdigest()


def hash_verification_token(raw_token: str) -> str:
    return hashlib.sha256(f"{_otp_pepper()}:{raw_token}".encode("utf-8")).hexdigest()


def mask_phone(phone_normalized: str) -> str:
    if len(phone_normalized) <= 6:
        return "***"
    return f"{phone_normalized[:3]} ******{phone_normalized[-4:]}"


def twilio_configured() -> bool:
    return bool(
        os.getenv("TWILIO_ACCOUNT_SID")
        and os.getenv("TWILIO_AUTH_TOKEN")
        and os.getenv("TWILIO_VERIFY_SERVICE_SID")
    )


async def send_twilio_verify_otp(phone_normalized: str) -> bool:
    sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    token = os.getenv("TWILIO_AUTH_TOKEN", "")
    service_sid = os.getenv("TWILIO_VERIFY_SERVICE_SID", "")
    url = f"https://verify.twilio.com/v2/Services/{service_sid}/Verifications"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            url,
            auth=(sid, token),
            data={"To": phone_normalized, "Channel": "sms"},
        )
        return resp.status_code in (200, 201)


async def check_twilio_verify_otp(phone_normalized: str, code: str) -> bool:
    sid = os.getenv("TWILIO_ACCOUNT_SID", "")
    token = os.getenv("TWILIO_AUTH_TOKEN", "")
    service_sid = os.getenv("TWILIO_VERIFY_SERVICE_SID", "")
    url = f"https://verify.twilio.com/v2/Services/{service_sid}/VerificationCheck"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            url,
            auth=(sid, token),
            data={"To": phone_normalized, "Code": code},
        )
        if resp.status_code == 200:
            return resp.json().get("status") == "approved"
        return False


def enforce_send_rate_limit(cursor, phone_normalized: str, now: datetime) -> None:
    recent = cursor.execute(
        """
        SELECT created_at FROM phone_otps
        WHERE phone_normalized = ?
        ORDER BY created_at DESC LIMIT 1
        """,
        (phone_normalized,),
    ).fetchone()
    if recent:
        last_dt = datetime.fromisoformat(recent["created_at"])
        elapsed = (now - last_dt).total_seconds()
        if elapsed < RESEND_COOLDOWN_SECONDS:
            wait_s = int(RESEND_COOLDOWN_SECONDS - elapsed) + 1
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {wait_s} seconds before requesting another OTP.",
            )

    window_start = (now - timedelta(seconds=RATE_LIMIT_WINDOW_SECONDS)).isoformat()
    count_row = cursor.execute(
        """
        SELECT COUNT(*) AS cnt FROM phone_otps
        WHERE phone_normalized = ? AND created_at >= ?
        """,
        (phone_normalized, window_start),
    ).fetchone()
    if count_row and count_row["cnt"] >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail="Too many OTP requests for this number. Please try again after 15 minutes.",
        )


async def dispatch_otp(cursor, phone_normalized: str) -> dict:
    now = datetime.now(timezone.utc)
    enforce_send_rate_limit(cursor, phone_normalized, now)

    env_mode = os.getenv("ENVIRONMENT", "development").lower()
    use_twilio = twilio_configured()

    if not use_twilio and env_mode != "development":
        raise HTTPException(
            status_code=503,
            detail="Live SMS OTP provider is not configured. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.",
        )

    if use_twilio:
        ok = await send_twilio_verify_otp(phone_normalized)
        if not ok:
            raise HTTPException(status_code=502, detail="Failed to dispatch SMS OTP via Twilio Verify.")
        otp_hash = "twilio_verify_managed"
        provider_label = "twilio_verify"
    else:
        raw_otp = f"{secrets.randbelow(900000) + 100000}"
        otp_hash = hash_otp(phone_normalized, raw_otp)
        provider_label = "local_dev_pending_sms_provider"

    expires_at = (now + timedelta(seconds=OTP_TTL_SECONDS)).isoformat()
    otp_id = f"otp_{uuid.uuid4().hex[:12]}"
    cursor.execute(
        """
        INSERT INTO phone_otps (id, phone_normalized, otp_hash, purpose, attempts, max_attempts, expires_at, consumed_at, created_at)
        VALUES (?, ?, ?, 'auth', 0, ?, ?, NULL, ?)
        """,
        (otp_id, phone_normalized, otp_hash, MAX_VERIFY_ATTEMPTS, expires_at, now.isoformat()),
    )

    return {
        "sent": True,
        "masked_phone": mask_phone(phone_normalized),
        "cooldown_seconds": RESEND_COOLDOWN_SECONDS,
        "expires_in_seconds": OTP_TTL_SECONDS,
        "provider": provider_label,
        "sms_configured": use_twilio,
    }


async def verify_submitted_otp(cursor, phone_normalized: str, code: str) -> None:
    clean_code = (code or "").strip()
    if len(clean_code) != 6 or not clean_code.isdigit():
        raise HTTPException(status_code=400, detail="Enter a valid 6-digit verification code.")

    now = datetime.now(timezone.utc)
    row = cursor.execute(
        """
        SELECT * FROM phone_otps
        WHERE phone_normalized = ?
        ORDER BY created_at DESC LIMIT 1
        """,
        (phone_normalized,),
    ).fetchone()

    if not row:
        raise HTTPException(status_code=400, detail="No active OTP request found. Please request a new OTP.")

    if row["consumed_at"] is not None:
        raise HTTPException(status_code=400, detail="This verification code has already been used. Request a new OTP.")

    if datetime.fromisoformat(row["expires_at"]) < now:
        raise HTTPException(status_code=400, detail="Verification code expired. Please request a new OTP.")

    if row["attempts"] >= row["max_attempts"]:
        raise HTTPException(status_code=429, detail="Maximum verification attempts exceeded. Request a new OTP.")

    if row["otp_hash"] == "twilio_verify_managed":
        valid = await check_twilio_verify_otp(phone_normalized, clean_code)
    else:
        expected_hash = hash_otp(phone_normalized, clean_code)
        valid = hmac.compare_digest(expected_hash, row["otp_hash"])

    if not valid:
        cursor.execute(
            "UPDATE phone_otps SET attempts = attempts + 1 WHERE id = ?",
            (row["id"],),
        )
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    # Replay protection: mark OTP consumed atomically
    cursor.execute(
        "UPDATE phone_otps SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL",
        (now.isoformat(), row["id"]),
    )


def issue_verification_token(cursor, phone_normalized: str) -> str:
    now = datetime.now(timezone.utc)
    raw_token = f"rm_vtok_{secrets.token_urlsafe(24)}"
    token_hash = hash_verification_token(raw_token)
    expires_at = (now + timedelta(seconds=VERIFICATION_TOKEN_TTL_SECONDS)).isoformat()
    cursor.execute(
        """
        INSERT INTO otp_verification_tokens (token_hash, phone_normalized, expires_at, consumed_at, created_at)
        VALUES (?, ?, ?, NULL, ?)
        """,
        (token_hash, phone_normalized, expires_at, now.isoformat()),
    )
    return raw_token


def consume_verification_token(cursor, raw_token: str) -> str:
    token_hash = hash_verification_token(raw_token)
    now = datetime.now(timezone.utc)
    row = cursor.execute(
        "SELECT * FROM otp_verification_tokens WHERE token_hash = ?",
        (token_hash,),
    ).fetchone()
    if not row or row["consumed_at"] is not None:
        raise HTTPException(status_code=401, detail="Invalid or already used OTP verification proof.")
    if datetime.fromisoformat(row["expires_at"]) < now:
        raise HTTPException(status_code=401, detail="OTP verification session expired. Please verify your mobile number again.")
    cursor.execute(
        "UPDATE otp_verification_tokens SET consumed_at = ? WHERE token_hash = ? AND consumed_at IS NULL",
        (now.isoformat(), token_hash),
    )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=401, detail="OTP verification proof already consumed.")
    return row["phone_normalized"]
