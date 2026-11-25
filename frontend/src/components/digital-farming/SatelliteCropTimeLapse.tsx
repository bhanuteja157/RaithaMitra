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
  projectedYieldKg: number;
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

function seededRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function mixRgbTuple(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    Math.round(lerp(c1[0], c2[0], clamped)),
    Math.round(lerp(c1[1], c2[1], clamped)),
    Math.round(lerp(c1[2], c2[2], clamped)),
  ];
}

function rgbStr(c: [number, number, number], alpha = 1): string {
  return alpha < 1 ? `rgba(${c[0]},${c[1]},${c[2]},${alpha})` : `rgb(${c[0]},${c[1]},${c[2]})`;
}

// Build a cached offscreen noise-textured soil tile
function createSoilGrainTile(): HTMLCanvasElement {
  const tile = document.createElement('canvas');
  tile.width = 96;
  tile.height = 96;
  const tctx = tile.getContext('2d');
  if (!tctx) return tile;

  const img = tctx.createImageData(96, 96);
  for (let i = 0; i < 96 * 96; i++) {
    const n = seededRand(i * 1.37);
    const v = Math.round(115 + (n - 0.5) * 46);
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = Math.round(v * 0.85);
    img.data[i * 4 + 2] = Math.round(v * 0.65);
    img.data[i * 4 + 3] = 55;
  }
  tctx.putImageData(img, 0, 0);
  return tile;
}

// Draw a tapered, curved leaf blade (no flat circles)
function drawLeafBlade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number,
  color: string,
  curlFactor = 0
) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = x + cos * length;
  const tipY = y + sin * length;
  const perpX = -sin;
  const perpY = cos;
  const midX = x + cos * (length * 0.48) + perpX * curlFactor * length * 0.22;
  const midY = y + sin * (length * 0.48) + perpY * curlFactor * length * 0.22;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(midX + perpX * width, midY + perpY * width, tipX, tipY);
  ctx.quadraticCurveTo(midX - perpX * width, midY - perpY * width, x, y);
  ctx.closePath();
  ctx.fill();
}

// Draw an irregular multi-lobe organic foliage cluster (for tomato/chilli/bush canopy)
function drawOrganicCanopyPatch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  seed: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const lobes = 7;
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const n = 0.72 + seededRand(seed + i * 3.1) * 0.52;
    const px = x + Math.cos(a) * rx * n;
    const py = y + Math.sin(a) * ry * n;
    if (i === 0) ctx.moveTo(px, py);
    else {
      const prevA = ((i - 0.5) / lobes) * Math.PI * 2;
      const ctrlR = 0.85 + seededRand(seed + i * 5.7) * 0.35;
      ctx.quadraticCurveTo(
        x + Math.cos(prevA) * rx * ctrlR,
        y + Math.sin(prevA) * ry * ctrlR,
        px,
        py
      );
    }
  }
  ctx.closePath();
  ctx.fill();
}

export default function SatelliteCropTimeLapse({
  points,
  crop,
  sim,
  areaAcres,
  projectedYieldKg,
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
  const soilTileRef = useRef<HTMLCanvasElement | null>(null);
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

  const drawDataRef = useRef({ activePoints, crop, sim, viewMode });
  useEffect(() => {
    drawDataRef.current = { activePoints, crop, sim, viewMode };
  }, [activePoints, crop, sim, viewMode]);

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

    if (!soilTileRef.current) {
      soilTileRef.current = createSoilGrainTile();
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const { activePoints: pts, crop: curCrop, sim: curSim, viewMode: mode } = drawDataRef.current;
    const pxPts = pts.map((p) => map.latLngToContainerPoint([p.lat, p.lon]));
    if (pxPts.length < 3) {
      ctx.restore();
      return;
    }

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

    const rowAngle = Math.atan2(pxPts[1].y - pxPts[0].y, pxPts[1].x - pxPts[0].x);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const diag = Math.hypot(maxX - minX, maxY - minY) + 48;
    const zoom = map.getZoom();
    const zoomScale = Math.max(0.55, Math.min(2.2, Math.pow(1.35, zoom - 17)));

    // Clip strictly to the selected farmland polygon
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pxPts[0].x, pxPts[0].y);
    for (let i = 1; i < pxPts.length; i++) {
      ctx.lineTo(pxPts[i].x, pxPts[i].y);
    }
    ctx.closePath();
    ctx.clip();

    // 1. Natural Textured Soil Base
    const moistureT = Math.max(0, Math.min(1, curSim.soilMoisturePct / 100));
    const drySoil: [number, number, number] = [164, 134, 96];
    const moistSoil: [number, number, number] = [66, 46, 30];
    const soilRgb = mixRgbTuple(drySoil, moistSoil, moistureT);
    const soilAlpha =
      curSim.stage === 'empty_land' && !curSim.soilPrepared
        ? 0.28
        : mode === 'drone'
          ? 0.96
          : 0.88;

    ctx.globalAlpha = soilAlpha;
    ctx.fillStyle = rgbStr(soilRgb);
    ctx.fillRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);

    // Overlay organic soil grain pattern
    const pattern = ctx.createPattern(soilTileRef.current, 'repeat');
    if (pattern) {
      ctx.globalAlpha = soilAlpha * 0.65;
      ctx.fillStyle = pattern;
      ctx.fillRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
    }

    // Rotate into row-aligned coordinate frame
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rowAngle);

    const rowSpacing = (mode === 'drone' ? 14 : 9.5) * zoomScale;
    const plantSpacing = (mode === 'drone' ? 10 : 7.2) * zoomScale;

    // 2. Agricultural Furrows (visible whenever soil is prepared or sown, fading as canopy closes)
    const g = Math.max(0, Math.min(1, curSim.growthPct / 100));
    if (curSim.soilPrepared || curSim.started) {
      const furrowVisibility = Math.max(0.14, 1 - g * 0.85);
      ctx.globalAlpha = furrowVisibility * 0.55;
      for (let y = -diag / 2; y <= diag / 2; y += rowSpacing) {
        ctx.strokeStyle = 'rgba(34, 21, 11, 0.7)';
        ctx.lineWidth = Math.max(1, rowSpacing * 0.18);
        ctx.beginPath();
        ctx.moveTo(-diag / 2, y + rowSpacing * 0.5);
        ctx.lineTo(diag / 2, y + rowSpacing * 0.5);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(218, 188, 146, 0.25)';
        ctx.lineWidth = Math.max(0.8, rowSpacing * 0.1);
        ctx.beginPath();
        ctx.moveTo(-diag / 2, y);
        ctx.lineTo(diag / 2, y);
        ctx.stroke();
      }
    }

    // 3. Paddy Flooded Water / Excessive Rainfall Standing Water
    if (
      (curCrop.id === 'paddy' && curSim.soilMoisturePct > 50 && g < 0.8) ||
      curSim.scenario === 'excessive_rain' ||
      curSim.scenario === 'unseasonal_rain'
    ) {
      const waterAlpha =
        curSim.scenario === 'excessive_rain'
          ? 0.42
          : curCrop.id === 'paddy'
            ? 0.32 * (1 - g * 0.5)
            : 0.2;
      ctx.globalAlpha = waterAlpha;
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(-diag / 2, -diag / 2, diag, diag);
    }

    // 4. Continuous Day-by-Day Realistic Crop Vegetation
    if (curSim.sown && curSim.stage !== 'empty_land' && curSim.stage !== 'soil_preparation') {
      const healthT = Math.max(0, Math.min(1, curSim.cropHealthPct / 100));
      const stressT = Math.max(0, Math.min(1, curSim.weatherStressPct / 100));
      const droughtFactor = curSim.scenario === 'drought' ? 0.72 : 1.0;

      // Natural crop palette
      const sproutGreen: [number, number, number] = [122, 194, 72];
      const midGreen: [number, number, number] = [44, 132, 46];
      const deepCanopy: [number, number, number] = [26, 94, 34];
      const stressAmber: [number, number, number] = [178, 152, 58];
      const matureColor: [number, number, number] =
        curCrop.id === 'maize'
          ? [142, 156, 48] // golden-green mature maize
          : curCrop.id === 'paddy' || curCrop.id === 'wheat' || curCrop.id === 'ragi'
            ? [204, 168, 56] // golden ripening grain
            : [42, 114, 44]; // deep green vegetable canopy

      const baseVeg =
        g < 0.45
          ? mixRgbTuple(sproutGreen, midGreen, g / 0.45)
          : mixRgbTuple(midGreen, deepCanopy, (g - 0.45) / 0.55);
      const stressedVeg = mixRgbTuple(baseVeg, stressAmber, stressT * 0.65 + (1 - healthT) * 0.35);
      const maturityBlend = g > 0.76 ? (g - 0.76) / 0.24 : 0;
      const finalVegRgb = mixRgbTuple(stressedVeg, matureColor, maturityBlend * 0.85);
      const shadowRgb: [number, number, number] = [12, 30, 14];
      const highlightRgb = mixRgbTuple(finalVegRgb, [195, 224, 115], 0.28);

      if (curSim.stage === 'harvested') {
        // Harvested stubble rows
        ctx.globalAlpha = 0.78;
        ctx.strokeStyle = '#b4914e';
        ctx.lineWidth = Math.max(1.2, rowSpacing * 0.2);
        for (let y = -diag / 2; y <= diag / 2; y += rowSpacing) {
          ctx.beginPath();
          ctx.setLineDash([plantSpacing * 0.45, plantSpacing * 0.4]);
          ctx.moveTo(-diag / 2, y);
          ctx.lineTo(diag / 2, y);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      } else {
        // 4A. Continuous Row Understory Ribbon (creates realistic dense field rows as g > 0.25)
        if (g > 0.2) {
          const ribbonProgress = Math.min(1, (g - 0.2) / 0.65);
          const ribbonWidth = rowSpacing * (0.28 + ribbonProgress * 0.68) * droughtFactor;
          ctx.globalAlpha = 0.55 + ribbonProgress * 0.38;
          for (let rIdx = 0, y = -diag / 2; y <= diag / 2; y += rowSpacing, rIdx++) {
            const rowTone = mixRgbTuple(finalVegRgb, shadowRgb, 0.22);
            ctx.strokeStyle = rgbStr(rowTone);
            ctx.lineWidth = ribbonWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-diag / 2, y);
            ctx.lineTo(diag / 2, y);
            ctx.stroke();
          }
        }

        // 4B. Deterministic Individual Plants / Leaf Blades / Canopy Clusters
        const isTallGrassOrMaize =
          curCrop.id === 'maize' ||
          curCrop.id === 'sugarcane' ||
          curCrop.id === 'paddy' ||
          curCrop.id === 'wheat' ||
          curCrop.id === 'ragi';

        let rIdx = 0;
        for (let y = -diag / 2; y <= diag / 2; y += rowSpacing) {
          rIdx++;
          let cIdx = 0;
          for (let x = -diag / 2; x <= diag / 2; x += plantSpacing) {
            cIdx++;
            const seed = rIdx * 1009 + cIdx * 97;
            const n1 = seededRand(seed);
            const n2 = seededRand(seed + 11);
            const n3 = seededRand(seed + 23);

            // Deterministic pest damage patch
            if (curSim.pestPressurePct > 35 && n1 < (curSim.pestPressurePct - 32) / 150) {
              continue;
            }

            // Early emergence threshold: Days 0-5 show seedbed only, Days 6+ show shoots
            if (g < 0.045) continue;

            const px = x + (n1 - 0.5) * plantSpacing * 0.28;
            const py = y + (n2 - 0.5) * rowSpacing * 0.16;

            // Nutrient deficiency yellowing variation
            const isChlorotic = curSim.nutrientStatusPct < 48 && n3 > 0.68;
            const plantRgb = isChlorotic
              ? mixRgbTuple(finalVegRgb, [186, 178, 62], 0.65)
              : mixRgbTuple(finalVegRgb, highlightRgb, (n2 - 0.3) * 0.45);

            // Directional shadow
            if (g > 0.08) {
              const shadowLen = plantSpacing * (0.3 + g * 0.65) * droughtFactor;
              ctx.globalAlpha = 0.22 + g * 0.15;
              drawOrganicCanopyPatch(
                ctx,
                px + 1.8 * zoomScale,
                py + 1.8 * zoomScale,
                shadowLen * 0.55,
                shadowLen * 0.4,
                seed + 5,
                rgbStr(shadowRgb)
              );
            }

            ctx.globalAlpha = Math.min(0.96, 0.68 + g * 0.3);

            if (isTallGrassOrMaize) {
              // Elongated leaf blades radiating from stem (3 blades early -> 6+ dense blades mature)
              const bladeCount = g < 0.15 ? 2 : g < 0.35 ? 4 : mode === 'drone' ? 7 : 5;
              const bladeLen =
                plantSpacing * (0.28 + Math.pow(g, 0.72) * 0.78) * droughtFactor * (0.82 + n3 * 0.36);
              const bladeWidth = Math.max(0.9, bladeLen * (curCrop.id === 'maize' ? 0.24 : 0.16));

              for (let b = 0; b < bladeCount; b++) {
                const angle =
                  (b / bladeCount) * Math.PI * 2 + (seededRand(seed + b * 7) - 0.5) * 0.55;
                const curl = curSim.scenario === 'drought' ? (b % 2 === 0 ? 0.9 : -0.9) : 0.25;
                const leafCol =
                  b % 2 === 0 ? rgbStr(plantRgb) : rgbStr(mixRgbTuple(plantRgb, highlightRgb, 0.35));
                drawLeafBlade(ctx, px, py, angle, bladeLen, bladeWidth, leafCol, curl);
              }

              // Maize tassels / Wheat-Paddy grain heads at flowering & maturity (visible in Drone View or high g)
              if (
                (mode === 'drone' || curCrop.id !== 'maize') &&
                (curSim.stage === 'flowering' || curSim.stage === 'fruit_formation' || curSim.stage === 'maturity') &&
                n1 > 0.35
              ) {
                ctx.globalAlpha = 0.82;
                drawLeafBlade(
                  ctx,
                  px,
                  py,
                  -Math.PI / 4 + (n2 - 0.5) * 0.4,
                  bladeLen * 0.45,
                  Math.max(0.8, bladeWidth * 0.7),
                  curCrop.id === 'maize' ? '#e5d47a' : '#eab308',
                  0
                );
              }
            } else {
              // Branching irregular foliage canopy (Tomato, Chilli, Brinjal, etc.)
              const canopyR = plantSpacing * (0.22 + Math.pow(g, 0.78) * 0.64) * droughtFactor;
              drawOrganicCanopyPatch(
                ctx,
                px,
                py,
                canopyR * (0.9 + n1 * 0.25),
                canopyR * (0.85 + n2 * 0.25),
                seed,
                rgbStr(plantRgb)
              );

              // Sunlit upper foliage highlight
              if (g > 0.28) {
                drawOrganicCanopyPatch(
                  ctx,
                  px - canopyR * 0.18,
                  py - canopyR * 0.18,
                  canopyR * 0.52,
                  canopyR * 0.45,
                  seed + 31,
                  rgbStr(highlightRgb)
                );
              }

              // Drone-only blossom / fruit accents at close zoom
              if (
                mode === 'drone' &&
                (curSim.stage === 'flowering' || curSim.stage === 'fruit_formation' || curSim.stage === 'maturity') &&
                n3 > 0.78
              ) {
                ctx.fillStyle =
                  curSim.stage === 'flowering'
                    ? '#fef08a'
                    : curCrop.id === 'tomato' || curCrop.id === 'chilli'
                      ? '#dc2626'
                      : '#f59e0b';
                ctx.fillRect(px + (n1 - 0.5) * 3, py + (n2 - 0.5) * 3, 2.2, 2.2);
              }
            }
          }
        }
      }
    }

    ctx.restore(); // undo rotation
    ctx.restore(); // undo polygon clip

    // Crisp field boundary outline
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

    window.setTimeout(drawOverlay, 120);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
      {/* Top Bar */}
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

      {/* Map + Geographic Canvas Overlay + HUD */}
      <div className="relative w-full h-[360px] sm:h-[440px] bg-zinc-900">
        <div ref={mapContainerRef} className="w-full h-full z-10" />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-[450]"
        />

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

        {/* Synchronized Live Simulation HUD */}
        <div className="absolute top-3 right-3 z-[500] bg-zinc-950/80 backdrop-blur-sm text-white rounded-xl p-3 text-[11px] space-y-1 border border-white/15 max-w-[235px] pointer-events-none">
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
            <span>Est. Yield: <strong>{projectedYieldKg.toLocaleString('en-IN')} kg</strong></span>
            <span className="col-span-2">
              Proj. Profit:{' '}
              <strong className={projectedProfitInr >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                ₹{projectedProfitInr.toLocaleString('en-IN')}
              </strong>
            </span>
            <span className="col-span-2 text-zinc-300">Est. Harvest: {estimatedHarvestDate}</span>
          </div>
        </div>
      </div>

      {/* Controls & Timeline Slider */}
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
