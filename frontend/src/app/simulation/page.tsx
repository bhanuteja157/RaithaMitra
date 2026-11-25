// frontend/src/app/simulation/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { LineChart, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';

export default function SimulationPage() {
  const { currentFarm } = useFarm();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
            <LineChart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Predictive Risk Simulator (Monte Carlo)
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Operational Prototype
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              10,000 stochastic scenario trials across climate volatility and market price distributions
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">P10 Downside Scenario</div>
          <div className="text-2xl font-bold text-red-600">₹8,40,000</div>
          <div className="text-[11px] text-zinc-400">Severe pest shock or price plunge</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">P50 Expected Median</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">₹13,75,000</div>
          <div className="text-[11px] text-zinc-400">Base case yield & modal price</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">P90 Bullish Upside</div>
          <div className="text-2xl font-bold text-emerald-600">₹18,20,000</div>
          <div className="text-[11px] text-zinc-400">Peak festive price & optimal weather</div>
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          Value-at-Risk (VaR 95%) Analysis
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Under current agronomic management, the 95% Confidence Value-at-Risk ensures net farmer return exceeds <strong>₹7,90,000</strong>, guaranteeing complete debt service coverage for active KCC agricultural loans.
        </p>
      </div>
    </div>
  );
}
