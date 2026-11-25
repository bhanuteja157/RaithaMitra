// frontend/src/components/biointel/SeedInvestmentPlanner.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  SeedInvestmentInput,
  VarietyComparisonInput,
  calculateSeedInvestment,
  compareVarieties,
  calculateRiskScenarios,
  generateFarmerRecommendations,
} from '@/lib/seedInvestment';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Layers,
  Info,
} from 'lucide-react';

export function SeedInvestmentPlanner({ selectedCrop }: { selectedCrop: string }) {
  const [input, setInput] = useState<SeedInvestmentInput>({
    crop: selectedCrop || 'Tomato',
    variety: 'Arka Rakshak (User Assumed)',
    areaAcres: 2,
    seedQtyPerAcreKg: 0.06,
    seedPricePerKg: 35000,
    fertilizerExpensesInr: 12000,
    labourExpensesInr: 18000,
    irrigationExpensesInr: 6000,
    otherExpensesInr: 4000,
    availableBudgetInr: 50000,
    expectedYieldPerAcreKg: 10000,
    expectedSellingPricePerKg: 15,
  });

  useEffect(() => {
    setInput((prev) => ({ ...prev, crop: selectedCrop }));
  }, [selectedCrop]);

  // Up to 3 varieties for side-by-side comparison (user-editable)
  const [varieties, setVarieties] = useState<VarietyComparisonInput[]>([
    {
      id: 'v1',
      varietyName: 'Variety A (Standard Hybrid)',
      seedQtyPerAcreKg: 0.06,
      seedPricePerKg: 35000,
      expectedYieldPerAcreKg: 10000,
      waterRequirement: 'Moderate (Drip recommended)',
      diseaseResistance: 'ToLCV, Bacterial Wilt (verify label)',
    },
    {
      id: 'v2',
      varietyName: 'Variety B (Open-Pollinated)',
      seedQtyPerAcreKg: 0.15,
      seedPricePerKg: 6000,
      expectedYieldPerAcreKg: 7000,
      waterRequirement: 'Moderate',
      diseaseResistance: 'General field tolerance',
    },
    {
      id: 'v3',
      varietyName: 'Variety C (High-Input F1)',
      seedQtyPerAcreKg: 0.06,
      seedPricePerKg: 55000,
      expectedYieldPerAcreKg: 12000,
      waterRequirement: 'High (Precision fertigation)',
      diseaseResistance: 'Quad-resistant (verify certificate)',
    },
  ]);

  // Risk Scenario adjustments
  const [unfavYield, setUnfavYield] = useState<number>(6500);
  const [unfavPrice, setUnfavPrice] = useState<number>(10);
  const [favYield, setFavYield] = useState<number>(12500);
  const [favPrice, setFavPrice] = useState<number>(20);

  const calc = useMemo(() => calculateSeedInvestment(input), [input]);
  const comparison = useMemo(() => compareVarieties(varieties, input), [varieties, input]);
  const riskScenarios = useMemo(
    () =>
      calculateRiskScenarios(input, {
        unfavourableYield: unfavYield,
        unfavourablePrice: unfavPrice,
        expectedYield: input.expectedYieldPerAcreKg,
        expectedPrice: input.expectedSellingPricePerKg,
        favourableYield: favYield,
        favourablePrice: favPrice,
      }),
    [input, unfavYield, unfavPrice, favYield, favPrice]
  );
  const farmerRecs = useMemo(
    () => generateFarmerRecommendations(calc, input, comparison.items),
    [calc, input, comparison.items]
  );

  const updateVarietyField = (
    idx: number,
    field: keyof VarietyComparisonInput,
    val: string | number
  ) => {
    setVarieties((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const profitChartData = comparison.items.map((v) => ({
    name: v.varietyName.split('(')[0].trim(),
    profit: v.estimatedProfitInr,
    isRecommended: v.isRecommended,
  }));

  return (
    <div className="p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Intelligent Seed Investment Planner
            </h2>
            <p className="text-xs text-zinc-500">
              Deterministic cost, ROI, break-even, 3-variety comparison, and risk projections (INR & Acres)
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 self-start sm:self-auto">
          Projections Only — Not Guaranteed Outcomes
        </span>
      </div>

      {/* 1. Input Form */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Crop</label>
          <input
            type="text"
            value={input.crop}
            onChange={(e) => setInput({ ...input, crop: e.target.value })}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Seed Variety</label>
          <input
            type="text"
            value={input.variety}
            onChange={(e) => setInput({ ...input, variety: e.target.value })}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Farm Area (Acres)</label>
          <input
            type="number"
            step="0.25"
            min="0.1"
            value={input.areaAcres}
            onChange={(e) => setInput({ ...input, areaAcres: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Seed Rate (kg / acre)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={input.seedQtyPerAcreKg}
            onChange={(e) => setInput({ ...input, seedQtyPerAcreKg: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Seed Price (₹ / kg)</label>
          <input
            type="number"
            step="100"
            min="0"
            value={input.seedPricePerKg}
            onChange={(e) => setInput({ ...input, seedPricePerKg: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Fertilizer Expenses (₹)</label>
          <input
            type="number"
            step="500"
            min="0"
            value={input.fertilizerExpensesInr}
            onChange={(e) => setInput({ ...input, fertilizerExpensesInr: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Labour Expenses (₹)</label>
          <input
            type="number"
            step="500"
            min="0"
            value={input.labourExpensesInr}
            onChange={(e) => setInput({ ...input, labourExpensesInr: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Irrigation Expenses (₹)</label>
          <input
            type="number"
            step="500"
            min="0"
            value={input.irrigationExpensesInr}
            onChange={(e) => setInput({ ...input, irrigationExpensesInr: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Other Expenses (₹)</label>
          <input
            type="number"
            step="500"
            min="0"
            value={input.otherExpensesInr}
            onChange={(e) => setInput({ ...input, otherExpensesInr: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Available Budget (₹)</label>
          <input
            type="number"
            step="1000"
            min="0"
            value={input.availableBudgetInr}
            onChange={(e) => setInput({ ...input, availableBudgetInr: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Expected Yield (kg / acre)</label>
          <input
            type="number"
            step="250"
            min="0"
            value={input.expectedYieldPerAcreKg}
            onChange={(e) => setInput({ ...input, expectedYieldPerAcreKg: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Expected Price (₹ / kg)</label>
          <input
            type="number"
            step="1"
            min="0"
            value={input.expectedSellingPricePerKg}
            onChange={(e) => setInput({ ...input, expectedSellingPricePerKg: parseFloat(e.target.value) || 0 })}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
      </div>

      {/* 2. Financial Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
          <div className="text-[11px] text-zinc-500">Seed Req. & Cost</div>
          <div className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">
            {calc.totalSeedRequirementKg} kg
          </div>
          <div className="text-[11px] text-zinc-500">₹{calc.totalSeedCostInr.toLocaleString('en-IN')}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
          <div className="text-[11px] text-zinc-500">Total Investment</div>
          <div className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">
            ₹{calc.totalCultivationInvestmentInr.toLocaleString('en-IN')}
          </div>
          <div className={`text-[11px] font-semibold ${calc.isWithinBudget ? 'text-emerald-600' : 'text-rose-600'}`}>
            Rem. Budget: ₹{calc.remainingBudgetInr.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
          <div className="text-[11px] text-zinc-500">Expected Production</div>
          <div className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">
            {calc.expectedProductionKg.toLocaleString('en-IN')} kg
          </div>
          <div className="text-[11px] text-zinc-500">Rev: ₹{calc.expectedRevenueInr.toLocaleString('en-IN')}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
          <div className="text-[11px] text-zinc-500">Estimated Profit & ROI</div>
          <div className={`text-base font-bold mt-0.5 ${calc.estimatedProfitInr >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ₹{calc.estimatedProfitInr.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-zinc-500">ROI: {calc.roiPct}%</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
          <div className="text-[11px] text-zinc-500">Break-Even Price</div>
          <div className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">
            ₹{calc.breakEvenSellingPricePerKg} / kg
          </div>
          <div className="text-[11px] text-zinc-500">Target &gt; ₹{calc.breakEvenSellingPricePerKg}</div>
        </div>
      </div>

      {/* 3. Farmer-Friendly Deterministic Recommendations */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
        <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Farmer-Friendly Financial Recommendations
        </div>
        <ul className="space-y-1 text-zinc-700 dark:text-zinc-300">
          {farmerRecs.map((rec, i) => (
            <li key={i}>• {rec}</li>
          ))}
        </ul>
      </div>

      {/* 4. Crop Variety Comparison (Up to 3 Varieties Side by Side) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-green-700" />
            Crop Variety Comparison (Up to 3 Varieties — Editable Assumptions)
          </h3>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
            {comparison.recommendationReason}
          </span>
        </div>

        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 uppercase text-[10px]">
              <tr>
                <th className="p-3">Variety (Editable)</th>
                <th className="p-3">Seed Rate (kg/ac)</th>
                <th className="p-3">Seed Price (₹/kg)</th>
                <th className="p-3">Exp. Yield (kg/ac)</th>
                <th className="p-3">Seed Inv.</th>
                <th className="p-3">Total Cost</th>
                <th className="p-3">Est. Profit</th>
                <th className="p-3">Water & Resistance</th>
                <th className="p-3">Budget Fit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {comparison.items.map((v, idx) => (
                <tr
                  key={v.id}
                  className={v.isRecommended ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}
                >
                  <td className="p-2.5 font-semibold">
                    <input
                      type="text"
                      value={v.varietyName}
                      onChange={(e) => updateVarietyField(idx, 'varietyName', e.target.value)}
                      className="w-40 p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs"
                    />
                    {v.isRecommended && (
                      <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                        ★ Recommended Option
                      </span>
                    )}
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={v.seedQtyPerAcreKg}
                      onChange={(e) => updateVarietyField(idx, 'seedQtyPerAcreKg', parseFloat(e.target.value) || 0)}
                      className="w-20 p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={v.seedPricePerKg}
                      onChange={(e) => updateVarietyField(idx, 'seedPricePerKg', parseFloat(e.target.value) || 0)}
                      className="w-24 p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      step="250"
                      min="0"
                      value={v.expectedYieldPerAcreKg}
                      onChange={(e) => updateVarietyField(idx, 'expectedYieldPerAcreKg', parseFloat(e.target.value) || 0)}
                      className="w-24 p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs"
                    />
                  </td>
                  <td className="p-2.5">₹{v.seedInvestmentInr.toLocaleString('en-IN')}</td>
                  <td className="p-2.5">₹{v.totalCultivationExpensesInr.toLocaleString('en-IN')}</td>
                  <td className={`p-2.5 font-bold ${v.estimatedProfitInr >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ₹{v.estimatedProfitInr.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 text-[11px] text-zinc-500 max-w-[180px]">
                    <div>{v.waterRequirement}</div>
                    <div>{v.diseaseResistance}</div>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.isBudgetSuitable
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {v.isBudgetSuitable ? 'Within Budget' : 'Exceeds Budget'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Profit Comparison Chart & Risk Scenario Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-green-700" />
            Variety Estimated Profit Comparison (INR)
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="profit" radius={[6, 6, 0, 0]} name="Est. Profit (₹)">
                  {profitChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isRecommended ? '#166534' : '#22C55E'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Risk Scenario Simulator (Projections)
            </h3>
            <span className="text-[10px] text-zinc-400">Adjust yield & price</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-zinc-500">Unfavourable Yield (kg/ac)</label>
              <input
                type="number"
                step="250"
                value={unfavYield}
                onChange={(e) => setUnfavYield(parseFloat(e.target.value) || 0)}
                className="w-full p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500">Unfavourable Price (₹/kg)</label>
              <input
                type="number"
                step="1"
                value={unfavPrice}
                onChange={(e) => setUnfavPrice(parseFloat(e.target.value) || 0)}
                className="w-full p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500">Favourable Yield (kg/ac)</label>
              <input
                type="number"
                step="250"
                value={favYield}
                onChange={(e) => setFavYield(parseFloat(e.target.value) || 0)}
                className="w-full p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500">Favourable Price (₹/kg)</label>
              <input
                type="number"
                step="1"
                value={favPrice}
                onChange={(e) => setFavPrice(parseFloat(e.target.value) || 0)}
                className="w-full p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
              />
            </div>
          </div>

          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskScenarios}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="estimatedProfitInr" radius={[6, 6, 0, 0]} name="Projected Profit (₹)">
                  {riskScenarios.map((s, idx) => (
                    <Cell
                      key={idx}
                      fill={s.estimatedProfitInr < 0 ? '#dc2626' : s.label === 'Favourable' ? '#166534' : '#0284c7'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>All financial figures are deterministic projections based on your entered assumptions, not guaranteed market outcomes.</span>
      </div>
    </div>
  );
}
