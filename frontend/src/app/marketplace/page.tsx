// frontend/src/app/marketplace/page.tsx
'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import {
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  ArrowUpRight,
  Sparkles,
  Dna,
  ChevronRight,
} from 'lucide-react';
import NurseryMarketplacePage from '@/app/nursery-marketplace/page';

const MKT_PAGE_I18N: Record<
  Language,
  {
    tabNursery: string;
    tabCommodity: string;
    loading: string;
    title: string;
    badge: string;
    subtitle: string;
    biointelCta: string;
    mandyaPriceTitle: string;
    mandyaTrend: string;
    contractTitle: string;
    contractSub: string;
    collectiveTitle: string;
    collectiveValue: string;
    collectiveSub: string;
    qtlUnit: string;
  }
> = {
  en: {
    tabNursery: 'Intelligent Nursery & Bio-Inputs (Feature 18)',
    tabCommodity: 'Commodity & Mandi Prices (APMC Feed)',
    loading: 'Loading Marketplace...',
    title: 'Intelligent Marketplace & Demand Aggregation',
    badge: 'Operational Prototype',
    subtitle: 'AGMARKNET real-time mandi prices, buyer procurement bids, and farmer collective pooling',
    biointelCta: 'BioIntel Variety Recommender',
    mandyaPriceTitle: 'Mandya APMC Modal Price',
    mandyaTrend: '+8.4% over 7 days',
    contractTitle: 'Buyer Direct Contract Demand',
    contractSub: 'FPO Wholesale Premium',
    collectiveTitle: 'Collective Lot Size',
    collectiveValue: '18.5 Tonnes',
    collectiveSub: '4 local farmers pooled',
    qtlUnit: 'qtl',
  },
  kn: {
    tabNursery: 'ಬುದ್ಧಿವಂತ ನರ್ಸರಿ ಮತ್ತು ಜೈವಿಕ ಒಳಸುರಿಗಳು',
    tabCommodity: 'ಸರಕು ಮತ್ತು ಮಂಡಿ ಬೆಲೆಗಳು (APMC)',
    loading: 'ಮಾರುಕಟ್ಟೆ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    title: 'ಬುದ್ಧಿವಂತ ಮಾರುಕಟ್ಟೆ ಮತ್ತು ಬೇಡಿಕೆ ಒಟ್ಟುಗೂಡಿಸುವಿಕೆ',
    badge: 'ಕಾರ್ಯಾಚರಣಾ ಮಾದರಿ',
    subtitle: 'AGMARKNET ನೈಜ ಮಂಡಿ ಬೆಲೆಗಳು, ಖರೀದಿದಾರರ ಬಿಡ್‌ಗಳು ಮತ್ತು ರೈತ ಒಕ್ಕೂಟ ಮಾರಾಟ',
    biointelCta: 'BioIntel ತಳಿ ಶಿಫಾರಸು',
    mandyaPriceTitle: 'ಮಂಡ್ಯ APMC ಮಾದರಿ ಬೆಲೆ',
    mandyaTrend: '7 ದಿನಗಳಲ್ಲಿ +8.4%',
    contractTitle: 'ಖರೀದಿದಾರರ ನೇರ ಒಪ್ಪಂದ ಬೇಡಿಕೆ',
    contractSub: 'FPO ಸಗಟು ಪ್ರೀಮಿಯಂ',
    collectiveTitle: 'ಸಾಮೂಹಿಕ ಲಾಟ್ ಗಾತ್ರ',
    collectiveValue: '18.5 ಟನ್',
    collectiveSub: '4 ಸ್ಥಳೀಯ ರೈತರು ಒಟ್ಟುಗೂಡಿದ್ದಾರೆ',
    qtlUnit: 'ಕ್ವಿಂಟಾಲ್',
  },
  hi: {
    tabNursery: 'स्मार्ट नर्सरी व जैव-उत्पाद (फीचर 18)',
    tabCommodity: 'कमोडिटी व मंडी भाव (APMC फ़ीड)',
    loading: 'बाज़ार लोड हो रहा है...',
    title: 'स्मार्ट बाज़ार और मांग एकत्रीकरण',
    badge: 'ऑपरेशनल प्रोटोटाइप',
    subtitle: 'AGMARKNET लाइव मंडी भाव, खरीदार बोलियां और किसान समूह पूलिंग',
    biointelCta: 'BioIntel किस्म सलाहकार',
    mandyaPriceTitle: 'मंड्या APMC मॉडल भाव',
    mandyaTrend: '7 दिनों में +8.4%',
    contractTitle: 'सीधे खरीदार अनुबंध मांग',
    contractSub: 'FPO थोक प्रीमियम',
    collectiveTitle: 'सामूहिक लॉट आकार',
    collectiveValue: '18.5 टन',
    collectiveSub: '4 स्थानीय किसान जुड़े',
    qtlUnit: 'क्विंटल',
  },
  te: {
    tabNursery: 'తెలివైన నర్సరీ & జీవ ఉత్పాదనలు',
    tabCommodity: 'వస్తువు & మండి ధరలు (APMC)',
    loading: 'మార్కెట్ లోడ్ అవుతోంది...',
    title: 'తెలివైన మార్కెట్ & డిమాండ్ సమీకరణ',
    badge: 'కార్యాచరణ నమూనా',
    subtitle: 'AGMARKNET రియల్-టైమ్ మండి ధరలు, కొనుగోలుదారు బిడ్లు మరియు రైతు బృంద విక్రయం',
    biointelCta: 'BioIntel రకం సిఫార్సు',
    mandyaPriceTitle: 'మండ్యా APMC మోడల్ ధర',
    mandyaTrend: '7 రోజుల్లో +8.4%',
    contractTitle: 'కొనుగోలుదారు ప్రత్యక్ష ఒప్పంద డిమాండ్',
    contractSub: 'FPO టోకు ప్రీమియం',
    collectiveTitle: 'సమూహ లాట్ పరిమాణం',
    collectiveValue: '18.5 టన్నులు',
    collectiveSub: '4 స్థానిక రైతులు కలిశారు',
    qtlUnit: 'క్వింటాల్',
  },
};

export default function MarketplacePage() {
  const { currentFarm, language } = useFarm();
  const t = MKT_PAGE_I18N[language];
  const [activeMarketTab, setActiveMarketTab] = useState<'nursery' | 'commodity'>('nursery');

  return (
    <div className="space-y-6">
      {/* Top Tab Bar Switching between Nursery Inputs & Mandi Prices */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-sm font-semibold">
        <button
          onClick={() => setActiveMarketTab('nursery')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            activeMarketTab === 'nursery'
              ? 'border-green-800 text-green-800 dark:text-green-400 dark:border-green-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Store className="w-4 h-4" />
          {t.tabNursery}
        </button>

        <button
          onClick={() => setActiveMarketTab('commodity')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            activeMarketTab === 'commodity'
              ? 'border-green-800 text-green-800 dark:text-green-400 dark:border-green-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          {t.tabCommodity}
        </button>
      </div>

      {activeMarketTab === 'nursery' ? (
        <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">{t.loading}</div>}>
          <NurseryMarketplacePage />
        </Suspense>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400">
                <ShoppingBag className="w-6 h-6" />
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

            <Link
              href="/biointel"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-800 text-white font-semibold text-xs hover:bg-green-700 transition"
            >
              <Dna className="w-4 h-4 text-emerald-300" />
              {t.biointelCta}
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">{t.mandyaPriceTitle}</div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">₹2,200 / {t.qtlUnit}</div>
              <div className="text-[11px] text-emerald-600 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> {t.mandyaTrend}
              </div>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">{t.contractTitle}</div>
              <div className="text-3xl font-bold text-emerald-600">₹2,450 / {t.qtlUnit}</div>
              <div className="text-[11px] text-zinc-400">{t.contractSub}</div>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">{t.collectiveTitle}</div>
              <div className="text-3xl font-bold text-purple-600">{t.collectiveValue}</div>
              <div className="text-[11px] text-zinc-400">{t.collectiveSub}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
