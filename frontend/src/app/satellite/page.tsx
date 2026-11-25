// frontend/src/app/satellite/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useFarm } from '@/context/FarmContext';
import {
  analyzeSatelliteField,
  ScientificModuleOutput,
  MODULE_TRANSLATIONS,
} from '@/lib/scientificApi';
import { Satellite, MapPin, AlertTriangle, Info, RotateCw } from 'lucide-react';

const LeafletMapInner = dynamic(
  () => import('@/components/location/LeafletMapInner'),
  { ssr: false }
);

export default function SatellitePage() {
  const { currentFarm, language } = useFarm();
  const mt = MODULE_TRANSLATIONS[language] || MODULE_TRANSLATIONS.en;

  const [lat, setLat] = useState<number>(currentFarm?.latitude ?? 12.5234);
  const [lon, setLon] = useState<number>(currentFarm?.longitude ?? 76.8976);
  const [nirInput, setNirInput] = useState<string>('');
  const [redInput, setRedInput] = useState<string>('');
  const [swirInput, setSwirInput] = useState<string>('');
  const [blueInput, setBlueInput] = useState<string>('');
  const [geojsonText, setGeojsonText] = useState<string>('');
  const [useDemo, setUseDemo] = useState<boolean>(true);
  const [output, setOutput] = useState<ScientificModuleOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (currentFarm) {
      setLat(currentFarm.latitude);
      setLon(currentFarm.longitude);
    }
  }, [currentFarm?.id]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    let parsedGeo: Record<string, any> | undefined;
    if (geojsonText.trim()) {
      try {
        parsedGeo = JSON.parse(geojsonText);
      } catch {
        // Ignore invalid JSON during quick submit
      }
    }
    try {
      const res = await analyzeSatelliteField({
        farm_id: currentFarm?.id,
        latitude: lat,
        longitude: lon,
        boundary_geojson: parsedGeo,
        nir_band: nirInput !== '' ? parseFloat(nirInput) : undefined,
        red_band: redInput !== '' ? parseFloat(redInput) : undefined,
        swir_band: swirInput !== '' ? parseFloat(swirInput) : undefined,
        blue_band: blueInput !== '' ? parseFloat(blueInput) : undefined,
        use_demo_observation: useDemo,
      });
      setOutput(res);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleAnalyze();
  }, [lat, lon]);

  const r = output?.results;
  const idx = r?.indices;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
            <Satellite className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Satellite & Geospatial Intelligence
              </h1>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  r?.is_demonstration_data
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {r?.is_demonstration_data ? 'Demonstration Sample' : output?.data_quality || 'Ready'}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              NDVI = (NIR - Red) / (NIR + Red) • Interactive field coordinates & GeoJSON boundary support
            </p>
          </div>
        </div>
        <div className="text-xs text-zinc-500 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {lat.toFixed(4)}°, {lon.toFixed(4)}°
        </div>
      </div>

      {/* Interactive Map + Spectral Band Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            Field Boundary & Coordinate Selector
          </h3>
          <LeafletMapInner
            latitude={lat}
            longitude={lon}
            onSelectCoordinates={(newLat, newLon) => {
              setLat(newLat);
              setLon(newLon);
            }}
            heightClass="h-60"
          />
          <textarea
            rows={2}
            placeholder='Optional GeoJSON Polygon e.g. {"type":"Polygon","coordinates":[[...]]}'
            value={geojsonText}
            onChange={(e) => setGeojsonText(e.target.value)}
            className="w-full p-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono"
          />
        </div>

        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3 text-xs">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            Spectral Reflectance Inputs (Optional — Sentinel-2 Bands 0.0 to 1.0)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-500 mb-1">NIR (B8)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="e.g. 0.44"
                value={nirInput}
                onChange={(e) => setNirInput(e.target.value)}
                className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-zinc-500 mb-1">Red (B4)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="e.g. 0.08"
                value={redInput}
                onChange={(e) => setRedInput(e.target.value)}
                className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-zinc-500 mb-1">SWIR (B11, for NDWI)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="Optional"
                value={swirInput}
                onChange={(e) => setSwirInput(e.target.value)}
                className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-zinc-500 mb-1">Blue (B2, for EVI)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="Optional"
                value={blueInput}
                onChange={(e) => setBlueInput(e.target.value)}
                className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={useDemo}
              onChange={(e) => setUseDemo(e.target.checked)}
              className="rounded text-green-700"
            />
            Allow clearly labelled demonstration sample if Sentinel-2 credentials are absent
          </label>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full py-2.5 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Satellite className="w-4 h-4" />}
            {mt.analyze}
          </button>
        </div>
      </div>

      {idx && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="text-xs font-semibold text-zinc-500">NDVI</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{idx.ndvi ?? 'N/A'}</div>
            <div className="text-[11px] text-zinc-400 mt-1">(NIR - Red) / (NIR + Red)</div>
          </div>
          <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="text-xs font-semibold text-zinc-500">NDWI (Water)</div>
            <div className="text-2xl font-bold text-cyan-600 mt-1">{idx.ndwi ?? 'SWIR req.'}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Requires SWIR band</div>
          </div>
          <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="text-xs font-semibold text-zinc-500">EVI</div>
            <div className="text-2xl font-bold text-teal-600 mt-1">{idx.evi ?? 'Blue req.'}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Requires Blue band</div>
          </div>
          <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="text-xs font-semibold text-zinc-500">Cloud / Timestamp</div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white mt-1">
              {r?.cloud_coverage_pct !== null && r?.cloud_coverage_pct !== undefined ? `${r.cloud_coverage_pct}% cloud` : 'Manual Bands'}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">{r?.stress_assessment}</div>
          </div>
        </div>
      )}

      <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Scientific Scope:</strong> Satellite vegetation indices detect canopy vigor and water stress only — they cannot independently diagnose crop diseases. {mt.sourceLabel}: {output?.source}
        </div>
      </div>
    </div>
  );
}
