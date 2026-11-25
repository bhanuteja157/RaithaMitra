// frontend/src/app/finance-benefits/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import FinancePage from '@/app/finance/page';
import SchemesPage from '@/app/schemes/page';
import { FinanceWorkflowSnapshot, loadFinanceSnapshot } from '@/lib/workflowBridge';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { getIntlLocale, localizeCropName } from '@/lib/translations';
import { Coins, Award } from 'lucide-react';

type Section = 'finance' | 'schemes';

const FIN_BEN_I18N: Record<
  Language,
  {
    title: string;
    subtitle: string;
    projectedPlan: string;
    notRecorded: string;
    estCost: string;
    estRevenue: string;
    estProfit: string;
    tabFinance: string;
    tabSchemes: string;
  }
> = {
  en: {
    title: 'Finance & Government Benefits',
    subtitle: 'Track cultivation expenses, projected profits, and eligible government subsidies.',
    projectedPlan: 'Projected Plan',
    notRecorded: 'Not Recorded Transactions',
    estCost: 'Est. Cost:',
    estRevenue: 'Est. Revenue:',
    estProfit: 'Est. Profit:',
    tabFinance: '1. Expenses & Profit',
    tabSchemes: '2. Government Schemes & Subsidies',
  },
  kn: {
    title: 'ಹಣಕಾಸು ಮತ್ತು ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳು',
    subtitle: 'ಸಾಗುವಳಿ ವೆಚ್ಚಗಳು, ಅಂದಾಜು ಲಾಭ ಮತ್ತು ಅರ್ಹ ಸರ್ಕಾರಿ ಸಹಾಯಧನಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ.',
    projectedPlan: 'ಅಂದಾಜು ಯೋಜನೆ',
    notRecorded: 'ದಾಖಲಿಸಿದ ವಹಿವಾಟುಗಳಲ್ಲ',
    estCost: 'ಅಂದಾಜು ವೆಚ್ಚ:',
    estRevenue: 'ಅಂದಾಜು ಆದಾಯ:',
    estProfit: 'ಅಂದಾಜು ಲಾಭ:',
    tabFinance: '1. ವೆಚ್ಚಗಳು ಮತ್ತು ಲಾಭ',
    tabSchemes: '2. ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಮತ್ತು ಸಬ್ಸಿಡಿಗಳು',
  },
  hi: {
    title: 'वित्त एवं सरकारी लाभ',
    subtitle: 'खेती खर्च, अनुमानित लाभ और पात्र सरकारी सब्सिडी योजनाओं को ट्रैक करें।',
    projectedPlan: 'अनुमानित योजना',
    notRecorded: 'दर्ज किए गए वास्तविक लेनदेन नहीं',
    estCost: 'अनुमानित लागत:',
    estRevenue: 'अनुमानित आय:',
    estProfit: 'अनुमानित लाभ:',
    tabFinance: '1. खर्च और लाभ',
    tabSchemes: '2. सरकारी योजनाएं व सब्सिडी',
  },
  te: {
    title: 'ఆర్థికం & ప్రభుత్వ ప్రయోజనాలు',
    subtitle: 'సాగు ఖర్చులు, అంచనా లాభాలు మరియు అర్హత గల ప్రభుత్వ రాయితీలను ట్రాక్ చేయండి.',
    projectedPlan: 'అంచనా ప్రణాళిక',
    notRecorded: 'నమోదైన లావాదేవీలు కావు',
    estCost: 'అంచనా ఖర్చు:',
    estRevenue: 'అంచనా ఆదాయం:',
    estProfit: 'అంచనా లాభం:',
    tabFinance: '1. ఖర్చులు & లాభం',
    tabSchemes: '2. ప్రభుత్వ పథకాలు & సబ్సిడీలు',
  },
};

export default function FinanceBenefitsPage() {
  const { currentUser, language } = useFarm();
  const t = FIN_BEN_I18N[language];
  const numLocale = getIntlLocale(language);
  const [section, setSection] = useState<Section>('finance');
  const [snapshot, setSnapshot] = useState<FinanceWorkflowSnapshot | null>(null);

  useEffect(() => {
    const sec = new URLSearchParams(window.location.search).get('section');
    if (sec === 'finance' || sec === 'schemes') {
      setSection(sec);
    }
    setSnapshot(loadFinanceSnapshot(currentUser.id));
  }, [currentUser.id]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
          {t.title}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          {t.subtitle}
        </p>
      </div>

      {snapshot && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex flex-wrap gap-4">
          <strong>{t.projectedPlan} ({localizeCropName(snapshot.cropName, language)} — {t.notRecorded}):</strong>
          <span>{t.estCost} ₹{snapshot.projectedCultivationCostInr.toLocaleString(numLocale)}</span>
          <span>{t.estRevenue} ₹{snapshot.projectedRevenueInr.toLocaleString(numLocale)}</span>
          <span>{t.estProfit} ₹{snapshot.projectedProfitInr.toLocaleString(numLocale)}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[
          { id: 'finance' as const, label: t.tabFinance, icon: Coins },
          { id: 'schemes' as const, label: t.tabSchemes, icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold border transition ${
                section === tab.id
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                  : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div>
        {section === 'finance' && <FinancePage />}
        {section === 'schemes' && <SchemesPage />}
      </div>
    </div>
  );
}
