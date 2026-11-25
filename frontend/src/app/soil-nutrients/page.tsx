// frontend/src/app/soil-nutrients/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Sprout, TestTube, CheckCircle2 } from 'lucide-react';

export default function SoilNutrientsPage() {
  const { currentFarm } = useFarm();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-lime-100 dark:bg-lime-950 text-lime-700 dark:text-lime-400">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Soil & Nutrient Intelligence
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Operational Prototype
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Soil Health Card (SHC) parameter profile and macro/micronutrient balance
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="text-xs font-semibold text-zinc-500">Available Nitrogen (N)</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">210 kg/ha</div>
          <div className="text-[11px] text-amber-600 mt-1">Medium Deficit (Rating 2)</div>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="text-xs font-semibold text-zinc-500">Available Phosphorus (P)</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">18.5 kg/ha</div>
          <div className="text-[11px] text-emerald-600 mt-1">Sufficient (Rating 3)</div>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="text-xs font-semibold text-zinc-500">Available Potassium (K)</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">280 kg/ha</div>
          <div className="text-[11px] text-emerald-600 mt-1">High (Rating 4)</div>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="text-xs font-semibold text-zinc-500">Soil pH & OC%</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">6.8 pH</div>
          <div className="text-[11px] text-zinc-400 mt-1">Organic Carbon: 0.65% (Optimal)</div>
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          Customized Fertilizer Application Recommendation
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Based on the current <strong>{currentFarm?.crop_stage}</strong> stage of <strong>{currentFarm?.primary_crop}</strong> and soil ratings from the Mandya District laboratory, the parcel requires 45 kg Urea split over 3 drip fertigation cycles and 15 kg Zinc Sulphate foliar spray.
        </p>
      </div>
    </div>
  );
}
