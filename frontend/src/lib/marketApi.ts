// frontend/src/lib/marketApi.ts
// Authenticated client for AD-29 Live Agricultural Market Intelligence & Statistical Price Forecasting.

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

export interface MarketStatusResponse {
  official_api_configured: boolean;
  provider_name: string;
  supported_commodities: string[];
  karnataka_priority_districts: string[];
  cached_observations_count: number;
  message: string;
}

export interface MarketObservation {
  id: string;
  commodity: string;
  variety: string;
  grade: string;
  state: string;
  district: string;
  market: string;
  observation_date: string;
  min_price_per_quintal: number;
  max_price_per_quintal: number;
  modal_price_per_quintal: number;
  modal_price_per_kg: number;
  source_type: string;
  source_name: string;
  provenance_label: string;
  retrieved_at: string;
}

export interface MarketComparisonResponse {
  commodity: string;
  available_quantity_kg: number;
  recommended_market: string;
  recommended_net_return_inr: number;
  net_advantage_over_next_inr: number;
  reasoning: string;
  ranked_markets: Array<{
    market_name: string;
    district?: string | null;
    selling_price_per_kg: number;
    distance_km: number;
    saleable_quantity_kg: number;
    gross_revenue_inr: number;
    transport_cost_inr: number;
    total_selling_costs_inr: number;
    net_selling_return_inr: number;
    effective_net_per_kg: number;
    price_source_label: string;
  }>;
}

export interface HistoryAndForecastResponse {
  commodity: string;
  history: {
    observation_count: number;
    date_range?: { start: string; end: string } | null;
    statistics?: {
      latest_modal_per_kg: number;
      price_change_per_kg: number;
      pct_change: number;
      highest_modal_per_kg: number;
      lowest_modal_per_kg: number;
      mean_modal_per_kg: number;
      median_modal_per_kg: number;
      volatility_std_per_kg: number;
    } | null;
    series: Array<{
      date: string;
      modal_price_per_kg: number;
      min_price_per_kg: number;
      max_price_per_kg: number;
      market: string;
    }>;
  };
  forecast: {
    available: boolean;
    horizon_days: number;
    selected_method?: string;
    training_observation_count: number;
    reason?: string;
    validation_metrics?: {
      mae_per_kg: number;
      rmse_per_kg: number;
    };
    forecast: Array<{
      date: string;
      predicted_modal_per_kg: number;
      lower_bound_per_kg: number;
      upper_bound_per_kg: number;
    }>;
    limitations?: string[];
  };
}

export async function fetchMarketStatus(): Promise<MarketStatusResponse> {
  const res = await fetch(`${BASE_URL}/market-intelligence/status`);
  return handleJson(res, 'Failed to fetch market provider status.');
}

export async function fetchMarketObservations(params?: {
  commodity?: string;
  state?: string;
  district?: string;
}): Promise<{ count: number; observations: MarketObservation[] }> {
  const qs = new URLSearchParams();
  if (params?.commodity) qs.set('commodity', params.commodity);
  if (params?.state) qs.set('state', params.state);
  if (params?.district) qs.set('district', params.district);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetch(`${BASE_URL}/market-intelligence/observations${query}`);
  return handleJson(res, 'Failed to fetch market observations.');
}

export async function fetchLiveAgmarknet(payload: Record<string, unknown>, token: string | null) {
  const res = await fetch(`${BASE_URL}/market-intelligence/fetch-live`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson<Record<string, unknown>>(res, 'Live AGMARKNET fetch failed.');
}

export async function addManualMarketPrice(payload: Record<string, unknown>, token: string | null) {
  const res = await fetch(`${BASE_URL}/market-intelligence/manual`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to save manual market price.');
}

export async function importMarketCsv(payload: { filename: string; csv_text: string }, token: string | null) {
  const res = await fetch(`${BASE_URL}/market-intelligence/import-csv`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson<{ inserted: number; skipped: number; total_rows: number }>(res, 'CSV import failed.');
}

export async function fetchHistoryAndForecast(commodity: string, horizonDays: number): Promise<HistoryAndForecastResponse> {
  const qs = new URLSearchParams({ commodity, horizon_days: String(horizonDays) });
  const res = await fetch(`${BASE_URL}/market-intelligence/history?${qs.toString()}`);
  return handleJson(res, 'Failed to fetch market history and forecast.');
}

export async function compareMarkets(payload: Record<string, unknown>, token: string | null): Promise<MarketComparisonResponse> {
  const res = await fetch(`${BASE_URL}/market-intelligence/compare-markets`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Market comparison failed.');
}

export async function compareBuyerOffer(payload: Record<string, unknown>, token: string | null) {
  const res = await fetch(`${BASE_URL}/market-intelligence/compare-offer`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson<Record<string, unknown>>(res, 'Offer comparison failed.');
}

export async function fetchMarketAlerts(token: string | null) {
  const res = await fetch(`${BASE_URL}/market-intelligence/alerts`, { headers: authHeaders(token) });
  return handleJson<{
    preferences: Array<Record<string, unknown>>;
    alerts: Array<Record<string, unknown>>;
    delivery_mode: string;
  }>(res, 'Failed to load alerts.');
}

export async function createMarketAlertPreference(payload: Record<string, unknown>, token: string | null) {
  const res = await fetch(`${BASE_URL}/market-intelligence/alerts/preferences`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to save alert preference.');
}
