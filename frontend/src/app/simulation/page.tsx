// frontend/src/app/simulation/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  runFinancialSimulation,
  ScientificModuleOutput,
  MODULE_TRANSLATIONS,
} from '@/lib/scientificApi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { LineChart, RotateCw, AlertTriangle, Info } from 'lucide-react';

export default function SimulationPage() {
  const { currentFarm, language } = useFarm();
  const mt = MODULE_TRANSLATIONS[language] || MODULE_TRANSLATIONS.en;

  const [farmAreaHa, setFarmAreaHa] = useState<number>(currentFarm?.land_area_ha || 2.5);
  const [expectedYield, setExpectedYield] = useState<number>(25.0);
  const [marketPrice, setMarketPrice] = useState<number>(22000);
  const [cropLossPct, setCropLossPct] = useState<number>(8);
  const [waterAvailPct, setWaterAvailPct] = useState<number>(90);
  const [cultivationExp, setCultivationExp] = useState<number>(
    currentFarm?.cultivation_budget_inr || 85000
  );
  const [transportExp, setTransportExp] = useState<number>(18000);
  const [seed, setSeed] = useState<number>(42);

  const [output, setOutput] = useState<ScientificModuleOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSimulate = async () => {
    setIsLoading(true);
    try {
      const res = await runFinancialSimulation({
        farm_id: currentFarm?.id,
        crop_type: currentFarm?.primary_crop || 'Tomato',
        farm_area_ha: Math.max(0.1, farmAreaHa),
        expected_yield_t_per_ha: Math.max(0.5, expectedYield),
        yield_std_pct: 15,
        market_price_inr_per_t: Math.max(100, marketPrice),
        price_std_pct: 20,
        crop_loss_pct: cropLossPct,
        water_availability_pct: waterAvailPct,
        cultivation_expenses_inr: cultivationExp,
        transportation_expenses_inr: transportExp,
        num_trials: 5000,
        random_seed: seed,
      });
      setOutput(res);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSimulate();
  }, [currentFarm?.id]);

  const det = output?.results?.deterministic;
  const mc = output?.results?.monte_carlo;
  const bins = output?.results?.distribution_bins || [];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
            <LineChart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Predictive Agricultural & Financial Simulation
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Model-Based Estimate (Not a Guarantee)
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Deterministic what-if analysis & reproducible 5,000-trial Monte Carlo risk modeling (seed={seed})
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Expected Yield (t/ha)</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={expectedYield}
              onChange={(e) => setExpectedYield(parseFloat(e.target.value) || 1)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Market Selling Price (₹/tonne)</label>
            <input
              type="number"
              step="500"
              min="100"
              value={marketPrice}
              onChange={(e) => setMarketPrice(parseFloat(e.target.value) || 1000)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Crop Loss (%)</label>
            <input
              type="number"
              step="1"
              min="0"
              max="90"
              value={cropLossPct}
              onChange={(e) => setCropLossPct(parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Water Availability (%)</label>
            <input
              type="number"
              step="5"
              min="10"
              max="150"
              value={waterAvailPct}
              onChange={(e) => setWaterAvailPct(parseFloat(e.target.value) || 50)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Cultivation Expenses (₹)</label>
            <input
              type="number"
              step="1000"
              min="0"
              value={cultivationExp}
              onChange={(e) => setCultivationExp(parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Transport Expenses (₹)</label>
            <input
              type="number"
              step="500"
              min="0"
              value={transportExp}
              onChange={(e) => setTransportExp(parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Farm Area (ha)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={farmAreaHa}
              onChange={(e) => setFarmAreaHa(parseFloat(e.target.value) || 0.5)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSimulate}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <LineChart className="w-4 h-4" />}
              {mt.runSimulation}
            </button>
          </div>
        </div>
      </div>

      {det && mc && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Saleable Harvest & Break-Even</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">{det.saleable_harvest_tonnes} t</div>
              <div className="text-[11px] text-zinc-400">Break-even: ₹{det.break_even_price_inr_per_t?.toLocaleString('en-IN')}/t</div>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">P10 Downside Profit</div>
              <div className="text-2xl font-bold text-rose-600">₹{Math.round(mc.p10_downside_profit_inr).toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-zinc-400">Worst: ₹{Math.round(mc.worst_plausible_profit_inr).toLocaleString('en-IN')}</div>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">Median (P50) Profit</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">₹{Math.round(mc.median_p50_profit_inr).toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-zinc-400">Loss Risk: {mc.probability_of_loss_pct}%</div>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">P90 Upside Profit</div>
              <div className="text-2xl font-bold text-emerald-600">₹{Math.round(mc.p90_upside_profit_inr).toLocaleString('en-IN')}</div>
              <div className="text-[11px] text-zinc-400">Best: ₹{Math.round(mc.best_plausible_profit_inr).toLocaleString('en-IN')}</div>
            </div>
          </div>

          {bins.length > 0 && (
            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Monte Carlo Net Profit Distribution (5,000 Stochastic Trials)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bins}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="range_label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="trial_count" fill="#166534" radius={[6, 6, 0, 0]} name="Trials" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-500 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
            <div>
              <strong>Disclaimer:</strong> {output?.results?.model_disclaimer} • {mt.sourceLabel}: {output?.source}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
