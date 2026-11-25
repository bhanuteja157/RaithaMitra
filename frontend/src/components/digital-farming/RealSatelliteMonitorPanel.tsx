// frontend/src/components/digital-farming/RealSatelliteMonitorPanel.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchSatelliteTimelapse,
  SatelliteObservationFrame,
  SatelliteTimelapseResponse,
  syncMonitoredParcel,
} from '@/lib/satelliteMonitoringApi';
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
      setErrorMsg(err?.message || 'Failed to retrieve Sentinel-2 observations.');
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
                Observed Satellite Data — Sentinel-2 Level-2A
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                {data?.data_quality || 'CONNECTING'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Copernicus Sentinel-2 L2A (10m RGB/NIR · 20m SWIR/SCL) · Nominal 5-day revisit (cloud dependent)
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
            {loading ? 'Syncing Sentinel-2...' : 'Sync Latest Overpass'}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen satellite view"
            className="p-1.5 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 hover:bg-[#F7F5ED] dark:hover:bg-zinc-900"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Monitoring Metadata Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-[#F7F5ED] dark:bg-zinc-900 p-3 rounded-xl border border-[#DCD8CA] dark:border-zinc-800">
        <div>
          <span className="text-zinc-500 block">Latest Acquisition</span>
          <strong>
            {currentObs?.acquisition_date ? new Date(currentObs.acquisition_date).toLocaleDateString() : 'Unavailable'}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Data Freshness</span>
          <strong>
            {data?.data_freshness_days !== null && data?.data_freshness_days !== undefined
              ? `${data.data_freshness_days} days ago`
              : 'N/A'}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Parcel Cloud / Clear</span>
          <strong>
            {currentObs
              ? `${currentObs.parcel_cloud_cover_pct}% cloud · ${currentObs.valid_pixel_coverage_pct}% valid`
              : 'N/A'}
          </strong>
        </div>
        <div>
          <span className="text-zinc-500 block">Sync / Next Check</span>
          <strong>
            {data?.last_sync_at ? `${new Date(data.last_sync_at).toLocaleTimeString()} (+24h auto)` : 'Pending'}
          </strong>
        </div>
      </div>

      {/* Date Range & Spectral Layer Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#36784D]" />
          {(
            [
              { id: 'true_color', label: 'True-Color RGB' },
              { id: 'false_color', label: 'False-Color (NIR-R-G)' },
              { id: 'ndvi', label: 'NDVI Heatmap' },
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
              Before / After
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
          <span>to</span>
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
            Fetch
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
              Retrieving real 10m Sentinel-2 GeoTIFF bands...
            </div>
          ) : activeImgSrc ? (
            <>
              <img
                src={activeImgSrc}
                alt={`Sentinel-2 ${layer} observation ${currentObs?.scene_id}`}
                className="w-full h-full object-contain"
              />
              {compareMode && beforeImgSrc && (
                <div
                  className="absolute inset-0 overflow-hidden border-r-2 border-white"
                  style={{ width: `${compareSplitPct}%` }}
                >
                  <img
                    src={beforeImgSrc}
                    alt="Earlier Sentinel-2 observation"
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
                  aria-label="Before and after split slider"
                  className="absolute bottom-3 left-4 right-4 z-10"
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-6 text-center text-zinc-400">
              {data?.insufficient_history_note || 'No usable Sentinel-2 observation in selected date range.'}
            </div>
          )}
        </div>

        {/* Observed Indices + Time-Series Chart */}
        <div className="lg:col-span-6 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800">
              <div className="text-[11px] text-zinc-500">Observed NDVI</div>
              <div className="text-lg font-bold text-[#173C2B] dark:text-emerald-400">
                {currentObs?.indices?.ndvi_mean !== null && currentObs?.indices?.ndvi_mean !== undefined
                  ? currentObs.indices.ndvi_mean.toFixed(3)
                  : 'Masked'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800">
              <div className="text-[11px] text-zinc-500">NDMI (Moisture)</div>
              <div className="text-lg font-bold text-sky-700 dark:text-sky-400">
                {currentObs?.indices?.ndmi_mean !== null && currentObs?.indices?.ndmi_mean !== undefined
                  ? currentObs.indices.ndmi_mean.toFixed(3)
                  : 'Masked'}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800">
              <div className="text-[11px] text-zinc-500">Observed EVI</div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {currentObs?.indices?.evi_mean !== null && currentObs?.indices?.evi_mean !== undefined
                  ? currentObs.indices.evi_mean.toFixed(3)
                  : 'Masked'}
              </div>
            </div>
          </div>

          {currentObs?.limitation_note && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-800 dark:text-amber-200 text-[11px]">
              {currentObs.limitation_note}
            </div>
          )}

          {/* Observation vs Prediction Comparison Chart */}
          <div className="p-3 rounded-xl border border-[#DCD8CA] dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="font-bold text-[11px] text-[#20372A] dark:text-zinc-200 mb-2">
              Observed Sentinel-2 NDVI vs Modeled Crop Curve
            </div>
            {chartData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-zinc-500 text-[11px]">
                No cloud-free NDVI points in this window yet.
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
                      name="Observed NDVI"
                      stroke="#173C2B"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="predictedNdvi"
                      name="Predicted Curve"
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
                aria-label="Previous observation"
                className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-[#DCD8CA] dark:border-zinc-700"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Pause satellite timelapse' : 'Play satellite timelapse'}
                className="px-3 py-1.5 rounded-lg bg-[#173C2B] text-white font-semibold inline-flex items-center gap-1.5"
              >
                {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{playing ? 'Pause' : 'Play Observed Timeline'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = (frameIdx + 1) % observations.length;
                  setFrameIdx(next);
                  onObservationSelected?.(observations[next]);
                }}
                aria-label="Next observation"
                className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-[#DCD8CA] dark:border-zinc-700"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span>
                Frame <strong>{frameIdx + 1}</strong> / {observations.length}
                {currentObs?.days_after_sowing !== null && currentObs?.days_after_sowing !== undefined
                  ? ` · Day ${currentObs.days_after_sowing} after sowing`
                  : ''}
                {currentObs?.vegetation_trend ? ` · Trend: ${currentObs.vegetation_trend}` : ''}
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
            aria-label="Satellite timeline slider"
            className="w-full accent-[#173C2B]"
          />
        </div>
      )}
    </div>
  );
}
