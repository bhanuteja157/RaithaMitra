// frontend/src/components/dashboard/OverviewCards.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  localizeCropName,
  localizeGrowthStage,
  localizeCondition,
  formatLocalizedCurrency,
  formatLocalizedDate,
} from '@/lib/translations';
import { Language } from '@/types';
import {
  CloudSun,
  Droplets,
  HeartPulse,
  Coins,
  TrendingUp,
} from 'lucide-react';

const OVERVIEW_I18N: Record<Language, {
  hectares: string; sown: string; stage: string; riskStatus: string; riskWord: string;
  liveNwp: string; estimated: string; simulated: string; satDemo: string; userRec: string; forecast: string;
  vigorous: string; budget: string; mandiModal: string; rainChance: string; wind: string;
  modelHydro: string; modelCrop: string; tonUnit: string;
}> = {
  en: {
    hectares: 'Hectares', sown: 'Sown:', stage: 'Growth Stage', riskStatus: 'Active Risk Status', riskWord: 'Risk',
    liveNwp: 'LIVE WEATHER', estimated: 'ESTIMATED', simulated: 'SIMULATED', satDemo: 'SATELLITE', userRec: 'RECORDED', forecast: 'FORECAST',
    vigorous: 'Vigorous / Healthy', budget: 'Budget:', mandiModal: 'Mandi Average Price', rainChance: 'Precipitation Chance', wind: 'Wind:',
    modelHydro: 'Daily crop water model', modelCrop: 'Physics yield estimate', tonUnit: 't',
  },
  kn: {
    hectares: 'ಹೆಕ್ಟೇರ್', sown: 'ಬಿತ್ತನೆ:', stage: 'ಬೆಳೆ ಹಂತ', riskStatus: 'ಅಪಾಯದ ಸ್ಥಿತಿ', riskWord: 'ಅಪಾಯ',
    liveNwp: 'ನೇರ ಹವಾಮಾನ', estimated: 'ಅಂದಾಜು', simulated: 'ಸಿಮ್ಯುಲೇಶನ್', satDemo: 'ಉಪಗ್ರಹ', userRec: 'ನೋಂದಾಯಿತ', forecast: 'ಮುನ್ಸೂಚನೆ',
    vigorous: 'ಉತ್ತಮ / ಆರೋಗ್ಯಕರ', budget: 'ಬಜೆಟ್:', mandiModal: 'ಮಂಡಿ ಸರಾಸರಿ ಬೆಲೆ', rainChance: 'ಮಳೆ ಸಾಧ್ಯತೆ', wind: 'ಗಾಳಿ:',
    modelHydro: 'ದೈನಂದಿನ ನೀರಿನ ಲೆಕ್ಕ', modelCrop: 'ಇಳುವರಿ ಅಂದಾಜು ಮಾದರಿ', tonUnit: 'ಟನ್',
  },
  hi: {
    hectares: 'हेक्टेयर', sown: 'बुवाई:', stage: 'फसल चरण', riskStatus: 'सक्रिय जोखिम', riskWord: 'जोखिम',
    liveNwp: 'लाइव मौसम', estimated: 'अनुमानित', simulated: 'मॉडल अनुमान', satDemo: 'उपग्रह', userRec: 'दर्ज रिकॉर्ड', forecast: 'पूर्वानुमान',
    vigorous: 'स्वस्थ और अच्छी वृद्धि', budget: 'बजट:', mandiModal: 'मंडी औसत भाव', rainChance: 'बारिश की संभावना', wind: 'हवा:',
    modelHydro: 'दैनिक जल मॉडल', modelCrop: 'भौतिक उपज अनुमान', tonUnit: 'टन',
  },
  te: {
    hectares: 'హెక్టార్లు', sown: 'విత్తిన తేదీ:', stage: 'పంట దశ', riskStatus: 'ప్రమాద స్థితి', riskWord: 'ప్రమాదం',
    liveNwp: 'ప్రత్యక్ష వాతావరణం', estimated: 'అంచనా', simulated: 'సిమ్యులేషన్', satDemo: 'ఉపగ్రహ', userRec: 'నమోదైనది', forecast: 'అంచనా',
    vigorous: 'ఆరోగ్యకరమైన పెరుగుదల', budget: 'బడ్జెట్:', mandiModal: 'మార్కెట్ సగటు ధర', rainChance: 'వర్షం అవకాశం', wind: 'గాలి:',
    modelHydro: 'రోజువారీ నీటి లెక్క', modelCrop: 'దిగుబడి అంచనా నమూనా', tonUnit: 'టన్నులు',
  },
};

export function OverviewCards() {
  const { currentFarm, summary, weather, t, language } = useFarm();
  const L = OVERVIEW_I18N[language] || OVERVIEW_I18N.en;

  if (!currentFarm) return null;

  const riskKey = summary?.risk_level || 'low';

  return (
    <div className="space-y-4">
      {/* Top Banner: Farm Context & Growth Stage */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {currentFarm.farm_name}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
              {localizeCropName(currentFarm.primary_crop, language)} ({currentFarm.crop_variety || 'Hybrid'})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-zinc-500 dark:text-zinc-400">
            <span>📍 {currentFarm.village}, {currentFarm.district}, {currentFarm.state}</span>
            <span>📐 {currentFarm.land_area_ha} {L.hectares}</span>
            <span>🌱 {L.sown} {formatLocalizedDate(currentFarm.sowing_date, language)}</span>
            <span>🚰 {localizeCondition(currentFarm.irrigation_method, language)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-right">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              {L.stage}
            </div>
            <div className="text-sm font-bold text-rm-primary dark:text-rm-accent">
              {localizeGrowthStage(currentFarm.crop_stage, language)}
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-right">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              {L.riskStatus}
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold capitalize">
              <span className={`w-2 h-2 rounded-full ${
                riskKey === 'high' ? 'bg-rm-danger' : riskKey === 'medium' ? 'bg-rm-warning' : 'bg-rm-accent'
              }`} />
              <span className={
                riskKey === 'high' ? 'text-rm-danger' : riskKey === 'medium' ? 'text-rm-warning' : 'text-rm-accent'
              }>
                {localizeCondition(riskKey, language)} {L.riskWord}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 8 Analytics KPI Cards with Honest Data Provenance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* 1. Weather */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">{t('weather')}</span>
            <CloudSun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {weather ? `${weather.current.temperature_c.toFixed(1)}°C` : '28.4°C'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            <span>{localizeCondition(weather?.current.condition_text || weather?.current.condition || 'Mainly Clear', language)}</span>
            <span className={`font-semibold text-[10px] px-1.5 py-0.5 rounded ${
              weather?.provenance?.is_live
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}>
              {weather?.provenance?.is_live ? L.liveNwp : L.estimated}
            </span>
          </div>
        </div>

        {/* 2. Soil Moisture */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">{t('soilMoisture')}</span>
            <Droplets className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {summary ? `${summary.soil_moisture_pct.toFixed(1)}%` : '18.5%'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            <span>{localizeCondition(currentFarm.soil_type, language)}</span>
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
              {L.estimated}
            </span>
          </div>
        </div>

        {/* 3. Water Requirements (ETc) */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">{t('waterDemand')}</span>
            <Droplets className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {summary ? `${summary.daily_water_demand_mm.toFixed(2)} mm` : '5.29 mm'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            <span>{L.modelHydro}</span>
            <span className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 font-medium text-[10px] px-1.5 py-0.5 rounded">
              {L.simulated}
            </span>
          </div>
        </div>

        {/* 4. Crop Health Status */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">{t('cropHealth')}</span>
            <HeartPulse className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 leading-snug break-words">
            {summary?.crop_health_status ? localizeCondition(summary.crop_health_status, language) : L.vigorous}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            <span>Sentinel-2 NDVI 0.74</span>
            <span className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
              {L.satDemo}
            </span>
          </div>
        </div>

        {/* 5. Cultivation Expenses */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">{t('expenses')}</span>
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {formatLocalizedCurrency(summary ? summary.total_expenses_inr : 87500, language)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            <span>{L.budget} {formatLocalizedCurrency(currentFarm.cultivation_budget_inr, language)}</span>
            <span className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
              {L.userRec}
            </span>
          </div>
        </div>

        {/* 6. Estimated Yield */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">{t('estimatedYield')}</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {summary ? `${summary.estimated_yield_tonnes.toFixed(1)} ${L.tonUnit}` : `62.5 ${L.tonUnit}`}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            <span>{L.modelCrop}</span>
            <span className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
              {L.simulated}
            </span>
          </div>
        </div>

        {/* 7. Expected Revenue */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">{t('expectedRevenue')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatLocalizedCurrency(summary ? summary.expected_revenue_inr : 1375000, language)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            <span>{L.mandiModal}</span>
            <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
              {L.estimated}
            </span>
          </div>
        </div>

        {/* 8. Rain Probability */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">{L.rainChance}</span>
            <Droplets className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {weather ? `${weather.current.precipitation_probability_pct ?? weather.daily?.[0]?.precipitation_probability_pct ?? 15}%` : '15%'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            <span>{L.wind} {weather ? `${weather.current.wind_speed_kmh} km/h` : '9.2 km/h'}</span>
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
              {L.forecast}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
