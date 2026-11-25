// frontend/src/app/marketplace/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { ShoppingBag, TrendingUp, Users, ArrowUpRight } from 'lucide-react';

export default function MarketplacePage() {
  const { currentFarm } = useFarm();

  return (
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
  );
}
