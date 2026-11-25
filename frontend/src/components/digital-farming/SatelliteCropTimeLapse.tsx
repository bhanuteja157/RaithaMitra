// frontend/src/components/digital-farming/SatelliteCropTimeLapse.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLonPoint } from '@/lib/digital-farming/geo';
import { CropCatalogItem } from '@/lib/digital-farming/crops';
import { GROWTH_STAGES, SimulationState } from '@/lib/digital-farming/simulator';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FastForward,
  Maximize2,
  Minimize2,
  Satellite,
  Camera,
  Film,
  RefreshCw,
  Wheat,
} from 'lucide-react';

interface SatelliteCropTimeLapseProps {
  points: LatLonPoint[];
  crop: CropCatalogItem;
  sim: SimulationState;
  areaAcres: number;
  projectedProfitInr: number;
  estimatedHarvestDate: string;
  canStepBack: boolean;
  isCinematic: boolean;
  onTogglePlay: () => void;
  onToggleCinematic: () => void;
  onStepDay: (delta: number) => void;
  onPreviousDay: () => void;
  onNextStage: () => void;
  onScrubDay: (targetDay: number) => void;
  onSpeedChange: (speed: number) => void;
  onRestart: () => void;
  onHarvest: () => void;
}

// Deterministic pseudo-random generator for organic field texture without flickering
function seededRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function mixRgb(c1: [number, number, number], c2: [number, number, number], t: number): string {
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  return `rgb(${r},${g},${b})`;
}

export default function SatelliteCropTimeLapse({
  points,
  crop,
  sim,
  areaAcres,
  projectedProfitInr,
  estimatedHarvestDate,
  canStepBack,
  isCinematic,
  onTogglePlay,
  onToggleCinematic,
  onStepDay,
  onPreviousDay,
  onNextStage,
  onScrubDay,
  onSpeedChange,
  onRestart,
  onHarvest,
}: SatelliteCropTimeLapseProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const satLayerRef = useRef<L.TileLayer | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);

  const [viewMode, setViewMode] = useState<'satellite' | 'drone'>('satellite');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [tileError, setTileError] = useState<boolean>(false);
  const [useOsmFallback, setUseOsmFallback] = useState<boolean>(false);

  const stageMeta = GROWTH_STAGES.find((s) => s.id === sim.stage) || GROWTH_STAGES[0];

  const activePoints = useMemo<LatLonPoint[]>(() => {
    if (points.length >= 3) return points;
    return [
      { lat: 13.3412, lon: 77.1135 },
      { lat: 13.3412, lon: 77.1144 },
      { lat: 13.3403, lon: 77.1145 },
      { lat: 13.3402, lon: 77.1134 },
    ];
  }, [points]);

  // Keep latest props in refs for Leaflet move/zoom redraws
  const drawDataRef = useRef({ activePoints, crop, sim, viewMode });
  useEffect(() => {
    drawDataRef.current = { activePoints, crop, sim, viewMode };
  }, [activePoints, crop, sim, viewMode]);

  // Core procedural geographic canvas renderer
  const drawOverlay = () => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    const container = mapContainerRef.current;
    if (!map || !canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const { activePoints: pts, crop: curCrop, sim: curSim, viewMode: mode } = drawDataRef.current;
    const pxPts = pts.map((p) => map.latLngToContainerPoint([p.lat, p.lon]));
    if (pxPts.length < 3) {
      ctx.restore();
      return;
    }

    // Bounding box of polygon in container pixels
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const pt of pxPts) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    // Dominant row angle from first edge
    const edgeDx = pxPts[1].x - pxPts[0].x;
    const edgeDy = pxPts[1].y - pxPts[0].y;
    const rowAngle = Math.atan2(edgeDy, edgeDx);

    // Clip strictly to the selected farmland polygon
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pxPts[0].x, pxPts[0].y);
    for (let i = 1; i < pxPts.length; i++) {
      ctx.lineTo(pxPts[i].x, pxPts[i].y);
    }
    ctx.closePath();
    ctx.clip();

    // 1. Realistic Soil Base Texture (only visible once started/prepared or during early stages)
    const moistureT = Math.max(0, Math.min(1, curSim.soilMoisturePct / 100));
    const drySoil: [number, number, number] = [166, 138, 102];
    const moistSoil: [number, number, number] = [74, 52, 34];
    const soilColor = mixRgb(drySoil, moistSoil, moistureT);

    // Subtle transparency in Empty Land so real satellite ground shows through
    const soilAlpha =
      curSim.stage === 'empty_land' && !curSim.soilPrepared
        ? 0.25
        : mode === 'drone'
          ? 0.94
          : 0.85;

    ctx.globalAlpha = soilAlpha;
    ctx.fillStyle = soilColor;
    ctx.fillRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);

    // Rotate canvas around polygon center for realistic parallel cultivation rows
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const diag = Math.hypot(maxX - minX, maxY - minY) + 40;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rowAngle);

    const rowSpacing = mode === 'drone' ? 9 : 6.5;

    // 2. Tilled Furrows (Soil Preparation onwards)
    if (curSim.soilPrepared || curSim.started) {
      ctx.globalAlpha = mode === 'drone' ? 0.55 : 0.4;
      for (let y = -diag / 2; y <= diag / 2; y += rowSpacing) {
        ctx.strokeStyle = 'rgba(32, 20, 10, 0.55)';
        ctx.lineWidth = mode === 'drone' ? 2.2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(-diag / 2, y);
        ctx.lineTo(diag / 2, y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(210, 180, 140, 0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-diag / 2, y + 1.5);
        ctx.lineTo(diag / 2, y + 1.5);
        ctx.stroke();
      }
    }

    // 3. Standing Water Sheen for Paddy or Excessive Rain
    if (
      (curCrop.id === 'paddy' && curSim.soilMoisturePct > 55 && curSim.growthPct < 82) ||
      curSim.scenario === 'excessive_rain' ||
      curSim.scenario === 'unseasonal_rain'
    ) {
      const waterOpacity =
        curSim.scenario === 'excessive_rain'
          ? 0.38
          : curCrop.id === 'paddy'
            ? 0.28
            : 0.18;
      ctx.globalAlpha = waterOpacity;
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(-diag / 2, -diag / 2, diag, diag);
    }

    // 4. Realistic Crop Vegetation Layer
    if (curSim.sown && curSim.stage !== 'empty_land' && curSim.stage !== 'soil_preparation') {
      const g = Math.max(0, Math.min(1, curSim.growthPct / 100));
      const healthT = Math.max(0, Math.min(1, curSim.cropHealthPct / 100));
      const stressT = Math.max(0, Math.min(1, curSim.weatherStressPct / 100));

      // Color progression by crop type & health/drought/maturity
      const seedlingGreen: [number, number, number] = [110, 185, 72];
      const lushGreen: [number, number, number] = [34, 118, 42];
      const stressedYellow: [number, number, number] = [184, 162, 66];
      const matureGold: [number, number, number] =
        curCrop.id === 'maize'
          ? [164, 168, 54] // golden-green maize
          : curCrop.id === 'paddy' || curCrop.id === 'wheat' || curCrop.id === 'ragi'
            ? [212, 174, 58] // golden grain
            : [48, 124, 48]; // deep green vegetable canopy

      const maturityBlend = g > 0.78 ? (g - 0.78) / 0.22 : 0;
      const baseVeg = mixRgb(seedlingGreen, lushGreen, Math.min(1, g * 1.4));
      const baseParts = baseVeg.match(/\d+/g)?.map(Number) as [number, number, number];
      const withStress = mixRgb(baseParts, stressedYellow, stressT * 0.72 + (1 - healthT) * 0.35);
      const stressParts = withStress.match(/\d+/g)?.map(Number) as [number, number, number];
      const canopyColor = mixRgb(stressParts, matureGold, maturityBlend * 0.85);

      if (curSim.stage === 'harvested') {
        // Harvested stubble rows
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = '#b49452';
        ctx.lineWidth = mode === 'drone' ? 2.4 : 1.5;
        for (let y = -diag / 2; y <= diag / 2; y += rowSpacing) {
          ctx.beginPath();
          ctx.setLineDash([3, 4]);
          ctx.moveTo(-diag / 2, y);
          ctx.lineTo(diag / 2, y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      } else if (curSim.stage === 'sowing') {
        // Fine seeded drill marks
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#d6c38d';
        for (let y = -diag / 2; y <= diag / 2; y += rowSpacing) {
          for (let x = -diag / 2; x <= diag / 2; x += rowSpacing * 1.3) {
            if (seededRand(x * 3 + y * 7) > 0.25) {
              ctx.fillRect(x, y - 0.6, 1.8, 1.2);
            }
          }
        }
      } else {
        // Progressive vegetation rows + organic canopy clusters
        const coverage = Math.min(1, g * 1.18) * (curSim.scenario === 'drought' ? 0.76 : 1);
        const isDenseCarpet = curCrop.id === 'paddy' || curCrop.id === 'wheat' || curCrop.id === 'ragi';
        const rowWidth = isDenseCarpet
          ? rowSpacing * (0.42 + coverage * 0.68)
          : rowSpacing * (0.24 + coverage * 0.64);

        let idx = 0;
        for (let y = -diag / 2; y <= diag / 2; y += rowSpacing) {
          // Pest/nutrient patchy gaps when stressed
          const stepX = mode === 'drone' ? 6 : 8;
          for (let x = -diag / 2; x <= diag / 2; x += stepX) {
            idx++;
            const n = seededRand(idx * 17.3 + y * 3.1);
            const pestGap = curSim.pestPressurePct > 35 && n < (curSim.pestPressurePct - 30) / 140;
            if (pestGap) continue;

            const jitterY = (n - 0.5) * (mode === 'drone' ? 1.8 : 1.1);
            const radius = (rowWidth * 0.52) * (0.75 + n * 0.48);

            // Micro-shadow on SE side
            if (g > 0.22) {
              ctx.globalAlpha = 0.24 * coverage;
              ctx.fillStyle = '#0f2410';
              ctx.beginPath();
              ctx.arc(x + 1.4, y + jitterY + 1.4, radius, 0, Math.PI * 2);
              ctx.fill();
            }

            // Canopy foliage tuft
            ctx.globalAlpha = 0.72 + coverage * 0.25;
            ctx.fillStyle =
              curSim.nutrientStatusPct < 45 && n > 0.72 ? '#a3b842' : canopyColor;
            ctx.beginPath();
            ctx.arc(x, y + jitterY, Math.max(1.1, radius), 0, Math.PI * 2);
            ctx.fill();

            // Drone-only subtle blossom/fruit detail at close range (never at satellite scale)
            if (mode === 'drone' && (curSim.stage === 'flowering' || curSim.stage === 'fruit_formation' || curSim.stage === 'maturity')) {
              if (n > 0.84) {
                ctx.globalAlpha = 0.85;
                ctx.fillStyle =
                  curSim.stage === 'flowering'
                    ? '#fef08a'
                    : curCrop.id === 'tomato' || curCrop.id === 'chilli'
                      ? '#dc2626'
                      : '#eab308';
                ctx.beginPath();
                ctx.arc(x + 0.6, y + jitterY - 0.5, 1.3, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }
      }
    }

    ctx.restore(); // undo rotation
    ctx.restore(); // undo polygon clip

    // Crisp boundary outline so farmer always sees exact field perimeter
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(pxPts[0].x, pxPts[0].y);
    for (let i = 1; i < pxPts.length; i++) {
      ctx.lineTo(pxPts[i].x, pxPts[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  };

  // Initialize Leaflet Satellite Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const bounds = L.latLngBounds(activePoints.map((p) => [p.lat, p.lon] as [number, number]));
    const map = L.map(mapContainerRef.current, {
      center: bounds.getCenter(),
      zoom: 17,
      zoomControl: true,
      attributionControl: true,
    });

    const sat = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
      }
    );

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });

    let errCount = 0;
    sat.on('tileerror', () => {
      errCount += 1;
      if (errCount >= 3) setTileError(true);
    });
    sat.on('load', () => {
      errCount = 0;
      setTileError(false);
    });

    sat.addTo(map);
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 18 });

    map.on('move zoom moveend zoomend resize', drawOverlay);

    mapRef.current = map;
    satLayerRef.current = sat;
    osmLayerRef.current = osm;

    // Initial draw after layout settles
    window.setTimeout(drawOverlay, 120);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Re-fit bounds when farm points or Satellite/Drone mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = L.latLngBounds(activePoints.map((p) => [p.lat, p.lon] as [number, number]));
    map.fitBounds(bounds, {
      padding: viewMode === 'drone' ? [12, 12] : [42, 42],
      maxZoom: viewMode === 'drone' ? 19 : 18,
      animate: true,
    });
  }, [activePoints, viewMode]);

  // Switch between Satellite & OSM fallback if needed
  useEffect(() => {
    const map = mapRef.current;
    const sat = satLayerRef.current;
    const osm = osmLayerRef.current;
    if (!map || !sat || !osm) return;
    if (useOsmFallback) {
      if (map.hasLayer(sat)) map.removeLayer(sat);
      if (!map.hasLayer(osm)) osm.addTo(map);
    } else {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(sat)) sat.addTo(map);
    }
  }, [useOsmFallback]);

  // Redraw crop overlay whenever simulation state or crop changes
  useEffect(() => {
    drawOverlay();
  }, [sim, crop, viewMode, activePoints]);

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm"
    >
      {/* Top Bar: View Mode + Transparency Label + Fullscreen */}
      <div className="px-4 py-2.5 bg-zinc-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('satellite')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold ${
              viewMode === 'satellite' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Satellite className="w-3.5 h-3.5" /> Satellite View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('drone')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold ${
              viewMode === 'drone' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Drone View
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-white/10 text-emerald-200 text-[11px] font-medium">
            Satellite Basemap • Simulated Crop Growth
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Satellite Map + Synchronized Geographic Canvas Overlay + Live HUD */}
      <div className="relative w-full h-[360px] sm:h-[440px] bg-zinc-900">
        <div ref={mapContainerRef} className="w-full h-full z-10" />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-[450]"
        />

        {/* Tile fallback banner if satellite imagery fails */}
        {tileError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-amber-950/90 text-amber-100 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 shadow">
            <span>Satellite tiles unavailable; fallback active.</span>
            <button
              type="button"
              onClick={() => setUseOsmFallback((v) => !v)}
              className="underline font-semibold"
            >
              {useOsmFallback ? 'Retry Satellite' : 'Use Street Map'}
            </button>
            <button
              type="button"
              onClick={() => satLayerRef.current?.redraw()}
              className="inline-flex items-center gap-1 bg-amber-700 px-2 py-0.5 rounded"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Compact Live Simulation HUD Overlays */}
        <div className="absolute top-3 right-3 z-[500] bg-zinc-950/80 backdrop-blur-sm text-white rounded-xl p-3 text-[11px] space-y-1 border border-white/15 max-w-[230px] pointer-events-none">
          <div className="font-bold text-emerald-300 text-xs flex items-center justify-between gap-2">
            <span>{crop.name}</span>
            <span>{areaAcres.toFixed(2)} ac</span>
          </div>
          <div>
            Day <strong>{sim.currentDay}</strong> / {sim.totalDays} · <strong>{Math.round(sim.growthPct)}%</strong>
          </div>
          <div className="text-emerald-200 font-medium">{stageMeta.label}</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1 border-t border-white/15 text-[10px]">
            <span>Health: <strong>{sim.cropHealthPct}%</strong></span>
            <span>Moisture: <strong>{Math.round(sim.soilMoisturePct)}%</strong></span>
            <span>Stress: <strong>{sim.weatherStressPct}%</strong></span>
            <span>Est. Yield: <strong>{sim.harvestedYieldKg.toLocaleString('en-IN')} kg</strong></span>
            <span className="col-span-2">
              Proj. Profit: <strong className={projectedProfitInr >= 0 ? 'text-emerald-300' : 'text-red-300'}>₹{projectedProfitInr.toLocaleString('en-IN')}</strong>
            </span>
            <span className="col-span-2 text-zinc-300">Est. Harvest: {estimatedHarvestDate}</span>
          </div>
        </div>
      </div>

      {/* Cinematic Time-Lapse Controls & Timeline Scrubber */}
      <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
            Day {sim.currentDay}
          </span>
          <input
            type="range"
            min={0}
            max={sim.totalDays}
            value={sim.currentDay}
            onChange={(e) => onScrubDay(Number(e.target.value))}
            className="flex-1 accent-emerald-700 cursor-pointer"
            aria-label="Cultivation Timeline Slider"
          />
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
            {sim.totalDays}d
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={sim.harvested}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold disabled:opacity-40"
            >
              {sim.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {sim.isPlaying ? 'Pause' : sim.started ? 'Play' : 'Start'}
            </button>

            <button
              type="button"
              onClick={onToggleCinematic}
              disabled={sim.harvested}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border disabled:opacity-40 ${
                isCinematic
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700'
              }`}
              title="Compresses the full crop lifecycle into ~30 seconds"
            >
              <Film className="w-3.5 h-3.5" /> 30s Time-Lapse
            </button>

            <button
              type="button"
              onClick={onPreviousDay}
              disabled={!canStepBack || sim.currentDay === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs disabled:opacity-40"
            >
              <SkipBack className="w-3.5 h-3.5" /> Prev Day
            </button>

            <button
              type="button"
              onClick={() => onStepDay(1)}
              disabled={sim.harvested}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs disabled:opacity-40"
            >
              <SkipForward className="w-3.5 h-3.5" /> Next Day
            </button>

            <button
              type="button"
              onClick={() => onStepDay(7)}
              disabled={sim.harvested}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs disabled:opacity-40"
            >
              <FastForward className="w-3.5 h-3.5" /> +7 Days
            </button>

            <button
              type="button"
              onClick={onNextStage}
              disabled={sim.harvested}
              className="px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs disabled:opacity-40"
            >
              Next Stage
            </button>

            <select
              value={sim.speedDaysPerSec}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs bg-white dark:bg-zinc-800"
            >
              <option value={1}>Speed: 1x</option>
              <option value={2}>Speed: 2x</option>
              <option value={5}>Speed: 5x</option>
              <option value={10}>Speed: 10x</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onHarvest}
              disabled={sim.harvested || sim.growthPct < 85}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-40"
            >
              <Wheat className="w-3.5 h-3.5" /> Complete Harvest
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
