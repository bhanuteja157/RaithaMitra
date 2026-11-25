// frontend/src/components/digital-farming/DigitalFarmingWorkspace.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  LatLonPoint,
  SavedVirtualFarm,
  evaluateFarmPolygon,
  getTumakuruDemoFarm,
  saveHarvestTransferPayload,
} from '@/lib/digital-farming/geo';
import {
  CROP_CATALOG,
  CropCatalogItem,
  CropSortOption,
  DigitalFarmProfile,
  SoilType,
  IrrigationType,
  recommendCrops,
  sortRecommendations,
} from '@/lib/digital-farming/crops';
import {
  SimulationState,
  LiveWeatherSnapshot,
  DetailedFinancialInputs,
  WEATHER_SCENARIOS,
  WeatherScenarioType,
  VirtualActivityType,
  DEFAULT_WHAT_IF_SCENARIOS,
  WhatIfScenarioAdjustments,
  createInitialSimulationState,
  advanceSimulationDays,
  performVirtualActivity,
  evaluateAgriculturalRisks,
  buildDefaultFinancialInputs,
  calculateDetailedFinancials,
  buildCropPlanComparison,
  calculateWhatIfScenarios,
} from '@/lib/digital-farming/simulator';
import { DF_I18N, DFLanguage } from '@/lib/digital-farming/i18n';
import {
  loadSeedToDigitalFarmTransfer,
  saveFarmToCareTransfer,
  saveFinanceSnapshot,
  saveHarvestToBiddingDraft,
  saveHarvestToLabourTransfer,
} from '@/lib/workflowBridge';
import {
  CheckCircle2,
  Droplets,
  Sprout,
  CloudRain,
  AlertTriangle,
  TrendingUp,
  Printer,
  ArrowRight,
  Wheat,
  Shovel,
  Bug,
  Users,
  Tractor,
  FlaskConical,
} from 'lucide-react';

const GeospatialFarmMap = dynamic(() => import('./GeospatialFarmMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 rounded-2xl border border-zinc-200 bg-zinc-50 flex items-center justify-center text-sm text-zinc-500">
      Loading interactive geospatial map...
    </div>
  ),
});

const SatelliteCropTimeLapse = dynamic(() => import('./SatelliteCropTimeLapse'), {
  ssr: false,
  loading: () => (
    <div className="h-96 rounded-2xl border border-zinc-200 bg-zinc-900 flex items-center justify-center text-sm text-zinc-300">
      Loading satellite time-lapse simulator...
    </div>
  ),
});

type ActiveStep = 'map' | 'profile' | 'crops' | 'simulator' | 'finance';

export function DigitalFarmingWorkspace() {
  const router = useRouter();
  const [lang, setLang] = useState<DFLanguage>('en');
  const t = DF_I18N[lang];

  const [activeStep, setActiveStep] = useState<ActiveStep>('map');

  // Phase 1: Mapped Farmland
  const demoFarm = useMemo(() => getTumakuruDemoFarm(), []);
  const [points, setPoints] = useState<LatLonPoint[]>(demoFarm.points);
  const [farmName, setFarmName] = useState<string>(demoFarm.name);
  const [locationLabel, setLocationLabel] = useState<string>(demoFarm.locationLabel);
  const [confirmedFarm, setConfirmedFarm] = useState<SavedVirtualFarm>(demoFarm);

  const polygonMetrics = useMemo(() => evaluateFarmPolygon(points), [points]);
  const activeAreaAcres = confirmedFarm?.area.acres || polygonMetrics.area.acres || 1;
  const activeLat = confirmedFarm?.centroid.lat || polygonMetrics.centroid.lat;
  const activeLon = confirmedFarm?.centroid.lon || polygonMetrics.centroid.lon;

  // Phase 2: Digital Farm Profile
  const [profile, setProfile] = useState<DigitalFarmProfile>({
    soilType: 'Red soil',
    soilPh: 6.5,
    soilDataSource: 'Farmer Estimate',
    irrigationAvailable: true,
    irrigationType: 'Drip',
    waterSource: 'Borewell',
    availableWaterLevel: 'Moderate',
    budgetInr: 75000,
    expectedSowingDate: new Date().toISOString().slice(0, 10),
    availableLabour: 'Moderate',
    previousCrop: 'Ragi',
    farmingExperience: 'Intermediate',
    existingProblems: '',
  });

  // Phase 3: Crop Recommendation & Selection
  const [cropMode, setCropMode] = useState<'recommend' | 'manual'>('recommend');
  const [sortBy, setSortBy] = useState<CropSortOption>('suitability');
  const [selectedCropId, setSelectedCropId] = useState<string>('tomato');

  // Auto-load crop & budget transferred from BioIntel (Workflow A)
  useEffect(() => {
    const seedTransfer = loadSeedToDigitalFarmTransfer();
    if (seedTransfer?.crop) {
      const matched = CROP_CATALOG.find(
        (c) => c.name.toLowerCase() === seedTransfer.crop.toLowerCase() || c.id === seedTransfer.crop.toLowerCase()
      );
      if (matched) {
        setSelectedCropId(matched.id);
        setProfile((p) => ({
          ...p,
          budgetInr: seedTransfer.budgetInr || p.budgetInr,
        }));
      }
    }
  }, []);
  const selectedCrop: CropCatalogItem = useMemo(
    () => CROP_CATALOG.find((c) => c.id === selectedCropId) || CROP_CATALOG[0],
    [selectedCropId]
  );

  // Phase 6: Live Weather
  const [liveWeather, setLiveWeather] = useState<LiveWeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);

  const avgForecastTemp = useMemo(() => {
    if (!liveWeather?.dailyForecast || liveWeather.dailyForecast.length === 0) {
      return liveWeather?.temperatureC ?? null;
    }
    const sum = liveWeather.dailyForecast.reduce((acc, d) => acc + (d.tempMaxC + d.tempMinC) / 2, 0);
    return sum / liveWeather.dailyForecast.length;
  }, [liveWeather]);

  const recommendations = useMemo(
    () => sortRecommendations(recommendCrops(activeAreaAcres, profile, avgForecastTemp), sortBy),
    [activeAreaAcres, profile, avgForecastTemp, sortBy]
  );

  // Phase 4 & 5: Simulation State + History for Previous Day
  const [sim, setSim] = useState<SimulationState>(() =>
    createInitialSimulationState(CROP_CATALOG[0], profile)
  );
  const [simHistory, setSimHistory] = useState<SimulationState[]>([]);
  const [isCinematic, setIsCinematic] = useState<boolean>(false);
  const [activityNotice, setActivityNotice] = useState<string>('');

  // Phase 9: Financial Inputs
  const [finInputs, setFinInputs] = useState<DetailedFinancialInputs>(() =>
    buildDefaultFinancialInputs(CROP_CATALOG[0], demoFarm.area.acres)
  );

  // Phase 10: Compare up to 3 crops
  const [compareIds, setCompareIds] = useState<[string, string, string]>(['tomato', 'maize', 'chilli']);
  const [compareObjective, setCompareObjective] = useState<'profit' | 'low_investment' | 'low_water'>('profit');

  // Phase 11: What-If 3 scenarios
  const [whatIfScenarios, setWhatIfScenarios] = useState<WhatIfScenarioAdjustments[]>(DEFAULT_WHAT_IF_SCENARIOS);

  // Fetch live weather when centroid changes
  useEffect(() => {
    let cancelled = false;
    const loadWeather = async () => {
      setWeatherLoading(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      try {
        const res = await fetch(`${apiBase}/weather?lat=${activeLat}&lon=${activeLon}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setLiveWeather({
              temperatureC: data.current?.temperature_c ?? data.current?.temperature_2m ?? null,
              rainfallMm: data.current?.precipitation_mm ?? data.current?.rain ?? data.current?.precipitation ?? null,
              humidityPct: data.current?.relative_humidity_pct ?? data.current?.relative_humidity_2m ?? null,
              windSpeedKmh: data.current?.wind_speed_kmh ?? data.current?.wind_speed_10m ?? null,
              et0Mm: data.current?.et0_fao56_mm ?? data.daily_forecast?.[0]?.et0_fao56_mm ?? null,
              forecastPeriod: '7-day forecast',
              source: data.provenance?.source || 'RaithaMitra Weather Service (Open-Meteo)',
              lastUpdated: new Date().toLocaleTimeString(),
              isLive: Boolean(data.provenance?.is_live ?? data.is_live ?? true),
              dailyForecast: Array.isArray(data.daily_forecast)
                ? data.daily_forecast.slice(0, 7).map((d: any) => ({
                    date: d.date || '',
                    tempMaxC: Number(d.temp_max_c ?? d.temperature_2m_max ?? 30),
                    tempMinC: Number(d.temp_min_c ?? d.temperature_2m_min ?? 20),
                    rainMm: Number(d.precipitation_sum_mm ?? d.precipitation_sum ?? 0),
                  }))
                : undefined,
            });
            setWeatherLoading(false);
            return;
          }
        }
      } catch {
        // Fallback directly to Open-Meteo public API
      }

      try {
        const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${activeLat}&longitude=${activeLon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration&timezone=auto`;
        const omRes = await fetch(omUrl);
        if (omRes.ok) {
          const om = await omRes.json();
          if (!cancelled) {
            const dates: string[] = om.daily?.time || [];
            setLiveWeather({
              temperatureC: om.current?.temperature_2m ?? null,
              rainfallMm: om.current?.precipitation ?? null,
              humidityPct: om.current?.relative_humidity_2m ?? null,
              windSpeedKmh: om.current?.wind_speed_10m ?? null,
              et0Mm: om.daily?.et0_fao_evapotranspiration?.[0] ?? null,
              forecastPeriod: '7-day Open-Meteo forecast',
              source: 'Open-Meteo Public API',
              lastUpdated: new Date().toLocaleTimeString(),
              isLive: true,
              dailyForecast: dates.slice(0, 7).map((dt, idx) => ({
                date: dt,
                tempMaxC: om.daily.temperature_2m_max?.[idx] ?? 30,
                tempMinC: om.daily.temperature_2m_min?.[idx] ?? 20,
                rainMm: om.daily.precipitation_sum?.[idx] ?? 0,
              })),
            });
            setWeatherLoading(false);
            return;
          }
        }
      } catch {
        // Graceful offline fallback
      }

      if (!cancelled) {
        setLiveWeather({
          temperatureC: null,
          rainfallMm: null,
          humidityPct: null,
          windSpeedKmh: null,
          et0Mm: null,
          forecastPeriod: 'Offline',
          source: 'Unavailable (offline)',
          lastUpdated: new Date().toLocaleTimeString(),
          isLive: false,
          errorMessage: 'Live weather API unreachable; use simulated weather scenarios below.',
        });
        setWeatherLoading(false);
      }
    };

    loadWeather();
    return () => {
      cancelled = true;
    };
  }, [activeLat, activeLon]);

  // Play loop timer (supports 1x/2x/5x/10x and ~30s Cinematic Time-Lapse)
  useEffect(() => {
    if (!sim.isPlaying || sim.harvested) return;
    const intervalMs = isCinematic ? 300 : 750;
    const daysPerTick = isCinematic
      ? Math.max(1, Math.round(selectedCrop.durationDays / 100))
      : sim.speedDaysPerSec;

    const timer = window.setInterval(() => {
      setSim((prev) => {
        setSimHistory((h) => [...h.slice(-60), prev]);
        return advanceSimulationDays(prev, daysPerTick, selectedCrop, activeAreaAcres, profile);
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [sim.isPlaying, sim.harvested, sim.speedDaysPerSec, isCinematic, selectedCrop, activeAreaAcres, profile]);

  // Voice-driven Digital Farm playback & summary control
  useEffect(() => {
    const applyControl = (action?: string | null) => {
      if (!action) return;
      if (action === 'play' || action === 'resume') {
        setSim((prev) => ({ ...prev, started: true, isPlaying: true }));
      } else if (action === 'pause') {
        setSim((prev) => ({ ...prev, isPlaying: false }));
      } else if (action === 'summary') {
        setSim((prev) => ({ ...prev, started: true }));
      }
      try {
        window.sessionStorage.removeItem('rm_df_pending_action');
      } catch {
        // ignore
      }
    };

    try {
      const pending = window.sessionStorage.getItem('rm_df_pending_action');
      if (pending) applyControl(pending);
    } catch {
      // ignore
    }

    const onControl = (e: Event) => {
      const custom = e as CustomEvent<{ action?: string }>;
      applyControl(custom.detail?.action);
    };
    window.addEventListener('rm-df-control', onControl);
    return () => window.removeEventListener('rm-df-control', onControl);
  }, []);

  const financialSummary = useMemo(
    () => calculateDetailedFinancials(finInputs, activeAreaAcres, profile.budgetInr),
    [finInputs, activeAreaAcres, profile.budgetInr]
  );

  // Synchronized live financials: reflects simulated yield, weather stress, and activity expenses
  const liveFinancialSummary = useMemo(() => {
    const effectiveYieldKg =
      sim.started && sim.harvestedYieldKg > 0
        ? sim.harvestedYieldKg
        : financialSummary.expectedProductionKg;
    const effectiveInvestmentInr = financialSummary.totalInvestmentInr + sim.expenditureInr;
    const effectiveRevenueInr = Math.round(effectiveYieldKg * finInputs.expectedSellingPricePerKgInr);
    const effectiveProfitInr = effectiveRevenueInr - effectiveInvestmentInr;
    const effectiveRoiPct =
      effectiveInvestmentInr > 0
        ? Number(((effectiveProfitInr / effectiveInvestmentInr) * 100).toFixed(1))
        : 0;
    const effectiveBreakEven =
      effectiveYieldKg > 0 ? Number((effectiveInvestmentInr / effectiveYieldKg).toFixed(2)) : 0;
    return {
      ...financialSummary,
      expectedProductionKg: effectiveYieldKg,
      totalInvestmentInr: effectiveInvestmentInr,
      investmentPerAcreInr:
        activeAreaAcres > 0 ? Math.round(effectiveInvestmentInr / activeAreaAcres) : 0,
      grossRevenueInr: effectiveRevenueInr,
      netProfitInr: effectiveProfitInr,
      roiPct: effectiveRoiPct,
      breakEvenSellingPricePerKg: effectiveBreakEven,
      remainingBudgetInr: Math.round(profile.budgetInr - effectiveInvestmentInr),
    };
  }, [financialSummary, sim.started, sim.harvestedYieldKg, sim.expenditureInr, finInputs.expectedSellingPricePerKgInr, activeAreaAcres, profile.budgetInr]);

  const { risks, harvestWarning } = useMemo(
    () => evaluateAgriculturalRisks(sim, selectedCrop, profile, financialSummary, liveWeather),
    [sim, selectedCrop, profile, financialSummary, liveWeather]
  );

  const comparisonRows = useMemo(() => {
    const crops = compareIds
      .map((id) => CROP_CATALOG.find((c) => c.id === id))
      .filter((c): c is CropCatalogItem => Boolean(c));
    return buildCropPlanComparison(crops, activeAreaAcres, profile.budgetInr);
  }, [compareIds, activeAreaAcres, profile.budgetInr]);

  const strongestPlan = useMemo(() => {
    if (comparisonRows.length === 0) return null;
    const sorted = [...comparisonRows].sort((a, b) => {
      if (compareObjective === 'low_investment') return a.totalInvestmentInr - b.totalInvestmentInr;
      if (compareObjective === 'low_water') return a.waterRequirementMm - b.waterRequirementMm;
      return b.estimatedProfitInr - a.estimatedProfitInr;
    });
    return sorted[0];
  }, [comparisonRows, compareObjective]);

  const whatIfResults = useMemo(
    () => calculateWhatIfScenarios(finInputs, activeAreaAcres, profile.budgetInr, whatIfScenarios),
    [finInputs, activeAreaAcres, profile.budgetInr, whatIfScenarios]
  );

  const startCultivatingCrop = (cropId: string) => {
    const crop = CROP_CATALOG.find((c) => c.id === cropId) || CROP_CATALOG[0];
    setSelectedCropId(crop.id);
    setSim(createInitialSimulationState(crop, profile));
    setSimHistory([]);
    setIsCinematic(false);
    setFinInputs(buildDefaultFinancialInputs(crop, activeAreaAcres));
    setActivityNotice('');
    setActiveStep('simulator');
  };

  const handleConfirmFarm = (farm: SavedVirtualFarm) => {
    setConfirmedFarm(farm);
    setFinInputs(buildDefaultFinancialInputs(selectedCrop, farm.area.acres));
    setActiveStep('profile');
  };

  const handleActivity = (activity: VirtualActivityType) => {
    const res = performVirtualActivity(sim, activity, selectedCrop, activeAreaAcres);
    if (!res.rejected) {
      setSimHistory((h) => [...h.slice(-60), sim]);
    }
    setSim(res.nextState);
    setActivityNotice(res.message);
  };

  const handleStepDay = (delta: number) => {
    setSimHistory((h) => [...h.slice(-60), sim]);
    setSim((prev) => advanceSimulationDays(prev, delta, selectedCrop, activeAreaAcres, profile));
  };

  const handlePreviousDay = () => {
    if (simHistory.length === 0) return;
    const prev = simHistory[simHistory.length - 1];
    setSimHistory((h) => h.slice(0, -1));
    setSim({ ...prev, isPlaying: false });
  };

  const handleScrubDay = (targetDay: number) => {
    const clamped = Math.max(0, Math.min(selectedCrop.durationDays, targetDay));
    const base = {
      ...createInitialSimulationState(selectedCrop, profile),
      scenario: sim.scenario,
      scenarioIntensity: sim.scenarioIntensity,
      speedDaysPerSec: sim.speedDaysPerSec,
      soilPrepared: clamped > 0 ? true : sim.soilPrepared,
      sown: clamped > 0 ? true : sim.sown,
      started: clamped > 0,
    };
    const reconstructed =
      clamped > 0 ? advanceSimulationDays(base, clamped, selectedCrop, activeAreaAcres, profile) : base;
    setSimHistory((h) => [...h.slice(-60), sim]);
    setSim({
      ...reconstructed,
      isPlaying: false,
      scenario: sim.scenario,
      scenarioIntensity: sim.scenarioIntensity,
      speedDaysPerSec: sim.speedDaysPerSec,
    });
  };

  const handleAdvanceToNextStage = () => {
    const stepDays = Math.max(5, Math.round(selectedCrop.durationDays / 8));
    handleStepDay(stepDays);
  };

  const handleAnalyzeBestSelling = () => {
    saveHarvestTransferPayload({
      farmName: confirmedFarm.name,
      locationLabel: confirmedFarm.locationLabel,
      latitude: activeLat,
      longitude: activeLon,
      areaAcres: activeAreaAcres,
      cropId: selectedCrop.id,
      cropName: selectedCrop.name,
      harvestQuantityKg: liveFinancialSummary.expectedProductionKg,
      cultivationExpensesInr: liveFinancialSummary.totalInvestmentInr,
      expectedSellingPricePerKg: finInputs.expectedSellingPricePerKgInr,
      cultivationDurationDays: selectedCrop.durationDays,
      transferredAt: new Date().toISOString(),
    });
    router.push('/market-intelligence');
  };

  const remainingDays = Math.max(0, sim.totalDays - sim.currentDay);
  const estimatedHarvestDate = useMemo(() => {
    const base = new Date(profile.expectedSowingDate || Date.now());
    base.setDate(base.getDate() + sim.totalDays);
    return base.toISOString().slice(0, 10);
  }, [profile.expectedSowingDate, sim.totalDays]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-700 text-white p-5 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-full mb-2">
              <Sprout className="w-3.5 h-3.5" />
              RaithaMitra · Digital Farming & Geospatial Intelligence
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">{t.title}</h1>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['en', 'kn', 'hi'] as DFLanguage[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  lang === code ? 'bg-white text-emerald-900' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {code === 'en' ? 'English' : code === 'kn' ? 'ಕನ್ನಡ' : 'हिन्दी'}
              </button>
            ))}
          </div>
        </div>

        {/* Confirmed Farm Pill */}
        <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center gap-3 text-xs text-emerald-50">
          <span>
            <strong>Farm:</strong> {confirmedFarm.name}
          </span>
          <span>
            <strong>Area:</strong> {activeAreaAcres} acres ({confirmedFarm.area.sqMeters.toLocaleString('en-IN')} m²)
          </span>
          <span>
            <strong>Crop:</strong> {selectedCrop.name} ({selectedCrop.durationDays}d)
          </span>
          <span>
            <strong>Budget:</strong> ₹{profile.budgetInr.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 print:hidden">
        {(
          [
            { id: 'map', label: t.stepMap },
            { id: 'profile', label: t.stepProfile },
            { id: 'crops', label: t.stepCrops },
            { id: 'simulator', label: t.stepSimulator },
            { id: 'finance', label: t.stepFinanceReport },
          ] as { id: ActiveStep; label: string }[]
        ).map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveStep(step.id)}
            className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border text-left transition ${
              activeStep === step.id
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:border-emerald-400'
            }`}
          >
            {step.label}
          </button>
        ))}
      </div>

      {/* STEP 1: MAP & BOUNDARY */}
      {activeStep === 'map' && (
        <GeospatialFarmMap
          points={points}
          onPointsChange={setPoints}
          farmName={farmName}
          onFarmNameChange={setFarmName}
          locationLabel={locationLabel}
          onLocationLabelChange={setLocationLabel}
          onConfirmFarm={handleConfirmFarm}
        />
      )}

      {/* STEP 2: DIGITAL FARM PROFILE */}
      {activeStep === 'profile' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">Digital Farm Profile</h2>
              <p className="text-xs text-zinc-500">
                Soil properties are never guessed from coordinates alone. Enter your known or estimated values below.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Mapped Area: {activeAreaAcres} acres
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold mb-1">Soil Type</label>
              <select
                value={profile.soilType}
                onChange={(e) => setProfile({ ...profile, soilType: e.target.value as SoilType })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              >
                {(['Red soil', 'Black soil', 'Sandy soil', 'Clay soil', 'Loamy soil', 'Alluvial soil', 'Unknown soil'] as SoilType[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Soil Data Source</label>
              <select
                value={profile.soilDataSource}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    soilDataSource: e.target.value as DigitalFarmProfile['soilDataSource'],
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              >
                <option value="Measured / Lab Tested">Measured / Lab Tested</option>
                <option value="Farmer Estimate">Farmer Estimate</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Soil pH (if known)</label>
              <input
                type="number"
                step="0.1"
                min="3.5"
                max="9.5"
                value={profile.soilPh ?? ''}
                onChange={(e) =>
                  setProfile({ ...profile, soilPh: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="e.g. 6.5"
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Irrigation Availability</label>
              <select
                value={profile.irrigationAvailable ? 'yes' : 'no'}
                onChange={(e) => setProfile({ ...profile, irrigationAvailable: e.target.value === 'yes' })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              >
                <option value="yes">Irrigation Available</option>
                <option value="no">Rainfed Only (No Irrigation)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Irrigation Method</label>
              <select
                value={profile.irrigationType}
                onChange={(e) => setProfile({ ...profile, irrigationType: e.target.value as IrrigationType })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              >
                {(['Drip', 'Sprinkler', 'Flood / Canal', 'Rainfed Only'] as IrrigationType[]).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Water Source & Quantity</label>
              <div className="flex gap-2">
                <select
                  value={profile.waterSource}
                  onChange={(e) =>
                    setProfile({ ...profile, waterSource: e.target.value as DigitalFarmProfile['waterSource'] })
                  }
                  className="w-1/2 px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                >
                  {['Borewell', 'Canal', 'Farm Pond', 'Rainwater', 'River', 'Unknown'].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <select
                  value={profile.availableWaterLevel}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      availableWaterLevel: e.target.value as DigitalFarmProfile['availableWaterLevel'],
                    })
                  }
                  className="w-1/2 px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                >
                  {['Low', 'Moderate', 'Adequate', 'Abundant'].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Cultivation Budget (₹ INR)</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={profile.budgetInr}
                onChange={(e) => setProfile({ ...profile, budgetInr: Math.max(0, Number(e.target.value)) })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Expected Sowing Date</label>
              <input
                type="date"
                value={profile.expectedSowingDate}
                onChange={(e) => setProfile({ ...profile, expectedSowingDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Available Labour & Experience</label>
              <div className="flex gap-2">
                <select
                  value={profile.availableLabour}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      availableLabour: e.target.value as DigitalFarmProfile['availableLabour'],
                    })
                  }
                  className="w-1/2 px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                >
                  <option value="Low">Low Labour</option>
                  <option value="Moderate">Moderate Labour</option>
                  <option value="Adequate">Adequate Labour</option>
                </select>
                <select
                  value={profile.farmingExperience}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      farmingExperience: e.target.value as DigitalFarmProfile['farmingExperience'],
                    })
                  }
                  className="w-1/2 px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Experienced">Experienced</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Previous Crop</label>
              <input
                type="text"
                value={profile.previousCrop}
                onChange={(e) => setProfile({ ...profile, previousCrop: e.target.value })}
                placeholder="e.g., Ragi, Maize, Fallow"
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">Existing Agricultural Problems (Optional)</label>
              <input
                type="text"
                value={profile.existingProblems}
                onChange={(e) => setProfile({ ...profile, existingProblems: e.target.value })}
                placeholder="e.g., Wilt history, waterlogging in low corner, labour shortage"
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setActiveStep('crops')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold"
            >
              Continue to Crop Advisor <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CROP RECOMMENDATION ENGINE */}
      {activeStep === 'crops' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCropMode('recommend')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  cropMode === 'recommend' ? 'bg-emerald-700 text-white' : 'bg-zinc-100 dark:bg-zinc-800'
                }`}
              >
                Recommend What to Grow (20 Crops)
              </button>
              <button
                type="button"
                onClick={() => setCropMode('manual')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  cropMode === 'manual' ? 'bg-emerald-700 text-white' : 'bg-zinc-100 dark:bg-zinc-800'
                }`}
              >
                I Already Know My Crop
              </button>
            </div>

            {cropMode === 'recommend' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-zinc-500">Rank by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as CropSortOption)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                >
                  <option value="suitability">Overall Suitability Score</option>
                  <option value="max_profit">Maximum Estimated Profit</option>
                  <option value="min_investment">Minimum Investment</option>
                  <option value="min_water">Minimum Water Requirement</option>
                  <option value="low_risk">Lower Modeled Risk</option>
                  <option value="short_duration">Shorter Cultivation Duration</option>
                </select>
              </div>
            )}
          </div>

          <p className="text-[11px] text-zinc-500 px-1">
            Note: Financial and yield figures below use clearly labelled illustrative prototype parameters scaled to your {activeAreaAcres} acre mapped boundary.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.crop.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between space-y-3 ${
                  rec.excluded
                    ? 'bg-zinc-50 dark:bg-zinc-900/50 border-red-200 opacity-75'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-emerald-700">
                        {rec.crop.category} {rec.crop.isPerennial ? '· Perennial' : '· Seasonal'}
                      </span>
                      <h3 className="text-base font-bold">{rec.crop.name}</h3>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        rec.excluded
                          ? 'bg-red-100 text-red-800'
                          : rec.suitabilityScore >= 75
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rec.suitabilityScore}/100
                    </span>
                  </div>

                  {rec.excluded && (
                    <p className="text-xs text-red-700 bg-red-50 p-2 rounded-lg">{rec.exclusionReason}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl">
                    <div>
                      <span className="text-zinc-500 block">Duration</span>
                      <strong>{rec.crop.durationDays} days</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Water Need</span>
                      <strong>{rec.crop.waterRequirementMm} mm</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Est. Investment</span>
                      <strong>₹{rec.estimatedInvestmentInr.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Est. Profit</span>
                      <strong className={rec.estimatedProfitInr >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                        ₹{rec.estimatedProfitInr.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Expected Yield</span>
                      <strong>{rec.expectedYieldKg.toLocaleString('en-IN')} kg</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Modeled Risk</span>
                      <strong>{rec.modeledRiskLevel}</strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
                    {rec.reasons.slice(0, 2).map((r, i) => (
                      <p key={i}>• {r}</p>
                    ))}
                    <p className="text-zinc-500">
                      <strong>Risks:</strong> {rec.crop.keyRisks.slice(0, 2).join(', ')}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Data completeness: {rec.dataCompletenessPct}% ({rec.confidenceLabel})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startCultivatingCrop(rec.crop.id)}
                  className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                >
                  Start Digital Farming ({rec.crop.name})
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: INTERACTIVE DIGITAL FARMING SIMULATOR */}
      {activeStep === 'simulator' && (
        <div className="space-y-5">
          {/* Crop Switcher Bar */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-zinc-600 dark:text-zinc-300">Active Crop:</span>
              <select
                value={selectedCropId}
                onChange={(e) => startCultivatingCrop(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-semibold bg-zinc-50 dark:bg-zinc-800"
              >
                {CROP_CATALOG.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.durationDays}d)
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-zinc-500">
              Mapped Field: <strong>{confirmedFarm.name}</strong> ({activeAreaAcres} acres)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 cols: Satellite Time-Lapse + Activities + Log */}
            <div className="lg:col-span-2 space-y-4">
              <SatelliteCropTimeLapse
                points={points}
                crop={selectedCrop}
                sim={sim}
                areaAcres={activeAreaAcres}
                projectedYieldKg={liveFinancialSummary.expectedProductionKg}
                projectedProfitInr={liveFinancialSummary.netProfitInr}
                estimatedHarvestDate={estimatedHarvestDate}
                canStepBack={simHistory.length > 0}
                isCinematic={isCinematic}
                onTogglePlay={() =>
                  setSim((p) => ({ ...p, started: true, isPlaying: !p.isPlaying }))
                }
                onToggleCinematic={() => {
                  setIsCinematic((c) => {
                    const next = !c;
                    if (next) setSim((p) => ({ ...p, started: true, isPlaying: true }));
                    return next;
                  });
                }}
                onStepDay={handleStepDay}
                onPreviousDay={handlePreviousDay}
                onNextStage={handleAdvanceToNextStage}
                onScrubDay={handleScrubDay}
                onSpeedChange={(spd) => setSim((p) => ({ ...p, speedDaysPerSec: spd }))}
                onRestart={() => {
                  setSim(createInitialSimulationState(selectedCrop, profile));
                  setSimHistory([]);
                  setIsCinematic(false);
                  setActivityNotice('');
                }}
                onHarvest={() => handleActivity('harvest')}
              />

              {/* Virtual Agricultural Activities */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Virtual Agricultural Management</h3>
                  <span className="text-[11px] text-zinc-500">
                    Virtual actions only — never creates real bookings or job posts
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {(
                    [
                      { id: 'prepare_soil', label: 'Prepare Soil', icon: Shovel },
                      { id: 'sow_seeds', label: 'Sow Seeds', icon: Sprout },
                      { id: 'irrigate', label: 'Irrigate Field', icon: Droplets },
                      { id: 'apply_fertilizer', label: 'Apply Fertilizer', icon: FlaskConical },
                      { id: 'weeding', label: 'Perform Weeding', icon: Wheat },
                      { id: 'pest_management', label: 'Pest Management', icon: Bug },
                      { id: 'hire_labour', label: 'Hire Virtual Labour', icon: Users },
                      { id: 'rent_machinery', label: 'Rent Machinery', icon: Tractor },
                    ] as { id: VirtualActivityType; label: string; icon: any }[]
                  ).map((act) => {
                    const Icon = act.icon;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => handleActivity(act.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium text-left"
                      >
                        <Icon className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{act.label}</span>
                      </button>
                    );
                  })}
                </div>
                {activityNotice && (
                  <p className="text-xs px-3 py-2 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
                    {activityNotice}
                  </p>
                )}

                {sim.activityLog.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border-t border-zinc-200 dark:border-zinc-800 pt-2 space-y-1 text-xs">
                    {sim.activityLog.slice(0, 12).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span>
                          <strong>Day {entry.day}:</strong> {entry.label} ({entry.quantityNote}) —{' '}
                          <span className="text-zinc-500">{entry.effectSummary}</span>
                        </span>
                        <span className="font-semibold shrink-0">₹{entry.expenseInr.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Harvest Summary Banner (Phase 18) */}
              {(sim.harvested || sim.growthPct >= 85) && (
                <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                      {sim.harvested ? 'Digital Harvest Summary' : 'Crop Ready for Harvest'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          saveFarmToCareTransfer({
                            farmName: confirmedFarm.name,
                            locationLabel: confirmedFarm.locationLabel,
                            latitude: activeLat,
                            longitude: activeLon,
                            crop: selectedCrop.name,
                            growthStage: sim.stage,
                            soilType: profile.soilType,
                            soilMoisturePct: sim.soilMoisturePct,
                            transferredAt: new Date().toISOString(),
                          });
                          router.push('/farm-management');
                        }}
                        className="px-3 py-2 rounded-xl border border-emerald-700 text-emerald-800 bg-white text-xs font-semibold hover:bg-emerald-50"
                      >
                        Farm Care
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          saveHarvestToLabourTransfer({
                            crop: selectedCrop.name,
                            locationLabel: confirmedFarm.locationLabel,
                            expectedHarvestDate: estimatedHarvestDate,
                            areaAcres: activeAreaAcres,
                            recommendedWorkers: Math.max(2, Math.round(activeAreaAcres * 3)),
                            transferredAt: new Date().toISOString(),
                          });
                          router.push('/labour');
                        }}
                        className="px-3 py-2 rounded-xl border border-emerald-700 text-emerald-800 bg-white text-xs font-semibold hover:bg-emerald-50"
                      >
                        Hire Harvest Labour
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          saveHarvestToBiddingDraft({
                            cropName: selectedCrop.name,
                            quantityKg: liveFinancialSummary.expectedProductionKg,
                            location: confirmedFarm.locationLabel,
                            expectedPricePerKg: finInputs.expectedSellingPricePerKgInr,
                            cultivationExpensesInr: liveFinancialSummary.totalInvestmentInr,
                            transferredAt: new Date().toISOString(),
                          });
                          saveFinanceSnapshot({
                            cropName: selectedCrop.name,
                            projectedCultivationCostInr: liveFinancialSummary.totalInvestmentInr,
                            projectedRevenueInr: liveFinancialSummary.grossRevenueInr,
                            projectedProfitInr: liveFinancialSummary.netProfitInr,
                            updatedAt: new Date().toISOString(),
                          });
                          router.push('/smart-market');
                        }}
                        className="px-3 py-2 rounded-xl border border-emerald-700 text-emerald-800 bg-white text-xs font-semibold hover:bg-emerald-50"
                      >
                        Draft Produce Listing
                      </button>
                      <button
                        type="button"
                        onClick={handleAnalyzeBestSelling}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                      >
                        {t.analyzeBestSelling} <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl">
                      <span className="text-zinc-500 block">Projected Yield</span>
                      <strong>{liveFinancialSummary.expectedProductionKg.toLocaleString('en-IN')} kg</strong>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl">
                      <span className="text-zinc-500 block">Total Est. Expenses</span>
                      <strong>₹{liveFinancialSummary.totalInvestmentInr.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl">
                      <span className="text-zinc-500 block">Est. Revenue / Profit</span>
                      <strong>
                        ₹{liveFinancialSummary.grossRevenueInr.toLocaleString('en-IN')} /{' '}
                        <span className={liveFinancialSummary.netProfitInr >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                          ₹{liveFinancialSummary.netProfitInr.toLocaleString('en-IN')}
                        </span>
                      </strong>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl">
                      <span className="text-zinc-500 block">Est. Harvest Date</span>
                      <strong>{estimatedHarvestDate}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Farm Health + Weather Scenarios + Harvest Warning */}
            <div className="space-y-4">
              {/* Farm Health Dashboard (Phase 8) */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Simulated Farm Health</h3>
                  <span className="text-[10px] text-zinc-500">Modeled estimates</span>
                </div>
                {[
                  { label: 'Modeled Crop Health', val: sim.cropHealthPct, color: 'bg-emerald-600' },
                  { label: 'Growth Progress', val: Math.round(sim.growthPct), color: 'bg-green-500' },
                  { label: 'Est. Soil Moisture', val: Math.round(sim.soilMoisturePct), color: 'bg-sky-500' },
                  { label: 'Water Availability', val: Math.round(sim.waterAvailabilityPct), color: 'bg-cyan-600' },
                  { label: 'Nutrient Status', val: Math.round(sim.nutrientStatusPct), color: 'bg-lime-600' },
                  { label: 'Weather Stress', val: Math.round(sim.weatherStressPct), color: 'bg-amber-500' },
                  { label: 'Pest Risk Pressure', val: Math.round(sim.pestPressurePct), color: 'bg-rose-500' },
                ].map((bar) => (
                  <div key={bar.label} className="text-xs">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-zinc-600 dark:text-zinc-400">{bar.label}</span>
                      <span className="font-semibold">{bar.val}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${bar.color}`} style={{ width: `${bar.val}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Remaining Days</span>
                    <strong>{remainingDays} days</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Activity Spend</span>
                    <strong>₹{sim.expenditureInr.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              {/* Live Weather + Scenario Simulator (Phase 6) */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-1.5">
                    <CloudRain className="w-4 h-4 text-sky-600" /> Weather & Scenario Control
                  </h3>
                  <span className="text-[10px] text-zinc-500">
                    {weatherLoading ? 'Loading...' : liveWeather?.source}
                  </span>
                </div>

                {liveWeather?.isLive ? (
                  <div className="grid grid-cols-2 gap-2 text-xs bg-sky-50/70 dark:bg-sky-950/20 p-2.5 rounded-xl">
                    <div>Temp: <strong>{liveWeather.temperatureC ?? '--'}°C</strong></div>
                    <div>Rain: <strong>{liveWeather.rainfallMm ?? '--'} mm</strong></div>
                    <div>Humidity: <strong>{liveWeather.humidityPct ?? '--'}%</strong></div>
                    <div>Wind: <strong>{liveWeather.windSpeedKmh ?? '--'} km/h</strong></div>
                    <div className="col-span-2 text-[10px] text-zinc-500">
                      ET0: {liveWeather.et0Mm ?? '--'} mm · {liveWeather.forecastPeriod} (Updated {liveWeather.lastUpdated})
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-700">{liveWeather?.errorMessage || 'Weather loading...'}</p>
                )}

                <div className="space-y-2 text-xs">
                  <label className="block font-semibold">Simulated Weather Scenario (Illustrative):</label>
                  <select
                    value={sim.scenario}
                    onChange={(e) => setSim((p) => ({ ...p, scenario: e.target.value as WeatherScenarioType }))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  >
                    {WEATHER_SCENARIOS.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.label}
                      </option>
                    ))}
                  </select>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span>Scenario Intensity</span>
                      <span>{sim.scenarioIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={sim.scenarioIntensity}
                      onChange={(e) => setSim((p) => ({ ...p, scenarioIntensity: Number(e.target.value) }))}
                      className="w-full accent-emerald-700"
                    />
                  </div>
                </div>
              </div>

              {/* Harvest Risk Warning */}
              <div
                className={`rounded-2xl border p-3.5 text-xs space-y-1 ${
                  harvestWarning.active
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  {harvestWarning.sourceLabel}
                </div>
                <p>{harvestWarning.message}</p>
              </div>
            </div>
          </div>

          {/* 14-Risk Intelligence Grid (Phase 7) */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
            <h3 className="text-sm font-bold">Agricultural Risk Intelligence (14 Modeled Risk Factors)</h3>
            <p className="text-[11px] text-zinc-500">
              Modeled risk guidance only — does not diagnose actual field diseases.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {risks.map((r) => (
                <div key={r.id} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-zinc-900 dark:text-zinc-100">{r.name}</strong>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.level === 'High'
                          ? 'bg-red-100 text-red-800'
                          : r.level === 'Moderate'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {r.level}
                    </span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">{r.cause}</p>
                  <p className="text-[11px] text-zinc-500">Inputs: {r.contributingInputs}</p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300">Mitigation: {r.mitigation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: FINANCIAL INTELLIGENCE, 3-CROP COMPARISON, WHAT-IF, PRINTABLE REPORT */}
      {activeStep === 'finance' && (
        <div className="space-y-6">
          {/* Phase 9: Financial Calculator */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold">Agricultural Financial Intelligence ({selectedCrop.name})</h2>
                <p className="text-xs text-zinc-500">
                  Scaled to mapped area ({activeAreaAcres} acres). Edit any assumption below; profits are projections, not guarantees.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAnalyzeBestSelling}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold print:hidden"
              >
                {t.analyzeBestSelling} <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
              {(
                [
                  ['landPreparationInr', 'Land Prep (Total ₹)'],
                  ['seedQtyPerAcreKg', 'Seed Qty / Acre (kg)'],
                  ['seedPricePerKgInr', 'Seed Price / kg (₹)'],
                  ['fertilizerInr', 'Fertilizer (Total ₹)'],
                  ['irrigationInr', 'Irrigation (Total ₹)'],
                  ['labourInr', 'Labour (Total ₹)'],
                  ['machineryInr', 'Machinery (Total ₹)'],
                  ['pestManagementInr', 'Pest Mgmt (Total ₹)'],
                  ['electricityFuelInr', 'Fuel / Power (Total ₹)'],
                  ['harvestingInr', 'Harvesting (Total ₹)'],
                  ['packagingInr', 'Packaging (Total ₹)'],
                  ['transportationInr', 'Transport (Total ₹)'],
                  ['otherInr', 'Other Costs (Total ₹)'],
                  ['expectedYieldPerAcreKg', 'Expected Yield/Acre (kg)'],
                  ['expectedSellingPricePerKgInr', 'Expected Price/kg (₹)'],
                ] as [keyof DetailedFinancialInputs, string][]
              ).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-zinc-500 mb-1">{label}</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={finInputs[field]}
                    onChange={(e) =>
                      setFinInputs((p) => ({ ...p, [field]: Math.max(0, Number(e.target.value) || 0) }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <span className="text-[11px] text-zinc-500 block">Total Seed Needed</span>
                <strong className="text-sm">{liveFinancialSummary.totalSeedKg} kg</strong>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <span className="text-[11px] text-zinc-500 block">Total Investment</span>
                <strong className="text-sm">₹{liveFinancialSummary.totalInvestmentInr.toLocaleString('en-IN')}</strong>
                <span className="text-[10px] text-zinc-500 block">
                  ₹{liveFinancialSummary.investmentPerAcreInr.toLocaleString('en-IN')}/ac
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <span className="text-[11px] text-zinc-500 block">Gross Revenue</span>
                <strong className="text-sm">₹{liveFinancialSummary.grossRevenueInr.toLocaleString('en-IN')}</strong>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                <span className="text-[11px] text-zinc-500 block">Est. Net Profit</span>
                <strong className={`text-sm ${liveFinancialSummary.netProfitInr >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  ₹{liveFinancialSummary.netProfitInr.toLocaleString('en-IN')} ({liveFinancialSummary.roiPct}%)
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <span className="text-[11px] text-zinc-500 block">Break-Even Price</span>
                <strong className="text-sm">₹{liveFinancialSummary.breakEvenSellingPricePerKg}/kg</strong>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <span className="text-[11px] text-zinc-500 block">Remaining Budget</span>
                <strong className={`text-sm ${liveFinancialSummary.remainingBudgetInr >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  ₹{liveFinancialSummary.remainingBudgetInr.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </div>

          {/* Phase 10: 3-Crop Plan Comparison */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-700" /> Multiple Crop Comparison ({activeAreaAcres} acres)
              </h2>
              <div className="flex flex-wrap gap-2 text-xs">
                {[0, 1, 2].map((idx) => (
                  <select
                    key={idx}
                    value={compareIds[idx]}
                    onChange={(e) => {
                      const next = [...compareIds] as [string, string, string];
                      next[idx] = e.target.value;
                      setCompareIds(next);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  >
                    {CROP_CATALOG.map((c) => (
                      <option key={c.id} value={c.id}>
                        Plan {String.fromCharCode(65 + idx)}: {c.name}
                      </option>
                    ))}
                  </select>
                ))}
                <select
                  value={compareObjective}
                  onChange={(e) => setCompareObjective(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold"
                >
                  <option value="profit">Goal: Highest Profit</option>
                  <option value="low_investment">Goal: Lowest Investment</option>
                  <option value="low_water">Goal: Lowest Water Need</option>
                </select>
              </div>
            </div>

            {strongestPlan && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                <strong>Strongest Option ({compareObjective.replace('_', ' ')}):</strong> {strongestPlan.cropName} — Est. Profit ₹
                {strongestPlan.estimatedProfitInr.toLocaleString('en-IN')}, Investment ₹
                {strongestPlan.totalInvestmentInr.toLocaleString('en-IN')}, Water {strongestPlan.waterRequirementMm} mm.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500">
                    <th className="py-2 pr-3">Crop</th>
                    <th className="py-2 pr-3">Duration</th>
                    <th className="py-2 pr-3">Water</th>
                    <th className="py-2 pr-3">Investment</th>
                    <th className="py-2 pr-3">Yield</th>
                    <th className="py-2 pr-3">Revenue</th>
                    <th className="py-2 pr-3">Est. Profit</th>
                    <th className="py-2 pr-3">Break-Even</th>
                    <th className="py-2">Key Risks</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr
                      key={row.cropId}
                      className={`border-b border-zinc-100 dark:border-zinc-800 ${
                        strongestPlan?.cropId === row.cropId ? 'bg-emerald-50/60 dark:bg-emerald-950/20 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2 pr-3">{row.cropName}</td>
                      <td className="py-2 pr-3">{row.durationDays}d</td>
                      <td className="py-2 pr-3">{row.waterRequirementMm} mm</td>
                      <td className="py-2 pr-3">₹{row.totalInvestmentInr.toLocaleString('en-IN')}</td>
                      <td className="py-2 pr-3">{row.expectedProductionKg.toLocaleString('en-IN')} kg</td>
                      <td className="py-2 pr-3">₹{row.estimatedRevenueInr.toLocaleString('en-IN')}</td>
                      <td className="py-2 pr-3 text-emerald-700">₹{row.estimatedProfitInr.toLocaleString('en-IN')}</td>
                      <td className="py-2 pr-3">₹{row.breakEvenPricePerKg}/kg</td>
                      <td className="py-2 text-zinc-500">{row.keyRisks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cropName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalInvestmentInr" name="Investment (₹)" fill="#f59e0b" />
                  <Bar dataKey="estimatedProfitInr" name="Est. Profit (₹)" fill="#15803d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Phase 11: What-If Scenario Engine */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <h2 className="text-base font-bold">What-If Scenario Engine (Editable Assumptions, No Statistical Probabilities Claimed)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {whatIfScenarios.map((sc, idx) => {
                const res = whatIfResults[idx];
                return (
                  <div key={sc.name} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs">
                    <div className="font-bold text-sm">{sc.name} Conditions</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        Yield Factor
                        <input
                          type="number"
                          step="0.05"
                          value={sc.yieldFactor}
                          onChange={(e) => {
                            const next = [...whatIfScenarios];
                            next[idx] = { ...sc, yieldFactor: Number(e.target.value) || 0 };
                            setWhatIfScenarios(next);
                          }}
                          className="w-full mt-0.5 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                        />
                      </label>
                      <label>
                        Price Factor
                        <input
                          type="number"
                          step="0.05"
                          value={sc.priceFactor}
                          onChange={(e) => {
                            const next = [...whatIfScenarios];
                            next[idx] = { ...sc, priceFactor: Number(e.target.value) || 0 };
                            setWhatIfScenarios(next);
                          }}
                          className="w-full mt-0.5 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                        />
                      </label>
                    </div>
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-1">
                      <div>Investment: <strong>₹{res.adjustedInvestmentInr.toLocaleString('en-IN')}</strong></div>
                      <div>Revenue: <strong>₹{res.adjustedRevenueInr.toLocaleString('en-IN')}</strong></div>
                      <div>
                        Projected Profit:{' '}
                        <strong className={res.adjustedProfitInr >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                          ₹{res.adjustedProfitInr.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phase 19 & 20: Printable Farmer Decision Report */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold">Agricultural Decision & Printable Farmer Report</h2>
                <p className="text-xs text-zinc-500">Analysis Date: {new Date().toLocaleDateString()}</p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold print:hidden"
              >
                <Printer className="w-4 h-4" /> {t.printReport}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <strong>1. Selected Crop & Land:</strong> {selectedCrop.name} on {confirmedFarm.name} ({activeAreaAcres} acres, perimeter{' '}
                {confirmedFarm.perimeterMeters} m, centre {activeLat}, {activeLon}).
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <strong>2. Money & Water Required:</strong> Est. investment ₹{liveFinancialSummary.totalInvestmentInr.toLocaleString('en-IN')}; est. crop water requirement {selectedCrop.waterRequirementMm} mm over {selectedCrop.durationDays} days.
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <strong>3. Production & Profit Projection:</strong> Expected {liveFinancialSummary.expectedProductionKg.toLocaleString('en-IN')} kg, gross revenue ₹{liveFinancialSummary.grossRevenueInr.toLocaleString('en-IN')}, projected net profit ₹{liveFinancialSummary.netProfitInr.toLocaleString('en-IN')}.
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <strong>4. Major Risks & Alternatives:</strong>{' '}
                {risks
                  .filter((r) => r.level !== 'Low')
                  .slice(0, 3)
                  .map((r) => `${r.name} (${r.level})`)
                  .join(', ') || 'No high risks flagged'}. Alternative plans compared: {comparisonRows.map((c) => c.cropName).join(', ')}.
              </div>
            </div>

            <p className="text-[11px] text-zinc-500">
              <strong>Data Sources, Assumptions & Limitations:</strong> Geospatial area is a WGS84 spherical geodesic estimate from user-drawn points (not a legal survey). Live weather uses Open-Meteo when reachable. Crop durations, yields, and prices are illustrative prototype estimates unless replaced by farmer-entered figures.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
