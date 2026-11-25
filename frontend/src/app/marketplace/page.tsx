// frontend/src/app/marketplace/page.tsx
'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
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

export default function MarketplacePage() {
  const { currentFarm } = useFarm();
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
          Intelligent Nursery & Bio-Inputs (Feature 18)
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
          Commodity & Mandi Prices (APMC Feed)
        </button>
      </div>

      {activeMarketTab === 'nursery' ? (
        <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">Loading Marketplace...</div>}>
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
                    Intelligent Marketplace & Demand Aggregation
                  </h1>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    Operational Prototype
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  AGMARKNET real-time mandi prices, buyer procurement bids, and farmer collective pooling
                </p>
              </div>
            </div>

            <Link
              href="/biointel"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-800 text-white font-semibold text-xs hover:bg-green-700 transition"
            >
              <Dna className="w-4 h-4 text-emerald-300" />
              BioIntel Variety Recommender
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Mandya APMC Modal Price</div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">₹2,200 / qtl</div>
              <div className="text-[11px] text-emerald-600 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> +8.4% over 7 days
              </div>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Buyer Direct Contract Demand</div>
              <div className="text-3xl font-bold text-emerald-600">₹2,450 / qtl</div>
              <div className="text-[11px] text-zinc-400">FPO Wholesale Premium</div>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Collective Lot Size</div>
              <div className="text-3xl font-bold text-purple-600">18.5 Tonnes</div>
              <div className="text-[11px] text-zinc-400">4 local farmers pooled</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
