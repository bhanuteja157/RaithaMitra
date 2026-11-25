"""
AD-23: FastAPI Router for Multilingual Agentic Agricultural AI Assistant.
"""
from __future__ import annotations

import json
import os
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from backend.app.db.database import get_db_connection
from backend.app.features.assistant.schemas import AssistantChatRequest, AssistantChatResponse
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
