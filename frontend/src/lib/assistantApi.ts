// frontend/src/lib/assistantApi.ts
// Authenticated client for AD-23 Multilingual Agentic Agricultural AI Assistant.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export interface SourceReference {
  title: string;
  source: string;
  url?: string | null;
  timestamp?: string | null;
  limitations?: string | null;
}

export interface StructuredCard {
  card_type: string;
  title: string;
  metrics: Record<string, string | number>;
  highlights: string[];
}

export interface PendingActionPreview {
  action_id: string;
  action_type: 'labour_post' | 'bidding_post' | 'transport_book';
  summary: string;
  consequences: string;
  payload: Record<string, unknown>;
  expires_at: string;
}

export interface ClientDirective {
  directive_type: 'navigate' | 'biointel_fill' | 'digital_farm_control';
  route?: string | null;
  payload: Record<string, unknown>;
}

export interface AssistantChatResponse {
  conversation_id: string;
  reply: string;
  language: 'en' | 'kn' | 'hi' | 'te';
  mode: 'online_gemini' | 'local_intelligence';
  intent: string;
  tools_used: string[];
  provenance: string;
  sources: SourceReference[];
  cards: StructuredCard[];
  pending_action?: PendingActionPreview | null;
  client_directive?: ClientDirective | null;
  awaiting_slot?: string | null;
}

export interface ConversationSummary {
  id: string;
  farm_id?: string | null;
  language: string;
  title: string;
  created_at: string;
  updated_at: string;
}

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function fetchAssistantStatus(token: string | null): Promise<{
  mode: 'online_gemini' | 'local_intelligence';
  gemini_configured: boolean;
  supported_languages: string[];
  role: string;
}> {
  const res = await fetch(`${BASE_URL}/assistant/status`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Unable to fetch assistant status.');
  return res.json();
}

export async function sendAssistantMessage(
  payload: {
    message: string;
    conversation_id?: string | null;
    farm_id?: string | null;
    language?: string;
  },
  token: string | null
): Promise<AssistantChatResponse> {
  const res = await fetch(`${BASE_URL}/assistant/chat`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Assistant request failed.');
  }
  return res.json();
}

export async function listAssistantConversations(token: string | null): Promise<ConversationSummary[]> {
  const res = await fetch(`${BASE_URL}/assistant/conversations`, {
    headers: authHeaders(token),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function loadAssistantConversation(
  conversationId: string,
  token: string | null
): Promise<{ id: string; messages: Array<{ role: 'user' | 'assistant'; text: string }> }> {
  const res = await fetch(`${BASE_URL}/assistant/conversations/${conversationId}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Conversation not found.');
  return res.json();
}

export async function deleteAssistantConversation(conversationId: string, token: string | null): Promise<void> {
  await fetch(`${BASE_URL}/assistant/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export async function confirmAssistantAction(
  actionId: string,
  token: string | null
): Promise<{ status: string; action_type: string; created_id: string; route: string; message: string }> {
  const res = await fetch(`${BASE_URL}/assistant/actions/${actionId}/confirm`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to confirm action.');
  }
  return res.json();
}

export async function cancelAssistantAction(
  actionId: string,
  token: string | null
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${BASE_URL}/assistant/actions/${actionId}/cancel`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to cancel action.');
  }
  return res.json();
}
