// frontend/src/lib/assistantApi.ts
import { AssistantLanguage } from '@/lib/assistantVoice';

export interface ToolExecutionStep {
  tool_name: string;
  label: string;
  status: 'completed' | 'unavailable' | 'failed' | 'skipped';
  summary: string;
  duration_ms: number;
  data_quality?: string | null;
}

export interface EvidenceSource {
  source: string;
  timestamp: string;
  data_quality: string;
  assumptions: string[];
  limitations: string[];
  url?: string | null;
}

export interface SuggestedAction {
  id: string;
  label: string;
  action_type: 'navigate' | 'execute_confirmed' | 'prefill';
  route?: string | null;
  requires_confirmation: boolean;
  confirmation_id?: string | null;
  action_kind?: string | null;
  payload: Record<string, any>;
}

export interface ResponseCard {
  card_type:
    | 'crop_recommendation'
    | 'weather_advisory'
    | 'irrigation'
    | 'market_comparison'
    | 'crop_diagnosis'
    | 'transaction_confirmation'
    | 'schemes'
    | 'labour'
    | 'bidding'
    | 'transport'
    | 'digital_farm'
    | 'soil'
    | 'finance';
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  data: Record<string, any>;
  actions: SuggestedAction[];
}

export interface ProactiveAlert {
  id: string;
  severity: 'info' | 'warning' | 'high' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  action_route?: string | null;
}

export interface ChatMessageResponse {
  conversation_id: string;
  message_id: string;
  reply: string;
  language: AssistantLanguage;
  intent: string;
  tools_executed: ToolExecutionStep[];
  cards: ResponseCard[];
  alerts: ProactiveAlert[];
  citations: EvidenceSource[];
  suggested_actions: SuggestedAction[];
  follow_up_questions: string[];
  memory_snapshot: Record<string, any>;
  llm_provider_used: string;
  offline_fallback: boolean;
  timestamp: string;
}

export interface ConversationSummary {
  id: string;
  user_id: string;
  farm_id?: string | null;
  language: AssistantLanguage;
  title: string;
  memory: Record<string, any>;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface StoredMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  language: AssistantLanguage;
  intent?: string | null;
  tools_executed: ToolExecutionStep[];
  cards: ResponseCard[];
  alerts: ProactiveAlert[];
  citations: EvidenceSource[];
  suggested_actions: SuggestedAction[];
  follow_ups: string[];
  metadata: Record<string, any>;
  created_at: string;
}

export interface ConversationDetailResponse {
  conversation: ConversationSummary;
  messages: StoredMessage[];
}

export interface ToolDescriptor {
  tool_id: string;
  name: string;
  description: string;
  allowed_roles: string[];
  requires_confirmation: boolean;
  status: 'operational' | 'unavailable';
  unavailable_reason?: string | null;
}

export interface ToolsStatusResponse {
  role: string;
  tools: ToolDescriptor[];
  llm_status: {
    configured_preference: string;
    gemini_configured: boolean;
    gemini_model: string;
    openai_configured: boolean;
    openai_model: string;
    offline_fallback_ready: boolean;
  };
}

export interface ConfirmActionResponse {
  confirmation_id: string;
  status: 'executed' | 'cancelled' | 'rejected' | 'already_processed';
  message: string;
  result?: Record<string, any> | null;
  route?: string | null;
}

const API_BASE = () => process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const assistantApi = {
  chat: (
    token: string,
    payload: {
      message: string;
      conversation_id?: string | null;
      farm_id?: string | null;
      language: AssistantLanguage;
      digital_farm_context?: Record<string, any> | null;
      market_context?: Record<string, any> | null;
    }
  ) =>
    apiFetch<ChatMessageResponse>('/assistant/chat', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listConversations: (token: string) =>
    apiFetch<ConversationSummary[]>('/assistant/conversations', token),

  createConversation: (
    token: string,
    payload: { farm_id?: string | null; language: AssistantLanguage; title?: string }
  ) =>
    apiFetch<ConversationSummary>('/assistant/conversations', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getConversation: (token: string, conversationId: string) =>
    apiFetch<ConversationDetailResponse>(`/assistant/conversations/${conversationId}`, token),

  deleteConversation: (token: string, conversationId: string) =>
    apiFetch<{ deleted: boolean; conversation_id: string }>(
      `/assistant/conversations/${conversationId}`,
      token,
      { method: 'DELETE' }
    ),

  confirmAction: (
    token: string,
    confirmationId: string,
    decision: 'confirm' | 'cancel'
  ) =>
    apiFetch<ConfirmActionResponse>('/assistant/actions/confirm', token, {
      method: 'POST',
      body: JSON.stringify({ confirmation_id: confirmationId, decision }),
    }),

  getTools: (token: string) =>
    apiFetch<ToolsStatusResponse>('/assistant/tools', token),
};
