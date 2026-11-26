// frontend/src/components/digital-farming/RealisticCropGrowthCanvas.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CropCatalogItem } from '@/lib/digital-farming/crops';
import {
  computeCropPhenologyMetrics,
  CropPhenologyMetrics,
  GROWTH_STAGES,
  SimulationState,
} from '@/lib/digital-farming/simulator';
import { ZoomIn, ZoomOut, RotateCcw, Sprout, Sun, Droplets } from 'lucide-react';

interface RealisticCropGrowthCanvasProps {
  crop: CropCatalogItem;
  sim: SimulationState;
  areaAcres: number;
  projectedYieldKg: number;
  estimatedHarvestDate: string;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  showOverlayHud?: boolean;
}

type FocusPreset = 'full' | 'roots' | 'canopy';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function mixRgb(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): string {
  const k = clamp(t, 0, 1);
  const r = Math.round(lerp(c1[0], c2[0], k));
  const g = Math.round(lerp(c1[1], c2[1], k));
  const b = Math.round(lerp(c1[2], c2[2], k));
  return `rgb(${r},${g},${b})`;
}

/** Deterministic fast PRNG for organic speckles without per-frame allocations. */
function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Pre-renders an offscreen reusable soil grain tile for crisp texture at 60fps. */
function buildSoilPatternCanvas(): HTMLCanvasElement {
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const ctx = tile.getContext('2d');
  if (!ctx) return tile;

  ctx.clearRect(0, 0, 160, 160);
  // Subtle mineral and humus particles
  for (let i = 0; i < 420; i++) {
    const x = seededNoise(i * 1.7 + 3) * 160;
    const y = seededNoise(i * 2.3 + 9) * 160;
    const r = 0.6 + seededNoise(i * 3.1 + 5) * 1.9;
    const isLight = i % 5 === 0;
    ctx.fillStyle = isLight
      ? `rgba(222, 192, 152, ${0.08 + seededNoise(i) * 0.14})`
      : `rgba(28, 17, 10, ${0.12 + seededNoise(i + 7) * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tiny gravel flecks
  for (let i = 0; i < 24; i++) {
    const x = seededNoise(i * 11.3) * 154 + 3;
    const y = seededNoise(i * 17.9) * 154 + 3;
    ctx.fillStyle = 'rgba(186, 162, 134, 0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y, 2.2, 1.4, seededNoise(i * 4) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return tile;
}

/** Draws a botanical serrated tomato leaflet or compound leaf blade. */
function drawTomatoCompoundLeaf(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  angleRad: number,
  length: number,
  scaleFactor: number,
  metrics: CropPhenologyMetrics,
  seed: number,
  swayRad: number
) {
  if (length < 5 || scaleFactor <= 0.05) return;

  const wiltDroop = metrics.wiltFactor * 0.48 * (angleRad >= -Math.PI / 2 ? 1 : -1);
  const finalAngle = angleRad + swayRad * 0.8 + wiltDroop;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.rotate(finalAngle);

  const healthyGreen: [number, number, number] = [44, 132, 52];
  const darkGreen: [number, number, number] = [28, 86, 35];
  const stressYellow: [number, number, number] = [178, 162, 58];
  const colorShift = (1 - metrics.healthVigor) * 0.72 + metrics.wiltFactor * 0.22;

  const baseColor = mixRgb(healthyGreen, stressYellow, colorShift);
  const highlightColor = mixRgb([86, 178, 78], [204, 184, 72], colorShift);
  const midribColor = mixRgb([124, 194, 102], [186, 168, 88], colorShift);

  // Curved rachis (central petiole stalk)
  const tipX = length;
  const tipY = length * (0.14 + metrics.wiltFactor * 0.28);
  const ctrlX = length * 0.52;
  const ctrlY = -length * 0.06 + metrics.wiltFactor * length * 0.14;

  ctx.strokeStyle = midribColor;
  ctx.lineWidth = Math.max(1.2, length * 0.042);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
  ctx.stroke();

  // Odd-pinnate lateral leaflet pairs (3 pairs + 1 terminal leaflet)
  const pairs = [0.28, 0.52, 0.76];
  pairs.forEach((t, idx) => {
    const px = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * ctrlX + t * t * tipX;
    const py = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * ctrlY + t * t * tipY;
    const leafletLen = length * (0.28 + idx * 0.045) * (0.85 + scaleFactor * 0.15);
    const leafletW = leafletLen * 0.44;

    [-1, 1].forEach((side) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(side * (0.78 - idx * 0.08));

      const grad = ctx.createLinearGradient(0, -leafletW, leafletLen, leafletW);
      grad.addColorStop(0, side < 0 ? highlightColor : baseColor);
      grad.addColorStop(1, mixRgb(darkGreen, stressYellow, colorShift * 0.8));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      // Serrated edge curve
      ctx.bezierCurveTo(
        leafletLen * 0.25,
        -leafletW * 0.85,
        leafletLen * 0.52,
        -leafletW * 0.95,
        leafletLen * 0.68,
        -leafletW * 0.45
      );
      ctx.lineTo(leafletLen * 0.74, -leafletW * 0.56);
      ctx.lineTo(leafletLen * 0.86, -leafletW * 0.25);
      ctx.lineTo(leafletLen, 0);
      ctx.lineTo(leafletLen * 0.86, leafletW * 0.25);
      ctx.lineTo(leafletLen * 0.74, leafletW * 0.56);
      ctx.bezierCurveTo(
        leafletLen * 0.52,
        leafletW * 0.92,
        leafletLen * 0.25,
        leafletW * 0.82,
        0,
        0
      );
      ctx.closePath();
      ctx.fill();

      // Subtle central vein
      ctx.strokeStyle = 'rgba(216, 245, 190, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(leafletLen * 0.82, 0);
      ctx.stroke();

      // Pest pressure spots when present
      if (metrics.pestSpotFactor > 0.15 && seededNoise(seed + idx * 7 + side) < metrics.pestSpotFactor) {
        ctx.fillStyle = 'rgba(92, 62, 24, 0.72)';
        ctx.beginPath();
        ctx.arc(leafletLen * 0.55, side * leafletW * 0.2, Math.max(1.2, leafletLen * 0.08), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  });

  // Terminal serrated leaflet at tip
  const termLen = length * 0.34;
  const termW = termLen * 0.48;
  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(0.12 + metrics.wiltFactor * 0.25);
  const tGrad = ctx.createLinearGradient(0, -termW, termLen, termW);
  tGrad.addColorStop(0, highlightColor);
  tGrad.addColorStop(1, baseColor);
  ctx.fillStyle = tGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(termLen * 0.3, -termW, termLen * 0.75, -termW * 0.7, termLen, 0);
  ctx.bezierCurveTo(termLen * 0.75, termW * 0.7, termLen * 0.3, termW, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

/** Draws a crisp 5-petal yellow star tomato flower with green sepals and central anther cone. */
function drawTomatoBlossom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  openness: number
) {
  if (openness <= 0.05 || radius <= 1.2) return;
  const r = radius * clamp(openness, 0.2, 1);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Back green calyx sepals
  ctx.fillStyle = '#3f7d32';
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 + 0.31;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * 0.4, -r * 0.18, r * 0.82, 0);
    ctx.quadraticCurveTo(r * 0.4, r * 0.18, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  // 5 bright yellow recurved petals
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    ctx.save();
    ctx.rotate(a);
    const pGrad = ctx.createLinearGradient(0, 0, r, 0);
    pGrad.addColorStop(0, '#f59e0b');
    pGrad.addColorStop(0.5, '#facc15');
    pGrad.addColorStop(1, '#fef08a');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * 0.42, -r * 0.34, r * 1.05, 0);
    ctx.quadraticCurveTo(r * 0.42, r * 0.34, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  // Central fused yellow-gold anther cone
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.5, r * 0.26), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef9c3';
  ctx.beginPath();
  ctx.arc(-r * 0.06, -r * 0.06, Math.max(0.8, r * 0.1), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Draws a glossy spherical/oblate Tomato fruit transitioning realistically green -> breaker orange -> crimson red. */
function drawTomatoFruit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  ripeningRatio: number,
  stageVariation: number
) {
  if (radius < 1.8) return;
  const localRipe = clamp(ripeningRatio * 1.15 - stageVariation * 0.25, 0, 1);

  // Colour stops: mature green -> yellow-amber breaker -> vine-ripened glossy red
  const greenBody: [number, number, number] = [94, 168, 62];
  const greenDark: [number, number, number] = [44, 102, 32];
  const breakerBody: [number, number, number] = [235, 148, 42];
  const breakerDark: [number, number, number] = [175, 72, 22];
  const redBody: [number, number, number] = [226, 38, 34];
  const redDark: [number, number, number] = [132, 12, 18];

  const mainCol =
    localRipe < 0.45
      ? mixRgb(greenBody, breakerBody, localRipe / 0.45)
      : mixRgb(breakerBody, redBody, (localRipe - 0.45) / 0.55);

  const deepCol =
    localRipe < 0.45
      ? mixRgb(greenDark, breakerDark, localRipe / 0.45)
      : mixRgb(breakerDark, redDark, (localRipe - 0.45) / 0.55);

  ctx.save();
  ctx.translate(x, y);

  // Subtle cast shadow under tomato
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(1.5, 2.5, radius * 1.03, radius * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tomato oblate sphere with 3D radial shading
  const radGrad = ctx.createRadialGradient(
    -radius * 0.34,
    -radius * 0.32,
    radius * 0.1,
    0,
    0,
    radius * 1.12
  );
  radGrad.addColorStop(0, '#ffffff44');
  radGrad.addColorStop(0.18, mainCol);
  radGrad.addColorStop(1, deepCol);

  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.05, radius * 0.94, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crisp glossy skin highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.36, -radius * 0.34, radius * 0.24, radius * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // 5-pointed star green calyx crown at top stem scar
  ctx.fillStyle = '#2d6a2b';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.58;
    ctx.save();
    ctx.translate(0, -radius * 0.82);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(radius * 0.24, -radius * 0.14, radius * 0.48, radius * 0.12);
    ctx.quadraticCurveTo(radius * 0.2, radius * 0.12, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/** Recursively renders realistic organic taproot + lateral branching root hairs in soil cross-section. */
function drawRootBranch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  thickness: number,
  depth: number,
  maxDepth: number,
  metrics: CropPhenologyMetrics,
  seed: number
) {
  if (length < 4 || depth > maxDepth) return;

  const wobble = (seededNoise(seed + depth * 13) - 0.5) * 0.45;
  const endX = x + Math.sin(angle + wobble * 0.5) * length;
  const endY = y + Math.cos(angle + wobble * 0.5) * length;
  const ctrlX = (x + endX) / 2 + wobble * length * 0.35;
  const ctrlY = (y + endY) / 2;

  ctx.strokeStyle =
    depth === 0
      ? 'rgba(244, 232, 198, 0.92)'
      : depth === 1
        ? 'rgba(232, 218, 178, 0.78)'
        : 'rgba(218, 206, 168, 0.52)';
  ctx.lineWidth = Math.max(0.65, thickness);
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
  ctx.stroke();

  // Continue primary elongation
  if (depth < maxDepth) {
    drawRootBranch(
      ctx,
      endX,
      endY,
      angle + (seededNoise(seed + 19) - 0.5) * 0.28,
      length * 0.74,
      thickness * 0.72,
      depth + 1,
      maxDepth,
      metrics,
      seed + 5
    );
  }

  // Lateral secondary roots controlled by rootBranchingRatio
  if (metrics.rootBranchingRatio > 0.08 && depth < maxDepth) {
    const branchScale = metrics.rootBranchingRatio;
    const midX = lerp(x, endX, 0.58);
    const midY = lerp(y, endY, 0.58);
    const sideDir = depth % 2 === 0 ? 1 : -1;
    const spreadAngle = angle + sideDir * (0.58 + seededNoise(seed + 41) * 0.38);

    drawRootBranch(
      ctx,
      midX,
      midY,
      spreadAngle,
      length * 0.62 * clamp(branchScale * 1.15, 0.25, 1),
      thickness * 0.58,
      depth + 1,
      maxDepth,
      metrics,
      seed + 29
    );

    if (branchScale > 0.42 && depth <= 1) {
      drawRootBranch(
        ctx,
        lerp(x, endX, 0.82),
        lerp(y, endY, 0.82),
        angle - sideDir * (0.52 + seededNoise(seed + 53) * 0.32),
        length * 0.52 * branchScale,
        thickness * 0.48,
        depth + 1,
        maxDepth,
        metrics,
        seed + 67
      );
    }
  }
}

export default function RealisticCropGrowthCanvas({
  crop,
  sim,
  areaAcres,
  projectedYieldKg,
  estimatedHarvestDate,
  zoom: controlledZoom,
  onZoomChange,
  showOverlayHud = false,
}: RealisticCropGrowthCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const soilTileRef = useRef<HTMLCanvasElement | null>(null);

  const [internalZoom, setInternalZoom] = useState<number>(1);
  const zoom = controlledZoom ?? internalZoom;
  const setZoom = (next: number | ((prev: number) => number)) => {
    const resolved = clamp(
      typeof next === 'function' ? next(zoom) : next,
      0.7,
      2.4
    );
    if (onZoomChange) onZoomChange(resolved);
    else setInternalZoom(resolved);
  };

  const [focusPreset, setFocusPreset] = useState<FocusPreset>('full');
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  // Live animation refs so simulation ticks interpolate smoothly without tearing down the RAF loop
  const targetSimRef = useRef<SimulationState>(sim);
  const cropRef = useRef<CropCatalogItem>(crop);
  const tweenedGrowthRef = useRef<number>(sim.growthPct);
  const viewTransformRef = useRef({ zoom, pan, focusPreset });

  useEffect(() => {
    targetSimRef.current = sim;
    // Snap down immediately if user restarted to Day 0
    if (sim.currentDay === 0 && sim.growthPct === 0) {
      tweenedGrowthRef.current = 0;
    }
  }, [sim]);

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  useEffect(() => {
    viewTransformRef.current = { zoom, pan, focusPreset };
  }, [zoom, pan, focusPreset]);

  const phenology = useMemo(() => computeCropPhenologyMetrics(crop, sim), [crop, sim]);
  const stageMeta = GROWTH_STAGES.find((s) => s.id === sim.stage) || GROWTH_STAGES[0];

  const handlePreset = (preset: FocusPreset) => {
    setFocusPreset(preset);
    if (preset === 'full') {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else if (preset === 'roots') {
      setZoom(1.65);
      setPan({ x: 0, y: -115 });
    } else {
      setZoom(1.55);
      setPan({ x: 0, y: 82 });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    if (!soilTileRef.current) {
      soilTileRef.current = buildSoilPatternCanvas();
    }

    let rafId = 0;
    const startTime = performance.now();

    const renderFrame = (now: number) => {
      if (document.visibilityState === 'hidden') {
        rafId = window.requestAnimationFrame(renderFrame);
        return;
      }

      const rect = container.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(300, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafId = window.requestAnimationFrame(renderFrame);
        return;
      }

      // Smoothly interpolate visual growthPct toward discrete SimulationState
      const targetSim = targetSimRef.current;
      const curCrop = cropRef.current;
      const diff = targetSim.growthPct - tweenedGrowthRef.current;
      tweenedGrowthRef.current =
        Math.abs(diff) < 0.08 ? targetSim.growthPct : tweenedGrowthRef.current + diff * 0.16;

      const interpolatedSim: SimulationState = {
        ...targetSim,
        growthPct: tweenedGrowthRef.current,
      };
      const m = computeCropPhenologyMetrics(curCrop, interpolatedSim);

      const elapsedSec = (now - startTime) / 1000;
      const { zoom: curZoom, pan: curPan } = viewTransformRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Sky & Atmospheric Backdrop (unzoomed horizon base + dynamic weather)
      const skyTop =
        m.rainIntensity > 0.3
          ? '#64748b'
          : m.thermalTint === 'warm'
            ? '#0284c7'
            : m.thermalTint === 'cool'
              ? '#475569'
              : '#0ea5e9';
      const skyMid =
        m.rainIntensity > 0.3
          ? '#94a3b8'
          : m.thermalTint === 'warm'
            ? '#bae6fd'
            : '#bae6fd';
      const skyHorizon =
        m.rainIntensity > 0.3
          ? '#cbd5e1'
          : m.thermalTint === 'warm'
            ? '#fef3c7'
            : '#ecfdf5';

      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.66);
      skyGrad.addColorStop(0, skyTop);
      skyGrad.addColorStop(0.55, skyMid);
      skyGrad.addColorStop(1, skyHorizon);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Directional sunlight glow & soft clouds
      const sunX = width * 0.18;
      const sunY = height * 0.15;
      if (m.sunlightIntensity > 0.3) {
        const sunHalo = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 130);
        sunHalo.addColorStop(
          0,
          m.thermalTint === 'warm'
            ? `rgba(255, 240, 175, ${0.85 * m.sunlightIntensity})`
            : `rgba(255, 252, 224, ${0.72 * m.sunlightIntensity})`
        );
        sunHalo.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sunHalo;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 130, 0, Math.PI * 2);
        ctx.fill();
      }

      // Soft drifting horizon hills (subtle depth silhouette)
      ctx.fillStyle = m.rainIntensity > 0.3 ? 'rgba(71, 85, 105, 0.25)' : 'rgba(52, 118, 74, 0.16)';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.66);
      ctx.quadraticCurveTo(width * 0.25, height * 0.58, width * 0.55, height * 0.63);
      ctx.quadraticCurveTo(width * 0.82, height * 0.59, width, height * 0.65);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Apply camera zoom & pan around plant crown center
      const anchorX = width * 0.5;
      const groundY = height * 0.65;

      ctx.save();
      ctx.translate(anchorX + curPan.x, groundY + curPan.y);
      ctx.scale(curZoom, curZoom);
      ctx.translate(-anchorX, -groundY);

      // 2. Soil Cross-Section (Topsoil Ridge + Subsoil Horizon + Moisture Plume)
      const topsoilDry: [number, number, number] = [146, 108, 68];
      const topsoilWet: [number, number, number] = [66, 43, 25];
      const subsoilDry: [number, number, number] = [120, 84, 52];
      const subsoilWet: [number, number, number] = [54, 34, 20];

      const topCol = mixRgb(topsoilDry, topsoilWet, m.soilWetness);
      const subCol = mixRgb(subsoilDry, subsoilWet, m.soilWetness * 0.85);

      const soilGrad = ctx.createLinearGradient(0, groundY - 12, 0, height + 240);
      soilGrad.addColorStop(0, topCol);
      soilGrad.addColorStop(0.24, subCol);
      soilGrad.addColorStop(1, '#26170d');

      // Sculpt raised bed ridge if soilPrepared
      const ridgeH = m.soilDisturbance * 10;
      ctx.fillStyle = soilGrad;
      ctx.beginPath();
      ctx.moveTo(-width, groundY);
      ctx.lineTo(anchorX - 150, groundY);
      ctx.bezierCurveTo(
        anchorX - 95,
        groundY - ridgeH,
        anchorX + 95,
        groundY - ridgeH,
        anchorX + 150,
        groundY
      );
      ctx.lineTo(width * 2, groundY);
      ctx.lineTo(width * 2, height + 260);
      ctx.lineTo(-width, height + 260);
      ctx.closePath();
      ctx.fill();

      // Overlay cached mineral soil grain pattern inside soil horizon
      if (soilTileRef.current) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-width, groundY - ridgeH, width * 3, height + 260);
        ctx.clip();
        const pattern = ctx.createPattern(soilTileRef.current, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(-width, groundY - ridgeH, width * 3, height + 260);
        }

        // Subsurface drip moisture plume when moist
        if (m.soilWetness > 0.35) {
          const plumeR = 45 + m.soilWetness * 78;
          const plumeGrad = ctx.createRadialGradient(
            anchorX,
            groundY + 18,
            8,
            anchorX,
            groundY + 52,
            plumeR
          );
          plumeGrad.addColorStop(0, `rgba(22, 16, 12, ${0.42 * m.soilWetness})`);
          plumeGrad.addColorStop(0.65, `rgba(28, 38, 48, ${0.18 * m.soilWetness})`);
          plumeGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = plumeGrad;
          ctx.beginPath();
          ctx.ellipse(anchorX, groundY + 46, plumeR * 1.15, plumeR * 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Paddy flooded surface shimmer when crop is Paddy & watered
        if (m.speciesArchetype === 'paddy_tuft' && m.soilWetness > 0.35) {
          ctx.fillStyle = `rgba(56, 189, 248, ${0.22 * m.soilWetness})`;
          ctx.fillRect(-width, groundY - 5, width * 3, 7);
        }

        ctx.restore();
      }

      // Fresh furrow / bed surface highlight rim
      ctx.strokeStyle = m.soilWetness > 0.5 ? 'rgba(134, 102, 74, 0.55)' : 'rgba(196, 160, 118, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-width, groundY);
      ctx.lineTo(anchorX - 150, groundY);
      ctx.bezierCurveTo(
        anchorX - 95,
        groundY - ridgeH,
        anchorX + 95,
        groundY - ridgeH,
        anchorX + 150,
        groundY
      );
      ctx.lineTo(width * 2, groundY);
      ctx.stroke();

      // Drip lateral tube & emitter beside tomato ridge when sown
      if (m.soilDisturbance > 0.5 && m.speciesArchetype !== 'paddy_tuft') {
        const dripX = anchorX + 34;
        const dripY = groundY - ridgeH * 0.85;
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.ellipse(dripX, dripY, 6, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#52525b';
        ctx.beginPath();
        ctx.ellipse(dripX, dripY - 1, 2.2, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        if (m.soilWetness > 0.55 && Math.sin(elapsedSec * 3.2) > 0.25) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
          ctx.beginPath();
          ctx.arc(dripX, dripY + 5, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const crownY = groundY - ridgeH * 0.92;
      const seedDepthY = crownY + 18;
      const swayBase =
        Math.sin(elapsedSec * (1.3 + m.windStrength * 2.2)) * (0.015 + m.windStrength * 0.085) +
        Math.sin(elapsedSec * 2.9) * m.windStrength * 0.025;

      // 3. Underground Root Development (Radicle -> Primary Taproot / Fibrous -> Lateral Branching)
      if (m.radicleLengthRatio > 0.01) {
        const availableRootHeight = Math.max(85, height - crownY - 14);
        const maxVisualRoot = Math.min(availableRootHeight, 118);

        if (m.speciesArchetype === 'paddy_tuft' || m.speciesArchetype === 'tall_cereal') {
          // Fibrous/prop root spread
          const count = m.speciesArchetype === 'paddy_tuft' ? 7 : 5;
          for (let r = 0; r < count; r++) {
            const frac = (r / (count - 1) - 0.5) * 2;
            const angle = frac * 0.62;
            const len = maxVisualRoot * m.radicleLengthRatio * (0.65 + (1 - Math.abs(frac)) * 0.35);
            drawRootBranch(ctx, anchorX, seedDepthY, angle, len * 0.45, 2.4, 0, 3, m, 10 + r * 17);
          }
        } else {
          // Tomato / broadleaf primary taproot + deep branching lateral feeder roots
          const tapLen = maxVisualRoot * m.radicleLengthRatio;
          drawRootBranch(ctx, anchorX, seedDepthY, 0.03, tapLen * 0.44, 3.2, 0, 3, m, 101);

          // Upper lateral crown roots once vegetative stage opens
          if (m.rootBranchingRatio > 0.22) {
            [-1, 1].forEach((side, idx) => {
              drawRootBranch(
                ctx,
                anchorX,
                seedDepthY + 7,
                side * 0.92,
                tapLen * 0.36 * m.rootBranchingRatio,
                2.0,
                1,
                3,
                m,
                220 + idx * 33
              );
            });
          }
        }

        // Root-tuber swell (Potato) or bulb swell (Onion)
        if (m.speciesArchetype === 'root_tuber' && m.fruitFormationProgress > 0.08) {
          [-24, 18, -8].forEach((ox, idx) => {
            const tr = (5 + idx * 1.4) * m.fruitFormationProgress;
            ctx.fillStyle = '#d4a36a';
            ctx.beginPath();
            ctx.ellipse(anchorX + ox, seedDepthY + 14 + idx * 6, tr * 1.35, tr, 0.2 * idx, 0, Math.PI * 2);
            ctx.fill();
          });
        } else if (m.speciesArchetype === 'bulb_rosette' && m.leafDevelopmentRatio > 0.25) {
          const br = 6 + 13 * m.fruitFormationProgress;
          const bulbGrad = ctx.createRadialGradient(anchorX - 3, crownY + 12, 2, anchorX, crownY + 14, br);
          bulbGrad.addColorStop(0, '#f5d0fe');
          bulbGrad.addColorStop(0.6, '#be185d');
          bulbGrad.addColorStop(1, '#701a75');
          ctx.fillStyle = bulbGrad;
          ctx.beginPath();
          ctx.ellipse(anchorX, crownY + 14, br * 1.1, br * 0.92, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Germinating Seed Coat
      if (m.seedVisibleProgress > 0.02) {
        const sScale = 1 + m.imbibitionScale * 0.32;
        ctx.save();
        ctx.globalAlpha = clamp(m.seedVisibleProgress, 0, 1);
        ctx.translate(anchorX, seedDepthY);
        ctx.rotate(-0.22);
        // Moist germination halo
        if (m.imbibitionScale > 0.25) {
          ctx.fillStyle = 'rgba(186, 230, 253, 0.22)';
          ctx.beginPath();
          ctx.ellipse(0, 0, 10 * sScale, 7.5 * sScale, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Fuzzy pale-tan tomato seed coat
        ctx.fillStyle = '#e6c999';
        ctx.strokeStyle = '#9a7444';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.4 * sScale, 3.8 * sScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // 5. Above-Ground Botanical Architecture
      if (m.speciesArchetype === 'tomato_vine') {
        // --- DETAILED TOMATO SEED-TO-HARVEST LIFECYCLE ---
        const maxVineH = Math.min(groundY * 0.78, 228);
        const vineH = maxVineH * m.shootHeightRatio;

        // Hypocotyl Germination Arch (visible early germination 8%..24%)
        if (m.hypocotylHookProgress > 0.04) {
          ctx.save();
          ctx.globalAlpha = m.hypocotylHookProgress;
          const archH = 22 * m.hypocotylHookProgress;
          ctx.strokeStyle = '#a3e635';
          ctx.lineWidth = 2.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(anchorX, seedDepthY - 2);
          ctx.bezierCurveTo(
            anchorX - 4,
            crownY - archH,
            anchorX + 12,
            crownY - archH * 1.1,
            anchorX + 9,
            crownY - archH * 0.35
          );
          ctx.stroke();
          ctx.restore();
        }

        // Wooden garden stake + twine ties appearing when stem reaches vegetative height
        if (vineH > 68) {
          const stakeTopY = crownY - Math.min(maxVineH * 0.98, vineH + 26);
          const stakeX = anchorX - 10;
          ctx.fillStyle = '#785032';
          ctx.fillRect(stakeX - 2.5, stakeTopY, 5, crownY - stakeTopY + 14);
          ctx.strokeStyle = '#4a2f1b';
          ctx.lineWidth = 0.9;
          ctx.strokeRect(stakeX - 2.5, stakeTopY, 5, crownY - stakeTopY + 14);

          // Twine loop tying stem to stake
          ctx.strokeStyle = '#d6b384';
          ctx.lineWidth = 1.4;
          [0.35, 0.72].forEach((f) => {
            const ty = crownY - vineH * f;
            ctx.beginPath();
            ctx.ellipse(anchorX - 4, ty, 8, 2.5, 0, 0, Math.PI * 2);
            ctx.stroke();
          });
        }

        // Main stem + sympodial curve
        if (vineH > 3) {
          const topX = anchorX + Math.sin(swayBase) * vineH * 0.55;
          const topY = crownY - vineH;
          const midX = anchorX + Math.sin(swayBase * 0.5) * vineH * 0.2 - 3;
          const midY = crownY - vineH * 0.52;

          // Underground hypocotyl base up to crown
          ctx.strokeStyle = '#bef264';
          ctx.lineWidth = 2.6 + m.shootHeightRatio * 2.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(anchorX, seedDepthY - 3);
          ctx.lineTo(anchorX, crownY);
          ctx.stroke();

          // Above-ground herbaceous tomato vine stem
          const stemGrad = ctx.createLinearGradient(anchorX, crownY, topX, topY);
          stemGrad.addColorStop(0, '#3f6212');
          stemGrad.addColorStop(0.5, '#4d7c0f');
          stemGrad.addColorStop(1, '#84cc16');
          ctx.strokeStyle = stemGrad;
          ctx.lineWidth = 2.6 + m.shootHeightRatio * 3.8;
          ctx.beginPath();
          ctx.moveTo(anchorX, crownY);
          ctx.quadraticCurveTo(midX, midY, topX, topY);
          ctx.stroke();

          // Cotyledon pair (Seed leaves emerging near base)
          if (m.cotyledonOpenProgress > 0.05) {
            const cotY = crownY - Math.min(26, vineH * 0.72);
            const cotLen = 18 * m.cotyledonOpenProgress;
            [-1, 1].forEach((side) => {
              ctx.save();
              ctx.translate(anchorX, cotY);
              ctx.rotate(side * (1.15 - m.cotyledonOpenProgress * 0.22) + swayBase * 0.5);
              ctx.fillStyle = m.leafDevelopmentRatio > 0.5 ? '#a3b84c' : '#65a30d';
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.bezierCurveTo(cotLen * 0.35, -4, cotLen * 0.85, -3.5, cotLen, 0);
              ctx.bezierCurveTo(cotLen * 0.85, 3.5, cotLen * 0.35, 4, 0, 0);
              ctx.fill();
              ctx.restore();
            });
          }

          // Compound serrated tomato leaf tiers along the main vine
          const leafNodes = [
            { t: 0.24, side: -1, baseAngle: -2.42, len: 68, seed: 11 },
            { t: 0.32, side: 1, baseAngle: -0.68, len: 74, seed: 22 },
            { t: 0.44, side: -1, baseAngle: -2.55, len: 84, seed: 33 },
            { t: 0.52, side: 1, baseAngle: -0.58, len: 82, seed: 44 },
            { t: 0.64, side: -1, baseAngle: -2.35, len: 76, seed: 55 },
            { t: 0.74, side: 1, baseAngle: -0.78, len: 68, seed: 66 },
            { t: 0.86, side: -1, baseAngle: -2.2, len: 54, seed: 77 },
            { t: 0.94, side: 1, baseAngle: -1.08, len: 42, seed: 88 },
          ];

          leafNodes.forEach((node) => {
            const nodeScale = clamp((m.leafDevelopmentRatio - (node.t - 0.22) * 0.7) * 2.1, 0, 1);
            if (nodeScale <= 0.05 || vineH < node.t * maxVineH * 0.45) return;

            const nt = node.t;
            const nx = (1 - nt) * (1 - nt) * anchorX + 2 * (1 - nt) * nt * midX + nt * nt * topX;
            const ny = (1 - nt) * (1 - nt) * crownY + 2 * (1 - nt) * nt * midY + nt * nt * topY;

            drawTomatoCompoundLeaf(
              ctx,
              nx,
              ny,
              node.baseAngle,
              node.len * nodeScale,
              nodeScale,
              m,
              node.seed,
              swayBase
            );
          });

          // Sympodial Flower & Fruit Trusses (upper/mid clusters)
          const trusses = [
            { t: 0.46, dir: 1, offset: 26 },
            { t: 0.66, dir: -1, offset: 28 },
            { t: 0.82, dir: 1, offset: 22 },
          ];

          trusses.forEach((truss, tIdx) => {
            if (vineH < truss.t * maxVineH * 0.5) return;
            const nt = truss.t;
            const tx = (1 - nt) * (1 - nt) * anchorX + 2 * (1 - nt) * nt * midX + nt * nt * topX;
            const ty = (1 - nt) * (1 - nt) * crownY + 2 * (1 - nt) * nt * midY + nt * nt * topY;

            // Peduncle truss branch
            if (m.flowerProgress > 0.04 || m.fruitFormationProgress > 0.04) {
              const branchEndX = tx + truss.dir * truss.offset;
              const branchEndY = ty + 14;
              ctx.strokeStyle = '#65a30d';
              ctx.lineWidth = 1.9;
              ctx.beginPath();
              ctx.moveTo(tx, ty);
              ctx.quadraticCurveTo(tx + truss.dir * truss.offset * 0.55, ty - 2, branchEndX, branchEndY);
              ctx.stroke();

              // 3 flowers or fruits per truss
              for (let k = 0; k < 3; k++) {
                const fFrac = 0.42 + k * 0.28;
                const fx = lerp(tx, branchEndX, fFrac) + truss.dir * (k - 1) * 4;
                const fy = lerp(ty, branchEndY, fFrac) + 8 + k * 4.5;

                // Fine pedicel stalk
                ctx.strokeStyle = '#4d7c0f';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(lerp(tx, branchEndX, fFrac), lerp(ty, branchEndY, fFrac));
                ctx.lineTo(fx, fy);
                ctx.stroke();

                // Yellow 5-petal tomato flower
                if (m.flowerProgress > 0.06) {
                  drawTomatoBlossom(
                    ctx,
                    fx,
                    fy,
                    8.5,
                    elapsedSec * 0.15 + k + tIdx,
                    m.flowerProgress
                  );
                }

                // Tomato fruit swelling & ripening
                if (m.fruitFormationProgress > 0.06) {
                  const fruitRadius =
                    (11.5 - tIdx * 1.1) *
                    clamp(m.fruitFormationProgress * (1.05 - tIdx * 0.12), 0.15, 1) *
                    (0.75 + m.healthVigor * 0.28);
                  drawTomatoFruit(
                    ctx,
                    fx,
                    fy + fruitRadius * 0.55,
                    fruitRadius,
                    m.ripeningRatio,
                    tIdx * 0.35 + k * 0.12
                  );
                }
              }
            }
          });
        }

        // Harvested Produce Crate sitting beside plant when harvested
        if (m.harvestedCrateFill > 0.5) {
          const crateX = anchorX + 66;
          const crateY = groundY - 38;
          // Crate box
          ctx.fillStyle = '#92400e';
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 1.5;
          ctx.fillRect(crateX, crateY, 66, 38);
          ctx.strokeRect(crateX, crateY, 66, 38);
          // Horizontal wood slats
          ctx.fillStyle = '#b45309';
          ctx.fillRect(crateX + 3, crateY + 6, 60, 8);
          ctx.fillRect(crateX + 3, crateY + 20, 60, 8);
          // Piled glossy crimson tomatoes inside crate
          const pilePositions = [
            [14, 2],
            [28, -2],
            [42, 0],
            [54, 3],
            [21, -8],
            [36, -9],
            [48, -6],
          ];
          pilePositions.forEach(([px, py], i) => {
            drawTomatoFruit(ctx, crateX + px, crateY + py, 8.2, 1, i * 0.04);
          });
        }
      } else if (m.speciesArchetype === 'tall_cereal') {
        // --- MAIZE / SORGHUM / SUGARCANE TALL CEREAL LIFECYCLE ---
        const maxH = Math.min(groundY * 0.84, 245);
        const stalkH = maxH * m.shootHeightRatio;
        if (stalkH > 4) {
          const topX = anchorX + Math.sin(swayBase) * stalkH * 0.42;
          const topY = crownY - stalkH;
          ctx.strokeStyle = '#4d7c0f';
          ctx.lineWidth = 4 + m.shootHeightRatio * 4.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(anchorX, crownY);
          ctx.quadraticCurveTo(anchorX + Math.sin(swayBase * 0.5) * 14, crownY - stalkH * 0.5, topX, topY);
          ctx.stroke();

          // Arching ribbon leaves
          for (let i = 0; i < 8; i++) {
            const t = 0.18 + i * 0.1;
            const visible = clamp((m.leafDevelopmentRatio - t * 0.55) * 2.2, 0, 1);
            if (visible <= 0.05) continue;
            const nx = lerp(anchorX, topX, t);
            const ny = lerp(crownY, topY, t);
            const side = i % 2 === 0 ? 1 : -1;
            const leafL = (62 - t * 24) * visible;
            ctx.strokeStyle = mixRgb([44, 132, 48], [182, 165, 58], (1 - m.healthVigor) * 0.7);
            ctx.lineWidth = 4.2 * visible;
            ctx.beginPath();
            ctx.moveTo(nx, ny);
            ctx.quadraticCurveTo(
              nx + side * leafL * 0.55,
              ny - 18 + m.wiltFactor * 22,
              nx + side * leafL,
              ny + 12 + m.wiltFactor * 28
            );
            ctx.stroke();
          }

          // Apical golden tassel during flowering
          if (m.flowerProgress > 0.08) {
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 1.6;
            for (let b = -2; b <= 2; b++) {
              ctx.beginPath();
              ctx.moveTo(topX, topY);
              ctx.quadraticCurveTo(topX + b * 8, topY - 18, topX + b * 14, topY - 28 * m.flowerProgress);
              ctx.stroke();
            }
          }

          // Axillary cobs + golden silk
          if (m.fruitFormationProgress > 0.08) {
            [0.48, 0.6].forEach((ct, idx) => {
              const cx = lerp(anchorX, topX, ct) + (idx === 0 ? 7 : -7);
              const cy = lerp(crownY, topY, ct);
              const cobL = 26 * m.fruitFormationProgress;
              ctx.save();
              ctx.translate(cx, cy);
              ctx.rotate(idx === 0 ? 0.32 : -0.32);
              ctx.fillStyle = mixRgb([101, 163, 13], [217, 168, 56], m.ripeningRatio * 0.6);
              ctx.beginPath();
              ctx.ellipse(0, -cobL * 0.5, 5.5 * m.fruitFormationProgress, cobL * 0.55, 0, 0, Math.PI * 2);
              ctx.fill();
              // Silk strands
              ctx.strokeStyle = m.ripeningRatio > 0.5 ? '#78350f' : '#fef08a';
              ctx.lineWidth = 1;
              for (let s = -2; s <= 2; s++) {
                ctx.beginPath();
                ctx.moveTo(s * 1.2, -cobL);
                ctx.lineTo(s * 3.5, -cobL - 10);
                ctx.stroke();
              }
              ctx.restore();
            });
          }
        }
      } else if (m.speciesArchetype === 'paddy_tuft') {
        // --- PADDY / WHEAT / MILLET TUFT LIFECYCLE ---
        const maxH = Math.min(groundY * 0.72, 185);
        const tillerCount = 7;
        for (let i = 0; i < tillerCount; i++) {
          const frac = (i / (tillerCount - 1) - 0.5) * 2;
          const h = maxH * m.shootHeightRatio * (0.82 + (1 - Math.abs(frac)) * 0.18);
          if (h < 4) continue;
          const endX = anchorX + frac * (24 + m.leafDevelopmentRatio * 26) + Math.sin(swayBase + i * 0.3) * 14;
          const endY = crownY - h;

          ctx.strokeStyle = mixRgb([56, 148, 56], [212, 174, 52], m.ripeningRatio * 0.85);
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(anchorX + frac * 6, crownY);
          ctx.quadraticCurveTo(anchorX + frac * 14, crownY - h * 0.55, endX, endY);
          ctx.stroke();

          // Nodding golden grain panicle
          if (m.fruitFormationProgress > 0.1 || m.flowerProgress > 0.25) {
            const pLen = 28 * clamp(Math.max(m.fruitFormationProgress, m.flowerProgress * 0.5), 0.1, 1);
            ctx.strokeStyle = mixRgb([163, 230, 53], [234, 179, 8], m.ripeningRatio);
            ctx.lineWidth = 3.6;
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.quadraticCurveTo(
              endX + (frac >= 0 ? 12 : -12),
              endY - pLen * 0.3,
              endX + (frac >= 0 ? 22 : -22),
              endY + pLen * (0.2 + m.ripeningRatio * 0.55)
            );
            ctx.stroke();
          }
        }
      } else {
        // --- BRANCHING BUSH / CHILLI / BRINJAL / COTTON / ROOT-TUBER CANOPY ---
        const maxH = Math.min(groundY * 0.68, 175);
        const stemH = maxH * m.shootHeightRatio;
        if (stemH > 4) {
          const topX = anchorX + Math.sin(swayBase) * stemH * 0.38;
          const topY = crownY - stemH;
          ctx.strokeStyle = '#3f6212';
          ctx.lineWidth = 3.5 + m.shootHeightRatio * 2.5;
          ctx.beginPath();
          ctx.moveTo(anchorX, crownY);
          ctx.lineTo(topX, topY);
          ctx.stroke();

          for (let i = 0; i < 6; i++) {
            const t = 0.25 + i * 0.13;
            const nodeScale = clamp((m.leafDevelopmentRatio - t * 0.4) * 2, 0, 1);
            if (nodeScale <= 0.05) continue;
            const nx = lerp(anchorX, topX, t);
            const ny = lerp(crownY, topY, t);
            const side = i % 2 === 0 ? -1 : 1;
            drawTomatoCompoundLeaf(
              ctx,
              nx,
              ny,
              side > 0 ? -0.75 : -2.38,
              52 * nodeScale,
              nodeScale,
              m,
              300 + i * 19,
              swayBase
            );
          }

          if (m.flowerProgress > 0.06) {
            drawTomatoBlossom(ctx, topX - 18, topY + 26, 7.5, 0.3, m.flowerProgress);
            drawTomatoBlossom(ctx, topX + 18, topY + 18, 7.5, -0.4, m.flowerProgress);
          }
          if (m.fruitFormationProgress > 0.08 && m.speciesArchetype === 'branching_bush') {
            [
              [topX - 16, topY + 34],
              [topX + 16, topY + 24],
            ].forEach(([fx, fy], idx) => {
              ctx.fillStyle =
                curCrop.id === 'cotton'
                  ? '#f8fafc'
                  : curCrop.id === 'brinjal'
                    ? '#7e22ce'
                    : mixRgb([74, 168, 52], [220, 38, 38], m.ripeningRatio);
              ctx.beginPath();
              ctx.ellipse(
                fx,
                fy,
                curCrop.id === 'chilli' ? 3.8 : 7,
                curCrop.id === 'chilli' ? 11 * m.fruitFormationProgress : 7 * m.fruitFormationProgress,
                idx === 0 ? 0.2 : -0.2,
                0,
                Math.PI * 2
              );
              ctx.fill();
            });
          }
        }
      }

      ctx.restore(); // undo zoom/pan transform

      // 6. Lightweight Foreground Rain Overlay (when active scenario has rain)
      if (m.rainIntensity > 0.05) {
        ctx.strokeStyle = `rgba(224, 242, 254, ${0.42 * m.rainIntensity})`;
        ctx.lineWidth = 1.1;
        const dropCount = Math.round(35 + m.rainIntensity * 45);
        for (let i = 0; i < dropCount; i++) {
          const rx = ((seededNoise(i * 19.1) * width + elapsedSec * 140) % (width + 40)) - 20;
          const ry = ((seededNoise(i * 31.7) * height + elapsedSec * 460) % (height * 0.78));
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 4, ry + 13);
          ctx.stroke();
        }
      }

      // 7. Crisp Depth Ruler on Left Edge (Soil Horizon Reference)
      ctx.fillStyle = 'rgba(24, 24, 27, 0.58)';
      ctx.fillRect(10, groundY - 2, 54, 18);
      ctx.fillStyle = '#e4e4e7';
      ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('0 cm Soil', 14, groundY + 10);

      if (m.radicleLengthRatio > 0.05) {
        ctx.fillStyle = 'rgba(24, 24, 27, 0.68)';
        ctx.fillRect(10, height - 28, 86, 18);
        ctx.fillStyle = '#fde68a';
        ctx.fillText(`Root ~${m.rootDepthCm} cm`, 15, height - 15);
      }

      ctx.restore();

      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="relative w-full h-full select-none bg-zinc-950 overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={(e) => {
          e.preventDefault();
          setZoom((z) => z + (e.deltaY < 0 ? 0.14 : -0.14));
        }}
        onMouseDown={(e) => {
          dragRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            origX: pan.x,
            origY: pan.y,
          };
        }}
        onMouseMove={(e) => {
          if (!dragRef.current.active) return;
          setPan({
            x: clamp(dragRef.current.origX + (e.clientX - dragRef.current.startX), -220, 220),
            y: clamp(dragRef.current.origY + (e.clientY - dragRef.current.startY), -180, 180),
          });
        }}
        onMouseUp={() => {
          dragRef.current.active = false;
        }}
        onMouseLeave={() => {
          dragRef.current.active = false;
        }}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Left-Top Botanical Telemetry Badge & Focus Presets */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[250px]">
        <div className="bg-zinc-950/80 backdrop-blur-sm text-white rounded-xl px-3 py-2 text-[11px] border border-white/15 space-y-1 shadow-md">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
            <Sprout className="w-3.5 h-3.5" />
            <span>Botanical Profile · {crop.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-zinc-200">
            <span>Shoot: <strong>{phenology.shootHeightCm} cm</strong></span>
            <span>Root: <strong>{phenology.rootDepthCm} cm</strong></span>
            <span className="inline-flex items-center gap-1">
              <Droplets className="w-3 h-3 text-sky-400" />
              Wetness: <strong>{Math.round(phenology.soilWetness * 100)}%</strong>
            </span>
            <span className="inline-flex items-center gap-1">
              <Sun className="w-3 h-3 text-amber-300" />
              Vigor: <strong>{Math.round(phenology.healthVigor * 100)}%</strong>
            </span>
          </div>
          <div className="text-[10px] text-amber-200/95 pt-0.5 border-t border-white/10">
            {sim.harvested
              ? 'Harvested crate complete'
              : phenology.ripeningRatio > 0.45
                ? phenology.speciesArchetype === 'tall_cereal'
                  ? 'Cobs maturing & husks browning'
                  : phenology.speciesArchetype === 'paddy_tuft'
                    ? 'Golden panicles ripening & drooping'
                    : 'Fruit ripening: breaker -> crimson red'
                : phenology.fruitFormationProgress > 0.15
                  ? phenology.speciesArchetype === 'tall_cereal'
                    ? 'Axillary cobs & golden silk filling'
                    : phenology.speciesArchetype === 'paddy_tuft'
                      ? 'Grain panicles filling cleanly'
                      : 'Young green fruit clusters swelling'
                  : phenology.flowerProgress > 0.15
                    ? phenology.speciesArchetype === 'tall_cereal'
                      ? 'Apical tassel & silk pollination'
                      : 'Blossom clusters active'
                    : phenology.leafDevelopmentRatio > 0.1
                      ? 'Vegetative canopy & root branching'
                      : phenology.radicleLengthRatio > 0.02
                        ? 'Radicle & hypocotyl emergence'
                        : sim.sown
                          ? 'Seed placed in prepared seedbed'
                          : stageMeta.label}
          </div>
        </div>

        {/* Camera Focus Presets */}
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['full', 'Full Plant'],
              ['roots', 'Roots & Seed'],
              ['canopy', 'Flowers & Fruit'],
            ] as [FocusPreset, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => handlePreset(id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition ${
                focusPreset === id
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                  : 'bg-zinc-950/75 text-zinc-200 border-white/15 hover:bg-zinc-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom-Left Zoom Controls */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 bg-zinc-950/80 backdrop-blur-sm border border-white/15 rounded-xl p-1 text-white text-[11px]">
        <button
          type="button"
          onClick={() => setZoom((z) => z - 0.2)}
          className="p-1.5 rounded-lg hover:bg-white/10"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="px-1.5 font-mono text-[10px] min-w-[38px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => z + 0.2)}
          className="p-1.5 rounded-lg hover:bg-white/10"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handlePreset('full')}
          className="p-1.5 rounded-lg hover:bg-white/10"
          title="Reset Camera"
          aria-label="Reset Camera"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Optional Right-Top Synchronized HUD Summary when rendered standalone */}
      {showOverlayHud && (
        <div className="hidden sm:block absolute top-3 right-3 z-20 bg-zinc-950/80 backdrop-blur-sm text-white rounded-xl p-2.5 text-[10px] border border-white/15 max-w-[200px] pointer-events-none space-y-0.5">
          <div className="font-bold text-emerald-300 text-xs flex justify-between gap-2">
            <span>{crop.name}</span>
            <span>{areaAcres.toFixed(2)} ac</span>
          </div>
          <div>
            Day <strong>{sim.currentDay}</strong> / {sim.totalDays} · <strong>{Math.round(sim.growthPct)}%</strong>
          </div>
          <div className="text-emerald-200">{stageMeta.label}</div>
          <div>Est. Yield: <strong>{projectedYieldKg.toLocaleString('en-IN')} kg</strong></div>
          <div className="text-zinc-300">Harvest: {estimatedHarvestDate}</div>
        </div>
      )}
    </div>
  );
}
