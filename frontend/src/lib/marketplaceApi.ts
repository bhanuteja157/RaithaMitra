// frontend/src/lib/marketplaceApi.ts
// Authenticated client for AD-38 Registered Buyer Discovery, Direct Selling, Packaging, and QR Produce Passports.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

function authHeaders(token?: string | null): Record<string, string> {
  const active = token || (typeof window !== 'undefined' ? localStorage.getItem('rm_token') : null);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (active) headers['Authorization'] = `Bearer ${active}`;
  return headers;
}

async function handleJson<T>(res: Response, fallbackMsg: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || fallbackMsg);
  }
  return res.json();
}

export interface RegisteredBuyer {
  buyer_id: string;
  profile_id: string;
  business_name: string;
  buyer_type: string;
  buyer_category: string;
  district: string;
  state: string;
  delivery_address?: string;
  distance_km?: number | null;
  required_commodities: string[];
  preferred_varieties: string[];
  quality_requirements?: string;
  min_quantity_kg: number;
  max_quantity_kg: number;
  expected_price_min_inr?: number | null;
  expected_price_max_inr?: number | null;
  payment_terms?: string;
  procurement_schedule?: string;
  verification_status: string;
}

export interface DirectSaleProposal {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farm_id?: string | null;
  buyer_id: string;
  buyer_name: string;
  crop_name: string;
  variety?: string | null;
  quantity_kg: number;
  proposed_price_per_kg: number;
  counter_price_per_kg?: number | null;
  agreed_price_per_kg?: number | null;
  delivery_location: string;
  payment_terms: string;
  status: string;
  farmer_confirmed: number;
  buyer_confirmed: number;
  expires_at: string;
  notes?: string | null;
  purchase_order_id?: string | null;
  created_at: string;
}

export async function discoverBuyers(params: {
  crop?: string;
  district?: string;
  category?: string;
  lat?: number;
  lon?: number;
}): Promise<RegisteredBuyer[]> {
  const sp = new URLSearchParams();
  if (params.crop) sp.set('crop', params.crop);
  if (params.district) sp.set('district', params.district);
  if (params.category) sp.set('category', params.category);
  if (params.lat !== undefined) sp.set('lat', String(params.lat));
  if (params.lon !== undefined) sp.set('lon', String(params.lon));
  const res = await fetch(`${BASE_URL}/bidding/buyers?${sp.toString()}`);
  return handleJson(res, 'Failed to load registered buyers');
}

export async function listDirectProposals(token?: string | null): Promise<DirectSaleProposal[]> {
  const res = await fetch(`${BASE_URL}/bidding/direct-proposals`, {
    headers: authHeaders(token),
  });
  return handleJson(res, 'Failed to load direct sale proposals');
}

export async function createDirectProposal(
  payload: {
    farm_id?: string;
    buyer_id: string;
    crop_name: string;
    variety?: string;
    quantity_kg: number;
    proposed_price_per_kg: number;
    delivery_location?: string;
    payment_terms?: string;
    notes?: string;
  },
  token?: string | null
): Promise<DirectSaleProposal> {
  const res = await fetch(`${BASE_URL}/bidding/direct-proposals`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to submit direct sale proposal');
}

export async function respondDirectProposal(
  proposalId: string,
  payload: { action: 'accept' | 'counter' | 'reject'; counter_price_per_kg?: number; notes?: string },
  token?: string | null
): Promise<DirectSaleProposal> {
  const res = await fetch(`${BASE_URL}/bidding/direct-proposals/${proposalId}/respond`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleJson(res, 'Failed to respond to proposal');
}

export async function confirmDirectProposal(
  proposalId: string,
  token?: string | null
): Promise<{ status: string; order_id?: string; order?: any; proposal: DirectSaleProposal }> {
  const res = await fetch(`${BASE_URL}/bidding/direct-proposals/${proposalId}/confirm`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return handleJson(res, 'Failed to confirm direct sale proposal');
}

export async function listPurchaseOrders(token?: string | null): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/bidding/orders`, {
    headers: authHeaders(token),
  });
  return handleJson(res, 'Failed to load purchase orders');
}
