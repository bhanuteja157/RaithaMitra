// frontend/src/app/settings/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Settings, Globe, Moon, Sun, Bell, Database } from 'lucide-react';
import { Language } from '@/types';
import { LANGUAGE_OPTIONS } from '@/lib/translations';

const SETTINGS_I18N: Record<
  Language,
  {
    title: string;
    subtitle: string;
    prefLang: string;
    prefLangSub: string;
    displayTheme: string;
    displayThemeSub: string;
    darkModeActive: string;
    lightModeActive: string;
    persistenceTitle: string;
    persistenceSub: string;
    active: string;
  }
> = {
  en: {
    title: 'Application Settings',
    subtitle: 'Customize language, theme, and persistence preferences',
    prefLang: 'Preferred Language',
    prefLangSub: 'Switch application interface language',
    displayTheme: 'Display Theme',
    displayThemeSub: 'Toggle between Light and Dark interface appearance',
    darkModeActive: 'Dark Mode Active',
    lightModeActive: 'Light Mode Active',
    persistenceTitle: 'Data Persistence Mode',
    persistenceSub: 'Local Prototype Persistence Adapter with Supabase schema parity',
    active: 'Active',
  },
  kn: {
    title: 'ಅಪ್ಲಿಕೇಶನ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    subtitle: 'ಭಾಷೆ, ಥೀಮ್ ಮತ್ತು ದತ್ತಾಂಶ ಸಂಗ್ರಹ ಆದ್ಯತೆಗಳನ್ನು ಬದಲಾಯಿಸಿ',
    prefLang: 'ಆದ್ಯತೆಯ ಭಾಷೆ',
    prefLangSub: 'ಸಂಪೂರ್ಣ ಅಪ್ಲಿಕೇಶನ್ ಭಾಷೆಯನ್ನು ತಕ್ಷಣ ಬದಲಾಯಿಸಿ',
    displayTheme: 'ಪರದೆಯ ಥೀಮ್',
    displayThemeSub: 'ಬೆಳಕು ಮತ್ತು ಕತ್ತಲೆಯ ಪರದೆಯ ನಡುವೆ ಬದಲಾಯಿಸಿ',
    darkModeActive: 'ಡಾರ್ಕ್ ಮೋಡ್ ಸಕ್ರಿಯವಾಗಿದೆ',
    lightModeActive: 'ಲೈಟ್ ಮೋಡ್ ಸಕ್ರಿಯವಾಗಿದೆ',
    persistenceTitle: 'ದತ್ತಾಂಶ ಸಂಗ್ರಹ ಸ್ಥಿತಿ',
    persistenceSub: 'ಸ್ಥಳೀಯ ಪ್ರೋಟೋಟೈಪ್ ಸಂಗ್ರಹಣಾ ಅಡಾಪ್ಟರ್',
    active: 'ಸಕ್ರಿಯ',
  },
  hi: {
    title: 'एप्लिकेशन सेटिंग्स',
    subtitle: 'भाषा, थीम और डेटा संग्रह प्राथमिकताएं बदलें',
    prefLang: 'पसंदीदा भाषा',
    prefLangSub: 'संपूर्ण ऐप इंटरफ़ेस की भाषा तुरंत बदलें',
    displayTheme: 'डिस्प्ले थीम',
    displayThemeSub: 'लाइट और डार्क इंटरफ़ेस के बीच बदलें',
    darkModeActive: 'डार्क मोड सक्रिय',
    lightModeActive: 'लाइट मोड सक्रिय',
    persistenceTitle: 'डेटा संग्रहण मोड',
    persistenceSub: 'स्थानीय प्रोटोटाइप डेटा संग्रहण एडाप्टर',
    active: 'सक्रिय',
  },
  te: {
    title: 'యాప్ సెట్టింగ్‌లు',
    subtitle: 'భాష, థీమ్ మరియు డేటా నిల్వ ప్రాధాన్యతలను మార్చండి',
    prefLang: 'ప్రాధాన్య భాష',
    prefLangSub: 'యాప్ మొత్తం భాషను వెంటనే మార్చండి',
    displayTheme: 'డిస్ప్లే థీమ్',
    displayThemeSub: 'లైట్ మరియు డార్క్ మోడ్ మధ్య మారండి',
    darkModeActive: 'డార్క్ మోడ్ సక్రియంగా ఉంది',
    lightModeActive: 'లైట్ మోడ్ సక్రియంగా ఉంది',
    persistenceTitle: 'డేటా నిల్వ మోడ్',
    persistenceSub: 'స్థానిక ప్రోటోటైప్ డేటా నిల్వ అడాప్టర్',
    active: 'సక్రియం',
  },
};

export default function SettingsPage() {
  const { language, setLanguage, theme, toggleTheme } = useFarm();
  const t = SETTINGS_I18N[language];

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              {t.title}
            </h1>
            <p className="text-xs text-zinc-500">
              {t.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-6">
        {/* Language Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 gap-3">
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white">{t.prefLang}</div>
            <div className="text-xs text-zinc-500">{t.prefLangSub}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {LANGUAGE_OPTIONS.map((item) => (
              <button
                key={item.code}
                onClick={() => setLanguage(item.code)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  language === item.code
                    ? 'bg-rm-primary text-white shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {item.nativeLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 gap-3">
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white">{t.displayTheme}</div>
            <div className="text-xs text-zinc-500">{t.displayThemeSub}</div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold self-start"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            <span>{theme === 'dark' ? t.darkModeActive : t.lightModeActive}</span>
          </button>
        </div>

        {/* Persistence Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white">{t.persistenceTitle}</div>
            <div className="text-xs text-zinc-500">{t.persistenceSub}</div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 self-start">
            {t.active}
          </span>
        </div>
      </div>
    </div>
  );
}
