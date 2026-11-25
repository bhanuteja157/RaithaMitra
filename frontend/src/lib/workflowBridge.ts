// frontend/src/lib/workflowBridge.ts
// Feature-isolated cross-module data transfer helpers (localStorage) connecting
// BioIntel -> Digital Farm -> Farm Management -> Crop Health -> Labour -> Smart Bidding -> Transport -> Finance.

const KEYS = {
  seedToFarm: 'rm_wf_seed_to_farm_v1',
  farmToCare: 'rm_wf_farm_to_care_v1',
  harvestToLabour: 'rm_wf_harvest_to_labour_v1',
  harvestToBidding: 'rm_wf_harvest_to_bidding_v1',
  orderToTransport: 'rm_wf_order_to_transport_v1',
  financeSnapshot: 'rm_wf_finance_snapshot_v1',
};

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export interface SeedToDigitalFarmPayload {
  crop: string;
  varietyName: string;
  areaAcres: number;
  budgetInr: number;
  waterAvailability: string;
  seedRequiredKg: number;
  transferredAt: string;
}

export interface FarmToCarePayload {
  farmName: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  crop: string;
  growthStage: string;
  soilType: string;
  soilMoisturePct: number;
  weatherSummary?: string;
  transferredAt: string;
}

export interface HarvestToLabourPayload {
  crop: string;
  locationLabel: string;
  expectedHarvestDate: string;
  areaAcres: number;
  recommendedWorkers: number;
  transferredAt: string;
}

export interface HarvestToBiddingDraft {
  cropName: string;
  quantityKg: number;
  location: string;
  expectedPricePerKg: number;
  cultivationExpensesInr: number;
  transferredAt: string;
}

export interface OrderToTransportPayload {
  orderId: string;
  cropName: string;
  quantityKg: number;
  pickupLocation: string;
  deliveryLocation: string;
  farmerName: string;
  transferredAt: string;
}

export interface FinanceWorkflowSnapshot {
  cropName: string;
  projectedCultivationCostInr: number;
  projectedRevenueInr: number;
  projectedProfitInr: number;
  updatedAt: string;
}

function scopedKey(baseKey: string, userId?: string): string {
  return userId ? `${baseKey}__${userId}` : baseKey;
}

export const saveSeedToDigitalFarmTransfer = (p: SeedToDigitalFarmPayload, userId?: string) =>
  writeJson(scopedKey(KEYS.seedToFarm, userId), p);
export const loadSeedToDigitalFarmTransfer = (userId?: string) =>
  readJson<SeedToDigitalFarmPayload>(scopedKey(KEYS.seedToFarm, userId));

export const saveFarmToCareTransfer = (p: FarmToCarePayload, userId?: string) =>
  writeJson(scopedKey(KEYS.farmToCare, userId), p);
export const loadFarmToCareTransfer = (userId?: string) =>
  readJson<FarmToCarePayload>(scopedKey(KEYS.farmToCare, userId));

export const saveHarvestToLabourTransfer = (p: HarvestToLabourPayload, userId?: string) =>
  writeJson(scopedKey(KEYS.harvestToLabour, userId), p);
export const loadHarvestToLabourTransfer = (userId?: string) =>
  readJson<HarvestToLabourPayload>(scopedKey(KEYS.harvestToLabour, userId));

export const saveHarvestToBiddingDraft = (p: HarvestToBiddingDraft, userId?: string) =>
  writeJson(scopedKey(KEYS.harvestToBidding, userId), p);
export const loadHarvestToBiddingDraft = (userId?: string) =>
  readJson<HarvestToBiddingDraft>(scopedKey(KEYS.harvestToBidding, userId));

export const saveOrderToTransportTransfer = (p: OrderToTransportPayload, userId?: string) =>
  writeJson(scopedKey(KEYS.orderToTransport, userId), p);
export const loadOrderToTransportTransfer = (userId?: string) =>
  readJson<OrderToTransportPayload>(scopedKey(KEYS.orderToTransport, userId));

export const saveFinanceSnapshot = (p: FinanceWorkflowSnapshot, userId?: string) =>
  writeJson(scopedKey(KEYS.financeSnapshot, userId), p);
export const loadFinanceSnapshot = (userId?: string) =>
  readJson<FinanceWorkflowSnapshot>(scopedKey(KEYS.financeSnapshot, userId));
