// frontend/src/app/resources/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Tractor, Users, Clock, CheckCircle2 } from 'lucide-react';

export default function ResourcesPage() {
  const { currentFarm } = useFarm();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
            <Tractor className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Resource Optimization & Equipment Sharing
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Operational Prototype
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Community tractor, spray drone, and harvester scheduling under Google OR-Tools routing constraints
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Shared Rotavator Tractor</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">Available Tomorrow</div>
          <div className="text-[11px] text-emerald-600">₹850 / hour (Village SHG)</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Kisan Drone Spray Slot</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">Booked 28 Nov</div>
          <div className="text-[11px] text-zinc-400">₹450 / acre • Micronutrient Bio-spray</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">Labour Pool Syndicate</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">6 Harvesters</div>
          <div className="text-[11px] text-zinc-400">Confirmed for Harvest Week</div>
        </div>
      </div>
    </div>
  );
}
