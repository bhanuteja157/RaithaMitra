// frontend/src/app/soil-nutrients/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import {
  analyzeSoilNutrients,
  ScientificModuleOutput,
  MODULE_TRANSLATIONS,
} from '@/lib/scientificApi';
import { Language } from '@/types';
import { localizeCondition, localizeCropName } from '@/lib/translations';
import { Sprout, TestTube, AlertCircle, CheckCircle2, RotateCw, ArrowUpRight } from 'lucide-react';

const SOIL_I18N: Record<
  Language,
  {
    title: string;
    badge: string;
    subtitle: string;
    targetCrop: string;
    soilTexture: string;
    nitrogen: string;
    phosphorus: string;
    potassium: string;
    blankPlaceholder: string;
    soilPh: string;
    organicCarbon: string;
    dataOrigin: string;
    srcLab: string;
    srcSensor: string;
    srcEstimate: string;
    fetchSoilGrids: string;
    nLabel: string;
    pLabel: string;
    kLabel: string;
    notMeasured: string;
    kgHa: string;
    phOcTitle: string;
    phUnit: string;
    na: string;
    optimal: string;
    gapsTitle: string;
    bioOptionsTitle: string;
    dataQuality: string;
  }
> = {
  en: {
    title: 'Soil & Nutrient Intelligence',
    badge: 'ICAR Thresholds',
    subtitle: 'Laboratory Soil Health Card analysis with explicit measurement units and BioIntel biological nutrient links',
    targetCrop: 'Target Crop',
    soilTexture: 'Soil Texture',
    nitrogen: 'Nitrogen N (kg/ha)',
    phosphorus: 'Phosphorus P (kg/ha)',
    potassium: 'Potassium K (kg/ha)',
    blankPlaceholder: 'Leave blank if unmeasured',
    soilPh: 'Soil pH (1:2.5 water)',
    organicCarbon: 'Organic Carbon (%)',
    dataOrigin: 'Data Origin',
    srcLab: 'Laboratory Soil Health Card',
    srcSensor: 'Field Sensor',
    srcEstimate: 'Farmer Estimate',
    fetchSoilGrids: 'Also fetch ISRIC SoilGrids v2.0 global modeled reference (distinct from lab NPK)',
    nLabel: 'Nitrogen (N)',
    pLabel: 'Phosphorus (P)',
    kLabel: 'Potassium (K)',
    notMeasured: 'Not Measured',
    kgHa: 'kg/ha',
    phOcTitle: 'Soil pH & OC%',
    phUnit: 'pH',
    na: 'N/A',
    optimal: 'Optimal',
    gapsTitle: 'Identified Nutrient & Soil Gaps',
    bioOptionsTitle: 'BioIntel Biological Soil Improvement Options',
    dataQuality: 'Data Quality:',
  },
  kn: {
    title: 'ಮಣ್ಣು ಮತ್ತು ಪೋಷಕಾಂಶ ಬುದ್ಧಿಮತ್ತೆ',
    badge: 'ICAR ಮಾನದಂಡಗಳು',
    subtitle: 'ಸ್ಪಷ್ಟ ಅಳತೆ ಘಟಕಗಳೊಂದಿಗೆ ಪ್ರಯೋಗಾಲಯ ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು BioIntel ಜೈವಿಕ ಪೋಷಕಾಂಶ ಆಯ್ಕೆಗಳು',
    targetCrop: 'ಉದ್ದೇಶಿತ ಬೆಳೆ',
    soilTexture: 'ಮಣ್ಣಿನ ವಿಧ',
    nitrogen: 'ಸಾರಜನಕ N (ಕೆಜಿ/ಹೆಕ್ಟೇರ್)',
    phosphorus: 'ರಂಜಕ P (ಕೆಜಿ/ಹೆಕ್ಟೇರ್)',
    potassium: 'ಪೊಟ್ಯಾಷ್ K (ಕೆಜಿ/ಹೆಕ್ಟೇರ್)',
    blankPlaceholder: 'ಅಳೆಯದಿದ್ದರೆ ಖಾಲಿ ಬಿಡಿ',
    soilPh: 'ಮಣ್ಣಿನ pH (1:2.5 ನೀರು)',
    organicCarbon: 'ಸಾವಯವ ಇಂಗಾಲ (%)',
    dataOrigin: 'ದತ್ತಾಂಶ ಮೂಲ',
    srcLab: 'ಪ್ರಯೋಗಾಲಯ ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಕಾರ್ಡ್',
    srcSensor: 'ಕ್ಷೇತ್ರ ಸೆನ್ಸರ್',
    srcEstimate: 'ರೈತರ ಅಂದಾಜು',
    fetchSoilGrids: 'ISRIC SoilGrids v2.0 ಜಾಗತಿಕ ಮಾದರಿ ಉಲ್ಲೇಖವನ್ನು ಪಡೆಯಿರಿ (ಲ್ಯಾಬ್ NPK ನಿಂದ ಪ್ರತ್ಯೇಕ)',
    nLabel: 'ಸಾರಜನಕ (N)',
    pLabel: 'ರಂಜಕ (P)',
    kLabel: 'ಪೊಟ್ಯಾಷ್ (K)',
    notMeasured: 'ಅಳೆಯಲಾಗಿಲ್ಲ',
    kgHa: 'ಕೆಜಿ/ಹೆ',
    phOcTitle: 'ಮಣ್ಣಿನ pH ಮತ್ತು ಸಾವಯವ ಇಂಗಾಲ %',
    phUnit: 'pH',
    na: 'ಲಭ್ಯವಿಲ್ಲ',
    optimal: 'ಸೂಕ್ತ ಮಟ್ಟ',
    gapsTitle: 'ಗುರುತಿಸಲಾದ ಪೋಷಕಾಂಶ ಮತ್ತು ಮಣ್ಣಿನ ಕೊರತೆಗಳು',
    bioOptionsTitle: 'BioIntel ಜೈವಿಕ ಮಣ್ಣು ಸುಧಾರಣಾ ಆಯ್ಕೆಗಳು',
    dataQuality: 'ದತ್ತಾಂಶ ಗುಣಮಟ್ಟ:',
  },
  hi: {
    title: 'मिट्टी एवं पोषक तत्व बुद्धिमत्ता',
    badge: 'ICAR मानक',
    subtitle: 'स्पष्ट माप इकाइयों के साथ प्रयोगशाला मृदा स्वास्थ्य कार्ड विश्लेषण और BioIntel जैविक विकल्प',
    targetCrop: 'लक्षित फसल',
    soilTexture: 'मिट्टी का प्रकार',
    nitrogen: 'नाइट्रोजन N (किग्रा/हेक्टेयर)',
    phosphorus: 'फॉस्फोरस P (किग्रा/हेक्टेयर)',
    potassium: 'पोटाश K (किग्रा/हेक्टेयर)',
    blankPlaceholder: 'नहीं मापा गया तो खाली छोड़ें',
    soilPh: 'मिट्टी का pH (1:2.5 पानी)',
    organicCarbon: 'जैविक कार्बन (%)',
    dataOrigin: 'डेटा स्रोत',
    srcLab: 'प्रयोगशाला मृदा स्वास्थ्य कार्ड',
    srcSensor: 'खेत सेंसर',
    srcEstimate: 'किसान अनुमान',
    fetchSoilGrids: 'ISRIC SoilGrids v2.0 वैश्विक संदर्भ भी प्राप्त करें (लैब NPK से अलग)',
    nLabel: 'नाइट्रोजन (N)',
    pLabel: 'फॉस्फोरस (P)',
    kLabel: 'पोटाश (K)',
    notMeasured: 'मापा नहीं गया',
    kgHa: 'किग्रा/हे.',
    phOcTitle: 'मिट्टी pH व जैविक कार्बन %',
    phUnit: 'pH',
    na: 'उपलब्ध नहीं',
    optimal: 'उचित सीमा',
    gapsTitle: 'पहचानी गई पोषक व मिट्टी की कमियां',
    bioOptionsTitle: 'BioIntel जैविक मिट्टी सुधार विकल्प',
    dataQuality: 'डेटा गुणवत्ता:',
  },
  te: {
    title: 'నేల & పోషకాల విశ్లేషణ',
    badge: 'ICAR ప్రమాణాలు',
    subtitle: 'ఖచ్చితమైన కొలతలతో ప్రయోగశాల నేల ఆరోగ్య కార్డు విశ్లేషణ మరియు BioIntel జీవ పోషక ఎంపికలు',
    targetCrop: 'లక్ష్య పంట',
    soilTexture: 'నేల రకం',
    nitrogen: 'నత్రజని N (కిలోలు/హెక్టార్)',
    phosphorus: 'భాస్వరం P (కిలోలు/హెక్టార్)',
    potassium: 'పొటాషియం K (కిలోలు/హెక్టార్)',
    blankPlaceholder: 'కొలవకపోతే ఖాళీగా ఉంచండి',
    soilPh: 'నేల pH (1:2.5 నీరు)',
    organicCarbon: 'సేంద్రీయ కర్బనం (%)',
    dataOrigin: 'డేటా మూలం',
    srcLab: 'ల్యాబ్ నేల ఆరోగ్య కార్డు',
    srcSensor: 'పొలం సెన్సార్',
    srcEstimate: 'రైతు అంచనా',
    fetchSoilGrids: 'ISRIC SoilGrids v2.0 ప్రపంచ సూచన డేటాను కూడా తీసుకురండి (ల్యాబ్ NPK కంటే భిన్నం)',
    nLabel: 'నత్రజని (N)',
    pLabel: 'భాస్వరం (P)',
    kLabel: 'పొటాషియం (K)',
    notMeasured: 'కొలవబడలేదు',
    kgHa: 'కిలో/హె.',
    phOcTitle: 'నేల pH & OC%',
    phUnit: 'pH',
    na: 'లేదు',
    optimal: 'సరైన పరిధి',
    gapsTitle: 'గుర్తించిన పోషక & నేల లోపాలు',
    bioOptionsTitle: 'BioIntel జీవ నేల మెరుగుదల ఎంపికలు',
    dataQuality: 'డేటా నాణ్యత:',
  },
};

export default function SoilNutrientsPage() {
  const { currentFarm, language } = useFarm();
  const mt = MODULE_TRANSLATIONS[language] || MODULE_TRANSLATIONS.en;
  const t = SOIL_I18N[language];

  const [cropType, setCropType] = useState<string>(currentFarm?.primary_crop || 'Tomato');
  const [soilTexture, setSoilTexture] = useState<string>(currentFarm?.soil_type || 'Red Sandy Loam');
  const [nitrogen, setNitrogen] = useState<string>('210');
  const [phosphorus, setPhosphorus] = useState<string>('18.5');
  const [potassium, setPotassium] = useState<string>('280');
  const [soilPh, setSoilPh] = useState<string>('6.6');
  const [organicCarbon, setOrganicCarbon] = useState<string>('0.45');
  const [soilMoisture, setSoilMoisture] = useState<string>('');
  const [sourceType, setSourceType] = useState<string>('laboratory_soil_health_card');
  const [fetchSoilGrids, setFetchSoilGrids] = useState<boolean>(false);

  const [output, setOutput] = useState<ScientificModuleOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    try {
      const res = await analyzeSoilNutrients({
        farm_id: currentFarm?.id,
        latitude: currentFarm?.latitude ?? 12.5234,
        longitude: currentFarm?.longitude ?? 76.8976,
        crop_type: cropType,
        soil_texture: soilTexture,
        nitrogen_kg_ha: nitrogen !== '' ? parseFloat(nitrogen) : undefined,
        phosphorus_kg_ha: phosphorus !== '' ? parseFloat(phosphorus) : undefined,
        potassium_kg_ha: potassium !== '' ? parseFloat(potassium) : undefined,
        soil_ph: soilPh !== '' ? parseFloat(soilPh) : undefined,
        organic_carbon_pct: organicCarbon !== '' ? parseFloat(organicCarbon) : undefined,
        soil_moisture_pct: soilMoisture !== '' ? parseFloat(soilMoisture) : undefined,
        measurement_source: sourceType,
        fetch_soilgrids: fetchSoilGrids,
      });
      setOutput(res);
    } finally {
      setIsLoading(false);
    }
  };

  const r = output?.results;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-lime-100 dark:bg-lime-950 text-lime-700 dark:text-lime-400">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                {t.title}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {t.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {t.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Soil Test Input Form */}
      <form
        onSubmit={handleAnalyze}
        className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4 text-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.targetCrop}</label>
            <select
              value={cropType}
              onChange={(e) => setCropType(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            >
              {['Tomato', 'Rice', 'Wheat', 'Maize', 'Chilli', 'Banana', 'Mango', 'Cotton'].map((c) => (
                <option key={c} value={c}>{localizeCropName(c, language)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.soilTexture}</label>
            <input
              type="text"
              value={soilTexture}
              onChange={(e) => setSoilTexture(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.nitrogen}</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder={t.blankPlaceholder}
              value={nitrogen}
              onChange={(e) => setNitrogen(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.phosphorus}</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder={t.blankPlaceholder}
              value={phosphorus}
              onChange={(e) => setPhosphorus(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.potassium}</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder={t.blankPlaceholder}
              value={potassium}
              onChange={(e) => setPotassium(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.soilPh}</label>
            <input
              type="number"
              step="0.1"
              min="3"
              max="10.5"
              value={soilPh}
              onChange={(e) => setSoilPh(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.organicCarbon}</label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="15"
              value={organicCarbon}
              onChange={(e) => setOrganicCarbon(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t.dataOrigin}</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            >
              <option value="laboratory_soil_health_card">{t.srcLab}</option>
              <option value="field_sensor">{t.srcSensor}</option>
              <option value="user_estimate">{t.srcEstimate}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={fetchSoilGrids}
              onChange={(e) => setFetchSoilGrids(e.target.checked)}
              className="rounded text-green-700"
            />
            {t.fetchSoilGrids}
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            {mt.analyze}
          </button>
        </div>
      </form>

      {r && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="text-xs font-semibold text-zinc-500">{t.nLabel}</div>
              <div className="text-xl font-bold mt-1">
                {r.nutrient_status.nitrogen.value_kg_ha !== null ? `${r.nutrient_status.nitrogen.value_kg_ha} ${t.kgHa}` : t.notMeasured}
              </div>
              <div className="text-[11px] text-zinc-400 uppercase mt-1">{localizeCondition(r.nutrient_status.nitrogen.status.replace('_', ' '), language)}</div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="text-xs font-semibold text-zinc-500">{t.pLabel}</div>
              <div className="text-xl font-bold mt-1">
                {r.nutrient_status.phosphorus.value_kg_ha !== null ? `${r.nutrient_status.phosphorus.value_kg_ha} ${t.kgHa}` : t.notMeasured}
              </div>
              <div className="text-[11px] text-zinc-400 uppercase mt-1">{localizeCondition(r.nutrient_status.phosphorus.status.replace('_', ' '), language)}</div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="text-xs font-semibold text-zinc-500">{t.kLabel}</div>
              <div className="text-xl font-bold mt-1">
                {r.nutrient_status.potassium.value_kg_ha !== null ? `${r.nutrient_status.potassium.value_kg_ha} ${t.kgHa}` : t.notMeasured}
              </div>
              <div className="text-[11px] text-zinc-400 uppercase mt-1">{localizeCondition(r.nutrient_status.potassium.status.replace('_', ' '), language)}</div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="text-xs font-semibold text-zinc-500">{t.phOcTitle}</div>
              <div className="text-xl font-bold mt-1">
                {r.nutrient_status.soil_ph.value ?? t.na} {t.phUnit}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                {t.optimal} {localizeCropName(cropType, language)}: {r.optimal_ph_range.min}–{r.optimal_ph_range.max}
              </div>
            </div>
          </div>

          {r.deficiencies?.length > 0 && (
            <div className="p-5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2 text-xs">
              <h3 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {t.gapsTitle}
              </h3>
              <ul className="space-y-1 text-amber-800 dark:text-amber-200">
                {r.deficiencies.map((d: string, i: number) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </div>
          )}

          {r.biointel_biological_options?.length > 0 && (
            <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 text-xs">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {t.bioOptionsTitle}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {r.biointel_biological_options.map((opt: any, idx: number) => (
                  <Link
                    key={idx}
                    href={opt.route}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between hover:border-green-700 transition"
                  >
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-white">{opt.intervention}</div>
                      <div className="text-[11px] text-zinc-500">{opt.category}</div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-green-700" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="text-[11px] text-zinc-500">
            <strong>{mt.sourceLabel}:</strong> {output?.source} • {t.dataQuality} {output?.data_quality}
          </div>
        </div>
      )}
    </div>
  );
}
