"""
AD-40B: Official Google Gen AI SDK (`google-genai`) Voice, Live API, TTS & Transcription Engine.
Uses ONLY Google Gemini as the external AI provider, keeping GEMINI_API_KEY strictly server-side
and issuing short-lived ephemeral tokens for direct browser Live API WebSocket sessions.
"""
from __future__ import annotations

import asyncio
import base64
from datetime import datetime, timedelta, timezone
import os
import pathlib
import re
import tempfile
from typing import Any, Dict, List, Optional, Tuple

from google import genai
from google.genai import types

from backend.app.features.assistant.schemas import SupportedLang
from backend.app.features.assistant.tool_registry import TOOL_METADATA

TEXT_MODEL_CHAIN: Tuple[str, ...] = (
    "gemini-4-hydrogen",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
)
TTS_MODEL_CHAIN: Tuple[str, ...] = (
    "gemini-3.8-flash-lite-tts",
    "gemini-3.8-flash-tts",
)
TRANSCRIBE_MODEL = "gemini-3.5-transcribe"
TRANSCRIBE_FALLBACK_MODEL = "gemini-3.5-flash-lite"
LIVE_MODEL = "gemini-3.8-live"

LANG_NAMES: Dict[str, str] = {
    "en": "English",
    "kn": "Kannada",
    "hi": "Hindi",
    "te": "Telugu",
}

_ROMANIZED_HINTS: Dict[SupportedLang, Tuple[str, ...]] = {
    "kn": ("nanna", "naanu", "namma", "beku", "beka", "yaava", "eshtu", "hege", "illa", "ide", "maadi", "heli", "bele", "neeru", "tomato ge", "crop ge"),
    "hi": ("mera", "meri", "mere", "kitna", "kitni", "kaise", "kya", "chahiye", "batao", "dikhao", "fasal", "paani", "kharcha", "mandi bhav", "bechna"),
    "te": ("naa", "nenu", "entha", "ela", "cheppandi", "chupinchu", "panta", "neellu", "dhara", "kavali", "unnaru", "ammu", "pettubadi"),
}


def get_gemini_api_key() -> str:
    return os.getenv("GEMINI_API_KEY", "").strip()


def _build_client(api_key: str, *, api_version: str = "v1", timeout_ms: int = 18000) -> genai.Client:
    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(
            api_version=api_version,
            timeout=timeout_ms,
            retry_options=types.HttpRetryOptions(attempts=1),
        ),
    )


def detect_spoken_language(text: str, preferred: Optional[str] = None) -> Tuple[SupportedLang, bool]:
    """
    Detect language across English, Kannada, Hindi, and Telugu (native scripts + mixed Romanized speech).
    Returns (lang_code, mixed_language_detected).
    """
    raw = text or ""
    has_kn = bool(re.search(r"[\u0C80-\u0CFF]", raw))
    has_hi = bool(re.search(r"[\u0900-\u097F]", raw))
    has_te = bool(re.search(r"[\u0C00-\u0C7F]", raw))
    has_latin = bool(re.search(r"[A-Za-z]", raw))

    if has_kn:
        return "kn", has_latin
    if has_hi:
        return "hi", has_latin
    if has_te:
        return "te", has_latin

    q = raw.lower()
    scores: Dict[SupportedLang, int] = {"en": 0, "kn": 0, "hi": 0, "te": 0}
    for lang_code, hints in _ROMANIZED_HINTS.items():
        for h in hints:
            if re.search(rf"\b{re.escape(h)}\b", q):
                scores[lang_code] += 1

    best_lang = max(("kn", "hi", "te"), key=lambda lc: scores[lc])
    if scores[best_lang] > 0:
        return best_lang, True

    if preferred in ("en", "kn", "hi", "te"):
        return preferred, False  # type: ignore[return-value]
    return "en", False


def _generate_text_sync(
    *,
    api_key: str,
    prompt: str,
    system_instruction: Optional[str] = None,
    timeout_ms: int = 15000,
) -> Optional[Tuple[str, str]]:
    client_v1 = _build_client(api_key, api_version="v1", timeout_ms=timeout_ms)
    client_beta = _build_client(api_key, api_version="v1beta", timeout_ms=timeout_ms)

    full_prompt = f"{system_instruction.strip()}\n\n{prompt}" if system_instruction else prompt

    for model_id in TEXT_MODEL_CHAIN:
        try:
            inter = client_v1.interactions.create(
                model=model_id,
                input=full_prompt,
                store=False,
            )
            txt = (getattr(inter, "output_text", None) or "").strip()
            if txt:
                return txt, model_id
        except Exception:
            pass

        try:
            resp = client_beta.models.generate_content(
                model=model_id,
                contents=full_prompt,
            )
            txt = (getattr(resp, "text", None) or "").strip()
            if txt:
                return txt, model_id
        except Exception:
            continue
    return None


async def generate_gemini_text(
    *,
    prompt: str,
    system_instruction: Optional[str] = None,
    timeout_ms: int = 15000,
) -> Optional[Tuple[str, str]]:
    """Asynchronously generate text with verified Gemini models and resilient model fallback."""
    api_key = get_gemini_api_key()
    if not api_key:
        return None
    return await asyncio.to_thread(
        _generate_text_sync,
        api_key=api_key,
        prompt=prompt,
        system_instruction=system_instruction,
        timeout_ms=timeout_ms,
    )


def _transcribe_sync(
    *,
    api_key: str,
    audio_bytes: bytes,
    mime_type: str,
    filename: str,
    hint_language: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    client_beta = _build_client(api_key, api_version="v1beta", timeout_ms=25000)
    suffix = pathlib.Path(filename or "audio.webm").suffix or ".webm"
    clean_mime = (mime_type or "audio/webm").split(";")[0].strip().lower()

    tmp_path: Optional[str] = None
    uploaded = None
    transcript = ""
    model_used = TRANSCRIBE_MODEL

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tf:
            tf.write(audio_bytes)
            tmp_path = tf.name

        try:
            uploaded = client_beta.files.upload(file=tmp_path, config={"mime_type": clean_mime})
            inter = client_beta.interactions.create(
                model=TRANSCRIBE_MODEL,
                input=[
                    {
                        "type": "audio",
                        "uri": uploaded.uri,
                        "mime_type": getattr(uploaded, "mime_type", None) or clean_mime,
                    }
                ],
                store=False,
            )
            transcript = (getattr(inter, "output_text", None) or "").strip()
        except Exception:
            transcript = ""

        if not transcript:
            model_used = TRANSCRIBE_FALLBACK_MODEL
            lang_hint_txt = f" Hint language: {LANG_NAMES.get(hint_language or '', 'auto')}." if hint_language else ""
            prompt = (
                "Transcribe the user's speech accurately in its original spoken language "
                "(English, Kannada, Hindi, Telugu, or natural mixed speech). "
                "Preserve numbers, rupee amounts, weights (kg, quintal), and land units (acres, hectares). "
                "Return ONLY the transcript text." + lang_hint_txt
            )
            resp = client_beta.models.generate_content(
                model=TRANSCRIBE_FALLBACK_MODEL,
                contents=[
                    types.Part.from_bytes(data=audio_bytes, mime_type=clean_mime),
                    prompt,
                ],
            )
            transcript = (getattr(resp, "text", None) or "").strip()
    finally:
        if uploaded and getattr(uploaded, "name", None):
            try:
                client_beta.files.delete(name=uploaded.name)
            except Exception:
                pass
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    if not transcript:
        return None

    detected_lang, mixed = detect_spoken_language(transcript, preferred=hint_language)
    return {
        "transcript": transcript,
        "detected_language": detected_lang,
        "mixed_language": mixed,
        "model": model_used,
        "provenance": f"Gemini Audio Transcription ({model_used})",
    }


async def transcribe_audio_with_gemini(
    *,
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
    filename: str = "mic_audio.webm",
    hint_language: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    api_key = get_gemini_api_key()
    if not api_key or not audio_bytes:
        return None
    return await asyncio.to_thread(
        _transcribe_sync,
        api_key=api_key,
        audio_bytes=audio_bytes,
        mime_type=mime_type,
        filename=filename,
        hint_language=hint_language,
    )


def _synthesize_tts_sync(
    *,
    api_key: str,
    text: str,
    language: str = "en",
    voice: str = "Kore",
    style: str = "clear, friendly, natural agricultural advisor",
) -> Optional[Dict[str, Any]]:
    client_beta = _build_client(api_key, api_version="v1beta", timeout_ms=25000)
    clean_text = (text or "").strip()[:1200]
    if not clean_text:
        return None

    for tts_model in TTS_MODEL_CHAIN:
        try:
            inter = client_beta.interactions.create(
                model=tts_model,
                input=[
                    {
                        "type": "user_input",
                        "content": [
                            {
                                "type": "text",
                                "text": clean_text,
                                "annotations": [{"type": "speech_metadata", "style": style}],
                            }
                        ],
                    }
                ],
                response_format={"type": "audio"},
                generation_config={"speech_config": [{"voice": voice}]},
                store=False,
            )
            audio_obj = getattr(inter, "output_audio", None)
            b64_data = getattr(audio_obj, "data", None) if audio_obj else None
            if b64_data:
                raw_bytes = base64.b64decode(b64_data)
                if len(raw_bytes) > 44:
                    return {
                        "audio_bytes": raw_bytes,
                        "audio_base64": b64_data,
                        "mime_type": getattr(audio_obj, "mime_type", None) or "audio/wav",
                        "model": tts_model,
                        "voice": voice,
                        "language": language,
                        "provenance": f"Gemini Native Audio TTS ({tts_model})",
                    }
        except Exception:
            continue
    return None


async def synthesize_gemini_tts(
    *,
    text: str,
    language: str = "en",
    voice: str = "Kore",
) -> Optional[Dict[str, Any]]:
    api_key = get_gemini_api_key()
    if not api_key or not text.strip():
        return None
    return await asyncio.to_thread(
        _synthesize_tts_sync,
        api_key=api_key,
        text=text,
        language=language,
        voice=voice,
    )


def get_live_function_declarations(role: str) -> List[Dict[str, Any]]:
    """Build role-authorized Gemini Live function declarations."""
    declarations: List[Dict[str, Any]] = [
        {
            "name": "navigate_workspace",
            "description": "Navigate the RaithaMitra UI to an authorized section (biointel, digital-farming, smart-market, crop-health, finance-benefits, decision-intelligence, post-harvest, transport, labour, or dashboard).",
            "parameters": {
                "type": "object",
                "properties": {
                    "target": {"type": "string", "description": "Destination workspace name or natural phrase."},
                },
                "required": ["target"],
            },
        },
        {
            "name": "control_digital_farming",
            "description": "Control the Digital Farming 3D/2D simulation (start, play, pause, reset, or summary).",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {"type": "string", "enum": ["play", "pause", "reset", "summary"]},
                },
                "required": ["action"],
            },
        },
        {
            "name": "execute_raithamitra_query",
            "description": "Run a verified RaithaMitra backend query or workflow (irrigation/weather, soil, BioIntel seed planning, finances, today's market prices, buyer discovery, crop doctor, decision intelligence, post-harvest, or crop journey).",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural language agricultural query or slot update."},
                    "language": {"type": "string", "enum": ["en", "kn", "hi", "te"]},
                },
                "required": ["query"],
            },
        },
    ]
    allowed_read = [
        name for name, meta in TOOL_METADATA.items()
        if role in meta["allowed_roles"] and meta["classification"] == "read_only"
    ]
    if allowed_read:
        declarations[2]["description"] += f" Authorized tools for {role}: {', '.join(allowed_read)}."
    return declarations


def build_live_system_instruction(
    *,
    role: str,
    language: SupportedLang,
    farm: Optional[Dict[str, Any]],
) -> str:
    farm_ctx = (
        f"Active farm: {farm.get('farm_name')} | Primary crop: {farm.get('primary_crop')} | "
        f"District: {farm.get('district')} | Area: {farm.get('land_area_ha')} ha | Soil: {farm.get('soil_type')}."
        if farm
        else f"Active user role: {role}."
    )
    return (
        f"You are RaithaMitra AI Voice Companion assisting a {role} in Karnataka/India. "
        f"Current UI language preference: {LANG_NAMES.get(language, 'English')}.\n"
        f"{farm_ctx}\n"
        "CONVERSATION RULES:\n"
        "1. Automatically understand English, Kannada, Hindi, Telugu, and mixed speech (Kanglish/Hinglish/Tenglish), and reply naturally in the user's spoken language.\n"
        "2. Keep spoken replies concise, warm, and natural (2-4 sentences) like ChatGPT Voice.\n"
        "3. Whenever the user asks about weather, irrigation, finances, market prices, buyers, crop health, BioIntel seed planning, crop journey, or asks to open/control a workspace, call `execute_raithamitra_query`, `navigate_workspace`, or `control_digital_farming` FIRST instead of guessing.\n"
        "4. NEVER fabricate prices, ledger expenses, profit, yields, or chemical dosages. Use Indian Rupee (₹) and exact kg/quintal/acre/hectare units."
    )


def _create_live_token_sync(
    *,
    api_key: str,
    role: str,
    language: SupportedLang,
    farm: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    client_beta = _build_client(api_key, api_version="v1beta", timeout_ms=15000)
    now = datetime.now(timezone.utc)
    expire_at = now + timedelta(minutes=30)
    new_session_expire_at = now + timedelta(minutes=2)

    system_instruction = build_live_system_instruction(role=role, language=language, farm=farm)
    declarations = get_live_function_declarations(role)

    token = client_beta.auth_tokens.create(
        config={
            "uses": 1,
            "expire_time": expire_at,
            "new_session_expire_time": new_session_expire_at,
            "live_connect_constraints": {
                "model": LIVE_MODEL,
                "config": {
                    "session_resumption": {},
                    "response_modalities": ["AUDIO"],
                    "input_audio_transcription": {},
                    "output_audio_transcription": {},
                    "system_instruction": system_instruction,
                    "tools": [{"function_declarations": declarations}],
                },
            },
        }
    )
    tok_name = getattr(token, "name", None)
    if not tok_name:
        raise RuntimeError("Gemini ephemeral token creation returned an empty token.")

    return {
        "token": tok_name,
        "model": LIVE_MODEL,
        "api_version": "v1beta",
        "expires_at": expire_at.isoformat(),
        "system_instruction": system_instruction,
        "tools": [{"function_declarations": declarations}],
        "supported_languages": ["en", "kn", "hi", "te"],
    }


async def create_live_ephemeral_token(
    *,
    role: str,
    language: SupportedLang,
    farm: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    api_key = get_gemini_api_key()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured on the backend.")
    return await asyncio.to_thread(
        _create_live_token_sync,
        api_key=api_key,
        role=role,
        language=language,
        farm=farm,
    )
