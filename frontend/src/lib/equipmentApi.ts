// frontend/src/lib/equipmentApi.ts
// Authenticated client for AD-28 RaithaMitra Equipment Connect & Resource Optimization.

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

export interface EquipmentListing {
  id: string;
  owner_id: string;
  owner_name?: string;
  equipment_name: string;
  category: string;
  manufacturer?: string | null;
  model?: string | null;
  power_or_capacity?: string | null;
  effective_field_capacity_ha_hr: number;
  theoretical_capacity_ha_hr?: number | null;
  suitable_operations: string[];
  suitable_crops: string[];
  condition_status: string;
  rental_rate_inr: number;
  rate_unit: string;
  min_booking_duration: number;
  operator_available: boolean;
  operator_charge_inr: number;
  fuel_included: boolean;
  fuel_charge_inr: number;
  delivery_charge_inr: number;
  setup_charge_inr: number;
  location_label: string;
  latitude: number;
  longitude: number;
  service_radius_km: number;
  maintenance_status: string;
  is_active: boolean;
  is_demonstration: boolean;
  distance_km?: number;
}

export interface EquipmentBooking {
  id: string;
  equipment_id: string;
  equipment_name?: string;
  category?: string;
  location_label?: string;
  renter_user_id: string;
  owner_id: string;
  operation_type: string;
  booking_date: string;
  start_datetime: string;
  end_datetime: string;
  duration_hours: number;
  total_cost_inr: number;
  status: string;
  payment_status: string;
}

export interface SharedScheduleRow {
  farmer_label: string;
  area_acres: number;
  required_hours: number;
  start_time: string;
  end_time: string;
  individual_cost_inr: number;
  allocated_base_inr: number;
  allocated_delivery_inr: number;
  allocated_total_inr: number;
  savings_inr: number;
}

export interface SharedOptimizationResponse {
  feasible: boolean;
  reason?: string;
  shared_request_id?: string | null;
  solver: string;
  equipment_name?: string;
  operation_type?: string;
  target_date?: string;
  hourly_rate_inr?: number;
  total_operating_hours?: number;
  base_rental_total_inr?: number;
  shared_delivery_charge_inr?: number;
  total_individual_cost_inr?: number;
  total_shared_cost_inr?: number;
  total_savings_inr?: number;
  savings_pct?: number;
  schedule?: SharedScheduleRow[];
  disclaimer?: string;
}

export interface EquipmentFinancialSummary {
  total_bookings: number;
  estimated_cost_inr: number;
  committed_cost_inr: number;
  completed_obligation_inr: number;
  settled_payments_inr: number;
  estimated_shared_savings_inr: number;
}

export async function fetchEquipmentCategories(): Promise<{ categories: string[] }> {
  const res = await fetch(`${BASE_URL}/equipment/categories`);
  return handleJson(res, 'Failed to fetch equipment categories.');
}

export async function fetchEquipmentListings(params?: {
  category?: string;
  operation?: string;
  max_rate_inr?: number;
  latitude?: number;
  longitude?: number;
}): Promise<{ equipment: EquipmentListing[] }> {
  const qs = new URLSearchParams();
  if (params?.category && params.category !== 'All') qs.set('category', params.category);
  if (params?.operation) qs.set('operation', params.operation);
  if (params?.max_rate_inr !== undefined) qs.set('max_rate_inr', String(params.max_rate_inr));
  if (params?.latitude !== undefined) qs.set('latitude', String(params.latitude));
  if (params?.longitude !== undefined) qs.set('longitude', String(params.longitude));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetch(`${BASE_URL}/equipment/listings${query}`);
  return handleJson(res, 'Failed to fetch equipment listings.');
}

export async function registerEquipmentListing(payload: Record<string, unknown>, token: string | null): Promise<EquipmentListing> {
  const res = await fetch(`${BASE_URL}/equipment/listings`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to register equipment.');
}

export async function createEquipmentBooking(payload: Record<string, unknown>, token: string | null): Promise<EquipmentBooking> {
  const res = await fetch(`${BASE_URL}/equipment/bookings`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to submit booking request.');
}

export async function fetchMyBookings(token: string | null): Promise<{ bookings: EquipmentBooking[] }> {
  const res = await fetch(`${BASE_URL}/equipment/bookings`, { headers: authHeaders(token) });
  return handleJson(res, 'Failed to load bookings.');
}

export async function updateBookingStatus(bookingId: string, status: string, token: string | null): Promise<EquipmentBooking> {
  const res = await fetch(`${BASE_URL}/equipment/bookings/${encodeURIComponent(bookingId)}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  return handleJson(res, 'Failed to update booking status.');
}

export async function settleBookingPayment(bookingId: string, token: string | null): Promise<EquipmentBooking> {
  const res = await fetch(`${BASE_URL}/equipment/bookings/${encodeURIComponent(bookingId)}/settle`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return handleJson(res, 'Failed to settle booking payment.');
}

export async function runSharedOptimization(payload: Record<string, unknown>, token: string | null): Promise<SharedOptimizationResponse> {
  const res = await fetch(`${BASE_URL}/equipment/shared-optimize`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Shared optimization failed.');
}

export async function recordEquipmentMaintenance(equipmentId: string, payload: Record<string, unknown>, token: string | null) {
  const res = await fetch(`${BASE_URL}/equipment/listings/${encodeURIComponent(equipmentId)}/maintenance`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to record maintenance.');
}

export async function fetchEquipmentRecommendations(
  farmId: string | undefined,
  operationType: string,
  token: string | null
) {
  const qs = new URLSearchParams({ operation_type: operationType });
  if (farmId) qs.set('farm_id', farmId);
  const res = await fetch(`${BASE_URL}/equipment/recommendations?${qs.toString()}`, {
    headers: authHeaders(token),
  });
  return handleJson<{
    operation_type: string;
    crop: string;
    farm_area_acres: number;
    recommended_count: number;
    recommendations: Array<Record<string, unknown>>;
  }>(res, 'Failed to load recommendations.');
}

export async function fetchEquipmentFinancialSummary(token: string | null): Promise<EquipmentFinancialSummary> {
  const res = await fetch(`${BASE_URL}/equipment/financial-summary`, { headers: authHeaders(token) });
  return handleJson(res, 'Failed to fetch equipment financial summary.');
}
