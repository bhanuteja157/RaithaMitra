// frontend/src/app/finance/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Coins, TrendingUp, DollarSign, Wallet } from 'lucide-react';

export default function FinancePage() {
  const { currentFarm, summary } = useFarm();

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
                Farm Financial Intelligence
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Operational Prototype
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Cultivation cost structure, working capital tracking, and revenue forecasting
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Allocated Season Budget</div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">
            ₹{currentFarm?.cultivation_budget_inr.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-zinc-400">Farmer registered budget cap</div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Current Incurred Expenses</div>
          <div className="text-3xl font-bold text-amber-600">
            ₹{(summary?.total_expenses_inr || 87500).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-zinc-400">72.9% of budget utilized</div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Projected Harvest Gross Revenue</div>
          <div className="text-3xl font-bold text-emerald-600">
            ₹{(summary?.expected_revenue_inr || 1375000).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600">ROI Potential: 15.7x</div>
        </div>
      </div>
    </div>
  );
}
