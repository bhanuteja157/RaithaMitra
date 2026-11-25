// frontend/src/lib/journeyApi.ts
// Authenticated client for AD-32 Unified Seed-to-Sale Journey.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleJson<T>(res: Response, fallbackMsg: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || fallbackMsg);
  }
  return res.json();
}

export interface JourneyProgress {
  completed_stages: number;
  applicable_stages: number;
  skipped_stages: number;
  progress_pct: number;
  current_stage_key: string | null;
  current_stage_title: string | null;
  days_since_sowing: number | null;
  calculation_explanation: string;
}

export interface JourneySummary {
  id: string;
  farmer_id: string;
  farm_id: string;
  crop_name: string;
  crop_variety?: string | null;
  season: string;
  cultivated_area_acres: number;
  cultivation_budget_inr: number;
  planned_sowing_date: string;
  actual_sowing_date?: string | null;
  expected_harvest_date: string;
  actual_harvest_date?: string | null;
  status: string;
  is_demonstration: boolean;
  progress: JourneyProgress;
}

export interface JourneyStageDetail {
  id: string;
  stage_key: string;
  stage_order: number;
  title: string;
  kannada?: string;
  primary_module?: string;
  route?: string;
  secondary_routes?: string[];
  completion_rule?: string;
  status: string;
  completed_at?: string | null;
  notes?: string | null;
  activities: Array<{
    id: string;
    activity_type: string;
    title: string;
    notes?: string | null;
    recorded_date: string;
    cost_inr?: number;
  }>;
  linked_records: Array<{
    id: string;
    source_module: string;
    record_id: string;
    summary_label?: string | null;
  }>;
}

export interface JourneyDetailResponse {
  journey: JourneySummary;
  farm_name: string;
  progress: JourneyProgress;
  stages: JourneyStageDetail[];
  activities: Array<{
    id: string;
    stage_key: string;
    activity_type: string;
    title: string;
    notes?: string | null;
    recorded_date: string;
    cost_inr?: number;
  }>;
  financial_overview: {
    cultivation_budget_inr: number;
    recorded_journey_activity_costs_inr: number;
    farm_ledger_summary: {
      actual_recorded_expenses_inr: number;
      committed_expenses_inr: number;
      confirmed_sales_value_inr: number;
      received_payments_inr: number;
      outstanding_payments_inr: number;
      realized_net_profit_inr: number;
      estimated_net_profit_inr: number;
      break_even_price_per_kg?: number | null;
    };
    separation_notice: string;
  };
  recommended_next_actions: Array<{
    id: string;
    title: string;
    description: string;
    route: string;
    priority: string;
    explanation?: { why?: string };
  }>;
}

export async function listJourneys(farmId: string | undefined, token: string | null): Promise<{ journeys: JourneySummary[] }> {
  const qs = farmId ? `?farm_id=${encodeURIComponent(farmId)}` : '';
  const res = await fetch(`${BASE_URL}/journeys${qs}`, { headers: authHeaders(token) });
  return handleJson(res, 'Failed to load crop journeys.');
}

export async function createJourney(payload: Record<string, unknown>, token: string | null): Promise<JourneySummary> {
  const res = await fetch(`${BASE_URL}/journeys`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to create crop journey.');
}

export async function getJourneyDetail(journeyId: string, token: string | null): Promise<JourneyDetailResponse> {
  const res = await fetch(`${BASE_URL}/journeys/${encodeURIComponent(journeyId)}`, {
    headers: authHeaders(token),
  });
  return handleJson(res, 'Failed to load journey details.');
}

export async function updateStageStatus(
  journeyId: string,
  stageKey: string,
  status: string,
  token: string | null
) {
  const res = await fetch(
    `${BASE_URL}/journeys/${encodeURIComponent(journeyId)}/stages/${encodeURIComponent(stageKey)}`,
    {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    }
  );
  return handleJson(res, 'Failed to update stage status.');
}

export async function recordJourneyActivity(
  journeyId: string,
  payload: Record<string, unknown>,
  token: string | null
) {
  const res = await fetch(`${BASE_URL}/journeys/${encodeURIComponent(journeyId)}/activities`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to record activity.');
}

export async function initDemoJourney(farmId: string, token: string | null) {
  const res = await fetch(`${BASE_URL}/journeys/demo/init?farm_id=${encodeURIComponent(farmId)}`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return handleJson<{ already_exists: boolean; journey_id: string; calculations: Record<string, unknown> }>(
    res,
    'Failed to initialize demonstration journey.'
  );
}

export async function fetchJourneyReport(journeyId: string, token: string | null) {
  const res = await fetch(`${BASE_URL}/journeys/${encodeURIComponent(journeyId)}/report`, {
    headers: authHeaders(token),
  });
  return handleJson<Record<string, unknown>>(res, 'Failed to generate journey report.');
}
