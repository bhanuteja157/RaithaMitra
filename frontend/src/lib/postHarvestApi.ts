// frontend/src/lib/postHarvestApi.ts
// Authenticated client for AD-27 Post-Harvest Intelligence, Cold Storage & Economic Optimization.

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

export interface PostHarvestSummary {
  farm_id?: string | null;
  harvest_record_count: number;
  total_estimated_yield_kg: number;
  total_actual_harvested_kg: number;
  lot_count: number;
  total_available_kg: number;
  total_reserved_kg: number;
  total_sold_kg: number;
  total_damaged_kg: number;
  total_discarded_kg: number;
  storage_record_count: number;
  total_estimated_storage_cost_inr: number;
}

export interface CropStorageProfile {
  crop: string;
  category: string;
  requires_refrigeration: boolean;
  recommended_temp_c: { min: number; max: number; note: string };
  recommended_rh_pct: { min: number; max: number };
  ambient_shelf_life_days: { min: number; max: number };
  optimal_shelf_life_days: { min: number; max: number };
  suitable_storage_methods: string[];
  chilling_injury_sensitivity: string;
  moisture_sensitivity: string;
  ventilation_requirements: string;
  ethylene_sensitivity: string;
  packaging: string;
  maturity_guidance: string;
  references: string[];
}

export interface HarvestRecord {
  id: string;
  farm_id: string;
  crop: string;
  variety?: string | null;
  cultivated_area_ha: number;
  expected_harvest_date: string;
  estimated_yield_kg: number;
  actual_harvested_kg?: number | null;
  crop_maturity: string;
  harvest_quality: string;
  damaged_quantity_kg: number;
  is_simulated: boolean;
  variance_kg?: number | null;
  weather_harvest_advice?: {
    source: string;
    window_status: string;
    guidance: string;
    rain_48h_mm?: number;
    temperature_c?: number;
  };
}

export interface InventoryLot {
  id: string;
  farm_id: string;
  crop: string;
  variety?: string | null;
  harvest_date: string;
  initial_quantity_kg: number;
  available_quantity_kg: number;
  reserved_quantity_kg: number;
  sold_quantity_kg: number;
  transported_quantity_kg: number;
  damaged_quantity_kg: number;
  discarded_quantity_kg: number;
  quality_grade: string;
  storage_method: string;
  storage_location: string;
  recorded_temp_c?: number | null;
  recorded_humidity_pct?: number | null;
  packaging_type: string;
  status: string;
  linked_listing_id?: string | null;
}

export interface EconomicComparisonResponse {
  commodity: string;
  available_quantity_kg: number;
  storage_duration_days: number;
  immediate_sale: {
    price_per_kg: number;
    gross_revenue_inr: number;
    expenses_inr: number;
    net_return_inr: number;
  };
  delayed_sale: {
    expected_future_price_per_kg: number;
    estimated_loss_pct: number;
    future_saleable_quantity_kg: number;
    gross_revenue_inr: number;
    total_storage_and_selling_costs_inr: number;
    net_return_inr: number;
  };
  comparison: {
    additional_return_from_storage_inr: number;
    break_even_future_price_per_kg: number | null;
    recommendation: string;
    summary: string;
  };
  scenarios: Array<{
    scenario: string;
    future_price_per_kg: number;
    loss_pct: number;
    saleable_quantity_kg: number;
    future_gross_revenue_inr: number;
    future_net_return_inr: number;
    net_difference_vs_sell_now_inr: number;
  }>;
  monte_carlo?: {
    is_stochastic_estimate: boolean;
    num_trials: number;
    prob_store_outperforms_sell_now_pct: number;
    p10_net_difference_inr: number;
    p50_net_difference_inr: number;
    p90_net_difference_inr: number;
    assumptions: string[];
  } | null;
  disclaimer: string;
}

export async function fetchPostHarvestSummary(farmId: string | undefined, token: string | null): Promise<PostHarvestSummary> {
  const qs = farmId ? `?farm_id=${encodeURIComponent(farmId)}` : '';
  const res = await fetch(`${BASE_URL}/post-harvest/summary${qs}`, { headers: authHeaders(token) });
  return handleJson(res, 'Failed to load post-harvest summary.');
}

export async function fetchStorageKnowledge(): Promise<{ crops: CropStorageProfile[] }> {
  const res = await fetch(`${BASE_URL}/post-harvest/knowledge`);
  return handleJson(res, 'Failed to load storage knowledge base.');
}

export async function fetchHarvests(farmId: string | undefined, token: string | null): Promise<{ harvests: HarvestRecord[] }> {
  const qs = farmId ? `?farm_id=${encodeURIComponent(farmId)}` : '';
  const res = await fetch(`${BASE_URL}/post-harvest/harvests${qs}`, { headers: authHeaders(token) });
  return handleJson(res, 'Failed to load harvest records.');
}

export async function createHarvestRecord(payload: Record<string, unknown>, token: string | null): Promise<HarvestRecord> {
  const res = await fetch(`${BASE_URL}/post-harvest/harvests`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to create harvest record.');
}

export async function fetchInventoryLots(farmId: string | undefined, token: string | null): Promise<{ lots: InventoryLot[] }> {
  const qs = farmId ? `?farm_id=${encodeURIComponent(farmId)}` : '';
  const res = await fetch(`${BASE_URL}/post-harvest/inventory${qs}`, { headers: authHeaders(token) });
  return handleJson(res, 'Failed to load inventory lots.');
}

export async function createInventoryLot(payload: Record<string, unknown>, token: string | null): Promise<InventoryLot> {
  const res = await fetch(`${BASE_URL}/post-harvest/inventory`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to create inventory lot.');
}

export async function recordLotEvent(
  lotId: string,
  payload: { event_type: string; quantity_kg: number; notes?: string; idempotency_key?: string },
  token: string | null
) {
  const res = await fetch(`${BASE_URL}/post-harvest/inventory/${encodeURIComponent(lotId)}/events`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to record inventory event.');
}

export async function createListingFromLot(
  lotId: string,
  payload: { quantity_kg: number; min_price_per_kg: number; bidding_deadline: string },
  token: string | null
) {
  const res = await fetch(`${BASE_URL}/post-harvest/inventory/${encodeURIComponent(lotId)}/create-listing`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to create Smart Bidding listing.');
}

export async function prepareTransportFromLot(
  lotId: string,
  payload: { quantity_kg: number; route_type: string; destination: string; estimated_distance_km: number },
  token: string | null
) {
  const res = await fetch(`${BASE_URL}/post-harvest/inventory/${encodeURIComponent(lotId)}/prepare-transport`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to prepare transport options.');
}

export async function evaluateEconomicCompare(
  payload: Record<string, unknown>,
  token: string | null
): Promise<EconomicComparisonResponse> {
  const res = await fetch(`${BASE_URL}/post-harvest/economic-compare`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Economic comparison failed.');
}

export async function evaluateShelfLife(payload: Record<string, unknown>, token: string | null) {
  const res = await fetch(`${BASE_URL}/post-harvest/shelf-life`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson<Record<string, unknown>>(res, 'Shelf-life estimation failed.');
}

export async function evaluateSpoilageRisk(payload: Record<string, unknown>, token: string | null) {
  const res = await fetch(`${BASE_URL}/post-harvest/spoilage-risk`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson<Record<string, unknown>>(res, 'Spoilage risk analysis failed.');
}

export async function fetchFacilities(farmId: string | undefined, token: string | null) {
  const qs = farmId ? `?farm_id=${encodeURIComponent(farmId)}` : '';
  const res = await fetch(`${BASE_URL}/post-harvest/facilities${qs}`, { headers: authHeaders(token) });
  return handleJson<{
    live_discovery_status: string;
    google_places_configured: boolean;
    live_facilities: Array<Record<string, unknown>>;
    manual_facilities: Array<Record<string, unknown>>;
    demonstration_facilities: Array<Record<string, unknown>>;
    transparency_note: string;
  }>(res, 'Failed to discover storage facilities.');
}

export async function createManualFacility(payload: Record<string, unknown>, token: string | null) {
  const res = await fetch(`${BASE_URL}/post-harvest/facilities/manual`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to save facility.');
}

export async function createStorageRecord(payload: Record<string, unknown>, token: string | null) {
  const res = await fetch(`${BASE_URL}/post-harvest/storage`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to record storage plan.');
}
