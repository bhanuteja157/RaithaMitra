# backend/app/features/agri_assistant/router.py
"""
Authenticated FastAPI Router for AD-23 Multilingual Agentic Agricultural Intelligence Assistant.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, status

from backend.app.features.agri_assistant.context import (
    authenticate_bearer_user,
    resolve_authorized_farm,
)
from backend.app.features.agri_assistant.conversation_store import (
    create_conversation,
    delete_owned_conversation,
    get_conversation_messages,
    get_owned_conversation,
    list_user_conversations,
)
from backend.app.features.agri_assistant.llm_provider import get_llm_status
from backend.app.features.agri_assistant.schemas import (
    ChatMessageRequest,
    ChatMessageResponse,
    ConfirmActionRequest,
    ConfirmActionResponse,
    ConversationCreateRequest,
    ConversationDetailResponse,
    ConversationSummary,
    ToolDescriptor,
)
from backend.app.features.agri_assistant.service import agri_assistant_service
from backend.app.features.agri_assistant.tool_registry import list_supported_tools

router = APIRouter(prefix="/assistant", tags=["Agri Assistant (AD-23)"])


def _get_auth_user(authorization: Optional[str] = Header(None)):
    return authenticate_bearer_user(authorization)


@router.post("/chat", response_model=ChatMessageResponse)
async def chat_with_assistant(
    req: ChatMessageRequest,
    user: dict = Depends(_get_auth_user),
):
    return await agri_assistant_service.handle_chat(user, req)


@router.get("/conversations", response_model=List[ConversationSummary])
def list_conversations(user: dict = Depends(_get_auth_user)):
    return list_user_conversations(user["id"])


@router.post("/conversations", response_model=ConversationSummary, status_code=status.HTTP_201_CREATED)
def create_new_conversation(
    req: ConversationCreateRequest,
    user: dict = Depends(_get_auth_user),
):
    farm = resolve_authorized_farm(user, req.farm_id) if req.farm_id else resolve_authorized_farm(user, None)
    return create_conversation(
        user_id=user["id"],
        farm_id=farm["id"] if farm else None,
        language=req.language,
        title=req.title,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation_detail(
    conversation_id: str,
    user: dict = Depends(_get_auth_user),
):
    conv = get_owned_conversation(conversation_id, user["id"])
    msgs = get_conversation_messages(conversation_id, user["id"])
    return ConversationDetailResponse(conversation=conv, messages=msgs)


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    user: dict = Depends(_get_auth_user),
):
    delete_owned_conversation(conversation_id, user["id"])
    return {"deleted": True, "conversation_id": conversation_id}


@router.post("/actions/confirm", response_model=ConfirmActionResponse)
def confirm_proposed_action(
    req: ConfirmActionRequest,
    user: dict = Depends(_get_auth_user),
):
    return agri_assistant_service.confirm_action(user, req)


@router.get("/tools", response_model=dict)
def get_supported_tools(user: dict = Depends(_get_auth_user)):
    tools: List[ToolDescriptor] = list_supported_tools(user.get("role", "farmer"))
    return {
        "role": user.get("role"),
        "tools": [t.model_dump() for t in tools],
        "llm_status": get_llm_status(),
    }
