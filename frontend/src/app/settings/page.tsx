// frontend/src/app/settings/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Settings, Globe, Moon, Sun, Bell, Database } from 'lucide-react';
import { Language } from '@/types';

export default function SettingsPage() {
  const { language, setLanguage, theme, toggleTheme } = useFarm();

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              Application Settings
            </h1>
            <p className="text-xs text-zinc-500">
              Customize language, theme, and persistence preferences
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-6">
        {/* Language Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 gap-3">
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white">Preferred Language</div>
            <div className="text-xs text-zinc-500">Switch application interface language</div>
          </div>
          <div className="flex items-center gap-2">
            {[
              { code: 'en' as Language, label: 'English' },
              { code: 'kn' as Language, label: 'ಕನ್ನಡ' },
              { code: 'hi' as Language, label: 'हिन्दी' },
            ].map(item => (
              <button
                key={item.code}
                onClick={() => setLanguage(item.code)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  language === item.code
                    ? 'bg-rm-primary text-white shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 gap-3">
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white">Display Theme</div>
            <div className="text-xs text-zinc-500">Toggle between Light and Dark interface appearance</div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold self-start"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            <span className="capitalize">{theme} Mode Active</span>
          </button>
        </div>

        {/* Persistence Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white">Data Persistence Mode</div>
            <div className="text-xs text-zinc-500">Local Prototype Persistence Adapter with Supabase schema parity</div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 self-start">
            Active
          </span>
        </div>
      </div>
    </div>
  );
}
