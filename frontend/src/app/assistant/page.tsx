// frontend/src/app/assistant/page.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import {
  AssistantLanguage,
  getBcp47ForLanguage,
  speakWithDeviceVoice,
} from '@/lib/assistantVoice';
import {
  assistantApi,
  ConversationSummary,
  EvidenceSource,
  ProactiveAlert,
  ResponseCard,
  ToolDescriptor,
  ToolExecutionStep,
} from '@/lib/assistantApi';
import { AssistantResponseCards } from '@/components/assistant/AssistantResponseCards';
import {
  AlertTriangle,
  BotMessageSquare,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Globe,
  History,
  Loader2,
  Mic,
  MicOff,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trash2,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';

interface ChatMessageUI {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  language: AssistantLanguage;
  intent?: string | null;
  toolsExecuted?: ToolExecutionStep[];
  cards?: ResponseCard[];
  alerts?: ProactiveAlert[];
  citations?: EvidenceSource[];
  followUpQuestions?: string[];
  llmProviderUsed?: string;
  offlineFallback?: boolean;
  timestamp?: string;
}

const SUGGESTED_QUESTIONS: Record<AssistantLanguage, string[]> = {
  en: [
    'What crop should I grow?',
    'How much seed do I need?',
    'When should I irrigate?',
    'Is my crop ready to harvest?',
    'Where should I sell my produce?',
    'How many workers do I need?',
    'What government schemes are available?',
  ],
  kn: [
    'ನನ್ನ ಜಮೀನಿಗೆ ಯಾವ ಬೆಳೆ ಸೂಕ್ತ?',
    'ನನಗೆ ಎಷ್ಟು ಬೀಜ ಬೇಕು?',
    'ನಾನು ಯಾವಾಗ ನೀರಾವರಿ ಕೊಡಬೇಕು?',
    'ನನ್ನ ಬೆಳೆ ಕೊಯ್ಲಿಗೆ ಸಿದ್ಧವಾಗಿದೆಯೇ?',
    'ನನ್ನ ಬೆಳೆಯನ್ನು ಎಲ್ಲಿ ಮಾರಾಟ ಮಾಡಬೇಕು?',
    'ಎಷ್ಟು ಕೃಷಿ ಕಾರ್ಮಿಕರು ಬೇಕಾಗುತ್ತಾರೆ?',
    'ಯಾವ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಲಭ್ಯವಿವೆ?',
  ],
  hi: [
    'मेरे खेत में कौन सी फसल लगानी चाहिए?',
    'मुझे कितना बीज चाहिए?',
    'मुझे सिंचाई कब करनी चाहिए?',
    'क्या मेरी फसल कटाई के लिए तैयार है?',
    'मुझे अपनी उपज कहाँ बेचनी चाहिए?',
    'कितने मजदूरों की आवश्यकता होगी?',
    'कौन सी सरकारी योजनाएं उपलब्ध हैं?',
  ],
  te: [
    'నా పొలానికి ఏ పంట అనుకూలంగా ఉంటుంది?',
    'నాకు ఎంత విత్తనం అవసరం?',
    'నేను ఎప్పుడు నీటిపారుదల చేయాలి?',
    'నా పంట కోతకు సిద్ధంగా ఉందా?',
    'నా పంటను ఎక్కడ అమ్మాలి?',
    'ఎంత మంది కూలీలు అవసరం?',
    'ఏ ప్రభుత్వ పథకాలు అందుబాటులో ఉన్నాయి?',
  ],
};

const LANG_OPTIONS: Array<{ code: AssistantLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'te', label: 'తెలుగు' },
];

const GREETING: Record<AssistantLanguage, (name: string, crop: string) => string> = {
  en: (name, crop) =>
    `Hello ${name}, I am RaithaMitra AI — Your Intelligent Farming Companion. Ask me about crop planning, ${crop} irrigation, weather risks, soil health, markets, labour, transport, or government schemes.`,
  kn: (name, crop) =>
    `ನಮಸ್ಕಾರ ${name}, ನಾನು ರೈತ ಮಿತ್ರ AI — ನಿಮ್ಮ ಬುದ್ಧಿವಂತ ಕೃಷಿ ಸಂಗಾತಿ. ಬೆಳೆ ಯೋಜನೆ, ${crop} ನೀರಾವರಿ, ಹವಾಮಾನ, ಮಣ್ಣಿನ ಆರೋಗ್ಯ, ಮಾರುಕಟ್ಟೆ, ಕೂಲಿ ಅಥವಾ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ.`,
  hi: (name, crop) =>
    `नमस्ते ${name}, मैं रैतामित्र AI हूँ — आपका बुद्धिमान कृषि साथी। फसल योजना, ${crop} सिंचाई, मौसम जोखिम, मिट्टी, मंडी भाव, श्रमिक या सरकारी योजनाओं के बारे में पूछें।`,
  te: (name, crop) =>
    `నమస్కారం ${name}, నేను రైతుమిత్ర AI — మీ తెలివైన వ్యవసాయ సహాయకుడు. పంట ప్రణాళిక, ${crop} నీటిపారుదల, వాతావరణం, నేల, మార్కెట్ లేదా ప్రభుత్వ పథకాల గురించి అడగండి.`,
};

export default function AssistantPage() {
  const router = useRouter();
  const { currentFarm, currentUser, language, token, isDemoMode, isAuthenticated, login } = useFarm();

  const [assistantLang, setAssistantLang] = useState<AssistantLanguage>((language || 'en') as AssistantLanguage);
  const [muted, setMuted] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [memorySnapshot, setMemorySnapshot] = useState<Record<string, any>>({});
  const [toolsInfo, setToolsInfo] = useState<ToolDescriptor[]>([]);
  const [llmStatus, setLlmStatus] = useState<{ gemini_configured: boolean; openai_configured: boolean } | null>(null);

  const [messages, setMessages] = useState<ChatMessageUI[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: GREETING[(language || 'en') as AssistantLanguage](
        currentFarm?.farmer_name || currentUser?.name || 'Farmer',
        currentFarm?.primary_crop || 'crop'
      ),
      language: (language || 'en') as AssistantLanguage,
    },
  ]);

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmingIds, setConfirmingIds] = useState<Record<string, boolean>>({});
  const [confirmedResults, setConfirmedResults] = useState<
    Record<string, { status: string; message: string; route?: string | null }>
  >({});
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Ensure a real server-issued session token when in demo mode
  const ensureAuthToken = useCallback(async (): Promise<string | null> => {
    if (token && !token.startsWith('rm_demo_token_')) {
      return token;
    }
    if (isDemoMode || currentUser?.is_demo) {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
        const res = await fetch(`${backendUrl}/auth/demo-accounts`);
        if (res.ok) {
          const accounts: any[] = await res.json();
          const match = accounts.find((a) => a.role === currentUser.role) || accounts[0];
          if (match) {
            const loginRes = await login({
              email: match.email,
              password: match.password,
              role: match.role,
            });
            if (loginRes.success) {
              return window.localStorage.getItem('rm_token');
            }
          }
        }
      } catch {
        return null;
      }
    }
    return token;
  }, [token, isDemoMode, currentUser, login]);

  const loadWorkspaceData = useCallback(async () => {
    const validToken = await ensureAuthToken();
    if (!validToken) return;
    try {
      const [convList, toolRes] = await Promise.all([
        assistantApi.listConversations(validToken),
        assistantApi.getTools(validToken),
      ]);
      setConversations(convList);
      setToolsInfo(toolRes.tools || []);
      setLlmStatus(toolRes.llm_status || null);
    } catch {
      // Backend might be offline or session expired
    }
  }, [ensureAuthToken]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData, currentUser.id]);

  const resetToFreshConversation = useCallback(
    (langOverride?: AssistantLanguage) => {
      const l = langOverride || assistantLang;
      setConversationId(null);
      setMemorySnapshot({});
      setErrorBanner(null);
      setMessages([
        {
          id: `welcome_${Date.now()}`,
          sender: 'bot',
          text: GREETING[l](
            currentFarm?.farmer_name || currentUser?.name || 'Farmer',
            currentFarm?.primary_crop || 'crop'
          ),
          language: l,
        },
      ]);
    },
    [assistantLang, currentFarm, currentUser]
  );

  // Reset active conversation when switching user or farm context
  useEffect(() => {
    resetToFreshConversation();
  }, [currentUser.id, currentFarm?.id]);

  const handleLoadConversation = async (convId: string) => {
    const validToken = await ensureAuthToken();
    if (!validToken) return;
    try {
      setErrorBanner(null);
      const detail = await assistantApi.getConversation(validToken, convId);
      setConversationId(detail.conversation.id);
      setMemorySnapshot(detail.conversation.memory || {});
      setAssistantLang((detail.conversation.language || 'en') as AssistantLanguage);
      const mapped: ChatMessageUI[] = detail.messages.map((m) => ({
        id: m.id,
        sender: m.role === 'user' ? 'user' : 'bot',
        text: m.content,
        language: (m.language || 'en') as AssistantLanguage,
        intent: m.intent,
        toolsExecuted: m.tools_executed,
        cards: m.cards,
        alerts: m.alerts,
        citations: m.citations,
        followUpQuestions: m.follow_ups,
        llmProviderUsed: m.metadata?.llm_provider_used,
        offlineFallback: Boolean(m.metadata?.offline_fallback),
        timestamp: m.created_at,
      }));
      setMessages(mapped);
      setShowSidebarMobile(false);
    } catch (err: any) {
      setErrorBanner(err.message || 'Could not load conversation history.');
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    const validToken = await ensureAuthToken();
    if (!validToken) return;
    try {
      await assistantApi.deleteConversation(validToken, convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (conversationId === convId) {
        resetToFreshConversation();
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Could not delete conversation.');
    }
  };

  const handleSpeak = (text: string, lang: AssistantLanguage) => {
    setVoiceNote(null);
    const res = speakWithDeviceVoice(text, lang, muted);
    if (res.voiceUnavailableReason) {
      setVoiceNote(res.voiceUnavailableReason);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const sendMessageText = async (rawText: string) => {
    const userText = rawText.trim();
    if (!userText || isSending) return;

    setErrorBanner(null);
    setVoiceNote(null);
    setInput('');

    const tempUserId = `u_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempUserId,
        sender: 'user',
        text: userText,
        language: assistantLang,
        timestamp: new Date().toISOString(),
      },
    ]);

    const validToken = await ensureAuthToken();
    if (!validToken) {
      setErrorBanner('Please sign in or select a demo account to query RaithaMitra AI.');
      return;
    }

    setIsSending(true);
    try {
      const res = await assistantApi.chat(validToken, {
        message: userText,
        conversation_id: conversationId,
        farm_id: currentUser.role === 'farmer' ? currentFarm?.id : null,
        language: assistantLang,
      });

      setConversationId(res.conversation_id);
      setMemorySnapshot(res.memory_snapshot || {});

      setMessages((prev) => [
        ...prev,
        {
          id: res.message_id,
          sender: 'bot',
          text: res.reply,
          language: res.language,
          intent: res.intent,
          toolsExecuted: res.tools_executed,
          cards: res.cards,
          alerts: res.alerts,
          citations: res.citations,
          followUpQuestions: res.follow_up_questions,
          llmProviderUsed: res.llm_provider_used,
          offlineFallback: res.offline_fallback,
          timestamp: res.timestamp,
        },
      ]);

      if (!muted) {
        const speakRes = speakWithDeviceVoice(res.reply, res.language, muted);
        if (speakRes.voiceUnavailableReason) {
          setVoiceNote(speakRes.voiceUnavailableReason);
        }
      }

      const convList = await assistantApi.listConversations(validToken);
      setConversations(convList);
    } catch (err: any) {
      const errMsg = err.message || 'Unable to process your question right now.';
      setErrorBanner(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'bot',
          text: `Could not complete request: ${errMsg}`,
          language: assistantLang,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmAction = async (confirmationId: string, decision: 'confirm' | 'cancel') => {
    const validToken = await ensureAuthToken();
    if (!validToken) return;
    setConfirmingIds((prev) => ({ ...prev, [confirmationId]: true }));
    try {
      const res = await assistantApi.confirmAction(validToken, confirmationId, decision);
      setConfirmedResults((prev) => ({
        ...prev,
        [confirmationId]: { status: res.status, message: res.message, route: res.route },
      }));
    } catch (err: any) {
      setConfirmedResults((prev) => ({
        ...prev,
        [confirmationId]: { status: 'error', message: err.message || 'Confirmation failed.' },
      }));
    } finally {
      setConfirmingIds((prev) => ({ ...prev, [confirmationId]: false }));
    }
  };

  const toggleMic = () => {
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setListening(false);
      return;
    }

    const SpeechRecognitionCtor =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognitionCtor) {
      setVoiceNote('Browser voice recognition is unavailable here; type your question below.');
      return;
    }

    const rec = new SpeechRecognitionCtor();
    rec.lang = getBcp47ForLanguage(assistantLang);
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onresult = (event: any) => {
      const spoken = event.results?.[0]?.[0]?.transcript || '';
      if (spoken.trim()) {
        sendMessageText(spoken);
      }
    };
    rec.onerror = () => {
      setListening(false);
      setVoiceNote('Voice recognition did not capture speech; please type your question.');
    };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
            <BotMessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                RaithaMitra AI — Your Intelligent Farming Companion
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-3 h-3" />
                {llmStatus?.gemini_configured
                  ? 'Gemini Grounded'
                  : llmStatus?.openai_configured
                    ? 'LLM Grounded'
                    : 'Deterministic Tools Mode'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Seed-to-sale multilingual intelligence grounded in live weather, FAO-56 irrigation, BioIntel, markets, labour, and transport
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 4-Language Selector (EN / KN / HI / TE) */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <Globe className="w-3.5 h-3.5 text-zinc-500 ml-1.5" />
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => setAssistantLang(opt.code)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                  assistantLang === opt.code
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
          >
            {muted ? <VolumeX className="w-4 h-4 text-amber-600" /> : <Volume2 className="w-4 h-4 text-emerald-700" />}
            {muted ? 'Muted' : 'Voice On'}
          </button>

          <button
            type="button"
            onClick={() => resetToFreshConversation()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>

          <button
            type="button"
            onClick={() => setShowSidebarMobile((s) => !s)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>
      </div>

      {/* Main 2-column Intelligence Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Sidebar: Active Farm Context, Memory, History & Tool Registry */}
        <aside
          className={`lg:col-span-4 xl:col-span-3 space-y-4 ${
            showSidebarMobile ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Active Farm Context */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Active Farm Context
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 capitalize">
                {currentUser.role}
              </span>
            </div>
            {currentUser.role === 'farmer' && currentFarm ? (
              <div className="text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
                <div className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-emerald-600" />
                  {currentFarm.farm_name}
                </div>
                <div>
                  {currentFarm.village}, {currentFarm.district}, {currentFarm.state}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 text-[11px]">
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                    <span className="text-zinc-400 block">Crop & Stage</span>
                    <strong>{currentFarm.primary_crop} ({currentFarm.crop_stage})</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                    <span className="text-zinc-400 block">Area & Budget</span>
                    <strong>
                      {(currentFarm.land_area_ha * 2.471).toFixed(1)} ac • ₹{currentFarm.cultivation_budget_inr.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                Signed in as <strong>{currentUser.name}</strong> ({currentUser.role}). Tool scope automatically reflects your role permissions.
              </p>
            )}

            {Object.keys(memorySnapshot).length > 0 && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] space-y-1">
                <div className="font-semibold text-zinc-500">Remembered Session Context:</div>
                <div className="flex flex-wrap gap-1.5">
                  {memorySnapshot.selected_crop && (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      Crop: {memorySnapshot.selected_crop}
                    </span>
                  )}
                  {memorySnapshot.area_acres && (
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900">
                      Area: {memorySnapshot.area_acres} ac
                    </span>
                  )}
                  {memorySnapshot.budget_inr && (
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900">
                      Budget: ₹{Number(memorySnapshot.budget_inr).toLocaleString('en-IN')}
                    </span>
                  )}
                  {memorySnapshot.water_availability && (
                    <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                      Water: {memorySnapshot.water_availability}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Conversation History */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Conversation History
              </span>
              {conversationId && (
                <button
                  type="button"
                  onClick={() => handleDeleteConversation(conversationId)}
                  className="text-[11px] text-rose-600 hover:underline font-semibold"
                >
                  Clear Current
                </button>
              )}
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {conversations.length === 0 ? (
                <p className="text-xs text-zinc-400">No saved conversations yet.</p>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded-xl border text-xs transition ${
                      c.id === conversationId
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40'
                        : 'border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleLoadConversation(c.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {c.message_count} msgs • {c.language.toUpperCase()}
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label="Delete conversation"
                      onClick={() => handleDeleteConversation(c.id)}
                      className="p-1 text-zinc-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Connected Agricultural Tools */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              Authorized Tools ({toolsInfo.length})
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {toolsInfo.map((tool) => (
                <div
                  key={tool.tool_id}
                  className="flex items-center justify-between text-[11px] py-1 border-b border-zinc-100 dark:border-zinc-900 last:border-0"
                >
                  <span className="text-zinc-700 dark:text-zinc-300 truncate pr-2">{tool.name}</span>
                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      tool.status === 'operational'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400'
                    }`}
                  >
                    {tool.status === 'operational' ? 'Ready' : 'Unavailable'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Column: Main Conversation Workspace */}
        <section className="lg:col-span-8 xl:col-span-9 p-4 sm:p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col min-h-[640px]">
          {/* Suggested Question Cards */}
          <div className="pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="text-[11px] font-semibold text-zinc-400 mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Suggested Agricultural Questions ({assistantLang.toUpperCase()})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS[assistantLang].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessageText(q)}
                  disabled={isSending}
                  className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {errorBanner && (
            <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          {voiceNote && (
            <div className="mb-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              {voiceNote}
            </div>
          )}

          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[520px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`w-full ${m.sender === 'user' ? 'max-w-xl' : 'max-w-3xl'} p-4 rounded-2xl text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-rm-primary text-white rounded-br-none shadow-sm'
                      : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-bl-none border border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {/* Transparent Tool Execution Steps */}
                  {m.toolsExecuted && m.toolsExecuted.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {m.toolsExecuted.map((step) => (
                        <span
                          key={step.tool_name}
                          title={step.summary}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            step.status === 'completed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {step.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Contextual Alerts */}
                  {m.alerts && m.alerts.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      {m.alerts.map((al) => (
                        <div
                          key={al.id}
                          className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs flex items-start gap-2"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-amber-900 dark:text-amber-200">{al.title}</div>
                            <div className="text-amber-800 dark:text-amber-300">{al.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Narrative Reply */}
                  <div className="whitespace-pre-line">{m.text}</div>

                  {/* Structured Response Cards */}
                  {m.cards && m.cards.length > 0 && (
                    <AssistantResponseCards
                      cards={m.cards}
                      onNavigate={(route) => router.push(route)}
                      onConfirmAction={handleConfirmAction}
                      confirmingIds={confirmingIds}
                      confirmedResults={confirmedResults}
                    />
                  )}

                  {/* Sources & Provenance */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
                      <div className="text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-1">
                        <Database className="w-3 h-3 text-emerald-500" />
                        Verified Sources & Data Quality
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.citations.map((cit, cIdx) => (
                          <span
                            key={cIdx}
                            className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
                          >
                            {cit.source} ({cit.data_quality})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Utilities + Follow-ups */}
                  {m.sender === 'bot' && (
                    <div className="mt-3 pt-2 border-t border-zinc-200/70 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSpeak(m.text, m.language)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:text-emerald-700"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          Read Aloud
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(m.id, m.text)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:text-emerald-700"
                        >
                          {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === m.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      {m.llmProviderUsed && (
                        <span className="text-[10px] text-zinc-400">
                          Engine: {m.offlineFallback ? 'Deterministic Offline Tools' : m.llmProviderUsed}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Suggested Follow-Up Chips */}
                {m.sender === 'bot' && m.followUpQuestions && m.followUpQuestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.followUpQuestions.slice(0, 3).map((fq) => (
                      <button
                        key={fq}
                        type="button"
                        onClick={() => sendMessageText(fq)}
                        disabled={isSending}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                      >
                        {fq}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 max-w-md">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Understanding your question &amp; executing authorized RaithaMitra tools...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessageText(input);
            }}
            className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleMic}
              aria-label={listening ? 'Stop microphone' : 'Start voice input'}
              className={`p-2.5 rounded-xl border transition ${
                listening
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-emerald-500'
              }`}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending || (!isAuthenticated && !isDemoMode)}
              placeholder={
                assistantLang === 'kn'
                  ? 'ನಿಮ್ಮ ಕೃಷಿ ಪ್ರಶ್ನೆಯನ್ನು ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಕೇಳಿ...'
                  : assistantLang === 'hi'
                    ? 'अपना कृषि प्रश्न हिंदी या अंग्रेजी में पूछें...'
                    : assistantLang === 'te'
                      ? 'మీ వ్యవసాయ ప్రశ్నను తెలుగు లేదా ఇంగ్లీష్‌లో అడగండి...'
                      : 'Ask about crops, irrigation, weather, soil, markets, labour, transport, or schemes...'
              }
              className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rm-primary hover:bg-rm-dark text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              <span>Ask</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
