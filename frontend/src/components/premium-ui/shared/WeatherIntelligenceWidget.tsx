// frontend/src/components/premium-ui/shared/WeatherIntelligenceWidget.tsx
'use client';

import React from 'react';
import {
  CloudRain,
  Cloud,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  AlertTriangle,
  Sprout,
  TrendingUp,
} from 'lucide-react';

export interface WeatherWidgetProps {
  temperatureC: number | null;
  rainfallMm: number | null;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  conditionText?: string;
  forecastSummary?: string;
  agriculturalRiskNote?: string;
  lastUpdated?: string;
  status: 'live' | 'cached' | 'loading' | 'unavailable';
}

export function WeatherIntelligenceWidget({
  temperatureC,
  rainfallMm,
  humidityPct,
  windSpeedKmh,
  conditionText,
  forecastSummary,
  agriculturalRiskNote,
  lastUpdated,
  status,
}: WeatherWidgetProps) {
  const condLower = (conditionText || '').toLowerCase();
  const isRain = (rainfallMm ?? 0) > 0.5 || condLower.includes('rain') || condLower.includes('drizzle');
  const isCloudy = !isRain && (condLower.includes('cloud') || condLower.includes('overcast'));
  const isWindy = (windSpeedKmh ?? 0) >= 18;

  return (
    <div className="rounded-xl border border-[#E9E5D8] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-[#F7F5ED] dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
            {status === 'unavailable' ? (
              <Cloud className="w-5 h-5 text-zinc-400" />
            ) : isRain ? (
              <div className="relative flex flex-col items-center">
                <CloudRain className="w-5 h-5 text-sky-700" />
                <div className="flex gap-1 -mt-0.5">
                  <span className="w-0.5 h-1.5 bg-sky-500 rounded-full rm-weather-rain-drop" />
                  <span className="w-0.5 h-1.5 bg-sky-500 rounded-full rm-weather-rain-drop" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            ) : isCloudy ? (
              <Cloud className="w-5 h-5 text-slate-600 rm-weather-cloud" />
            ) : (
              <Sun className="w-5 h-5 text-[#C9A35C] rm-weather-sun" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#26332B] dark:text-zinc-100">
              Field Weather & Agrometeorology
            </h3>
            <p className="text-xs text-[#8D7357] dark:text-zinc-400">
              {conditionText || (status === 'unavailable' ? 'Telemetry unavailable' : 'Observed & Forecast')}
            </p>
          </div>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
            status === 'live'
              ? 'bg-emerald-50 text-[#173C2B] border border-emerald-200'
              : status === 'cached'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : status === 'loading'
                  ? 'bg-zinc-100 text-zinc-600'
                  : 'bg-zinc-100 text-zinc-600'
          }`}
        >
          {status === 'live'
            ? 'Live Forecast'
            : status === 'cached'
              ? 'Cached'
              : status === 'loading'
                ? 'Syncing...'
                : 'Unavailable'}
        </span>
      </div>

      {status === 'loading' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-[#F7F5ED] dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : status === 'unavailable' ? (
        <div className="p-3 rounded-lg bg-[#F7F5ED] dark:bg-zinc-800/70 text-xs text-[#26332B] dark:text-zinc-300">
          Weather telemetry is currently unavailable. Connect to the internet or use the Digital Farming scenario simulator.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#F7F5ED] dark:bg-zinc-800/60">
            <span className="text-[#8D7357] flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-[#C9A35C]" /> Temperature
            </span>
            <strong className="text-base mt-0.5 block text-[#26332B] dark:text-white">
              {temperatureC !== null ? `${temperatureC}°C` : '--'}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-[#F7F5ED] dark:bg-zinc-800/60">
            <span className="text-[#8D7357] flex items-center gap-1">
              <CloudRain className="w-3.5 h-3.5 text-sky-700" /> Rainfall
            </span>
            <strong className="text-base mt-0.5 block text-[#26332B] dark:text-white">
              {rainfallMm !== null ? `${rainfallMm} mm` : '--'}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-[#F7F5ED] dark:bg-zinc-800/60">
            <span className="text-[#8D7357] flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-[#36784D]" /> Humidity
            </span>
            <strong className="text-base mt-0.5 block text-[#26332B] dark:text-white">
              {humidityPct !== null ? `${humidityPct}%` : '--'}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-[#F7F5ED] dark:bg-zinc-800/60">
            <span className="text-[#8D7357] flex items-center gap-1">
              <Wind className={`w-3.5 h-3.5 text-[#36784D] ${isWindy ? 'rm-weather-cloud' : ''}`} /> Wind
            </span>
            <strong className="text-base mt-0.5 block text-[#26332B] dark:text-white">
              {windSpeedKmh !== null ? `${windSpeedKmh} km/h` : '--'}
            </strong>
          </div>
        </div>
      )}

      {forecastSummary && (
        <p className="text-xs text-zinc-600 dark:text-zinc-300">{forecastSummary}</p>
      )}
      {agriculturalRiskNote && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{agriculturalRiskNote}</span>
        </div>
      )}
      {lastUpdated && (
        <div className="text-[11px] text-[#8D7357]">Last updated: {lastUpdated}</div>
      )}
    </div>
  );
}

export interface IntelligenceMetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  provenance: 'Measured' | 'Forecast' | 'Estimated' | 'Simulated';
  icon?: 'sprout' | 'droplet' | 'trend' | 'alert';
}

export function IntelligenceMetricCard({
  title,
  value,
  subtitle,
  provenance,
  icon = 'sprout',
}: IntelligenceMetricCardProps) {
  const Icon =
    icon === 'droplet'
      ? Droplets
      : icon === 'trend'
        ? TrendingUp
        : icon === 'alert'
          ? AlertTriangle
          : Sprout;

  return (
    <div className="rounded-xl border border-[#E9E5D8] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 rm-card-hover">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-[#8D7357] flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-[#36784D]" />
          {title}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#F7F5ED] dark:bg-zinc-800 text-[#26332B] dark:text-zinc-300 font-medium">
          {provenance}
        </span>
      </div>
      <div className="text-lg font-semibold text-[#26332B] dark:text-zinc-100">{value}</div>
      {subtitle && <div className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</div>}
    </div>
  );
}
