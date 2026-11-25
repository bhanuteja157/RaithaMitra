// frontend/src/app/irrigation/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  calculateScientificIrrigation,
  ScientificModuleOutput,
  MODULE_TRANSLATIONS,
} from '@/lib/scientificApi';
import { Language } from '@/types';
import { getIntlLocale, localizeCondition, localizeCropName, localizeGrowthStage } from '@/lib/translations';
import {
  Droplets,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  RotateCw,
} from 'lucide-react';

const IRRIGATION_I18N: Record<
  Language,
  {
    title: string;
    liveEt0: string;
    modeledBadge: string;
    formulaSub: string;
    cropType: string;
    growthStage: string;
    farmArea: string;
    method: string;
    canalBasin: string;
    refEt0: string;
    autoOpenMeteo: string;
    effRain: string;
    pumpFlow: string;
    cropEtc: string;
    mmDay: string;
    effRainShort: string;
    netGrossDepth: string;
    mmUnit: string;
    efficiency: string;
    dailyGrossVol: string;
    haUnit: string;
    netLabel: string;
    estDurationTitle: string;
    hrsUnit: string;
    setFlowRate: string;
    etcFormula: string;
    netDepthFormula: string;
    grossDepthFormula: string;
    volFormula: string;
    uncertainty: string;
    rootZoneMoisture: string;
    waterBalanceNote: string;
  }
> = {
  en: {
    title: 'Scientific Precision Irrigation (FAO-56)',
    liveEt0: 'Live Open-Meteo ET0',
    modeledBadge: 'FAO-56 Modeled',
    formulaSub: 'ETc = Kc × ET0 • Volumetric conversion: 1 mm over 1 ha = 10 m³',
    cropType: 'Crop Type',
    growthStage: 'Growth Stage',
    farmArea: 'Farm Area (ha)',
    method: 'Irrigation Method',
    canalBasin: 'Canal Basin',
    refEt0: 'Reference ET0 (mm/day, blank = live)',
    autoOpenMeteo: 'Auto from Open-Meteo',
    effRain: 'Effective Rainfall (mm/day)',
    pumpFlow: 'Pump Flow Rate (m³/hr)',
    cropEtc: 'Crop ETc',
    mmDay: 'mm/day',
    effRainShort: 'Eff. Rain:',
    netGrossDepth: 'Net / Gross Irrigation Depth',
    mmUnit: 'mm',
    efficiency: 'Efficiency:',
    dailyGrossVol: 'Daily Gross Volume',
    haUnit: 'ha',
    netLabel: 'Net:',
    estDurationTitle: 'Estimated Duration & Timing',
    hrsUnit: 'hrs',
    setFlowRate: 'Set flow rate',
    etcFormula: 'ETc:',
    netDepthFormula: 'Net Depth:',
    grossDepthFormula: 'Gross Depth:',
    volFormula: 'Volume:',
    uncertainty: 'Uncertainty:',
    rootZoneMoisture: 'Estimated Root-Zone Moisture:',
    waterBalanceNote: '(Modeled water-balance estimate, NOT a physical sensor reading)',
  },
  kn: {
    title: 'ವೈಜ್ಞಾನಿಕ ನಿಖರ ನೀರಾವರಿ (FAO-56)',
    liveEt0: 'ನೇರ Open-Meteo ET0',
    modeledBadge: 'FAO-56 ಮಾದರಿ',
    formulaSub: 'ETc = Kc × ET0 • ಘನ ಅಳತೆ: 1 ಹೆಕ್ಟೇರ್‌ನಲ್ಲಿ 1 ಮಿ.ಮೀ = 10 ಘ.ಮೀ',
    cropType: 'ಬೆಳೆ ಪ್ರಕಾರ',
    growthStage: 'ಬೆಳವಣಿಗೆ ಹಂತ',
    farmArea: 'ಜಮೀನು ವಿಸ್ತೀರ್ಣ (ಹೆಕ್ಟೇರ್)',
    method: 'ನೀರಾವರಿ ವಿಧಾನ',
    canalBasin: 'ಕಾಲುವೆ ನೀರಾವರಿ',
    refEt0: 'ಆಧಾರ ET0 (ಮಿ.ಮೀ/ದಿನ, ಖಾಲಿ = ನೇರ)',
    autoOpenMeteo: 'Open-Meteo ನಿಂದ ಸ್ವಯಂ',
    effRain: 'ಪರಿಣಾಮಕಾರಿ ಮಳೆ (ಮಿ.ಮೀ/ದಿನ)',
    pumpFlow: 'ಪಂಪ್ ಹರಿವು ವೇಗ (ಘ.ಮೀ/ಗಂ)',
    cropEtc: 'ಬೆಳೆ ನೀರಿನ ಅಗತ್ಯ (ETc)',
    mmDay: 'ಮಿ.ಮೀ/ದಿನ',
    effRainShort: 'ಪರಿಣಾಮಕಾರಿ ಮಳೆ:',
    netGrossDepth: 'ನಿವ್ವಳ / ಒಟ್ಟು ನೀರಾವರಿ ಆಳ',
    mmUnit: 'ಮಿ.ಮೀ',
    efficiency: 'ದಕ್ಷತೆ:',
    dailyGrossVol: 'ದೈನಂದಿನ ಒಟ್ಟು ನೀರಿನ ಪ್ರಮಾಣ',
    haUnit: 'ಹೆ.',
    netLabel: 'ನಿವ್ವಳ:',
    estDurationTitle: 'ಅಂದಾಜು ಪಂಪ್ ಸಮಯ ಮತ್ತು ವೇಳಾಪಟ್ಟಿ',
    hrsUnit: 'ಗಂಟೆಗಳು',
    setFlowRate: 'ಹರಿವು ವೇಗ ನಮೂದಿಸಿ',
    etcFormula: 'ETc:',
    netDepthFormula: 'ನಿವ್ವಳ ಆಳ:',
    grossDepthFormula: 'ಒಟ್ಟು ಆಳ:',
    volFormula: 'ಪ್ರಮಾಣ:',
    uncertainty: 'ಅನಿಶ್ಚಿತತೆ:',
    rootZoneMoisture: 'ಅಂದಾಜು ಬೇರು ವಲಯ ತೇವಾಂಶ:',
    waterBalanceNote: '(ಮಾದರಿ ನೀರಿನ-ಸಮತೋಲನ ಅಂದಾಜು, ಭೌತಿಕ ಸೆನ್ಸರ್ ಅಳತೆ ಅಲ್ಲ)',
  },
  hi: {
    title: 'वैज्ञानिक सटीक सिंचाई (FAO-56)',
    liveEt0: 'लाइव Open-Meteo ET0',
    modeledBadge: 'FAO-56 मॉडल',
    formulaSub: 'ETc = Kc × ET0 • आयतन रूपांतरण: 1 हेक्टेयर पर 1 मिमी = 10 घन मीटर',
    cropType: 'फसल का प्रकार',
    growthStage: 'विकास चरण',
    farmArea: 'खेत क्षेत्रफल (हेक्टेयर)',
    method: 'सिंचाई विधि',
    canalBasin: 'नहर बेसिन',
    refEt0: 'संदर्भ ET0 (मिमी/दिन, खाली = लाइव)',
    autoOpenMeteo: 'Open-Meteo से स्वतः',
    effRain: 'प्रभावी वर्षा (मिमी/दिन)',
    pumpFlow: 'पंप प्रवाह दर (m³/घंटा)',
    cropEtc: 'फसल ETc',
    mmDay: 'मिमी/दिन',
    effRainShort: 'प्रभावी वर्षा:',
    netGrossDepth: 'शुद्ध / सकल सिंचाई गहराई',
    mmUnit: 'मिमी',
    efficiency: 'दक्षता:',
    dailyGrossVol: 'दैनिक सकल जल मात्रा',
    haUnit: 'हे.',
    netLabel: 'शुद्ध:',
    estDurationTitle: 'अनुमानित अवधि व समय',
    hrsUnit: 'घंटे',
    setFlowRate: 'प्रवाह दर दर्ज करें',
    etcFormula: 'ETc:',
    netDepthFormula: 'शुद्ध गहराई:',
    grossDepthFormula: 'सकल गहराई:',
    volFormula: 'जल मात्रा:',
    uncertainty: 'अनिश्चितता:',
    rootZoneMoisture: 'अनुमानित जड़-क्षेत्र नमी:',
    waterBalanceNote: '(मॉडल आधारित जल-संतुलन अनुमान, भौतिक सेंसर रीडिंग नहीं)',
  },
  te: {
    title: 'శాస్త్రీయ ఖచ్చితమైన నీటిపారుదల (FAO-56)',
    liveEt0: 'లైవ్ Open-Meteo ET0',
    modeledBadge: 'FAO-56 మోడల్',
    formulaSub: 'ETc = Kc × ET0 • ఘనపరిమాణం: 1 హెక్టార్‌లో 1 మి.మీ = 10 ఘ.మీ',
    cropType: 'పంట రకం',
    growthStage: 'పెరుగుదల దశ',
    farmArea: 'పొలం విస్తీర్ణం (హెక్టార్లు)',
    method: 'నీటిపారుదల పద్ధతి',
    canalBasin: 'కాలువ బేసిన్',
    refEt0: 'ఆధార ET0 (మి.మీ/రోజు, ఖాళీ = లైవ్)',
    autoOpenMeteo: 'Open-Meteo నుండి ఆటో',
    effRain: 'ప్రభావవంతమైన వర్షం (మి.మీ/రోజు)',
    pumpFlow: 'పంప్ ప్రవాహ వేగం (m³/గం)',
    cropEtc: 'పంట ETc',
    mmDay: 'మి.మీ/రోజు',
    effRainShort: 'వర్షం:',
    netGrossDepth: 'నికర / స్థూల నీటి లోతు',
    mmUnit: 'మి.మీ',
    efficiency: 'సామర్థ్యం:',
    dailyGrossVol: 'రోజువారీ మొత్తం నీరు',
    haUnit: 'హె.',
    netLabel: 'నికర:',
    estDurationTitle: 'అంచనా సమయం & షెడ్యూల్',
    hrsUnit: 'గంటలు',
    setFlowRate: 'ప్రవాహ వేగం నమోదు చేయండి',
    etcFormula: 'ETc:',
    netDepthFormula: 'నికర లోతు:',
    grossDepthFormula: 'మొత్తం లోతు:',
    volFormula: 'పరిమాణం:',
    uncertainty: 'అనిశ్చితి:',
    rootZoneMoisture: 'అంచనా వేరు మండల తేమ:',
    waterBalanceNote: '(మోడల్ నీటి-సమతుల్య అంచనా మాత్రమే, భౌతిక సెన్సార్ రీడింగ్ కాదు)',
  },
};

export default function IrrigationPage() {
  const { currentFarm, weather, language } = useFarm();
  const mt = MODULE_TRANSLATIONS[language] || MODULE_TRANSLATIONS.en;
  const t = IRRIGATION_I18N[language];
  const numLocale = getIntlLocale(language);

  const [cropType, setCropType] = useState<string>(currentFarm?.primary_crop || 'Tomato');
  const [cropStage, setCropStage] = useState<string>(currentFarm?.crop_stage || 'Mid-Season');
  const [farmAreaHa, setFarmAreaHa] = useState<number>(currentFarm?.land_area_ha || 2.5);
  const [irrigationMethod, setIrrigationMethod] = useState<string>(
    currentFarm?.irrigation_method || 'Drip Irrigation'
  );
  const [availableWaterM3, setAvailableWaterM3] = useState<number>(
    currentFarm?.available_water_m3 || 14500
  );
  const [et0Override, setEt0Override] = useState<string>(
    weather?.current?.et0_fao56_mm ? String(weather.current.et0_fao56_mm) : ''
  );
  const [effRainMm, setEffRainMm] = useState<string>('0');
  const [flowRateM3Hr, setFlowRateM3Hr] = useState<string>('45');
  const [output, setOutput] = useState<ScientificModuleOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const runCalculation = async () => {
    setIsLoading(true);
    try {
      const res = await calculateScientificIrrigation({
        farm_id: currentFarm?.id,
        latitude: currentFarm?.latitude ?? 12.5234,
        longitude: currentFarm?.longitude ?? 76.8976,
        crop_type: cropType,
        crop_stage: cropStage,
        farm_area_ha: Math.max(0.1, farmAreaHa),
        reference_et0_mm: et0Override ? parseFloat(et0Override) : undefined,
        effective_rainfall_mm: effRainMm !== '' ? parseFloat(effRainMm) : undefined,
        soil_type: currentFarm?.soil_type || 'Red Sandy Loam',
        available_water_m3: Math.max(0, availableWaterM3),
        irrigation_method: irrigationMethod,
        flow_rate_m3_per_hr: flowRateM3Hr ? parseFloat(flowRateM3Hr) : undefined,
      });
      setOutput(res);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runCalculation();
  }, [currentFarm?.id]);

  const r = output?.results;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                {t.title}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {output?.is_live ? t.liveEt0 : t.modeledBadge}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {t.formulaSub}
            </p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.cropType}</label>
            <select
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            >
              {['Tomato', 'Rice', 'Wheat', 'Maize', 'Chilli', 'Cotton', 'Sugarcane', 'Potato'].map((c) => (
                <option key={c} value={c}>{localizeCropName(c, language)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.growthStage}</label>
            <select
              value={cropStage}
              onChange={(e) => setCropStage(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            >
              {['Initial', 'Crop Development', 'Mid-Season', 'Late Season', 'Harvest Ready'].map((s) => (
                <option key={s} value={s}>{localizeGrowthStage(s, language)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.farmArea}</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={farmAreaHa}
              onChange={(e) => setFarmAreaHa(parseFloat(e.target.value) || 0.1)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.method}</label>
            <select
              value={irrigationMethod}
              onChange={(e) => setIrrigationMethod(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            >
              {['Drip Irrigation', 'Sprinkler', 'Canal Basin', 'Flood / Furrow', 'Rainfed'].map((m) => (
                <option key={m} value={m}>
                  {m === 'Canal Basin' ? t.canalBasin : localizeCondition(m, language)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.refEt0}</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder={t.autoOpenMeteo}
              value={et0Override}
              onChange={(e) => setEt0Override(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.effRain}</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={effRainMm}
              onChange={(e) => setEffRainMm(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.pumpFlow}</label>
            <input
              type="number"
              step="1"
              min="1"
              value={flowRateM3Hr}
              onChange={(e) => setFlowRateM3Hr(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={runCalculation}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              {mt.calculate}
            </button>
          </div>
        </div>
      </div>

      {r && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">{t.cropEtc} (Kc {r.kc} × ET0 {r.et0_mm_day})</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">{r.etc_mm_day} {t.mmDay}</div>
              <div className="text-[11px] text-zinc-400">{t.effRainShort} {r.effective_rainfall_mm_day} {t.mmDay}</div>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">{t.netGrossDepth}</div>
              <div className="text-2xl font-bold text-cyan-600">{r.net_irrigation_mm} / {r.gross_irrigation_mm} {t.mmUnit}</div>
              <div className="text-[11px] text-zinc-400">{t.efficiency} {(r.irrigation_efficiency * 100).toFixed(0)}%</div>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">{t.dailyGrossVol} ({farmAreaHa} {t.haUnit})</div>
              <div className="text-2xl font-bold text-emerald-600">{r.gross_volume_m3.toLocaleString(numLocale)} m³</div>
              <div className="text-[11px] text-zinc-400">{t.netLabel} {r.net_volume_m3.toLocaleString(numLocale)} m³</div>
            </div>

            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">{t.estDurationTitle}</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                {r.estimated_duration_hours !== null ? `${r.estimated_duration_hours} ${t.hrsUnit}` : t.setFlowRate}
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {r.recommended_timing}
              </div>
            </div>
          </div>

          {/* Warnings */}
          {r.water_availability_warnings?.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-1">
              {r.water_availability_warnings.map((w: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Scientific Formulas & Provenance */}
          <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3 text-xs">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-600" />
              {mt.formulaLabel} &amp; {mt.assumptionsLabel}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-300">
              <div>• <strong>{t.etcFormula}</strong> {r.formulas?.etc}</div>
              <div>• <strong>{t.netDepthFormula}</strong> {r.formulas?.net_depth}</div>
              <div>• <strong>{t.grossDepthFormula}</strong> {r.formulas?.gross_depth}</div>
              <div>• <strong>{t.volFormula}</strong> {r.formulas?.volume}</div>
            </div>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1">
              <div><strong>{mt.sourceLabel}:</strong> {output?.source} • {t.uncertainty} {output?.uncertainty}</div>
              <div><strong>{t.rootZoneMoisture}</strong> {r.estimated_soil_moisture_pct}% {t.waterBalanceNote}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
