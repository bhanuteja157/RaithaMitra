// frontend/src/app/post-harvest/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Warehouse, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function PostHarvestPage() {
  const { currentFarm } = useFarm();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Post-Harvest Management & Cold Chain
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Operational Prototype
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Perishability risk evaluation, e-NWR warehouse receipting, and cold storage booking
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Ambient Shelf Life</div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">5-7 Days</div>
          <div className="text-[11px] text-zinc-400">At 28°C ambient temperature</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Cold Chain Shelf Life</div>
          <div className="text-3xl font-bold text-emerald-600">21-28 Days</div>
          <div className="text-[11px] text-zinc-400">At 10°C - 12°C Controlled Atmosphere</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Nearest WDRA Warehouse</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">Mandya APMC Hub</div>
          <div className="text-[11px] text-zinc-400">Distance: 8.5 km • Capacity Available</div>
        </div>
      </div>
    </div>
  );
}
