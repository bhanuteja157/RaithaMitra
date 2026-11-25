// frontend/src/components/biointel/SeedInvestmentPlanner.tsx
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { saveSeedToDigitalFarmTransfer } from '@/lib/workflowBridge';
import {
  SeedInvestmentInput,
  VarietyComparisonInput,
  calculateSeedInvestment,
  compareVarieties,
  calculateRiskScenarios,
  generateFarmerRecommendations,
  CROP_PRESETS,
  getCropPreset,
  suggestCropsForFarmer,
  WaterAvailabilityLevel,
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
  Sparkles,
  Droplets,
  LandPlot,
  IndianRupee,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  RefreshCw,
  ArrowRight,
  Sprout,
  Compass,
  MapPin,
  Clock,
  Check,
} from 'lucide-react';

interface SeedInvestmentPlannerProps {
  selectedCrop?: string;
  onSelectCrop?: (crop: string) => void;
  onVarietySelectedForNursery?: (payload: {
    crop: string;
    varietyName: string;
    requiredSeedKg: number;
    budgetInr: number;
  }) => void;
}

export function SeedInvestmentPlanner({
  selectedCrop = 'Tomato',
  onSelectCrop,
  onVarietySelectedForNursery,
}: SeedInvestmentPlannerProps) {
  const { currentFarm, language } = useFarm();
  const planSectionRef = useRef<HTMLDivElement | null>(null);

  // 1. Simplified Mandatory Inputs
  const [crop, setCrop] = useState<string>(selectedCrop || currentFarm?.primary_crop || 'Tomato');
  const [areaAcres, setAreaAcres] = useState<number>(
    currentFarm ? Number((currentFarm.land_area_ha * 2.471).toFixed(1)) : 2
  );
  const [budgetInr, setBudgetInr] = useState<number>(
    currentFarm?.cultivation_budget_inr || 50000
  );
  const [waterAvailability, setWaterAvailability] = useState<WaterAvailabilityLevel>(() => {
    const method = (currentFarm?.irrigation_method || '').toLowerCase();
    if (method.includes('canal') || method.includes('flood')) return 'Abundant';
    if (method.includes('drip') || method.includes('borewell')) return 'Moderate';
    return 'Moderate';
  });

  // UI state
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [planGeneratedAt, setPlanGeneratedAt] = useState<string>('');

  // 2. Active Preset & Cultivation Parameters
  const activePreset = useMemo(() => getCropPreset(crop), [crop]);

  // Detailed inputs (populated from preset, editable via Advanced Settings)
  const [input, setInput] = useState<SeedInvestmentInput>(() => {
    const preset = getCropPreset(crop);
    return {
      crop: preset.name,
      variety: preset.defaultVariety,
      areaAcres,
      seedQtyPerAcreKg: preset.seedRatePerAcreKg,
      seedPricePerKg: preset.seedPricePerKg,
      fertilizerExpensesInr: Math.round(preset.fertilizerExpensesPerAcreInr * areaAcres),
      labourExpensesInr: Math.round(preset.labourExpensesPerAcreInr * areaAcres),
      irrigationExpensesInr: Math.round(preset.irrigationExpensesPerAcreInr * areaAcres),
      otherExpensesInr: Math.round(preset.otherExpensesPerAcreInr * areaAcres),
      availableBudgetInr: budgetInr,
      expectedYieldPerAcreKg: preset.expectedYieldPerAcreKg,
      expectedSellingPricePerKg: preset.expectedSellingPricePerKg,
    };
  });

  // Varieties state for side-by-side comparison
  const [varieties, setVarieties] = useState<VarietyComparisonInput[]>(() => activePreset.varieties);

  // Risk Scenario bounds
  const [unfavYield, setUnfavYield] = useState<number>(() => Math.round(activePreset.expectedYieldPerAcreKg * 0.7));
  const [unfavPrice, setUnfavPrice] = useState<number>(() => Math.round(activePreset.expectedSellingPricePerKg * 0.75));
  const [favYield, setFavYield] = useState<number>(() => Math.round(activePreset.expectedYieldPerAcreKg * 1.25));
  const [favPrice, setFavPrice] = useState<number>(() => Math.round(activePreset.expectedSellingPricePerKg * 1.35));

  // Sync when selectedCrop from parent changes
  useEffect(() => {
    if (selectedCrop && selectedCrop.toLowerCase() !== crop.toLowerCase()) {
      handleCropChange(selectedCrop);
    }
  }, [selectedCrop]);

  // Handle Crop Change & Auto-population
  const handleCropChange = (newCropName: string) => {
    const preset = getCropPreset(newCropName);
    setCrop(preset.name);
    onSelectCrop?.(preset.name);

    setInput({
      crop: preset.name,
      variety: preset.defaultVariety,
      areaAcres,
      seedQtyPerAcreKg: preset.seedRatePerAcreKg,
      seedPricePerKg: preset.seedPricePerKg,
      fertilizerExpensesInr: Math.round(preset.fertilizerExpensesPerAcreInr * areaAcres),
      labourExpensesInr: Math.round(preset.labourExpensesPerAcreInr * areaAcres),
      irrigationExpensesInr: Math.round(preset.irrigationExpensesPerAcreInr * areaAcres),
      otherExpensesInr: Math.round(preset.otherExpensesPerAcreInr * areaAcres),
      availableBudgetInr: budgetInr,
      expectedYieldPerAcreKg: preset.expectedYieldPerAcreKg,
      expectedSellingPricePerKg: preset.expectedSellingPricePerKg,
    });

    setVarieties(preset.varieties);
    setUnfavYield(Math.round(preset.expectedYieldPerAcreKg * 0.7));
    setUnfavPrice(Math.round(preset.expectedSellingPricePerKg * 0.75));
    setFavYield(Math.round(preset.expectedYieldPerAcreKg * 1.25));
    setFavPrice(Math.round(preset.expectedSellingPricePerKg * 1.35));
  };

  // Sync land area changes
  const handleAreaChange = (newArea: number) => {
    const safeArea = Math.max(0.1, newArea);
    setAreaAcres(safeArea);
    setInput((prev) => ({
      ...prev,
      areaAcres: safeArea,
      fertilizerExpensesInr: Math.round(activePreset.fertilizerExpensesPerAcreInr * safeArea),
      labourExpensesInr: Math.round(activePreset.labourExpensesPerAcreInr * safeArea),
      irrigationExpensesInr: Math.round(activePreset.irrigationExpensesPerAcreInr * safeArea),
      otherExpensesInr: Math.round(activePreset.otherExpensesPerAcreInr * safeArea),
    }));
  };

  // Sync budget changes
  const handleBudgetChange = (newBudget: number) => {
    const safeBudget = Math.max(0, newBudget);
    setBudgetInr(safeBudget);
    setInput((prev) => ({
      ...prev,
      availableBudgetInr: safeBudget,
    }));
  };

  // Calculations
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

  // Suggested crops for "Help Me Choose a Crop"
  const cropSuggestions = useMemo(
    () =>
      suggestCropsForFarmer(
        currentFarm?.soil_type || 'Red Sandy Loam',
        waterAvailability,
        budgetInr,
        areaAcres
      ),
    [currentFarm?.soil_type, waterAvailability, budgetInr, areaAcres]
  );

  const handleGeneratePlan = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setPlanGeneratedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      planSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  };

  const handleSelectVariety = (v: VarietyComparisonInput) => {
    setInput((prev) => ({
      ...prev,
      variety: v.varietyName,
      seedQtyPerAcreKg: v.seedQtyPerAcreKg,
      seedPricePerKg: v.seedPricePerKg,
      expectedYieldPerAcreKg: v.expectedYieldPerAcreKg,
    }));
    onVarietySelectedForNursery?.({
      crop,
      varietyName: v.varietyName,
      requiredSeedKg: Number((areaAcres * v.seedQtyPerAcreKg).toFixed(2)),
      budgetInr,
    });
    saveSeedToDigitalFarmTransfer({
      crop,
      varietyName: v.varietyName,
      areaAcres,
      budgetInr,
      waterAvailability,
      seedRequiredKg: Number((areaAcres * v.seedQtyPerAcreKg).toFixed(2)),
      transferredAt: new Date().toISOString(),
    });
  };

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

  // Quick preset crops
  const featuredCrops = ['Tomato', 'Maize', 'Paddy', 'Chilli', 'Onion', 'Potato', 'Cotton'];

  return (
    <div className="p-4 sm:p-7 bg-[#fdfbf7] dark:bg-zinc-950 border border-emerald-900/15 dark:border-zinc-800 rounded-3xl shadow-sm space-y-6 text-zinc-800 dark:text-zinc-200">
      {/* 1. Header & Location Sync */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-900/10 dark:border-zinc-800 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-800 text-white shadow-md shadow-emerald-900/20">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                HackWarts 2026 • AD-10
              </span>
              <span className="text-[11px] text-zinc-500">
                {language === 'kn' ? 'ಸರಳೀಕೃತ ಕೃಷಿ ಯೋಜಕ' : language === 'hi' ? 'सरल बीज योजना' : 'Farmer-Friendly Seed Planner'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-white mt-1">
              Intelligent Seed Investment Planner
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
              Select your crop, land and budget. We automatically calculate seeds, costs, profit and risks.
            </p>
          </div>
        </div>

        {/* Farm Profile Auto-Sync Pill */}
        <div className="flex items-center gap-2 p-2.5 px-3.5 rounded-2xl bg-amber-50/80 dark:bg-zinc-900 border border-amber-200/60 dark:border-zinc-800 self-start md:self-auto text-xs">
          <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>{currentFarm?.village ? `${currentFarm.village}, ${currentFarm.district || 'Karnataka'}` : 'Mandya Rural, Karnataka'}</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded font-medium">Auto-Synced</span>
            </div>
            <div className="text-[11px] text-zinc-500">
              Soil: <span className="font-medium text-zinc-700 dark:text-zinc-300">{currentFarm?.soil_type || 'Red Sandy Loam'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Step 1: Four Simple Mandatory Inputs */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 sm:p-6 border border-emerald-900/10 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold">1</span>
            <h3 className="text-base font-bold text-emerald-950 dark:text-white">
              Cultivation Essentials <span className="text-xs font-normal text-zinc-500">(Ask the farmer only 4 things)</span>
            </h3>
          </div>
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-100/70 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 transition-colors border border-amber-300/40"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Help Me Choose a Crop</span>
          </button>
        </div>

        {/* Q1: Which crop do you want to grow? */}
        <div className="space-y-2.5">
          <label className="block text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">
            Which crop do you want to grow? <span className="text-zinc-500 font-normal">({activePreset.kannadaName} / {activePreset.hindiName})</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {featuredCrops.map((cName) => {
              const p = getCropPreset(cName);
              const isSelected = crop.toLowerCase() === p.name.toLowerCase();
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleCropChange(p.name)}
                  className={`group relative flex flex-col items-center p-2.5 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 ring-2 ring-emerald-600/30 shadow-sm'
                      : 'bg-zinc-50/70 dark:bg-zinc-850 hover:bg-zinc-100/80 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden mb-1.5 shadow-inner bg-zinc-200">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-emerald-900 dark:text-emerald-300' : 'text-zinc-800 dark:text-zinc-200'}`}>
                    {p.name}
                  </span>
                  <span className="text-[10px] text-zinc-500">{p.kannadaName}</span>
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Q2, Q3, Q4 in 3 responsive columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {/* Q2: How much agricultural land do you have? */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              <LandPlot className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>How much land do you have?</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.25"
                min="0.1"
                max="100"
                value={areaAcres}
                onChange={(e) => handleAreaChange(parseFloat(e.target.value) || 0.1)}
                className="w-full p-2.5 pr-14 text-base font-bold rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <span className="absolute right-3 top-3 text-xs font-semibold text-zinc-500">
                Acres
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[0.5, 1, 2, 3, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAreaChange(val)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-colors ${
                    areaAcres === val
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {val} Ac
                </button>
              ))}
            </div>
          </div>

          {/* Q3: What is your available budget? */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              <IndianRupee className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>What is your available budget?</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-base font-bold text-zinc-400">₹</span>
              <input
                type="number"
                step="5000"
                min="5000"
                value={budgetInr}
                onChange={(e) => handleBudgetChange(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 pl-8 text-base font-bold rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[25000, 50000, 100000, 200000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleBudgetChange(val)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-colors ${
                    budgetInr === val
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  ₹{(val / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          {/* Q4: How much water is available? */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              <Droplets className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>How much water is available?</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { level: 'Abundant' as WaterAvailabilityLevel, label: 'Abundant (Canal/River)', icon: '💧💧' },
                { level: 'Moderate' as WaterAvailabilityLevel, label: 'Moderate (Borewell/Drip)', icon: '💧' },
                { level: 'Limited' as WaterAvailabilityLevel, label: 'Limited (Low Yield)', icon: '⚠️' },
                { level: 'Rainfed' as WaterAvailabilityLevel, label: 'Rainfed (Monsoon)', icon: '🌧️' },
              ].map((item) => (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => setWaterAvailability(item.level)}
                  className={`p-2 text-left rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                    waterAvailability === item.level
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="truncate">{item.level}</span>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-zinc-500 pt-0.5">
              Crop need: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{activePreset.waterNeed} ({activePreset.waterRequirementMm} mm)</span>
            </div>
          </div>
        </div>

        {/* 3. The One Big Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              All parameters auto-populated from <strong>ICAR-IIHR & UAS regional agronomic benchmarks</strong>.
            </span>
          </div>

          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Formulating Plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>Generate My Cultivation Plan</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Generated Cultivation Plan Output */}
      <div ref={planSectionRef} className="space-y-6">
        {/* Recommendation Spotlight Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-950 text-white shadow-md relative overflow-hidden space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-800 text-amber-300">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                  Recommended Cultivation Plan
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {input.crop} — {input.variety}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-emerald-200">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                {activePreset.durationLabel}
              </span>
              <span className="flex items-center gap-1">
                <LandPlot className="w-3.5 h-3.5 text-emerald-400" />
                {input.areaAcres} Acres
              </span>
              {planGeneratedAt && (
                <span className="text-[11px] text-emerald-300/80">Updated: {planGeneratedAt}</span>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            {comparison.recommendationReason || activePreset.recommendationReason}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-emerald-800/50 border border-emerald-700/50">
              <div className="text-[11px] text-emerald-300">Seed Quantity Required</div>
              <div className="text-base font-bold text-white mt-0.5">{calc.totalSeedRequirementKg} kg</div>
              <div className="text-[10px] text-emerald-300/80">@ ₹{input.seedPricePerKg.toLocaleString('en-IN')}/kg</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-800/50 border border-emerald-700/50">
              <div className="text-[11px] text-emerald-300">Seed Outlay</div>
              <div className="text-base font-bold text-white mt-0.5">₹{calc.totalSeedCostInr.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-emerald-300/80">{((calc.totalSeedCostInr / Math.max(1, calc.totalCultivationInvestmentInr)) * 100).toFixed(0)}% of total cost</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-800/50 border border-emerald-700/50">
              <div className="text-[11px] text-emerald-300">Expected Harvest</div>
              <div className="text-base font-bold text-white mt-0.5">{calc.expectedProductionKg.toLocaleString('en-IN')} kg</div>
              <div className="text-[10px] text-emerald-300/80">~{(calc.expectedProductionKg / 100).toFixed(0)} Quintals</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-800/50 border border-emerald-700/50">
              <div className="text-[11px] text-emerald-300">Target Selling Price</div>
              <div className="text-base font-bold text-amber-300 mt-0.5">₹{input.expectedSellingPricePerKg} / kg</div>
              <div className="text-[10px] text-emerald-300/80">Break-even: ₹{calc.breakEvenSellingPricePerKg}/kg</div>
            </div>
          </div>
        </div>

        {/* 5 Big Financial Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Investment */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-900/10 dark:border-zinc-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              Total Investment
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white">
              ₹{calc.totalCultivationInvestmentInr.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-zinc-500">
              Seed: ₹{calc.totalSeedCostInr.toLocaleString('en-IN')} + Inputs
            </div>
          </div>

          {/* Card 2: Remaining Budget */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-900/10 dark:border-zinc-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              Budget Status
            </span>
            <div
              className={`text-lg sm:text-xl font-extrabold ${
                calc.isWithinBudget ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'
              }`}
            >
              {calc.isWithinBudget ? `+₹${calc.remainingBudgetInr.toLocaleString('en-IN')}` : `-₹${Math.abs(calc.remainingBudgetInr).toLocaleString('en-IN')}`}
            </div>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                calc.isWithinBudget
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {calc.isWithinBudget ? 'Within Budget' : 'Budget Deficit'}
            </span>
          </div>

          {/* Card 3: Expected Production */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-900/10 dark:border-zinc-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              Expected Production
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white">
              {calc.expectedProductionKg.toLocaleString('en-IN')} kg
            </div>
            <div className="text-[11px] text-zinc-500">
              Rev: ₹{calc.expectedRevenueInr.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Card 4: Estimated Profit & ROI */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-900/10 dark:border-zinc-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              Est. Net Profit & ROI
            </span>
            <div
              className={`text-lg sm:text-xl font-extrabold ${
                calc.estimatedProfitInr >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'
              }`}
            >
              ₹{calc.estimatedProfitInr.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
              ROI: {calc.roiPct}%
            </div>
          </div>

          {/* Card 5: Break-Even Selling Price */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-900/10 dark:border-zinc-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              Break-Even Price
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white">
              ₹{calc.breakEvenSellingPricePerKg} / kg
            </div>
            <div className="text-[11px] text-zinc-500">
              Required to avoid loss
            </div>
          </div>
        </div>

        {/* Farmer-Friendly Recommendations & Major Risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800 space-y-2.5 text-xs">
            <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Cultivation Financial Advice</span>
            </div>
            <ul className="space-y-1.5 text-zinc-700 dark:text-zinc-300">
              {farmerRecs.map((rec, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800 space-y-2.5 text-xs">
            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Major Agronomic & Market Risks</span>
            </div>
            <ul className="space-y-1.5 text-zinc-700 dark:text-zinc-300">
              {activePreset.majorRisks.map((risk, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-700 font-bold">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 5. Simplified Variety Comparison (Attractive Visual Cards) */}
        <div className="space-y-3.5 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-emerald-950 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-700" />
                <span>Seed Variety Comparison — 3 Options</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Compare hybrid, resilient, and standard seed lines evaluated against your available budget.
              </p>
            </div>
            <span className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950 px-2.5 py-1 rounded-full font-medium">
              Illustrative Benchmarks — Not Guaranteed Outcomes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparison.items.map((v) => {
              const isSelected = input.variety.toLowerCase().includes(v.varietyName.toLowerCase().split('(')[0].trim());
              return (
                <div
                  key={v.id}
                  className={`relative p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    v.isRecommended
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-600 shadow-md ring-1 ring-emerald-600/30'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {/* Recommended Ribbon */}
                  {v.isRecommended && (
                    <div className="absolute -top-3 right-4 bg-emerald-700 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Recommended for Your Budget</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2 pt-1">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                          {v.varietyName}
                        </h4>
                        {v.tag && (
                          <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                            {v.tag}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          v.isBudgetSuitable
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {v.isBudgetSuitable ? 'Within Budget' : 'Exceeds Budget'}
                      </span>
                    </div>

                    {/* Financial Specs */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                      <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                        <span className="text-[10px] text-zinc-500">Seed Price</span>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          ₹{v.seedPricePerKg.toLocaleString('en-IN')}/kg
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                        <span className="text-[10px] text-zinc-500">Seed Outlay</span>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          ₹{v.seedInvestmentInr.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                        <span className="text-[10px] text-zinc-500">Total Cultivation</span>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          ₹{v.totalCultivationExpensesInr.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                        <span className="text-[10px] text-zinc-500">Exp. Production</span>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          {v.expectedProductionKg.toLocaleString('en-IN')} kg
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-100/40 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                        Est. Net Profit:
                      </span>
                      <span
                        className={`text-sm font-extrabold ${
                          v.estimatedProfitInr >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-600'
                        }`}
                      >
                        ₹{v.estimatedProfitInr.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Agronomic Specs */}
                    <div className="text-[11px] text-zinc-500 space-y-1 pt-1">
                      <div>
                        💧 <strong>Water:</strong> {v.waterRequirement}
                      </div>
                      <div>
                        🛡️ <strong>Resistance:</strong> {v.diseaseResistance}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectVariety(v)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-800 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-100 text-zinc-700 dark:text-zinc-300 hover:text-emerald-900'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Selected for Nursery &amp; Farm</span>
                      </>
                    ) : (
                      <span>Select This Variety</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <Link
              href="/digital-farming"
              onClick={() =>
                saveSeedToDigitalFarmTransfer({
                  crop,
                  varietyName: input.variety,
                  areaAcres,
                  budgetInr,
                  waterAvailability,
                  seedRequiredKg: Number((areaAcres * input.seedQtyPerAcreKg).toFixed(2)),
                  transferredAt: new Date().toISOString(),
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-sm"
            >
              <span>Cultivate {crop} in Digital Farm</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Variety Profit Chart */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <span>Visual Profit Arbitrage Across Compared Varieties</span>
            </h4>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="profit" radius={[6, 6, 0, 0]} name="Est. Net Profit (₹)">
                    {profitChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isRecommended ? '#166534' : '#22c55e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 6. Advanced Settings — Customize Estimates (Collapsed by Default) */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Advanced Settings — Customize Estimates
                </h4>
                <p className="text-xs text-zinc-500">
                  {isAdvancedOpen
                    ? 'Manually fine-tune seed rate, fertilizer, labour, irrigation, yield and prices'
                    : 'Experienced farmers can click here to fine-tune specific costs and parameters'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hidden sm:inline">
                {isAdvancedOpen ? 'Collapse' : 'Expand'}
              </span>
              {isAdvancedOpen ? (
                <ChevronUp className="w-5 h-5 text-zinc-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-500" />
              )}
            </div>
          </button>

          {isAdvancedOpen && (
            <div className="p-5 sm:p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-6 text-xs">
              <div className="text-xs font-semibold text-zinc-500">
                Adjust any field below. All profit, revenue, break-even and ROI calculations recalculate immediately.
              </div>

              {/* Granular Farm Inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Crop Name</label>
                  <input
                    type="text"
                    value={input.crop}
                    onChange={(e) => setInput({ ...input, crop: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Seed Variety</label>
                  <input
                    type="text"
                    value={input.variety}
                    onChange={(e) => setInput({ ...input, variety: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Seed Rate (kg/acre)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={input.seedQtyPerAcreKg}
                    onChange={(e) => setInput({ ...input, seedQtyPerAcreKg: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Seed Price (₹/kg)</label>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={input.seedPricePerKg}
                    onChange={(e) => setInput({ ...input, seedPricePerKg: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
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
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
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
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
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
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
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
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Expected Yield (kg/acre)</label>
                  <input
                    type="number"
                    step="250"
                    min="0"
                    value={input.expectedYieldPerAcreKg}
                    onChange={(e) => setInput({ ...input, expectedYieldPerAcreKg: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Expected Selling Price (₹/kg)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={input.expectedSellingPricePerKg}
                    onChange={(e) => setInput({ ...input, expectedSellingPricePerKg: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
              </div>

              {/* Editable 3-Variety Table */}
              <div className="space-y-2 pt-2">
                <h5 className="font-bold text-zinc-900 dark:text-white">
                  Editable Variety Comparison Parameters
                </h5>
                <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Variety Name</th>
                        <th className="p-2.5">Seed Rate (kg/ac)</th>
                        <th className="p-2.5">Price (₹/kg)</th>
                        <th className="p-2.5">Yield (kg/ac)</th>
                        <th className="p-2.5">Water / Resistance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {varieties.map((v, idx) => (
                        <tr key={v.id}>
                          <td className="p-2">
                            <input
                              type="text"
                              value={v.varietyName}
                              onChange={(e) => updateVarietyField(idx, 'varietyName', e.target.value)}
                              className="w-48 p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              value={v.seedQtyPerAcreKg}
                              onChange={(e) => updateVarietyField(idx, 'seedQtyPerAcreKg', parseFloat(e.target.value) || 0)}
                              className="w-20 p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="100"
                              value={v.seedPricePerKg}
                              onChange={(e) => updateVarietyField(idx, 'seedPricePerKg', parseFloat(e.target.value) || 0)}
                              className="w-24 p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="250"
                              value={v.expectedYieldPerAcreKg}
                              onChange={(e) => updateVarietyField(idx, 'expectedYieldPerAcreKg', parseFloat(e.target.value) || 0)}
                              className="w-24 p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={v.waterRequirement}
                              onChange={(e) => updateVarietyField(idx, 'waterRequirement', e.target.value)}
                              className="w-44 p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Risk Scenario Adjustments */}
              <div className="space-y-3 pt-2">
                <h5 className="font-bold text-zinc-900 dark:text-white">
                  Risk Scenario Simulation Parameters
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-zinc-500">Unfavourable Yield (kg/ac)</label>
                    <input
                      type="number"
                      value={unfavYield}
                      onChange={(e) => setUnfavYield(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500">Unfavourable Price (₹/kg)</label>
                    <input
                      type="number"
                      value={unfavPrice}
                      onChange={(e) => setUnfavPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500">Favourable Yield (kg/ac)</label>
                    <input
                      type="number"
                      value={favYield}
                      onChange={(e) => setFavYield(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500">Favourable Price (₹/kg)</label>
                    <input
                      type="number"
                      value={favPrice}
                      onChange={(e) => setFavPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="h-36 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskScenarios}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
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
          )}
        </div>
      </div>

      {/* 7. "Help Me Choose a Crop" Modal Advisor */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#fcfbf9] dark:bg-zinc-900 border border-emerald-900/20 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-emerald-950 dark:text-white">
                  Help Me Choose a Crop — Agronomic Matching
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Evaluated against your <strong>{currentFarm?.soil_type || 'Red Sandy Loam'}</strong> soil, <strong>{waterAvailability}</strong> water level, and <strong>₹{budgetInr.toLocaleString('en-IN')}</strong> budget for <strong>{areaAcres} Acres</strong>.
            </p>

            <div className="space-y-3">
              {cropSuggestions.map((item, idx) => (
                <div
                  key={item.crop.id}
                  className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 flex items-center justify-between gap-3 hover:border-emerald-500 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.crop.imageUrl}
                      alt={item.crop.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">
                          {item.crop.name} ({item.crop.kannadaName})
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {item.suitabilityScore}% Match
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {item.matchReasons.join(' • ')}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleCropChange(item.crop.name);
                      setIsHelpModalOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 shrink-0"
                  >
                    Select Crop
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
          <span>Calculations strictly deterministic based on entered acreage, budget and benchmark costs. Not guaranteed financial return.</span>
        </div>
        <span className="text-[10px] text-zinc-500 hidden sm:inline">
          RaithaMitra Agricultural Decision Intelligence Engine
        </span>
      </div>
    </div>
  );
}
