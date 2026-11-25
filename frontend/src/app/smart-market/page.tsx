// frontend/src/app/smart-market/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import BiddingPage from '@/app/bidding/page';
import MarketIntelligencePage from '@/app/market-intelligence/page';
import MarketplacePage from '@/app/marketplace/page';
import { HarvestToBiddingDraft, loadHarvestToBiddingDraft } from '@/lib/workflowBridge';
import { useFarm } from '@/context/FarmContext';
import { Gavel, TrendingUp, ShoppingBag } from 'lucide-react';

type Section = 'bidding' | 'market_intel' | 'marketplace';

export default function SmartMarketPage() {
  const { currentUser } = useFarm();
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
          Smart Bidding &amp; Market
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Compare mandi prices, list your harvest for buyer offers, and confirm sales.
        </p>
      </div>

      {draft && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-950 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong>Draft Harvest Ready for Review:</strong> {draft.cropName} ·{' '}
            {draft.quantityKg.toLocaleString('en-IN')} kg · {draft.location} · Suggested floor ₹
            {draft.expectedPricePerKg}/kg (Review &amp; publish below — no automatic listing created)
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { id: 'bidding' as const, label: '1. Sell Produce & Bids', icon: Gavel },
          { id: 'market_intel' as const, label: '2. Mandi Prices & Timing', icon: TrendingUp },
          { id: 'marketplace' as const, label: '3. Buyer Marketplace', icon: ShoppingBag },
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
