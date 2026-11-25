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

export const saveSeedToDigitalFarmTransfer = (p: SeedToDigitalFarmPayload) => writeJson(KEYS.seedToFarm, p);
export const loadSeedToDigitalFarmTransfer = () => readJson<SeedToDigitalFarmPayload>(KEYS.seedToFarm);

export const saveFarmToCareTransfer = (p: FarmToCarePayload) => writeJson(KEYS.farmToCare, p);
export const loadFarmToCareTransfer = () => readJson<FarmToCarePayload>(KEYS.farmToCare);

export const saveHarvestToLabourTransfer = (p: HarvestToLabourPayload) => writeJson(KEYS.harvestToLabour, p);
export const loadHarvestToLabourTransfer = () => readJson<HarvestToLabourPayload>(KEYS.harvestToLabour);

export const saveHarvestToBiddingDraft = (p: HarvestToBiddingDraft) => writeJson(KEYS.harvestToBidding, p);
export const loadHarvestToBiddingDraft = () => readJson<HarvestToBiddingDraft>(KEYS.harvestToBidding);

export const saveOrderToTransportTransfer = (p: OrderToTransportPayload) => writeJson(KEYS.orderToTransport, p);
export const loadOrderToTransportTransfer = () => readJson<OrderToTransportPayload>(KEYS.orderToTransport);

export const saveFinanceSnapshot = (p: FinanceWorkflowSnapshot) => writeJson(KEYS.financeSnapshot, p);
export const loadFinanceSnapshot = () => readJson<FinanceWorkflowSnapshot>(KEYS.financeSnapshot);
