# backend/app/features/agri_assistant/conversation_store.py
"""
Persistent SQLite Conversation & Confirmation Store for AD-23.
Enforces strict user isolation and idempotent confirmation execution.
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.features.agri_assistant.safety import MAX_CONTEXT_MESSAGES
from backend.app.features.agri_assistant.schemas import (
    ConversationSummary,
    StoredMessage,
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_conversation(
    user_id: str,
    farm_id: Optional[str] = None,
    language: str = "en",
    title: Optional[str] = None,
    initial_memory: Optional[Dict[str, Any]] = None,
) -> ConversationSummary:
    conv_id = f"conv_{uuid.uuid4().hex[:10]}"
    now = _now_iso()
    clean_title = (title or "New Farming Consultation").strip()[:120]
    mem_json = json.dumps(initial_memory or {})

    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO agri_conversations (id, user_id, farm_id, language, title, memory_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (conv_id, user_id, farm_id, language, clean_title, mem_json, now, now),
        )
        conn.commit()
    finally:
        conn.close()

    return ConversationSummary(
        id=conv_id,
        user_id=user_id,
        farm_id=farm_id,
        language=language,  # type: ignore[arg-type]
        title=clean_title,
        memory=initial_memory or {},
        message_count=0,
        created_at=now,
        updated_at=now,
    )


def list_user_conversations(user_id: str) -> List[ConversationSummary]:
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT c.*, COUNT(m.id) AS msg_count
            FROM agri_conversations c
            LEFT JOIN agri_messages m ON m.conversation_id = c.id
            WHERE c.user_id = ?
            GROUP BY c.id
            ORDER BY c.updated_at DESC
            LIMIT 50
            """,
            (user_id,),
        ).fetchall()
        result: List[ConversationSummary] = []
        for r in rows:
            result.append(
                ConversationSummary(
                    id=r["id"],
                    user_id=r["user_id"],
                    farm_id=r["farm_id"],
                    language=r["language"],
                    title=r["title"],
                    memory=json.loads(r["memory_json"] or "{}"),
                    message_count=int(r["msg_count"] or 0),
                    created_at=r["created_at"],
                    updated_at=r["updated_at"],
                )
            )
        return result
    finally:
        conn.close()


def get_owned_conversation(
    conversation_id: str,
    user_id: str,
) -> ConversationSummary:
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT c.*, COUNT(m.id) AS msg_count
            FROM agri_conversations c
            LEFT JOIN agri_messages m ON m.conversation_id = c.id
            WHERE c.id = ?
            GROUP BY c.id
            """,
            (conversation_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Conversation not found.")
        if row["user_id"] != user_id:
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: You do not have access to this conversation.",
            )
        return ConversationSummary(
            id=row["id"],
            user_id=row["user_id"],
            farm_id=row["farm_id"],
            language=row["language"],
            title=row["title"],
            memory=json.loads(row["memory_json"] or "{}"),
            message_count=int(row["msg_count"] or 0),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
    finally:
        conn.close()


def get_conversation_messages(
    conversation_id: str,
    user_id: str,
    limit: int = MAX_CONTEXT_MESSAGES,
) -> List[StoredMessage]:
    # Ensure ownership first
    get_owned_conversation(conversation_id, user_id)
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT * FROM agri_messages
            WHERE conversation_id = ? AND user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (conversation_id, user_id, limit),
        ).fetchall()
        rows_asc = list(reversed(rows))
        messages: List[StoredMessage] = []
        for r in rows_asc:
            messages.append(
                StoredMessage(
                    id=r["id"],
                    conversation_id=r["conversation_id"],
                    role=r["role"],
                    content=r["content"],
                    language=r["language"],
                    intent=r["intent"],
                    tools_executed=json.loads(r["tools_executed_json"] or "[]"),
                    cards=json.loads(r["cards_json"] or "[]"),
                    alerts=json.loads(r["alerts_json"] or "[]"),
                    citations=json.loads(r["citations_json"] or "[]"),
                    suggested_actions=json.loads(r["suggested_actions_json"] or "[]"),
                    follow_ups=json.loads(r["follow_ups_json"] or "[]"),
                    metadata=json.loads(r["metadata_json"] or "{}"),
                    created_at=r["created_at"],
                )
            )
        return messages
    finally:
        conn.close()


def update_conversation_state(
    conversation_id: str,
    user_id: str,
    farm_id: Optional[str],
    language: str,
    memory: Dict[str, Any],
    title: Optional[str] = None,
) -> None:
    now = _now_iso()
    conn = get_db_connection()
    try:
        if title:
            conn.execute(
                """
                UPDATE agri_conversations
                SET farm_id = ?, language = ?, memory_json = ?, title = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (farm_id, language, json.dumps(memory), title[:120], now, conversation_id, user_id),
            )
        else:
            conn.execute(
                """
                UPDATE agri_conversations
                SET farm_id = ?, language = ?, memory_json = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (farm_id, language, json.dumps(memory), now, conversation_id, user_id),
            )
        conn.commit()
    finally:
        conn.close()


def append_message(
    conversation_id: str,
    user_id: str,
    role: str,
    content: str,
    language: str = "en",
    intent: Optional[str] = None,
    tools_executed: Optional[List[Dict[str, Any]]] = None,
    cards: Optional[List[Dict[str, Any]]] = None,
    alerts: Optional[List[Dict[str, Any]]] = None,
    citations: Optional[List[Dict[str, Any]]] = None,
    suggested_actions: Optional[List[Dict[str, Any]]] = None,
    follow_ups: Optional[List[str]] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> str:
    msg_id = f"msg_{uuid.uuid4().hex[:10]}"
    now = _now_iso()
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO agri_messages (
                id, conversation_id, user_id, role, content, language, intent,
                tools_executed_json, cards_json, alerts_json, citations_json,
                suggested_actions_json, follow_ups_json, metadata_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                msg_id,
                conversation_id,
                user_id,
                role,
                content,
                language,
                intent,
                json.dumps(tools_executed or []),
                json.dumps(cards or []),
                json.dumps(alerts or []),
                json.dumps(citations or []),
                json.dumps(suggested_actions or []),
                json.dumps(follow_ups or []),
                json.dumps(metadata or {}),
                now,
            ),
        )
        conn.execute(
            "UPDATE agri_conversations SET updated_at = ? WHERE id = ? AND user_id = ?",
            (now, conversation_id, user_id),
        )
        conn.commit()
        return msg_id
    finally:
        conn.close()


def delete_owned_conversation(conversation_id: str, user_id: str) -> None:
    get_owned_conversation(conversation_id, user_id)
    conn = get_db_connection()
    try:
        conn.execute(
            "DELETE FROM agri_conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user_id),
        )
        conn.commit()
    finally:
        conn.close()


def create_pending_confirmation(
    conversation_id: str,
    user_id: str,
    farm_id: Optional[str],
    action_type: str,
    payload: Dict[str, Any],
    summary: str,
) -> str:
    conf_id = f"conf_{uuid.uuid4().hex[:10]}"
    idem_key = f"{user_id}:{action_type}:{uuid.uuid4().hex[:12]}"
    now = _now_iso()
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO agri_action_confirmations (
                id, conversation_id, user_id, farm_id, action_type, payload_json,
                summary, idempotency_key, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
            """,
            (
                conf_id,
                conversation_id,
                user_id,
                farm_id,
                action_type,
                json.dumps(payload),
                summary,
                idem_key,
                now,
                now,
            ),
        )
        conn.commit()
        return conf_id
    finally:
        conn.close()


def get_owned_confirmation(confirmation_id: str, user_id: str) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        row = conn.execute(
            "SELECT * FROM agri_action_confirmations WHERE id = ?",
            (confirmation_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Action confirmation record not found.")
        if row["user_id"] != user_id:
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: You cannot confirm or cancel another user's proposed action.",
            )
        return dict(row)
    finally:
        conn.close()


def finalize_confirmation_status(
    confirmation_id: str,
    user_id: str,
    new_status: str,
    result: Optional[Dict[str, Any]] = None,
) -> None:
    now = _now_iso()
    conn = get_db_connection()
    try:
        conn.execute(
            """
            UPDATE agri_action_confirmations
            SET status = ?, result_json = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (new_status, json.dumps(result) if result is not None else None, now, confirmation_id, user_id),
        )
        conn.commit()
    finally:
        conn.close()
