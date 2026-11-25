// frontend/src/components/premium-ui/shared/WeatherIntelligenceWidget.tsx
'use client';

import React from 'react';
import {
  CloudRain,
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
  return (
    <div className="rounded-2xl border border-emerald-900/10 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center text-sky-700 dark:text-sky-300">
            {(rainfallMm ?? 0) > 1 ? <CloudRain className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Agrometeorological Intelligence
            </h3>
            <p className="text-[11px] text-zinc-500">
              {conditionText || (status === 'unavailable' ? 'Telemetry unavailable' : 'Observed & Forecast')}
            </p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
            status === 'live'
              ? 'bg-emerald-100 text-emerald-800'
              : status === 'cached'
                ? 'bg-amber-100 text-amber-800'
                : status === 'loading'
                  ? 'bg-zinc-100 text-zinc-600'
                  : 'bg-red-100 text-red-700'
          }`}
        >
          {status === 'live'
            ? 'Live Forecast'
            : status === 'cached'
              ? 'Cached Data'
              : status === 'loading'
                ? 'Syncing...'
                : 'Unavailable'}
        </span>
      </div>

      {status === 'loading' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : status === 'unavailable' ? (
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 text-xs text-zinc-600 dark:text-zinc-300">
          Weather telemetry is currently unavailable. Connect to the internet or use the Digital Farming scenario simulator for planning.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#F8F7F2] dark:bg-zinc-800/60">
            <span className="text-zinc-500 flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-amber-600" /> Temperature
            </span>
            <strong className="text-base mt-0.5 block">
              {temperatureC !== null ? `${temperatureC}°C` : '--'}
            </strong>
          </div>
          <div className="p-3 rounded-xl bg-[#F8F7F2] dark:bg-zinc-800/60">
            <span className="text-zinc-500 flex items-center gap-1">
              <CloudRain className="w-3.5 h-3.5 text-sky-600" /> Rainfall
            </span>
            <strong className="text-base mt-0.5 block">
              {rainfallMm !== null ? `${rainfallMm} mm` : '--'}
            </strong>
          </div>
          <div className="p-3 rounded-xl bg-[#F8F7F2] dark:bg-zinc-800/60">
            <span className="text-zinc-500 flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-cyan-600" /> Humidity
            </span>
            <strong className="text-base mt-0.5 block">
              {humidityPct !== null ? `${humidityPct}%` : '--'}
            </strong>
          </div>
          <div className="p-3 rounded-xl bg-[#F8F7F2] dark:bg-zinc-800/60">
            <span className="text-zinc-500 flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-emerald-700" /> Wind
            </span>
            <strong className="text-base mt-0.5 block">
              {windSpeedKmh !== null ? `${windSpeedKmh} km/h` : '--'}
            </strong>
          </div>
        </div>
      )}

      {forecastSummary && (
        <p className="text-xs text-zinc-600 dark:text-zinc-300">{forecastSummary}</p>
      )}
      {agriculturalRiskNote && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{agriculturalRiskNote}</span>
        </div>
      )}
      {lastUpdated && (
        <div className="text-[10px] text-zinc-400">Last updated: {lastUpdated}</div>
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
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 rm-card-hover">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-[#166534]" />
          {title}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
          {provenance}
        </span>
      </div>
      <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
      {subtitle && <div className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</div>}
    </div>
  );
}
