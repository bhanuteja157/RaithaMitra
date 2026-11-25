// frontend/src/lib/financeApi.ts
// Authenticated client for AD-24 Farm Financial Intelligence & Transaction Ledger.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export interface FinancialTransaction {
  id: string;
  user_id: string;
  farm_id: string;
  crop_season_id?: string | null;
  category: string;
  tx_type: 'income' | 'expense';
  amount_inr: number;
  tx_date: string;
  description: string;
  source_module: string;
  related_id?: string | null;
  status: 'estimated' | 'committed' | 'recorded' | 'settled' | 'cancelled';
  provenance: string;
  payment_reference?: string | null;
  sync_key?: string | null;
  is_manual: number;
  created_at: string;
  updated_at: string;
}

export interface ConfirmedOrderSettlement {
  order_id: string;
  listing_id: string;
  crop_name: string;
  quantity_kg: number;
  price_per_kg: number;
  confirmed_value_inr: number;
  buyer_id: string;
  buyer_name: string;
  delivery_status: string;
  payment_status: 'paid' | 'partial' | 'unpaid';
  amount_received_inr: number;
  outstanding_balance_inr: number;
  created_at: string;
}

export interface FinancialRecommendation {
  severity: 'warning' | 'positive' | 'info';
  title: string;
  detail: string;
}

export interface FinancialSummaryResponse {
  farm_id: string;
  farm_name?: string;
  primary_crop?: string;
  land_area_ha: number;
  allocated_budget_inr: number;
  estimated_cultivation_investment_inr: number;
  actual_recorded_expenses_inr: number;
  committed_expenses_inr: number;
  total_cost_inr: number;
  remaining_budget_inr: number;
  expected_revenue_inr: number;
  confirmed_sales_value_inr: number;
  confirmed_quantity_kg: number;
  received_payments_inr: number;
  outstanding_payments_inr: number;
  govt_benefits_received_inr: number;
  estimated_net_profit_inr: number;
  realized_net_profit_inr: number;
  realized_roi_pct: number;
  projected_roi_pct: number;
  break_even_price_per_kg: number | null;
  expense_breakdown: Array<{ category: string; amount_inr: number }>;
  cashflow_series: Array<{ date: string; income: number; expense: number }>;
  confirmed_orders: ConfirmedOrderSettlement[];
  recommendations: FinancialRecommendation[];
}

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function fetchFinanceSummary(
  farmId: string,
  token: string | null,
  estimatedCultivationInr = 0,
  sync = true
): Promise<FinancialSummaryResponse> {
  const params = new URLSearchParams({
    farm_id: farmId,
    estimated_cultivation_inr: String(Math.max(0, estimatedCultivationInr)),
    sync: sync ? 'true' : 'false',
  });
  const res = await fetch(`${BASE_URL}/finance/summary?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to load financial summary.');
  }
  return res.json();
}

export async function fetchFinanceTransactions(
  farmId: string,
  token: string | null,
  filters?: {
    tx_type?: string;
    category?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }
): Promise<FinancialTransaction[]> {
  const params = new URLSearchParams({ farm_id: farmId });
  if (filters?.tx_type && filters.tx_type !== 'all') params.append('tx_type', filters.tx_type);
  if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.search) params.append('search', filters.search);

  const res = await fetch(`${BASE_URL}/finance/transactions?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to load transactions.');
  }
  return res.json();
}

export async function createFinanceTransaction(
  payload: {
    farm_id: string;
    tx_type: 'income' | 'expense';
    category: string;
    amount_inr: number;
    tx_date: string;
    description: string;
    source_module?: string;
    status?: 'estimated' | 'committed' | 'recorded' | 'settled';
    payment_reference?: string;
  },
  token: string | null
): Promise<FinancialTransaction> {
  const res = await fetch(`${BASE_URL}/finance/transactions`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to record financial transaction.');
  }
  return res.json();
}

export async function updateFinanceTransaction(
  txId: string,
  payload: {
    category?: string;
    amount_inr?: number;
    tx_date?: string;
    description?: string;
    status?: 'estimated' | 'committed' | 'recorded' | 'settled' | 'cancelled';
    payment_reference?: string;
  },
  token: string | null
): Promise<FinancialTransaction> {
  const res = await fetch(`${BASE_URL}/finance/transactions/${txId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update transaction.');
  }
  return res.json();
}

export async function recordOrderPayment(
  orderId: string,
  payload: {
    farm_id: string;
    amount_inr: number;
    tx_date?: string;
    payment_reference?: string;
    notes?: string;
  },
  token: string | null
): Promise<{
  transaction: FinancialTransaction;
  order_id: string;
  confirmed_total_inr: number;
  total_received_inr: number;
  outstanding_balance_inr: number;
}> {
  const res = await fetch(`${BASE_URL}/finance/orders/${orderId}/payments`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to record buyer payment.');
  }
  return res.json();
}

export async function syncFarmFinance(farmId: string, token: string | null): Promise<{ labour_synced: number; transport_synced: number }> {
  const res = await fetch(`${BASE_URL}/finance/sync?farm_id=${encodeURIComponent(farmId)}`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to synchronize module finances.');
  }
  return res.json();
}

export async function seedDemoFinancialScenario(farmId: string, token: string | null): Promise<FinancialSummaryResponse> {
  const res = await fetch(`${BASE_URL}/finance/demo-scenario?farm_id=${encodeURIComponent(farmId)}`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to load demo scenario.');
  }
  return res.json();
}

export async function downloadFinanceCsv(farmId: string, token: string | null): Promise<void> {
  const res = await fetch(`${BASE_URL}/finance/export/csv?farm_id=${encodeURIComponent(farmId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to export CSV statement.');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `raithamitra_finance_${farmId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
