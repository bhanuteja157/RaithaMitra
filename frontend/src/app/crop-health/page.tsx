// frontend/src/app/crop-health/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import DiagnosticsPage from '@/app/diagnostics/page';
import SurveillancePage from '@/app/surveillance/page';
import { FarmToCarePayload, loadFarmToCareTransfer } from '@/lib/workflowBridge';
import { Microscope, Activity } from 'lucide-react';

type Section = 'diagnostics' | 'surveillance';

export default function CropHealthPage() {
  const [section, setSection] = useState<Section>('diagnostics');
  const [farmCtx, setFarmCtx] = useState<FarmToCarePayload | null>(null);

  useEffect(() => {
    setFarmCtx(loadFarmToCareTransfer());
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
          Crop Health &amp; Protection
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Diagnose crop symptoms and monitor regional pest and disease alerts.
        </p>
      </div>

      {farmCtx && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex flex-wrap gap-3">
          <strong>Active Farm Context:</strong>
          <span>{farmCtx.farmName} ({farmCtx.locationLabel})</span>
          <span>Crop: <strong>{farmCtx.crop}</strong> ({farmCtx.growthStage})</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {[
          { id: 'diagnostics' as const, label: '1. Check Crop Symptoms', icon: Microscope },
          { id: 'surveillance' as const, label: '2. Pest & Disease Alerts', icon: Activity },
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
        {section === 'diagnostics' && <DiagnosticsPage />}
        {section === 'surveillance' && <SurveillancePage />}
      </div>
    </div>
  );
}
