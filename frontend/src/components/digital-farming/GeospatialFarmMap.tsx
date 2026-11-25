// frontend/src/components/digital-farming/GeospatialFarmMap.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  LatLonPoint,
  PolygonMetrics,
  SavedVirtualFarm,
  evaluateFarmPolygon,
  buildSavedVirtualFarm,
  loadSavedFarmsFromStorage,
  saveFarmsToStorage,
  getTumakuruDemoFarm,
} from '@/lib/digital-farming/geo';
import { searchLocations, validateCoordinates } from '@/lib/locationApi';
import {
  MapPin,
  Search,
  Crosshair,
  Maximize2,
  Minimize2,
  Layers,
  Undo2,
  Redo2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  PenTool,
  Save,
  Sparkles,
} from 'lucide-react';

interface GeospatialFarmMapProps {
  points: LatLonPoint[];
  onPointsChange: (points: LatLonPoint[]) => void;
  farmName: string;
  onFarmNameChange: (name: string) => void;
  locationLabel: string;
  onLocationLabelChange: (label: string) => void;
  onConfirmFarm: (farm: SavedVirtualFarm) => void;
}

export default function GeospatialFarmMap({
  points,
  onPointsChange,
  farmName,
  onFarmNameChange,
  locationLabel,
  onLocationLabelChange,
  onConfirmFarm,
}: GeospatialFarmMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const satLayerRef = useRef<L.TileLayer | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const [isDrawing, setIsDrawing] = useState<boolean>(true);
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [useSatellite, setUseSatellite] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [history, setHistory] = useState<LatLonPoint[][]>([]);
  const [redoStack, setRedoStack] = useState<LatLonPoint[][]>([]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<
    { display_name: string; latitude: number; longitude: number }[]
  >([]);
  const [searchBusy, setSearchBusy] = useState<boolean>(false);
  const [searchStatus, setSearchStatus] = useState<string>('');

  const [manualLat, setManualLat] = useState<string>('13.3407');
  const [manualLon, setManualLon] = useState<string>('77.1140');
  const [manualError, setManualError] = useState<string>('');
  const [gpsStatus, setGpsStatus] = useState<string>('');
  const [savedFarms, setSavedFarms] = useState<SavedVirtualFarm[]>([]);

  const pointsRef = useRef(points);
  const isDrawingRef = useRef(isDrawing);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  useEffect(() => {
    setSavedFarms(loadSavedFarmsFromStorage());
  }, []);

  const metrics: PolygonMetrics = evaluateFarmPolygon(points);

  const commitPoints = (nextPoints: LatLonPoint[], recordHistory = true) => {
    if (recordHistory) {
      setHistory((prev) => [...prev.slice(-25), pointsRef.current]);
      setRedoStack([]);
    }
    onPointsChange(nextPoints);
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [13.3407, 77.114],
      zoom: 16,
      zoomControl: true,
    });

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Esri World Imagery (publicly attributed, toggleable; falls back cleanly if unavailable)
    const sat = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
      }
    );

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!isDrawingRef.current) return;
      const lat = Number(e.latlng.lat.toFixed(6));
      const lon = Number(e.latlng.lng.toFixed(6));
      const updated = [...pointsRef.current, { lat, lon }];
      commitPoints(updated, true);
    });

    mapRef.current = map;
    osmLayerRef.current = osm;
    satLayerRef.current = sat;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle Standard vs Satellite tile layer
  useEffect(() => {
    const map = mapRef.current;
    const osm = osmLayerRef.current;
    const sat = satLayerRef.current;
    if (!map || !osm || !sat) return;

    if (useSatellite) {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(sat)) sat.addTo(map);
    } else {
      if (map.hasLayer(sat)) map.removeLayer(sat);
      if (!map.hasLayer(osm)) osm.addTo(map);
    }
  }, [useSatellite]);

  // Render markers, polyline, and polygon whenever points change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers & shapes
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    if (polylineLayerRef.current) {
      map.removeLayer(polylineLayerRef.current);
      polylineLayerRef.current = null;
    }

    const latLngs: L.LatLngExpression[] = points.map((p) => [p.lat, p.lon]);

    if (points.length >= 2) {
      polylineLayerRef.current = L.polyline(latLngs, {
        color: metrics.valid ? '#15803d' : '#dc2626',
        weight: 3,
        dashArray: isClosed ? undefined : '6 6',
      }).addTo(map);
    }

    if (points.length >= 3) {
      polygonLayerRef.current = L.polygon(latLngs, {
        color: metrics.valid ? '#166534' : '#dc2626',
        weight: 2.5,
        fillColor: metrics.valid ? '#22c55e' : '#ef4444',
        fillOpacity: 0.28,
      }).addTo(map);
    }

    points.forEach((pt, idx) => {
      const icon = L.divIcon({
        className: 'df-vertex-marker',
        html: `<div style="width:20px;height:20px;border-radius:9999px;background:#166534;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);cursor:grab;">${idx + 1}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([pt.lat, pt.lon], { draggable: true, icon }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const next = pointsRef.current.map((item, i) =>
          i === idx
            ? { lat: Number(pos.lat.toFixed(6)), lon: Number(pos.lng.toFixed(6)) }
            : item
        );
        commitPoints(next, true);
      });
      markersRef.current.push(marker);
    });
  }, [points, isClosed, metrics.valid]);

  const panTo = (lat: number, lon: number, zoom = 16) => {
    mapRef.current?.setView([lat, lon], zoom, { animate: true });
    setManualLat(String(lat));
    setManualLon(String(lon));
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchBusy(true);
    setSearchStatus('');
    setSearchResults([]);
    try {
      const backendRes = await searchLocations(q, 5);
      if (backendRes.results && backendRes.results.length > 0) {
        setSearchResults(
          backendRes.results.map((r) => ({
            display_name: r.display_name,
            latitude: r.latitude,
            longitude: r.longitude,
          }))
        );
        setSearchBusy(false);
        return;
      }

      // Direct Nominatim fallback when backend is offline
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`
      );
      if (res.ok) {
        const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
        if (data.length > 0) {
          setSearchResults(
            data.map((d) => ({
              display_name: d.display_name,
              latitude: Number(Number(d.lat).toFixed(6)),
              longitude: Number(Number(d.lon).toFixed(6)),
            }))
          );
        } else {
          setSearchStatus('No matching village, district, or PIN found. Try manual coordinates or pan the map.');
        }
      } else {
        setSearchStatus('Location search unavailable; please pan the map or enter lat/lon manually.');
      }
    } catch {
      setSearchStatus('Unable to reach geocoding service; please pan the map or enter lat/lon manually.');
    } finally {
      setSearchBusy(false);
    }
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Browser GPS is not supported on this device.');
      return;
    }
    setGpsStatus('Requesting GPS permission...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        panTo(lat, lon, 17);
        onLocationLabelChange(`GPS (${lat}, ${lon})`);
        setGpsStatus(`Centered on GPS (${lat}, ${lon}).`);
      },
      (err) => {
        setGpsStatus(`GPS unavailable: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleManualJump = () => {
    const check = validateCoordinates(manualLat, manualLon);
    if (!check.valid) {
      setManualError(check.error);
      return;
    }
    setManualError('');
    panTo(check.lat, check.lon, 17);
    onLocationLabelChange(`${check.lat}, ${check.lon}`);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, points]);
    onPointsChange(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, points]);
    onPointsChange(next);
  };

  const handleDeletePoint = (idx: number) => {
    commitPoints(
      points.filter((_, i) => i !== idx),
      true
    );
  };

  const handleClearBoundary = () => {
    commitPoints([], true);
    setIsClosed(false);
    setIsDrawing(true);
  };

  const handleClosePolygon = () => {
    if (points.length < 3) return;
    setIsClosed(true);
    setIsDrawing(false);
    if (mapRef.current && points.length >= 3) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [32, 32] });
    }
  };

  const handleSaveAndConfirm = () => {
    const built = buildSavedVirtualFarm(farmName, locationLabel, points);
    if (!built) return;
    const updated = [built, ...savedFarms.filter((f) => f.id !== built.id)].slice(0, 12);
    setSavedFarms(updated);
    saveFarmsToStorage(updated);
    onConfirmFarm(built);
  };

  const handleLoadFarm = (farm: SavedVirtualFarm) => {
    onFarmNameChange(farm.name);
    onLocationLabelChange(farm.locationLabel);
    onPointsChange(farm.points);
    setIsClosed(true);
    setIsDrawing(false);
    if (mapRef.current && farm.points.length >= 3) {
      const bounds = L.latLngBounds(farm.points.map((p) => [p.lat, p.lon] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [32, 32] });
    }
  };

  const handleLoadTumakuruDemo = () => {
    const demo = getTumakuruDemoFarm();
    handleLoadFarm(demo);
  };

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div ref={wrapperRef} className="space-y-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5">
      {/* Top toolbar: Location search + GPS + Demo */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search village, district, state, or PIN code (e.g., Tumakuru)"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searchBusy}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium shrink-0"
          >
            {searchBusy ? 'Searching...' : 'Locate'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleUseGps}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-700" />
            Use My Location
          </button>
          <button
            type="button"
            onClick={handleLoadTumakuruDemo}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Load Tumakuru Demo (Fictional)
          </button>
        </div>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-zinc-800 p-2 space-y-1">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 px-2">
            Select matching location:
          </p>
          {searchResults.map((res, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                panTo(res.latitude, res.longitude, 16);
                onLocationLabelChange(res.display_name.split(',').slice(0, 3).join(', '));
                setSearchResults([]);
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-emerald-100 dark:hover:bg-zinc-700 flex items-center gap-2"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate">{res.display_name}</span>
            </button>
          ))}
        </div>
      )}
      {searchStatus && <p className="text-xs text-amber-700">{searchStatus}</p>}
      {gpsStatus && <p className="text-xs text-zinc-600 dark:text-zinc-400">{gpsStatus}</p>}

      {/* Manual coordinates */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-zinc-600 dark:text-zinc-400">Manual Lat/Lon:</span>
        <input
          type="text"
          value={manualLat}
          onChange={(e) => setManualLat(e.target.value)}
          placeholder="Latitude"
          className="w-28 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
        />
        <input
          type="text"
          value={manualLon}
          onChange={(e) => setManualLon(e.target.value)}
          placeholder="Longitude"
          className="w-28 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
        />
        <button
          type="button"
          onClick={handleManualJump}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 text-white hover:bg-zinc-900 font-medium"
        >
          Go to Coordinates
        </button>
        {manualError && <span className="text-red-600">{manualError}</span>}
      </div>

      {/* Drawing controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setIsDrawing(true);
              setIsClosed(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              isDrawing
                ? 'bg-emerald-700 text-white'
                : 'bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            {isDrawing ? 'Drawing Mode: Tap Map to Add Points' : 'Draw / Add Boundary Points'}
          </button>
          <button
            type="button"
            onClick={handleClosePolygon}
            disabled={points.length < 3}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-900 hover:bg-emerald-200 disabled:opacity-40"
          >
            Close Polygon ({points.length} pts)
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-zinc-300 dark:border-zinc-700 disabled:opacity-40"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-zinc-300 dark:border-zinc-700 disabled:opacity-40"
          >
            <Redo2 className="w-3.5 h-3.5" /> Redo
          </button>
          <button
            type="button"
            onClick={handleClearBoundary}
            disabled={points.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-red-700 border border-red-200 hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear / Redraw
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setUseSatellite((s) => !s)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            {useSatellite ? 'Standard Map' : 'Satellite View'}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-80 sm:h-[420px] rounded-2xl overflow-hidden border border-zinc-300 dark:border-zinc-700 z-10"
        aria-label="Interactive Geospatial Farmland Boundary Map"
      />
      <p className="text-[11px] text-zinc-500">
        Tip: Click or tap around your field perimeter to place boundary markers, and drag any numbered marker to adjust corners. Calculated area is a map-based estimate (WGS84 spherical geodesic), not a legal land survey.
      </p>

      {/* Boundary points chips (delete individual point) */}
      {points.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs font-medium text-zinc-500">Vertices ({points.length}):</span>
          {points.map((pt, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
            >
              #{i + 1} ({pt.lat.toFixed(4)}, {pt.lon.toFixed(4)})
              <button
                type="button"
                onClick={() => handleDeletePoint(i)}
                className="text-red-600 hover:text-red-800 font-bold ml-0.5"
                title={`Delete point ${i + 1}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Validation & Live Area Summary */}
      {!metrics.valid ? (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{metrics.error}</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Geospatial Farm Boundary Validated ({metrics.pointCount} points)
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-emerald-200 text-emerald-800 dark:text-emerald-300">
              Map-based estimate (not a legal land survey)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-2.5 border border-emerald-100">
              <div className="text-[11px] text-zinc-500">Acres</div>
              <div className="text-base font-bold text-emerald-800 dark:text-emerald-300">{metrics.area.acres} ac</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-2.5 border border-emerald-100">
              <div className="text-[11px] text-zinc-500">Hectares</div>
              <div className="text-base font-bold">{metrics.area.hectares} ha</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-2.5 border border-emerald-100">
              <div className="text-[11px] text-zinc-500">Guntas</div>
              <div className="text-base font-bold">{metrics.area.guntas}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-2.5 border border-emerald-100">
              <div className="text-[11px] text-zinc-500">Cents</div>
              <div className="text-base font-bold">{metrics.area.cents}</div>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-2.5 border border-emerald-100">
              <div className="text-[11px] text-zinc-500">Sq. Metres</div>
              <div className="text-base font-bold">{metrics.area.sqMeters.toLocaleString('en-IN')} m²</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Farm Name</label>
              <input
                type="text"
                value={farmName}
                onChange={(e) => onFarmNameChange(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Location Label</label>
              <input
                type="text"
                value={locationLabel}
                onChange={(e) => onLocationLabelChange(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
            </div>
            <div className="flex flex-col justify-end">
              <div className="text-[11px] text-zinc-500 mb-1">
                Centre: {metrics.centroid.lat}, {metrics.centroid.lon} · Perimeter: {metrics.perimeterMeters} m
              </div>
              <button
                type="button"
                onClick={handleSaveAndConfirm}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold"
              >
                <Save className="w-4 h-4" />
                Confirm Farm ({metrics.area.acres} acres)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Virtual Farms */}
      {savedFarms.length > 0 && (
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
            Saved Virtual Farms (Local Browser Storage):
          </p>
          <div className="flex flex-wrap gap-2">
            {savedFarms.map((f) => (
              <div
                key={f.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs"
              >
                <button
                  type="button"
                  onClick={() => handleLoadFarm(f)}
                  className="font-medium text-emerald-800 dark:text-emerald-300 hover:underline"
                >
                  {f.name} ({f.area.acres} ac)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const filtered = savedFarms.filter((item) => item.id !== f.id);
                    setSavedFarms(filtered);
                    saveFarmsToStorage(filtered);
                  }}
                  className="text-zinc-400 hover:text-red-600"
                  title="Delete saved farm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
