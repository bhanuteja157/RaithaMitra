// frontend/src/app/climate/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { formatLocalizedDate, localizeCondition } from '@/lib/translations';
import { CloudSun, Wind, Droplets, Compass, Sun, Thermometer } from 'lucide-react';

const CLIMATE_I18N: Record<
  Language,
  {
    title: string;
    liveBadge: string;
    subtitlePrefix: string;
    source: string;
    timezone: string;
    airTemp: string;
    condition: string;
    humidity: string;
    dewPointFavorable: string;
    windSpeed: string;
    heading: string;
    et0Title: string;
    et0Subtitle: string;
    forecastTitle: string;
    colDate: string;
    colCondition: string;
    colMaxTemp: string;
    colMinTemp: string;
    colPrecip: string;
    colRainProb: string;
    colEt0: string;
    mmUnit: string;
    kmhUnit: string;
  }
> = {
  en: {
    title: 'Climate & Agrometeorological Intelligence',
    liveBadge: 'Live Open-Meteo',
    subtitlePrefix: 'High-resolution numerical weather prediction (NWP) calibrated for',
    source: 'Source:',
    timezone: 'Timezone: Asia/Kolkata',
    airTemp: 'Air Temperature',
    condition: 'Condition:',
    humidity: 'Relative Humidity',
    dewPointFavorable: 'Dew point favorable',
    windSpeed: 'Wind Speed & Heading',
    heading: 'Heading:',
    et0Title: 'FAO-56 ET0',
    et0Subtitle: 'Atmospheric evaporative demand',
    forecastTitle: '7-Day Agricultural Weather Forecast',
    colDate: 'Date',
    colCondition: 'Condition',
    colMaxTemp: 'Max Temp',
    colMinTemp: 'Min Temp',
    colPrecip: 'Precipitation',
    colRainProb: 'Rain Probability',
    colEt0: 'FAO-56 ET0',
    mmUnit: 'mm',
    kmhUnit: 'km/h',
  },
  kn: {
    title: 'ಹವಾಮಾನ ಮತ್ತು ಕೃಷಿ-ಹವಾಮಾನ ಬುದ್ಧಿಮತ್ತೆ',
    liveBadge: 'ನೇರ Open-Meteo',
    subtitlePrefix: 'ಉನ್ನತ-ನಿಖರ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ (NWP) — ಸ್ಥಳ:',
    source: 'ಮೂಲ:',
    timezone: 'ಸಮಯ ವಲಯ: Asia/Kolkata',
    airTemp: 'ಗಾಳಿಯ ಉಷ್ಣತೆ',
    condition: 'ಸ್ಥಿತಿ:',
    humidity: 'ಸಾಪೇಕ್ಷ ಆರ್ದ್ರತೆ',
    dewPointFavorable: 'ಇಬ್ಬನಿ ಬಿಂದು ಅನುಕೂಲಕರವಾಗಿದೆ',
    windSpeed: 'ಗಾಳಿಯ ವೇಗ ಮತ್ತು ದಿಕ್ಕು',
    heading: 'ದಿಕ್ಕು:',
    et0Title: 'FAO-56 ET0',
    et0Subtitle: 'ವಾತಾವರಣದ ಆವಿಯಾಗುವಿಕೆ ಬೇಡಿಕೆ',
    forecastTitle: '7 ದಿನಗಳ ಕೃಷಿ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ',
    colDate: 'ದಿನಾಂಕ',
    colCondition: 'ಹವಾಮಾನ ಸ್ಥಿತಿ',
    colMaxTemp: 'ಗರಿಷ್ಠ ಉಷ್ಣತೆ',
    colMinTemp: 'ಕನಿಷ್ಠ ಉಷ್ಣತೆ',
    colPrecip: 'ಮಳೆ ಪ್ರಮಾಣ',
    colRainProb: 'ಮಳೆ ಸಾಧ್ಯತೆ',
    colEt0: 'FAO-56 ET0',
    mmUnit: 'ಮಿ.ಮೀ',
    kmhUnit: 'ಕಿ.ಮೀ/ಗಂ',
  },
  hi: {
    title: 'जलवायु एवं कृषि-मौसम बुद्धिमत्ता',
    liveBadge: 'लाइव Open-Meteo',
    subtitlePrefix: 'उच्च-सटीकता मौसम पूर्वानुमान (NWP) — स्थान:',
    source: 'स्रोत:',
    timezone: 'समय क्षेत्र: Asia/Kolkata',
    airTemp: 'हवा का तापमान',
    condition: 'स्थिति:',
    humidity: 'सापेक्ष आर्द्रता',
    dewPointFavorable: 'ओस बिंदु अनुकूल है',
    windSpeed: 'हवा की गति व दिशा',
    heading: 'दिशा:',
    et0Title: 'FAO-56 ET0',
    et0Subtitle: 'वायुमंडलीय वाष्पीकरण मांग',
    forecastTitle: '7-दिवसीय कृषि मौसम पूर्वानुमान',
    colDate: 'दिनांक',
    colCondition: 'स्थिति',
    colMaxTemp: 'अधिकतम तापमान',
    colMinTemp: 'न्यूनतम तापमान',
    colPrecip: 'वर्षा',
    colRainProb: 'बारिश संभावना',
    colEt0: 'FAO-56 ET0',
    mmUnit: 'मिमी',
    kmhUnit: 'किमी/घंटा',
  },
  te: {
    title: 'వాతావరణ & వ్యవసాయ వాతావరణ నివేదిక',
    liveBadge: 'లైవ్ Open-Meteo',
    subtitlePrefix: 'ఖచ్చితమైన వాతావరణ అంచనా (NWP) — ప్రాంతం:',
    source: 'మూలం:',
    timezone: 'సమయ మండలం: Asia/Kolkata',
    airTemp: 'గాలి ఉష్ణోగ్రత',
    condition: 'స్థితి:',
    humidity: 'గాలిలో తేమ (Humidity)',
    dewPointFavorable: 'మంచు బిందువు అనుకూలంగా ఉంది',
    windSpeed: 'గాలి వేగం & దిశ',
    heading: 'దిశ:',
    et0Title: 'FAO-56 ET0',
    et0Subtitle: 'వాతావరణ ఆవిరి డిమాండ్',
    forecastTitle: '7-రోజుల వ్యవసాయ వాతావరణ అంచనా',
    colDate: 'తేదీ',
    colCondition: 'వాతావరణ స్థితి',
    colMaxTemp: 'గరిష్ట ఉష్ణోగ్రత',
    colMinTemp: 'కనిష్ట ఉష్ణోగ్రత',
    colPrecip: 'వర్షపాతం',
    colRainProb: 'వర్షం సంభావ్యత',
    colEt0: 'FAO-56 ET0',
    mmUnit: 'మి.మీ',
    kmhUnit: 'కి.మీ/గం',
  },
};

export default function ClimatePage() {
  const { currentFarm, weather, language } = useFarm();
  const t = CLIMATE_I18N[language];
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
                {t.title}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {t.liveBadge}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {t.subtitlePrefix} {currentFarm?.village}, {currentFarm?.district}
            </p>
          </div>
        </div>
        <div className="text-xs text-zinc-500">
          {t.source} <strong>Open-Meteo API</strong> • {t.timezone}
        </div>
      </div>

      {/* Current Observations Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>{t.airTemp}</span>
            <Thermometer className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {cur ? `${cur.temperature_c.toFixed(1)}°C` : '28.4°C'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">{t.condition} {localizeCondition(cur?.condition_text || 'Clear', language)}</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>{t.humidity}</span>
            <Droplets className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {cur ? `${cur.relative_humidity_pct}%` : '58%'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">{t.dewPointFavorable}</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>{t.windSpeed}</span>
            <Wind className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {cur ? `${cur.wind_speed_kmh} ${t.kmhUnit}` : `9.2 ${t.kmhUnit}`}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">{t.heading} {cur?.wind_direction_deg || 110}° (ESE)</div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>{t.et0Title}</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {cur ? `${cur.et0_fao56_mm} ${t.mmUnit}` : `4.6 ${t.mmUnit}`}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">{t.et0Subtitle}</div>
        </div>
      </div>

      {/* 7-Day Forecast Table */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          {t.forecastTitle}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-semibold uppercase">
                <th className="py-2.5 px-3">{t.colDate}</th>
                <th className="py-2.5 px-3">{t.colCondition}</th>
                <th className="py-2.5 px-3">{t.colMaxTemp}</th>
                <th className="py-2.5 px-3">{t.colMinTemp}</th>
                <th className="py-2.5 px-3">{t.colPrecip}</th>
                <th className="py-2.5 px-3">{t.colRainProb}</th>
                <th className="py-2.5 px-3">{t.colEt0}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {forecast.map((d) => (
                <tr key={d.date} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="py-3 px-3 font-medium">{formatLocalizedDate(d.date, language)}</td>
                  <td className="py-3 px-3">{localizeCondition(d.condition_text, language)}</td>
                  <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-white">{d.temp_max_c}°C</td>
                  <td className="py-3 px-3 text-zinc-500">{d.temp_min_c}°C</td>
                  <td className="py-3 px-3">{d.precipitation_sum_mm.toFixed(1)} {t.mmUnit}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded font-semibold ${
                      (d.rain_probability_max_pct ?? 0) > 50
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}>
                      {d.rain_probability_max_pct}%
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono">{d.et0_fao56_mm} {t.mmUnit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
