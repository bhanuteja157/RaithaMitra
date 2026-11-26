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
  sdk?: string;
  live_api_available?: boolean;
  tts_available?: boolean;
  transcribe_available?: boolean;
  live_model?: string;
  tts_model?: string;
  transcribe_model?: string;
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

export interface LiveTokenResponse {
  token: string;
  model: string;
  api_version: string;
  expires_at: string;
  system_instruction: string;
  tools: Array<Record<string, unknown>>;
  supported_languages: string[];
}

export interface VoiceTurnResponse {
  transcript: string;
  detected_language: 'en' | 'kn' | 'hi' | 'te';
  mixed_language: boolean;
  transcribe_model: string;
  chat: AssistantChatResponse;
  tts_audio_base64?: string | null;
  tts_mime_type?: string | null;
  tts_model?: string | null;
}

export async function fetchLiveEphemeralToken(
  payload: { farm_id?: string | null; language: 'en' | 'kn' | 'hi' | 'te' },
  token: string | null
): Promise<LiveTokenResponse> {
  const res = await fetch(`${BASE_URL}/assistant/live/token`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Unable to provision Gemini Live session token.');
  }
  return res.json();
}

export async function executeLiveTool(
  payload: {
    tool_name: string;
    arguments: Record<string, unknown>;
    farm_id?: string | null;
    conversation_id?: string | null;
    language?: string;
  },
  token: string | null
): Promise<AssistantChatResponse> {
  const res = await fetch(`${BASE_URL}/assistant/live/tool-execute`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Live tool execution failed.');
  }
  return res.json();
}

export async function sendVoiceTurn(
  audioBlob: Blob,
  opts: {
    farm_id?: string | null;
    conversation_id?: string | null;
    language?: string;
    include_tts?: boolean;
  },
  token: string | null
): Promise<VoiceTurnResponse> {
  const fd = new FormData();
  fd.append('file', audioBlob, 'mic_recording.webm');
  if (opts.farm_id) fd.append('farm_id', opts.farm_id);
  if (opts.conversation_id) fd.append('conversation_id', opts.conversation_id);
  if (opts.language) fd.append('language', opts.language);
  fd.append('include_tts', String(opts.include_tts ?? true));

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/assistant/voice/turn`, {
    method: 'POST',
    headers,
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Voice turn failed.');
  }
  return res.json();
}

export async function synthesizeGeminiSpeech(
  text: string,
  language: 'en' | 'kn' | 'hi' | 'te',
  token: string | null
): Promise<{ audio_base64: string; mime_type: string; model: string }> {
  const res = await fetch(`${BASE_URL}/assistant/tts`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ text, language, voice: 'Kore' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Gemini TTS unavailable.');
  }
  return res.json();
}

export async function streamAssistantMessage(
  payload: {
    message: string;
    conversation_id?: string | null;
    farm_id?: string | null;
    language?: string;
  },
  token: string | null,
  onDelta: (deltaText: string) => void
): Promise<AssistantChatResponse> {
  const res = await fetch(`${BASE_URL}/assistant/chat/stream`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok || !res.body) {
    return sendAssistantMessage(payload, token);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResponse: AssistantChatResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;
      try {
        const evt = JSON.parse(jsonStr);
        if (evt.type === 'delta' && evt.text) {
          onDelta(evt.text);
        } else if (evt.type === 'complete' && evt.response) {
          finalResponse = evt.response as AssistantChatResponse;
        }
      } catch {
        // ignore malformed partial chunk
      }
    }
  }
  if (!finalResponse) {
    return sendAssistantMessage(payload, token);
  }
  return finalResponse;
}
