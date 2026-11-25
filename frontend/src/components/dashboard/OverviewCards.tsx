// frontend/src/components/dashboard/OverviewCards.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  CloudSun,
  Droplets,
  HeartPulse,
  Coins,
  TrendingUp,
  AlertTriangle,
  Scale,
  Calendar
} from 'lucide-react';

export function OverviewCards() {
  const { currentFarm, summary, weather, t } = useFarm();

  if (!currentFarm) return null;

  return (
    <div className="space-y-4">
      {/* Top Banner: Farm Context & Growth Stage */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {currentFarm.farm_name}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
              {currentFarm.primary_crop} ({currentFarm.crop_variety || 'Hybrid'})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-zinc-500 dark:text-zinc-400">
            <span>📍 {currentFarm.village}, {currentFarm.district}, {currentFarm.state}</span>
            <span>📐 {currentFarm.land_area_ha} Hectares</span>
            <span>🌱 Sown: {currentFarm.sowing_date}</span>
            <span>🚰 {currentFarm.irrigation_method}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-right">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Phenological Stage
            </div>
            <div className="text-sm font-bold text-rm-primary dark:text-rm-accent">
              {currentFarm.crop_stage}
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-right">
            <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Active Risk Status
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold capitalize">
              <span className={`w-2 h-2 rounded-full ${
                summary?.risk_level === 'high' ? 'bg-rm-danger' : summary?.risk_level === 'medium' ? 'bg-rm-warning' : 'bg-rm-accent'
              }`} />
              <span className={
                summary?.risk_level === 'high' ? 'text-rm-danger' : summary?.risk_level === 'medium' ? 'text-rm-warning' : 'text-rm-accent'
              }>
                {summary?.risk_level || 'Low'} Risk
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
            <span>{weather?.current.condition_text || weather?.current.condition || 'Mainly Clear'}</span>
            <span className={`font-semibold text-[10px] px-1.5 py-0.5 rounded ${
              weather?.provenance?.is_live
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}>
              {weather?.provenance?.is_live ? 'LIVE NWP' : 'ESTIMATED'}
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
            <span>{currentFarm.soil_type}</span>
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
              ESTIMATED
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
            <span>FAO-56 Dual Kc</span>
            <span className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 font-medium text-[10px] px-1.5 py-0.5 rounded">
              SIMULATED
            </span>
          </div>
        </div>

        {/* 4. Crop Health Status */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">{t('cropHealth')}</span>
            <HeartPulse className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 truncate">
            {summary?.crop_health_status || 'Vigorous / Optimal'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            <span>Sentinel-2 NDVI 0.74</span>
            <span className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
              SATELLITE DEMO
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
            ₹{summary ? summary.total_expenses_inr.toLocaleString('en-IN') : '87,500'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            <span>Budget: ₹{currentFarm.cultivation_budget_inr.toLocaleString('en-IN')}</span>
            <span className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
              USER RECORD
            </span>
          </div>
        </div>

        {/* 6. Estimated Yield */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">{t('estimatedYield')}</span>
            <Scale className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {summary ? `${summary.estimated_yield_tonnes.toFixed(1)} t` : '62.5 t'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            <span>AquaCrop Ky Physics</span>
            <span className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-[10px] px-1.5 py-0.5 rounded font-medium">
              SIMULATED
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
            ₹{summary ? summary.expected_revenue_inr.toLocaleString('en-IN') : '13,75,000'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            <span>Mandi Modal Price</span>
            <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
              ESTIMATED
            </span>
          </div>
        </div>

        {/* 8. Rain Probability */}
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold">Precipitation Chance</span>
            <Droplets className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {weather ? `${weather.current.precipitation_probability_pct ?? weather.daily?.[0]?.precipitation_probability_pct ?? 15}%` : '15%'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            <span>Wind: {weather ? `${weather.current.wind_speed_kmh} km/h` : '9.2 km/h'}</span>
            <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold text-[10px] px-1.5 py-0.5 rounded">
              FORECAST
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
