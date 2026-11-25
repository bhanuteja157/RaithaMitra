# backend/app/features/agri_assistant/safety.py
"""
Security, RBAC, Input Validation, Prompt Injection Resistance, Rate Limiting,
and Secret Redaction for AD-23 Agricultural Assistant.
"""
import os
import re
import time
from collections import defaultdict, deque
from typing import Deque, Dict, List, Optional, Tuple
from fastapi import HTTPException

MAX_MESSAGE_LENGTH = 2000
MAX_CONTEXT_MESSAGES = 20

# Strict server-side allowlist mapping each tool to permitted roles
TOOL_ROLE_ALLOWLIST: Dict[str, List[str]] = {
    "farm_context": ["farmer", "admin"],
    "weather_intelligence": ["farmer", "buyer", "labour", "driver", "admin"],
    "biointel": ["farmer", "buyer", "admin"],
    "precision_irrigation": ["farmer", "admin"],
    "soil_intelligence": ["farmer", "admin"],
    "crop_doctor": ["farmer", "admin"],
    "digital_farm": ["farmer", "admin"],
    "labour_connect": ["farmer", "labour", "admin"],
    "smart_bidding": ["farmer", "buyer", "admin"],
    "transport_connect": ["farmer", "buyer", "driver", "admin"],
    "market_intelligence": ["farmer", "buyer", "admin"],
    "finance": ["farmer", "admin"],
    "government_schemes": ["farmer", "buyer", "labour", "driver", "admin"],
}

# Consequential write operations requiring explicit confirmation and role authorization
ACTION_ROLE_ALLOWLIST: Dict[str, List[str]] = {
    "labour_post": ["farmer", "admin"],
    "bidding_post": ["farmer", "admin"],
    "transport_book": ["farmer", "buyer", "admin"],
}

# Prompt injection / code / SQL execution patterns
_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+|any\s+|your\s+)?(previous|prior|above|system)\s+(instructions?|prompts?|rules?)", re.I),
    re.compile(r"disregard\s+(all\s+|previous\s+)?(instructions?|prompts?|rules?)", re.I),
    re.compile(r"(reveal|show|print|dump|leak|output|tell me)\s+(your\s+)?(system\s*prompt|developer\s*prompt|hidden\s*instructions?|api[_\s-]*key|secret|password|token|env|environment\s*variables?)", re.I),
    re.compile(r"\b(GEMINI_API_KEY|OPENAI_API_KEY|TWILIO_AUTH_TOKEN|SUPABASE_SERVICE_ROLE_KEY|OTP_PEPPER)\b", re.I),
    re.compile(r"\b(drop\s+table|delete\s+from|truncate\s+table|union\s+select|select\s+\*\s+from|insert\s+into\s+users)\b", re.I),
    re.compile(r"(;\s*--\s*|\bexec\s*\(|\beval\s*\(|__import__|os\.environ|subprocess\.|rm\s+-rf)", re.I),
    re.compile(r"<\s*script\b", re.I),
    re.compile(r"(override|bypass)\s+(rbac|role|auth|authorization|permissions?|security)", re.I),
    re.compile(r"(pretend|act)\s+(that\s+)?you\s+are\s+(an?\s+)?(admin|root|superuser|database)", re.I),
]

# Simple in-memory sliding window rate limiter: 60 requests / 60s per user
_RATE_BUCKETS: Dict[str, Deque[float]] = defaultdict(deque)
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("ASSISTANT_RATE_LIMIT_PER_MIN", "60"))
RATE_LIMIT_WINDOW_S = 60.0


def reset_rate_limits() -> None:
    """Test helper to clear rate-limit counters."""
    _RATE_BUCKETS.clear()


def enforce_rate_limit(user_id: str) -> None:
    now = time.monotonic()
    bucket = _RATE_BUCKETS[user_id]
    while bucket and (now - bucket[0]) > RATE_LIMIT_WINDOW_S:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail="Too many assistant requests. Please wait a moment and try again.",
        )
    bucket.append(now)


def sanitize_and_validate_message(raw_text: str) -> str:
    if not isinstance(raw_text, str):
        raise HTTPException(status_code=400, detail="Message must be a text string.")
    # Strip ASCII control chars except newlines and tabs
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", raw_text).strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(cleaned) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Message exceeds maximum allowed length of {MAX_MESSAGE_LENGTH} characters.",
        )
    matched, reason = detect_prompt_injection(cleaned)
    if matched:
        raise HTTPException(
            status_code=400,
            detail=f"Request rejected by security policy: {reason}",
        )
    return cleaned


def detect_prompt_injection(text: str) -> Tuple[bool, Optional[str]]:
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(text):
            return (
                True,
                "Potential prompt injection, secret extraction, or unauthorized command execution detected.",
            )
    return False, None


def is_tool_allowed_for_role(tool_name: str, role: str) -> bool:
    allowed = TOOL_ROLE_ALLOWLIST.get(tool_name, [])
    return role in allowed


def is_action_allowed_for_role(action_kind: str, role: str) -> bool:
    allowed = ACTION_ROLE_ALLOWLIST.get(action_kind, [])
    return role in allowed


def redact_secrets(text: str) -> str:
    if not text:
        return text
    result = text
    secret_env_names = [
        "GEMINI_API_KEY",
        "OPENAI_API_KEY",
        "GOOGLE_PLACES_API_KEY",
        "GOOGLE_ROUTES_API_KEY",
        "TWILIO_AUTH_TOKEN",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_KEY",
        "OTP_PEPPER",
    ]
    for env_name in secret_env_names:
        val = os.getenv(env_name, "")
        if val and len(val) >= 6:
            result = result.replace(val, "[REDACTED]")
    result = re.sub(r"AIza[0-9A-Za-z\-_]{20,}", "[REDACTED_API_KEY]", result)
    result = re.sub(r"sk-[0-9A-Za-z\-_]{20,}", "[REDACTED_API_KEY]", result)
    return result


def wrap_untrusted_text(value: str, max_len: int = 400) -> str:
    """Neutralizes retrieved external text before inserting into an LLM prompt."""
    cleaned = re.sub(r"</?untrusted[^>]*>", "", str(value or ""), flags=re.I)
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", cleaned).strip()
    if len(cleaned) > max_len:
        cleaned = cleaned[:max_len] + "..."
    return cleaned
