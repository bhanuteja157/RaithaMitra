"""
AD-23: FastAPI Router for Multilingual Agentic Agricultural AI Assistant.
"""
from __future__ import annotations

import asyncio
import json
import os
from typing import Optional

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from backend.app.db.database import get_db_connection
from backend.app.features.assistant.gemini_voice import (
    LIVE_MODEL,
    TRANSCRIBE_MODEL,
    TTS_MODEL_CHAIN,
    create_live_ephemeral_token,
    synthesize_gemini_tts,
    transcribe_audio_with_gemini,
)
from backend.app.features.assistant.schemas import (
    AssistantChatRequest,
    AssistantChatResponse,
    LiveTokenRequest,
    LiveTokenResponse,
    LiveToolExecuteRequest,
    SupportedLang,
    TranscribeResponse,
    TtsRequest,
    TtsResponse,
    VoiceTurnResponse,
)
from backend.app.features.assistant.security import (
    resolve_authenticated_user,
    sanitize_and_check_injection,
    verify_authorized_farm,
)
from backend.app.features.assistant.service import (
    cancel_pending_action,
    confirm_pending_action,
    handle_assistant_chat,
)
from backend.app.features.assistant.tool_registry import TOOL_METADATA
from backend.app.features.auth.security import check_rate_limit

router = APIRouter(prefix="/assistant", tags=["Multilingual AI Assistant (AD-23)"])


@router.get("/status")
def get_assistant_status(authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_user(authorization)
    gemini_configured = bool(os.getenv("GEMINI_API_KEY", "").strip())
    allowed_tools = [
        {"name": name, "description": meta["description"], "classification": meta["classification"]}
        for name, meta in TOOL_METADATA.items()
        if user["role"] in meta["allowed_roles"]
    ]
    return {
        "mode": "online_gemini" if gemini_configured else "local_intelligence",
        "gemini_configured": gemini_configured,
        "sdk": "google-genai",
        "live_api_available": gemini_configured,
        "tts_available": gemini_configured,
        "transcribe_available": gemini_configured,
        "live_model": LIVE_MODEL,
        "tts_model": TTS_MODEL_CHAIN[0],
        "transcribe_model": TRANSCRIBE_MODEL,
        "supported_languages": ["en", "kn", "hi", "te"],
        "role": user["role"],
        "authorized_tools": allowed_tools,
    }


@router.post("/chat", response_model=AssistantChatResponse)
async def assistant_chat(
    req: AssistantChatRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_user(authorization)
    clean_msg = sanitize_and_check_injection(req.message)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = verify_authorized_farm(cursor, req.farm_id, user["user_id"], user["role"])
        response = await handle_assistant_chat(
            cursor=cursor,
            user=user,
            farm=farm,
            message=clean_msg,
            conversation_id=req.conversation_id,
            preferred_lang=req.language,
        )
        conn.commit()
        return response
    finally:
        conn.close()


@router.get("/conversations")
def list_conversations(authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_user(authorization)
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, farm_id, language, title, created_at, updated_at
            FROM assistant_conversations
            WHERE user_id = ?
            ORDER BY updated_at DESC LIMIT 20
            """,
            (user["user_id"],),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@router.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_user(authorization)
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT * FROM assistant_conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user["user_id"]),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        return {
            "id": row["id"],
            "farm_id": row["farm_id"],
            "language": row["language"],
            "title": row["title"],
            "messages": json.loads(row["messages_json"] or "[]"),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }
    finally:
        conn.close()


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_user(authorization)
    conn = get_db_connection()
    try:
        cur = conn.execute(
            "DELETE FROM assistant_conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user["user_id"]),
        )
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        return {"deleted": True, "conversation_id": conversation_id}
    finally:
        conn.close()


@router.post("/actions/{action_id}/confirm")
def confirm_action(action_id: str, authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_user(authorization)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        res = confirm_pending_action(cursor, action_id, user)
        conn.commit()
        return res
    except HTTPException:
        conn.commit()
        raise
    finally:
        conn.close()


@router.post("/actions/{action_id}/cancel")
def cancel_action(action_id: str, authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_user(authorization)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        res = cancel_pending_action(cursor, action_id, user)
        conn.commit()
        return res
    finally:
        conn.close()


_MAX_AUDIO_BYTES = 15 * 1024 * 1024
_ALLOWED_AUDIO_MIME_PREFIXES = ("audio/", "video/webm", "application/ogg")


def _validate_audio_upload(content_type: Optional[str], raw_bytes: bytes) -> str:
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded audio clip is empty.")
    if len(raw_bytes) > _MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio clip exceeds 15 MB limit.")
    ct = (content_type or "audio/webm").split(";")[0].strip().lower()
    if not any(ct.startswith(p) for p in _ALLOWED_AUDIO_MIME_PREFIXES):
        raise HTTPException(status_code=400, detail=f"Unsupported audio format '{ct}'.")
    return ct


@router.post("/chat/stream")
async def assistant_chat_stream(
    req: AssistantChatRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_user(authorization)
    clean_msg = sanitize_and_check_injection(req.message)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = verify_authorized_farm(cursor, req.farm_id, user["user_id"], user["role"])
        response = await handle_assistant_chat(
            cursor=cursor,
            user=user,
            farm=farm,
            message=clean_msg,
            conversation_id=req.conversation_id,
            preferred_lang=req.language,
        )
        conn.commit()
    finally:
        conn.close()

    async def _sse_events():
        words = response.reply.split(" ")
        chunk_buf: list[str] = []
        for idx, word in enumerate(words):
            chunk_buf.append(word)
            if len(chunk_buf) >= 4 or idx == len(words) - 1:
                delta_text = (" ".join(chunk_buf)) + (" " if idx < len(words) - 1 else "")
                yield f"data: {json.dumps({'type': 'delta', 'text': delta_text}, ensure_ascii=False)}\n\n"
                chunk_buf = []
                await asyncio.sleep(0.01)
        yield f"data: {json.dumps({'type': 'complete', 'response': response.model_dump()}, ensure_ascii=False)}\n\n"

    return StreamingResponse(_sse_events(), media_type="text/event-stream")


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_voice_audio(
    file: UploadFile = File(...),
    language: Optional[SupportedLang] = Form(None),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_user(authorization)
    check_rate_limit(f"assistant_transcribe:{user['user_id']}", max_requests=40, window_seconds=60)
    raw_bytes = await file.read()
    mime = _validate_audio_upload(file.content_type, raw_bytes)

    res = await transcribe_audio_with_gemini(
        audio_bytes=raw_bytes,
        mime_type=mime,
        filename=file.filename or "mic_audio.webm",
        hint_language=language,
    )
    if not res:
        raise HTTPException(
            status_code=503,
            detail="Gemini audio transcription is temporarily unavailable. Please use browser speech input or text.",
        )
    return TranscribeResponse(**res)


@router.post("/tts", response_model=TtsResponse)
async def synthesize_voice_audio(
    req: TtsRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_user(authorization)
    check_rate_limit(f"assistant_tts:{user['user_id']}", max_requests=40, window_seconds=60)
    res = await synthesize_gemini_tts(text=req.text, language=req.language, voice=req.voice)
    if not res:
        raise HTTPException(
            status_code=503,
            detail="Gemini native audio TTS is temporarily unavailable; browser speech fallback can be used.",
        )
    return TtsResponse(
        audio_base64=res["audio_base64"],
        mime_type=res["mime_type"],
        model=res["model"],
        voice=res["voice"],
        language=req.language,
        provenance=res["provenance"],
    )


@router.post("/voice/turn", response_model=VoiceTurnResponse)
async def voice_turn_pipeline(
    file: UploadFile = File(...),
    farm_id: Optional[str] = Form(None),
    conversation_id: Optional[str] = Form(None),
    language: Optional[SupportedLang] = Form(None),
    include_tts: bool = Form(True),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_user(authorization)
    check_rate_limit(f"assistant_voice_turn:{user['user_id']}", max_requests=30, window_seconds=60)
    raw_bytes = await file.read()
    mime = _validate_audio_upload(file.content_type, raw_bytes)

    tr = await transcribe_audio_with_gemini(
        audio_bytes=raw_bytes,
        mime_type=mime,
        filename=file.filename or "mic_audio.webm",
        hint_language=language,
    )
    if not tr:
        raise HTTPException(
            status_code=503,
            detail="Gemini audio transcription is unavailable right now.",
        )

    clean_msg = sanitize_and_check_injection(tr["transcript"])
    eff_lang: SupportedLang = tr["detected_language"]

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = verify_authorized_farm(cursor, farm_id, user["user_id"], user["role"])
        chat_res = await handle_assistant_chat(
            cursor=cursor,
            user=user,
            farm=farm,
            message=clean_msg,
            conversation_id=conversation_id,
            preferred_lang=eff_lang,
        )
        conn.commit()
    finally:
        conn.close()

    tts_res = None
    if include_tts and chat_res.reply:
        tts_res = await synthesize_gemini_tts(text=chat_res.reply, language=chat_res.language)

    return VoiceTurnResponse(
        transcript=tr["transcript"],
        detected_language=tr["detected_language"],
        mixed_language=bool(tr.get("mixed_language")),
        transcribe_model=tr["model"],
        chat=chat_res,
        tts_audio_base64=tts_res["audio_base64"] if tts_res else None,
        tts_mime_type=tts_res["mime_type"] if tts_res else None,
        tts_model=tts_res["model"] if tts_res else None,
    )


@router.post("/live/token", response_model=LiveTokenResponse)
async def issue_live_ephemeral_token(
    req: LiveTokenRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_user(authorization)
    check_rate_limit(f"assistant_live_token:{user['user_id']}", max_requests=20, window_seconds=60)
    if req.farm_id and user["role"] not in ("farmer", "admin"):
        raise HTTPException(status_code=403, detail="Unauthorized: You cannot access another farmer's farm context.")
    conn = get_db_connection()
    try:
        farm = verify_authorized_farm(conn.cursor(), req.farm_id, user["user_id"], user["role"])
    finally:
        conn.close()

    try:
        tok = await create_live_ephemeral_token(role=user["role"], language=req.language, farm=farm)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Gemini Live API token unavailable: {type(exc).__name__}",
        ) from exc
    return LiveTokenResponse(**tok)


@router.post("/live/tool-execute", response_model=AssistantChatResponse)
async def execute_live_tool_call(
    req: LiveToolExecuteRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_user(authorization)
    args = req.arguments or {}
    if req.tool_name == "navigate_workspace":
        msg = f"Open {str(args.get('target') or 'dashboard')}"
    elif req.tool_name == "control_digital_farming":
        act = str(args.get("action") or "summary").strip().lower()
        msg = "Start the simulation" if act == "play" else (
            "Pause the simulation" if act == "pause" else (
                "Reset the simulation" if act == "reset" else "Open Digital Farming"
            )
        )
    elif req.tool_name == "execute_raithamitra_query":
        msg = str(args.get("query") or "").strip()
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported Live tool '{req.tool_name}'.")

    clean_msg = sanitize_and_check_injection(msg)
    lang_hint = req.language or args.get("language")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        farm = verify_authorized_farm(cursor, req.farm_id, user["user_id"], user["role"])
        res = await handle_assistant_chat(
            cursor=cursor,
            user=user,
            farm=farm,
            message=clean_msg,
            conversation_id=req.conversation_id,
            preferred_lang=lang_hint if lang_hint in ("en", "kn", "hi", "te") else None,
        )
        conn.commit()
        return res
    finally:
        conn.close()
