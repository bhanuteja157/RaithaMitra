// frontend/src/app/finance-benefits/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import FinancePage from '@/app/finance/page';
import SchemesPage from '@/app/schemes/page';
import { FinanceWorkflowSnapshot, loadFinanceSnapshot } from '@/lib/workflowBridge';
import { Coins, Award } from 'lucide-react';

type Section = 'finance' | 'schemes';

export default function FinanceBenefitsPage() {
  const [section, setSection] = useState<Section>('finance');
  const [snapshot, setSnapshot] = useState<FinanceWorkflowSnapshot | null>(null);

  useEffect(() => {
    setSnapshot(loadFinanceSnapshot());
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
          Finance &amp; Government Benefits
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Track cultivation expenses, projected profits, and eligible government subsidies.
        </p>
      </div>

      {snapshot && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex flex-wrap gap-4">
          <strong>Projected Plan ({snapshot.cropName} — Not Recorded Transactions):</strong>
          <span>Est. Cost: ₹{snapshot.projectedCultivationCostInr.toLocaleString('en-IN')}</span>
          <span>Est. Revenue: ₹{snapshot.projectedRevenueInr.toLocaleString('en-IN')}</span>
          <span>Est. Profit: ₹{snapshot.projectedProfitInr.toLocaleString('en-IN')}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[
          { id: 'finance' as const, label: '1. Expenses & Profit', icon: Coins },
          { id: 'schemes' as const, label: '2. Government Schemes & Subsidies', icon: Award },
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
