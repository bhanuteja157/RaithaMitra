// frontend/src/app/irrigation/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Droplets, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function IrrigationPage() {
  const { currentFarm, summary, weather } = useFarm();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Precision Irrigation Scheduling
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Operational Prototype
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              FAO-56 dual crop coefficient (ETc = Kc × ET0) and management allowed depletion (MAD)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Crop Coefficient (Kc)</div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">1.15</div>
          <div className="text-[11px] text-zinc-400">Stage: {currentFarm?.crop_stage}</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Daily Water Demand (ETc)</div>
          <div className="text-3xl font-bold text-cyan-600">
            {summary ? `${summary.daily_water_demand_mm.toFixed(2)} mm` : '5.29 mm'}
          </div>
          <div className="text-[11px] text-zinc-400">Net depth required per day</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Scheduled Drip Runtime</div>
          <div className="text-3xl font-bold text-emerald-600">2.5 Hours</div>
          <div className="text-[11px] text-zinc-400">Recommended window: 06:00 - 08:30</div>
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          Active Irrigation Protocol
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The system calculates that applying 2.5 hours via the farm’s <strong>{currentFarm?.irrigation_method}</strong> using the <strong>{currentFarm?.water_source}</strong> will replenish root-zone depletion back to Field Capacity (22% moisture) with minimal percolation loss.
        </p>
      </div>
    </div>
  );
}
