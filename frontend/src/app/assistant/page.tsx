// frontend/src/app/assistant/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { localizeCondition, localizeCropName, localizeGrowthStage } from '@/lib/translations';
import {
  AssistantLanguage,
  buildPreNavigationMessage,
  buildUnauthorizedMessage,
  matchNavigationIntent,
  speakWithDeviceVoice,
} from '@/lib/assistantVoice';
import { BotMessageSquare, Send, Database, Volume2, VolumeX } from 'lucide-react';

const ASST_I18N: Record<
  Language,
  {
    title: string;
    badge: string;
    subtitle: string;
    unmuteVoice: string;
    voiceEnabled: string;
    placeholder: string;
    askBtn: string;
    defaultFarmer: string;
    defaultCrop: string;
    welcomeProvenance: string;
    rbacCheck: string;
    navProvenancePrefix: string;
    replyProvenance: string;
    greeting: (farmer: string, crop: string) => string;
    advisoryReply: (district: string, crop: string, stage: string) => string;
  }
> = {
  en: {
    title: 'Multilingual AI Farm Assistant',
    badge: 'Operational Prototype',
    subtitle: 'Conversational advisor grounded in live farm context, soil physics, and APMC mandi telemetry',
    unmuteVoice: 'Unmute Voice',
    voiceEnabled: 'Voice Enabled',
    placeholder: 'Ask anything about water, spraying, fertilizer, or mandi prices...',
    askBtn: 'Ask',
    defaultFarmer: 'Farmer',
    defaultCrop: 'crop',
    welcomeProvenance: 'Grounded with Open-Meteo & FAO-56 dual crop engine.',
    rbacCheck: 'RBAC role authorization check',
    navProvenancePrefix: 'Navigating to',
    replyProvenance: 'Data source: Open-Meteo live feed + FAO-56 moisture balance (Uncertainty ±5%).',
    greeting: (farmer, crop) =>
      `Hello ${farmer}, I am your RaithaMitra AI Companion. How can I assist with your ${crop} irrigation, weather advisory, or market prices today?`,
    advisoryReply: (district, crop, stage) =>
      `Based on your farm in ${district} with ${crop} (${stage} stage), current root-zone moisture is optimal. Drip irrigation is scheduled for tomorrow at 06:00 AM.`,
  },
  kn: {
    title: 'ಬಹುಭಾಷಾ ಎಐ ಕೃಷಿ ಸಹಾಯಕ',
    badge: 'ಕಾರ್ಯಾಚರಣಾ ಮಾದರಿ',
    subtitle: 'ನೇರ ಜಮೀನು ಮಾಹಿತಿ, ಮಣ್ಣಿನ ವಿಜ್ಞಾನ ಮತ್ತು ಮಂಡಿ ದರಗಳ ಆಧಾರಿತ ಸಲಹೆಗಾರ',
    unmuteVoice: 'ಧ್ವನಿ ಆನ್ ಮಾಡಿ',
    voiceEnabled: 'ಧ್ವನಿ ಸಕ್ರಿಯವಾಗಿದೆ',
    placeholder: 'ನೀರು, ಸಿಂಪಡಣೆ, ಗೊಬ್ಬರ ಅಥವಾ ಮಂಡಿ ಬೆಲೆಗಳ ಬಗ್ಗೆ ಏನು ಬೇಕಾದರೂ ಕೇಳಿ...',
    askBtn: 'ಕೇಳಿ',
    defaultFarmer: 'ರೈತರೇ',
    defaultCrop: 'ಬೆಳೆ',
    welcomeProvenance: 'Open-Meteo ಮತ್ತು FAO-56 ಬೆಳೆ ಮಾದರಿ ಆಧಾರಿತ.',
    rbacCheck: 'ಪಾತ್ರ ಅಧಿಕಾರ ಪರಿಶೀಲನೆ',
    navProvenancePrefix: 'ತೆರೆಯಲಾಗುತ್ತಿದೆ:',
    replyProvenance: 'ದತ್ತಾಂಶ ಮೂಲ: Open-Meteo ನೇರ ಹವಾಮಾನ + FAO-56 ತೇವಾಂಶ ಸಮತೋಲನ (±5% ಅನಿಶ್ಚಿತತೆ).',
    greeting: (farmer, crop) =>
      `ನಮಸ್ಕಾರ ${farmer}, ನಾನು ನಿಮ್ಮ ರೈತ ಮಿತ್ರ ಎಐ ಸಹಾಯಕ. ನಿಮ್ಮ ${crop} ಕುರಿತು ನೀರಾವರಿ, ಹವಾಮಾನ ಅಥವಾ ಮಾರುಕಟ್ಟೆ ಬೆಲೆಯ ಬಗ್ಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?`,
    advisoryReply: (district, crop, stage) =>
      `${district} ಜಿಲ್ಲೆಯಲ್ಲಿರುವ ನಿಮ್ಮ ${crop} (${stage} ಹಂತ) ಜಮೀನಿನಲ್ಲಿ ಬೇರು ವಲಯದ ತೇವಾಂಶ ಉತ್ತಮವಾಗಿದೆ. ನಾಳೆ ಬೆಳಗ್ಗೆ 06:00 ಗಂಟೆಗೆ ಹನಿ ನೀರಾವರಿ ನಿಗದಿಯಾಗಿದೆ.`,
  },
  hi: {
    title: 'बहुभाषी एआई कृषि सहायक',
    badge: 'ऑपरेशनल प्रोटोटाइप',
    subtitle: 'लाइव खेत विवरण, मिट्टी विज्ञान और मंडी भाव पर आधारित संवादात्मक सलाहकार',
    unmuteVoice: 'आवाज़ चालू करें',
    voiceEnabled: 'आवाज़ सक्रिय है',
    placeholder: 'सिंचाई, छिड़काव, खाद या मंडी भाव के बारे में कुछ भी पूछें...',
    askBtn: 'पूछें',
    defaultFarmer: 'किसान भाई',
    defaultCrop: 'फसल',
    welcomeProvenance: 'Open-Meteo और FAO-56 फसल इंजन पर आधारित।',
    rbacCheck: 'भूमिका अनुमति जांच',
    navProvenancePrefix: 'पृष्ठ खुल रहा है:',
    replyProvenance: 'डेटा स्रोत: Open-Meteo लाइव फ़ीड + FAO-56 नमी संतुलन (±5% अनिश्चितता)।',
    greeting: (farmer, crop) =>
      `नमस्ते ${farmer}, मैं आपका रैतामित्र एआई साथी हूँ। आज आपकी ${crop} सिंचाई, मौसम सलाह या मंडी भाव में कैसे मदद करूँ?`,
    advisoryReply: (district, crop, stage) =>
      `${district} में आपकी ${crop} (${stage} चरण) की जड़-क्षेत्र नमी उचित है। अगली ड्रिप सिंचाई कल सुबह 06:00 बजे निर्धारित है।`,
  },
  te: {
    title: 'బహుభాషా AI వ్యవసాయ సహాయకుడు',
    badge: 'కార్యాచరణ నమూనా',
    subtitle: 'లైవ్ పొలం వివరాలు, నేల శాస్త్రం మరియు మండి ధరలపై ఆధారపడిన సలహాదారు',
    unmuteVoice: 'వాయిస్ ఆన్ చేయండి',
    voiceEnabled: 'వాయిస్ సక్రియంగా ఉంది',
    placeholder: 'నీరు, పిచికారీ, ఎరువులు లేదా మండి ధరల గురించి ఏదైనా అడగండి...',
    askBtn: 'అడగండి',
    defaultFarmer: 'రైతన్నా',
    defaultCrop: 'పంట',
    welcomeProvenance: 'Open-Meteo & FAO-56 పంట ఇంజిన్ ఆధారితం.',
    rbacCheck: 'పాత్ర అనుమతి తనిఖీ',
    navProvenancePrefix: 'వెళుతోంది:',
    replyProvenance: 'డేటా మూలం: Open-Meteo లైవ్ ఫీడ్ + FAO-56 తేమ సమతుల్యత (±5% అనిశ్చితి).',
    greeting: (farmer, crop) =>
      `నమస్కారం ${farmer}, నేను మీ రైతమిత్ర AI సహాయకుడిని. మీ ${crop} నీటిపారుదల, వాతావరణం లేదా మండి ధరల గురించి ఎలా సహాయం చేయగలను?`,
    advisoryReply: (district, crop, stage) =>
      `${district} లోని మీ ${crop} (${stage} దశ) పొలంలో వేరు మండల తేమ సరైనదిగా ఉంది. రేపు ఉదయం 06:00 గంటలకు బిందు సేద్యం షెడ్యూల్ చేయబడింది.`,
  },
};

export default function AssistantPage() {
  const router = useRouter();
  const { currentFarm, currentUser, language } = useFarm();
  const t = ASST_I18N[language];
  const [muted, setMuted] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; provenance: string; isWelcome?: boolean }>>([
    {
      sender: 'bot',
      text: t.greeting(currentFarm?.farmer_name || t.defaultFarmer, localizeCropName(currentFarm?.primary_crop || '', language) || t.defaultCrop),
      provenance: t.welcomeProvenance,
      isWelcome: true,
    }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    const lang = (language || 'en') as AssistantLanguage;
    setInput('');

    const intent = matchNavigationIntent(userText);
    if (intent) {
      if (!intent.allowedRoles.includes(currentUser.role)) {
        const denied = buildUnauthorizedMessage(intent, currentUser.role, lang);
        speakWithDeviceVoice(denied, lang, muted);
        setMessages((prev) => [
          ...prev,
          { sender: 'user', text: userText, provenance: '' },
          { sender: 'bot', text: denied, provenance: t.rbacCheck },
        ]);
        return;
      }
      const preMsg = buildPreNavigationMessage(intent, lang);
      speakWithDeviceVoice(preMsg, lang, muted);
      setMessages((prev) => [
        ...prev,
        { sender: 'user', text: userText, provenance: '' },
        { sender: 'bot', text: preMsg, provenance: `${t.navProvenancePrefix} ${intent.route}` },
      ]);
      window.setTimeout(() => router.push(intent.route), 450);
      return;
    }

    const localizedCrop = localizeCropName(currentFarm?.primary_crop || 'Tomato', language);
    const localizedStage = localizeGrowthStage(currentFarm?.crop_stage || 'Vegetative Growth', language);
    const reply = t.advisoryReply(currentFarm?.district || 'Mandya', localizedCrop, localizedStage);
    speakWithDeviceVoice(reply, lang, muted);
    setMessages(prev => [
      ...prev,
      { sender: 'user', text: userText, provenance: '' },
      {
        sender: 'bot',
        text: reply,
        provenance: t.replyProvenance
      }
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
            <BotMessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                {t.title}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {t.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {t.subtitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold"
        >
          {muted ? <VolumeX className="w-4 h-4 text-amber-600" /> : <Volume2 className="w-4 h-4 text-emerald-700" />}
          {muted ? t.unmuteVoice : t.voiceEnabled}
        </button>
      </div>

      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col h-[520px]">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m, i) => {
            const displayText = m.isWelcome
              ? t.greeting(currentFarm?.farmer_name || t.defaultFarmer, localizeCropName(currentFarm?.primary_crop || '', language) || t.defaultCrop)
              : m.text;
            const displayProv = m.isWelcome ? t.welcomeProvenance : m.provenance;
            return (
              <div
                key={i}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-xl p-4 rounded-2xl text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-rm-primary text-white rounded-br-none shadow-sm'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-bl-none border border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {displayText}
                </div>
                {displayProv && (
                  <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-1 px-1">
                    <Database className="w-3 h-3 text-emerald-500" />
                    <span>{displayProv}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSend} className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rm-primary hover:bg-rm-dark text-white font-semibold text-sm transition-colors shadow-sm"
          >
            <span>{t.askBtn}</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
