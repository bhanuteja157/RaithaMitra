// frontend/src/lib/satelliteApi.ts
// Authenticated client for AD-25 Satellite & Geospatial Agricultural Intelligence.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export interface SatelliteProviderInfo {
  id: string;
  name: string;
  configured: boolean;
  live_capabilities: string[];
  note: string;
}

export interface SatelliteProvidersResponse {
  providers: SatelliteProviderInfo[];
  sentinel_hub_configured: boolean;
  stac_discovery_enabled: boolean;
  timestamp: string;
}

export interface SatelliteSceneMeta {
  scene_id: string;
  acquisition_date: string;
  cloud_cover_pct?: number | null;
  platform?: string | null;
  mgrs_tile?: string | null;
  sun_elevation?: number | null;
  thumbnail_url?: string | null;
  band_assets?: Record<string, string>;
}

export interface SatelliteIndices {
  ndvi: number | null;
  ndmi: number | null;
  ndwi: number | null;
  evi: number | null;
  savi: number | null;
  ndre: number | null;
}

export interface SatelliteObservationResponse {
  status: string;
  source_mode: string;
  is_live: boolean;
  is_demo: boolean;
  cache_fallback: boolean;
  fallback_reason?: string;
  provider: string;
  provider_note: string;
  farm_id?: string | null;
  farm_name?: string | null;
  geometry: {
    polygon: { type: 'Polygon'; coordinates: number[][][] };
    is_user_polygon: boolean;
    area_ha: number;
    centroid: { latitude: number; longitude: number };
    bbox: number[];
    polygon_hash: string;
    resolution_warning?: string | null;
  };
  acquisition_date?: string | null;
  cloud_cover_pct?: number | null;
  scene_id?: string | null;
  thumbnail_url?: string | null;
  band_statistics_available: boolean;
  bands: Record<string, number | null>;
  indices: SatelliteIndices;
  distribution?: Record<string, number> | null;
  scenes: SatelliteSceneMeta[];
  agronomic_fusion: {
    indices_available: boolean;
    canopy_status: string;
    canopy_health_summary: string;
    moisture_status: string;
    irrigation_guidance: string;
    weather_fusion?: {
      et0_mm_day: number;
      crop_water_demand_mm_day: number;
      estimated_root_zone_moisture_pct: number;
      rain_48h_mm: number;
      temperature_c?: number | null;
    };
    crop_doctor_hint?: {
      recommended: boolean;
      reason: string;
      action_label: string;
      route: string;
    } | null;
    decision_engine_summary?: {
      overall_risk?: string;
      top_recommendation?: string | null;
      recommendation_count?: number;
    } | null;
  };
}

export interface SatelliteHistoryEntry {
  id: string;
  acquisition_date: string;
  provider: string;
  source_mode: string;
  cloud_cover_pct?: number | null;
  scene_id?: string | null;
  thumbnail_url?: string | null;
  area_ha?: number | null;
  ndvi?: number | null;
  ndmi?: number | null;
  ndwi?: number | null;
  evi?: number | null;
  savi?: number | null;
  ndre?: number | null;
  cached_at?: string | null;
}

export interface SatelliteChangeDelta {
  previous: number;
  current: number;
  abs_change: number;
  pct_change: number | null;
  direction: 'increasing' | 'decreasing' | 'stable';
}

export interface SatelliteHistoryResponse {
  farm_id: string;
  farm_name?: string | null;
  observation_count: number;
  observations: SatelliteHistoryEntry[];
  change_detection?: {
    previous_date: string;
    current_date: string;
    ndvi?: SatelliteChangeDelta | null;
    ndmi?: SatelliteChangeDelta | null;
    summary: string;
  } | null;
}

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function fetchSatelliteProviders(token: string | null): Promise<SatelliteProvidersResponse> {
  const res = await fetch(`${BASE_URL}/satellite/providers`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Unable to fetch satellite provider status.');
  return res.json();
}

export async function analyzeSatelliteObservation(
  payload: {
    farm_id?: string | null;
    latitude?: number;
    longitude?: number;
    boundary_geojson?: Record<string, unknown> | null;
    nir_band?: number | null;
    red_band?: number | null;
    swir_band?: number | null;
    blue_band?: number | null;
    green_band?: number | null;
    red_edge_band?: number | null;
    use_demo_observation?: boolean;
    offline_only?: boolean;
    max_cloud_pct?: number;
    lookback_days?: number;
  },
  token: string | null
): Promise<SatelliteObservationResponse> {
  const res = await fetch(`${BASE_URL}/satellite/observations`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Satellite observation request failed.');
  }
  return res.json();
}

export async function fetchSatelliteHistory(
  farmId: string,
  token: string | null,
  polygonHash?: string
): Promise<SatelliteHistoryResponse> {
  const params = new URLSearchParams();
  if (polygonHash) params.set('polygon_hash', polygonHash);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}/satellite/history/${encodeURIComponent(farmId)}${qs}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Unable to fetch satellite history.');
  }
  return res.json();
}
