// frontend/src/components/digital-farming/MaizeAgronomyCard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
  fetchMaizeAgronomy,
  fetchMaizeVarieties,
  MaizeAgronomyResult,
  MaizeVarietyInfo,
} from '@/lib/satelliteMonitoringApi';
import { Sprout, Calculator, CheckCircle2 } from 'lucide-react';

interface MaizeAgronomyCardProps {
  areaAcres: number;
  sowingDate: string;
  currentDay: number;
  meanTempC?: number;
  onAgronomyUpdated?: (agronomy: MaizeAgronomyResult | null) => void;
}

export function MaizeAgronomyCard({
  areaAcres,
  sowingDate,
  currentDay,
  meanTempC = 25.5,
  onAgronomyUpdated,
}: MaizeAgronomyCardProps) {
  const [varieties, setVarieties] = useState<MaizeVarietyInfo[]>([]);
  const [varietyId, setVarietyId] = useState('nah-1137');
  const [rowCm, setRowCm] = useState(60);
  const [plantCm, setPlantCm] = useState(20);
  const [germPct, setGermPct] = useState(90);
  const [result, setResult] = useState<MaizeAgronomyResult | null>(null);

  useEffect(() => {
    fetchMaizeVarieties().then((list) => {
      if (list.length > 0) setVarieties(list);
    });
  }, []);

  useEffect(() => {
    fetchMaizeAgronomy({
      areaAcres,
      varietyId,
      sowingDate,
      rowSpacingCm: rowCm,
      plantSpacingCm: plantCm,
      germinationPct: germPct,
      meanDailyTempC: meanTempC,
    }).then((res) => {
      setResult(res);
      onAgronomyUpdated?.(res);
    });
  }, [areaAcres, varietyId, sowingDate, rowCm, plantCm, germPct, meanTempC]);

  const currentStage =
    result?.biological_stages.find((s) => currentDay >= s.start_day && currentDay <= s.end_day) ||
    result?.biological_stages[result.biological_stages.length - 1];

  return (
    <div className="rounded-2xl border border-[#DCD8CA] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3 text-xs shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sprout className="w-4 h-4 text-[#36784D]" />
          <div>
            <h3 className="text-sm font-bold text-[#20372A] dark:text-white">
              Maize Reference Agronomic Model &amp; 15-Stage Phenology
            </h3>
            <p className="text-[11px] text-zinc-500">
              {result?.variety?.source || 'ICAR-IIMR / UAS Package of Practices'} · Classification: ESTIMATED
            </p>
          </div>
        </div>
        {currentStage && (
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-semibold text-[11px]">
            Stage {currentStage.stage_number}/15: {currentStage.name} ({currentStage.code})
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">Maize Variety</label>
          <select
            value={varietyId}
            onChange={(e) => {
              const id = e.target.value;
              setVarietyId(id);
              const v = varieties.find((x) => x.id === id);
              if (v) {
                setRowCm(v.recommended_row_spacing_cm);
                setPlantCm(v.recommended_plant_spacing_cm);
                setGermPct(v.default_germination_pct);
              }
            }}
            className="w-full p-2 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-[#F7F5ED] dark:bg-zinc-900"
          >
            {varieties.length === 0 ? (
              <option value="nah-1137">NAH-1137 Hybrid (110d)</option>
            ) : (
              varieties.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.duration_days}d)
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">Row Spacing (cm)</label>
          <input
            type="number"
            min={30}
            max={120}
            value={rowCm}
            onChange={(e) => setRowCm(Number(e.target.value) || 60)}
            className="w-full p-2 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-[#F7F5ED] dark:bg-zinc-900"
          />
        </div>

        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">Plant Spacing (cm)</label>
          <input
            type="number"
            min={10}
            max={80}
            value={plantCm}
            onChange={(e) => setPlantCm(Number(e.target.value) || 20)}
            className="w-full p-2 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-[#F7F5ED] dark:bg-zinc-900"
          />
        </div>

        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">Germination (%)</label>
          <input
            type="number"
            min={50}
            max={100}
            value={germPct}
            onChange={(e) => setGermPct(Number(e.target.value) || 90)}
            className="w-full p-2 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-[#F7F5ED] dark:bg-zinc-900"
          />
        </div>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#F7F5ED] dark:bg-zinc-900 p-3 rounded-xl border border-[#DCD8CA] dark:border-zinc-800">
            <div>
              <span className="text-[10px] text-zinc-500 block">Required Seed Weight</span>
              <strong>{result.required_seed_kg} kg</strong>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Est. Seed Count</span>
              <strong>{result.estimated_seed_count.toLocaleString('en-IN')}</strong>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Established Stand</span>
              <strong>{result.estimated_established_population.toLocaleString('en-IN')} plants</strong>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Expected Harvest</span>
              <strong>{result.expected_harvest_date}</strong>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Est. Yield Range</span>
              <strong>
                {result.expected_yield_kg_range[0].toLocaleString('en-IN')}–
                {result.expected_yield_kg_range[1].toLocaleString('en-IN')} kg
              </strong>
            </div>
          </div>

          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-[#36784D] shrink-0" />
            <span>Formula: {result.seed_formula} · GDD target: {result.gdd_to_maturity} °C·d (Base 10°C)</span>
          </div>

          {currentStage && (
            <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Day {currentDay} Biological Stage ({currentStage.name}):</strong> {currentStage.description}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
