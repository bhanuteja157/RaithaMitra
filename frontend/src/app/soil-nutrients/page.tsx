// frontend/src/app/soil-nutrients/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import {
  analyzeSoilNutrients,
  ScientificModuleOutput,
  MODULE_TRANSLATIONS,
} from '@/lib/scientificApi';
import { Sprout, TestTube, AlertCircle, CheckCircle2, RotateCw, ArrowUpRight } from 'lucide-react';

export default function SoilNutrientsPage() {
  const { currentFarm, language } = useFarm();
  const mt = MODULE_TRANSLATIONS[language] || MODULE_TRANSLATIONS.en;

  const [cropType, setCropType] = useState<string>(currentFarm?.primary_crop || 'Tomato');
  const [soilTexture, setSoilTexture] = useState<string>(currentFarm?.soil_type || 'Red Sandy Loam');
  const [nitrogen, setNitrogen] = useState<string>('210');
  const [phosphorus, setPhosphorus] = useState<string>('18.5');
  const [potassium, setPotassium] = useState<string>('280');
  const [soilPh, setSoilPh] = useState<string>('6.6');
  const [organicCarbon, setOrganicCarbon] = useState<string>('0.45');
  const [soilMoisture, setSoilMoisture] = useState<string>('');
  const [sourceType, setSourceType] = useState<string>('laboratory_soil_health_card');
  const [fetchSoilGrids, setFetchSoilGrids] = useState<boolean>(false);

  const [output, setOutput] = useState<ScientificModuleOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    try {
      const res = await analyzeSoilNutrients({
        farm_id: currentFarm?.id,
        latitude: currentFarm?.latitude ?? 12.5234,
        longitude: currentFarm?.longitude ?? 76.8976,
        crop_type: cropType,
        soil_texture: soilTexture,
        nitrogen_kg_ha: nitrogen !== '' ? parseFloat(nitrogen) : undefined,
        phosphorus_kg_ha: phosphorus !== '' ? parseFloat(phosphorus) : undefined,
        potassium_kg_ha: potassium !== '' ? parseFloat(potassium) : undefined,
        soil_ph: soilPh !== '' ? parseFloat(soilPh) : undefined,
        organic_carbon_pct: organicCarbon !== '' ? parseFloat(organicCarbon) : undefined,
        soil_moisture_pct: soilMoisture !== '' ? parseFloat(soilMoisture) : undefined,
        measurement_source: sourceType,
        fetch_soilgrids: fetchSoilGrids,
      });
      setOutput(res);
    } finally {
      setIsLoading(false);
    }
  };

  const r = output?.results;

  return (
    <div className="space-y-6 pb-10">
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
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                ICAR Thresholds
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Laboratory Soil Health Card analysis with explicit measurement units and BioIntel biological nutrient links
            </p>
          </div>
        </div>
      </div>

      {/* Soil Test Input Form */}
      <form
        onSubmit={handleAnalyze}
        className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4 text-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Target Crop</label>
            <select
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            >
              {['Tomato', 'Rice', 'Wheat', 'Maize', 'Chilli', 'Banana', 'Mango', 'Cotton'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Soil Texture</label>
            <input
              type="text"
              value={soilTexture}
              onChange={(e) => setSoilTexture(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Nitrogen N (kg/ha)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="Leave blank if unmeasured"
              value={nitrogen}
              onChange={(e) => setNitrogen(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Phosphorus P (kg/ha)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="Leave blank if unmeasured"
              value={phosphorus}
              onChange={(e) => setPhosphorus(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Potassium K (kg/ha)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="Leave blank if unmeasured"
              value={potassium}
              onChange={(e) => setPotassium(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Soil pH (1:2.5 water)</label>
            <input
              type="number"
              step="0.1"
              min="3"
              max="10.5"
              value={soilPh}
              onChange={(e) => setSoilPh(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Organic Carbon (%)</label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="15"
              value={organicCarbon}
              onChange={(e) => setOrganicCarbon(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Data Origin</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            >
              <option value="laboratory_soil_health_card">Laboratory Soil Health Card</option>
              <option value="field_sensor">Field Sensor</option>
              <option value="user_estimate">Farmer Estimate</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={fetchSoilGrids}
              onChange={(e) => setFetchSoilGrids(e.target.checked)}
              className="rounded text-green-700"
            />
            Also fetch ISRIC SoilGrids v2.0 global modeled reference (distinct from lab NPK)
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            {mt.analyze}
          </button>
        </div>
      </form>

      {r && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="text-xs font-semibold text-zinc-500">Nitrogen (N)</div>
              <div className="text-xl font-bold mt-1">
                {r.nutrient_status.nitrogen.value_kg_ha !== null ? `${r.nutrient_status.nitrogen.value_kg_ha} kg/ha` : 'Not Measured'}
              </div>
              <div className="text-[11px] text-zinc-400 uppercase mt-1">{r.nutrient_status.nitrogen.status.replace('_', ' ')}</div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="text-xs font-semibold text-zinc-500">Phosphorus (P)</div>
              <div className="text-xl font-bold mt-1">
                {r.nutrient_status.phosphorus.value_kg_ha !== null ? `${r.nutrient_status.phosphorus.value_kg_ha} kg/ha` : 'Not Measured'}
              </div>
              <div className="text-[11px] text-zinc-400 uppercase mt-1">{r.nutrient_status.phosphorus.status.replace('_', ' ')}</div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="text-xs font-semibold text-zinc-500">Potassium (K)</div>
              <div className="text-xl font-bold mt-1">
                {r.nutrient_status.potassium.value_kg_ha !== null ? `${r.nutrient_status.potassium.value_kg_ha} kg/ha` : 'Not Measured'}
              </div>
              <div className="text-[11px] text-zinc-400 uppercase mt-1">{r.nutrient_status.potassium.status.replace('_', ' ')}</div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="text-xs font-semibold text-zinc-500">Soil pH & OC%</div>
              <div className="text-xl font-bold mt-1">
                {r.nutrient_status.soil_ph.value ?? 'N/A'} pH
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Optimal {cropType}: {r.optimal_ph_range.min}–{r.optimal_ph_range.max}
              </div>
            </div>
          </div>

          {r.deficiencies?.length > 0 && (
            <div className="p-5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2 text-xs">
              <h3 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Identified Nutrient & Soil Gaps
              </h3>
              <ul className="space-y-1 text-amber-800 dark:text-amber-200">
                {r.deficiencies.map((d: string, i: number) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </div>
          )}

          {r.biointel_biological_options?.length > 0 && (
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 text-xs">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> BioIntel Biological Soil Improvement Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {r.biointel_biological_options.map((opt: any, idx: number) => (
                  <Link
                    key={idx}
                    href={opt.route}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between hover:border-green-700 transition"
                  >
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-white">{opt.intervention}</div>
                      <div className="text-[11px] text-zinc-500">{opt.category}</div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-green-700" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="text-[11px] text-zinc-500">
            <strong>{mt.sourceLabel}:</strong> {output?.source} • Data Quality: {output?.data_quality}
          </div>
        </div>
      )}
    </div>
  );
}
