// frontend/src/app/decision-intelligence/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { ActionPlan } from '@/components/dashboard/ActionPlan';
import { Compass, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function DecisionIntelligencePage() {
  const { currentFarm } = useFarm();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rm-primary/10 dark:bg-rm-accent/20 text-rm-primary dark:text-rm-accent">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Centralized Decision Intelligence Engine
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Operational
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Multi-criteria optimization resolving conflicting agronomic, meteorological, and economic priorities
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-2">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
          Active Conflict Resolution Matrix
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          The engine continually evaluates cross-domain trade-offs:
        </p>
        <ul className="list-disc list-inside text-xs text-zinc-500 space-y-1">
          <li><strong>Irrigation vs Rainfall:</strong> Suspends irrigation cycles if forecasted precipitation exceeds 15mm in 48 hours to conserve water & prevent root rot.</li>
          <li><strong>Spraying vs Wind Drift:</strong> Locks chemical application recommendations whenever wind speeds exceed 15 km/h to prevent spray drift and health hazards.</li>
          <li><strong>Market Timing vs Spoilage:</strong> Computes the optimum sell-or-store trade-off comparing mandi modal price gains against cold storage holding fees.</li>
        </ul>
      </div>

      {/* Render the full Action Plan */}
      <ActionPlan />
    </div>
  );
}
