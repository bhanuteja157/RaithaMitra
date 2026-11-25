// frontend/src/app/farm-management/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ClimatePage from '@/app/climate/page';
import IrrigationPage from '@/app/irrigation/page';
import SoilNutrientsPage from '@/app/soil-nutrients/page';
import { FarmToCarePayload, loadFarmToCareTransfer } from '@/lib/workflowBridge';
import { useFarm } from '@/context/FarmContext';
import { CloudSun, Droplets, Sprout, ArrowRight } from 'lucide-react';

type Section = 'climate' | 'irrigation' | 'soil';

export default function FarmManagementPage() {
  const { currentUser } = useFarm();
  const [section, setSection] = useState<Section>('climate');
  const [farmCtx, setFarmCtx] = useState<FarmToCarePayload | null>(null);

  useEffect(() => {
    const sec = new URLSearchParams(window.location.search).get('section');
    if (sec === 'climate' || sec === 'irrigation' || sec === 'soil') {
      setSection(sec);
    }
    setFarmCtx(loadFarmToCareTransfer(currentUser.id));
  }, [currentUser.id]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            Farm Management
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Weather forecasts, irrigation schedules, and soil nutrients in one place.
          </p>
        </div>
        <Link
          href="/crop-health"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold self-start sm:self-auto"
        >
          Check Crop Health <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {farmCtx && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex flex-wrap gap-3">
          <strong>From Digital Farm:</strong>
          <span>{farmCtx.farmName} ({farmCtx.locationLabel})</span>
          <span>Crop: <strong>{farmCtx.crop}</strong></span>
          <span>Stage: <strong>{farmCtx.growthStage}</strong></span>
          <span>Soil Moisture: <strong>{Math.round(farmCtx.soilMoisturePct)}%</strong></span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { id: 'climate' as const, label: '1. Weather & Climate', icon: CloudSun },
          { id: 'irrigation' as const, label: '2. Irrigation Plan', icon: Droplets },
          { id: 'soil' as const, label: '3. Soil & Nutrients', icon: Sprout },
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
        {section === 'climate' && <ClimatePage />}
        {section === 'irrigation' && <IrrigationPage />}
        {section === 'soil' && <SoilNutrientsPage />}
      </div>
    </div>
  );
}
