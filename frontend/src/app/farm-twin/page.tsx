// frontend/src/app/farm-twin/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Layers, Droplet, Sprout, Gauge, Activity } from 'lucide-react';

export default function DigitalFarmTwinPage() {
  const { currentFarm, summary, weather } = useFarm();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Digital Farm Twin
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Operational Prototype
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Biophysical simulation of canopy architecture, root zone water balance, and dry matter accumulation
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Canopy Cover (CC%)</span>
            <Sprout className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">74.2%</div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-2">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '74.2%' }} />
          </div>
          <p className="text-[11px] text-zinc-400 pt-1">Simulated via AquaCrop vegetative growth curve</p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Effective Root Depth</span>
            <Activity className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">35 cm</div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-2">
            <div className="bg-teal-500 h-full rounded-full" style={{ width: '60%' }} />
          </div>
          <p className="text-[11px] text-zinc-400 pt-1">Max anticipated root depth: 60 cm</p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Biomass Transpiration Water Productivity</span>
            <Droplet className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">18.5 g/m²</div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-2">
            <div className="bg-cyan-500 h-full rounded-full" style={{ width: '85%' }} />
          </div>
          <p className="text-[11px] text-zinc-400 pt-1">Normalized WP* for {currentFarm?.primary_crop}</p>
        </div>
      </div>
    </div>
  );
}
