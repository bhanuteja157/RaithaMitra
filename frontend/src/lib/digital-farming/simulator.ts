// frontend/src/lib/digital-farming/simulator.ts
// Deterministic crop growth simulator, virtual activities, weather/risk intelligence,
// financial calculator, 3-crop comparison, and What-If scenario engine.

import { CropCatalogItem, DigitalFarmProfile } from './crops';

export type GrowthStageId =
  | 'empty_land'
  | 'soil_preparation'
  | 'sowing'
  | 'germination'
  | 'seedlings'
  | 'vegetative'
  | 'flowering'
  | 'fruit_formation'
  | 'maturity'
  | 'harvested';

export const GROWTH_STAGES: { id: GrowthStageId; label: string; minProgressPct: number }[] = [
  { id: 'empty_land', label: 'Empty Agricultural Land', minProgressPct: 0 },
  { id: 'soil_preparation', label: 'Soil Preparation', minProgressPct: 1 },
  { id: 'sowing', label: 'Sowing', minProgressPct: 4 },
  { id: 'germination', label: 'Germination', minProgressPct: 8 },
  { id: 'seedlings', label: 'Seedlings', minProgressPct: 18 },
  { id: 'vegetative', label: 'Vegetative Growth', minProgressPct: 34 },
  { id: 'flowering', label: 'Flowering', minProgressPct: 58 },
  { id: 'fruit_formation', label: 'Fruit / Grain Formation', minProgressPct: 76 },
  { id: 'maturity', label: 'Crop Maturity', minProgressPct: 95 },
  { id: 'harvested', label: 'Harvested', minProgressPct: 100 },
];

export type WeatherScenarioType =
  | 'normal'
  | 'drought'
  | 'excessive_rain'
  | 'heat_stress'
  | 'cold_stress'
  | 'strong_winds'
  | 'unseasonal_rain'
  | 'reduced_irrigation';

export const WEATHER_SCENARIOS: {
  id: WeatherScenarioType;
  label: string;
  description: string;
}[] = [
  { id: 'normal', label: 'Normal Conditions', description: 'Balanced seasonal temperature and moisture.' },
  { id: 'drought', label: 'Drought / Dry Spell', description: 'Low rainfall and accelerated soil moisture loss.' },
  { id: 'excessive_rain', label: 'Excessive Rainfall', description: 'Waterlogging risk and nutrient leaching.' },
  { id: 'heat_stress', label: 'Heat Stress', description: 'High canopy temperature impacting flowering and moisture.' },
  { id: 'cold_stress', label: 'Cold Stress', description: 'Low temperature slowing germination and growth.' },
  { id: 'strong_winds', label: 'Strong Winds', description: 'Physical lodging risk for tall or fruiting plants.' },
  { id: 'unseasonal_rain', label: 'Unseasonal Rainfall', description: 'Unexpected rain increasing fungal/harvest risk.' },
  { id: 'reduced_irrigation', label: 'Reduced Irrigation Availability', description: 'Lower borewell/canal water supply.' },
];

export type VirtualActivityType =
  | 'prepare_soil'
  | 'sow_seeds'
  | 'irrigate'
  | 'apply_fertilizer'
  | 'weeding'
  | 'pest_management'
  | 'hire_labour'
  | 'rent_machinery'
  | 'harvest';

export interface ActivityLogEntry {
  id: string;
  day: number;
  activity: VirtualActivityType;
  label: string;
  quantityNote: string;
  expenseInr: number;
  effectSummary: string;
}

export interface SimulationState {
  started: boolean;
  isPlaying: boolean;
  speedDaysPerSec: 1 | 3 | 7;
  currentDay: number;
  totalDays: number;
  stage: GrowthStageId;
  growthPct: number;
  soilPrepared: boolean;
  sown: boolean;
  harvested: boolean;
  soilMoisturePct: number; // 0-100
  waterAvailabilityPct: number; // 0-100
  nutrientStatusPct: number; // 0-100
  weedPressurePct: number; // 0-100
  pestPressurePct: number; // 0-100
  weatherStressPct: number; // 0-100
  cropHealthPct: number; // 0-100
  labourBoostDays: number;
  expenditureInr: number;
  irrigationCount: number;
  fertilizerCount: number;
  lastActivityDayByType: Partial<Record<VirtualActivityType, number>>;
  scenario: WeatherScenarioType;
  scenarioIntensity: number; // 10-100
  harvestedYieldKg: number;
  activityLog: ActivityLogEntry[];
}

export interface LiveWeatherSnapshot {
  temperatureC: number | null;
  rainfallMm: number | null;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  et0Mm: number | null;
  forecastPeriod: string;
  source: string;
  lastUpdated: string;
  isLive: boolean;
  dailyForecast?: { date: string; tempMaxC: number; tempMinC: number; rainMm: number }[];
  errorMessage?: string;
}

export interface RiskItem {
  id: string;
  name: string;
  level: 'Low' | 'Moderate' | 'High';
  cause: string;
  contributingInputs: string;
  impact: string;
  mitigation: string;
  confidence: string;
}

export interface DetailedFinancialInputs {
  landPreparationInr: number;
  seedQtyPerAcreKg: number;
  seedPricePerKgInr: number;
  fertilizerInr: number;
  irrigationInr: number;
  labourInr: number;
  machineryInr: number;
  pestManagementInr: number;
  electricityFuelInr: number;
  harvestingInr: number;
  packagingInr: number;
  transportationInr: number;
  otherInr: number;
  expectedYieldPerAcreKg: number;
  expectedSellingPricePerKgInr: number;
}

export interface FinancialSummary {
  areaAcres: number;
  totalSeedKg: number;
  totalSeedCostInr: number;
  nonSeedCostsInr: number;
  totalInvestmentInr: number;
  investmentPerAcreInr: number;
  remainingBudgetInr: number;
  expectedProductionKg: number;
  grossRevenueInr: number;
  netProfitInr: number;
  roiPct: number;
  breakEvenSellingPricePerKg: number;
  cultivationCostPerKg: number;
}

export function createInitialSimulationState(
  crop: CropCatalogItem,
  profile: DigitalFarmProfile
): SimulationState {
  const initialWater =
    profile.availableWaterLevel === 'Abundant'
      ? 90
      : profile.availableWaterLevel === 'Adequate'
        ? 75
        : profile.availableWaterLevel === 'Moderate'
          ? 55
          : 35;

  return {
    started: false,
    isPlaying: false,
    speedDaysPerSec: 1,
    currentDay: 0,
    totalDays: crop.durationDays,
    stage: 'empty_land',
    growthPct: 0,
    soilPrepared: false,
    sown: false,
    harvested: false,
    soilMoisturePct: profile.irrigationAvailable ? 62 : 45,
    waterAvailabilityPct: initialWater,
    nutrientStatusPct: 68,
    weedPressurePct: 12,
    pestPressurePct: 10,
    weatherStressPct: 5,
    cropHealthPct: 88,
    labourBoostDays: 0,
    expenditureInr: 0,
    irrigationCount: 0,
    fertilizerCount: 0,
    lastActivityDayByType: {},
    scenario: 'normal',
    scenarioIntensity: 50,
    harvestedYieldKg: 0,
    activityLog: [],
  };
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

export function resolveGrowthStage(
  growthPct: number,
  soilPrepared: boolean,
  sown: boolean,
  harvested: boolean
): GrowthStageId {
  if (harvested) return 'harvested';
  if (!soilPrepared && growthPct === 0) return 'empty_land';
  if (soilPrepared && !sown) return 'soil_preparation';
  if (sown && growthPct < 8) return 'sowing';
  if (growthPct < 18) return 'germination';
  if (growthPct < 34) return 'seedlings';
  if (growthPct < 58) return 'vegetative';
  if (growthPct < 76) return 'flowering';
  if (growthPct < 95) return 'fruit_formation';
  return 'maturity';
}

export function advanceSimulationDays(
  prev: SimulationState,
  days: number,
  crop: CropCatalogItem,
  areaAcres: number,
  profile: DigitalFarmProfile
): SimulationState {
  if (prev.harvested || days <= 0) return prev;

  let state: SimulationState = { ...prev };
  if (!state.started) {
    state.started = true;
    if (!state.soilPrepared) state.soilPrepared = true;
    if (!state.sown) state.sown = true;
  }

  const intensityFactor = state.scenarioIntensity / 100;
  const waterDemandMultiplier =
    crop.waterDemandLevel === 'High' ? 1.35 : crop.waterDemandLevel === 'Moderate' ? 1.0 : 0.7;

  for (let d = 0; d < days; d++) {
    if (state.currentDay >= state.totalDays && state.growthPct >= 96) {
      state.isPlaying = false;
      break;
    }

    state.currentDay += 1;

    // Daily environmental drift based on scenario
    let moistureDelta = -2.2 * waterDemandMultiplier;
    let nutrientDelta = -0.6;
    let weedDelta = 0.55;
    let pestDelta = 0.45;
    let stressTarget = 8;

    switch (state.scenario) {
      case 'drought':
        moistureDelta -= 3.2 * intensityFactor;
        stressTarget = 40 + 45 * intensityFactor;
        break;
      case 'excessive_rain':
        moistureDelta += 5.5 * intensityFactor;
        nutrientDelta -= 0.9 * intensityFactor; // leaching
        pestDelta += 0.9 * intensityFactor;
        stressTarget = 30 + 40 * intensityFactor;
        break;
      case 'heat_stress':
        moistureDelta -= 2.4 * intensityFactor;
        stressTarget = 35 + 45 * intensityFactor;
        break;
      case 'cold_stress':
        moistureDelta -= 0.4;
        stressTarget = 28 + 38 * intensityFactor;
        break;
      case 'strong_winds':
        moistureDelta -= 1.2 * intensityFactor;
        stressTarget = 25 + 45 * intensityFactor;
        break;
      case 'unseasonal_rain':
        moistureDelta += 3.0 * intensityFactor;
        pestDelta += 1.1 * intensityFactor;
        stressTarget = 25 + 35 * intensityFactor;
        break;
      case 'reduced_irrigation':
        state.waterAvailabilityPct = clamp(state.waterAvailabilityPct - 1.5 * intensityFactor, 5, 100);
        moistureDelta -= 1.8 * intensityFactor;
        stressTarget = 25 + 35 * intensityFactor;
        break;
      case 'normal':
      default:
        // Gentle automatic drip/rain buffer if irrigation is available
        if (profile.irrigationAvailable && state.soilMoisturePct < 45) {
          moistureDelta += 1.4;
        }
        stressTarget = 6;
        break;
    }

    state.soilMoisturePct = clamp(state.soilMoisturePct + moistureDelta, 5, 100);
    state.nutrientStatusPct = clamp(state.nutrientStatusPct + nutrientDelta, 10, 100);
    state.weedPressurePct = clamp(state.weedPressurePct + weedDelta, 0, 100);
    state.pestPressurePct = clamp(state.pestPressurePct + pestDelta, 0, 100);

    // Waterlogging or moisture deficit adds stress
    let extraStress = 0;
    if (state.soilMoisturePct < 30) extraStress += (30 - state.soilMoisturePct) * 1.1;
    if (state.soilMoisturePct > 88) extraStress += (state.soilMoisturePct - 88) * 1.6;
    if (state.nutrientStatusPct < 35) extraStress += (35 - state.nutrientStatusPct) * 0.7;
    if (state.pestPressurePct > 45) extraStress += (state.pestPressurePct - 45) * 0.6;

    const combinedStress = clamp(stressTarget * 0.65 + extraStress * 0.55, 0, 100);
    state.weatherStressPct = Math.round(state.weatherStressPct * 0.7 + combinedStress * 0.3);

    // Health responds to moisture, nutrients, pests, and stress
    const targetHealth = clamp(
      100 -
        state.weatherStressPct * 0.45 -
        state.pestPressurePct * 0.25 -
        state.weedPressurePct * 0.15 -
        (state.nutrientStatusPct < 45 ? (45 - state.nutrientStatusPct) * 0.4 : 0),
      15,
      100
    );
    state.cropHealthPct = Math.round(state.cropHealthPct * 0.8 + targetHealth * 0.2);

    // Growth rate per day
    const baseDailyGrowth = 100 / Math.max(30, state.totalDays);
    const stressSlowdown =
      state.scenario === 'cold_stress'
        ? 0.68
        : state.weatherStressPct > 60
          ? 0.72
          : state.weatherStressPct > 35
            ? 0.86
            : 1.0;
    const healthMultiplier = 0.65 + (state.cropHealthPct / 100) * 0.4;

    state.growthPct = clamp(state.growthPct + baseDailyGrowth * stressSlowdown * healthMultiplier, 0, 100);
    state.stage = resolveGrowthStage(state.growthPct, state.soilPrepared, state.sown, state.harvested);

    if (state.labourBoostDays > 0) {
      state.labourBoostDays -= 1;
    }

    if (state.growthPct >= 99.5) {
      state.growthPct = 100;
      state.stage = 'maturity';
      state.isPlaying = false;
      break;
    }
  }

  // Keep projected yield synced for display
  const healthFactor = 0.45 + (state.cropHealthPct / 100) * 0.6;
  state.harvestedYieldKg = Math.round(crop.illustrativeYieldKgPerAcre * Math.max(0.05, areaAcres) * healthFactor);
  return state;
}

export function performVirtualActivity(
  prev: SimulationState,
  activity: VirtualActivityType,
  crop: CropCatalogItem,
  areaAcres: number,
  customExpenseInr?: number
): { nextState: SimulationState; message: string; rejected?: boolean } {
  const safeArea = Math.max(0.05, areaAcres);
  const lastDay = prev.lastActivityDayByType[activity];

  // Prevent repeated clicking on same day from producing unlimited unrealistic benefits
  if (lastDay !== undefined && prev.currentDay - lastDay < 2 && activity !== 'harvest' && activity !== 'prepare_soil' && activity !== 'sow_seeds') {
    return {
      nextState: prev,
      rejected: true,
      message: `Activity already performed recently (Day ${lastDay}). Advance simulation by at least 2 days to avoid over-application.`,
    };
  }

  const next: SimulationState = {
    ...prev,
    lastActivityDayByType: { ...prev.lastActivityDayByType, [activity]: prev.currentDay },
    activityLog: [...prev.activityLog],
  };

  let expense = customExpenseInr ?? 0;
  let label = '';
  let quantityNote = '';
  let effectSummary = '';

  switch (activity) {
    case 'prepare_soil': {
      if (next.soilPrepared) {
        return { nextState: prev, rejected: true, message: 'Soil preparation is already complete for this cycle.' };
      }
      expense = customExpenseInr ?? Math.round(2500 * safeArea);
      next.soilPrepared = true;
      next.started = true;
      next.weedPressurePct = clamp(next.weedPressurePct - 8, 0, 100);
      next.stage = resolveGrowthStage(next.growthPct, next.soilPrepared, next.sown, next.harvested);
      label = 'Prepare Soil';
      quantityNote = `${safeArea.toFixed(2)} acres`;
      effectSummary = 'Seedbed tilled; weed pressure reduced.';
      break;
    }
    case 'sow_seeds': {
      if (next.sown) {
        return { nextState: prev, rejected: true, message: 'Seeds have already been sown for this cycle.' };
      }
      const seedKg = Number((crop.seedRateKgPerAcre * safeArea).toFixed(2));
      expense = customExpenseInr ?? Math.round(seedKg * crop.illustrativeSeedPricePerKg);
      next.soilPrepared = true;
      next.sown = true;
      next.started = true;
      next.growthPct = Math.max(next.growthPct, 4);
      next.stage = resolveGrowthStage(next.growthPct, next.soilPrepared, next.sown, next.harvested);
      label = 'Sow Seeds';
      quantityNote = `${seedKg} kg (${crop.name})`;
      effectSummary = 'Crop established; germination begins as days advance.';
      break;
    }
    case 'irrigate': {
      if (next.soilMoisturePct >= 92) {
        return {
          nextState: prev,
          rejected: true,
          message: 'Soil moisture is already near saturation (92%+). Additional irrigation risks waterlogging.',
        };
      }
      expense = customExpenseInr ?? Math.round(700 * safeArea);
      const gain = Math.min(26, Math.max(8, 92 - next.soilMoisturePct));
      next.soilMoisturePct = clamp(next.soilMoisturePct + gain, 0, 96);
      next.waterAvailabilityPct = clamp(next.waterAvailabilityPct - 4, 5, 100);
      next.weatherStressPct = clamp(next.weatherStressPct - 10, 0, 100);
      next.cropHealthPct = clamp(next.cropHealthPct + 4, 0, 100);
      next.irrigationCount += 1;
      label = 'Irrigate Field';
      quantityNote = `+${Math.round(gain)}% moisture`;
      effectSummary = 'Increased estimated soil moisture and reduced moisture stress.';
      break;
    }
    case 'apply_fertilizer': {
      if (next.fertilizerCount >= 6) {
        return {
          nextState: prev,
          rejected: true,
          message: 'Maximum recommended seasonal fertilizer applications reached for this simulation.',
        };
      }
      expense = customExpenseInr ?? Math.round(1800 * safeArea);
      next.nutrientStatusPct = clamp(next.nutrientStatusPct + 18, 0, 96);
      next.cropHealthPct = clamp(next.cropHealthPct + 4, 0, 100);
      next.fertilizerCount += 1;
      label = 'Apply Fertilizer / Bio-Nutrient';
      quantityNote = `Application #${next.fertilizerCount}`;
      effectSummary = 'Replenished estimated soil nutrient status.';
      break;
    }
    case 'weeding': {
      expense = customExpenseInr ?? Math.round(1100 * safeArea);
      next.weedPressurePct = clamp(next.weedPressurePct - 25, 0, 100);
      next.cropHealthPct = clamp(next.cropHealthPct + 3, 0, 100);
      label = 'Perform Weeding';
      quantityNote = `${safeArea.toFixed(2)} acres`;
      effectSummary = 'Reduced weed competition for water and nutrients.';
      break;
    }
    case 'pest_management': {
      expense = customExpenseInr ?? Math.round(1400 * safeArea);
      next.pestPressurePct = clamp(next.pestPressurePct - 24, 0, 100);
      next.cropHealthPct = clamp(next.cropHealthPct + 4, 0, 100);
      label = 'Pest Management (IPM)';
      quantityNote = 'Field scouting & biocontrol';
      effectSummary = 'Reduced modeled pest pressure without recommending unverified chemical doses.';
      break;
    }
    case 'hire_labour': {
      expense = customExpenseInr ?? Math.round(1600 * safeArea);
      next.labourBoostDays += 14;
      label = 'Hire Virtual Labour';
      quantityNote = '14-day crew support';
      effectSummary = 'Improved field operation readiness and reduced labour shortage risk.';
      break;
    }
    case 'rent_machinery': {
      expense = customExpenseInr ?? Math.round(2200 * safeArea);
      next.soilPrepared = true;
      next.weedPressurePct = clamp(next.weedPressurePct - 10, 0, 100);
      label = 'Rent Virtual Machinery';
      quantityNote = 'Tractor / sprayer slot';
      effectSummary = 'Updated cultivation expenditure and improved field readiness.';
      break;
    }
    case 'harvest': {
      if (next.growthPct < 85) {
        return {
          nextState: prev,
          rejected: true,
          message: `Crop is at ${Math.round(next.growthPct)}% growth. Wait until at least 85% maturity before harvesting.`,
        };
      }
      expense = customExpenseInr ?? Math.round(2500 * safeArea);
      next.harvested = true;
      next.isPlaying = false;
      next.growthPct = 100;
      next.stage = 'harvested';
      const healthFactor = 0.45 + (next.cropHealthPct / 100) * 0.6;
      next.harvestedYieldKg = Math.round(crop.illustrativeYieldKgPerAcre * safeArea * healthFactor);
      label = 'Complete Harvest';
      quantityNote = `${next.harvestedYieldKg.toLocaleString('en-IN')} kg`;
      effectSummary = `Projected harvest completed (~${next.harvestedYieldKg.toLocaleString('en-IN')} kg).`;
      break;
    }
  }

  next.expenditureInr += Math.max(0, expense);
  next.activityLog.unshift({
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    day: next.currentDay,
    activity,
    label,
    quantityNote,
    expenseInr: Math.max(0, expense),
    effectSummary,
  });

  return { nextState: next, message: effectSummary };
}

export function evaluateAgriculturalRisks(
  sim: SimulationState,
  crop: CropCatalogItem,
  profile: DigitalFarmProfile,
  financial: FinancialSummary,
  liveWeather: LiveWeatherSnapshot | null
): { risks: RiskItem[]; harvestWarning: { active: boolean; sourceLabel: string; message: string } } {
  const isSoilMatch =
    profile.soilType === 'Unknown soil' || crop.compatibleSoils.includes(profile.soilType);

  const waterShortageLevel: RiskItem['level'] =
    sim.soilMoisturePct < 32 || sim.scenario === 'drought' || sim.scenario === 'reduced_irrigation'
      ? 'High'
      : sim.soilMoisturePct < 48 || !profile.irrigationAvailable
        ? 'Moderate'
        : 'Low';

  const excessiveRainLevel: RiskItem['level'] =
    sim.scenario === 'excessive_rain' || sim.scenario === 'unseasonal_rain'
      ? sim.scenarioIntensity >= 60
        ? 'High'
        : 'Moderate'
      : 'Low';

  const waterloggingLevel: RiskItem['level'] =
    sim.soilMoisturePct > 85 || (excessiveRainLevel === 'High' && profile.soilType === 'Clay soil')
      ? 'High'
      : sim.soilMoisturePct > 74
        ? 'Moderate'
        : 'Low';

  const heatLevel: RiskItem['level'] =
    sim.scenario === 'heat_stress' || (liveWeather?.temperatureC !== null && liveWeather?.temperatureC !== undefined && liveWeather.temperatureC > crop.optimalTempMaxC + 2)
      ? 'High'
      : 'Low';

  const coldLevel: RiskItem['level'] =
    sim.scenario === 'cold_stress' || (liveWeather?.temperatureC !== null && liveWeather?.temperatureC !== undefined && liveWeather.temperatureC < crop.optimalTempMinC - 2)
      ? 'High'
      : 'Low';

  const risks: RiskItem[] = [
    {
      id: 'water_shortage',
      name: 'Water Shortage',
      level: waterShortageLevel,
      cause: 'Low soil moisture or restricted irrigation scenario.',
      contributingInputs: `Soil moisture ${Math.round(sim.soilMoisturePct)}%, irrigation ${profile.irrigationAvailable ? profile.irrigationType : 'unavailable'}`,
      impact: 'Stunted growth and lower projected yield.',
      mitigation: 'Irrigate during cooler hours and apply organic mulch.',
      confidence: 'Modeled estimate',
    },
    {
      id: 'excessive_rainfall',
      name: 'Excessive Rainfall',
      level: excessiveRainLevel,
      cause: 'Heavy or unseasonal rainfall simulation.',
      contributingInputs: `Scenario: ${sim.scenario}`,
      impact: 'Nutrient leaching and flower/fruit drop.',
      mitigation: 'Open field drainage channels before peak rainfall.',
      confidence: 'Scenario-based estimate',
    },
    {
      id: 'waterlogging',
      name: 'Waterlogging',
      level: waterloggingLevel,
      cause: 'Soil saturation exceeding root aeration capacity.',
      contributingInputs: `Moisture ${Math.round(sim.soilMoisturePct)}%, Soil: ${profile.soilType}`,
      impact: 'Root rot and damping-off risk.',
      mitigation: 'Avoid additional irrigation and create raised beds/drains.',
      confidence: 'Modeled estimate',
    },
    {
      id: 'heat_stress',
      name: 'Heat Stress',
      level: heatLevel,
      cause: 'Temperatures above optimal crop threshold.',
      contributingInputs: `Optimal max ${crop.optimalTempMaxC}°C`,
      impact: 'Pollen sterility and blossom drop.',
      mitigation: 'Maintain steady light irrigation and shade young seedlings.',
      confidence: liveWeather?.isLive ? 'Forecast + Modeled' : 'Scenario-based estimate',
    },
    {
      id: 'cold_stress',
      name: 'Cold Stress',
      level: coldLevel,
      cause: 'Temperatures below optimal crop threshold.',
      contributingInputs: `Optimal min ${crop.optimalTempMinC}°C`,
      impact: 'Delayed germination and slower vegetative progress.',
      mitigation: 'Delay sowing until minimum temperatures stabilize.',
      confidence: liveWeather?.isLive ? 'Forecast + Modeled' : 'Scenario-based estimate',
    },
    {
      id: 'soil_incompatibility',
      name: 'Soil Incompatibility',
      level: profile.soilType === 'Unknown soil' ? 'Moderate' : isSoilMatch ? 'Low' : 'High',
      cause: profile.soilType === 'Unknown soil' ? 'Soil type not confirmed by lab test.' : `${profile.soilType} vs ${crop.name} preference.`,
      contributingInputs: `Soil: ${profile.soilType} (${profile.soilDataSource})`,
      impact: 'Suboptimal root development or micronutrient lockup.',
      mitigation: 'Test soil pH and incorporate compost/organic matter.',
      confidence: profile.soilDataSource === 'Measured / Lab Tested' ? 'User lab input' : 'Unverified assumption',
    },
    {
      id: 'nutrient_deficiency',
      name: 'Nutrient Deficiency',
      level: sim.nutrientStatusPct < 35 ? 'High' : sim.nutrientStatusPct < 55 ? 'Moderate' : 'Low',
      cause: 'Crop uptake and leaching outpacing replenishment.',
      contributingInputs: `Modeled nutrient status ${Math.round(sim.nutrientStatusPct)}%`,
      impact: 'Reduced leaf canopy and lower fruit/grain fill.',
      mitigation: 'Schedule balanced fertilizer or biofertilizer top-dressing.',
      confidence: 'Modeled estimate',
    },
    {
      id: 'pest_susceptibility',
      name: 'Pest Susceptibility',
      level: sim.pestPressurePct > 55 ? 'High' : sim.pestPressurePct > 30 ? 'Moderate' : 'Low',
      cause: 'Warm/humid conditions and pest build-up over season.',
      contributingInputs: `Modeled pest pressure ${Math.round(sim.pestPressurePct)}%`,
      impact: 'Foliage or fruit damage.',
      mitigation: 'Use yellow sticky traps, neem/biocontrol, and regular scouting.',
      confidence: 'Modeled estimate (not a diagnosis)',
    },
    {
      id: 'disease_susceptibility',
      name: 'Disease Susceptibility',
      level: excessiveRainLevel === 'High' || sim.soilMoisturePct > 82 ? 'High' : sim.pestPressurePct > 35 ? 'Moderate' : 'Low',
      cause: 'High humidity and prolonged leaf wetness.',
      contributingInputs: `Crop risks: ${crop.keyRisks[0] || 'Fungal/viral pressure'}`,
      impact: 'Potential canopy blight or wilt.',
      mitigation: 'Ensure spacing/airflow and avoid overhead irrigation in evenings.',
      confidence: 'Illustrative advisory (not a clinical diagnosis)',
    },
    {
      id: 'labour_shortage',
      name: 'Labour Shortage',
      level:
        profile.availableLabour === 'Low' && crop.labourNeed === 'High' && sim.labourBoostDays <= 0
          ? 'High'
          : profile.availableLabour === 'Low'
            ? 'Moderate'
            : 'Low',
      cause: 'High seasonal picking/weeding demand vs available labour.',
      contributingInputs: `Crop labour need: ${crop.labourNeed}, Farm labour: ${profile.availableLabour}`,
      impact: 'Delayed weeding or harvesting.',
      mitigation: 'Plan crew hiring ahead of flowering and harvest peaks.',
      confidence: 'User profile input',
    },
    {
      id: 'budget_shortage',
      name: 'Budget Shortage',
      level:
        financial.remainingBudgetInr < 0
          ? 'High'
          : financial.remainingBudgetInr < financial.totalInvestmentInr * 0.12
            ? 'Moderate'
            : 'Low',
      cause: 'Projected cultivation expenditure exceeds available budget.',
      contributingInputs: `Budget ₹${profile.budgetInr.toLocaleString('en-IN')} vs Est. ₹${financial.totalInvestmentInr.toLocaleString('en-IN')}`,
      impact: 'Inability to fund critical mid-season inputs.',
      mitigation: 'Compare lower-investment crops or phase input purchases.',
      confidence: 'Deterministic calculation',
    },
    {
      id: 'market_price_uncertainty',
      name: 'Market Price Uncertainty',
      level: crop.perishability === 'High' ? 'High' : crop.perishability === 'Moderate' ? 'Moderate' : 'Low',
      cause: 'Perishable crops face sharp mandi price swings at harvest.',
      contributingInputs: `Perishability: ${crop.perishability}`,
      impact: 'Lower net profit if selling price drops below break-even.',
      mitigation: 'Use Market Intelligence to compare mandis and buyer offers.',
      confidence: 'Illustrative market assumption',
    },
    {
      id: 'harvest_delays',
      name: 'Harvest Delays',
      level: sim.scenario === 'cold_stress' || sim.weatherStressPct > 55 ? 'Moderate' : 'Low',
      cause: 'Stress slows crop maturity progression.',
      contributingInputs: `Weather stress ${sim.weatherStressPct}%`,
      impact: 'Shifted market arrival window.',
      mitigation: 'Monitor maturity indicators rather than calendar days alone.',
      confidence: 'Modeled estimate',
    },
    {
      id: 'harvest_weather_risk',
      name: 'Harvest-Time Weather Risks',
      level:
        sim.growthPct >= 75 &&
        (sim.scenario === 'unseasonal_rain' || sim.scenario === 'excessive_rain' || sim.scenario === 'strong_winds')
          ? 'High'
          : sim.growthPct >= 75
            ? 'Moderate'
            : 'Low',
      cause: 'Rain or high winds near crop maturity.',
      contributingInputs: `Growth ${Math.round(sim.growthPct)}%, Scenario: ${sim.scenario}`,
      impact: 'Spoilage, lodging, and post-harvest quality loss.',
      mitigation: 'Harvest during dry windows; never work in fields during storms/lightning.',
      confidence: sim.growthPct >= 85 && liveWeather?.isLive ? 'Live forecast overlap' : 'Simulated warning',
    },
  ];

  const nearHarvest = sim.growthPct >= 75;
  const remainingDays = Math.max(0, sim.totalDays - sim.currentDay);
  const forecastOverlap = Boolean(nearHarvest && remainingDays <= 7 && liveWeather?.isLive);
  const badWeatherNow =
    sim.scenario === 'unseasonal_rain' ||
    sim.scenario === 'excessive_rain' ||
    sim.scenario === 'strong_winds' ||
    (forecastOverlap && (liveWeather?.rainfallMm ?? 0) > 5);

  const harvestWarning = {
    active: nearHarvest && badWeatherNow,
    sourceLabel: forecastOverlap ? 'Forecast-Based Warning (7-Day Overlap)' : 'Simulated Scenario Warning',
    message:
      nearHarvest && badWeatherNow
        ? 'Wet or windy conditions near harvest can cause spoilage and lodging. Prioritize safe dry-window harvesting and cover harvested produce. Do not work outdoors during severe storms.'
        : nearHarvest
          ? 'Crop is approaching harvest window. Monitor local 7-day forecast before scheduling picking and transport.'
          : 'No immediate harvest-window weather alert.',
  };

  return { risks, harvestWarning };
}

export function buildDefaultFinancialInputs(
  crop: CropCatalogItem,
  areaAcres: number
): DetailedFinancialInputs {
  const safeArea = Math.max(0.05, areaAcres);
  const baseOther = crop.illustrativeOtherInputCostPerAcre * safeArea;
  return {
    landPreparationInr: Math.round(baseOther * 0.12),
    seedQtyPerAcreKg: crop.seedRateKgPerAcre,
    seedPricePerKgInr: crop.illustrativeSeedPricePerKg,
    fertilizerInr: Math.round(baseOther * 0.2),
    irrigationInr: Math.round(baseOther * 0.1),
    labourInr: Math.round(baseOther * 0.24),
    machineryInr: Math.round(baseOther * 0.08),
    pestManagementInr: Math.round(baseOther * 0.1),
    electricityFuelInr: Math.round(baseOther * 0.04),
    harvestingInr: Math.round(baseOther * 0.06),
    packagingInr: Math.round(baseOther * 0.03),
    transportationInr: Math.round(baseOther * 0.03),
    otherInr: 0,
    expectedYieldPerAcreKg: crop.illustrativeYieldKgPerAcre,
    expectedSellingPricePerKgInr: crop.illustrativePricePerKg,
  };
}

export function calculateDetailedFinancials(
  inputs: DetailedFinancialInputs,
  areaAcres: number,
  availableBudgetInr: number
): FinancialSummary {
  const safeArea = Math.max(0, Number.isFinite(areaAcres) ? areaAcres : 0);
  const safeNum = (v: number) => (Number.isFinite(v) && v >= 0 ? v : 0);

  const totalSeedKg = Number((safeArea * safeNum(inputs.seedQtyPerAcreKg)).toFixed(2));
  const totalSeedCostInr = Math.round(totalSeedKg * safeNum(inputs.seedPricePerKgInr));

  const nonSeedCostsInr = Math.round(
    safeNum(inputs.landPreparationInr) +
      safeNum(inputs.fertilizerInr) +
      safeNum(inputs.irrigationInr) +
      safeNum(inputs.labourInr) +
      safeNum(inputs.machineryInr) +
      safeNum(inputs.pestManagementInr) +
      safeNum(inputs.electricityFuelInr) +
      safeNum(inputs.harvestingInr) +
      safeNum(inputs.packagingInr) +
      safeNum(inputs.transportationInr) +
      safeNum(inputs.otherInr)
  );

  const totalInvestmentInr = totalSeedCostInr + nonSeedCostsInr;
  const investmentPerAcreInr = safeArea > 0 ? Math.round(totalInvestmentInr / safeArea) : 0;
  const remainingBudgetInr = Math.round(safeNum(availableBudgetInr) - totalInvestmentInr);

  const expectedProductionKg = Math.round(safeArea * safeNum(inputs.expectedYieldPerAcreKg));
  const grossRevenueInr = Math.round(expectedProductionKg * safeNum(inputs.expectedSellingPricePerKgInr));
  const netProfitInr = grossRevenueInr - totalInvestmentInr;
  const roiPct = totalInvestmentInr > 0 ? Number(((netProfitInr / totalInvestmentInr) * 100).toFixed(1)) : 0;
  const breakEvenSellingPricePerKg =
    expectedProductionKg > 0 ? Number((totalInvestmentInr / expectedProductionKg).toFixed(2)) : 0;

  return {
    areaAcres: Number(safeArea.toFixed(4)),
    totalSeedKg,
    totalSeedCostInr,
    nonSeedCostsInr,
    totalInvestmentInr,
    investmentPerAcreInr,
    remainingBudgetInr,
    expectedProductionKg,
    grossRevenueInr,
    netProfitInr,
    roiPct,
    breakEvenSellingPricePerKg,
    cultivationCostPerKg: breakEvenSellingPricePerKg,
  };
}

export interface CropPlanComparisonRow {
  cropId: string;
  cropName: string;
  durationDays: number;
  seedRequirementKg: number;
  waterRequirementMm: number;
  labourNeed: string;
  totalInvestmentInr: number;
  expectedProductionKg: number;
  estimatedRevenueInr: number;
  estimatedProfitInr: number;
  roiPct: number;
  breakEvenPricePerKg: number;
  keyRisks: string;
}

export function buildCropPlanComparison(
  crops: CropCatalogItem[],
  areaAcres: number,
  budgetInr: number
): CropPlanComparisonRow[] {
  return crops.slice(0, 3).map((crop) => {
    const defaults = buildDefaultFinancialInputs(crop, areaAcres);
    const fin = calculateDetailedFinancials(defaults, areaAcres, budgetInr);
    return {
      cropId: crop.id,
      cropName: crop.name,
      durationDays: crop.durationDays,
      seedRequirementKg: fin.totalSeedKg,
      waterRequirementMm: crop.waterRequirementMm,
      labourNeed: crop.labourNeed,
      totalInvestmentInr: fin.totalInvestmentInr,
      expectedProductionKg: fin.expectedProductionKg,
      estimatedRevenueInr: fin.grossRevenueInr,
      estimatedProfitInr: fin.netProfitInr,
      roiPct: fin.roiPct,
      breakEvenPricePerKg: fin.breakEvenSellingPricePerKg,
      keyRisks: crop.keyRisks.slice(0, 2).join('; '),
    };
  });
}

export interface WhatIfScenarioAdjustments {
  name: 'Unfavourable' | 'Expected' | 'Favourable';
  yieldFactor: number;
  priceFactor: number;
  irrigationFactor: number;
  labourFactor: number;
  fertilizerFactor: number;
  transportFactor: number;
}

export interface WhatIfResult {
  name: 'Unfavourable' | 'Expected' | 'Favourable';
  adjustedInvestmentInr: number;
  adjustedProductionKg: number;
  adjustedRevenueInr: number;
  adjustedProfitInr: number;
}

export function calculateWhatIfScenarios(
  baseInputs: DetailedFinancialInputs,
  areaAcres: number,
  budgetInr: number,
  scenarios: WhatIfScenarioAdjustments[]
): WhatIfResult[] {
  return scenarios.map((sc) => {
    const modified: DetailedFinancialInputs = {
      ...baseInputs,
      irrigationInr: Math.round(baseInputs.irrigationInr * sc.irrigationFactor),
      labourInr: Math.round(baseInputs.labourInr * sc.labourFactor),
      fertilizerInr: Math.round(baseInputs.fertilizerInr * sc.fertilizerFactor),
      transportationInr: Math.round(baseInputs.transportationInr * sc.transportFactor),
      expectedYieldPerAcreKg: Number((baseInputs.expectedYieldPerAcreKg * sc.yieldFactor).toFixed(1)),
      expectedSellingPricePerKgInr: Number((baseInputs.expectedSellingPricePerKgInr * sc.priceFactor).toFixed(2)),
    };
    const fin = calculateDetailedFinancials(modified, areaAcres, budgetInr);
    return {
      name: sc.name,
      adjustedInvestmentInr: fin.totalInvestmentInr,
      adjustedProductionKg: fin.expectedProductionKg,
      adjustedRevenueInr: fin.grossRevenueInr,
      adjustedProfitInr: fin.netProfitInr,
    };
  });
}

export const DEFAULT_WHAT_IF_SCENARIOS: WhatIfScenarioAdjustments[] = [
  {
    name: 'Unfavourable',
    yieldFactor: 0.78,
    priceFactor: 0.82,
    irrigationFactor: 1.25,
    labourFactor: 1.15,
    fertilizerFactor: 1.1,
    transportFactor: 1.15,
  },
  {
    name: 'Expected',
    yieldFactor: 1.0,
    priceFactor: 1.0,
    irrigationFactor: 1.0,
    labourFactor: 1.0,
    fertilizerFactor: 1.0,
    transportFactor: 1.0,
  },
  {
    name: 'Favourable',
    yieldFactor: 1.18,
    priceFactor: 1.15,
    irrigationFactor: 0.9,
    labourFactor: 0.95,
    fertilizerFactor: 0.95,
    transportFactor: 0.95,
  },
];
