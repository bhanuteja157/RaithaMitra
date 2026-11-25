// frontend/src/app/finance/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { getIntlLocale } from '@/lib/translations';
import { Coins, TrendingUp, DollarSign, Wallet } from 'lucide-react';

const FIN_I18N: Record<
  Language,
  {
    title: string;
    badge: string;
    subtitle: string;
    budgetTitle: string;
    budgetSub: string;
    incurredTitle: string;
    incurredSub: string;
    revenueTitle: string;
    revenueSub: string;
  }
> = {
  en: {
    title: 'Farm Financial Intelligence',
    badge: 'Operational Prototype',
    subtitle: 'Cultivation cost structure, working capital tracking, and revenue forecasting',
    budgetTitle: 'Allocated Season Budget',
    budgetSub: 'Farmer registered budget cap',
    incurredTitle: 'Current Incurred Expenses',
    incurredSub: '72.9% of budget utilized',
    revenueTitle: 'Projected Harvest Gross Revenue',
    revenueSub: 'ROI Potential: 15.7x',
  },
  kn: {
    title: 'ಜಮೀನು ಆರ್ಥಿಕ ಬುದ್ಧಿಮತ್ತೆ',
    badge: 'ಕಾರ್ಯಾಚರಣಾ ಮಾದರಿ',
    subtitle: 'ಸಾಗುವಳಿ ವೆಚ್ಚದ ರಚನೆ, ಕಾರ್ಯನಿರತ ಬಂಡವಾಳ ಮತ್ತು ಆದಾಯ ಮುನ್ಸೂಚನೆ',
    budgetTitle: 'ಹಂಚಿಕೆ ಮಾಡಿದ ಋತುಮಾನದ ಬಜೆಟ್',
    budgetSub: 'ರೈತರು ನಮೂದಿಸಿದ ಬಜೆಟ್ ಮಿತಿ',
    incurredTitle: 'ಪ್ರಸ್ತುತ ಖರ್ಚಾದ ವೆಚ್ಚಗಳು',
    incurredSub: 'ಬಜೆಟ್‌ನ 72.9% ಬಳಸಲಾಗಿದೆ',
    revenueTitle: 'ಅಂದಾಜು ಕೊಯ್ಲು ಒಟ್ಟು ಆದಾಯ',
    revenueSub: 'ROI ಸಾಮರ್ಥ್ಯ: 15.7x',
  },
  hi: {
    title: 'खेत वित्तीय बुद्धिमत्ता',
    badge: 'ऑपरेशनल प्रोटोटाइप',
    subtitle: 'खेती लागत संरचना, कार्यशील पूंजी ट्रैकिंग और आय पूर्वानुमान',
    budgetTitle: 'आवंटित सीज़न बजट',
    budgetSub: 'किसान द्वारा निर्धारित बजट सीमा',
    incurredTitle: 'वर्तमान में हुआ खर्च',
    incurredSub: 'बजट का 72.9% उपयोग हुआ',
    revenueTitle: 'अनुमानित कटाई सकल आय',
    revenueSub: 'ROI क्षमता: 15.7x',
  },
  te: {
    title: 'పొలం ఆర్థిక మేధస్సు',
    badge: 'కార్యాచరణ నమూనా',
    subtitle: 'సాగు ఖర్చుల నిర్మాణం, మూలధన ట్రాకింగ్ మరియు ఆదాయ అంచనా',
    budgetTitle: 'కేటాయించిన సీజన్ బడ్జెట్',
    budgetSub: 'రైతు నమోదు చేసిన బడ్జెట్ పరిమితి',
    incurredTitle: 'ఇప్పటివరకు అయిన ఖర్చులు',
    incurredSub: 'బడ్జెట్‌లో 72.9% వినియోగమైంది',
    revenueTitle: 'అంచనా కోత మొత్తం ఆదాయం',
    revenueSub: 'ROI సామర్థ్యం: 15.7x',
  },
};

export default function FinancePage() {
  const { currentFarm, summary, language } = useFarm();
  const t = FIN_I18N[language];
  const numLocale = getIntlLocale(language);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
            <Coins className="w-6 h-6" />
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{t.budgetTitle}</div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">
            ₹{currentFarm?.cultivation_budget_inr.toLocaleString(numLocale)}
          </div>
          <div className="text-[11px] text-zinc-400">{t.budgetSub}</div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{t.incurredTitle}</div>
          <div className="text-3xl font-bold text-amber-600">
            ₹{(summary?.total_expenses_inr || 87500).toLocaleString(numLocale)}
          </div>
          <div className="text-[11px] text-zinc-400">{t.incurredSub}</div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{t.revenueTitle}</div>
          <div className="text-3xl font-bold text-emerald-600">
            ₹{(summary?.expected_revenue_inr || 1375000).toLocaleString(numLocale)}
          </div>
          <div className="text-[11px] text-emerald-600">{t.revenueSub}</div>
        </div>
      </div>
    </div>
  );
}
