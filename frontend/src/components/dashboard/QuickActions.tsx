// frontend/src/components/dashboard/QuickActions.tsx
'use client';

import React, { useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { Droplet, Bug, Award, PlusCircle, CheckCircle } from 'lucide-react';

const QA_I18N: Record<Language, {
  loggedPrefix: string; dripAction: string; dripSub: string;
  scoutAction: string; scoutSub: string; schemesSub: string; newFarmSub: string;
}> = {
  en: {
    loggedPrefix: 'Action logged:', dripAction: 'Scheduled 2-hour Drip Cycle', dripSub: 'Drip Cycle',
    scoutAction: 'Logged Leaf Scout Inspection', scoutSub: 'AI Camera', schemesSub: 'PM-KISAN / PMFBY', newFarmSub: 'Add Farm Parcel',
  },
  kn: {
    loggedPrefix: 'ದಾಖಲಿಸಲಾಗಿದೆ:', dripAction: '2 ಗಂಟೆಗಳ ಹನಿ ನೀರಾವರಿ ನಿಗದಿತವಾಗಿದೆ', dripSub: 'ಹನಿ ನೀರಾವರಿ',
    scoutAction: 'ಎಲೆ ರೋಗ ಪರಿಶೀಲನೆ ದಾಖಲಾಗಿದೆ', scoutSub: 'AI ಕ್ಯಾಮೆರಾ', schemesSub: 'PM-KISAN / ವಿಮೆ', newFarmSub: 'ಜಮೀನು ಸೇರಿಸಿ',
  },
  hi: {
    loggedPrefix: 'दर्ज किया गया:', dripAction: '2 घंटे की ड्रिप सिंचाई तय की गई', dripSub: 'ड्रिप सिंचाई',
    scoutAction: 'पत्ती जांच निरीक्षण दर्ज किया गया', scoutSub: 'AI कैमरा', schemesSub: 'PM-KISAN / बीमा', newFarmSub: 'नया खेत जोड़ें',
  },
  te: {
    loggedPrefix: 'నమోదైంది:', dripAction: '2 గంటల బిందు సేద్యం షెడ్యూల్ అయింది', dripSub: 'బిందు సేద్యం',
    scoutAction: 'ఆకు వ్యాధి తనిఖీ నమోదైంది', scoutSub: 'AI కెమెరా', schemesSub: 'PM-KISAN / బీమా', newFarmSub: 'కొత్త పొలం చేర్చండి',
  },
};

export function QuickActions() {
  const { setIsOnboardingOpen, currentFarm, t, language } = useFarm();
  const L = QA_I18N[language] || QA_I18N.en;
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const triggerAction = (label: string) => {
    setFeedbackMsg(`${L.loggedPrefix} ${label} — ${currentFarm?.farm_name || ''}`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  return (
    <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">
          {t('quickActions')}
        </h2>
        {feedbackMsg && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg">
            <CheckCircle className="w-3.5 h-3.5" />
            {feedbackMsg}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => triggerAction(L.dripAction)}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20 text-center transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 mb-2 group-hover:scale-105 transition-transform">
            <Droplet className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            {t('scheduleIrrigation')}
          </span>
          <span className="text-[10px] text-zinc-500 mt-0.5">{L.dripSub}</span>
        </button>

        <button
          onClick={() => triggerAction(L.scoutAction)}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-center transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 mb-2 group-hover:scale-105 transition-transform">
            <Bug className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            {t('scoutPest')}
          </span>
          <span className="text-[10px] text-zinc-500 mt-0.5">{L.scoutSub}</span>
        </button>

        <a
          href="/finance-benefits"
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-center transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 mb-2 group-hover:scale-105 transition-transform">
            <Award className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            {t('browseSchemes')}
          </span>
          <span className="text-[10px] text-zinc-500 mt-0.5">{L.schemesSub}</span>
        </a>

        <button
          onClick={() => setIsOnboardingOpen(true)}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-rm-primary hover:bg-rm-primary/5 dark:hover:bg-rm-accent/10 text-center transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-rm-primary/10 dark:bg-rm-accent/20 text-rm-primary dark:text-rm-accent mb-2 group-hover:scale-105 transition-transform">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            {t('newFarm')}
          </span>
          <span className="text-[10px] text-zinc-500 mt-0.5">{L.newFarmSub}</span>
        </button>
      </div>
    </div>
  );
}
