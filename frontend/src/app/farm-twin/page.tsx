// frontend/src/app/farm-twin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { localizeGrowthStage, localizeCondition, formatLocalizedDate } from '@/lib/translations';
import { Language } from '@/types';
import {
  simulateFarmTwin,
  ScientificModuleOutput,
  MODULE_TRANSLATIONS,
} from '@/lib/scientificApi';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Layers, Sprout, Activity, RotateCw, Info } from 'lucide-react';

const FARM_TWIN_I18N: Record<Language, {
  title: string; badge: string; sub: string;
  rainScen: string; irrDef: string; baseIrr: string;
  canopy: string; daysSince: string; rootDepth: string; stageProg: string;
  scenRet: string; days7Etc: string; supplyLbl: string;
  trajTitle: string; modeledMoistName: string; zoneBalTitle: string; haUnit: string; modeledMoistLbl: string; modelDisc: string;
}> = {
  en: {
    title: 'Digital Farm Twin', badge: 'Water-Balance Model',
    sub: 'Virtual farm crop timeline, 7-day root-zone water balance, and irrigation scenarios',
    rainScen: 'Rainfall Scenario', irrDef: 'Irrigation Deficit', baseIrr: 'Recent Irrigation (mm)',
    canopy: 'Canopy Cover', daysSince: 'days since sowing', rootDepth: 'Root Depth', stageProg: 'Stage progress:',
    scenRet: 'Yield Retention', days7Etc: '7-day Water Need:', supplyLbl: 'Supply:',
    trajTitle: '7-Day Modeled Soil Moisture Trajectory (%)', modeledMoistName: 'Modeled Moisture %',
    zoneBalTitle: 'Farm Zone Water Balance', haUnit: 'ha', modeledMoistLbl: 'Moisture:', modelDisc: 'Model Note:',
  },
  kn: {
    title: 'ಡಿಜಿಟಲ್ ಫಾರ್ಮ್ ಟ್ವಿನ್', badge: 'ನೀರಿನ ಸಮತೋಲನ ಮಾದರಿ',
    sub: 'ಜಮೀನಿನ ಬೆಳೆ ಕಾಲಾನುಕ್ರಮ, 7-ದಿನದ ಬೇರಿನ ತೇವಾಂಶ ಮತ್ತು ನೀರಾವರಿ ಸನ್ನಿವೇಶಗಳು',
    rainScen: 'ಮಳೆ ಪ್ರಮಾಣ', irrDef: 'ನೀರಾವರಿ ಕೊರತೆ', baseIrr: 'ಇತ್ತೀಚಿನ ನೀರಾವರಿ (ಮಿ.ಮೀ)',
    canopy: 'ಎಲೆ ಹರಡುವಿಕೆ', daysSince: 'ದಿನಗಳು (ಬಿತ್ತನೆಯಿಂದ)', rootDepth: 'ಬೇರಿನ ಆಳ', stageProg: 'ಹಂತದ ಪ್ರಗತಿ:',
    scenRet: 'ಅಂದಾಜು ಇಳುವರಿ ಉಳಿಕೆ', days7Etc: '7-ದಿನದ ನೀರಿನ ಅಗತ್ಯ:', supplyLbl: 'ಪೂರೈಕೆ:',
    trajTitle: '7-ದಿನದ ಮಣ್ಣಿನ ತೇವಾಂಶ ಮುನ್ಸೂಚನೆ (%)', modeledMoistName: 'ಅಂದಾಜು ತೇವಾಂಶ %',
    zoneBalTitle: 'ಜಮೀನಿನ ವಲಯವಾರು ನೀರಿನ ಸಮತೋಲನ', haUnit: 'ಹೆ.', modeledMoistLbl: 'ತೇವಾಂಶ:', modelDisc: 'ಮಾದರಿ ಮಾಹಿತಿ:',
  },
  hi: {
    title: 'डिजिटल फार्म ट्विन', badge: 'जल-संतुलन मॉडल',
    sub: 'फसल समय-सीमा, 7-दिन मिट्टी नमी संतुलन और सिंचाई कमी परिदृश्य',
    rainScen: 'वर्षा परिदृश्य', irrDef: 'सिंचाई कमी', baseIrr: 'हाल की सिंचाई (मिमी)',
    canopy: 'फसल फैलाव', daysSince: 'दिन (बुवाई से)', rootDepth: 'जड़ की गहराई', stageProg: 'चरण प्रगति:',
    scenRet: 'उपज संरक्षण अनुमान', days7Etc: '7-दिन पानी की मांग:', supplyLbl: 'आपूर्ति:',
    trajTitle: '7-दिन अनुमानित जड़-क्षेत्र नमी (%)', modeledMoistName: 'अनुमानित नमी %',
    zoneBalTitle: 'खेत क्षेत्रवार जल संतुलन', haUnit: 'हे.', modeledMoistLbl: 'नमी:', modelDisc: 'मॉडल विवरण:',
  },
  te: {
    title: 'డిజిటల్ ఫార్మ్ ట్ವಿన్', badge: 'నీటి-సమతుల్యత నమూనా',
    sub: 'పొలం పంట కాలక్రమం, 7-రోజుల నేల తేమ సమతుల్యత మరియు నీటిపారుదల అంచనాలు',
    rainScen: 'వర్షపాతం అంచనా', irrDef: 'నీటిపారుదల లోటు', baseIrr: 'ఇటీవలి నీరు (మి.మీ)',
    canopy: 'ఆకుల విస్తరణ', daysSince: 'రోజులు (విత్తినప్పటి నుండి)', rootDepth: 'వేరు లోతు', stageProg: 'దశ పురోగతి:',
    scenRet: 'దిగుబడి నిలుపుదల', days7Etc: '7-రోజుల నీటి అవసరం:', supplyLbl: 'సరఫరా:',
    trajTitle: '7-రోజుల అంచనా నేల తేమ (%)', modeledMoistName: 'అంచనా తేమ %',
    zoneBalTitle: 'పొలం విభాగాల నీటి సమతుల్యత', haUnit: 'హె.', modeledMoistLbl: 'తేమ:', modelDisc: 'నమూనా వివరణ:',
  },
};

export default function DigitalFarmTwinPage() {
  const { currentFarm, language } = useFarm();
  const mt = MODULE_TRANSLATIONS[language] || MODULE_TRANSLATIONS.en;
  const L = FARM_TWIN_I18N[language] || FARM_TWIN_I18N.en;

  const [rainfallMult, setRainfallMult] = useState<number>(1.0);
  const [deficitPct, setDeficitPct] = useState<number>(0);
  const [recentIrrMm, setRecentIrrMm] = useState<number>(12);
  const [output, setOutput] = useState<ScientificModuleOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const runTwin = async () => {
    setIsLoading(true);
    try {
      const res = await simulateFarmTwin({
        farm_id: currentFarm?.id,
        latitude: currentFarm?.latitude ?? 12.5234,
        longitude: currentFarm?.longitude ?? 76.8976,
        farm_area_ha: currentFarm?.land_area_ha || 2.5,
        crop_type: currentFarm?.primary_crop || 'Tomato',
        sowing_date: currentFarm?.sowing_date || '2026-10-15',
        crop_stage: currentFarm?.crop_stage || 'Mid-Season',
        soil_type: currentFarm?.soil_type || 'Red Sandy Loam',
        available_water_m3: currentFarm?.available_water_m3 || 14500,
        recent_irrigation_mm: recentIrrMm,
        cultivation_expenses_inr: currentFarm?.cultivation_budget_inr || 85000,
        rainfall_scenario_multiplier: rainfallMult,
        irrigation_deficit_pct: deficitPct,
      });
      setOutput(res);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runTwin();
  }, [currentFarm?.id]);

  const r = output?.results;
  const tl = r?.crop_timeline;
  const scen = r?.scenario_summary;
  const daily = r?.daily_water_balance || [];
  const zones = r?.zones || [];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                {L.title}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                {L.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {L.sub}
            </p>
          </div>
        </div>
      </div>

      {/* Scenario Controls */}
      <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            {L.rainScen} (×{rainfallMult})
          </label>
          <input
            type="range"
            min="0"
            max="2.5"
            step="0.25"
            value={rainfallMult}
            onChange={(e) => setRainfallMult(parseFloat(e.target.value))}
            className="w-full accent-green-700"
          />
        </div>
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            {L.irrDef} ({deficitPct}%)
          </label>
          <input
            type="range"
            min="0"
            max="75"
            step="5"
            value={deficitPct}
            onChange={(e) => setDeficitPct(parseInt(e.target.value))}
            className="w-full accent-green-700"
          />
        </div>
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            {L.baseIrr}
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={recentIrrMm}
            onChange={(e) => setRecentIrrMm(parseFloat(e.target.value) || 0)}
            className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <button
          onClick={runTwin}
          disabled={isLoading}
          className="py-2.5 px-4 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
        >
          {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
          {mt.runSimulation}
        </button>
      </div>

      {tl && scen && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500 text-xs">
                <span>{L.canopy} ({localizeGrowthStage(tl.crop_stage, language)})</span>
                <Sprout className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">{tl.canopy_cover_pct}%</div>
              <p className="text-[11px] text-zinc-400">
                {tl.days_since_sowing} {L.daysSince} ({formatLocalizedDate(tl.sowing_date, language)})
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-zinc-500 text-xs">
                <span>{L.rootDepth}</span>
                <Activity className="w-4 h-4 text-teal-500" />
              </div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">{tl.effective_root_depth_cm} cm</div>
              <p className="text-[11px] text-zinc-400">{L.stageProg} {tl.stage_progress_pct}%</p>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-2">
              <div className="text-xs text-zinc-500">{L.scenRet}</div>
              <div className="text-3xl font-bold text-emerald-600">{scen.modeled_yield_retention_pct}%</div>
              <p className="text-[11px] text-zinc-400">
                {L.days7Etc} {scen.total_7d_etc_mm} mm • {L.supplyLbl} {scen.total_7d_water_supply_mm} mm
              </p>
            </div>
          </div>

          {daily.length > 0 && (
            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {L.trajTitle}
              </h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="modeled_soil_moisture_pct"
                      stroke="#0f766e"
                      fill="#14b8a6"
                      fillOpacity={0.2}
                      name={L.modeledMoistName}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Multi-Zone Breakdown */}
          <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{L.zoneBalTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {zones.map((z: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <div className="font-bold text-zinc-900 dark:text-white">{z.zone_name}</div>
                  <div className="text-zinc-500">{z.area_ha} {L.haUnit} • {localizeCondition(z.soil_type, language)}</div>
                  <div className="font-semibold text-teal-600">{L.modeledMoistLbl} {z.modeled_moisture_pct}% ({localizeCondition(z.status, language)})</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-500 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
            <div>
              <strong>{L.modelDisc}</strong> {r.model_type}. {mt.sourceLabel}: {output?.source}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
