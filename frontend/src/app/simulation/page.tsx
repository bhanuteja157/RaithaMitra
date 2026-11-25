// frontend/src/app/simulation/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  runFinancialSimulation,
  ScientificModuleOutput,
  MODULE_TRANSLATIONS,
} from '@/lib/scientificApi';
import { Language } from '@/types';
import { getIntlLocale } from '@/lib/translations';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { LineChart, RotateCw, AlertTriangle, Info } from 'lucide-react';

const SIM_PAGE_I18N: Record<
  Language,
  {
    title: string;
    badge: string;
    subtitle: string;
    seedPrefix: string;
    expectedYield: string;
    marketPrice: string;
    cropLoss: string;
    waterAvail: string;
    cultivationExp: string;
    transportExp: string;
    farmArea: string;
    saleableHarvest: string;
    tUnit: string;
    breakEven: string;
    perT: string;
    p10Downside: string;
    worst: string;
    medianP50: string;
    lossRisk: string;
    p90Upside: string;
    best: string;
    chartTitle: string;
    trialsName: string;
    disclaimer: string;
  }
> = {
  en: {
    title: 'Predictive Agricultural & Financial Simulation',
    badge: 'Model-Based Estimate (Not a Guarantee)',
    subtitle: 'Deterministic what-if analysis & reproducible 5,000-trial Monte Carlo risk modeling',
    seedPrefix: 'seed',
    expectedYield: 'Expected Yield (t/ha)',
    marketPrice: 'Market Selling Price (₹/tonne)',
    cropLoss: 'Crop Loss (%)',
    waterAvail: 'Water Availability (%)',
    cultivationExp: 'Cultivation Expenses (₹)',
    transportExp: 'Transport Expenses (₹)',
    farmArea: 'Farm Area (ha)',
    saleableHarvest: 'Saleable Harvest & Break-Even',
    tUnit: 't',
    breakEven: 'Break-even:',
    perT: '/t',
    p10Downside: 'P10 Downside Profit',
    worst: 'Worst:',
    medianP50: 'Median (P50) Profit',
    lossRisk: 'Loss Risk:',
    p90Upside: 'P90 Upside Profit',
    best: 'Best:',
    chartTitle: 'Monte Carlo Net Profit Distribution (5,000 Stochastic Trials)',
    trialsName: 'Trials',
    disclaimer: 'Disclaimer:',
  },
  kn: {
    title: 'ಮುನ್ಸೂಚಕ ಕೃಷಿ ಮತ್ತು ಆರ್ಥಿಕ ಸಿಮ್ಯುಲೇಶನ್',
    badge: 'ಮಾದರಿ ಆಧಾರಿತ ಅಂದಾಜು (ಖಾತರಿ ಅಲ್ಲ)',
    subtitle: 'ಸಾಧ್ಯತಾ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು 5,000 ಮಾದರಿ ಮಾಂಟೆ ಕಾರ್ಲೋ ಅಪಾಯ ವಿಶ್ಲೇಷಣೆ',
    seedPrefix: 'ಬೀಜ ಸಂಖ್ಯೆ',
    expectedYield: 'ಅಂದಾಜು ಇಳುವರಿ (ಟನ್/ಹೆಕ್ಟೇರ್)',
    marketPrice: 'ಮಾರುಕಟ್ಟೆ ಮಾರಾಟ ಬೆಲೆ (₹/ಟನ್)',
    cropLoss: 'ಬೆಳೆ ನಷ್ಟ (%)',
    waterAvail: 'ನೀರಿನ ಲಭ್ಯತೆ (%)',
    cultivationExp: 'ಸಾಗುವಳಿ ವೆಚ್ಚ (₹)',
    transportExp: 'ಸಾಗಾಣಿಕೆ ವೆಚ್ಚ (₹)',
    farmArea: 'ಜಮೀನು ವಿಸ್ತೀರ್ಣ (ಹೆಕ್ಟೇರ್)',
    saleableHarvest: 'ಮಾರಾಟ ಯೋಗ್ಯ ಇಳುವರಿ ಮತ್ತು ಬ್ರೇಕ್-ಈವನ್',
    tUnit: 'ಟನ್',
    breakEven: 'ಸಮತೋಲನ ಬೆಲೆ:',
    perT: '/ಟನ್',
    p10Downside: 'P10 ಕನಿಷ್ಠ ಲಾಭ',
    worst: 'ಕನಿಷ್ಠ:',
    medianP50: 'ಮಧ್ಯಮ (P50) ಲಾಭ',
    lossRisk: 'ನಷ್ಟದ ಅಪಾಯ:',
    p90Upside: 'P90 ಗರಿಷ್ಠ ಲಾಭ',
    best: 'ಗರಿಷ್ಠ:',
    chartTitle: 'ಮಾಂಟೆ ಕಾರ್ಲೋ ನಿವ್ವಳ ಲಾಭ ವಿತರಣೆ (5,000 ಪ್ರಯೋಗಗಳು)',
    trialsName: 'ಪ್ರಯೋಗಗಳು',
    disclaimer: 'ಹಕ್ಕು ನಿರಾಕರಣೆ:',
  },
  hi: {
    title: 'पूर्वानुमान कृषि और वित्तीय सिमुलेशन',
    badge: 'मॉडल-आधारित अनुमान (गारंटी नहीं)',
    subtitle: 'संभावित विश्लेषण व 5,000-ट्रायल मोंटे कार्लो जोखिम मॉडलिंग',
    seedPrefix: 'सीड',
    expectedYield: 'अपेक्षित उपज (टन/हेक्टेयर)',
    marketPrice: 'बाज़ार बिक्री मूल्य (₹/टन)',
    cropLoss: 'फसल हानि (%)',
    waterAvail: 'जल उपलब्धता (%)',
    cultivationExp: 'खेती खर्च (₹)',
    transportExp: 'परिवहन खर्च (₹)',
    farmArea: 'खेत क्षेत्रफल (हेक्टेयर)',
    saleableHarvest: 'बिक्री योग्य उपज व ब्रेक-ईवन',
    tUnit: 'टन',
    breakEven: 'ब्रेक-ईवन:',
    perT: '/टन',
    p10Downside: 'P10 न्यूनतम लाभ',
    worst: 'सबसे कम:',
    medianP50: 'औसत (P50) लाभ',
    lossRisk: 'हानि जोखिम:',
    p90Upside: 'P90 अधिकतम लाभ',
    best: 'सर्वोत्तम:',
    chartTitle: 'मोंटे कार्लो शुद्ध लाभ वितरण (5,000 परीक्षण)',
    trialsName: 'परीक्षण',
    disclaimer: 'अस्वीकरण:',
  },
  te: {
    title: 'ముందస్తు వ్యవసాయ & ఆర్థిక అనుకరణ (సిమ్యులేషన్)',
    badge: 'మోడల్ ఆధారిత అంచనా (హామీ కాదు)',
    subtitle: 'వాట్-ఇఫ్ విశ్లేషణ & 5,000-ట్రయల్ మోంటే కార్లో నష్టభయ విశ్లేషణ',
    seedPrefix: 'సీడ్',
    expectedYield: 'అంచనా దిగుబడి (టన్నులు/హెక్టార్)',
    marketPrice: 'మార్కెట్ అమ్మకపు ధర (₹/టన్ను)',
    cropLoss: 'పంట నష్టం (%)',
    waterAvail: 'నీటి లభ్యత (%)',
    cultivationExp: 'సాగు ఖర్చు (₹)',
    transportExp: 'రవాణా ఖర్చు (₹)',
    farmArea: 'పొలం విస్తీర్ణం (హెక్టార్లు)',
    saleableHarvest: 'అమ్మదగిన దిగుబడి & బ్రేక్-ఈవెన్',
    tUnit: 'ట.',
    breakEven: 'బ్రేక్-ఈవెన్:',
    perT: '/ట.',
    p10Downside: 'P10 తక్కువ లాభం',
    worst: 'కనిష్టం:',
    medianP50: 'మధ్యస్థ (P50) లాభం',
    lossRisk: 'నష్టపు ప్రమాదం:',
    p90Upside: 'P90 గరిష్ట లాభం',
    best: 'గరిష్టం:',
    chartTitle: 'మోంటే కార్లో నికర లాభ పంపిణీ (5,000 ట్రయల్స్)',
    trialsName: 'ట్రయల్స్',
    disclaimer: 'గమనిక:',
  },
};

export default function SimulationPage() {
  const { currentFarm, language } = useFarm();
  const mt = MODULE_TRANSLATIONS[language] || MODULE_TRANSLATIONS.en;
  const t = SIM_PAGE_I18N[language];
  const numLocale = getIntlLocale(language);

  const [farmAreaHa, setFarmAreaHa] = useState<number>(currentFarm?.land_area_ha || 2.5);
  const [expectedYield, setExpectedYield] = useState<number>(25.0);
  const [marketPrice, setMarketPrice] = useState<number>(22000);
  const [cropLossPct, setCropLossPct] = useState<number>(8);
  const [waterAvailPct, setWaterAvailPct] = useState<number>(90);
  const [cultivationExp, setCultivationExp] = useState<number>(
    currentFarm?.cultivation_budget_inr || 85000
  );
  const [transportExp, setTransportExp] = useState<number>(18000);
  const [seed, setSeed] = useState<number>(42);

  const [output, setOutput] = useState<ScientificModuleOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSimulate = async () => {
    setIsLoading(true);
    try {
      const res = await runFinancialSimulation({
        farm_id: currentFarm?.id,
        crop_type: currentFarm?.primary_crop || 'Tomato',
        farm_area_ha: Math.max(0.1, farmAreaHa),
        expected_yield_t_per_ha: Math.max(0.5, expectedYield),
        yield_std_pct: 15,
        market_price_inr_per_t: Math.max(100, marketPrice),
        price_std_pct: 20,
        crop_loss_pct: cropLossPct,
        water_availability_pct: waterAvailPct,
        cultivation_expenses_inr: cultivationExp,
        transportation_expenses_inr: transportExp,
        num_trials: 5000,
        random_seed: seed,
      });
      setOutput(res);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSimulate();
  }, [currentFarm?.id]);

  const det = output?.results?.deterministic;
  const mc = output?.results?.monte_carlo;
  const bins = output?.results?.distribution_bins || [];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
            <LineChart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                {t.title}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {t.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {t.subtitle} ({t.seedPrefix}={seed})
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.expectedYield}</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={expectedYield}
              onChange={(e) => setExpectedYield(parseFloat(e.target.value) || 1)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.marketPrice}</label>
            <input
              type="number"
              step="500"
              min="100"
              value={marketPrice}
              onChange={(e) => setMarketPrice(parseFloat(e.target.value) || 1000)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.cropLoss}</label>
            <input
              type="number"
              step="1"
              min="0"
              max="90"
              value={cropLossPct}
              onChange={(e) => setCropLossPct(parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.waterAvail}</label>
            <input
              type="number"
              step="5"
              min="10"
              max="150"
              value={waterAvailPct}
              onChange={(e) => setWaterAvailPct(parseFloat(e.target.value) || 50)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.cultivationExp}</label>
            <input
              type="number"
              step="1000"
              min="0"
              value={cultivationExp}
              onChange={(e) => setCultivationExp(parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.transportExp}</label>
            <input
              type="number"
              step="500"
              min="0"
              value={transportExp}
              onChange={(e) => setTransportExp(parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.farmArea}</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={farmAreaHa}
              onChange={(e) => setFarmAreaHa(parseFloat(e.target.value) || 0.5)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSimulate}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <LineChart className="w-4 h-4" />}
              {mt.runSimulation}
            </button>
          </div>
        </div>
      </div>

      {det && mc && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">{t.saleableHarvest}</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">{det.saleable_harvest_tonnes} {t.tUnit}</div>
              <div className="text-[11px] text-zinc-400">{t.breakEven} ₹{det.break_even_price_inr_per_t?.toLocaleString(numLocale)}{t.perT}</div>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">{t.p10Downside}</div>
              <div className="text-2xl font-bold text-rose-600">₹{Math.round(mc.p10_downside_profit_inr).toLocaleString(numLocale)}</div>
              <div className="text-[11px] text-zinc-400">{t.worst} ₹{Math.round(mc.worst_plausible_profit_inr).toLocaleString(numLocale)}</div>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">{t.medianP50}</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">₹{Math.round(mc.median_p50_profit_inr).toLocaleString(numLocale)}</div>
              <div className="text-[11px] text-zinc-400">{t.lossRisk} {mc.probability_of_loss_pct}%</div>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
              <div className="text-xs font-semibold text-zinc-500">{t.p90Upside}</div>
              <div className="text-2xl font-bold text-emerald-600">₹{Math.round(mc.p90_upside_profit_inr).toLocaleString(numLocale)}</div>
              <div className="text-[11px] text-zinc-400">{t.best} ₹{Math.round(mc.best_plausible_profit_inr).toLocaleString(numLocale)}</div>
            </div>
          </div>

          {bins.length > 0 && (
            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {t.chartTitle}
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bins}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="range_label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="trial_count" fill="#166534" radius={[6, 6, 0, 0]} name={t.trialsName} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-500 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
            <div>
              <strong>{t.disclaimer}</strong> {output?.results?.model_disclaimer} • {mt.sourceLabel}: {output?.source}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
