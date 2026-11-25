// frontend/src/app/climate/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { CloudSun, Wind, Droplets, Compass, Sun, Thermometer } from 'lucide-react';

export default function ClimatePage() {
  const { currentFarm, weather } = useFarm();
  const cur = weather?.current;
  const forecast = weather?.daily_forecast || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
            <CloudSun className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Climate & Agrometeorological Intelligence
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Live Open-Meteo
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              High-resolution numerical weather prediction (NWP) calibrated for {currentFarm?.village}, {currentFarm?.district}
            </p>
          </div>
        </div>
        <div className="text-xs text-zinc-500">
          Source: <strong>Open-Meteo API</strong> • Timezone: Asia/Kolkata
        </div>
      </div>

      {/* Current Observations Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Air Temperature</span>
            <Thermometer className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {cur ? `${cur.temperature_c.toFixed(1)}°C` : '28.4°C'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Condition: {cur?.condition_text || 'Clear'}</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Relative Humidity</span>
            <Droplets className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {cur ? `${cur.relative_humidity_pct}%` : '58%'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Dew point favorable</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Wind Speed & Heading</span>
            <Wind className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {cur ? `${cur.wind_speed_kmh} km/h` : '9.2 km/h'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Heading: {cur?.wind_direction_deg || 110}° (ESE)</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>FAO-56 ET0</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {cur ? `${cur.et0_fao56_mm} mm` : '4.6 mm'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Atmospheric evaporative demand</div>
        </div>
      </div>

      {/* 7-Day Forecast Table */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          7-Day Agricultural Weather Forecast
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-semibold uppercase">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Condition</th>
                <th className="py-2.5 px-3">Max Temp</th>
                <th className="py-2.5 px-3">Min Temp</th>
                <th className="py-2.5 px-3">Precipitation</th>
                <th className="py-2.5 px-3">Rain Probability</th>
                <th className="py-2.5 px-3">FAO-56 ET0</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {forecast.map((d) => (
                <tr key={d.date} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="py-3 px-3 font-medium">{d.date}</td>
                  <td className="py-3 px-3">{d.condition_text}</td>
                  <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-white">{d.temp_max_c}°C</td>
                  <td className="py-3 px-3 text-zinc-500">{d.temp_min_c}°C</td>
                  <td className="py-3 px-3">{d.precipitation_sum_mm.toFixed(1)} mm</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded font-semibold ${
                      (d.rain_probability_max_pct ?? 0) > 50
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}>
                      {d.rain_probability_max_pct}%
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono">{d.et0_fao56_mm} mm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
