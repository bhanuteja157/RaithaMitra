// frontend/src/app/satellite/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Satellite, MapPin, Eye, CheckCircle2 } from 'lucide-react';

export default function SatellitePage() {
  const { currentFarm } = useFarm();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
            <Satellite className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Satellite & Geospatial Intelligence
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Operational Prototype
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Sentinel-2 L2A multispectral vegetation indices and field boundary analytics
            </p>
          </div>
        </div>
        <div className="text-xs text-zinc-500">
          Parcel: <strong>{currentFarm?.farm_name}</strong> ({currentFarm?.latitude.toFixed(4)}°, {currentFarm?.longitude.toFixed(4)}°)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="text-xs font-semibold text-zinc-500">Mean NDVI</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">0.76</div>
          <div className="text-[11px] text-zinc-400 mt-1">Healthy vegetative canopy</div>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="text-xs font-semibold text-zinc-500">NDWI (Water Index)</div>
          <div className="text-2xl font-bold text-cyan-600 mt-1">0.32</div>
          <div className="text-[11px] text-zinc-400 mt-1">Adequate canopy moisture</div>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="text-xs font-semibold text-zinc-500">EVI (Enhanced Vegetation)</div>
          <div className="text-2xl font-bold text-teal-600 mt-1">0.68</div>
          <div className="text-[11px] text-zinc-400 mt-1">Atmospheric adjusted vigor</div>
        </div>
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          <div className="text-xs font-semibold text-zinc-500">Stress Anomaly Index</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">Low (7%)</div>
          <div className="text-[11px] text-zinc-400 mt-1">Localized in eastern furrow</div>
        </div>
      </div>

      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          Multispectral Raster Spatial Tile (10m Resolution)
        </h3>
        <div className="h-64 rounded-xl bg-gradient-to-br from-emerald-950 via-zinc-900 to-teal-950 border border-zinc-800 flex items-center justify-center p-6 text-center text-zinc-400 text-xs">
          <div>
            <Eye className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-zinc-200">Sentinel-2 Tile: T43QDB (Cloud Cover 2.1%)</p>
            <p className="text-[11px] mt-1 text-zinc-400">Calculated indices: Normalized Difference Vegetation Index (B8-B4)/(B8+B4)</p>
            <p className="text-[10px] mt-2 font-mono text-zinc-500">Field boundary GeoJSON polygon synchronized with shared farm twin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
