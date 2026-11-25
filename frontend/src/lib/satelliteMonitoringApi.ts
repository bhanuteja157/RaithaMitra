// frontend/src/lib/satelliteMonitoringApi.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export interface SatelliteObservationFrame {
  scene_id: string;
  provider: string;
  acquisition_date: string;
  resolution_m: number;
  scene_cloud_cover_pct: number;
  parcel_cloud_cover_pct: number;
  valid_pixel_coverage_pct: number;
  total_parcel_pixels: number;
  valid_parcel_pixels: number;
  usable: boolean;
  cached?: boolean;
  retrieved_at?: string;
  limitation_note?: string | null;
  days_after_sowing?: number | null;
  modeled_expected_ndvi?: number | null;
  vegetation_trend?: string;
  indices: {
    ndvi_mean: number | null;
    ndvi_min: number | null;
    ndvi_max: number | null;
    ndmi_mean: number | null;
    evi_mean: number | null;
  };
  layers?: {
    true_color_png: string;
    false_color_png: string;
    ndvi_png: string;
  };
}

export interface SatelliteTimelapseResponse {
  available: boolean;
  data_quality: 'OBSERVED' | 'UNAVAILABLE';
  error?: string;
  polygon_hash?: string;
  total_scenes_found: number;
  usable_scenes_count: number;
  latest_usable?: SatelliteObservationFrame | null;
  latest_acquisition_date?: string | null;
  last_sync_at?: string;
  next_scheduled_check_at?: string;
  data_freshness_days?: number | null;
  comparison_alert?: string | null;
  insufficient_history_note?: string | null;
  monitoring_status?: string;
  provider_status?: {
    cdse_oauth_configured: boolean;
    open_sentinel2_stac_active: boolean;
    collection: string;
    revisit_note: string;
  };
  observations: SatelliteObservationFrame[];
}

export interface MaizeVarietyInfo {
  id: string;
  name: string;
  duration_days: number;
  recommended_row_spacing_cm: number;
  recommended_plant_spacing_cm: number;
  thousand_grain_weight_g: number;
  default_germination_pct: number;
  baseline_seed_rate_kg_acre: number;
  expected_yield_kg_per_acre_min: number;
  expected_yield_kg_per_acre_max: number;
  gdd_maturity: number;
  source: string;
}

export interface MaizeAgronomyResult {
  data_quality: string;
  variety: MaizeVarietyInfo;
  area_acres: number;
  spacing_cm: { row: number; plant: number };
  germination_pct: number;
  theoretical_plant_population: number;
  estimated_established_population: number;
  estimated_seeds_per_kg: number;
  required_seed_kg: number;
  estimated_seed_count: number;
  seed_formula: string;
  duration_days: number;
  sowing_date: string;
  expected_harvest_date: string;
  expected_yield_kg_range: [number, number];
  daily_gdd_at_temp: number;
  gdd_to_maturity: number;
  biological_stages: Array<{
    stage_number: number;
    name: string;
    code: string;
    start_day: number;
    end_day: number;
    description: string;
  }>;
}

export async function fetchSatelliteTimelapse(params: {
  coordinates: [number, number][];
  startDate: string;
  endDate: string;
  farmId?: string;
  sowingDate?: string;
  totalDays?: number;
  maxScenes?: number;
}): Promise<SatelliteTimelapseResponse> {
  const res = await fetch(`${BASE_URL}/satellite-monitoring/timelapse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coordinates: params.coordinates,
      start_date: params.startDate,
      end_date: params.endDate,
      farm_id: params.farmId,
      sowing_date: params.sowingDate,
      total_days: params.totalDays ?? 110,
      max_scenes: params.maxScenes ?? 6,
    }),
  });
  if (!res.ok) throw new Error(`Satellite timelapse HTTP ${res.status}`);
  return await res.json();
}

export async function syncMonitoredParcel(params: {
  farmId?: string;
  farmName: string;
  cropName: string;
  sowingDate: string;
  areaAcres: number;
  coordinates: [number, number][];
  totalDays?: number;
}): Promise<SatelliteTimelapseResponse> {
  const res = await fetch(`${BASE_URL}/satellite-monitoring/parcels/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      farm_id: params.farmId,
      farm_name: params.farmName,
      crop_name: params.cropName,
      sowing_date: params.sowingDate,
      area_acres: params.areaAcres,
      coordinates: params.coordinates,
      total_days: params.totalDays ?? 110,
    }),
  });
  if (!res.ok) throw new Error(`Parcel sync HTTP ${res.status}`);
  return await res.json();
}

export async function fetchMaizeVarieties(): Promise<MaizeVarietyInfo[]> {
  try {
    const res = await fetch(`${BASE_URL}/satellite-monitoring/maize-varieties`);
    if (res.ok) {
      const d = await res.json();
      return d.varieties || [];
    }
  } catch {
    // offline fallback handled in caller
  }
  return [];
}

export async function fetchMaizeAgronomy(params: {
  areaAcres: number;
  varietyId: string;
  sowingDate?: string;
  rowSpacingCm?: number;
  plantSpacingCm?: number;
  germinationPct?: number;
  customSeedRateKgPerAcre?: number;
  meanDailyTempC?: number;
}): Promise<MaizeAgronomyResult | null> {
  try {
    const res = await fetch(`${BASE_URL}/satellite-monitoring/maize-agronomy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area_acres: params.areaAcres,
        variety_id: params.varietyId,
        sowing_date: params.sowingDate,
        row_spacing_cm: params.rowSpacingCm,
        plant_spacing_cm: params.plantSpacingCm,
        germination_pct: params.germinationPct,
        custom_seed_rate_kg_per_acre: params.customSeedRateKgPerAcre,
        mean_daily_temp_c: params.meanDailyTempC ?? 25.5,
      }),
    });
    if (res.ok) return await res.json();
  } catch {
    // ignore
  }
  return null;
}
