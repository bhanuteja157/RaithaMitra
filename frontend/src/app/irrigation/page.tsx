// frontend/src/app/irrigation/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  calculateScientificIrrigation,
  ScientificModuleOutput,
  MODULE_TRANSLATIONS,
} from '@/lib/scientificApi';
import {
  Droplets,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  RotateCw,
} from 'lucide-react';

export default function IrrigationPage() {
  const { currentFarm, weather, language } = useFarm();
  const mt = MODULE_TRANSLATIONS[language] || MODULE_TRANSLATIONS.en;

  const [cropType, setCropType] = useState<string>(currentFarm?.primary_crop || 'Tomato');
  const [cropStage, setCropStage] = useState<string>(currentFarm?.crop_stage || 'Mid-Season');
  const [farmAreaHa, setFarmAreaHa] = useState<number>(currentFarm?.land_area_ha || 2.5);
  const [irrigationMethod, setIrrigationMethod] = useState<string>(
    currentFarm?.irrigation_method || 'Drip Irrigation'
  );
  const [availableWaterM3, setAvailableWaterM3] = useState<number>(
    currentFarm?.available_water_m3 || 14500
  );
  const [et0Override, setEt0Override] = useState<string>(
    weather?.current?.et0_fao56_mm ? String(weather.current.et0_fao56_mm) : ''
  );
  const [effRainMm, setEffRainMm] = useState<string>('0');
  const [flowRateM3Hr, setFlowRateM3Hr] = useState<string>('45');
  const [output, setOutput] = useState<ScientificModuleOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const runCalculation = async () => {
    setIsLoading(true);
    try {
      const res = await calculateScientificIrrigation({
        farm_id: currentFarm?.id,
        latitude: currentFarm?.latitude ?? 12.5234,
        longitude: currentFarm?.longitude ?? 76.8976,
        crop_type: cropType,
        crop_stage: cropStage,
        farm_area_ha: Math.max(0.1, farmAreaHa),
        reference_et0_mm: et0Override ? parseFloat(et0Override) : undefined,
        effective_rainfall_mm: effRainMm !== '' ? parseFloat(effRainMm) : undefined,
        soil_type: currentFarm?.soil_type || 'Red Sandy Loam',
        available_water_m3: Math.max(0, availableWaterM3),
        irrigation_method: irrigationMethod,
        flow_rate_m3_per_hr: flowRateM3Hr ? parseFloat(flowRateM3Hr) : undefined,
      });
      setOutput(res);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runCalculation();
  }, [currentFarm?.id]);

  const r = output?.results;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Scientific Precision Irrigation (FAO-56)
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {output?.is_live ? 'Live Open-Meteo ET0' : 'FAO-56 Modeled'}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              ETc = Kc × ET0 • Volumetric conversion: 1 mm over 1 ha = 10 m³
            </p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Crop Type</label>
            <select
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            >
              {['Tomato', 'Rice', 'Wheat', 'Maize', 'Chilli', 'Cotton', 'Sugarcane', 'Potato'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Growth Stage</label>
            <select
              value={cropStage}
              onChange={(e) => setCropStage(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            >
              {['Initial', 'Crop Development', 'Mid-Season', 'Late Season', 'Harvest Ready'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Farm Area (ha)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={farmAreaHa}
              onChange={(e) => setFarmAreaHa(parseFloat(e.target.value) || 0.1)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Irrigation Method</label>
            <select
              value={irrigationMethod}
              onChange={(e) => setIrrigationMethod(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            >
              {['Drip Irrigation', 'Sprinkler', 'Canal Basin', 'Flood / Furrow', 'Rainfed'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Reference ET0 (mm/day, blank = live)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="Auto from Open-Meteo"
              value={et0Override}
              onChange={(e) => setEt0Override(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Effective Rainfall (mm/day)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={effRainMm}
              onChange={(e) => setEffRainMm(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Pump Flow Rate (m³/hr)</label>
            <input
              type="number"
              step="1"
              min="1"
              value={flowRateM3Hr}
              onChange={(e) => setFlowRateM3Hr(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={runCalculation}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              {mt.calculate}
            </button>
          </div>
        </div>
      </div>

      {r && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Crop ETc (Kc {r.kc} × ET0 {r.et0_mm_day})</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">{r.etc_mm_day} mm/day</div>
              <div className="text-[11px] text-zinc-400">Eff. Rain: {r.effective_rainfall_mm_day} mm/day</div>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Net / Gross Irrigation Depth</div>
              <div className="text-2xl font-bold text-cyan-600">{r.net_irrigation_mm} / {r.gross_irrigation_mm} mm</div>
              <div className="text-[11px] text-zinc-400">Efficiency: {(r.irrigation_efficiency * 100).toFixed(0)}%</div>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Daily Gross Volume ({farmAreaHa} ha)</div>
              <div className="text-2xl font-bold text-emerald-600">{r.gross_volume_m3.toLocaleString('en-IN')} m³</div>
              <div className="text-[11px] text-zinc-400">Net: {r.net_volume_m3.toLocaleString('en-IN')} m³</div>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Estimated Duration & Timing</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                {r.estimated_duration_hours !== null ? `${r.estimated_duration_hours} hrs` : 'Set flow rate'}
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {r.recommended_timing}
              </div>
            </div>
          </div>

          {/* Warnings */}
          {r.water_availability_warnings?.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-1">
              {r.water_availability_warnings.map((w: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Scientific Formulas & Provenance */}
          <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3 text-xs">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-600" />
              {mt.formulaLabel} & {mt.assumptionsLabel}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-300">
              <div>• <strong>ETc:</strong> {r.formulas?.etc}</div>
              <div>• <strong>Net Depth:</strong> {r.formulas?.net_depth}</div>
              <div>• <strong>Gross Depth:</strong> {r.formulas?.gross_depth}</div>
              <div>• <strong>Volume:</strong> {r.formulas?.volume}</div>
            </div>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1">
              <div><strong>{mt.sourceLabel}:</strong> {output?.source} • Uncertainty: {output?.uncertainty}</div>
              <div><strong>Estimated Root-Zone Moisture:</strong> {r.estimated_soil_moisture_pct}% (Modeled water-balance estimate, NOT a physical sensor reading)</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
