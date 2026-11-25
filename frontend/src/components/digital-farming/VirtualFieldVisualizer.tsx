// frontend/src/components/digital-farming/VirtualFieldVisualizer.tsx
'use client';

import React, { useMemo } from 'react';
import { useFarm } from '@/context/FarmContext';
import { localizeCropName, localizeGrowthStage } from '@/lib/translations';
import { LatLonPoint } from '@/lib/digital-farming/geo';
import { CropCatalogItem } from '@/lib/digital-farming/crops';
import { GROWTH_STAGES, SimulationState } from '@/lib/digital-farming/simulator';

interface VirtualFieldVisualizerProps {
  points: LatLonPoint[];
  crop: CropCatalogItem;
  sim: SimulationState;
  areaAcres: number;
}

export function VirtualFieldVisualizer({
  points,
  crop,
  sim,
  areaAcres,
}: VirtualFieldVisualizerProps) {
  const { language } = useFarm();
  const stageMeta = GROWTH_STAGES.find((s) => s.id === sim.stage) || GROWTH_STAGES[0];

  // Project lat/lon polygon to SVG 520x280 viewport
  const { svgPolygonPoints, samplePlantCoords } = useMemo(() => {
    const W = 520;
    const H = 280;
    const pad = 28;

    const fallbackPts: LatLonPoint[] =
      points.length >= 3
        ? points
        : [
            { lat: 13.3412, lon: 77.1135 },
            { lat: 13.3412, lon: 77.1144 },
            { lat: 13.3403, lon: 77.1145 },
            { lat: 13.3402, lon: 77.1134 },
          ];

    const lats = fallbackPts.map((p) => p.lat);
    const lons = fallbackPts.map((p) => p.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const spanLon = Math.max(1e-6, maxLon - minLon);
    const spanLat = Math.max(1e-6, maxLat - minLat);
    const scale = Math.min((W - pad * 2) / spanLon, (H - pad * 2) / spanLat);

    const projected = fallbackPts.map((p) => {
      const x = pad + ((p.lon - minLon) * scale + (W - pad * 2 - spanLon * scale) / 2);
      const y = H - pad - ((p.lat - minLat) * scale + (H - pad * 2 - spanLat * scale) / 2);
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    });

    // Point-in-polygon check for representative crop rows
    const inside = (x: number, y: number) => {
      let c = false;
      for (let i = 0, j = projected.length - 1; i < projected.length; j = i++) {
        const xi = projected[i].x;
        const yi = projected[i].y;
        const xj = projected[j].x;
        const yj = projected[j].y;
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
        if (intersect) c = !c;
      }
      return c;
    };

    const coords: { x: number; y: number }[] = [];
    for (let y = 44; y <= H - 40; y += 30) {
      for (let x = 46; x <= W - 46; x += 34) {
        if (inside(x, y)) {
          coords.push({ x, y });
        }
      }
    }

    return {
      svgPolygonPoints: projected.map((p) => `${p.x},${p.y}`).join(' '),
      samplePlantCoords: coords.slice(0, 48),
    };
  }, [points]);

  // Soil color reflects moisture + preparation
  const soilFill = useMemo(() => {
    if (sim.soilMoisturePct > 82) return '#4a3b2c'; // saturated dark
    if (sim.soilMoisturePct > 50) return sim.soilPrepared ? '#6d4c33' : '#7c5c3e';
    if (sim.soilMoisturePct > 30) return '#947350';
    return '#b5926b'; // dry
  }, [sim.soilMoisturePct, sim.soilPrepared]);

  const plantScale = useMemo(() => {
    if (!sim.sown || sim.stage === 'empty_land' || sim.stage === 'soil_preparation') return 0;
    if (sim.stage === 'sowing') return 0.25;
    if (sim.stage === 'germination') return 0.4;
    if (sim.stage === 'seedlings') return 0.58;
    if (sim.stage === 'vegetative') return 0.8;
    if (sim.stage === 'flowering') return 0.95;
    if (sim.stage === 'fruit_formation' || sim.stage === 'maturity') return 1.05;
    return 0.35; // harvested stubble
  }, [sim.sown, sim.stage]);

  const isStressed = sim.weatherStressPct > 45 || sim.cropHealthPct < 55;
  const leafColor = isStressed ? '#84cc16' : '#16a34a';
  const darkLeafColor = isStressed ? '#65a30d' : '#15803d';

  const renderPlant = (x: number, y: number, idx: number) => {
    if (plantScale === 0) return null;
    if (sim.stage === 'sowing') {
      return <circle key={idx} cx={x} cy={y} r={2.4} fill="#fde68a" stroke="#92400e" strokeWidth={0.7} />;
    }
    if (sim.stage === 'harvested') {
      return <line key={idx} x1={x} y1={y + 3} x2={x} y2={y - 5} stroke="#ca8a04" strokeWidth={2} />;
    }

    const showFlowers = sim.stage === 'flowering';
    const showFruits = sim.stage === 'fruit_formation' || sim.stage === 'maturity';

    return (
      <g key={idx} transform={`translate(${x}, ${y}) scale(${plantScale})`}>
        {crop.visualType === 'tall_cereal' || crop.visualType === 'cane' ? (
          <>
            <line x1={0} y1={4} x2={0} y2={-18} stroke={darkLeafColor} strokeWidth={2.4} />
            <path d="M0,-6 Q-10,-12 -12,-5" fill="none" stroke={leafColor} strokeWidth={2} />
            <path d="M0,-10 Q10,-16 12,-9" fill="none" stroke={leafColor} strokeWidth={2} />
            {showFlowers && <line x1={0} y1={-18} x2={0} y2={-23} stroke="#fde047" strokeWidth={2} />}
            {showFruits && <ellipse cx={3} cy={-10} rx={2.5} ry={5} fill="#facc15" />}
          </>
        ) : crop.visualType === 'paddy' ? (
          <>
            <path d="M0,4 L-5,-12 M0,4 L0,-14 M0,4 L5,-11" stroke={leafColor} strokeWidth={1.6} />
            {showFruits && <circle cx={0} cy={-14} r={2.2} fill="#eab308" />}
          </>
        ) : crop.visualType === 'tree' ? (
          <>
            <rect x={-2} y={-8} width={4} height={12} fill="#78350f" />
            <circle cx={0} cy={-14} r={10} fill={leafColor} opacity={0.92} />
            {showFlowers && <circle cx={-3} cy={-16} r={2} fill="#fef08a" />}
            {showFruits && <circle cx={4} cy={-12} r={2.8} fill="#f59e0b" />}
          </>
        ) : crop.visualType === 'root' ? (
          <>
            <path d="M0,2 Q-6,-8 -9,-4 M0,2 L0,-11 M0,2 Q6,-8 9,-4" fill="none" stroke={leafColor} strokeWidth={2} />
            {showFruits && <ellipse cx={0} cy={4} rx={4} ry={2.5} fill="#ea580c" />}
          </>
        ) : (
          /* vine / bush (Tomato, Chilli, Brinjal, etc.) */
          <>
            <circle cx={0} cy={-6} r={7.5} fill={leafColor} />
            <circle cx={-4} cy={-4} r={4.5} fill={darkLeafColor} />
            {showFlowers && <circle cx={2} cy={-10} r={2.1} fill="#fde047" />}
            {showFruits && (
              <>
                <circle cx={-2} cy={-7} r={2.6} fill={crop.id === 'chilli' ? '#dc2626' : '#ef4444'} />
                <circle cx={3} cy={-5} r={2.3} fill={crop.id === 'brinjal' ? '#7e22ce' : '#ef4444'} />
              </>
            )}
          </>
        )}
      </g>
    );
  };

  const vTitle =
    language === 'kn' ? 'ವರ್ಚುವಲ್ ಜಮೀನು ಮಾದರಿ' : language === 'hi' ? 'वर्चुअल खेत मॉडल' : language === 'te' ? 'వర్చువల్ పొలం నమూనా' : 'Virtual Farmland Twin';
  const vAcres = language === 'kn' ? 'ಎಕರೆ' : language === 'hi' ? 'एकड़' : language === 'te' ? 'ఎకరాలు' : 'acres';
  const vStage = language === 'kn' ? 'ಹಂತ:' : language === 'hi' ? 'चरण:' : language === 'te' ? 'దశ:' : 'Stage:';
  const vDay = language === 'kn' ? 'ದಿನ' : language === 'hi' ? 'दिन' : language === 'te' ? 'రోజు' : 'Day';
  const vSimNote =
    language === 'kn'
      ? 'ಸಿಮ್ಯುಲೇಶನ್ ದೃಶ್ಯ (ಉಪಗ್ರಹ ಚಿತ್ರವಲ್ಲ)'
      : language === 'hi'
        ? 'अनुमानित मॉडल दृश्य (वास्तविक उपग्रह चित्र नहीं)'
        : language === 'te'
          ? 'అంచనా సిమ్యులేషన్ దృశ్యం (ఉపగ్రహ చిత్రం కాదు)'
          : 'Representative simulation view (not a real satellite observation)';
  const vDaysRem =
    language === 'kn' ? 'ದಿನಗಳು ಬಾಕಿ' : language === 'hi' ? 'दिन शेष' : language === 'te' ? 'రోజులు మిగిలాయి' : 'days remaining';

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {vTitle} — {localizeCropName(crop.name, language)} ({areaAcres.toFixed(2)} {vAcres})
          </h3>
          <p className="text-xs text-zinc-500">
            {vStage} <span className="font-semibold text-emerald-700">{localizeGrowthStage(stageMeta.label, language)}</span> · {vDay} {sim.currentDay} / {sim.totalDays} ({Math.round(sim.growthPct)}%)
          </p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
          {vSimNote}
        </span>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-emerald-200 bg-gradient-to-b from-sky-100 via-emerald-50 to-emerald-100 dark:from-zinc-800 dark:to-zinc-900">
        <svg viewBox="0 0 520 280" className="w-full h-64 sm:h-72 block">
          <defs>
            <clipPath id="df-farm-poly-clip">
              <polygon points={svgPolygonPoints} />
            </clipPath>
          </defs>

          {/* Outer farm boundary shadow */}
          <polygon
            points={svgPolygonPoints}
            fill={soilFill}
            stroke="#166534"
            strokeWidth={3}
          />

          {/* Soil furrows inside clipped polygon */}
          <g clipPath="url(#df-farm-poly-clip)">
            {sim.soilPrepared &&
              Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={i}
                  x1={0}
                  y1={28 + i * 22}
                  x2={520}
                  y2={28 + i * 22}
                  stroke="#3f2e1e"
                  strokeWidth={1}
                  opacity={0.35}
                />
              ))}

            {/* Paddy standing water sheen */}
            {crop.visualType === 'paddy' && sim.soilMoisturePct > 55 && (
              <rect x={0} y={0} width={520} height={280} fill="#38bdf8" opacity={0.22} />
            )}

            {/* Representative crop rows */}
            {samplePlantCoords.map((pt, idx) => renderPlant(pt.x, pt.y, idx))}

            {/* Weather overlays */}
            {(sim.scenario === 'excessive_rain' || sim.scenario === 'unseasonal_rain') &&
              Array.from({ length: 24 }).map((_, i) => (
                <line
                  key={i}
                  x1={20 + (i * 21) % 490}
                  y1={10 + (i * 37) % 240}
                  x2={12 + (i * 21) % 490}
                  y2={26 + (i * 37) % 240}
                  stroke="#0284c7"
                  strokeWidth={1.6}
                  opacity={0.55}
                />
              ))}
            {sim.scenario === 'heat_stress' && (
              <rect x={0} y={0} width={520} height={280} fill="#f97316" opacity={0.14} />
            )}
            {sim.scenario === 'drought' && (
              <rect x={0} y={0} width={520} height={280} fill="#ca8a04" opacity={0.16} />
            )}
          </g>
        </svg>

        {/* Bottom progress bar */}
        <div className="px-3 py-2 bg-white/90 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-3 text-xs">
          <div className="flex-1 bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.round(sim.growthPct))}%` }}
            />
          </div>
          <span className="font-semibold text-zinc-700 dark:text-zinc-200 shrink-0">
            {Math.max(0, sim.totalDays - sim.currentDay)} {vDaysRem}
          </span>
        </div>
      </div>
    </div>
  );
}
