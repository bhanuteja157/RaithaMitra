// frontend/src/app/smart-market/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import BiddingPage from '@/app/bidding/page';
import MarketIntelligencePage from '@/app/market-intelligence/page';
import MarketplacePage from '@/app/marketplace/page';
import { HarvestToBiddingDraft, loadHarvestToBiddingDraft } from '@/lib/workflowBridge';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { getIntlLocale, localizeCropName } from '@/lib/translations';
import { Gavel, TrendingUp, ShoppingBag } from 'lucide-react';

type Section = 'bidding' | 'market_intel' | 'marketplace';

const SMART_MARKET_I18N: Record<
  Language,
  {
    title: string;
    subtitle: string;
    draftReady: string;
    kg: string;
    suggestedFloor: string;
    perKg: string;
    reviewNote: string;
    tabBidding: string;
    tabMarketIntel: string;
    tabMarketplace: string;
  }
> = {
  en: {
    title: 'Smart Bidding & Market',
    subtitle: 'Compare mandi prices, list your harvest for buyer offers, and confirm sales.',
    draftReady: 'Draft Harvest Ready for Review:',
    kg: 'kg',
    suggestedFloor: 'Suggested floor',
    perKg: '/kg',
    reviewNote: '(Review & publish below — no automatic listing created)',
    tabBidding: '1. Sell Produce & Bids',
    tabMarketIntel: '2. Mandi Prices & Timing',
    tabMarketplace: '3. Buyer Marketplace',
  },
  kn: {
    title: 'ಸ್ಮಾರ್ಟ್ ಹರಾಜು ಮತ್ತು ಮಾರುಕಟ್ಟೆ',
    subtitle: 'ಮಂಡಿ ಬೆಲೆಗಳನ್ನು ಹೋಲಿಸಿ, ನಿಮ್ಮ ಬೆಳೆಯನ್ನು ಖರೀದಿದಾರರ ಬಿಡ್‌ಗಳಿಗೆ ಪಟ್ಟಿ ಮಾಡಿ ಮತ್ತು ಮಾರಾಟ ದೃಢೀಕರಿಸಿ.',
    draftReady: 'ಪರಿಶೀಲನೆಗೆ ಕರಡು ಕೊಯ್ಲು ಸಿದ್ಧವಾಗಿದೆ:',
    kg: 'ಕೆಜಿ',
    suggestedFloor: 'ಸೂಚಿತ ಕನಿಷ್ಠ ಬೆಲೆ',
    perKg: '/ಕೆಜಿ',
    reviewNote: '(ಕೆಳಗೆ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಪ್ರಕಟಿಸಿ — ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪಟ್ಟಿ ಮಾಡಲಾಗಿಲ್ಲ)',
    tabBidding: '1. ಬೆಳೆ ಮಾರಾಟ ಮತ್ತು ಬಿಡ್‌ಗಳು',
    tabMarketIntel: '2. ಮಂಡಿ ಬೆಲೆ ಮತ್ತು ಸಮಯ',
    tabMarketplace: '3. ಖರೀದಿದಾರರ ಮಾರುಕಟ್ಟೆ',
  },
  hi: {
    title: 'स्मार्ट बोली और मंडी बाज़ार',
    subtitle: 'मंडी भाव की तुलना करें, खरीदार प्रस्तावों के लिए उपज सूचीबद्ध करें और बिक्री पक्की करें।',
    draftReady: 'समीक्षा के लिए कटाई ड्राफ्ट तैयार है:',
    kg: 'किलो',
    suggestedFloor: 'सुझाया गया न्यूनतम मूल्य',
    perKg: '/किलो',
    reviewNote: '(नीचे समीक्षा करके प्रकाशित करें — कोई स्वचालित लिस्टिंग नहीं बनाई गई)',
    tabBidding: '1. उपज बेचें और बोलियां',
    tabMarketIntel: '2. मंडी भाव व सही समय',
    tabMarketplace: '3. खरीदार बाज़ार',
  },
  te: {
    title: 'స్మార్ట్ బిడ్డింగ్ & మార్కెట్',
    subtitle: 'మండి ధరలను పోల్చండి, కొనుగోలుదారుల ఆఫర్ల కోసం పంటను జాబితా చేయండి మరియు అమ్మకాన్ని నిర్ధారించండి.',
    draftReady: 'సమీక్ష కోసం కోత డ్రాఫ్ట్ సిద్ధంగా ఉంది:',
    kg: 'కిలోలు',
    suggestedFloor: 'సూచించిన కనీస ధర',
    perKg: '/కిలో',
    reviewNote: '(దిగువన సమీక్షించి ప్రచురించండి — ఆటోమేటిక్ జాబితా సృష్టించబడలేదు)',
    tabBidding: '1. పంట అమ్మకం & బిడ్లు',
    tabMarketIntel: '2. మండి ధరలు & సమయం',
    tabMarketplace: '3. కొనుగోలుదారుల మార్కెట్',
  },
};

export default function SmartMarketPage() {
  const { currentUser, language } = useFarm();
  const t = SMART_MARKET_I18N[language];
  const [section, setSection] = useState<Section>('bidding');
  const [draft, setDraft] = useState<HarvestToBiddingDraft | null>(null);

  useEffect(() => {
    const sec = new URLSearchParams(window.location.search).get('section');
    if (sec === 'bidding' || sec === 'market_intel' || sec === 'marketplace') {
      setSection(sec);
    }
    setDraft(loadHarvestToBiddingDraft(currentUser.id));
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

      {draft && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-950 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong>{t.draftReady}</strong> {localizeCropName(draft.cropName, language)} ·{' '}
            {draft.quantityKg.toLocaleString(getIntlLocale(language))} {t.kg} · {draft.location} · {t.suggestedFloor} ₹
            {draft.expectedPricePerKg}{t.perKg} {t.reviewNote}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { id: 'bidding' as const, label: t.tabBidding, icon: Gavel },
          { id: 'market_intel' as const, label: t.tabMarketIntel, icon: TrendingUp },
          { id: 'marketplace' as const, label: t.tabMarketplace, icon: ShoppingBag },
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
        {section === 'bidding' && <BiddingPage />}
        {section === 'market_intel' && <MarketIntelligencePage />}
        {section === 'marketplace' && <MarketplacePage />}
      </div>
    </div>
  );
}
