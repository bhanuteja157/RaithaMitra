// frontend/src/lib/cropDiagnosticsApi.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export interface CropPredictionCandidate {
  class_index: number;
  raw_label: string;
  crop: string;
  disease: string;
  is_healthy: boolean;
  score: number;
  model_id: string;
}

export interface CropDiagnosticResult {
  request_id: string;
  history_id?: string | null;
  farm_id?: string | null;
  crop?: string | null;
  requested_crop?: string;
  crop_mismatch?: boolean;
  is_healthy?: boolean | null;
  model_available: boolean;
  model_name?: string | null;
  model_version?: string | null;
  inference_time_ms?: number;
  load_time_ms?: number;
  supported_crops: string[];
  supported_classes: string[];
  image_quality: {
    decodable: boolean;
    width?: number;
    height?: number;
    brightness_mean?: number;
    sharpness_score?: number;
    quality_rating?: string;
    suitable_for_diagnosis: boolean;
    warnings: string[];
    capture_tips?: string[];
  };
  diagnosis_status: string;
  predicted_disease?: string | null;
  confidence?: number | null;
  top_predictions: CropPredictionCandidate[];
  severity?: { available: boolean; reason?: string; estimated_area_pct?: number; category?: string } | null;
  explainability?: { available: boolean; reason?: string } | null;
  uncertainty?: string | null;
  knowledge?: {
    disease_name: string;
    scientific_pathogen?: string | null;
    crop: string;
    category: string;
    symptoms: string;
    causes: string;
    favorable_conditions: string;
    transmission: string;
    immediate_actions: string[];
    cultural_practices: string[];
    biological_options: string[];
    preventive_measures: string[];
    when_to_consult_expert: string;
    sources: Array<{ institution: string; title: string; verified_on: string }>;
  } | null;
  recommended_actions: string[];
  preventive_measures: string[];
  weather_risk?: {
    available: boolean;
    temperature_c?: number;
    humidity_pct?: number;
    rainfall_mm?: number;
    risk_level?: string;
    favorable_for_disease?: boolean;
    summary?: string;
    disclaimer?: string;
  } | null;
  evidence_sources: Array<{ institution: string; title: string; verified_on: string }>;
  limitations: string[];
  timestamp: string;
}

export interface MultiImageDiagnosticResponse {
  session_id: string;
  image_count: number;
  predictions_agree: boolean;
  disagreement_warning?: string | null;
  primary_result: CropDiagnosticResult;
  individual_results: CropDiagnosticResult[];
}

export interface DiagnosticHistoryItem {
  id: string;
  farm_id?: string | null;
  requested_crop?: string | null;
  predicted_crop?: string | null;
  predicted_disease?: string | null;
  diagnosis_status: string;
  confidence?: number | null;
  model_name?: string | null;
  model_version?: string | null;
  image_quality?: string | null;
  recommended_actions: string[];
  created_at: string;
}

export async function fetchCropDiagnosticsStatus(): Promise<{
  model_available: boolean;
  supported_crops: string[];
  model_name?: string;
  model_version?: string;
  sha256?: string;
} | null> {
  try {
    const res = await fetch(`${BASE_URL}/crop-diagnostics/status`);
    if (res.ok) return await res.json();
  } catch {
    // offline or backend unreachable
  }
  return null;
}

export async function analyzeCropLeaves(params: {
  files: File[];
  crop: string;
  farmId?: string;
  token?: string | null;
  temperatureC?: number;
  humidityPct?: number;
  rainfallMm?: number;
}): Promise<MultiImageDiagnosticResponse> {
  const { files, crop, farmId, token, temperatureC, humidityPct, rainfallMm } = params;
  const form = new FormData();
  form.append('crop', crop);
  if (farmId) form.append('farm_id', farmId);
  if (temperatureC !== undefined) form.append('temperature_c', String(temperatureC));
  if (humidityPct !== undefined) form.append('humidity_pct', String(humidityPct));
  if (rainfallMm !== undefined) form.append('rainfall_mm', String(rainfallMm));

  if (files.length > 1 && token) {
    files.slice(0, 3).forEach((f) => form.append('files', f));
    const res = await fetch(`${BASE_URL}/crop-diagnostics/analyze-multi`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (res.ok) return await res.json();
  }

  // Single image (authenticated if token present, else public)
  form.append('file', files[0]);
  const endpoint = token
    ? `${BASE_URL}/crop-diagnostics/analyze-authenticated`
    : `${BASE_URL}/crop-diagnostics/analyze`;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(endpoint, { method: 'POST', headers, body: form });
  if (!res.ok) {
    throw new Error(`Diagnostics API returned ${res.status}`);
  }
  const single: CropDiagnosticResult = await res.json();
  return {
    session_id: single.request_id,
    image_count: 1,
    predictions_agree: true,
    disagreement_warning: null,
    primary_result: single,
    individual_results: [single],
  };
}

export async function fetchDiagnosticHistory(token: string): Promise<DiagnosticHistoryItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/crop-diagnostics/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return data.items || [];
    }
  } catch {
    // ignore
  }
  return [];
}

export async function submitCommunityDiseaseReport(
  token: string,
  payload: {
    crop: string;
    suspected_disease: string;
    region: string;
    confidence?: number | null;
    user_confirmed: boolean;
  }
) {
  const res = await fetch(`${BASE_URL}/crop-diagnostics/surveillance/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Could not submit community report');
  }
  return await res.json();
}

export async function fetchSurveillanceSummary(): Promise<
  Array<{
    crop: string;
    suspected_disease: string;
    region: string;
    verification_status: string;
    observation_count: number;
    latest_report_date: string;
  }>
> {
  try {
    const res = await fetch(`${BASE_URL}/crop-diagnostics/surveillance/summary`);
    if (res.ok) {
      const data = await res.json();
      return data.reports || [];
    }
  } catch {
    // ignore
  }
  return [];
}
