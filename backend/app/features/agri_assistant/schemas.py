# backend/app/features/agri_assistant/schemas.py
"""
Pydantic v2 contracts for AD-23 Multilingual Agentic Agricultural Intelligence Assistant.
"""
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

SupportedLanguage = Literal["en", "kn", "hi", "te"]

DataQualityType = Literal[
    "live",
    "measured",
    "forecast",
    "modeled",
    "simulated",
    "user_provided",
    "demo",
    "official",
    "unavailable",
]


class ToolExecutionStep(BaseModel):
    tool_name: str
    label: str
    status: Literal["completed", "unavailable", "failed", "skipped"]
    summary: str
    duration_ms: int = 0
    data_quality: Optional[str] = None


class EvidenceSource(BaseModel):
    source: str
    timestamp: str
    data_quality: str
    assumptions: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    url: Optional[str] = None


class SuggestedAction(BaseModel):
    id: str
    label: str
    action_type: Literal["navigate", "execute_confirmed", "prefill"]
    route: Optional[str] = None
    requires_confirmation: bool = False
    confirmation_id: Optional[str] = None
    action_kind: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class ResponseCard(BaseModel):
    card_type: Literal[
        "crop_recommendation",
        "weather_advisory",
        "irrigation",
        "market_comparison",
        "crop_diagnosis",
        "transaction_confirmation",
        "schemes",
        "labour",
        "bidding",
        "transport",
        "digital_farm",
        "soil",
        "finance",
    ]
    title: str
    subtitle: Optional[str] = None
    badge: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    actions: List[SuggestedAction] = Field(default_factory=list)


class ProactiveAlert(BaseModel):
    id: str
    severity: Literal["info", "warning", "high", "critical"]
    title: str
    message: str
    source: str
    timestamp: str
    action_route: Optional[str] = None


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None
    farm_id: Optional[str] = None
    language: SupportedLanguage = "en"
    digital_farm_context: Optional[Dict[str, Any]] = None
    market_context: Optional[Dict[str, Any]] = None


class ChatMessageResponse(BaseModel):
    conversation_id: str
    message_id: str
    reply: str
    language: SupportedLanguage
    intent: str
    tools_executed: List[ToolExecutionStep] = Field(default_factory=list)
    cards: List[ResponseCard] = Field(default_factory=list)
    alerts: List[ProactiveAlert] = Field(default_factory=list)
    citations: List[EvidenceSource] = Field(default_factory=list)
    suggested_actions: List[SuggestedAction] = Field(default_factory=list)
    follow_up_questions: List[str] = Field(default_factory=list)
    memory_snapshot: Dict[str, Any] = Field(default_factory=dict)
    llm_provider_used: str = "deterministic_offline"
    offline_fallback: bool = False
    timestamp: str


class ConversationCreateRequest(BaseModel):
    farm_id: Optional[str] = None
    language: SupportedLanguage = "en"
    title: Optional[str] = Field(default=None, max_length=120)


class ConversationSummary(BaseModel):
    id: str
    user_id: str
    farm_id: Optional[str] = None
    language: SupportedLanguage = "en"
    title: str
    memory: Dict[str, Any] = Field(default_factory=dict)
    message_count: int = 0
    created_at: str
    updated_at: str


class StoredMessage(BaseModel):
    id: str
    conversation_id: str
    role: Literal["user", "assistant", "system"]
    content: str
    language: SupportedLanguage = "en"
    intent: Optional[str] = None
    tools_executed: List[ToolExecutionStep] = Field(default_factory=list)
    cards: List[ResponseCard] = Field(default_factory=list)
    alerts: List[ProactiveAlert] = Field(default_factory=list)
    citations: List[EvidenceSource] = Field(default_factory=list)
    suggested_actions: List[SuggestedAction] = Field(default_factory=list)
    follow_up_questions: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str


class ConversationDetailResponse(BaseModel):
    conversation: ConversationSummary
    messages: List[StoredMessage] = Field(default_factory=list)


class ConfirmActionRequest(BaseModel):
    confirmation_id: str = Field(..., min_length=4, max_length=64)
    decision: Literal["confirm", "cancel"]


class ConfirmActionResponse(BaseModel):
    confirmation_id: str
    status: Literal["executed", "cancelled", "rejected", "already_processed"]
    message: str
    result: Optional[Dict[str, Any]] = None
    route: Optional[str] = None


class ToolDescriptor(BaseModel):
    tool_id: str
    name: str
    description: str
    allowed_roles: List[str]
    requires_confirmation: bool = False
    status: Literal["operational", "unavailable"] = "operational"
    unavailable_reason: Optional[str] = None
