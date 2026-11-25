"""
AD-23: Schemas for Multilingual Agentic Agricultural AI Assistant.
"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

SupportedLang = Literal["en", "kn", "hi", "te"]


class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1500)
    conversation_id: Optional[str] = None
    farm_id: Optional[str] = None
    language: Optional[SupportedLang] = None


class SourceReference(BaseModel):
    title: str
    source: str
    url: Optional[str] = None
    timestamp: Optional[str] = None
    limitations: Optional[str] = None


class StructuredCard(BaseModel):
    card_type: Literal[
        "weather",
        "irrigation",
        "biointel_plan",
        "financial_summary",
        "bidding_offers",
        "labour",
        "transport",
        "schemes",
        "research",
        "crop_health",
        "simulation",
        "satellite_intelligence",
        "post_harvest",
        "equipment",
        "market_intelligence",
        "decision_intelligence",
        "crop_journey",
    ]
    title: str
    metrics: Dict[str, Any] = Field(default_factory=dict)
    highlights: List[str] = Field(default_factory=list)


class PendingActionPreview(BaseModel):
    action_id: str
    action_type: Literal["labour_post", "bidding_post", "transport_book"]
    summary: str
    consequences: str
    payload: Dict[str, Any]
    expires_at: str


class ClientDirective(BaseModel):
    directive_type: Literal["navigate", "biointel_fill", "digital_farm_control"]
    route: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class AssistantChatResponse(BaseModel):
    conversation_id: str
    reply: str
    language: SupportedLang
    mode: Literal["online_gemini", "local_intelligence"]
    intent: str
    tools_used: List[str] = Field(default_factory=list)
    provenance: str
    sources: List[SourceReference] = Field(default_factory=list)
    cards: List[StructuredCard] = Field(default_factory=list)
    pending_action: Optional[PendingActionPreview] = None
    client_directive: Optional[ClientDirective] = None
    awaiting_slot: Optional[str] = None
