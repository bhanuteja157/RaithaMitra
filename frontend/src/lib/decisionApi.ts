// frontend/src/lib/decisionApi.ts
// Authenticated client for AD-30 Centralized Agricultural Decision Intelligence.

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

export interface DecisionExplanation {
  what: string;
  why: string;
  modules_contributed: string[];
  data_used: string;
  alternatives_considered: string[];
  assumptions: string[];
  what_could_change: string;
  unavailable_info: string;
}

export interface DecisionRecommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  action_group: string;
  route: string;
  estimated_cost_inr: number;
  estimated_benefit_inr?: number;
  feasible: boolean;
  hard_constraint_failures: string[];
  heuristic_ranking_score: number;
  dependencies: string[];
  explanation: DecisionExplanation;
}

export interface DecisionEvaluationResponse {
  run_id: string;
  timestamp: string;
  summary_text: string;
  farm_context: {
    farm_id: string;
    farm_name: string;
    crop: string;
    crop_stage: string;
    land_area_ha: number;
    available_water_m3: number;
    budget_allocated_inr: number;
    budget_remaining_inr: number;
    weather: {
      available: boolean;
      temperature_c?: number | null;
      rain_48h_mm: number;
      wind_kmh: number;
      water_demand_mm_day?: number | null;
    };
  };
  evidence: Array<{
    evidence_id: string;
    source_module: string;
    source_provider: string;
    observed_value: unknown;
    unit?: string | null;
    classification: string;
    freshness: string;
    limitations?: string | null;
  }>;
  unavailable_modules: string[];
  conflicts: Array<{
    conflict_id: string;
    title: string;
    modules: string[];
    severity: string;
    description: string;
    resolution: string;
    route: string;
  }>;
  action_plan: {
    preference_profile: string;
    weights_applied: Record<string, number>;
    scoring_note: string;
    ranked_recommendations: DecisionRecommendation[];
    grouped_action_plan: Record<string, DecisionRecommendation[]>;
    decision_graph: Array<{
      step: number;
      node: string;
      status: string;
      detail: string;
      depends_on: number[];
    }>;
  };
}

export async function evaluateDecisions(
  payload: { farm_id: string; preference_profile?: string; persist_run?: boolean },
  token: string | null
): Promise<DecisionEvaluationResponse> {
  const res = await fetch(`${BASE_URL}/decision-intelligence/evaluate`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to evaluate farm decisions.');
}

export async function updateDecisionPreference(preference_profile: string, token: string | null) {
  const res = await fetch(`${BASE_URL}/decision-intelligence/preferences`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ preference_profile }),
  });
  return handleJson(res, 'Failed to update preference profile.');
}

export async function updateRecommendationStatus(recId: string, status: string, token: string | null) {
  const res = await fetch(`${BASE_URL}/decision-intelligence/recommendations/${encodeURIComponent(recId)}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  return handleJson(res, 'Failed to update recommendation status.');
}

export async function simulateScenario(payload: Record<string, unknown>, token: string | null) {
  const res = await fetch(`${BASE_URL}/decision-intelligence/simulate`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson<Record<string, unknown>>(res, 'Scenario simulation failed.');
}

export async function fetchDecisionHistory(farmId: string | undefined, token: string | null) {
  const qs = farmId ? `?farm_id=${encodeURIComponent(farmId)}` : '';
  const res = await fetch(`${BASE_URL}/decision-intelligence/history${qs}`, {
    headers: authHeaders(token),
  });
  return handleJson<{
    runs: Array<Record<string, unknown>>;
    feedback: Array<Record<string, unknown>>;
  }>(res, 'Failed to load decision history.');
}

export async function submitDecisionFeedback(payload: Record<string, unknown>, token: string | null) {
  const res = await fetch(`${BASE_URL}/decision-intelligence/feedback`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to save feedback.');
}
