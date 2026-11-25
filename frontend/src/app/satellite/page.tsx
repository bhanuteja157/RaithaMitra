// frontend/src/app/satellite/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import {
  analyzeSatelliteObservation,
  fetchSatelliteHistory,
  fetchSatelliteProviders,
  SatelliteHistoryResponse,
  SatelliteObservationResponse,
  SatelliteProvidersResponse,
} from '@/lib/satelliteApi';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Droplets,
  Info,
  Layers,
  Leaf,
  MapPin,
  RotateCw,
  Satellite,
  ShieldCheck,
  Sprout,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const LeafletMapInner = dynamic(
  () => import('@/components/location/LeafletMapInner'),
  { ssr: false }
);

function buildSamplePolygonGeoJson(lat: number, lon: number, areaHa: number): string {
  const halfSideDeg = Math.max(0.0005, Math.min(0.01, Math.sqrt(Math.max(0.1, areaHa) * 10000) / 222000));
  const coords = [
    [Number((lon - halfSideDeg).toFixed(6)), Number((lat - halfSideDeg).toFixed(6))],
    [Number((lon + halfSideDeg).toFixed(6)), Number((lat - halfSideDeg).toFixed(6))],
    [Number((lon + halfSideDeg).toFixed(6)), Number((lat + halfSideDeg).toFixed(6))],
    [Number((lon - halfSideDeg).toFixed(6)), Number((lat + halfSideDeg).toFixed(6))],
    [Number((lon - halfSideDeg).toFixed(6)), Number((lat - halfSideDeg).toFixed(6))],
  ];
  return JSON.stringify({ type: 'Polygon', coordinates: [coords] }, null, 2);
}

export default function SatellitePage() {
  const { currentFarm, token } = useFarm();

  const [lat, setLat] = useState<number>(currentFarm?.latitude ?? 12.5234);
  const [lon, setLon] = useState<number>(currentFarm?.longitude ?? 76.8976);
  const [geojsonText, setGeojsonText] = useState<string>('');
  const [maxCloudPct, setMaxCloudPct] = useState<number>(35);

  const [nirInput, setNirInput] = useState<string>('');
  const [redInput, setRedInput] = useState<string>('');
  const [swirInput, setSwirInput] = useState<string>('');
  const [blueInput, setBlueInput] = useState<string>('');
  const [greenInput, setGreenInput] = useState<string>('');
  const [redEdgeInput, setRedEdgeInput] = useState<string>('');

  const [useDemo, setUseDemo] = useState<boolean>(false);
  const [offlineOnly, setOfflineOnly] = useState<boolean>(false);

  const [providers, setProviders] = useState<SatelliteProvidersResponse | null>(null);
  const [observation, setObservation] = useState<SatelliteObservationResponse | null>(null);
  const [history, setHistory] = useState<SatelliteHistoryResponse | null>(null);
  const [selectedThumb, setSelectedThumb] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentFarm) {
      setLat(currentFarm.latitude);
      setLon(currentFarm.longitude);
    }
  }, [currentFarm]);

  const loadProvidersAndHistory = useCallback(async () => {
    if (!token) return;
    try {
      const prov = await fetchSatelliteProviders(token);
      setProviders(prov);
    } catch {
      // Non-fatal
    }
    if (currentFarm?.id) {
      try {
        const hist = await fetchSatelliteHistory(currentFarm.id, token);
        setHistory(hist);
      } catch {
        // Non-fatal
      }
    }
  }, [token, currentFarm?.id]);

  useEffect(() => {
    loadProvidersAndHistory();
  }, [loadProvidersAndHistory]);

  const parseBand = (val: string): number | null => {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleAnalyze = useCallback(async () => {
    setErrorMsg(null);
    let parsedBoundary: Record<string, unknown> | null = null;
    if (geojsonText.trim()) {
      try {
        parsedBoundary = JSON.parse(geojsonText);
      } catch {
        setErrorMsg('Invalid GeoJSON syntax. Please provide valid JSON for a Polygon or Feature.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await analyzeSatelliteObservation(
        {
          farm_id: currentFarm?.id ?? null,
          latitude: lat,
          longitude: lon,
          boundary_geojson: parsedBoundary,
          nir_band: parseBand(nirInput),
          red_band: parseBand(redInput),
          swir_band: parseBand(swirInput),
          blue_band: parseBand(blueInput),
          green_band: parseBand(greenInput),
          red_edge_band: parseBand(redEdgeInput),
          use_demo_observation: useDemo,
          offline_only: offlineOnly,
          max_cloud_pct: maxCloudPct,
          lookback_days: 45,
        },
        token
      );
      setObservation(res);
      setSelectedThumb(res.thumbnail_url ?? res.scenes?.[0]?.thumbnail_url ?? null);

      if (currentFarm?.id && token) {
        const hist = await fetchSatelliteHistory(currentFarm.id, token, res.geometry?.polygon_hash);
        setHistory(hist);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Satellite analysis failed.');
    } finally {
      setIsLoading(false);
    }
  }, [
    geojsonText,
    currentFarm?.id,
    lat,
    lon,
    nirInput,
    redInput,
    swirInput,
    blueInput,
    greenInput,
    redEdgeInput,
    useDemo,
    offlineOnly,
    maxCloudPct,
    token,
  ]);

  useEffect(() => {
    if (token) {
      handleAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFarm?.id, token]);

  const chartData = useMemo(() => {
    if (!history?.observations?.length) return [];
    return history.observations
      .filter((o) => o.ndvi !== null && o.ndvi !== undefined)
      .map((o) => ({
        date: o.acquisition_date.slice(0, 10),
        NDVI: o.ndvi,
        NDMI: o.ndmi,
        EVI: o.evi,
        SAVI: o.savi,
      }));
  }, [history]);

  const indexCards = useMemo(() => {
    const idx = observation?.indices;
    return [
      { key: 'NDVI', value: idx?.ndvi, desc: 'Canopy Greenness & Vigor', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
      { key: 'NDMI', value: idx?.ndmi, desc: 'Canopy Moisture (NIR/SWIR)', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
      { key: 'NDWI', value: idx?.ndwi, desc: 'Surface Water (Green/NIR)', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
      { key: 'EVI', value: idx?.evi, desc: 'Enhanced Dense Canopy Index', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
      { key: 'SAVI', value: idx?.savi, desc: 'Soil-Adjusted Vegetation (L=0.5)', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
      { key: 'NDRE', value: idx?.ndre, desc: 'Red-Edge Chlorophyll Stress', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
    ];
  }, [observation]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm uppercase tracking-wider">
              <Satellite className="w-4 h-4" />
              AD-25 Satellite &amp; Geospatial Intelligence
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
              Field Remote Sensing &amp; Canopy Health
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Live Sentinel-2 L2A scene discovery, cloud-filtered spectral indices, historical change detection, and FAO-56 irrigation fusion.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {observation && (
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                  observation.is_demo
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : observation.cache_fallback
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                    : observation.is_live
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {observation.is_demo ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                {observation.source_mode.replace(/_/g, ' ').toUpperCase()}
              </span>
            )}
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Fetching Satellite Data...' : 'Run Satellite Analysis'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section A & B: Field Boundary + Map + STAC True-Color Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Section A: Geometry & Controls */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Field Boundary &amp; Controls
              </h2>
              {currentFarm && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {currentFarm.farm_name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => setLon(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Max Cloud %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={maxCloudPct}
                  onChange={(e) => setMaxCloudPct(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600">
                  Field Polygon GeoJSON (Optional — Polygon / Feature)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setGeojsonText(
                      buildSamplePolygonGeoJson(lat, lon, currentFarm?.land_area_ha ?? 1.5)
                    )
                  }
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Generate Field Polygon
                </button>
              </div>
              <textarea
                rows={4}
                value={geojsonText}
                onChange={(e) => setGeojsonText(e.target.value)}
                placeholder='{"type":"Polygon","coordinates":[[[76.89,12.52],...]]}'
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              {observation?.geometry && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-medium">
                    Geodesic Area: {observation.geometry.area_ha.toFixed(2)} ha
                  </span>
                  <span>•</span>
                  <span>
                    {observation.geometry.is_user_polygon ? 'Custom GeoJSON Polygon' : 'Farm Footprints AOI'}
                  </span>
                </div>
              )}
              {observation?.geometry?.resolution_warning && (
                <p className="mt-1 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  {observation.geometry.resolution_warning}
                </p>
              )}
            </div>

            {/* Optional Manual Spectral Bands */}
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Optional Manual Band Reflectance (0.0 – 1.0)
              </p>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="NIR (B8)"
                  value={nirInput}
                  onChange={(e) => setNirInput(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="Red (B4)"
                  value={redInput}
                  onChange={(e) => setRedInput(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="SWIR (B11)"
                  value={swirInput}
                  onChange={(e) => setSwirInput(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="Blue (B2)"
                  value={blueInput}
                  onChange={(e) => setBlueInput(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="Green (B3)"
                  value={greenInput}
                  onChange={(e) => setGreenInput(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="RedEdge (B5)"
                  value={redEdgeInput}
                  onChange={(e) => setRedEdgeInput(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDemo}
                  onChange={(e) => setUseDemo(e.target.checked)}
                  className="rounded text-amber-600"
                />
                Explicit Demo Sample
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={offlineOnly}
                  onChange={(e) => setOfflineOnly(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                Offline Cache Mode
              </label>
            </div>
          </div>

          {/* Section B: Interactive Map + STAC True-Color Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Field Coordinates &amp; Satellite Basemap
                </h2>
                {observation?.acquisition_date && (
                  <span className="text-xs text-slate-600">
                    Latest Scene: {observation.acquisition_date.slice(0, 10)}
                    {observation.cloud_cover_pct !== null && observation.cloud_cover_pct !== undefined
                      ? ` • Cloud ${observation.cloud_cover_pct.toFixed(1)}%`
                      : ''}
                  </span>
                )}
              </div>
              <div className="h-64 rounded-xl overflow-hidden border border-slate-200">
                <LeafletMapInner
                  latitude={lat}
                  longitude={lon}
                  onSelectCoordinates={(newLat: number, newLon: number) => {
                    setLat(newLat);
                    setLon(newLon);
                  }}
                />
              </div>
            </div>

            {/* Live Sentinel-2 Scene Discovery & True-Color Thumbnail */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-sky-600" />
                  Live Sentinel-2 L2A Scene Discovery (Earth Search STAC)
                </h3>
                <span className="text-xs text-slate-500">
                  {observation?.scenes?.length ?? 0} scenes found
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-4">
                  {selectedThumb ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                      <img
                        src={selectedThumb}
                        alt="Sentinel-2 True Color Preview"
                        className="w-full h-36 object-cover"
                      />
                      <div className="px-2.5 py-1.5 text-[11px] text-slate-200 bg-slate-900">
                        True-Color L2A Quicklook
                      </div>
                    </div>
                  ) : (
                    <div className="h-36 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500 p-3 text-center">
                      No STAC true-color preview available in current mode.
                    </div>
                  )}
                </div>
                <div className="md:col-span-8 max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Cloud %</th>
                        <th className="px-3 py-2">Platform</th>
                        <th className="px-3 py-2">Scene ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {observation?.scenes?.length ? (
                        observation.scenes.map((sc) => (
                          <tr
                            key={sc.scene_id}
                            onClick={() => sc.thumbnail_url && setSelectedThumb(sc.thumbnail_url)}
                            className="hover:bg-slate-50 cursor-pointer"
                          >
                            <td className="px-3 py-2 font-medium text-slate-800">
                              {sc.acquisition_date.slice(0, 10)}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {sc.cloud_cover_pct !== null && sc.cloud_cover_pct !== undefined
                                ? `${sc.cloud_cover_pct.toFixed(1)}%`
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{sc.platform || 'Sentinel-2'}</td>
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-500 truncate max-w-[160px]">
                              {sc.scene_id}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                            No live STAC scenes returned for current query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section C: Spectral Indices Grid */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-emerald-600" />
                Multi-Spectral Vegetation &amp; Moisture Indices
              </h2>
              <p className="text-xs text-slate-600">{observation?.provider_note}</p>
            </div>
            {observation && !observation.band_statistics_available && (
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                Band reflectance pending — indices not fabricated
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {indexCards.map((c) => (
              <div key={c.key} className={`p-4 rounded-xl border ${c.bg}`}>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {c.key}
                </div>
                <div className={`text-2xl font-extrabold mt-1 ${c.color}`}>
                  {c.value !== null && c.value !== undefined ? c.value.toFixed(3) : '—'}
                </div>
                <div className="text-[11px] text-slate-600 mt-1">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section D & E: Historical Change Detection + Agronomic Fusion */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Section D: Historical Timeline & Change Detection */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Historical Observations &amp; Change Detection
              </h2>
              <span className="text-xs text-slate-500">
                {history?.observation_count ?? 0} cached records
              </span>
            </div>

            {history?.change_detection && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                {history.change_detection.ndvi?.direction === 'decreasing' ? (
                  <TrendingDown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs text-slate-700 space-y-1">
                  <div className="font-semibold text-slate-900">
                    Latest Shift ({history.change_detection.previous_date.slice(0, 10)} →{' '}
                    {history.change_detection.current_date.slice(0, 10)})
                  </div>
                  <p>{history.change_detection.summary}</p>
                </div>
              </div>
            )}

            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[-0.5, 1]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="NDVI" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="NDMI" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="EVI" stroke="#0d9488" strokeWidth={1.5} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500 p-6 text-center">
                  No multi-date spectral index points cached yet for this farm. Run Sentinel Hub or manual band observations across dates to build a real change-detection curve.
                </div>
              )}
            </div>
          </div>

          {/* Section E: Agronomic Fusion & Crop Doctor Hint */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-sky-600" />
              Weather, Irrigation &amp; Stress Fusion
            </h2>

            {observation?.agronomic_fusion ? (
              <div className="space-y-3 text-sm">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xs font-bold uppercase text-emerald-800">
                    Canopy Status: {observation.agronomic_fusion.canopy_status}
                  </div>
                  <p className="text-xs text-emerald-900 mt-1">
                    {observation.agronomic_fusion.canopy_health_summary}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                  <div className="text-xs font-bold uppercase text-sky-800">
                    Moisture &amp; Irrigation: {observation.agronomic_fusion.moisture_status}
                  </div>
                  <p className="text-xs text-sky-900 mt-1">
                    {observation.agronomic_fusion.irrigation_guidance}
                  </p>
                  {observation.agronomic_fusion.weather_fusion && (
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-sky-200 text-[11px] text-sky-900">
                      <div>ET0: {observation.agronomic_fusion.weather_fusion.et0_mm_day} mm/d</div>
                      <div>Demand: {observation.agronomic_fusion.weather_fusion.crop_water_demand_mm_day} mm/d</div>
                      <div>48h Rain: {observation.agronomic_fusion.weather_fusion.rain_48h_mm} mm</div>
                    </div>
                  )}
                </div>

                {observation.agronomic_fusion.crop_doctor_hint?.recommended && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <Sprout className="w-4 h-4" />
                      Field Inspection Recommended
                    </div>
                    <p className="text-xs text-amber-900">
                      {observation.agronomic_fusion.crop_doctor_hint.reason}
                    </p>
                    <Link
                      href={observation.agronomic_fusion.crop_doctor_hint.route}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                    >
                      {observation.agronomic_fusion.crop_doctor_hint.action_label}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Run satellite analysis to load weather and irrigation fusion.</p>
            )}
          </div>
        </div>

        {/* Section F: Data Transparency & Provider Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Data Transparency &amp; Scientific Limitations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers?.providers?.map((p) => (
              <div key={p.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>{p.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] ${
                      p.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p.configured ? 'Configured' : 'Not Configured'}
                  </span>
                </div>
                <p className="text-slate-600">{p.note}</p>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-600 pt-1">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Sentinel-2 optical imagery has 10 m–20 m pixel resolution and cannot penetrate dense clouds or diagnose specific leaf pathogens. Use Crop Doctor for leaf-level disease inspection.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
