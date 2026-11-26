// frontend/src/lib/diseaseSurveillanceApi.ts
/**
 * Typed API Client for AD-40C Community Crop Disease Surveillance & Predictive Outbreak Intelligence.
 * Uses authenticated Bearer session tokens from FarmContext / localStorage.
 * Never fabricates regional disease data or alerts when backend endpoints are unavailable.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export type VerificationStatus = 'farmer_reported' | 'ai_suspected' | 'expert_confirmed' | 'dismissed';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical' | 'Insufficient evidence';
export type AlertStatus = 'unread' | 'read' | 'acknowledged' | 'dismissed';

export interface SurveillanceReport {
  id: string;
  crop: string;
  disease_name: string;
  observation_date: string;
  affected_area_ha: number;
  symptoms: string[];
  notes?: string | null;
  diagnostic_confidence?: number | null;
  latitude: number;
  longitude: number;
  is_coordinate_anonymized: boolean;
  approximate_region: string;
  district: string;
  state: string;
  image_reference?: string | null;
  verification_status: VerificationStatus;
  data_source: string;
  anonymous_community_consent: boolean;
  is_demonstration: boolean;
  data_quality: string;
  is_own_report: boolean;
  farm_id?: string | null;
  reporter_label: string;
  distance_km?: number | null;
  created_at: string;
}

export interface OutbreakCluster {
  cluster_id: string;
  crop: string;
  disease_name: string;
  classification: 'suspected_cluster' | 'confirmed_outbreak';
  independent_farms_count: number;
  total_reports_count: number;
  expert_confirmed_count: number;
  ai_suspected_count: number;
  centroid_latitude: number;
  centroid_longitude: number;
  cluster_radius_km: number;
  districts: string[];
  approximate_region: string;
  recent_7d_reports: number;
  prior_7d_reports: number;
  activity_trend_pct: number;
  transmission_mode: string;
  is_demonstration: boolean;
}

export interface HeatmapCell {
  latitude: number;
  longitude: number;
  intensity: number;
  report_count: number;
  confirmed_count: number;
  crops: string[];
  diseases: string[];
  district: string;
}

export interface DistrictSummary {
  district: string;
  report_count: number;
  independent_farms_count: number;
  expert_confirmed_count: number;
  ai_suspected_count: number;
  farmer_reported_count: number;
  crops: string[];
  leading_disease: string | null;
}

export interface RiskZone {
  zone_id: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  severity: 'elevated' | 'critical';
  label: string;
  is_demonstration: boolean;
}

export interface SurveillanceMapResponse {
  mode: 'live' | 'demonstration';
  is_demonstration: boolean;
  center: { latitude: number; longitude: number; label: string };
  monitoring_radius_km: number;
  markers: SurveillanceReport[];
  heatmap_cells: HeatmapCell[];
  outbreak_clusters: OutbreakCluster[];
  risk_zones: RiskZone[];
  district_summaries: DistrictSummary[];
  daily_trend_14d: { date: string; reports: number }[];
  privacy_notice: string;
}

export interface DiseaseBreakdownItem {
  disease_name: string;
  matched_profile: string;
  known_profile: boolean;
  transmission_mode: string;
  wind_dispersal_considered: boolean;
  downwind_alignment_score?: number | null;
  heuristic_risk_index: number;
  risk_level: RiskLevel;
  report_count: number;
  independent_farms_count: number;
  nearest_distance_km: number;
  most_recent_days: number;
  weather_suitability_score?: number | null;
  stage_multiplier: number;
  preventive_actions: string[];
  scientific_references: string[];
}

export interface FarmRiskResponse {
  farm: {
    id: string;
    farm_name: string;
    district?: string;
    state?: string;
    primary_crop: string;
    crop_stage?: string;
  };
  mode: 'live' | 'demonstration';
  is_demonstration: boolean;
  alerts_synced_count: number;
  risk_assessment: {
    crop: string;
    crop_stage: string;
    monitoring_radius_km: number;
    risk_level: RiskLevel;
    heuristic_risk_index: number | null;
    primary_threat_disease: string | null;
    transmission_mode: string;
    wind_dispersal_considered: boolean;
    nearby_report_count: number;
    independent_farms_count: number;
    nearest_distance_km: number | null;
    most_recent_days: number | null;
    weather_summary: {
      weather_available: boolean;
      weather_score: number | null;
      temperature_c: number | null;
      humidity_pct: number | null;
      rainfall_mm: number | null;
      wind_speed_kmh: number | null;
      wind_direction_deg: number | null;
      weather_note: string;
    };
    disease_breakdown: DiseaseBreakdownItem[];
    contributing_factors: string[];
    limitations: string[];
    disclaimer: string;
  };
}

export interface DiseaseAlertItem {
  id: string;
  farm_id: string;
  disease_name: string;
  crop: string;
  approximate_region: string;
  risk_level: RiskLevel;
  observation_recency_days: number;
  reason: string;
  preventive_actions: string[];
  scientific_references: string[];
  followup_inspection: string;
  status: AlertStatus;
  is_demonstration: boolean;
  delivery_channel: string;
  delivery_note: string;
  updated_at: string;
}

export interface GuidanceProfile {
  disease_id: string;
  disease_name: string;
  crop: string;
  pathogen_type: string;
  transmission_mode: string;
  wind_dispersal_relevant: boolean;
  max_effective_spread_km: number;
  typical_symptoms: string[];
  preventive_actions: string[];
  scientific_references: string[];
}

function getAuthHeaders(tokenOverride?: string | null): Record<string, string> {
  const token =
    tokenOverride || (typeof window !== 'undefined' ? localStorage.getItem('rm_token') : null);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(token),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    throw new Error(parsed?.detail || `Surveillance request failed (${res.status})`);
  }
  return parsed as T;
}

export const diseaseSurveillanceApi = {
  getMapIntelligence(
    params: {
      farm_id?: string;
      crop?: string;
      disease?: string;
      date_from?: string;
      date_to?: string;
      radius_km?: number;
      demo_mode?: boolean;
    },
    token?: string | null
  ): Promise<SurveillanceMapResponse> {
    const q = new URLSearchParams();
    if (params.farm_id) q.set('farm_id', params.farm_id);
    if (params.crop && params.crop !== 'All') q.set('crop', params.crop);
    if (params.disease && params.disease !== 'All') q.set('disease', params.disease);
    if (params.date_from) q.set('date_from', params.date_from);
    if (params.date_to) q.set('date_to', params.date_to);
    if (params.radius_km) q.set('radius_km', String(params.radius_km));
    if (params.demo_mode) q.set('demo_mode', 'true');
    return apiRequest(`/surveillance/map?${q.toString()}`, { method: 'GET' }, token);
  },

  getReports(
    params: {
      farm_id?: string;
      crop?: string;
      disease?: string;
      date_from?: string;
      date_to?: string;
      radius_km?: number;
      mine_only?: boolean;
      demo_mode?: boolean;
    },
    token?: string | null
  ): Promise<{ total_reports: number; reports: SurveillanceReport[]; mode: string }> {
    const q = new URLSearchParams();
    if (params.farm_id) q.set('farm_id', params.farm_id);
    if (params.crop && params.crop !== 'All') q.set('crop', params.crop);
    if (params.disease && params.disease !== 'All') q.set('disease', params.disease);
    if (params.date_from) q.set('date_from', params.date_from);
    if (params.date_to) q.set('date_to', params.date_to);
    if (params.radius_km) q.set('radius_km', String(params.radius_km));
    if (params.mine_only) q.set('mine_only', 'true');
    if (params.demo_mode) q.set('demo_mode', 'true');
    return apiRequest(`/surveillance/reports?${q.toString()}`, { method: 'GET' }, token);
  },

  createReport(
    payload: {
      farm_id: string;
      crop: string;
      disease_name: string;
      observation_date?: string;
      affected_area_ha: number;
      symptoms: string[];
      notes?: string;
      diagnostic_confidence?: number;
      image_reference?: string;
      verification_status?: VerificationStatus;
      data_source?: 'manual_farmer_report' | 'crop_diagnostics_ai';
      anonymous_community_consent: boolean;
    },
    token?: string | null
  ): Promise<SurveillanceReport> {
    return apiRequest(
      '/surveillance/reports',
      { method: 'POST', body: JSON.stringify(payload) },
      token
    );
  },

  getFarmRisk(
    params: {
      farm_id?: string;
      radius_km?: number;
      crop?: string;
      demo_mode?: boolean;
      sync_alerts?: boolean;
    },
    token?: string | null
  ): Promise<FarmRiskResponse> {
    const q = new URLSearchParams();
    if (params.farm_id) q.set('farm_id', params.farm_id);
    if (params.radius_km) q.set('radius_km', String(params.radius_km));
    if (params.crop) q.set('crop', params.crop);
    if (params.demo_mode) q.set('demo_mode', 'true');
    if (params.sync_alerts !== undefined) q.set('sync_alerts', String(params.sync_alerts));
    return apiRequest(`/surveillance/risk?${q.toString()}`, { method: 'GET' }, token);
  },

  getAlerts(
    params: { demo_mode?: boolean; include_dismissed?: boolean },
    token?: string | null
  ): Promise<{ unread_count: number; alerts: DiseaseAlertItem[]; mode: string }> {
    const q = new URLSearchParams();
    if (params.demo_mode) q.set('demo_mode', 'true');
    if (params.include_dismissed) q.set('include_dismissed', 'true');
    return apiRequest(`/surveillance/alerts?${q.toString()}`, { method: 'GET' }, token);
  },

  updateAlertStatus(
    alertId: string,
    status: AlertStatus,
    token?: string | null
  ): Promise<DiseaseAlertItem> {
    return apiRequest(
      `/surveillance/alerts/${encodeURIComponent(alertId)}`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      token
    );
  },

  getGuidance(
    crop?: string,
    token?: string | null
  ): Promise<{ supported_crops: string[]; guidance: GuidanceProfile[]; safety_note: string }> {
    const q = new URLSearchParams();
    if (crop && crop !== 'All') q.set('crop', crop);
    return apiRequest(`/surveillance/guidance?${q.toString()}`, { method: 'GET' }, token);
  },
};
