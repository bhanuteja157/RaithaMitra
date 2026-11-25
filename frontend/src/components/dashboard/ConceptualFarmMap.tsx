// frontend/src/components/dashboard/ConceptualFarmMap.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { MapPin, Layers, Satellite, ShieldCheck, Droplet, Flame } from 'lucide-react';

export function ConceptualFarmMap() {
  const { currentFarm, t } = useFarm();

  if (!currentFarm) return null;

  return (
    <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-rm-primary dark:text-rm-accent" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            {t('farmZones')}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-rm-primary" />
            {currentFarm.latitude.toFixed(4)}° N, {currentFarm.longitude.toFixed(4)}° E
          </span>
        </div>
      </div>

      {/* Conceptual Interactive Farm Parcel Zone Map */}
      <div className="relative w-full h-72 md:h-80 rounded-xl bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-emerald-950/90 border border-zinc-800 p-4 flex flex-col justify-between overflow-hidden shadow-inner">
        {/* Background Grid Pattern simulating aerial agricultural telemetry */}
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Top telemetry overlay */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-emerald-400 text-xs font-semibold border border-emerald-900/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Sentinel-2 L2A Multispectral Feed Active
          </span>
          <span className="text-xs text-zinc-400 font-mono">
            Parcel ID: {currentFarm.id} • {currentFarm.land_area_ha} ha
          </span>
        </div>

        {/* Conceptual Zone Visualizer */}
        <div className="relative z-10 grid grid-cols-3 gap-3 my-auto">
          {/* Zone 1: North Plot */}
          <div className="p-3 rounded-lg bg-emerald-900/30 border border-emerald-500/40 backdrop-blur-sm space-y-1 hover:border-emerald-400 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
              <span>Zone A (North)</span>
              <Droplet className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-[11px] text-zinc-300">Tomato • Fruiting</div>
            <div className="text-[10px] text-emerald-400">Moisture: 22.4% (Optimal)</div>
            <div className="text-[10px] text-zinc-400">NDVI: 0.78 (High Vigor)</div>
          </div>

          {/* Zone 2: Central Plot */}
          <div className="p-3 rounded-lg bg-amber-900/30 border border-amber-500/40 backdrop-blur-sm space-y-1 hover:border-amber-400 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
              <span>Zone B (Central)</span>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-[11px] text-zinc-300">Tomato • Flowering</div>
            <div className="text-[10px] text-amber-400">Moisture: 14.2% (Depletion)</div>
            <div className="text-[10px] text-zinc-400">NDVI: 0.69 (Water Deficit)</div>
          </div>

          {/* Zone 3: South Canal Border */}
          <div className="p-3 rounded-lg bg-blue-900/30 border border-blue-500/40 backdrop-blur-sm space-y-1 hover:border-blue-400 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between text-xs text-blue-300 font-bold">
              <span>Zone C (Canal Head)</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-[11px] text-zinc-300">Borewell & Filter Head</div>
            <div className="text-[10px] text-cyan-400">Flow: 140 L/min Drip</div>
            <div className="text-[10px] text-zinc-400">Sensor Node: #SM-04 Active</div>
          </div>
        </div>

        {/* Bottom Legend */}
        <div className="relative z-10 flex flex-wrap items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Optimal Vigor
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Irrigation Scheduled
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-cyan-500" /> Drip Manifold
            </span>
          </div>
          <span className="font-mono text-zinc-500">
            CRS: EPSG:4326 • Spatial Resolution: 10m
          </span>
        </div>
      </div>
    </div>
  );
}
