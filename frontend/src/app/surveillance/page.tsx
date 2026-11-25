// frontend/src/app/surveillance/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Activity, ShieldAlert, Wind, MapPin } from 'lucide-react';

export default function SurveillancePage() {
  const { currentFarm } = useFarm();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Community Disease Surveillance Network
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Operational Prototype
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Aggregated epidemiology alerts, pathogen vector radar, and spore wind dispersion models
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Regional Cluster Alert</div>
          <div className="text-2xl font-bold text-amber-600">Early Blight Warning</div>
          <div className="text-[11px] text-zinc-400">3 neighboring farms reported in Mandya</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Spore Wind Dispersion Vector</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">ESE 9.2 km/h</div>
          <div className="text-[11px] text-zinc-400">Low transmission vector toward parcel</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Community Protection Status</div>
          <div className="text-2xl font-bold text-emerald-600">88% Compliant</div>
          <div className="text-[11px] text-zinc-400">Preventative bio-spray coverage</div>
        </div>
      </div>
    </div>
  );
}
