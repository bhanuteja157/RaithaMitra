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
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { getIntlLocale, localizeCondition, localizeCropName } from '@/lib/translations';
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

function DynamicLoadingBox({ kind }: { kind: 'map' | 'timelapse' }) {
  const { language } = useFarm();
  const text =
    kind === 'map'
      ? language === 'kn'
        ? 'ಸಂವಾದಾತ್ಮಕ ಜಮೀನು ನಕ್ಷೆ ಲೋಡ್ ಆಗುತ್ತಿದೆ...'
        : language === 'hi'
          ? 'इंटरैक्टिव खेत नक्शा लोड हो रहा है...'
          : language === 'te'
            ? 'ఇంటరాక్టివ్ పొలం మ్యాప్ లోడ్ అవుతోంది...'
            : 'Loading interactive geospatial map...'
      : language === 'kn'
        ? 'ಉಪಗ್ರಹ ಟೈಮ್-ಲ್ಯಾಪ್ಸ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ...'
        : language === 'hi'
          ? 'उपग्रह टाइम-लैप्स लोड हो रहा है...'
          : language === 'te'
            ? 'ఉపగ్రహ టైమ్-లాప్స్ లోడ్ అవుతోంది...'
            : 'Loading satellite time-lapse simulator...';

  return (
    <div
      className={`h-96 rounded-2xl border border-zinc-200 flex items-center justify-center text-sm ${
        kind === 'map' ? 'bg-zinc-50 text-zinc-500' : 'bg-zinc-900 text-zinc-300'
      }`}
    >
      {text}
    </div>
  );
}

const GeospatialFarmMap = dynamic(() => import('./GeospatialFarmMap'), {
  ssr: false,
  loading: () => <DynamicLoadingBox kind="map" />,
});

const SatelliteCropTimeLapse = dynamic(() => import('./SatelliteCropTimeLapse'), {
  ssr: false,
  loading: () => <DynamicLoadingBox kind="timelapse" />,
});

const CropDigitalTwin3D = dynamic(
  () => import('./CropDigitalTwin3D').then((m) => m.CropDigitalTwin3D),
  { ssr: false }
);

const RealSatelliteMonitorPanel = dynamic(
  () => import('./RealSatelliteMonitorPanel').then((m) => m.RealSatelliteMonitorPanel),
  { ssr: false }
);

const MaizeAgronomyCard = dynamic(
  () => import('./MaizeAgronomyCard').then((m) => m.MaizeAgronomyCard),
  { ssr: false }
);

type ActiveStep = 'map' | 'profile' | 'crops' | 'simulator' | 'finance';
type DigitalTwinViewTab = 'live_sat' | 'sat_timelapse' | 'twin_3d' | 'closeup_3d';

const DF_WS_I18N: Record<
  Language,
  {
    headerBrand: string;
    farmLabel: string;
    areaLabel: string;
    acresUnit: string;
    cropLabel: string;
    daysShort: string;
    budgetLabel: string;
    profileTitle: string;
    profileNote: string;
    mappedArea: string;
    soilTypeLabel: string;
    soilSourceLabel: string;
    soilPhLabel: string;
    phPlaceholder: string;
    irrigationAvailLabel: string;
    irrigationYes: string;
    irrigationNo: string;
    irrigationMethodLabel: string;
    waterSourceQtyLabel: string;
    budgetInrLabel: string;
    expectedSowingLabel: string;
    labourExpLabel: string;
    prevCropLabel: string;
    prevCropPh: string;
    existingProblemsLabel: string;
    existingProblemsPh: string;
    continueAdvisor: string;
    recommendModeBtn: string;
    manualCropBtn: string;
    rankByLabel: string;
    sortSuitability: string;
    sortMaxProfit: string;
    sortMinInvest: string;
    sortMinWater: string;
    sortLowRisk: string;
    sortShortDuration: string;
    prototypeScaleNotePrefix: string;
    prototypeScaleNoteSuffix: string;
    perennial: string;
    seasonal: string;
    duration: string;
    daysWord: string;
    waterNeed: string;
    estInvest: string;
    estProfit: string;
    expectedYield: string;
    modeledRisk: string;
    risksLabel: string;
    dataCompleteness: string;
    startDigitalFarming: string;
    activeCropLabel: string;
    mappedFieldLabel: string;
    sowingShort: string;
    tabLiveSat: string;
    tabSatTimelapse: string;
    tabTwin3d: string;
    tabCloseup3d: string;
    tabAnalytics: string;
    playGrowth: string;
    plus5Days: string;
    resetBtn: string;
    dayLabel: string;
    harvestColon: string;
    virtualMgmtTitle: string;
    virtualMgmtNote: string;
    harvestSummaryTitle: string;
    cropReadyTitle: string;
    farmCareBtn: string;
    hireLabourBtn: string;
    draftListingBtn: string;
    projectedYield: string;
    totalEstExpenses: string;
    estRevProfit: string;
    estHarvestDate: string;
    simHealthTitle: string;
    modeledEstimatesBadge: string;
    healthBarCrop: string;
    healthBarGrowth: string;
    healthBarMoisture: string;
    healthBarWater: string;
    healthBarNutrient: string;
    healthBarStress: string;
    healthBarPest: string;
    remainingDaysLabel: string;
    activitySpendLabel: string;
    weatherControlTitle: string;
    loading: string;
    tempLabel: string;
    rainLabel: string;
    humidityLabel: string;
    windLabel: string;
    et0Label: string;
    updatedLabel: string;
    weatherOfflineMsg: string;
    simWeatherLabel: string;
    scenarioIntensityLabel: string;
    riskGridTitle: string;
    riskGridNote: string;
    inputsColon: string;
    mitigationColon: string;
    finIntelTitle: string;
    finIntelSubPrefix: string;
    finIntelSubSuffix: string;
    finFieldLabels: Record<keyof DetailedFinancialInputs, string>;
    totalSeedNeeded: string;
    totalInvestKpi: string;
    perAcShort: string;
    grossRevKpi: string;
    estNetProfitKpi: string;
    breakEvenKpi: string;
    remainingBudgetKpi: string;
    compareTitle: string;
    planWord: string;
    goalHighestProfit: string;
    goalLowestInvest: string;
    goalLowestWater: string;
    strongestOption: string;
    estProfitInline: string;
    investInline: string;
    waterInline: string;
    colCrop: string;
    colDuration: string;
    colWater: string;
    colInvest: string;
    colYield: string;
    colRevenue: string;
    colEstProfit: string;
    colBreakEven: string;
    colKeyRisks: string;
    chartInvestName: string;
    chartProfitName: string;
    whatIfTitle: string;
    conditionsSuffix: string;
    yieldFactorLabel: string;
    priceFactorLabel: string;
    whatIfInvest: string;
    whatIfRevenue: string;
    whatIfProfit: string;
    reportTitle: string;
    analysisDate: string;
    rep1Title: string;
    rep2Title: string;
    rep3Title: string;
    rep4Title: string;
    noHighRisks: string;
    altPlansCompared: string;
    dataSourcesFooterTitle: string;
    dataSourcesFooterBody: string;
    soilTypes: Record<SoilType, string>;
    soilSources: Record<DigitalFarmProfile['soilDataSource'], string>;
    irrigationTypes: Record<IrrigationType, string>;
    waterSources: Record<string, string>;
    waterLevels: Record<string, string>;
    labourLevels: Record<DigitalFarmProfile['availableLabour'], string>;
    experienceLevels: Record<DigitalFarmProfile['farmingExperience'], string>;
    weatherScenarios: Record<WeatherScenarioType, string>;
    activities: Record<VirtualActivityType, string>;
    riskLevels: Record<'Low' | 'Moderate' | 'High', string>;
    whatIfNames: Record<string, string>;
    riskNames: Record<string, string>;
    warnForecastLabel: string;
    warnSimLabel: string;
    warnBadWeather: string;
    warnNearHarvest: string;
    warnNone: string;
  }
> = {
  en: {
    headerBrand: 'RaithaMitra · Digital Farming & Geospatial Intelligence',
    farmLabel: 'Farm:',
    areaLabel: 'Area:',
    acresUnit: 'acres',
    cropLabel: 'Crop:',
    daysShort: 'd',
    budgetLabel: 'Budget:',
    profileTitle: 'Digital Farm Profile',
    profileNote: 'Soil properties are never guessed from coordinates alone. Enter your known or estimated values below.',
    mappedArea: 'Mapped Area:',
    soilTypeLabel: 'Soil Type',
    soilSourceLabel: 'Soil Data Source',
    soilPhLabel: 'Soil pH (if known)',
    phPlaceholder: 'e.g. 6.5',
    irrigationAvailLabel: 'Irrigation Availability',
    irrigationYes: 'Irrigation Available',
    irrigationNo: 'Rainfed Only (No Irrigation)',
    irrigationMethodLabel: 'Irrigation Method',
    waterSourceQtyLabel: 'Water Source & Quantity',
    budgetInrLabel: 'Cultivation Budget (₹ INR)',
    expectedSowingLabel: 'Expected Sowing Date',
    labourExpLabel: 'Available Labour & Experience',
    prevCropLabel: 'Previous Crop',
    prevCropPh: 'e.g., Ragi, Maize, Fallow',
    existingProblemsLabel: 'Existing Agricultural Problems (Optional)',
    existingProblemsPh: 'e.g., Wilt history, waterlogging in low corner, labour shortage',
    continueAdvisor: 'Continue to Crop Advisor',
    recommendModeBtn: 'Recommend What to Grow (20 Crops)',
    manualCropBtn: 'I Already Know My Crop',
    rankByLabel: 'Rank by:',
    sortSuitability: 'Overall Suitability Score',
    sortMaxProfit: 'Maximum Estimated Profit',
    sortMinInvest: 'Minimum Investment',
    sortMinWater: 'Minimum Water Requirement',
    sortLowRisk: 'Lower Modeled Risk',
    sortShortDuration: 'Shorter Cultivation Duration',
    prototypeScaleNotePrefix: 'Note: Financial and yield figures below use clearly labelled illustrative prototype parameters scaled to your',
    prototypeScaleNoteSuffix: 'acre mapped boundary.',
    perennial: 'Perennial',
    seasonal: 'Seasonal',
    duration: 'Duration',
    daysWord: 'days',
    waterNeed: 'Water Need',
    estInvest: 'Est. Investment',
    estProfit: 'Est. Profit',
    expectedYield: 'Expected Yield',
    modeledRisk: 'Modeled Risk',
    risksLabel: 'Risks:',
    dataCompleteness: 'Data completeness:',
    startDigitalFarming: 'Start Digital Farming',
    activeCropLabel: 'Active Crop:',
    mappedFieldLabel: 'Mapped Field:',
    sowingShort: 'Sowing:',
    tabLiveSat: '1. Live Monitoring (Observed)',
    tabSatTimelapse: '2. Satellite Time-Lapse',
    tabTwin3d: '3. 3D Satellite Digital Twin',
    tabCloseup3d: '4. Seed-to-Harvest Close-Up',
    tabAnalytics: '5. Crop Health & Map',
    playGrowth: 'Play Growth',
    plus5Days: '+5 Days',
    resetBtn: 'Reset',
    dayLabel: 'Day',
    harvestColon: 'Harvest:',
    virtualMgmtTitle: 'Virtual Agricultural Management',
    virtualMgmtNote: 'Virtual actions only — never creates real bookings or job posts',
    harvestSummaryTitle: 'Digital Harvest Summary',
    cropReadyTitle: 'Crop Ready for Harvest',
    farmCareBtn: 'Farm Care',
    hireLabourBtn: 'Hire Harvest Labour',
    draftListingBtn: 'Draft Produce Listing',
    projectedYield: 'Projected Yield',
    totalEstExpenses: 'Total Est. Expenses',
    estRevProfit: 'Est. Revenue / Profit',
    estHarvestDate: 'Est. Harvest Date',
    simHealthTitle: 'Simulated Farm Health',
    modeledEstimatesBadge: 'Modeled estimates',
    healthBarCrop: 'Modeled Crop Health',
    healthBarGrowth: 'Growth Progress',
    healthBarMoisture: 'Est. Soil Moisture',
    healthBarWater: 'Water Availability',
    healthBarNutrient: 'Nutrient Status',
    healthBarStress: 'Weather Stress',
    healthBarPest: 'Pest Risk Pressure',
    remainingDaysLabel: 'Remaining Days',
    activitySpendLabel: 'Activity Spend',
    weatherControlTitle: 'Weather & Scenario Control',
    loading: 'Loading...',
    tempLabel: 'Temp:',
    rainLabel: 'Rain:',
    humidityLabel: 'Humidity:',
    windLabel: 'Wind:',
    et0Label: 'ET0:',
    updatedLabel: 'Updated',
    weatherOfflineMsg: 'Live weather API unreachable; use simulated weather scenarios below.',
    simWeatherLabel: 'Simulated Weather Scenario (Illustrative):',
    scenarioIntensityLabel: 'Scenario Intensity',
    riskGridTitle: 'Agricultural Risk Intelligence (14 Modeled Risk Factors)',
    riskGridNote: 'Modeled risk guidance only — does not diagnose actual field diseases.',
    inputsColon: 'Inputs:',
    mitigationColon: 'Mitigation:',
    finIntelTitle: 'Agricultural Financial Intelligence',
    finIntelSubPrefix: 'Scaled to mapped area (',
    finIntelSubSuffix: '). Edit any assumption below; profits are projections, not guarantees.',
    finFieldLabels: {
      landPreparationInr: 'Land Prep (Total ₹)',
      seedQtyPerAcreKg: 'Seed Qty / Acre (kg)',
      seedPricePerKgInr: 'Seed Price / kg (₹)',
      fertilizerInr: 'Fertilizer (Total ₹)',
      irrigationInr: 'Irrigation (Total ₹)',
      labourInr: 'Labour (Total ₹)',
      machineryInr: 'Machinery (Total ₹)',
      pestManagementInr: 'Pest Mgmt (Total ₹)',
      electricityFuelInr: 'Fuel / Power (Total ₹)',
      harvestingInr: 'Harvesting (Total ₹)',
      packagingInr: 'Packaging (Total ₹)',
      transportationInr: 'Transport (Total ₹)',
      otherInr: 'Other Costs (Total ₹)',
      expectedYieldPerAcreKg: 'Expected Yield/Acre (kg)',
      expectedSellingPricePerKgInr: 'Expected Price/kg (₹)',
    },
    totalSeedNeeded: 'Total Seed Needed',
    totalInvestKpi: 'Total Investment',
    perAcShort: '/ac',
    grossRevKpi: 'Gross Revenue',
    estNetProfitKpi: 'Est. Net Profit',
    breakEvenKpi: 'Break-Even Price',
    remainingBudgetKpi: 'Remaining Budget',
    compareTitle: 'Multiple Crop Comparison',
    planWord: 'Plan',
    goalHighestProfit: 'Goal: Highest Profit',
    goalLowestInvest: 'Goal: Lowest Investment',
    goalLowestWater: 'Goal: Lowest Water Need',
    strongestOption: 'Strongest Option',
    estProfitInline: 'Est. Profit',
    investInline: 'Investment',
    waterInline: 'Water',
    colCrop: 'Crop',
    colDuration: 'Duration',
    colWater: 'Water',
    colInvest: 'Investment',
    colYield: 'Yield',
    colRevenue: 'Revenue',
    colEstProfit: 'Est. Profit',
    colBreakEven: 'Break-Even',
    colKeyRisks: 'Key Risks',
    chartInvestName: 'Investment (₹)',
    chartProfitName: 'Est. Profit (₹)',
    whatIfTitle: 'What-If Scenario Engine (Editable Assumptions, No Statistical Probabilities Claimed)',
    conditionsSuffix: 'Conditions',
    yieldFactorLabel: 'Yield Factor',
    priceFactorLabel: 'Price Factor',
    whatIfInvest: 'Investment:',
    whatIfRevenue: 'Revenue:',
    whatIfProfit: 'Projected Profit:',
    reportTitle: 'Agricultural Decision & Printable Farmer Report',
    analysisDate: 'Analysis Date:',
    rep1Title: '1. Selected Crop & Land:',
    rep2Title: '2. Money & Water Required:',
    rep3Title: '3. Production & Profit Projection:',
    rep4Title: '4. Major Risks & Alternatives:',
    noHighRisks: 'No high risks flagged',
    altPlansCompared: 'Alternative plans compared:',
    dataSourcesFooterTitle: 'Data Sources, Assumptions & Limitations:',
    dataSourcesFooterBody:
      'Geospatial area is a WGS84 spherical geodesic estimate from user-drawn points (not a legal survey). Live weather uses Open-Meteo when reachable. Crop durations, yields, and prices are illustrative prototype estimates unless replaced by farmer-entered figures.',
    soilTypes: {
      'Red soil': 'Red soil',
      'Black soil': 'Black soil',
      'Sandy soil': 'Sandy soil',
      'Clay soil': 'Clay soil',
      'Loamy soil': 'Loamy soil',
      'Alluvial soil': 'Alluvial soil',
      'Unknown soil': 'Unknown soil',
    },
    soilSources: {
      'Measured / Lab Tested': 'Measured / Lab Tested',
      'Farmer Estimate': 'Farmer Estimate',
      Unknown: 'Unknown',
    },
    irrigationTypes: {
      Drip: 'Drip',
      Sprinkler: 'Sprinkler',
      'Flood / Canal': 'Flood / Canal',
      'Rainfed Only': 'Rainfed Only',
    },
    waterSources: {
      Borewell: 'Borewell',
      Canal: 'Canal',
      'Farm Pond': 'Farm Pond',
      Rainwater: 'Rainwater',
      River: 'River',
      Unknown: 'Unknown',
    },
    waterLevels: {
      Low: 'Low',
      Moderate: 'Moderate',
      Adequate: 'Adequate',
      Abundant: 'Abundant',
    },
    labourLevels: {
      Low: 'Low Labour',
      Moderate: 'Moderate Labour',
      Adequate: 'Adequate Labour',
    },
    experienceLevels: {
      Beginner: 'Beginner',
      Intermediate: 'Intermediate',
      Experienced: 'Experienced',
    },
    weatherScenarios: {
      normal: 'Normal Conditions',
      drought: 'Drought / Dry Spell',
      excessive_rain: 'Excessive Rainfall',
      heat_stress: 'Heat Stress',
      cold_stress: 'Cold Stress',
      strong_winds: 'Strong Winds',
      unseasonal_rain: 'Unseasonal Rainfall',
      reduced_irrigation: 'Reduced Irrigation Availability',
    },
    activities: {
      prepare_soil: 'Prepare Soil',
      sow_seeds: 'Sow Seeds',
      irrigate: 'Irrigate Field',
      apply_fertilizer: 'Apply Fertilizer',
      weeding: 'Perform Weeding',
      pest_management: 'Pest Management',
      hire_labour: 'Hire Virtual Labour',
      rent_machinery: 'Rent Machinery',
      harvest: 'Complete Harvest',
    },
    riskLevels: {
      Low: 'Low',
      Moderate: 'Moderate',
      High: 'High',
    },
    whatIfNames: {
      Unfavourable: 'Unfavourable',
      Expected: 'Expected',
      Favourable: 'Favourable',
    },
    riskNames: {
      water_shortage: 'Water Shortage',
      excessive_rainfall: 'Excessive Rainfall',
      waterlogging: 'Waterlogging',
      heat_stress: 'Heat Stress',
      cold_stress: 'Cold Stress',
      soil_incompatibility: 'Soil Incompatibility',
      nutrient_deficiency: 'Nutrient Deficiency',
      pest_susceptibility: 'Pest Susceptibility',
      disease_susceptibility: 'Disease Susceptibility',
      labour_shortage: 'Labour Shortage',
      budget_shortage: 'Budget Shortage',
      market_price_uncertainty: 'Market Price Uncertainty',
      harvest_delays: 'Harvest Delays',
      harvest_weather_risk: 'Harvest-Time Weather Risks',
    },
    warnForecastLabel: 'Forecast-Based Warning (7-Day Overlap)',
    warnSimLabel: 'Simulated Scenario Warning',
    warnBadWeather:
      'Wet or windy conditions near harvest can cause spoilage and lodging. Prioritize safe dry-window harvesting and cover harvested produce. Do not work outdoors during severe storms.',
    warnNearHarvest: 'Crop is approaching harvest window. Monitor local 7-day forecast before scheduling picking and transport.',
    warnNone: 'No immediate harvest-window weather alert.',
  },
  kn: {
    headerBrand: 'ರೈತ ಮಿತ್ರ · ಡಿಜಿಟಲ್ ಕೃಷಿ ಮತ್ತು ಭೌಗೋಳಿಕ ಬುದ್ಧಿಮತ್ತೆ',
    farmLabel: 'ಜಮೀನು:',
    areaLabel: 'ವಿಸ್ತೀರ್ಣ:',
    acresUnit: 'ಎಕರೆ',
    cropLabel: 'ಬೆಳೆ:',
    daysShort: 'ದಿನ',
    budgetLabel: 'ಬಜೆಟ್:',
    profileTitle: 'ಡಿಜಿಟಲ್ ಜಮೀನು ವಿವರ',
    profileNote: 'ಮಣ್ಣಿನ ಗುಣಗಳನ್ನು ಕೇವಲ ನಿರ್ದೇಶಾಂಕಗಳಿಂದ ಊಹಿಸಲಾಗುವುದಿಲ್ಲ. ದಯವಿಟ್ಟು ತಿಳಿದಿರುವ ಅಥವಾ ಅಂದಾಜು ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ.',
    mappedArea: 'ಗುರುತಿಸಿದ ವಿಸ್ತೀರ್ಣ:',
    soilTypeLabel: 'ಮಣ್ಣಿನ ವಿಧ',
    soilSourceLabel: 'ಮಣ್ಣು ದತ್ತಾಂಶ ಮೂಲ',
    soilPhLabel: 'ಮಣ್ಣಿನ pH (ತಿಳಿದಿದ್ದರೆ)',
    phPlaceholder: 'ಉದಾ. 6.5',
    irrigationAvailLabel: 'ನೀರಾವರಿ ಲಭ್ಯತೆ',
    irrigationYes: 'ನೀರಾವರಿ ಲಭ್ಯವಿದೆ',
    irrigationNo: 'ಮಳೆಯಾಶ್ರಿತ ಮಾತ್ರ (ನೀರಾವರಿ ಇಲ್ಲ)',
    irrigationMethodLabel: 'ನೀರಾವರಿ ವಿಧಾನ',
    waterSourceQtyLabel: 'ನೀರಿನ ಮೂಲ ಮತ್ತು ಪ್ರಮಾಣ',
    budgetInrLabel: 'ಸಾಗುವಳಿ ಬಜೆಟ್ (₹ INR)',
    expectedSowingLabel: 'ನಿರೀಕ್ಷಿತ ಬಿತ್ತನೆ ದಿನಾಂಕ',
    labourExpLabel: 'ಲಭ್ಯವಿರುವ ಕಾರ್ಮಿಕರು ಮತ್ತು ಅನುಭವ',
    prevCropLabel: 'ಹಿಂದಿನ ಬೆಳೆ',
    prevCropPh: 'ಉದಾ. ರಾಗಿ, ಮೆಕ್ಕೆಜೋಳ, ಪಾಳು',
    existingProblemsLabel: 'ಪ್ರಸ್ತುತ ಕೃಷಿ ಸಮಸ್ಯೆಗಳು (ಐಚ್ಛಿಕ)',
    existingProblemsPh: 'ಉದಾ. ಸೊರಗು ರೋಗದ ಇತಿಹಾಸ, ನೀರು ನಿಲ್ಲುವಿಕೆ, ಕಾರ್ಮಿಕರ ಕೊರತೆ',
    continueAdvisor: 'ಬೆಳೆ ಸಲಹೆಗಾರರಿಗೆ ಮುಂದುವರಿಯಿರಿ',
    recommendModeBtn: 'ಏನು ಬೆಳೆಯಬೇಕೆಂದು ಶಿಫಾರಸು ಮಾಡಿ (20 ಬೆಳೆಗಳು)',
    manualCropBtn: 'ನನಗೆ ಈಗಾಗಲೇ ನನ್ನ ಬೆಳೆ ತಿಳಿದಿದೆ',
    rankByLabel: 'ಶ್ರೇಣೀಕರಣ:',
    sortSuitability: 'ಒಟ್ಟಾರೆ ಸೂಕ್ತತೆ ಅಂಕ',
    sortMaxProfit: 'ಗರಿಷ್ಠ ಅಂದಾಜು ಲಾಭ',
    sortMinInvest: 'ಕನಿಷ್ಠ ಹೂಡಿಕೆ',
    sortMinWater: 'ಕನಿಷ್ಠ ನೀರಿನ ಅಗತ್ಯ',
    sortLowRisk: 'ಕಡಿಮೆ ಅಂದಾಜು ಅಪಾಯ',
    sortShortDuration: 'ಕಡಿಮೆ ಸಾಗುವಳಿ ಅವಧಿ',
    prototypeScaleNotePrefix: 'ಗಮನಿಸಿ: ಕೆಳಗಿನ ಆರ್ಥಿಕ ಮತ್ತು ಇಳುವರಿ ಅಂಕಿಅಂಶಗಳು ನಿಮ್ಮ',
    prototypeScaleNoteSuffix: 'ಎಕರೆ ಗುರುತಿಸಿದ ಜಮೀನಿಗೆ ಅನ್ವಯಿಸಲಾದ ಮಾದರಿ ಅಂದಾಜುಗಳಾಗಿವೆ.',
    perennial: 'ಬಹುವಾರ್ಷಿಕ',
    seasonal: 'ಋತುಮಾನದ',
    duration: 'ಅವಧಿ',
    daysWord: 'ದಿನಗಳು',
    waterNeed: 'ನೀರಿನ ಅಗತ್ಯ',
    estInvest: 'ಅಂದಾಜು ಹೂಡಿಕೆ',
    estProfit: 'ಅಂದಾಜು ಲಾಭ',
    expectedYield: 'ನಿರೀಕ್ಷಿತ ಇಳುವರಿ',
    modeledRisk: 'ಮಾದರಿ ಅಪಾಯ',
    risksLabel: 'ಅಪಾಯಗಳು:',
    dataCompleteness: 'ದತ್ತಾಂಶ ಪೂರ್ಣತೆ:',
    startDigitalFarming: 'ಡಿಜಿಟಲ್ ಕೃಷಿ ಪ್ರಾರಂಭಿಸಿ',
    activeCropLabel: 'ಪ್ರಸ್ತುತ ಬೆಳೆ:',
    mappedFieldLabel: 'ಗುರುತಿಸಿದ ಹೊಲ:',
    sowingShort: 'ಬಿತ್ತನೆ:',
    tabLiveSat: '1. ನೇರ ಉಪಗ್ರಹ ನಿಗಾ (ಪರಿಶೀಲಿಸಿದ)',
    tabSatTimelapse: '2. ಉಪಗ್ರಹ ಟೈಮ್-ಲ್ಯಾಪ್ಸ್',
    tabTwin3d: '3. 3D ಉಪಗ್ರಹ ಡಿಜಿಟಲ್ ಟ್ವಿನ್',
    tabCloseup3d: '4. ಬೀಜದಿಂದ ಕೊಯ್ಲು ನೋಟ',
    tabAnalytics: '5. ಬೆಳೆ ಆರೋಗ್ಯ ಮತ್ತು ನಕ್ಷೆ',
    playGrowth: 'ಬೆಳವಣಿಗೆ ಚಾಲನೆ',
    plus5Days: '+5 ದಿನಗಳು',
    resetBtn: 'ಮರುಹೊಂದಿಸಿ',
    dayLabel: 'ದಿನ',
    harvestColon: 'ಕೊಯ್ಲು:',
    virtualMgmtTitle: 'ವರ್ಚುವಲ್ ಕೃಷಿ ನಿರ್ವಹಣೆ',
    virtualMgmtNote: 'ಕೇವಲ ಸಿಮ್ಯುಲೇಶನ್ ಕ್ರಿಯೆಗಳು — ಯಾವುದೇ ನೈಜ ಬುಕಿಂಗ್ ಮಾಡುವುದಿಲ್ಲ',
    harvestSummaryTitle: 'ಡಿಜಿಟಲ್ ಕೊಯ್ಲು ಸಾರಾಂಶ',
    cropReadyTitle: 'ಬೆಳೆ ಕೊಯ್ಲಿಗೆ ಸಿದ್ಧವಾಗಿದೆ',
    farmCareBtn: 'ಜಮೀನು ಆರೈಕೆ',
    hireLabourBtn: 'ಕೊಯ್ಲು ಕಾರ್ಮಿಕರನ್ನು ನೇಮಿಸಿ',
    draftListingBtn: 'ಮಾರಾಟ ಪಟ್ಟಿ ಕರಡು ಮಾಡಿ',
    projectedYield: 'ಅಂದಾಜು ಇಳುವರಿ',
    totalEstExpenses: 'ಒಟ್ಟು ಅಂದಾಜು ವೆಚ್ಚ',
    estRevProfit: 'ಅಂದಾಜು ಆದಾಯ / ಲಾಭ',
    estHarvestDate: 'ಅಂದಾಜು ಕೊಯ್ಲು ದಿನಾಂಕ',
    simHealthTitle: 'ಸಿಮ್ಯುಲೇಟೆಡ್ ಜಮೀನು ಆರೋಗ್ಯ',
    modeledEstimatesBadge: 'ಮಾದರಿ ಅಂದಾಜುಗಳು',
    healthBarCrop: 'ಬೆಳೆ ಆರೋಗ್ಯ (ಮಾದರಿ)',
    healthBarGrowth: 'ಬೆಳವಣಿಗೆ ಪ್ರಗತಿ',
    healthBarMoisture: 'ಅಂದಾಜು ಮಣ್ಣಿನ ತೇವಾಂಶ',
    healthBarWater: 'ನೀರಿನ ಲಭ್ಯತೆ',
    healthBarNutrient: 'ಪೋಷಕಾಂಶ ಸ್ಥಿತಿ',
    healthBarStress: 'ಹವಾಮಾನ ಒತ್ತಡ',
    healthBarPest: 'ಕೀಟ ಅಪಾಯದ ಒತ್ತಡ',
    remainingDaysLabel: 'ಉಳಿದ ದಿನಗಳು',
    activitySpendLabel: 'ಚಟುವಟಿಕೆ ವೆಚ್ಚ',
    weatherControlTitle: 'ಹವಾಮಾನ ಮತ್ತು ಸನ್ನಿವೇಶ ನಿಯಂತ್ರಣ',
    loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    tempLabel: 'ತಾಪಮಾನ:',
    rainLabel: 'ಮಳೆ:',
    humidityLabel: 'ಆರ್ದ್ರತೆ:',
    windLabel: 'ಗಾಳಿ:',
    et0Label: 'ET0:',
    updatedLabel: 'ನವೀಕರಿಸಲಾಗಿದೆ',
    weatherOfflineMsg: 'ನೇರ ಹವಾಮಾನ ಸೇವೆ ಲಭ್ಯವಿಲ್ಲ; ಕೆಳಗಿನ ಹವಾಮಾನ ಸನ್ನಿವೇಶಗಳನ್ನು ಬಳಸಿ.',
    simWeatherLabel: 'ಸಿಮ್ಯುಲೇಟೆಡ್ ಹವಾಮಾನ ಸನ್ನಿವೇಶ (ದೃಷ್ಟಾಂತ):',
    scenarioIntensityLabel: 'ಸನ್ನಿವೇಶದ ತೀವ್ರತೆ',
    riskGridTitle: 'ಕೃಷಿ ಅಪಾಯ ಬುದ್ಧಿಮತ್ತೆ (14 ಮಾದರಿ ಅಪಾಯ ಅಂಶಗಳು)',
    riskGridNote: 'ಕೇವಲ ಮಾದರಿ ಮಾರ್ಗದರ್ಶನ — ನೈಜ ಹೊಲದ ರೋಗ ಪತ್ತೆ ಅಲ್ಲ.',
    inputsColon: 'ಆಧಾರ:',
    mitigationColon: 'ಪರಿಹಾರ:',
    finIntelTitle: 'ಕೃಷಿ ಆರ್ಥಿಕ ಬುದ್ಧಿಮತ್ತೆ',
    finIntelSubPrefix: 'ಗುರುತಿಸಿದ ವಿಸ್ತೀರ್ಣಕ್ಕೆ ಅನ್ವಯ (',
    finIntelSubSuffix: '). ಕೆಳಗಿನ ಅಂದಾಜುಗಳನ್ನು ಬದಲಾಯಿಸಿ; ಲಾಭವು ಅಂದಾಜು ಮಾತ್ರ, ಖಾತರಿ ಅಲ್ಲ.',
    finFieldLabels: {
      landPreparationInr: 'ಭೂಮಿ ಸಿದ್ಧತೆ (ಒಟ್ಟು ₹)',
      seedQtyPerAcreKg: 'ಬೀಜ ಪ್ರಮಾಣ / ಎಕರೆ (ಕೆಜಿ)',
      seedPricePerKgInr: 'ಬೀಜ ಬೆಲೆ / ಕೆಜಿ (₹)',
      fertilizerInr: 'ಗೊಬ್ಬರ (ಒಟ್ಟು ₹)',
      irrigationInr: 'ನೀರಾವರಿ (ಒಟ್ಟು ₹)',
      labourInr: 'ಕಾರ್ಮಿಕ ವೆಚ್ಚ (ಒಟ್ಟು ₹)',
      machineryInr: 'ಯಂತ್ರೋಪಕರಣ (ಒಟ್ಟು ₹)',
      pestManagementInr: 'ಕೀಟ ನಿರ್ವಹಣೆ (ಒಟ್ಟು ₹)',
      electricityFuelInr: 'ವಿದ್ಯುತ್ / ಇಂಧನ (ಒಟ್ಟು ₹)',
      harvestingInr: 'ಕೊಯ್ಲು ವೆಚ್ಚ (ಒಟ್ಟು ₹)',
      packagingInr: 'ಪ್ಯಾಕೇಜಿಂಗ್ (ಒಟ್ಟು ₹)',
      transportationInr: 'ಸಾರಿಗೆ ವೆಚ್ಚ (ಒಟ್ಟು ₹)',
      otherInr: 'ಇತರೆ ವೆಚ್ಚ (ಒಟ್ಟು ₹)',
      expectedYieldPerAcreKg: 'ನಿರೀಕ್ಷಿತ ಇಳುವರಿ / ಎಕರೆ (ಕೆಜಿ)',
      expectedSellingPricePerKgInr: 'ನಿರೀಕ್ಷಿತ ಬೆಲೆ / ಕೆಜಿ (₹)',
    },
    totalSeedNeeded: 'ಒಟ್ಟು ಬೀಜದ ಅಗತ್ಯ',
    totalInvestKpi: 'ಒಟ್ಟು ಹೂಡಿಕೆ',
    perAcShort: '/ಎಕರೆ',
    grossRevKpi: 'ಒಟ್ಟು ಆದಾಯ',
    estNetProfitKpi: 'ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭ',
    breakEvenKpi: 'ಸಮತೋಲನ ಬೆಲೆ',
    remainingBudgetKpi: 'ಉಳಿದ ಬಜೆಟ್',
    compareTitle: 'ಬಹು ಬೆಳೆ ಹೋಲಿಕೆ',
    planWord: 'ಯೋಜನೆ',
    goalHighestProfit: 'ಗುರಿ: ಗರಿಷ್ಠ ಲಾಭ',
    goalLowestInvest: 'ಗುರಿ: ಕನಿಷ್ಠ ಹೂಡಿಕೆ',
    goalLowestWater: 'ಗುರಿ: ಕನಿಷ್ಠ ನೀರಿನ ಬಳಕೆ',
    strongestOption: 'ಬಲಿಷ್ಠ ಆಯ್ಕೆ',
    estProfitInline: 'ಅಂದಾಜು ಲಾಭ',
    investInline: 'ಹೂಡಿಕೆ',
    waterInline: 'ನೀರು',
    colCrop: 'ಬೆಳೆ',
    colDuration: 'ಅವಧಿ',
    colWater: 'ನೀರು',
    colInvest: 'ಹೂಡಿಕೆ',
    colYield: 'ಇಳುವರಿ',
    colRevenue: 'ಆದಾಯ',
    colEstProfit: 'ಅಂದಾಜು ಲಾಭ',
    colBreakEven: 'ಬ್ರೇಕ್-ಈವನ್',
    colKeyRisks: 'ಮುಖ್ಯ ಅಪಾಯಗಳು',
    chartInvestName: 'ಹೂಡಿಕೆ (₹)',
    chartProfitName: 'ಅಂದಾಜು ಲಾಭ (₹)',
    whatIfTitle: 'ಸಂಭಾವ್ಯ ಸನ್ನಿವೇಶ ಎಂಜಿನ್ (ಬದಲಾಯಿಸಬಹುದಾದ ಅಂದಾಜುಗಳು)',
    conditionsSuffix: 'ಪರಿಸ್ಥಿತಿ',
    yieldFactorLabel: 'ಇಳುವರಿ ಅಂಶ',
    priceFactorLabel: 'ಬೆಲೆ ಅಂಶ',
    whatIfInvest: 'ಹೂಡಿಕೆ:',
    whatIfRevenue: 'ಆದಾಯ:',
    whatIfProfit: 'ಅಂದಾಜು ಲಾಭ:',
    reportTitle: 'ಕೃಷಿ ನಿರ್ಧಾರ ಮತ್ತು ಮುದ್ರಿಸಬಹುದಾದ ರೈತ ವರದಿ',
    analysisDate: 'ವಿಶ್ಲೇಷಣಾ ದಿನಾಂಕ:',
    rep1Title: '1. ಆಯ್ಕೆಮಾಡಿದ ಬೆಳೆ ಮತ್ತು ಜಮೀನು:',
    rep2Title: '2. ಬೇಕಾದ ಹಣ ಮತ್ತು ನೀರು:',
    rep3Title: '3. ಉತ್ಪಾದನೆ ಮತ್ತು ಲಾಭ ಅಂದಾಜು:',
    rep4Title: '4. ಮುಖ್ಯ ಅಪಾಯಗಳು ಮತ್ತು ಪರ್ಯಾಯಗಳು:',
    noHighRisks: 'ಹೆಚ್ಚಿನ ಅಪಾಯ ಕಂಡುಬಂದಿಲ್ಲ',
    altPlansCompared: 'ಹೋಲಿಸಿದ ಪರ್ಯಾಯ ಯೋಜನೆಗಳು:',
    dataSourcesFooterTitle: 'ದತ್ತಾಂಶ ಮೂಲಗಳು, ಊಹೆಗಳು ಮತ್ತು ಮಿತಿಗಳು:',
    dataSourcesFooterBody:
      'ಭೌಗೋಳಿಕ ವಿಸ್ತೀರ್ಣವು ನಕ್ಷೆಯ ಬಿಂದುಗಳಿಂದ WGS84 ಅಂದಾಜಾಗಿದೆ (ಕಾನೂನು ಸರ್ವೇ ಅಲ್ಲ). ನೇರ ಹವಾಮಾನವು Open-Meteo ಬಳಸುತ್ತದೆ. ಬೆಳೆ ಅವಧಿ, ಇಳುವರಿ ಮತ್ತು ಬೆಲೆಗಳು ರೈತರು ನಮೂದಿಸದಿದ್ದಲ್ಲಿ ಮಾದರಿ ಅಂದಾಜುಗಳಾಗಿವೆ.',
    soilTypes: {
      'Red soil': 'ಕೆಂಪು ಮಣ್ಣು',
      'Black soil': 'ಕಪ್ಪು ಮಣ್ಣು',
      'Sandy soil': 'ಮರಳು ಮಣ್ಣು',
      'Clay soil': 'ಜೇಡಿ ಮಣ್ಣು',
      'Loamy soil': 'ಗೋಡು ಮಣ್ಣು',
      'Alluvial soil': 'ಮೆಕ್ಕಲು ಮಣ್ಣು',
      'Unknown soil': 'ತಿಳಿದಿಲ್ಲದ ಮಣ್ಣು',
    },
    soilSources: {
      'Measured / Lab Tested': 'ಪ್ರಯೋಗಾಲಯ ಪರೀಕ್ಷಿತ',
      'Farmer Estimate': 'ರೈತರ ಅಂದಾಜು',
      Unknown: 'ತಿಳಿದಿಲ್ಲ',
    },
    irrigationTypes: {
      Drip: 'ಹನಿ ನೀರಾವರಿ',
      Sprinkler: 'ತುಂತುರು ನೀರಾವರಿ',
      'Flood / Canal': 'ಹರಿವು / ಕಾಲುವೆ',
      'Rainfed Only': 'ಮಳೆಯಾಶ್ರಿತ ಮಾತ್ರ',
    },
    waterSources: {
      Borewell: 'ಕೊಳವೆ ಬಾವಿ',
      Canal: 'ಕಾಲುವೆ',
      'Farm Pond': 'ಕೃಷಿ ಹೊಂಡ',
      Rainwater: 'ಮಳೆನೀರು',
      River: 'ನದಿ',
      Unknown: 'ತಿಳಿದಿಲ್ಲ',
    },
    waterLevels: {
      Low: 'ಕಡಿಮೆ',
      Moderate: 'ಮಧ್ಯಮ',
      Adequate: 'ಸಾಕಷ್ಟು',
      Abundant: 'ಸಮೃದ್ಧ',
    },
    labourLevels: {
      Low: 'ಕಡಿಮೆ ಕಾರ್ಮಿಕರು',
      Moderate: 'ಮಧ್ಯಮ ಕಾರ್ಮಿಕರು',
      Adequate: 'ಸಾಕಷ್ಟು ಕಾರ್ಮಿಕರು',
    },
    experienceLevels: {
      Beginner: 'ಹೊಸಬರು',
      Intermediate: 'ಮಧ್ಯಮ ಅನುಭವ',
      Experienced: 'ಅನುಭವಿ ರೈತರು',
    },
    weatherScenarios: {
      normal: 'ಸಾಮಾನ್ಯ ಹವಾಮಾನ',
      drought: 'ಬರಗಾಲ / ಒಣ ವಾತಾವರಣ',
      excessive_rain: 'ಅತಿಯಾದ ಮಳೆ',
      heat_stress: 'ಬಿಸಿಲಿನ ತಾಪ (ಹೀಟ್ ಸ್ಟ್ರೆಸ್)',
      cold_stress: 'ಶೀತ ಒತ್ತಡ',
      strong_winds: 'ಬಲವಾದ ಗಾಳಿ',
      unseasonal_rain: 'ಅಕಾಲಿಕ ಮಳೆ',
      reduced_irrigation: 'ಕಡಿಮೆ ನೀರಾವರಿ ಲಭ್ಯತೆ',
    },
    activities: {
      prepare_soil: 'ಭೂಮಿ ಸಿದ್ಧಪಡಿಸಿ',
      sow_seeds: 'ಬೀಜ ಬಿತ್ತನೆ',
      irrigate: 'ನೀರಾವರಿ ನೀಡಿ',
      apply_fertilizer: 'ಗೊಬ್ಬರ ನೀಡಿ',
      weeding: 'ಕಳೆ ತೆಗೆಯಿರಿ',
      pest_management: 'ಕೀಟ ನಿರ್ವಹಣೆ',
      hire_labour: 'ವರ್ಚುವಲ್ ಕಾರ್ಮಿಕರು',
      rent_machinery: 'ಯಂತ್ರ ಬಾಡಿಗೆ',
      harvest: 'ಕೊಯ್ಲು ಪೂರ್ಣಗೊಳಿಸಿ',
    },
    riskLevels: {
      Low: 'ಕಡಿಮೆ',
      Moderate: 'ಮಧ್ಯಮ',
      High: 'ಹೆಚ್ಚು',
    },
    whatIfNames: {
      Unfavourable: 'ಪ್ರತಿಕೂಲ',
      Expected: 'ನಿರೀಕ್ಷಿತ',
      Favourable: 'ಅನುಕೂಲಕರ',
    },
    riskNames: {
      water_shortage: 'ನೀರಿನ ಕೊರತೆ',
      excessive_rainfall: 'ಅತಿಯಾದ ಮಳೆ',
      waterlogging: 'ನೀರು ನಿಲ್ಲುವಿಕೆ',
      heat_stress: 'ಬಿಸಿಲಿನ ಒತ್ತಡ',
      cold_stress: 'ಶೀತ ಒತ್ತಡ',
      soil_incompatibility: 'ಮಣ್ಣು ಹೊಂದಾಣಿಕೆ ಕೊರತೆ',
      nutrient_deficiency: 'ಪೋಷಕಾಂಶ ಕೊರತೆ',
      pest_susceptibility: 'ಕೀಟ ಬಾಧೆ ಸಾಧ್ಯತೆ',
      disease_susceptibility: 'ರೋಗ ಬಾಧೆ ಸಾಧ್ಯತೆ',
      labour_shortage: 'ಕಾರ್ಮಿಕರ ಕೊರತೆ',
      budget_shortage: 'ಬಜೆಟ್ ಕೊರತೆ',
      market_price_uncertainty: 'ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಏರಿಳಿತ',
      harvest_delays: 'ಕೊಯ್ಲು ವಿಳಂಬ',
      harvest_weather_risk: 'ಕೊಯ್ಲು ಸಮಯದ ಹವಾಮಾನ ಅಪಾಯ',
    },
    warnForecastLabel: 'ಮುನ್ಸೂಚನೆ ಎಚ್ಚರಿಕೆ (7-ದಿನದ ಅವಧಿ)',
    warnSimLabel: 'ಸಿಮ್ಯುಲೇಟೆಡ್ ಸನ್ನಿವೇಶ ಎಚ್ಚರಿಕೆ',
    warnBadWeather:
      'ಕೊಯ್ಲು ಸಮಯದಲ್ಲಿ ಮಳೆ ಅಥವಾ ಗಾಳಿ ಬೆಳೆ ಹಾನಿಗೆ ಕಾರಣವಾಗಬಹುದು. ಒಣ ಹವಾಮಾನದಲ್ಲಿ ಕೊಯ್ಲು ಮಾಡಿ ಬೆಳೆಯನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಮುಚ್ಚಿಡಿ.',
    warnNearHarvest: 'ಬೆಳೆ ಕೊಯ್ಲು ಹಂತಕ್ಕೆ ಸಮೀಪಿಸುತ್ತಿದೆ. ಕೊಯ್ಲು ಮತ್ತು ಸಾರಿಗೆಯ ಮೊದಲು ಸ್ಥಳೀಯ 7 ದಿನಗಳ ಮಳೆ ಮುನ್ಸೂಚನೆ ಗಮನಿಸಿ.',
    warnNone: 'ಕೊಯ್ಲು ಸಮಯದ ತಕ್ಷಣದ ಹವಾಮಾನ ಎಚ್ಚರಿಕೆ ಇಲ್ಲ.',
  },
  hi: {
    headerBrand: 'रैतामित्र · डिजिटल खेती व भू-स्थानिक बुद्धिमत्ता',
    farmLabel: 'खेत:',
    areaLabel: 'क्षेत्रफल:',
    acresUnit: 'एकड़',
    cropLabel: 'फसल:',
    daysShort: 'दिन',
    budgetLabel: 'बजट:',
    profileTitle: 'डिजिटल खेत विवरण',
    profileNote: 'मिट्टी के गुण केवल निर्देशांक से नहीं अनुमानित किए जाते। कृपया नीचे अपने ज्ञात या अनुमानित मान दर्ज करें।',
    mappedArea: 'मैप किया क्षेत्रफल:',
    soilTypeLabel: 'मिट्टी का प्रकार',
    soilSourceLabel: 'मिट्टी डेटा स्रोत',
    soilPhLabel: 'मिट्टी pH (यदि ज्ञात हो)',
    phPlaceholder: 'जैसे 6.5',
    irrigationAvailLabel: 'सिंचाई उपलब्धता',
    irrigationYes: 'सिंचाई उपलब्ध',
    irrigationNo: 'केवल वर्षा आधारित (सिंचाई नहीं)',
    irrigationMethodLabel: 'सिंचाई विधि',
    waterSourceQtyLabel: 'जल स्रोत व मात्रा',
    budgetInrLabel: 'खेती बजट (₹ INR)',
    expectedSowingLabel: 'अपेक्षित बुवाई तिथि',
    labourExpLabel: 'उपलब्ध श्रम व अनुभव',
    prevCropLabel: 'पिछली फसल',
    prevCropPh: 'जैसे रागी, मक्का, खाली',
    existingProblemsLabel: 'मौजूदा कृषि समस्याएं (वैकल्पिक)',
    existingProblemsPh: 'जैसे उखटा रोग, जलभराव, मज़दूर की कमी',
    continueAdvisor: 'फसल सलाहकार पर जाएं',
    recommendModeBtn: 'उगाने के लिए फसल सुझाव (20 फसलें)',
    manualCropBtn: 'मैं अपनी फसल पहले से जानता हूं',
    rankByLabel: 'क्रमबद्ध करें:',
    sortSuitability: 'कुल उपयुक्तता स्कोर',
    sortMaxProfit: 'अधिकतम अनुमानित लाभ',
    sortMinInvest: 'न्यूनतम निवेश',
    sortMinWater: 'न्यूनतम जल आवश्यकता',
    sortLowRisk: 'कम अनुमानित जोखिम',
    sortShortDuration: 'कम खेती अवधि',
    prototypeScaleNotePrefix: 'नोट: नीचे वित्तीय व उपज आंकड़े आपके',
    prototypeScaleNoteSuffix: 'एकड़ मैप किए गए खेत के अनुसार उदाहरण मॉडल हैं।',
    perennial: 'बहुवर्षीय',
    seasonal: 'मौसमी',
    duration: 'अवधि',
    daysWord: 'दिन',
    waterNeed: 'पानी की जरूरत',
    estInvest: 'अनुमानित निवेश',
    estProfit: 'अनुमानित लाभ',
    expectedYield: 'अपेक्षित उपज',
    modeledRisk: 'मॉडल जोखिम',
    risksLabel: 'जोखिम:',
    dataCompleteness: 'डेटा पूर्णता:',
    startDigitalFarming: 'डिजिटल खेती शुरू करें',
    activeCropLabel: 'सक्रिय फसल:',
    mappedFieldLabel: 'मैप किया खेत:',
    sowingShort: 'बुवाई:',
    tabLiveSat: '1. लाइव उपग्रह निगरानी (मापा गया)',
    tabSatTimelapse: '2. उपग्रह टाइम-लैप्स',
    tabTwin3d: '3. 3D उपग्रह डिजिटल ट्विन',
    tabCloseup3d: '4. बीज से कटाई नज़दीकी दृश्य',
    tabAnalytics: '5. फसल स्वास्थ्य व नक्शा',
    playGrowth: 'विकास चलाएं',
    plus5Days: '+5 दिन',
    resetBtn: 'रीसेट',
    dayLabel: 'दिन',
    harvestColon: 'कटाई:',
    virtualMgmtTitle: 'वर्चुअल कृषि प्रबंधन',
    virtualMgmtNote: 'केवल सिमुलेशन कार्य — कोई वास्तविक बुकिंग या नौकरी पोस्ट नहीं बनती',
    harvestSummaryTitle: 'डिजिटल कटाई सारांश',
    cropReadyTitle: 'फसल कटाई के लिए तैयार है',
    farmCareBtn: 'खेत देखभाल',
    hireLabourBtn: 'कटाई श्रमिक बुलाएं',
    draftListingBtn: 'उपज बिक्री ड्राफ्ट बनाएं',
    projectedYield: 'अनुमानित उपज',
    totalEstExpenses: 'कुल अनुमानित खर्च',
    estRevProfit: 'अनुमानित आय / लाभ',
    estHarvestDate: 'अनुमानित कटाई तिथि',
    simHealthTitle: 'सिम्युलेटेड खेत स्वास्थ्य',
    modeledEstimatesBadge: 'मॉडल अनुमान',
    healthBarCrop: 'मॉडल फसल स्वास्थ्य',
    healthBarGrowth: 'विकास प्रगति',
    healthBarMoisture: 'अनुमानित मिट्टी नमी',
    healthBarWater: 'जल उपलब्धता',
    healthBarNutrient: 'पोषक तत्व स्थिति',
    healthBarStress: 'मौसम तनाव',
    healthBarPest: 'कीट जोखिम दबाव',
    remainingDaysLabel: 'शेष दिन',
    activitySpendLabel: 'गतिविधि खर्च',
    weatherControlTitle: 'मौसम व परिदृश्य नियंत्रण',
    loading: 'लोड हो रहा है...',
    tempLabel: 'तापमान:',
    rainLabel: 'बारिश:',
    humidityLabel: 'आर्द्रता:',
    windLabel: 'हवा:',
    et0Label: 'ET0:',
    updatedLabel: 'अपडेट',
    weatherOfflineMsg: 'लाइव मौसम सेवा उपलब्ध नहीं है; नीचे मौसम परिदृश्य चुनें।',
    simWeatherLabel: 'सिम्युलेटेड मौसम परिदृश्य (उदाहरण):',
    scenarioIntensityLabel: 'परिदृश्य तीव्रता',
    riskGridTitle: 'कृषि जोखिम बुद्धिमत्ता (14 मॉडल जोखिम कारक)',
    riskGridNote: 'केवल मॉडल मार्गदर्शन — वास्तविक खेत रोग निदान नहीं।',
    inputsColon: 'आधार:',
    mitigationColon: 'बचाव:',
    finIntelTitle: 'कृषि वित्तीय बुद्धिमत्ता',
    finIntelSubPrefix: 'मैप क्षेत्रफल (',
    finIntelSubSuffix: ') के अनुसार। नीचे कोई भी अनुमान बदलें; लाभ केवल अनुमान हैं।',
    finFieldLabels: {
      landPreparationInr: 'भूमि तैयारी (कुल ₹)',
      seedQtyPerAcreKg: 'बीज मात्रा / एकड़ (किलो)',
      seedPricePerKgInr: 'बीज मूल्य / किलो (₹)',
      fertilizerInr: 'खाद व उर्वरक (कुल ₹)',
      irrigationInr: 'सिंचाई (कुल ₹)',
      labourInr: 'श्रम खर्च (कुल ₹)',
      machineryInr: 'मशीनरी (कुल ₹)',
      pestManagementInr: 'कीट नियंत्रण (कुल ₹)',
      electricityFuelInr: 'बिजली / ईंधन (कुल ₹)',
      harvestingInr: 'कटाई खर्च (कुल ₹)',
      packagingInr: 'पैकेजिंग (कुल ₹)',
      transportationInr: 'परिवहन (कुल ₹)',
      otherInr: 'अन्य खर्च (कुल ₹)',
      expectedYieldPerAcreKg: 'अपेक्षित उपज/एकड़ (किलो)',
      expectedSellingPricePerKgInr: 'अपेक्षित भाव/किलो (₹)',
    },
    totalSeedNeeded: 'कुल बीज आवश्यकता',
    totalInvestKpi: 'कुल निवेश',
    perAcShort: '/एकड़',
    grossRevKpi: 'सकल आय',
    estNetProfitKpi: 'अनुमानित शुद्ध लाभ',
    breakEvenKpi: 'ब्रेक-ईवन मूल्य',
    remainingBudgetKpi: 'शेष बजट',
    compareTitle: 'बहु-फसल तुलना',
    planWord: 'योजना',
    goalHighestProfit: 'लक्ष्य: अधिकतम लाभ',
    goalLowestInvest: 'लक्ष्य: न्यूनतम निवेश',
    goalLowestWater: 'लक्ष्य: कम पानी जरूरत',
    strongestOption: 'सबसे मजबूत विकल्प',
    estProfitInline: 'अनुमानित लाभ',
    investInline: 'निवेश',
    waterInline: 'पानी',
    colCrop: 'फसल',
    colDuration: 'अवधि',
    colWater: 'पानी',
    colInvest: 'निवेश',
    colYield: 'उपज',
    colRevenue: 'आय',
    colEstProfit: 'अनुमानित लाभ',
    colBreakEven: 'ब्रेक-ईवन',
    colKeyRisks: 'मुख्य जोखिम',
    chartInvestName: 'निवेश (₹)',
    chartProfitName: 'अनुमानित लाभ (₹)',
    whatIfTitle: 'व्हाट-इफ परिदृश्य इंजन (संपादन योग्य अनुमान)',
    conditionsSuffix: 'परिस्थितियां',
    yieldFactorLabel: 'उपज गुणक',
    priceFactorLabel: 'भाव गुणक',
    whatIfInvest: 'निवेश:',
    whatIfRevenue: 'आय:',
    whatIfProfit: 'अनुमानित लाभ:',
    reportTitle: 'कृषि निर्णय एवं प्रिंट योग्य किसान रिपोर्ट',
    analysisDate: 'विश्लेषण तिथि:',
    rep1Title: '1. चयनित फसल व भूमि:',
    rep2Title: '2. आवश्यक पूंजी व पानी:',
    rep3Title: '3. उत्पादन व लाभ अनुमान:',
    rep4Title: '4. मुख्य जोखिम व विकल्प:',
    noHighRisks: 'कोई उच्च जोखिम नहीं मिला',
    altPlansCompared: 'तुलना की गई योजनाएं:',
    dataSourcesFooterTitle: 'डेटा स्रोत, मान्यताएं और सीमाएं:',
    dataSourcesFooterBody:
      'खेत का क्षेत्रफल नक्शे के बिंदुओं से WGS84 अनुमान है (कानूनी सर्वेक्षण नहीं)। लाइव मौसम Open-Meteo से लिया जाता है। फसल अवधि, उपज और कीमतें उदाहरण मॉडल अनुमान हैं।',
    soilTypes: {
      'Red soil': 'लाल मिट्टी',
      'Black soil': 'काली मिट्टी',
      'Sandy soil': 'रेतीली मिट्टी',
      'Clay soil': 'चिकनी मिट्टी',
      'Loamy soil': 'दोमट मिट्टी',
      'Alluvial soil': 'जलोढ़ मिट्टी',
      'Unknown soil': 'अज्ञात मिट्टी',
    },
    soilSources: {
      'Measured / Lab Tested': 'लैब द्वारा मापित',
      'Farmer Estimate': 'किसान अनुमान',
      Unknown: 'अज्ञात',
    },
    irrigationTypes: {
      Drip: 'ड्रिप सिंचाई',
      Sprinkler: 'स्प्रिंकलर',
      'Flood / Canal': 'खुली / नहर सिंचाई',
      'Rainfed Only': 'केवल वर्षा आधारित',
    },
    waterSources: {
      Borewell: 'बोरवेल',
      Canal: 'नहर',
      'Farm Pond': 'खेत तालाब',
      Rainwater: 'वर्षा जल',
      River: 'नदी',
      Unknown: 'अज्ञात',
    },
    waterLevels: {
      Low: 'कम',
      Moderate: 'मध्यम',
      Adequate: 'पर्याप्त',
      Abundant: 'प्रचुर',
    },
    labourLevels: {
      Low: 'कम श्रम',
      Moderate: 'मध्यम श्रम',
      Adequate: 'पर्याप्त श्रम',
    },
    experienceLevels: {
      Beginner: 'शुरुआती',
      Intermediate: 'मध्यम अनुभवी',
      Experienced: 'अनुभवी',
    },
    weatherScenarios: {
      normal: 'सामान्य मौसम',
      drought: 'सूखा / कम बारिश',
      excessive_rain: 'अत्यधिक वर्षा',
      heat_stress: 'लू / उच्च ताप तनाव',
      cold_stress: 'शीत तनाव',
      strong_winds: 'तेज़ हवाएं',
      unseasonal_rain: 'बेमौसम बारिश',
      reduced_irrigation: 'कम सिंचाई उपलब्धता',
    },
    activities: {
      prepare_soil: 'मिट्टी तैयार करें',
      sow_seeds: 'बीज बोएं',
      irrigate: 'खेत सींचें',
      apply_fertilizer: 'उर्वरक डालें',
      weeding: 'निराई करें',
      pest_management: 'कीट प्रबंधन',
      hire_labour: 'वर्चुअल श्रम लें',
      rent_machinery: 'मशीन किराए पर लें',
      harvest: 'कटाई पूरी करें',
    },
    riskLevels: {
      Low: 'कम',
      Moderate: 'मध्यम',
      High: 'उच्च',
    },
    whatIfNames: {
      Unfavourable: 'प्रतिकूल',
      Expected: 'सामान्य अपेक्षित',
      Favourable: 'अनुकूल',
    },
    riskNames: {
      water_shortage: 'पानी की कमी',
      excessive_rainfall: 'अत्यधिक बारिश',
      waterlogging: 'जलभराव',
      heat_stress: 'गर्मी का तनाव',
      cold_stress: 'ठंड का तनाव',
      soil_incompatibility: 'मिट्टी अनुपयुक्तता',
      nutrient_deficiency: 'पोषक तत्वों की कमी',
      pest_susceptibility: 'कीट प्रकोप जोखिम',
      disease_susceptibility: 'रोग लगने का जोखिम',
      labour_shortage: 'श्रमिकों की कमी',
      budget_shortage: 'बजट की कमी',
      market_price_uncertainty: 'मंडी भाव उतार-चढ़ाव',
      harvest_delays: 'कटाई में देरी',
      harvest_weather_risk: 'कटाई के समय मौसम जोखिम',
    },
    warnForecastLabel: 'पूर्वानुमान चेतावनी (7-दिन ओवरलैप)',
    warnSimLabel: 'सिम्युलेटेड परिदृश्य चेतावनी',
    warnBadWeather:
      'कटाई के करीब बारिश या तेज़ हवा से उपज खराब हो सकती है। सूखे समय में कटाई करें और फसल को सुरक्षित ढकें।',
    warnNearHarvest: 'फसल कटाई के करीब है। कटाई और परिवहन तय करने से पहले 7-दिन का मौसम पूर्वानुमान देखें।',
    warnNone: 'कटाई के लिए तत्काल मौसम चेतावनी नहीं है।',
  },
  te: {
    headerBrand: 'రైతమిత్ర · డిజిటల్ వ్యవసాయం & ఉపగ్రహ మేధస్సు',
    farmLabel: 'పొలం:',
    areaLabel: 'విస్తీర్ణం:',
    acresUnit: 'ఎకరాలు',
    cropLabel: 'పంట:',
    daysShort: 'రో.',
    budgetLabel: 'బడ్జెట్:',
    profileTitle: 'డిజిటల్ పొలం వివరాలు',
    profileNote: 'నేల గుణాలను కేవలం అక్షాంశ/రేఖాంశాల నుండి ఊహించలేము. మీకు తెలిసిన లేదా అంచనా వివరాలను క్రింద నమోదు చేయండి.',
    mappedArea: 'మ్యాప్ చేసిన విస్తీర్ణం:',
    soilTypeLabel: 'నేల రకం',
    soilSourceLabel: 'నేల డేటా మూలం',
    soilPhLabel: 'నేల pH (తెలిస్తే)',
    phPlaceholder: 'ఉదా. 6.5',
    irrigationAvailLabel: 'నీటిపారుదల లభ్యత',
    irrigationYes: 'నీటిపారుదల ఉంది',
    irrigationNo: 'వర్షాధారం మాత్రమే',
    irrigationMethodLabel: 'నీటిపారుదల పద్ధతి',
    waterSourceQtyLabel: 'నీటి వనరు & పరిమాణం',
    budgetInrLabel: 'సాగు బడ్జెట్ (₹ INR)',
    expectedSowingLabel: 'అంచనా విత్తే తేదీ',
    labourExpLabel: 'కూలీల లభ్యత & అనుభవం',
    prevCropLabel: 'మునుపటి పంట',
    prevCropPh: 'ఉదా. రాగి, మొక్కజొన్న, బీడు',
    existingProblemsLabel: 'ప్రస్తుత వ్యవసాయ సమస్యలు (ఐచ్ఛికం)',
    existingProblemsPh: 'ఉదా. వడలు తెగులు, నీరు నిలవడం, కూలీల కొరత',
    continueAdvisor: 'పంట సలహాదారుకి వెళ్ళండి',
    recommendModeBtn: 'ఏ పంట వేయాలో సూచించు (20 పంటలు)',
    manualCropBtn: 'నా పంట నాకు ముందే తెలుసు',
    rankByLabel: 'క్రమం:',
    sortSuitability: 'మొత్తం అనుకూలత స్కోరు',
    sortMaxProfit: 'గరిష్ట అంచనా లాభం',
    sortMinInvest: 'కనిష్ట పెట్టుబడి',
    sortMinWater: 'కనిష్ట నీటి అవసరం',
    sortLowRisk: 'తక్కువ అంచనా నష్టభయం',
    sortShortDuration: 'తక్కువ సాగు కాలం',
    prototypeScaleNotePrefix: 'గమనిక: క్రింది ఆర్థిక & దిగుబడి గణాంకాలు మీ',
    prototypeScaleNoteSuffix: 'ఎకరాల మ్యాప్ చేసిన పొలానికి అనుగుణంగా ఉన్న నమూనా అంచనాలు.',
    perennial: 'బహువార్షికం',
    seasonal: 'కాలానుగుణం',
    duration: 'కాలపరిమితి',
    daysWord: 'రోజులు',
    waterNeed: 'నీటి అవసరం',
    estInvest: 'అంచనా పెట్టుబడి',
    estProfit: 'అంచనా లాభం',
    expectedYield: 'అంచనా దిగుబడి',
    modeledRisk: 'మోడల్ రిస్క్',
    risksLabel: 'నష్టభయాలు:',
    dataCompleteness: 'డేటా పూర్తి స్థాయి:',
    startDigitalFarming: 'డిజిటల్ సాగు ప్రారంభించండి',
    activeCropLabel: 'ప్రస్తుత పంట:',
    mappedFieldLabel: 'మ్యాప్ చేసిన పొలం:',
    sowingShort: 'విత్తిన తేదీ:',
    tabLiveSat: '1. లైవ్ ఉపగ్రహ పర్యవేక్షణ (నిజమైనది)',
    tabSatTimelapse: '2. ఉపగ్రహ టైమ్-లాప్స్',
    tabTwin3d: '3. 3D ఉపగ్రహ డిజిటల్ ట్విన్',
    tabCloseup3d: '4. విత్తనం-కోత క్లోజ్-అప్',
    tabAnalytics: '5. పంట ఆరోగ్యం & మ్యాప్',
    playGrowth: 'పెరుగుదల ప్లే',
    plus5Days: '+5 రోజులు',
    resetBtn: 'రీసెట్',
    dayLabel: 'రోజు',
    harvestColon: 'కోత:',
    virtualMgmtTitle: 'వర్చువల్ వ్యవసాయ నిర్వహణ',
    virtualMgmtNote: 'వర్చువల్ చర్యలు మాత్రమే — నిజమైన బుకింగ్లు లేదా జాబ్ పోస్టులు సృష్టించబడవు',
    harvestSummaryTitle: 'డిజిటల్ కోత సారాంశం',
    cropReadyTitle: 'పంట కోతకు సిద్ధంగా ఉంది',
    farmCareBtn: 'పొలం సంరక్షణ',
    hireLabourBtn: 'కోత కూలీలను తీసుకోండి',
    draftListingBtn: 'అమ్మకం డ్రాఫ్ట్ చేయండి',
    projectedYield: 'అంచనా దిగుబడి',
    totalEstExpenses: 'మొత్తం అంచనా ఖర్చులు',
    estRevProfit: 'అంచనా ఆదాయం / లాభం',
    estHarvestDate: 'అంచనా కోత తేదీ',
    simHealthTitle: 'అనుకరించిన పొలం ఆరోగ్యం',
    modeledEstimatesBadge: 'మోడల్ అంచనాలు',
    healthBarCrop: 'మోడల్ పంట ఆరోగ్యం',
    healthBarGrowth: 'పెరుగుదల ప్రగతి',
    healthBarMoisture: 'అంచనా నేల తేమ',
    healthBarWater: 'నీటి లభ్యత',
    healthBarNutrient: 'పోషకాల స్థితి',
    healthBarStress: 'వాతావరణ ఒత్తిడి',
    healthBarPest: 'పురుగుల నష్టభయం',
    remainingDaysLabel: 'మిగిలిన రోజులు',
    activitySpendLabel: 'చర్యల ఖర్చు',
    weatherControlTitle: 'వాతావరణ & పరిస్థితి నియంత్రణ',
    loading: 'లోడ్ అవుతోంది...',
    tempLabel: 'ఉష్ణోగ్రత:',
    rainLabel: 'వర్షం:',
    humidityLabel: 'తేమ:',
    windLabel: 'గాలి:',
    et0Label: 'ET0:',
    updatedLabel: 'అప్డేట్',
    weatherOfflineMsg: 'లైవ్ వాతావరణ API అందుబాటులో లేదు; దిగువ అనుకరించిన పరిస్థితిని ఎంచుకోండి.',
    simWeatherLabel: 'అనుకరించిన వాతావరణ పరిస్థితి (నమూనా):',
    scenarioIntensityLabel: 'తీవ్రత స్థాయి',
    riskGridTitle: 'వ్యవసాయ నష్టభయ విశ్లేషణ (14 మోడల్ అంశాలు)',
    riskGridNote: 'మోడల్ మార్గదర్శకత్వం మాత్రమే — అసలు పొలం వ్యాధి నిర్ధారణ కాదు.',
    inputsColon: 'ఆధారం:',
    mitigationColon: 'నివారణ:',
    finIntelTitle: 'వ్యవసాయ ఆర్థిక మేధస్సు',
    finIntelSubPrefix: 'మ్యాప్ చేసిన విస్తీర్ణం (',
    finIntelSubSuffix: '). దిగువ ఏ అంశాన్నైనా మార్చండి; లాభాలు అంచనాలు మాత్రమే.',
    finFieldLabels: {
      landPreparationInr: 'నేల తయారీ (మొత్తం ₹)',
      seedQtyPerAcreKg: 'విత్తనాల మోతాదు / ఎకరం (కిలోలు)',
      seedPricePerKgInr: 'విత్తన ధర / కిలో (₹)',
      fertilizerInr: 'ఎరువులు (మొత్తం ₹)',
      irrigationInr: 'నీటిపారుదల (మొత్తం ₹)',
      labourInr: 'కూలీ ఖర్చు (మొత్తం ₹)',
      machineryInr: 'యంత్రాలు (మొత్తం ₹)',
      pestManagementInr: 'సస్యరక్షణ (మొత్తం ₹)',
      electricityFuelInr: 'విద్యుత్ / ఇంధనం (మొత్తం ₹)',
      harvestingInr: 'కోత ఖర్చు (మొత్తం ₹)',
      packagingInr: 'ప్యాకేజింగ్ (మొత్తం ₹)',
      transportationInr: 'రవాణా (మొత్తం ₹)',
      otherInr: 'ఇతర ఖర్చులు (మొత్తం ₹)',
      expectedYieldPerAcreKg: 'అంచనా దిగుబడి/ఎకరం (కిలోలు)',
      expectedSellingPricePerKgInr: 'అంచనా అమ్మకపు ధర/కిలో (₹)',
    },
    totalSeedNeeded: 'మొత్తం విత్తనాల అవసరం',
    totalInvestKpi: 'మొత్తం పెట్టుబడి',
    perAcShort: '/ఎకరం',
    grossRevKpi: 'మొత్తం ఆదాయం',
    estNetProfitKpi: 'అంచనా నికర లాభం',
    breakEvenKpi: 'బ్రేక్-ఈవెన్ ధర',
    remainingBudgetKpi: 'మిగిలిన బడ్జెట్',
    compareTitle: 'పలు పంటల పోలిక',
    planWord: 'ప్రణాళిక',
    goalHighestProfit: 'లక్ష్యం: గరిష్ట లాభం',
    goalLowestInvest: 'లక్ష్యం: కనిష్ట పెట్టుబడి',
    goalLowestWater: 'లక్ష్యం: తక్కువ నీటి అవసరం',
    strongestOption: 'ఉత్తమ ఎంపిక',
    estProfitInline: 'అంచనా లాభం',
    investInline: 'పెట్టుబడి',
    waterInline: 'నీరు',
    colCrop: 'పంట',
    colDuration: 'కాలం',
    colWater: 'నీరు',
    colInvest: 'పెట్టుబడి',
    colYield: 'దిగుబడి',
    colRevenue: 'ఆదాయం',
    colEstProfit: 'అంచనా లాభం',
    colBreakEven: 'బ్రేక్-ఈవెన్',
    colKeyRisks: 'ప్రధాన రిస్కులు',
    chartInvestName: 'పెట్టుబడి (₹)',
    chartProfitName: 'అంచనా లాభం (₹)',
    whatIfTitle: 'వాట్-ఇఫ్ పరిస్థితి ఇంజిన్ (మార్చగల అంచనాలు)',
    conditionsSuffix: 'పరిస్థితులు',
    yieldFactorLabel: 'దిగుబడి గుణకం',
    priceFactorLabel: 'ధర గుణకం',
    whatIfInvest: 'పెట్టుబడి:',
    whatIfRevenue: 'ఆదాయం:',
    whatIfProfit: 'అంచనా లాభం:',
    reportTitle: 'వ్యవసాయ నిర్ణయం & ప్రింట్ చేయదగిన రైతు నివేదిక',
    analysisDate: 'విశ్లేషణ తేదీ:',
    rep1Title: '1. ఎంచుకున్న పంట & భూమి:',
    rep2Title: '2. కావాల్సిన డబ్బు & నీరు:',
    rep3Title: '3. దిగుబడి & లాభ అంచనా:',
    rep4Title: '4. ప్రధాన రిస్కులు & ప్రత్యామ్నాయాలు:',
    noHighRisks: 'పెద్ద ప్రమాదాలు లేవు',
    altPlansCompared: 'పోల్చిన ప్రత్యామ్నాయ పంటలు:',
    dataSourcesFooterTitle: 'డేటా మూలాలు, అంచనాలు & పరిమితులు:',
    dataSourcesFooterBody:
      'పొలం విస్తీర్ణం మ్యాప్ బిందువుల నుండి WGS84 అంచనా (చట్టపరమైన సర్వే కాదు). లైవ్ వాతావరణం Open-Meteo నుండి వస్తుంది. పంట కాలాలు, దిగుబడులు మరియు ధరలు నమూనా అంచనాలు మాత్రమే.',
    soilTypes: {
      'Red soil': 'ఎర్ర నేల',
      'Black soil': 'నల్ల రేగడి నేల',
      'Sandy soil': 'ఇసుక నేల',
      'Clay soil': 'బంకమన్ను నేల',
      'Loamy soil': 'లోమ్ / గరప నేల',
      'Alluvial soil': 'ఒండ్రు నేల',
      'Unknown soil': 'తెలియని నేల',
    },
    soilSources: {
      'Measured / Lab Tested': 'ల్యాబ్ పరీక్షించినది',
      'Farmer Estimate': 'రైతు అంచనా',
      Unknown: 'తెలియదు',
    },
    irrigationTypes: {
      Drip: 'బిందు సేద్యం',
      Sprinkler: 'తుంపర సేద్యం',
      'Flood / Canal': 'కాలువ / పారుదల',
      'Rainfed Only': 'వర్షాధారం మాత్రమే',
    },
    waterSources: {
      Borewell: 'బోరుబావి',
      Canal: 'కాలువ',
      'Farm Pond': 'పంట కుంట',
      Rainwater: 'వర్షపు నీరు',
      River: 'నది',
      Unknown: 'తెలియదు',
    },
    waterLevels: {
      Low: 'తక్కువ',
      Moderate: 'మోస్తరు',
      Adequate: 'సరిపడా',
      Abundant: 'సమృద్ధిగా',
    },
    labourLevels: {
      Low: 'తక్కువ కూలీలు',
      Moderate: 'మోస్తరు కూలీలు',
      Adequate: 'సరిపడా కూలీలు',
    },
    experienceLevels: {
      Beginner: 'కొత్తవారు',
      Intermediate: 'మధ్యస్థ అనుభవం',
      Experienced: 'అనుభవజ్ఞులు',
    },
    weatherScenarios: {
      normal: 'సాధారణ పరిస్థితులు',
      drought: 'కరువు / పొడి వాతావరణం',
      excessive_rain: 'అధిక వర్షపాతం',
      heat_stress: 'అధిక ఉష్ణోగ్రత ఒత్తిడి',
      cold_stress: 'చలి ఒత్తిడి',
      strong_winds: 'బలమైన గాలులు',
      unseasonal_rain: 'అకాల వర్షం',
      reduced_irrigation: 'తగ్గిన నీటిపారుదల',
    },
    activities: {
      prepare_soil: 'నేల సిద్ధం చేయండి',
      sow_seeds: 'విత్తనాలు నాటండి',
      irrigate: 'నీరు పెట్టండి',
      apply_fertilizer: 'ఎరువు వేయండి',
      weeding: 'కలుపు తీయండి',
      pest_management: 'సస్యరక్షణ',
      hire_labour: 'వర్చువల్ కూలీలు',
      rent_machinery: 'యంత్రం అద్దెకు',
      harvest: 'కోత పూర్తి చేయండి',
    },
    riskLevels: {
      Low: 'తక్కువ',
      Moderate: 'మధ్యస్థం',
      High: 'ఎక్కువ',
    },
    whatIfNames: {
      Unfavourable: 'ప్రతికూలం',
      Expected: 'సాధారణ అంచనా',
      Favourable: 'అనుకూలం',
    },
    riskNames: {
      water_shortage: 'నీటి కొరత',
      excessive_rainfall: 'అధిక వర్షపాతం',
      waterlogging: 'నీరు నిలిచిపోవడం',
      heat_stress: 'వేడి ఒత్తిడి',
      cold_stress: 'చలి ఒత్తిడి',
      soil_incompatibility: 'నేల అనుకూలత లేకపోవడం',
      nutrient_deficiency: 'పోషకాల లోపం',
      pest_susceptibility: 'పురుగుల నష్టభయం',
      disease_susceptibility: 'తెగుళ్ల నష్టభయం',
      labour_shortage: 'కూలీల కొరత',
      budget_shortage: 'బడ్జెట్ కొరత',
      market_price_uncertainty: 'మార్కెట్ ధరల హెచ్చుతగ్గులు',
      harvest_delays: 'కోత ఆలస్యం',
      harvest_weather_risk: 'కోత సమయ వాతావరణ ప్రమాదం',
    },
    warnForecastLabel: 'వాతావరణ అంచనా హెచ్చరిక (7-రోజుల వ్యవధి)',
    warnSimLabel: 'అనుకరించిన పరిస్థితి హెచ్చరిక',
    warnBadWeather:
      'కోత సమయంలో వర్షం లేదా గాలి పంట నష్టానికి కారణం కావచ్చు. పొడి వాతావరణంలో కోత పూర్తి చేసి పంటను కప్పి ఉంచండి.',
    warnNearHarvest: 'పంట కోత దశకు చేరుకుంది. కోత మరియు రవాణాకు ముందు 7-రోజుల వాతావరణ అంచనా గమనించండి.',
    warnNone: 'కోత సమయానికి తక్షణ వాతావరణ హెచ్చరిక లేదు.',
  },
};

export function DigitalFarmingWorkspace() {
  const router = useRouter();
  const { language, setLanguage } = useFarm();
  const lang: DFLanguage = language;
  const setLang = setLanguage;
  const t = DF_I18N[lang];
  const w = DF_WS_I18N[lang];
  const numLocale = getIntlLocale(lang);

  const [activeStep, setActiveStep] = useState<ActiveStep>('map');
  const [twinTab, setTwinTab] = useState<DigitalTwinViewTab>('twin_3d');
  const [maizePopulation, setMaizePopulation] = useState<number | undefined>(undefined);

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
    () => sortRecommendations(recommendCrops(activeAreaAcres, profile, avgForecastTemp, lang), sortBy),
    [activeAreaAcres, profile, avgForecastTemp, sortBy, lang]
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
        setActiveStep('simulator');
        setSim((prev) => ({ ...prev, started: true, sown: true, isPlaying: true }));
      } else if (action === 'pause') {
        setSim((prev) => ({ ...prev, isPlaying: false }));
      } else if (action === 'summary') {
        setActiveStep('simulator');
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
    const base = createInitialSimulationState(selectedCrop, profile);
    const reconstructed =
      clamped > 0 ? advanceSimulationDays(base, clamped, selectedCrop, activeAreaAcres, profile) : base;
    setSimHistory([]);
    setSim({ ...reconstructed, scenario: sim.scenario, scenarioIntensity: sim.scenarioIntensity, speedDaysPerSec: sim.speedDaysPerSec });
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
              {w.headerBrand}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">{t.title}</h1>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['en', 'kn', 'hi', 'te'] as DFLanguage[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  lang === code ? 'bg-white text-emerald-900' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {code === 'en' ? 'English' : code === 'kn' ? 'ಕನ್ನಡ' : code === 'hi' ? 'हिन्दी' : 'తెలుగు'}
              </button>
            ))}
          </div>
        </div>

        {/* Confirmed Farm Pill */}
        <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center gap-3 text-xs text-emerald-50">
          <span>
            <strong>{w.farmLabel}</strong> {confirmedFarm.name}
          </span>
          <span>
            <strong>{w.areaLabel}</strong> {activeAreaAcres} {w.acresUnit} ({confirmedFarm.area.sqMeters.toLocaleString(numLocale)} m²)
          </span>
          <span>
            <strong>{w.cropLabel}</strong> {localizeCropName(selectedCrop.name, lang)} ({selectedCrop.durationDays}{w.daysShort})
          </span>
          <span>
            <strong>{w.budgetLabel}</strong> ₹{profile.budgetInr.toLocaleString(numLocale)}
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
              <h2 className="text-lg font-bold">{w.profileTitle}</h2>
              <p className="text-xs text-zinc-500">
                {w.profileNote}
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {w.mappedArea} {activeAreaAcres} {w.acresUnit}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold mb-1">{w.soilTypeLabel}</label>
              <select
                value={profile.soilType}
                onChange={(e) => setProfile({ ...profile, soilType: e.target.value as SoilType })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              >
                {(['Red soil', 'Black soil', 'Sandy soil', 'Clay soil', 'Loamy soil', 'Alluvial soil', 'Unknown soil'] as SoilType[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {w.soilTypes[s] || s}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{w.soilSourceLabel}</label>
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
                <option value="Measured / Lab Tested">{w.soilSources['Measured / Lab Tested']}</option>
                <option value="Farmer Estimate">{w.soilSources['Farmer Estimate']}</option>
                <option value="Unknown">{w.soilSources.Unknown}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{w.soilPhLabel}</label>
              <input
                type="number"
                step="0.1"
                min="3.5"
                max="9.5"
                value={profile.soilPh ?? ''}
                onChange={(e) =>
                  setProfile({ ...profile, soilPh: e.target.value ? Number(e.target.value) : null })
                }
                placeholder={w.phPlaceholder}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{w.irrigationAvailLabel}</label>
              <select
                value={profile.irrigationAvailable ? 'yes' : 'no'}
                onChange={(e) => setProfile({ ...profile, irrigationAvailable: e.target.value === 'yes' })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              >
                <option value="yes">{w.irrigationYes}</option>
                <option value="no">{w.irrigationNo}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{w.irrigationMethodLabel}</label>
              <select
                value={profile.irrigationType}
                onChange={(e) => setProfile({ ...profile, irrigationType: e.target.value as IrrigationType })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              >
                {(['Drip', 'Sprinkler', 'Flood / Canal', 'Rainfed Only'] as IrrigationType[]).map((m) => (
                  <option key={m} value={m}>
                    {w.irrigationTypes[m] || m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{w.waterSourceQtyLabel}</label>
              <div className="flex gap-2">
                <select
                  value={profile.waterSource}
                  onChange={(e) =>
                    setProfile({ ...profile, waterSource: e.target.value as DigitalFarmProfile['waterSource'] })
                  }
                  className="w-1/2 px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                >
                  {['Borewell', 'Canal', 'Farm Pond', 'Rainwater', 'River', 'Unknown'].map((ws) => (
                    <option key={ws} value={ws}>
                      {w.waterSources[ws] || ws}
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
                      {w.waterLevels[lvl] || lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{w.budgetInrLabel}</label>
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
              <label className="block text-xs font-semibold mb-1">{w.expectedSowingLabel}</label>
              <input
                type="date"
                value={profile.expectedSowingDate}
                onChange={(e) => setProfile({ ...profile, expectedSowingDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{w.labourExpLabel}</label>
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
                  <option value="Low">{w.labourLevels.Low}</option>
                  <option value="Moderate">{w.labourLevels.Moderate}</option>
                  <option value="Adequate">{w.labourLevels.Adequate}</option>
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
                  <option value="Beginner">{w.experienceLevels.Beginner}</option>
                  <option value="Intermediate">{w.experienceLevels.Intermediate}</option>
                  <option value="Experienced">{w.experienceLevels.Experienced}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">{w.prevCropLabel}</label>
              <input
                type="text"
                value={profile.previousCrop}
                onChange={(e) => setProfile({ ...profile, previousCrop: e.target.value })}
                placeholder={w.prevCropPh}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">{w.existingProblemsLabel}</label>
              <input
                type="text"
                value={profile.existingProblems}
                onChange={(e) => setProfile({ ...profile, existingProblems: e.target.value })}
                placeholder={w.existingProblemsPh}
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
              {w.continueAdvisor} <ArrowRight className="w-4 h-4" />
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
                {w.recommendModeBtn}
              </button>
              <button
                type="button"
                onClick={() => setCropMode('manual')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  cropMode === 'manual' ? 'bg-emerald-700 text-white' : 'bg-zinc-100 dark:bg-zinc-800'
                }`}
              >
                {w.manualCropBtn}
              </button>
            </div>

            {cropMode === 'recommend' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-zinc-500">{w.rankByLabel}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as CropSortOption)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                >
                  <option value="suitability">{w.sortSuitability}</option>
                  <option value="max_profit">{w.sortMaxProfit}</option>
                  <option value="min_investment">{w.sortMinInvest}</option>
                  <option value="min_water">{w.sortMinWater}</option>
                  <option value="low_risk">{w.sortLowRisk}</option>
                  <option value="short_duration">{w.sortShortDuration}</option>
                </select>
              </div>
            )}
          </div>

          <p className="text-[11px] text-zinc-500 px-1">
            {w.prototypeScaleNotePrefix} {activeAreaAcres} {w.prototypeScaleNoteSuffix}
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
                        {localizeCondition(rec.crop.category, lang)} {rec.crop.isPerennial ? `· ${w.perennial}` : `· ${w.seasonal}`}
                      </span>
                      <h3 className="text-base font-bold">{localizeCropName(rec.crop.name, lang)}</h3>
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
                      <span className="text-zinc-500 block">{w.duration}</span>
                      <strong>{rec.crop.durationDays} {w.daysWord}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">{w.waterNeed}</span>
                      <strong>{rec.crop.waterRequirementMm} mm</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">{w.estInvest}</span>
                      <strong>₹{rec.estimatedInvestmentInr.toLocaleString(numLocale)}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">{w.estProfit}</span>
                      <strong className={rec.estimatedProfitInr >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                        ₹{rec.estimatedProfitInr.toLocaleString(numLocale)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">{w.expectedYield}</span>
                      <strong>{rec.expectedYieldKg.toLocaleString(numLocale)} kg</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">{w.modeledRisk}</span>
                      <strong>{w.riskLevels[rec.modeledRiskLevel as 'Low' | 'Moderate' | 'High'] || rec.modeledRiskLevel}</strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
                    {rec.reasons.slice(0, 2).map((r, i) => (
                      <p key={i}>• {r}</p>
                    ))}
                    <p className="text-zinc-500">
                      <strong>{w.risksLabel}</strong> {rec.crop.keyRisks.slice(0, 2).join(', ')}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {w.dataCompleteness} {rec.dataCompletenessPct}% ({localizeCondition(rec.confidenceLabel, lang)})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startCultivatingCrop(rec.crop.id)}
                  className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                >
                  {w.startDigitalFarming} ({localizeCropName(rec.crop.name, lang)})
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: INTERACTIVE DIGITAL FARMING SIMULATOR */}
      {activeStep === 'simulator' && (
        <div className="space-y-5">
          {/* Crop Switcher & Visualization Mode Bar */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-zinc-600 dark:text-zinc-300">{w.activeCropLabel}</span>
                <select
                  value={selectedCropId}
                  onChange={(e) => startCultivatingCrop(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-semibold bg-zinc-50 dark:bg-zinc-800"
                >
                  {CROP_CATALOG.map((c) => (
                    <option key={c.id} value={c.id}>
                      {localizeCropName(c.name, lang)} ({c.durationDays}{w.daysShort})
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-zinc-500">
                {w.mappedFieldLabel} <strong>{confirmedFarm.name}</strong> ({activeAreaAcres} {w.acresUnit} · {w.sowingShort} {profile.expectedSowingDate || '2026-09-01'})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
              {(
                [
                  { id: 'live_sat', label: w.tabLiveSat },
                  { id: 'sat_timelapse', label: w.tabSatTimelapse },
                  { id: 'twin_3d', label: w.tabTwin3d },
                  { id: 'closeup_3d', label: w.tabCloseup3d },
                ] as { id: DigitalTwinViewTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTwinTab(tab.id)}
                  className={`py-2 px-2.5 rounded-xl border font-semibold transition text-center ${
                    twinTab === tab.id
                      ? 'bg-[#173C2B] text-white border-[#173C2B]'
                      : 'bg-[#F7F5ED] dark:bg-zinc-800 border-[#DCD8CA] dark:border-zinc-700 text-[#20372A] dark:text-zinc-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 cols: Mode A (Observed Satellite), Mode B (3D Field), Mode C (Close-Up), & Controls */}
            <div className="lg:col-span-2 space-y-4">
              {(twinTab === 'live_sat' || twinTab === 'sat_timelapse') && (
                <RealSatelliteMonitorPanel
                  farmId={confirmedFarm.id}
                  farmName={confirmedFarm.name}
                  cropName={selectedCrop.name}
                  sowingDate={profile.expectedSowingDate || '2026-09-01'}
                  areaAcres={activeAreaAcres}
                  points={points}
                  totalDays={sim.totalDays}
                  mode={twinTab === 'live_sat' ? 'live' : 'timelapse'}
                />
              )}

              {(twinTab === 'twin_3d' || twinTab === 'closeup_3d') && (
                <div className="space-y-3">
                  <CropDigitalTwin3D
                    mode={twinTab === 'twin_3d' ? 'field' : 'closeup'}
                    points={points}
                    crop={selectedCrop}
                    sim={sim}
                    areaAcres={activeAreaAcres}
                    projectedYieldKg={liveFinancialSummary.expectedProductionKg}
                    projectedProfitInr={liveFinancialSummary.netProfitInr}
                    estimatedHarvestDate={estimatedHarvestDate}
                    estimatedPopulation={
                      selectedCrop.id === 'maize' && maizePopulation
                        ? maizePopulation
                        : Math.round(activeAreaAcres * 24000)
                    }
                  />
                  {/* Shared Biological Cultivation Timeline Bar */}
                  <div className="p-3.5 rounded-2xl border border-[#DCD8CA] dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSim((p) => ({ ...p, started: true, sown: true, isPlaying: !p.isPlaying }))
                        }
                        className="px-3.5 py-1.5 rounded-xl bg-[#173C2B] text-white font-semibold"
                      >
                        {sim.isPlaying ? t.pause : w.playGrowth}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepDay(5)}
                        className="px-2.5 py-1.5 rounded-xl border border-[#DCD8CA] dark:border-zinc-700"
                      >
                        {w.plus5Days}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSim(createInitialSimulationState(selectedCrop, profile));
                          setSimHistory([]);
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-[#DCD8CA] dark:border-zinc-700"
                      >
                        {w.resetBtn}
                      </button>
                    </div>
                    <div className="flex-1 min-w-[180px] flex items-center gap-2">
                      <span className="text-[11px] font-semibold shrink-0">
                        {w.dayLabel} {sim.currentDay}/{sim.totalDays}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={sim.totalDays}
                        value={sim.currentDay}
                        onChange={(e) => {
                          setSim((p) => ({ ...p, started: true, sown: true }));
                          handleScrubDay(Number(e.target.value));
                        }}
                        className="w-full accent-[#173C2B]"
                      />
                    </div>
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {w.harvestColon} {estimatedHarvestDate}
                    </span>
                  </div>
                </div>
              )}

              {selectedCrop.id === 'maize' && (
                <MaizeAgronomyCard
                  areaAcres={activeAreaAcres}
                  sowingDate={profile.expectedSowingDate || '2026-09-01'}
                  currentDay={sim.currentDay}
                  meanTempC={liveWeather?.temperatureC ?? 25.5}
                  onAgronomyUpdated={(agg) => setMaizePopulation(agg?.estimated_established_population)}
                />
              )}

              {/* Virtual Agricultural Activities */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">{w.virtualMgmtTitle}</h3>
                  <span className="text-[11px] text-zinc-500">
                    {w.virtualMgmtNote}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {(
                    [
                      { id: 'prepare_soil', label: w.activities.prepare_soil, icon: Shovel },
                      { id: 'sow_seeds', label: w.activities.sow_seeds, icon: Sprout },
                      { id: 'irrigate', label: w.activities.irrigate, icon: Droplets },
                      { id: 'apply_fertilizer', label: w.activities.apply_fertilizer, icon: FlaskConical },
                      { id: 'weeding', label: w.activities.weeding, icon: Wheat },
                      { id: 'pest_management', label: w.activities.pest_management, icon: Bug },
                      { id: 'hire_labour', label: w.activities.hire_labour, icon: Users },
                      { id: 'rent_machinery', label: w.activities.rent_machinery, icon: Tractor },
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
                          <strong>{w.dayLabel} {entry.day}:</strong> {w.activities[entry.activity] || entry.label} ({entry.quantityNote}) —{' '}
                          <span className="text-zinc-500">{entry.effectSummary}</span>
                        </span>
                        <span className="font-semibold shrink-0">₹{entry.expenseInr.toLocaleString(numLocale)}</span>
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
                      {sim.harvested ? w.harvestSummaryTitle : w.cropReadyTitle}
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
                        {w.farmCareBtn}
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
                        {w.hireLabourBtn}
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
                        {w.draftListingBtn}
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
                      <span className="text-zinc-500 block">{w.projectedYield}</span>
                      <strong>{liveFinancialSummary.expectedProductionKg.toLocaleString(numLocale)} kg</strong>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl">
                      <span className="text-zinc-500 block">{w.totalEstExpenses}</span>
                      <strong>₹{liveFinancialSummary.totalInvestmentInr.toLocaleString(numLocale)}</strong>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl">
                      <span className="text-zinc-500 block">{w.estRevProfit}</span>
                      <strong>
                        ₹{liveFinancialSummary.grossRevenueInr.toLocaleString(numLocale)} /{' '}
                        <span className={liveFinancialSummary.netProfitInr >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                          ₹{liveFinancialSummary.netProfitInr.toLocaleString(numLocale)}
                        </span>
                      </strong>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl">
                      <span className="text-zinc-500 block">{w.estHarvestDate}</span>
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
                  <h3 className="text-sm font-bold">{w.simHealthTitle}</h3>
                  <span className="text-[10px] text-zinc-500">{w.modeledEstimatesBadge}</span>
                </div>
                {[
                  { label: w.healthBarCrop, val: sim.cropHealthPct, color: 'bg-emerald-600' },
                  { label: w.healthBarGrowth, val: Math.round(sim.growthPct), color: 'bg-green-500' },
                  { label: w.healthBarMoisture, val: Math.round(sim.soilMoisturePct), color: 'bg-sky-500' },
                  { label: w.healthBarWater, val: Math.round(sim.waterAvailabilityPct), color: 'bg-cyan-600' },
                  { label: w.healthBarNutrient, val: Math.round(sim.nutrientStatusPct), color: 'bg-lime-600' },
                  { label: w.healthBarStress, val: Math.round(sim.weatherStressPct), color: 'bg-amber-500' },
                  { label: w.healthBarPest, val: Math.round(sim.pestPressurePct), color: 'bg-rose-500' },
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
                    <span className="text-zinc-500 block">{w.remainingDaysLabel}</span>
                    <strong>{remainingDays} {w.daysWord}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">{w.activitySpendLabel}</span>
                    <strong>₹{sim.expenditureInr.toLocaleString(numLocale)}</strong>
                  </div>
                </div>
              </div>

              {/* Live Weather + Scenario Simulator (Phase 6) */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-1.5">
                    <CloudRain className="w-4 h-4 text-sky-600" /> {w.weatherControlTitle}
                  </h3>
                  <span className="text-[10px] text-zinc-500">
                    {weatherLoading ? w.loading : liveWeather?.source}
                  </span>
                </div>

                {liveWeather?.isLive ? (
                  <div className="grid grid-cols-2 gap-2 text-xs bg-sky-50/70 dark:bg-sky-950/20 p-2.5 rounded-xl">
                    <div>{w.tempLabel} <strong>{liveWeather.temperatureC ?? '--'}°C</strong></div>
                    <div>{w.rainLabel} <strong>{liveWeather.rainfallMm ?? '--'} mm</strong></div>
                    <div>{w.humidityLabel} <strong>{liveWeather.humidityPct ?? '--'}%</strong></div>
                    <div>{w.windLabel} <strong>{liveWeather.windSpeedKmh ?? '--'} km/h</strong></div>
                    <div className="col-span-2 text-[10px] text-zinc-500">
                      {w.et0Label} {liveWeather.et0Mm ?? '--'} mm · {liveWeather.forecastPeriod} ({w.updatedLabel} {liveWeather.lastUpdated})
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-700">{w.weatherOfflineMsg}</p>
                )}

                <div className="space-y-2 text-xs">
                  <label className="block font-semibold">{w.simWeatherLabel}</label>
                  <select
                    value={sim.scenario}
                    onChange={(e) => setSim((p) => ({ ...p, scenario: e.target.value as WeatherScenarioType }))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                  >
                    {WEATHER_SCENARIOS.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {w.weatherScenarios[sc.id] || sc.label}
                      </option>
                    ))}
                  </select>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span>{w.scenarioIntensityLabel}</span>
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
                  {harvestWarning.sourceLabel.includes('Forecast') ? w.warnForecastLabel : w.warnSimLabel}
                </div>
                <p>
                  {harvestWarning.active
                    ? w.warnBadWeather
                    : sim.growthPct >= 75
                      ? w.warnNearHarvest
                      : w.warnNone}
                </p>
              </div>
            </div>
          </div>

          {/* 14-Risk Intelligence Grid (Phase 7) */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
            <h3 className="text-sm font-bold">{w.riskGridTitle}</h3>
            <p className="text-[11px] text-zinc-500">
              {w.riskGridNote}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {risks.map((r) => (
                <div key={r.id} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-zinc-900 dark:text-zinc-100">{w.riskNames[r.id] || r.name}</strong>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.level === 'High'
                          ? 'bg-red-100 text-red-800'
                          : r.level === 'Moderate'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {w.riskLevels[r.level] || r.level}
                    </span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">{r.cause}</p>
                  <p className="text-[11px] text-zinc-500">{w.inputsColon} {r.contributingInputs}</p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300">{w.mitigationColon} {r.mitigation}</p>
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
                <h2 className="text-base font-bold">{w.finIntelTitle} ({localizeCropName(selectedCrop.name, lang)})</h2>
                <p className="text-xs text-zinc-500">
                  {w.finIntelSubPrefix}{activeAreaAcres} {w.acresUnit}{w.finIntelSubSuffix}
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
                  'landPreparationInr',
                  'seedQtyPerAcreKg',
                  'seedPricePerKgInr',
                  'fertilizerInr',
                  'irrigationInr',
                  'labourInr',
                  'machineryInr',
                  'pestManagementInr',
                  'electricityFuelInr',
                  'harvestingInr',
                  'packagingInr',
                  'transportationInr',
                  'otherInr',
                  'expectedYieldPerAcreKg',
                  'expectedSellingPricePerKgInr',
                ] as (keyof DetailedFinancialInputs)[]
              ).map((field) => (
                <div key={field}>
                  <label className="block text-zinc-500 mb-1">{w.finFieldLabels[field]}</label>
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
                <span className="text-[11px] text-zinc-500 block">{w.totalSeedNeeded}</span>
                <strong className="text-sm">{liveFinancialSummary.totalSeedKg} kg</strong>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <span className="text-[11px] text-zinc-500 block">{w.totalInvestKpi}</span>
                <strong className="text-sm">₹{liveFinancialSummary.totalInvestmentInr.toLocaleString(numLocale)}</strong>
                <span className="text-[10px] text-zinc-500 block">
                  ₹{liveFinancialSummary.investmentPerAcreInr.toLocaleString(numLocale)}{w.perAcShort}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <span className="text-[11px] text-zinc-500 block">{w.grossRevKpi}</span>
                <strong className="text-sm">₹{liveFinancialSummary.grossRevenueInr.toLocaleString(numLocale)}</strong>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                <span className="text-[11px] text-zinc-500 block">{w.estNetProfitKpi}</span>
                <strong className={`text-sm ${liveFinancialSummary.netProfitInr >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  ₹{liveFinancialSummary.netProfitInr.toLocaleString(numLocale)} ({liveFinancialSummary.roiPct}%)
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <span className="text-[11px] text-zinc-500 block">{w.breakEvenKpi}</span>
                <strong className="text-sm">₹{liveFinancialSummary.breakEvenSellingPricePerKg}/kg</strong>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <span className="text-[11px] text-zinc-500 block">{w.remainingBudgetKpi}</span>
                <strong className={`text-sm ${liveFinancialSummary.remainingBudgetInr >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  ₹{liveFinancialSummary.remainingBudgetInr.toLocaleString(numLocale)}
                </strong>
              </div>
            </div>
          </div>

          {/* Phase 10: 3-Crop Plan Comparison */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-700" /> {w.compareTitle} ({activeAreaAcres} {w.acresUnit})
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
                        {w.planWord} {String.fromCharCode(65 + idx)}: {localizeCropName(c.name, lang)}
                      </option>
                    ))}
                  </select>
                ))}
                <select
                  value={compareObjective}
                  onChange={(e) => setCompareObjective(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold"
                >
                  <option value="profit">{w.goalHighestProfit}</option>
                  <option value="low_investment">{w.goalLowestInvest}</option>
                  <option value="low_water">{w.goalLowestWater}</option>
                </select>
              </div>
            </div>

            {strongestPlan && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                <strong>{w.strongestOption}:</strong> {localizeCropName(strongestPlan.cropName, lang)} — {w.estProfitInline} ₹
                {strongestPlan.estimatedProfitInr.toLocaleString(numLocale)}, {w.investInline} ₹
                {strongestPlan.totalInvestmentInr.toLocaleString(numLocale)}, {w.waterInline} {strongestPlan.waterRequirementMm} mm.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500">
                    <th className="py-2 pr-3">{w.colCrop}</th>
                    <th className="py-2 pr-3">{w.colDuration}</th>
                    <th className="py-2 pr-3">{w.colWater}</th>
                    <th className="py-2 pr-3">{w.colInvest}</th>
                    <th className="py-2 pr-3">{w.colYield}</th>
                    <th className="py-2 pr-3">{w.colRevenue}</th>
                    <th className="py-2 pr-3">{w.colEstProfit}</th>
                    <th className="py-2 pr-3">{w.colBreakEven}</th>
                    <th className="py-2">{w.colKeyRisks}</th>
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
                      <td className="py-2 pr-3">{localizeCropName(row.cropName, lang)}</td>
                      <td className="py-2 pr-3">{row.durationDays}{w.daysShort}</td>
                      <td className="py-2 pr-3">{row.waterRequirementMm} mm</td>
                      <td className="py-2 pr-3">₹{row.totalInvestmentInr.toLocaleString(numLocale)}</td>
                      <td className="py-2 pr-3">{row.expectedProductionKg.toLocaleString(numLocale)} kg</td>
                      <td className="py-2 pr-3">₹{row.estimatedRevenueInr.toLocaleString(numLocale)}</td>
                      <td className="py-2 pr-3 text-emerald-700">₹{row.estimatedProfitInr.toLocaleString(numLocale)}</td>
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
                  <Bar dataKey="totalInvestmentInr" name={w.chartInvestName} fill="#f59e0b" />
                  <Bar dataKey="estimatedProfitInr" name={w.chartProfitName} fill="#15803d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Phase 11: What-If Scenario Engine */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
            <h2 className="text-base font-bold">{w.whatIfTitle}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {whatIfScenarios.map((sc, idx) => {
                const res = whatIfResults[idx];
                return (
                  <div key={sc.name} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs">
                    <div className="font-bold text-sm">{w.whatIfNames[sc.name] || sc.name} {w.conditionsSuffix}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        {w.yieldFactorLabel}
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
                        {w.priceFactorLabel}
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
                      <div>{w.whatIfInvest} <strong>₹{res.adjustedInvestmentInr.toLocaleString(numLocale)}</strong></div>
                      <div>{w.whatIfRevenue} <strong>₹{res.adjustedRevenueInr.toLocaleString(numLocale)}</strong></div>
                      <div>
                        {w.whatIfProfit}{' '}
                        <strong className={res.adjustedProfitInr >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                          ₹{res.adjustedProfitInr.toLocaleString(numLocale)}
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
                <h2 className="text-base font-bold">{w.reportTitle}</h2>
                <p className="text-xs text-zinc-500">{w.analysisDate} {new Date().toLocaleDateString(numLocale)}</p>
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
                <strong>{w.rep1Title}</strong> {localizeCropName(selectedCrop.name, lang)} — {confirmedFarm.name} ({activeAreaAcres} {w.acresUnit}, {confirmedFarm.perimeterMeters} m, {activeLat}, {activeLon}).
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <strong>{w.rep2Title}</strong> ₹{liveFinancialSummary.totalInvestmentInr.toLocaleString(numLocale)} · {selectedCrop.waterRequirementMm} mm ({selectedCrop.durationDays} {w.daysWord}).
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <strong>{w.rep3Title}</strong> {liveFinancialSummary.expectedProductionKg.toLocaleString(numLocale)} kg · ₹{liveFinancialSummary.grossRevenueInr.toLocaleString(numLocale)} · ₹{liveFinancialSummary.netProfitInr.toLocaleString(numLocale)}.
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <strong>{w.rep4Title}</strong>{' '}
                {risks
                  .filter((r) => r.level !== 'Low')
                  .slice(0, 3)
                  .map((r) => `${w.riskNames[r.id] || r.name} (${w.riskLevels[r.level] || r.level})`)
                  .join(', ') || w.noHighRisks}. {w.altPlansCompared} {comparisonRows.map((c) => localizeCropName(c.cropName, lang)).join(', ')}.
              </div>
            </div>

            <p className="text-[11px] text-zinc-500">
              <strong>{w.dataSourcesFooterTitle}</strong> {w.dataSourcesFooterBody}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
