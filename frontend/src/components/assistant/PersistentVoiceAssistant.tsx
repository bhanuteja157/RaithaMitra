// frontend/src/components/assistant/PersistentVoiceAssistant.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import {
  AssistantLanguage,
  RouteIntent,
  buildPostNavigationMessage,
  buildPreNavigationMessage,
  buildUnauthorizedMessage,
  getBcp47ForLanguage,
  matchNavigationIntent,
  speakWithDeviceVoice,
} from '@/lib/assistantVoice';
import { Mic, MicOff, Volume2, VolumeX, Send, X, Sprout, MessageSquare } from 'lucide-react';

type AssistantState = 'idle' | 'listening' | 'processing' | 'navigating' | 'speaking';

export function PersistentVoiceAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, language } = useFarm();

  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [state, setState] = useState<AssistantState>('idle');
  const [input, setInput] = useState('');
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const pendingIntentRef = useRef<RouteIntent | null>(null);
  const recognitionRef = useRef<any>(null);

  const lang = (language || 'en') as AssistantLanguage;

  // Confirm navigation only after Next.js pathname actually matches target route
  useEffect(() => {
    const pending = pendingIntentRef.current;
    if (!pending) return;
    if (pathname === pending.route) {
      pendingIntentRef.current = null;
      const msg = buildPostNavigationMessage(pending, lang);
      setTranscriptText(msg);
      const res = speakWithDeviceVoice(msg, lang, muted, {
        onStart: () => setState('speaking'),
        onEnd: () => setState('idle'),
      });
      if (res.voiceUnavailableReason) setVoiceNote(res.voiceUnavailableReason);
    }
  }, [pathname, lang, muted]);

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
  };

  const handleCommand = (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    stopListening(); // Prevent mic from capturing assistant voice
    setVoiceNote(null);
    setState('processing');

    const intent = matchNavigationIntent(text);
    if (!intent) {
      const msg =
        lang === 'kn'
          ? 'ದಯವಿಟ್ಟು "Open BioIntel", "Open Digital Farming", ಅಥವಾ "Open Market Intelligence" ಎಂದು ಹೇಳಿ.'
          : lang === 'hi'
            ? 'कृपया "Open BioIntel", "Open Digital Farming", या "Open Market Intelligence" कहें।'
            : 'Try saying "Open BioIntel", "Open Digital Farming", "Open Labour Connect", or "Open Market Intelligence".';
      setTranscriptText(msg);
      speakWithDeviceVoice(msg, lang, muted, {
        onStart: () => setState('speaking'),
        onEnd: () => setState('idle'),
      });
      return;
    }

    // RBAC check
    if (!intent.allowedRoles.includes(currentUser.role)) {
      const msg = buildUnauthorizedMessage(intent, currentUser.role, lang);
      setTranscriptText(msg);
      speakWithDeviceVoice(msg, lang, muted, {
        onStart: () => setState('speaking'),
        onEnd: () => setState('idle'),
      });
      return;
    }

    // Pre-navigation acknowledgement
    const preMsg = buildPreNavigationMessage(intent, lang);
    setTranscriptText(preMsg);
    setState('navigating');
    speakWithDeviceVoice(preMsg, lang, muted, {
      onStart: () => setState('speaking'),
      onEnd: () => {
        if (!pendingIntentRef.current) setState('idle');
      },
    });

    if (pathname === intent.route) {
      const postMsg = buildPostNavigationMessage(intent, lang);
      setTranscriptText(postMsg);
      speakWithDeviceVoice(postMsg, lang, muted, {
        onStart: () => setState('speaking'),
        onEnd: () => setState('idle'),
      });
    } else {
      pendingIntentRef.current = intent;
      router.push(intent.route);
    }
  };

  const toggleMic = () => {
    if (state === 'listening') {
      stopListening();
      setState('idle');
      return;
    }

    const SpeechRecognitionCtor =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognitionCtor) {
      setVoiceNote('Browser voice recognition is unavailable here; type your command below.');
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const rec = new SpeechRecognitionCtor();
    rec.lang = getBcp47ForLanguage(lang);
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setState('listening');
    rec.onresult = (event: any) => {
      const spoken = event.results?.[0]?.[0]?.transcript || '';
      setInput(spoken);
      handleCommand(spoken);
    };
    rec.onerror = () => {
      setState('idle');
      setVoiceNote('Could not capture voice; please type your command.');
    };
    rec.onend = () => {
      setState((prev) => (prev === 'listening' ? 'idle' : prev));
    };

    recognitionRef.current = rec;
    rec.start();
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-80 sm:w-96 rounded-2xl border border-[#DCD8CA] dark:border-zinc-800 bg-[#F7F5ED] dark:bg-zinc-900 shadow-2xl overflow-hidden">
          <div className="px-4 py-3 bg-[#173C2B] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center bg-[#36784D] ${
                  state !== 'idle' ? 'rm-orb-active' : ''
                }`}
              >
                <Sprout className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold">RaithaMitra Voice Guide</div>
                <div className="text-[10px] text-emerald-200 capitalize">{state}</div>
              </div>
              {(state === 'listening' || state === 'speaking') && (
                <div className="flex items-center gap-0.5 h-4 ml-1" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-0.5 h-3.5 rounded-full bg-[#65A76F] rm-wave-bar"
                      style={{ animationDelay: `${i * 0.14}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (!muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  setMuted((m) => !m);
                }}
                aria-label={muted ? 'Unmute assistant voice' : 'Mute assistant voice'}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                {muted ? <VolumeX className="w-4 h-4 text-amber-300" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close voice assistant"
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-3.5 space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 text-[#20372A] dark:text-zinc-200 min-h-[54px]">
              {transcriptText ||
                'Say or type a command like "Open BioIntel", "Open Digital Farming", or "Open Smart Bidding".'}
            </div>

            {voiceNote && (
              <div className="text-[11px] text-[#8D7357] dark:text-amber-300">{voiceNote}</div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCommand(input);
                setInput('');
              }}
              className="flex items-center gap-1.5"
            >
              <button
                type="button"
                onClick={toggleMic}
                aria-label={state === 'listening' ? 'Stop microphone' : 'Start microphone'}
                className={`p-2 rounded-xl border ${
                  state === 'listening'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white dark:bg-zinc-800 border-[#DCD8CA] dark:border-zinc-700 text-[#173C2B] dark:text-emerald-300'
                }`}
              >
                {state === 'listening' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. Open BioIntel"
                className="flex-1 px-3 py-2 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
              />
              <button
                type="submit"
                aria-label="Send command"
                className="p-2 rounded-xl bg-[#173C2B] hover:bg-[#102D20] text-white"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle RaithaMitra Voice Assistant"
        className="w-12 h-12 rounded-full bg-[#173C2B] hover:bg-[#102D20] text-white shadow-lg border border-[#65A76F]/40 flex items-center justify-center transition"
      >
        {open ? <MessageSquare className="w-5 h-5" /> : <Sprout className="w-5 h-5 text-[#65A76F]" />}
      </button>
    </div>
  );
}
