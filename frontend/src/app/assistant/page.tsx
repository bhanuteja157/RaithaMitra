// frontend/src/app/assistant/page.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import {
  AssistantLanguage,
  buildPreNavigationMessage,
  buildUnauthorizedMessage,
  getBcp47ForLanguage,
  matchNavigationIntent,
  speakWithDeviceVoice,
} from '@/lib/assistantVoice';
import {
  AssistantChatResponse,
  cancelAssistantAction,
  confirmAssistantAction,
  ConversationSummary,
  deleteAssistantConversation,
  fetchAssistantStatus,
  listAssistantConversations,
  loadAssistantConversation,
  PendingActionPreview,
  sendAssistantMessage,
  sendVoiceTurn,
  SourceReference,
  streamAssistantMessage,
  StructuredCard,
  synthesizeGeminiSpeech,
} from '@/lib/assistantApi';
import {
  AudioClipRecorder,
  GeminiLiveVoiceSession,
  LiveOrbState,
  playWavBase64,
  stopWavAudio,
} from '@/lib/geminiLiveVoice';
import {
  BotMessageSquare,
  Send,
  Database,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Plus,
  Trash2,
  History,
  Cpu,
  Globe,
  Radio,
} from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  provenance?: string;
  cards?: StructuredCard[];
  sources?: SourceReference[];
  pendingAction?: PendingActionPreview | null;
  actionStatus?: 'confirmed' | 'cancelled';
}

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  farmer: [
    'I have two acres and fifty thousand rupees. I want to grow tomatoes.',
    'Should I irrigate my field tomorrow?',
    'How much profit have I earned?',
    'Find five workers for harvesting.',
    'Find suitable transportation for 2,000 kilograms of produce.',
    'What government schemes can I apply for?',
  ],
  buyer: [
    'Show active produce bids and listings.',
    'Check my confirmed orders.',
    'What is the weather forecast?',
  ],
  labour: [
    'Show my jobs and recorded earnings.',
    'What government schemes can I apply for?',
  ],
  driver: [
    'Find available transport cargo.',
    'What is the weather forecast?',
  ],
};

export default function AssistantPage() {
  const router = useRouter();
  const { currentFarm, currentUser, token, language, setLanguage } = useFarm();
  const [chatLang, setChatLang] = useState<AssistantLanguage>((language as AssistantLanguage) || 'en');
  const [muted, setMuted] = useState(false);
  const [mode, setMode] = useState<'online_gemini' | 'local_intelligence'>('local_intelligence');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<ConversationSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [liveActive, setLiveActive] = useState(false);
  const [liveState, setLiveState] = useState<LiveOrbState>('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [geminiVoiceReady, setGeminiVoiceReady] = useState(false);
  const [liveInputCaption, setLiveInputCaption] = useState('');
  const [liveOutputCaption, setLiveOutputCaption] = useState('');
  const [input, setInput] = useState('');
  const recognitionRef = useRef<any>(null);
  const liveSessionRef = useRef<GeminiLiveVoiceSession | null>(null);
  const clipRecorderRef = useRef<AudioClipRecorder | null>(null);
  const isRecordingClipRef = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: `Hello ${currentUser.name}, I am RaithaMitra AI Companion (${currentUser.role.toUpperCase()} mode). Ask me about crops, weather, irrigation, finances, labour, Smart Bidding, transport, or government schemes.`,
      provenance: 'Connected to live RaithaMitra tools & SQLite records',
    },
  ]);

  useEffect(() => {
    setMicSupported(
      typeof window !== 'undefined' &&
        Boolean(
          navigator.mediaDevices?.getUserMedia ||
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition
        )
    );
    return () => {
      liveSessionRef.current?.stop();
      clipRecorderRef.current?.cancel();
      stopWavAudio();
    };
  }, []);

  const refreshHistory = useCallback(async () => {
    if (!token) return;
    try {
      const [statusData, convs] = await Promise.all([
        fetchAssistantStatus(token).catch(() => null),
        listAssistantConversations(token),
      ]);
      if (statusData) {
        setMode(statusData.mode);
        setGeminiVoiceReady(Boolean(statusData.gemini_configured && statusData.live_api_available));
      }
      setHistoryList(convs);
    } catch {
      // ignore
    }
  }, [token]);

  const convStorageKey = `rm_assistant_conv_${currentUser.id}`;

  useEffect(() => {
    const savedConvId = typeof window !== 'undefined' ? window.sessionStorage.getItem(convStorageKey) : null;
    if (savedConvId && token) {
      setConversationId(savedConvId);
      loadAssistantConversation(savedConvId, token)
        .then((data) => {
          if (data.messages && data.messages.length > 0) {
            setMessages(
              data.messages.map((m) => ({
                sender: m.role === 'user' ? 'user' : 'bot',
                text: m.text,
                provenance: 'Synced Conversation History',
              }))
            );
            return;
          }
          setMessages([
            {
              sender: 'bot',
              text: `Hello ${currentUser.name}, I am RaithaMitra AI Companion (${currentUser.role.toUpperCase()} mode). Ask me anything about your farm, finances, weather, or agricultural workflows.`,
              provenance: 'Connected to live RaithaMitra tools & SQLite records',
            },
          ]);
        })
        .catch(() => {
          window.sessionStorage.removeItem(convStorageKey);
          setConversationId(null);
          setMessages([
            {
              sender: 'bot',
              text: `Hello ${currentUser.name}, I am RaithaMitra AI Companion (${currentUser.role.toUpperCase()} mode). Ask me anything about your farm, finances, weather, or agricultural workflows.`,
              provenance: 'Connected to live RaithaMitra tools & SQLite records',
            },
          ]);
        });
    } else {
      setConversationId(null);
      setMessages([
        {
          sender: 'bot',
          text: `Hello ${currentUser.name}, I am RaithaMitra AI Companion (${currentUser.role.toUpperCase()} mode). Ask me anything about your farm, finances, weather, or agricultural workflows.`,
          provenance: 'Connected to live RaithaMitra tools & SQLite records',
        },
      ]);
    }
    refreshHistory();
  }, [currentUser.id, currentUser.name, currentUser.role, refreshHistory]);

  const submitQuery = async (rawText: string) => {
    const userText = rawText.trim();
    if (!userText || busy) return;
    setInput('');

    // Fast client-side navigation shortcut if explicitly requested
    if (
      /^(open|go to|navigate|take me|show today's market|show todays market)\b/i.test(userText) &&
      !/\b(buyers? for|find buyers|financial summary|diagnos)\b/i.test(userText)
    ) {
      const navIntent = matchNavigationIntent(userText, currentUser.role);
      if (navIntent) {
        if (!navIntent.allowedRoles.includes(currentUser.role)) {
          const denied = buildUnauthorizedMessage(navIntent, currentUser.role, chatLang);
          speakWithDeviceVoice(denied, chatLang, muted);
          setMessages((prev) => [
            ...prev,
            { sender: 'user', text: userText },
            { sender: 'bot', text: denied, provenance: 'RBAC role authorization check' },
          ]);
          return;
        }
        const preMsg = buildPreNavigationMessage(navIntent, chatLang);
        speakWithDeviceVoice(preMsg, chatLang, muted);
        setMessages((prev) => [
          ...prev,
          { sender: 'user', text: userText },
          { sender: 'bot', text: preMsg, provenance: `Navigating to ${navIntent.route}` },
        ]);
        window.setTimeout(() => router.push(navIntent.route), 450);
        return;
      }
    }

    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: userText },
      { sender: 'bot', text: '', provenance: 'Streaming RaithaMitra Intelligence...' },
    ]);
    setBusy(true);

    const speakReply = async (text: string, replyLang: AssistantLanguage) => {
      if (muted || !text) return;
      if (token && geminiVoiceReady) {
        try {
          const tts = await synthesizeGeminiSpeech(text, replyLang, token);
          await playWavBase64(tts.audio_base64, tts.mime_type, muted);
          return;
        } catch {
          // fall back to device voice
        }
      }
      speakWithDeviceVoice(text, replyLang, muted);
    };

    const applyDirectiveFromRes = (res: AssistantChatResponse) => {
      if (!res.client_directive) return;
      if (res.client_directive.directive_type === 'biointel_fill' && typeof window !== 'undefined') {
        window.localStorage.setItem('rm_voice_biointel_draft_v1', JSON.stringify(res.client_directive.payload));
        window.dispatchEvent(new CustomEvent('rm-biointel-voice-fill', { detail: res.client_directive.payload }));
      } else if (res.client_directive.directive_type === 'digital_farm_control' && typeof window !== 'undefined') {
        const act = String(res.client_directive.payload.action || 'summary');
        window.sessionStorage.setItem('rm_df_pending_action', act);
        window.dispatchEvent(new CustomEvent('rm-df-control', { detail: { action: act } }));
      } else if (res.client_directive.directive_type === 'navigate' && res.intent === 'navigate' && res.client_directive.route) {
        const destRoute = res.client_directive.route;
        window.setTimeout(() => router.push(destRoute), 450);
      }
    };

    try {
      const res = await streamAssistantMessage(
        {
          message: userText,
          conversation_id: conversationId,
          farm_id: currentUser.role === 'farmer' ? currentFarm?.id : undefined,
          language: chatLang,
        },
        token,
        (delta) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.sender === 'bot') {
              copy[copy.length - 1] = { ...last, text: `${last.text}${delta}` };
            }
            return copy;
          });
        }
      );
      setConversationId(res.conversation_id);
      if (typeof window !== 'undefined' && res.conversation_id) {
        window.sessionStorage.setItem(convStorageKey, res.conversation_id);
      }
      setMode(res.mode);
      applyDirectiveFromRes(res);

      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          sender: 'bot',
          text: res.reply,
          provenance: `${res.mode === 'online_gemini' ? 'Online Gemini Grounded' : 'Local Intelligence'} • ${res.provenance}`,
          cards: res.cards,
          sources: res.sources,
          pendingAction: res.pending_action,
        };
        return copy;
      });
      refreshHistory();
      speakReply(res.reply, (res.language || chatLang) as AssistantLanguage);
    } catch (err: any) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          sender: 'bot',
          text: err.message || 'Unable to process request right now.',
          provenance: 'Error Handler',
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmAction = async (msgIndex: number, actionId: string) => {
    setBusy(true);
    try {
      const res = await confirmAssistantAction(actionId, token);
      speakWithDeviceVoice(res.message, chatLang, muted);
      setMessages((prev) =>
        prev.map((m, idx) =>
          idx === msgIndex ? { ...m, actionStatus: 'confirmed' as const } : m
        ).concat({
          sender: 'bot' as const,
          text: `${res.message} (Record ID: ${res.created_id})`,
          provenance: 'Verified Backend Transaction',
        })
      );
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: err.message || 'Action confirmation failed.', provenance: 'Security & Validation' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelAction = async (msgIndex: number, actionId: string) => {
    setBusy(true);
    try {
      const res = await cancelAssistantAction(actionId, token);
      speakWithDeviceVoice(res.message, chatLang, muted);
      setMessages((prev) =>
        prev.map((m, idx) =>
          idx === msgIndex ? { ...m, actionStatus: 'cancelled' as const } : m
        ).concat({
          sender: 'bot' as const,
          text: res.message,
          provenance: 'Action Cancelled',
        })
      );
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: err.message, provenance: 'Error' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const stopLiveVoice = () => {
    liveSessionRef.current?.stop();
    liveSessionRef.current = null;
    setLiveActive(false);
    setLiveState('idle');
    setMicLevel(0);
  };

  const toggleLiveVoice = async () => {
    if (liveActive) {
      stopLiveVoice();
      return;
    }
    if (!token || !geminiVoiceReady) {
      toggleVoiceInput();
      return;
    }
    stopWavAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setLiveInputCaption('');
    setLiveOutputCaption('');
    const session = new GeminiLiveVoiceSession();
    liveSessionRef.current = session;
    setLiveActive(true);
    try {
      await session.start({
        authToken: token,
        farmId: currentUser.role === 'farmer' ? currentFarm?.id : undefined,
        conversationId,
        language: chatLang,
        muted,
        onStateChange: (s) => {
          setLiveState(s);
          if (s === 'idle') {
            setLiveActive(false);
            setMicLevel(0);
          }
        },
        onMicLevel: (lvl) => setMicLevel(lvl),
        onInputTranscript: (delta) => setLiveInputCaption((p) => `${p}${delta}`.slice(-240)),
        onOutputTranscript: (delta) => setLiveOutputCaption((p) => `${p}${delta}`.slice(-420)),
        onToolResult: (res) => {
          if (res.conversation_id) {
            setConversationId(res.conversation_id);
            if (typeof window !== 'undefined') window.sessionStorage.setItem(convStorageKey, res.conversation_id);
          }
          setMessages((prev) => [
            ...prev,
            {
              sender: 'bot',
              text: res.reply,
              provenance: `Gemini Live Tool • ${res.provenance}`,
              cards: res.cards,
              sources: res.sources,
              pendingAction: res.pending_action,
            },
          ]);
        },
        onError: () => stopLiveVoice(),
      });
    } catch {
      stopLiveVoice();
    }
  };

  const toggleVoiceInput = async () => {
    if (!micSupported) return;
    if (liveActive) {
      stopLiveVoice();
      return;
    }

    if (token && geminiVoiceReady && typeof MediaRecorder !== 'undefined') {
      if (isRecordingClipRef.current && clipRecorderRef.current) {
        isRecordingClipRef.current = false;
        setListening(false);
        setBusy(true);
        try {
          const blob = await clipRecorderRef.current.stop();
          const vt = await sendVoiceTurn(
            blob,
            {
              farm_id: currentUser.role === 'farmer' ? currentFarm?.id : undefined,
              conversation_id: conversationId,
              language: chatLang,
              include_tts: !muted,
            },
            token
          );
          if (vt.chat.conversation_id) {
            setConversationId(vt.chat.conversation_id);
            if (typeof window !== 'undefined') window.sessionStorage.setItem(convStorageKey, vt.chat.conversation_id);
          }
          setMode(vt.chat.mode);
          setMessages((prev) => [
            ...prev,
            { sender: 'user', text: vt.transcript },
            {
              sender: 'bot',
              text: vt.chat.reply,
              provenance: `${vt.transcribe_model} -> ${vt.chat.provenance}`,
              cards: vt.chat.cards,
              sources: vt.chat.sources,
              pendingAction: vt.chat.pending_action,
            },
          ]);
          refreshHistory();
          if (vt.tts_audio_base64 && !muted) {
            await playWavBase64(vt.tts_audio_base64, vt.tts_mime_type || 'audio/wav', muted);
          } else {
            speakWithDeviceVoice(vt.chat.reply, vt.chat.language, muted);
          }
          return;
        } catch {
          // fall back to Web Speech API
        } finally {
          setBusy(false);
        }
      } else {
        try {
          stopWavAudio();
          const rec = new AudioClipRecorder();
          clipRecorderRef.current = rec;
          await rec.start();
          isRecordingClipRef.current = true;
          setListening(true);
          return;
        } catch {
          isRecordingClipRef.current = false;
        }
      }
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    const rec = new SpeechRec();
    rec.lang = getBcp47ForLanguage(chatLang);
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event: any) => {
      const spoken = event.results?.[0]?.[0]?.transcript || '';
      setListening(false);
      if (spoken) submitQuery(spoken);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const handleResumeConversation = async (id: string) => {
    try {
      const data = await loadAssistantConversation(id, token);
      setConversationId(data.id);
      setMessages(
        data.messages.map((m) => ({
          sender: m.role === 'user' ? 'user' : 'bot',
          text: m.text,
          provenance: 'Restored Conversation History',
        }))
      );
      setShowHistory(false);
    } catch {
      // ignore
    }
  };

  const suggestions = SUGGESTED_QUESTIONS[currentUser.role] || SUGGESTED_QUESTIONS.farmer;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
            <BotMessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                RaithaMitra AI Companion
              </h1>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  mode === 'online_gemini'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {mode === 'online_gemini' ? <Globe className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                {mode === 'online_gemini' ? 'Online Gemini Grounded' : 'Local Intelligence Mode'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {currentUser.role === 'farmer' && currentFarm
                ? `Active Farm: ${currentFarm.farm_name} (${currentFarm.primary_crop}, ${currentFarm.district})`
                : `Active Role: ${currentUser.role.toUpperCase()} (${currentUser.name})`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={chatLang}
            onChange={(e) => {
              const l = e.target.value as AssistantLanguage;
              setChatLang(l);
              setLanguage(l);
            }}
            aria-label="Assistant language"
            className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold"
          >
            <option value="en">English</option>
            <option value="kn">ಕನ್ನಡ (Kannada)</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="te">తెలుగు (Telugu)</option>
          </select>

          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
          >
            <History className="w-3.5 h-3.5" />
            History ({historyList.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setConversationId(null);
              if (typeof window !== 'undefined') window.sessionStorage.removeItem(convStorageKey);
              setMessages([
                {
                  sender: 'bot',
                  text: `Started a fresh conversation for ${currentUser.name}. How can I help?`,
                  provenance: 'New Context',
                },
              ]);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>

          <button
            type="button"
            onClick={toggleLiveVoice}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              liveActive
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-emerald-800 hover:bg-emerald-900 text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            {liveActive ? `Live (${liveState})` : 'Live Voice'}
          </button>

          <button
            type="button"
            onClick={() => {
              liveSessionRef.current?.interruptPlayback();
              stopWavAudio();
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
            }}
            aria-label="Stop speaking"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Stop Voice
          </button>

          <button
            type="button"
            onClick={() => {
              if (!muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              setMuted((m) => !m);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
          >
            {muted ? <VolumeX className="w-4 h-4 text-amber-600" /> : <Volume2 className="w-4 h-4 text-emerald-700" />}
            {muted ? 'Muted' : 'Voice On'}
          </button>
        </div>
      </div>

      {/* History Drawer */}
      {showHistory && (
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2">
          <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Saved Conversations</div>
          {historyList.length === 0 ? (
            <div className="text-xs text-zinc-500">No saved conversations yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {historyList.map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => handleResumeConversation(h.id)}
                    className="text-left font-medium truncate hover:text-emerald-700 flex-1"
                  >
                    {h.title}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteAssistantConversation(h.id, token);
                      refreshHistory();
                    }}
                    className="text-zinc-400 hover:text-red-600"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggested Prompts */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => submitQuery(s)}
            className="px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 text-xs text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 transition"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Chat Window */}
      <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col h-[560px]">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {liveActive && (
            <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center transition-transform"
                  style={{ transform: `scale(${1 + micLevel * 0.28})` }}
                >
                  <Radio className="w-5 h-5 text-emerald-300" />
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold">Gemini 3.8 Live Conversation ({liveState})</div>
                  {liveInputCaption && <div className="text-emerald-200">You: {liveInputCaption}</div>}
                  {liveOutputCaption && <div className="text-zinc-200">AI: {liveOutputCaption}</div>}
                </div>
              </div>
              <button
                type="button"
                onClick={stopLiveVoice}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold self-start sm:self-center"
              >
                End Live Session
              </button>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-2xl p-4 rounded-2xl text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-800 text-white rounded-br-none shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-bl-none border border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div>{m.text}</div>

                {/* Structured Cards */}
                {m.cards && m.cards.length > 0 && (
                  <div className="mt-3 space-y-2.5">
                    {m.cards.map((card, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2"
                      >
                        <div className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          {card.title}
                        </div>
                        {Object.keys(card.metrics).length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(card.metrics).map(([k, v]) => (
                              <div key={k} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900">
                                <div className="text-[10px] text-zinc-500">{k}</div>
                                <div className="font-semibold text-zinc-900 dark:text-white">{String(v)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {card.highlights.length > 0 && (
                          <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                            {card.highlights.map((h, hIdx) => (
                              <li key={hIdx}>{h}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending Consequential Action Confirmation Card */}
                {m.pendingAction && !m.actionStatus && (
                  <div className="mt-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs space-y-2">
                    <div className="font-bold text-amber-900 dark:text-amber-200">
                      Confirmation Required Before Execution
                    </div>
                    <div className="text-amber-900 dark:text-amber-100">{m.pendingAction.summary}</div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-300">
                      {m.pendingAction.consequences}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleConfirmAction(i, m.pendingAction!.action_id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm &amp; Execute
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleCancelAction(i, m.pendingAction!.action_id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-semibold"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Sources & Citations */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
                    {m.sources.map((src, sIdx) => (
                      <div key={sIdx} className="text-[11px] text-zinc-500 flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold">{src.source}:</span>
                        <span>{src.title}</span>
                        {src.url && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-emerald-700 hover:underline"
                          >
                            Source <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {m.provenance && (
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-1 px-1">
                  <Database className="w-3 h-3 text-emerald-500" />
                  <span>{m.provenance}</span>
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="text-xs text-zinc-500 italic">Thinking &amp; retrieving live agricultural data...</div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuery(input);
          }}
          className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2"
        >
          {micSupported && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`px-3 py-2.5 rounded-xl border transition ${
                listening
                  ? 'bg-red-600 text-white border-red-600 animate-pulse'
                  : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50'
              }`}
              aria-label={listening ? 'Stop microphone' : 'Start microphone'}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask in English, ಕನ್ನಡ, हिन्दी, or తెలుగు about crops, irrigation, finances, or transport..."
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-700 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            <span>Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
