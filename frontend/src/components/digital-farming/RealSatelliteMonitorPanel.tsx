// frontend/src/components/digital-farming/RealSatelliteMonitorPanel.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { explainScientificIndex, formatLocalizedDate, getIntlLocale } from '@/lib/translations';
import { Language } from '@/types';
import {
  fetchSatelliteTimelapse,
  SatelliteObservationFrame,
  SatelliteTimelapseResponse,
  syncMonitoredParcel,
} from '@/lib/satelliteMonitoringApi';

const SAT_PANEL_I18N: Record<Language, {
  subMeta: string; syncing: string; toggleFsAria: string;
  unavailable: string; cloudLbl: string; validLbl: string; pending: string; autoCheckSuffix: string;
  toWord: string; fetchBtn: string; errRetrieve: string; loadingBands: string; noUsable: string;
  obsNdvi: string; ndmiLbl: string; obsEvi: string; masked: string;
  chartTitle: string; noChartPts: string; obsCurve: string; predCurve: string;
  pause: string; frameWord: string; dayAfterSowing: string; trendWord: string;
}> = {
  en: {
    subMeta: 'Copernicus Sentinel-2 L2A (10m RGB/NIR · 20m SWIR) · 5-day revisit (cloud dependent)',
    syncing: 'Syncing Sentinel-2...', toggleFsAria: 'Toggle fullscreen satellite view',
    unavailable: 'Unavailable', cloudLbl: '% cloud', validLbl: '% valid', pending: 'Pending', autoCheckSuffix: '(+24h auto)',
    toWord: 'to', fetchBtn: 'Fetch', errRetrieve: 'Failed to retrieve Sentinel-2 observations.',
    loadingBands: 'Retrieving real 10m Sentinel-2 satellite bands...', noUsable: 'No usable Sentinel-2 observation in selected date range.',
    obsNdvi: 'Observed NDVI (Greenness)', ndmiLbl: 'NDMI (Leaf Moisture)', obsEvi: 'Observed EVI', masked: 'Cloud Masked',
    chartTitle: 'Observed Sentinel-2 NDVI vs Modeled Crop Curve', noChartPts: 'No cloud-free NDVI points in this window yet.',
    obsCurve: 'Observed NDVI', predCurve: 'Predicted Curve', pause: 'Pause', frameWord: 'Frame', dayAfterSowing: 'days after sowing', trendWord: 'Trend:',
  },
  kn: {
    subMeta: 'Copernicus Sentinel-2 (10m ನೈಜ ಚಿತ್ರ) · ಪ್ರತಿ 5 ದಿನಗಳಿಗೊಮ್ಮೆ ಉಪಗ್ರಹ ಸುತ್ತು',
    syncing: 'ಉಪಗ್ರಹ ಚಿತ್ರ ಪಡೆಯಲಾಗುತ್ತಿದೆ...', toggleFsAria: 'ಪೂರ್ಣ ಪರದೆ ಉಪಗ್ರಹ ನೋಟ',
    unavailable: 'ಲಭ್ಯವಿಲ್ಲ', cloudLbl: '% ಮೋಡ', validLbl: '% ಸ್ಪಷ್ಟ', pending: 'ಬಾಕಿ ಇದೆ', autoCheckSuffix: '(+24ಗಂ ಸ್ವಯಂ)',
    toWord: 'ರಿಂದ', fetchBtn: 'ಪಡೆಯಿರಿ', errRetrieve: 'Sentinel-2 ಉಪಗ್ರಹ ಚಿತ್ರಗಳನ್ನು ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
    loadingBands: '10m Sentinel-2 ಉಪಗ್ರಹ ಚಿತ್ರಗಳನ್ನು ತರಲಾಗುತ್ತಿದೆ...', noUsable: 'ಆಯ್ದ ದಿನಾಂಕಗಳಲ್ಲಿ ಸ್ಪಷ್ಟ ಉಪಗ್ರಹ ಚಿತ್ರ ಲಭ್ಯವಿಲ್ಲ.',
    obsNdvi: 'NDVI (ಬೆಳೆ ಹಸಿರು)', ndmiLbl: 'NDMI (ಎಲೆ ತೇವಾಂಶ)', obsEvi: 'EVI ಸೂಚ್ಯಂಕ', masked: 'ಮೋಡದಿಂದ ಮುಚ್ಚಿದೆ',
    chartTitle: 'ನೈಜ ಉಪಗ್ರಹ NDVI ಮತ್ತು ಅಂದಾಜು ಬೆಳೆ ರೇಖೆ', noChartPts: 'ಈ ಅವಧಿಯಲ್ಲಿ ಮೋಡ-ರಹಿತ NDVI ಬಿಂದುಗಳಿಲ್ಲ.',
    obsCurve: 'ನೈಜ NDVI', predCurve: 'ಅಂದಾಜು ರೇಖೆ', pause: 'ನಿಲ್ಲಿಸಿ', frameWord: 'ಚಿತ್ರ', dayAfterSowing: 'ದಿನಗಳು (ಬಿತ್ತನೆ ನಂತರ)', trendWord: 'ಸ್ಥಿತಿ:',
  },
  hi: {
    subMeta: 'Copernicus Sentinel-2 L2A (10m उपग्रह चित्र) · हर 5 दिन उपग्रह पुनरावृत्ति',
    syncing: 'उपग्रह डेटा लाया जा रहा है...', toggleFsAria: 'फ़ुलस्क्रीन उपग्रह दृश्य',
    unavailable: 'उपलब्ध नहीं', cloudLbl: '% बादल', validLbl: '% स्पष्ट', pending: 'प्रतीक्षारत', autoCheckSuffix: '(+24घं ऑटो)',
    toWord: 'से', fetchBtn: 'लाएं', errRetrieve: 'Sentinel-2 उपग्रह डेटा प्राप्त नहीं हो सका।',
    loadingBands: 'असली 10m Sentinel-2 उपग्रह बैंड लोड हो रहे हैं...', noUsable: 'चुनी गई तिथियों में कोई स्पष्ट उपग्रह चित्र उपलब्ध नहीं है।',
    obsNdvi: 'NDVI (हरियाली स्तर)', ndmiLbl: 'NDMI (पत्ती नमी)', obsEvi: 'EVI सूचकांक', masked: 'बादल से ढका',
    chartTitle: 'प्रत्यक्ष उपग्रह NDVI बनाम अनुमानित फसल वक्र', noChartPts: 'इस अवधि में बादल-मुक्त NDVI बिंदु नहीं हैं।',
    obsCurve: 'प्रत्यक्ष NDVI', predCurve: 'अनुमानित वक्र', pause: 'रोकें', frameWord: 'फ़्रेम', dayAfterSowing: 'दिन (बुवाई बाद)', trendWord: 'रुझान:',
  },
  te: {
    subMeta: 'Copernicus Sentinel-2 L2A (10m ఉపగ్రహ చిత్రాలు) · ప్రతి 5 రోజులకు పునఃపరిశీలన',
    syncing: 'ఉపగ్రహ చిత్రం లోడ్ అవుతోంది...', toggleFsAria: 'పూర్తి స్క్రీన్ ఉపగ్రహ వీక్షణం',
    unavailable: 'అందుబాటులో లేదు', cloudLbl: '% మేఘాలు', validLbl: '% స్పష్టత', pending: 'వేచి ఉంది', autoCheckSuffix: '(+24గం ఆటో)',
    toWord: 'నుండి', fetchBtn: 'తీసుకోండి', errRetrieve: 'Sentinel-2 ఉపగ్రహ డేటాను పొందడంలో విఫలమైంది.',
    loadingBands: 'నిజమైన 10m Sentinel-2 ఉపగ్రహ చిత్రాలు లోడ్ అవుతున్నాయి...', noUsable: 'ఈ తేదీలలో స్పష్టమైన ఉపగ్రహ చిత్రం లేదు.',
    obsNdvi: 'NDVI (పంట పచ్చదనం)', ndmiLbl: 'NDMI (ఆకు తేమ)', obsEvi: 'ప్రత్యక్ష EVI', masked: 'మేఘాలతో మూసివుంది',
    chartTitle: 'నిజమైన ఉపగ్రహ NDVI vs అంచనా పంట వక్రం', noChartPts: 'ఈ వ్యవధిలో మేఘాలు లేని NDVI డేటా ఇంకా లేదు.',
    obsCurve: 'నిజమైన NDVI', predCurve: 'అంచనా వక్రం', pause: 'ఆపు', frameWord: 'ఫ్రేమ్', dayAfterSowing: 'రోజులు (విత్తిన తర్వాత)', trendWord: 'ధోరణి:',
  },
};
import { LatLonPoint } from '@/lib/digital-farming/geo';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Satellite,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Calendar,
  Layers,
  Columns,
} from 'lucide-react';

interface RealSatelliteMonitorPanelProps {
  farmId?: string;
  farmName: string;
  cropName: string;
  sowingDate: string;
  areaAcres: number;
  points: LatLonPoint[];
  totalDays: number;
  mode?: 'live' | 'timelapse';
  onObservationSelected?: (obs: SatelliteObservationFrame | null) => void;
}

export function RealSatelliteMonitorPanel({
  farmId,
  farmName,
  cropName,
  sowingDate,
  areaAcres,
  points,
  totalDays,
  mode = 'timelapse',
  onObservationSelected,
}: RealSatelliteMonitorPanelProps) {
  const { t, language } = useFarm();
  const L = SAT_PANEL_I18N[language] || SAT_PANEL_I18N.en;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<SatelliteTimelapseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [layer, setLayer] = useState<'true_color' | 'false_color' | 'ndvi'>('true_color');
  const [frameIdx, setFrameIdx] = useState<number>(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState<number>(1400);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSplitPct, setCompareSplitPct] = useState(50);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 45);
    return d.toISOString().split('T')[0];
  }, []);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(todayStr);

  const coords: [number, number][] = useMemo(() => {
    const pts =
      points.length >= 3
        ? points
        : [
            { lat: 13.3412, lon: 77.1135 },
            { lat: 13.3412, lon: 77.1144 },
            { lat: 13.3403, lon: 77.1145 },
            { lat: 13.3402, lon: 77.1134 },
          ];
    return pts.map((p) => [p.lon, p.lat]);
  }, [points]);

  const loadObservations = async (syncNow = false) => {
    setLoading(true);
    setErrorMsg(null);
    setPlaying(false);
    try {
      const res = syncNow
        ? await syncMonitoredParcel({
            farmId,
            farmName,
            cropName,
            sowingDate,
            areaAcres,
            coordinates: coords,
            totalDays,
          })
        : await fetchSatelliteTimelapse({
            coordinates: coords,
            startDate,
            endDate,
            farmId,
            sowingDate,
            totalDays,
            maxScenes: mode === 'live' ? 3 : 6,
          });
      setData(res);
      if (!res.available && res.error) setErrorMsg(res.error);
      const len = res.observations?.length || 0;
      if (len > 0) {
        const lastIdx = len - 1;
        setFrameIdx(lastIdx);
        onObservationSelected?.(res.observations[lastIdx]);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || L.errRetrieve);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObservations(false);
  }, [coords, mode]);

  const observations = data?.observations || [];
  const currentObs: SatelliteObservationFrame | null = observations[frameIdx] || null;
  const earliestObs: SatelliteObservationFrame | null = observations[0] || null;

  useEffect(() => {
    if (!playing || observations.length <= 1) return;
    const t = window.setInterval(() => {
      setFrameIdx((i) => {
        const next = (i + 1) % observations.length;
        onObservationSelected?.(observations[next]);
        return next;
      });
    }, speedMs);
    return () => window.clearInterval(t);
  }, [playing, observations, speedMs]);

  const getLayerSrc = (obs: SatelliteObservationFrame | null) => {
    if (!obs?.layers) return null;
    if (layer === 'false_color') return obs.layers.false_color_png;
    if (layer === 'ndvi') return obs.layers.ndvi_png;
    return obs.layers.true_color_png;
  };

  const chartData = observations
    .filter((o) => o.indices?.ndvi_mean !== null && o.indices?.ndvi_mean !== undefined)
    .map((o) => ({
      date: (o.acquisition_date || '').slice(0, 10),
      observedNdvi: o.indices.ndvi_mean,
      predictedNdvi: o.modeled_expected_ndvi ?? null,
      ndmi: o.indices.ndmi_mean,
    }));

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const activeImgSrc = getLayerSrc(currentObs);
  const beforeImgSrc = getLayerSrc(earliestObs);

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-[#DCD8CA] dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm space-y-4 p-4 sm:p-5 text-xs"
    >
      {/* Header + Observed Label + Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E5D8] dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#173C2B] text-white">
            <Satellite className="w-4 h-4 text-[#86efac]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-[#20372A] dark:text-white">
                {t('satObservedHeader')}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                {data?.data_quality || t('loadingText')}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              {L.subMeta}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => loadObservations(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#173C2B] hover:bg-[#102D20] text-white font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? L.syncing : t('satSyncOverpass')}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={L.toggleFsAria}
            className="p-1.5 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 hover:bg-[#F7F5ED] dark:hover:bg-zinc-900"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Monitoring Metadata Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-[#F7F5ED] dark:bg-zinc-900 p-3 rounded-xl border border-[#DCD8CA] dark:border-zinc-800">
        <div>
          <span className="text-zinc-500 block">{t('satLatestAcquisition')}</span>
          <strong>
            {currentObs?.acquisition_date ? formatLocalizedDate(currentObs.acquisition_date, language) : L.unavailable}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">{t('satDataFreshness')}</span>
          <strong>
            {data?.data_freshness_days !== null && data?.data_freshness_days !== undefined
              ? `${data.data_freshness_days} ${t('satDaysAgoSuffix')}`
              : '—'}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">{t('satParcelCloud')}</span>
          <strong>
            {currentObs
              ? `${currentObs.parcel_cloud_cover_pct}${L.cloudLbl} · ${currentObs.valid_pixel_coverage_pct}${L.validLbl}`
              : '—'}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">{t('satSyncSchedule')}</span>
          <strong>
            {data?.last_sync_at ? `${new Date(data.last_sync_at).toLocaleTimeString(getIntlLocale(language))} ${L.autoCheckSuffix}` : L.pending}
          </strong>
        </div>
      </div>

      {/* Date Range & Spectral Layer Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#36784D]" />
          {(
            [
              { id: 'true_color', label: t('satLayerTrueColor') },
              { id: 'false_color', label: t('satLayerFalseColor') },
              { id: 'ndvi', label: t('satLayerNdvi') },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLayer(item.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold border transition ${
                layer === item.id
                  ? 'bg-[#173C2B] text-white border-[#173C2B]'
                  : 'bg-white dark:bg-zinc-900 border-[#DCD8CA] dark:border-zinc-700'
              }`}
            >
              {item.label}
            </button>
          ))}
          {observations.length > 1 && (
            <button
              type="button"
              onClick={() => setCompareMode((c) => !c)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-semibold border ${
                compareMode
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white dark:bg-zinc-900 border-[#DCD8CA] dark:border-zinc-700'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              {t('satBeforeAfter')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 rounded-lg border border-[#DCD8CA] dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <span>{L.toWord}</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 rounded-lg border border-[#DCD8CA] dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={() => loadObservations(false)}
            className="px-2.5 py-1 rounded-lg bg-[#36784D] text-white font-semibold"
          >
            {L.fetchBtn}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {data?.comparison_alert && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 text-amber-950 dark:text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>{data.comparison_alert}</span>
        </div>
      )}

      {/* Satellite Imagery Viewer + Index Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-[#DCD8CA] dark:border-zinc-800 bg-zinc-900 aspect-square max-h-[360px] mx-auto w-full">
          {loading && !activeImgSrc ? (
            <div className="w-full h-full flex items-center justify-center text-zinc-400">
              {L.loadingBands}
            </div>
          ) : activeImgSrc ? (
            <>
              <img
                src={activeImgSrc}
                alt={`Sentinel-2 ${layer} ${currentObs?.scene_id}`}
                className="w-full h-full object-contain"
              />
              {compareMode && beforeImgSrc && (
                <div
                  className="absolute inset-0 overflow-hidden border-r-2 border-white"
                  style={{ width: `${compareSplitPct}%` }}
                >
                  <img
                    src={beforeImgSrc}
                    alt={t('satBeforeAfter')}
                    className="w-full h-full object-contain max-w-none"
                    style={{ width: '100%' }}
                  />
                </div>
              )}
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[10px] font-semibold">
                {currentObs?.scene_id} · {currentObs?.resolution_m}m ·{' '}
                {(currentObs?.acquisition_date || '').slice(0, 10)}
              </div>
              {compareMode && (
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={compareSplitPct}
                  onChange={(e) => setCompareSplitPct(Number(e.target.value))}
                  aria-label={t('satBeforeAfter')}
                  className="absolute bottom-3 left-4 right-4 z-10"
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-6 text-center text-zinc-400">
              {data?.insufficient_history_note || L.noUsable}
            </div>
          )}
        </div>

        {/* Observed Indices + Time-Series Chart */}
        <div className="lg:col-span-6 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800">
              <div className="text-[11px] text-zinc-500">{L.obsNdvi}</div>
              <div className="text-lg font-bold text-[#173C2B] dark:text-emerald-400">
                {currentObs?.indices?.ndvi_mean !== null && currentObs?.indices?.ndvi_mean !== undefined
                  ? currentObs.indices.ndvi_mean.toFixed(3)
                  : L.masked}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800">
              <div className="text-[11px] text-zinc-500">{L.ndmiLbl}</div>
              <div className="text-lg font-bold text-sky-700 dark:text-sky-400">
                {currentObs?.indices?.ndmi_mean !== null && currentObs?.indices?.ndmi_mean !== undefined
                  ? currentObs.indices.ndmi_mean.toFixed(3)
                  : L.masked}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800">
              <div className="text-[11px] text-zinc-500">{L.obsEvi}</div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {currentObs?.indices?.evi_mean !== null && currentObs?.indices?.evi_mean !== undefined
                  ? currentObs.indices.evi_mean.toFixed(3)
                  : L.masked}
              </div>
            </div>
          </div>

          {currentObs?.indices && (
            <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-[11px] text-zinc-700 dark:text-zinc-300 space-y-1">
              <div>{explainScientificIndex('NDVI', currentObs.indices.ndvi_mean, language)}</div>
              <div>{explainScientificIndex('NDMI', currentObs.indices.ndmi_mean, language)}</div>
            </div>
          )}

          {currentObs?.limitation_note && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-800 dark:text-amber-200 text-[11px]">
              {currentObs.limitation_note}
            </div>
          )}

          {/* Observation vs Prediction Comparison Chart */}
          <div className="p-3 rounded-xl border border-[#DCD8CA] dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="font-bold text-[11px] text-[#20372A] dark:text-zinc-200 mb-2">
              {L.chartTitle}
            </div>
            {chartData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-zinc-500 text-[11px]">
                {L.noChartPts}
              </div>
            ) : (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="observedNdvi"
                      name={L.obsCurve}
                      stroke="#173C2B"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="predictedNdvi"
                      name={L.predCurve}
                      stroke="#C9A35C"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Time-Lapse Playback Controls */}
      {observations.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const prev = (frameIdx - 1 + observations.length) % observations.length;
                  setFrameIdx(prev);
                  onObservationSelected?.(observations[prev]);
                }}
                aria-label={language === 'kn' ? 'ಹಿಂದಿನದು' : language === 'hi' ? 'पिछला' : language === 'te' ? 'మునుపటిది' : 'Previous'}
                className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-[#DCD8CA] dark:border-zinc-700"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? L.pause : t('satPlayTimeline')}
                className="px-3 py-1.5 rounded-lg bg-[#173C2B] text-white font-semibold inline-flex items-center gap-1.5"
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{playing ? L.pause : t('satPlayTimeline')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = (frameIdx + 1) % observations.length;
                  setFrameIdx(next);
                  onObservationSelected?.(observations[next]);
                }}
                aria-label={language === 'kn' ? 'ಮುಂದಿನದು' : language === 'hi' ? 'अगला' : language === 'te' ? 'తర్వాతిది' : 'Next'}
                className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-[#DCD8CA] dark:border-zinc-700"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span>
                {L.frameWord} <strong>{frameIdx + 1}</strong> / {observations.length}
                {currentObs?.days_after_sowing !== null && currentObs?.days_after_sowing !== undefined
                  ? ` · ${currentObs.days_after_sowing} ${L.dayAfterSowing}`
                  : ''}
                {currentObs?.vegetation_trend ? ` · ${L.trendWord} ${currentObs.vegetation_trend}` : ''}
              </span>
              <select
                value={speedMs}
                onChange={(e) => setSpeedMs(Number(e.target.value))}
                className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-[#DCD8CA] dark:border-zinc-700"
              >
                <option value={2200}>0.5x</option>
                <option value={1400}>1x</option>
                <option value={800}>2x</option>
              </select>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(0, observations.length - 1)}
            value={frameIdx}
            onChange={(e) => {
              const i = Number(e.target.value);
              setFrameIdx(i);
              onObservationSelected?.(observations[i]);
            }}
            aria-label={language === 'kn' ? 'ಉಪಗ್ರಹ ಟೈಮ್‌ಲೈನ್ ಸ್ಲೈಡರ್' : language === 'hi' ? 'उपग्रह टाइमलाइन स्लाइडर' : language === 'te' ? 'ఉపగ్రహ టైమ్‌లైన్ స్లైడర్' : 'Satellite timeline slider'}
            className="w-full accent-[#173C2B]"
          />
        </div>
      )}
    </div>
  );
}
