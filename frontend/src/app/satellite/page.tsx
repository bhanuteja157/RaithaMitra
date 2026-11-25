// frontend/src/app/satellite/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useFarm } from '@/context/FarmContext';
import { explainScientificIndex } from '@/lib/translations';
import { Language } from '@/types';
import {
  analyzeSatelliteField,
  ScientificModuleOutput,
  MODULE_TRANSLATIONS,
} from '@/lib/scientificApi';
import { Satellite, MapPin, AlertTriangle, RotateCw } from 'lucide-react';

const SAT_PAGE_I18N: Record<Language, {
  title: string; demoBadge: string; readyBadge: string; sub: string;
  fieldSel: string; geojsonPh: string; specTitle: string;
  optionalPh: string; allowDemoLbl: string;
  ndwiTitle: string; ndwiReq: string; eviReq: string; cloudTs: string; manualBands: string; scopeTitle: string; scopeDesc: string;
}> = {
  en: {
    title: 'Satellite & Geospatial Intelligence', demoBadge: 'Sample Observation', readyBadge: 'Ready',
    sub: 'Greenness & field boundary analysis via Sentinel-2 bands and interactive map',
    fieldSel: 'Field Boundary & Location Selector', geojsonPh: 'Optional GeoJSON Polygon coordinates...',
    specTitle: 'Optional Reflectance Inputs (Sentinel-2 Bands 0.0 to 1.0)', optionalPh: 'Optional',
    allowDemoLbl: 'Show labelled sample data when live satellite scene is unavailable',
    ndwiTitle: 'NDMI / NDWI (Water)', ndwiReq: 'SWIR band needed', eviReq: 'Blue band needed',
    cloudTs: 'Cloud / Status', manualBands: 'Manual Bands',
    scopeTitle: 'Important Note:', scopeDesc: 'Satellite indices measure crop greenness and leaf water only — use AI Crop Doctor for disease checks.',
  },
  kn: {
    title: 'ಉಪಗ್ರಹ ಮತ್ತು ಭೂ-ಸ್ಥಳೀಯ ವಿಶ್ಲೇಷಣೆ', demoBadge: 'ಮಾದರಿ ದತ್ತಾಂಶ', readyBadge: 'ಸಿದ್ಧವಾಗಿದೆ',
    sub: 'ಜಮೀನಿನ ಹಸಿರು (NDVI), ನೀರಿನ ಮಟ್ಟ ಮತ್ತು ನಕ್ಷೆ ಗಡಿ ವಿಶ್ಲೇಷಣೆ',
    fieldSel: 'ಜಮೀನಿನ ಗಡಿ ಮತ್ತು ಸ್ಥಳ ಆಯ್ಕೆ', geojsonPh: 'ಐಚ್ಛಿಕ GeoJSON ಗಡಿ ನಿರ್ದೇಶಾಂಕಗಳು...',
    specTitle: 'ಐಚ್ಛಿಕ ತರಂಗ ಮೌಲ್ಯಗಳು (Sentinel-2: 0.0 ರಿಂದ 1.0)', optionalPh: 'ಐಚ್ಛಿಕ',
    allowDemoLbl: 'ನೇರ ಉಪಗ್ರಹ ಚಿತ್ರ ಲಭ್ಯವಿಲ್ಲದಿದ್ದಾಗ ಮಾದರಿ ದತ್ತಾಂಶವನ್ನು ತೋರಿಸಿ',
    ndwiTitle: 'NDWI (ತೇವಾಂಶ)', ndwiReq: 'SWIR ಬ್ಯಾಂಡ್ ಅಗತ್ಯ', eviReq: 'Blue ಬ್ಯಾಂಡ್ ಅಗತ್ಯ',
    cloudTs: 'ಮೋಡ / ಸ್ಥಿತಿ', manualBands: 'ಕೈಯಾರೆ ನೀಡಿದ ಮೌಲ್ಯ',
    scopeTitle: 'ವೈಜ್ಞಾನಿಕ ಮಿತಿ:', scopeDesc: 'ಉಪಗ್ರಹ ಸೂಚ್ಯಂಕಗಳು ಬೆಳೆಯ ಹಸಿರು ಮತ್ತು ತೇವಾಂಶವನ್ನು ಮಾತ್ರ ತೋರಿಸುತ್ತವೆ — ರೋಗ ಪತ್ತೆಗಾಗಿ AI ಬೆಳೆ ವೈದ್ಯ ಬಳಸಿ.',
  },
  hi: {
    title: 'उपग्रह और भू-स्थानीय बुद्धिमत्ता', demoBadge: 'नमूना डेटा', readyBadge: 'तैयार',
    sub: 'खेत की हरियाली (NDVI), जल स्तर और उपग्रह मानचित्र विश्लेषण',
    fieldSel: 'खेत सीमा व स्थान चयनकर्ता', geojsonPh: 'वैकल्पिक GeoJSON सीमा निर्देशांक...',
    specTitle: 'वैकल्पिक स्पेक्ट्रल इनपुट (Sentinel-2 बैंड 0.0 से 1.0)', optionalPh: 'वैकल्पिक',
    allowDemoLbl: 'लाइव उपग्रह उपलब्ध न होने पर स्पष्ट लेबल वाला नमूना दिखाएं',
    ndwiTitle: 'NDWI (जल स्तर)', ndwiReq: 'SWIR बैंड आवश्यक', eviReq: 'Blue बैंड आवश्यक',
    cloudTs: 'बादल / स्थिति', manualBands: 'मैनुअल बैंड',
    scopeTitle: 'महत्वपूर्ण जानकारी:', scopeDesc: 'उपग्रह सूचकांक केवल हरियाली और नमी दिखाते हैं — रोग पहचान के लिए AI फसल डॉक्टर का उपयोग करें।',
  },
  te: {
    title: 'ఉపగ్రహ & భూ-స్థానిక విశ్లేషణ', demoBadge: 'నమూనా డేటా', readyBadge: 'సిద్ధం',
    sub: 'పంట పచ్చదనం (NDVI), నీటి స్థాయి మరియు పొలం సరిహద్దు విశ్లేషణ',
    fieldSel: 'పొలం సరిహద్దు & స్థానం ఎంపిక', geojsonPh: 'ఐచ్ఛిక GeoJSON సరిహద్దు కోఆర్డినేట్లు...',
    specTitle: 'ఐచ్ఛిక స్పెక్ట్రల్ ఇన్‌పుట్‌లు (Sentinel-2 బ్యాండ్లు 0.0–1.0)', optionalPh: 'ఐచ్ఛికం',
    allowDemoLbl: 'ప్రత్యక్ష ఉపగ్రహ చిత్రం లేనప్పుడు నమూనా డేటాను చూపించు',
    ndwiTitle: 'NDWI (నీటి సూచిక)', ndwiReq: 'SWIR బ్యాండ్ అవసరం', eviReq: 'Blue బ్యాండ్ అవసరం',
    cloudTs: 'మేఘాలు / స్థితి', manualBands: 'మాన్యువల్ బ్యాండ్లు',
    scopeTitle: 'ముఖ్య గమనిక:', scopeDesc: 'ఉపగ్రహ సూచికలు పంట పచ్చదనం మరియు తేమను మాత్రమే చూపుతాయి — వ్యాధి గుర్తింపుకు AI పంట డాక్టర్ వాడండి.',
  },
};

const LeafletMapInner = dynamic(
  () => import('@/components/location/LeafletMapInner'),
  { ssr: false }
);

export default function SatellitePage() {
  const { currentFarm, language } = useFarm();
  const mt = MODULE_TRANSLATIONS[language] || MODULE_TRANSLATIONS.en;
  const L = SAT_PAGE_I18N[language] || SAT_PAGE_I18N.en;

  const [lat, setLat] = useState<number>(currentFarm?.latitude ?? 12.5234);
  const [lon, setLon] = useState<number>(currentFarm?.longitude ?? 76.8976);
  const [nirInput, setNirInput] = useState<string>('');
  const [redInput, setRedInput] = useState<string>('');
  const [swirInput, setSwirInput] = useState<string>('');
  const [blueInput, setBlueInput] = useState<string>('');
  const [geojsonText, setGeojsonText] = useState<string>('');
  const [useDemo, setUseDemo] = useState<boolean>(true);
  const [output, setOutput] = useState<ScientificModuleOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (currentFarm) {
      setLat(currentFarm.latitude);
      setLon(currentFarm.longitude);
    }
  }, [currentFarm?.id]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    let parsedGeo: Record<string, any> | undefined;
    if (geojsonText.trim()) {
      try {
        parsedGeo = JSON.parse(geojsonText);
      } catch {
        // Ignore invalid JSON during quick submit
      }
    }
    try {
      const res = await analyzeSatelliteField({
        farm_id: currentFarm?.id,
        latitude: lat,
        longitude: lon,
        boundary_geojson: parsedGeo,
        nir_band: nirInput !== '' ? parseFloat(nirInput) : undefined,
        red_band: redInput !== '' ? parseFloat(redInput) : undefined,
        swir_band: swirInput !== '' ? parseFloat(swirInput) : undefined,
        blue_band: blueInput !== '' ? parseFloat(blueInput) : undefined,
        use_demo_observation: useDemo,
      });
      setOutput(res);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleAnalyze();
  }, [lat, lon]);

  const r = output?.results;
  const idx = r?.indices;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
            <Satellite className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                {L.title}
              </h1>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  r?.is_demonstration_data
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {r?.is_demonstration_data ? L.demoBadge : output?.data_quality || L.readyBadge}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {L.sub}
            </p>
          </div>
        </div>
        <div className="text-xs text-zinc-500 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {lat.toFixed(4)}°, {lon.toFixed(4)}°
        </div>
      </div>

      {/* Interactive Map + Spectral Band Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            {L.fieldSel}
          </h3>
          <LeafletMapInner
            latitude={lat}
            longitude={lon}
            onSelectCoordinates={(newLat, newLon) => {
              setLat(newLat);
              setLon(newLon);
            }}
            heightClass="h-60"
          />
          <textarea
            rows={2}
            placeholder={L.geojsonPh}
            value={geojsonText}
            onChange={(e) => setGeojsonText(e.target.value)}
            className="w-full p-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono"
          />
        </div>

        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3 text-xs">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            {L.specTitle}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-500 mb-1">NIR (B8)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="0.44"
                value={nirInput}
                onChange={(e) => setNirInput(e.target.value)}
                className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-zinc-500 mb-1">Red (B4)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder="0.08"
                value={redInput}
                onChange={(e) => setRedInput(e.target.value)}
                className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-zinc-500 mb-1">SWIR (B11)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder={L.optionalPh}
                value={swirInput}
                onChange={(e) => setSwirInput(e.target.value)}
                className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-zinc-500 mb-1">Blue (B2)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                placeholder={L.optionalPh}
                value={blueInput}
                onChange={(e) => setBlueInput(e.target.value)}
                className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={useDemo}
              onChange={(e) => setUseDemo(e.target.checked)}
              className="rounded text-green-700"
            />
            {L.allowDemoLbl}
          </label>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full py-2.5 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Satellite className="w-4 h-4" />}
            {mt.analyze}
          </button>
        </div>
      </div>

      {idx && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="text-xs font-semibold text-zinc-500">NDVI</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{idx.ndvi ?? 'N/A'}</div>
              <div className="text-[11px] text-zinc-400 mt-1">(NIR - Red) / (NIR + Red)</div>
            </div>
            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="text-xs font-semibold text-zinc-500">{L.ndwiTitle}</div>
              <div className="text-2xl font-bold text-cyan-600 mt-1">{idx.ndwi ?? L.ndwiReq}</div>
              <div className="text-[11px] text-zinc-400 mt-1">{L.ndwiReq}</div>
            </div>
            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="text-xs font-semibold text-zinc-500">EVI</div>
              <div className="text-2xl font-bold text-teal-600 mt-1">{idx.evi ?? L.eviReq}</div>
              <div className="text-[11px] text-zinc-400 mt-1">{L.eviReq}</div>
            </div>
            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div className="text-xs font-semibold text-zinc-500">{L.cloudTs}</div>
              <div className="text-sm font-bold text-zinc-900 dark:text-white mt-1">
                {r?.cloud_coverage_pct !== null && r?.cloud_coverage_pct !== undefined ? `${r.cloud_coverage_pct}%` : L.manualBands}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">{r?.stress_assessment}</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-xs text-zinc-700 dark:text-zinc-300">
            {explainScientificIndex('NDVI', idx.ndvi, language)}
          </div>
        </div>
      )}

      <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>{L.scopeTitle}</strong> {L.scopeDesc} ({mt.sourceLabel}: {output?.source})
        </div>
      </div>
    </div>
  );
}
