// frontend/src/lib/market-intelligence/market.ts
// Independent Agricultural Market Intelligence calculations:
// Market comparison, price trends + SMA, Sell Now vs Later, Buyer Offers, Transportation Optimizer.
import type { Language } from '@/types';

const _numLocale = (lang: Language = 'en') =>
  lang === 'kn' ? 'kn-IN' : lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';

export interface MarketPriceRecord {
  id: string;
  crop: string;
  variety: string;
  state: string;
  district: string;
  market: string;
  minPricePerQuintal: number;
  maxPricePerQuintal: number;
  modalPricePerQuintal: number;
  pricePerKg: number;
  priceDate: string;
  source: string;
  isDemo: boolean;
}

export interface MarketComparisonInput {
  id: string;
  marketName: string;
  sellingPricePerKg: number;
  quantityKg: number;
  transportExpenseInr: number;
  loadingExpenseInr: number;
  unloadingExpenseInr: number;
  packagingExpenseInr: number;
  commissionPct: number;
  otherSellingExpenseInr: number;
  spoilagePct: number;
}

export interface MarketComparisonResult extends MarketComparisonInput {
  effectiveSoldKg: number;
  spoilageLossInr: number;
  grossSaleRevenueInr: number;
  commissionInr: number;
  totalSellingExpensesInr: number;
  netSaleRevenueInr: number;
  netProfitAfterCultivationInr: number;
}

export interface PriceHistoryPoint {
  date: string;
  pricePerKg: number;
  movingAvg?: number;
}

export interface SellStrategyInputs {
  currentPricePerKg: number;
  expectedFuturePricePerKg: number;
  quantityKg: number;
  storageDays: number;
  dailyStorageCostPerKg: number;
  spoilagePct: number;
  transportExpenseInr: number;
  storageCapacityKg: number;
  splitImmediatePct: number;
}

export interface BuyerOfferInput {
  id: string;
  buyerName: string;
  offeredPricePerKg: number;
  requiredQuantityKg: number;
  transportResponsibility: 'Buyer Pickup' | 'Farmer Delivery';
  transportExpenseInr: number;
  paymentDelayDays: number;
  additionalSellingExpenseInr: number;
}

export interface TransportOptionInput {
  mode: 'Individual Vehicle' | 'Shared Vehicle' | 'Buyer Pickup' | 'Farmer Delivery';
  distanceKm: number;
  vehicleCapacityKg: number;
  quotedCostInr: number;
  participatingFarmers: number;
  myProduceWeightKg: number;
  otherFarmersWeightKg: number;
}

export interface TransportEvaluation {
  valid: boolean;
  error?: string;
  totalWeightKg: number;
  utilizationPct: number;
  totalTransportExpenseInr: number;
  farmerShareInr: number;
  costPerKg: number;
}

export const DEMO_MARKET_PRICES: MarketPriceRecord[] = [
  {
    id: 'm_tumakuru_tom',
    crop: 'Tomato',
    variety: 'Hybrid / Local',
    state: 'Karnataka',
    district: 'Tumakuru',
    market: 'Tumakuru APMC (Illustrative Demo)',
    minPricePerQuintal: 1400,
    maxPricePerQuintal: 2100,
    modalPricePerQuintal: 1750,
    pricePerKg: 17.5,
    priceDate: '2026-11-25',
    source: 'Fictional Demonstration Dataset (AGMARKNET schema)',
    isDemo: true,
  },
  {
    id: 'm_bengaluru_tom',
    crop: 'Tomato',
    variety: 'Hybrid',
    state: 'Karnataka',
    district: 'Bengaluru',
    market: 'Yeshwanthpur / KR Market (Illustrative Demo)',
    minPricePerQuintal: 1800,
    maxPricePerQuintal: 2500,
    modalPricePerQuintal: 2150,
    pricePerKg: 21.5,
    priceDate: '2026-11-25',
    source: 'Fictional Demonstration Dataset (AGMARKNET schema)',
    isDemo: true,
  },
  {
    id: 'm_kolar_tom',
    crop: 'Tomato',
    variety: 'Nati / Hybrid',
    state: 'Karnataka',
    district: 'Kolar',
    market: 'Kolar APMC (Illustrative Demo)',
    minPricePerQuintal: 1500,
    maxPricePerQuintal: 2200,
    modalPricePerQuintal: 1850,
    pricePerKg: 18.5,
    priceDate: '2026-11-25',
    source: 'Fictional Demonstration Dataset (AGMARKNET schema)',
    isDemo: true,
  },
  {
    id: 'm_tumakuru_maize',
    crop: 'Maize',
    variety: 'Yellow Dent',
    state: 'Karnataka',
    district: 'Tumakuru',
    market: 'Tumakuru Grain Mandi (Illustrative Demo)',
    minPricePerQuintal: 2050,
    maxPricePerQuintal: 2350,
    modalPricePerQuintal: 2200,
    pricePerKg: 22.0,
    priceDate: '2026-11-25',
    source: 'Fictional Demonstration Dataset (AGMARKNET schema)',
    isDemo: true,
  },
  {
    id: 'm_byadagi_chilli',
    crop: 'Chilli',
    variety: 'Byadagi / Guntur',
    state: 'Karnataka',
    district: 'Haveri',
    market: 'Byadagi APMC (Illustrative Demo)',
    minPricePerQuintal: 5200,
    maxPricePerQuintal: 6800,
    modalPricePerQuintal: 6000,
    pricePerKg: 60.0,
    priceDate: '2026-11-25',
    source: 'Fictional Demonstration Dataset (AGMARKNET schema)',
    isDemo: true,
  },
];

export function evaluateMarkets(
  markets: MarketComparisonInput[],
  cultivationExpensesInr: number
): MarketComparisonResult[] {
  const evaluated = markets.map((m) => {
    const qty = Math.max(0, m.quantityKg);
    const spoilageFrac = Math.min(0.95, Math.max(0, m.spoilagePct / 100));
    const effectiveSoldKg = Number((qty * (1 - spoilageFrac)).toFixed(1));
    const fullGross = qty * Math.max(0, m.sellingPricePerKg);
    const grossSaleRevenueInr = Math.round(effectiveSoldKg * Math.max(0, m.sellingPricePerKg));
    const spoilageLossInr = Math.max(0, Math.round(fullGross - grossSaleRevenueInr));
    const commissionInr = Math.round(grossSaleRevenueInr * (Math.max(0, m.commissionPct) / 100));
    const totalSellingExpensesInr = Math.round(
      Math.max(0, m.transportExpenseInr) +
        Math.max(0, m.loadingExpenseInr) +
        Math.max(0, m.unloadingExpenseInr) +
        Math.max(0, m.packagingExpenseInr) +
        commissionInr +
        Math.max(0, m.otherSellingExpenseInr)
    );
    const netSaleRevenueInr = grossSaleRevenueInr - totalSellingExpensesInr;
    const netProfitAfterCultivationInr = netSaleRevenueInr - Math.round(Math.max(0, cultivationExpensesInr));

    return {
      ...m,
      effectiveSoldKg,
      spoilageLossInr,
      grossSaleRevenueInr,
      commissionInr,
      totalSellingExpensesInr,
      netSaleRevenueInr,
      netProfitAfterCultivationInr,
    };
  });

  evaluated.sort((a, b) => b.netProfitAfterCultivationInr - a.netProfitAfterCultivationInr);
  return evaluated;
}

export function analyzePriceTrends(points: PriceHistoryPoint[], windowSize = 3) {
  if (points.length === 0) {
    return {
      series: [] as PriceHistoryPoint[],
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      volatilityPct: 0,
      changePct: 0,
      direction: 'Stable' as 'Rising' | 'Falling' | 'Stable',
    };
  }

  const prices = points.map((p) => p.pricePerKg);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const variance = prices.reduce((acc, p) => acc + Math.pow(p - avgPrice, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const volatilityPct = avgPrice > 0 ? Number(((stdDev / avgPrice) * 100).toFixed(1)) : 0;

  const first = prices[0];
  const last = prices[prices.length - 1];
  const changePct = first > 0 ? Number((((last - first) / first) * 100).toFixed(1)) : 0;
  const direction: 'Rising' | 'Falling' | 'Stable' =
    changePct > 2 ? 'Rising' : changePct < -2 ? 'Falling' : 'Stable';

  const series = points.map((pt, idx) => {
    const start = Math.max(0, idx - windowSize + 1);
    const slice = points.slice(start, idx + 1);
    const ma = slice.reduce((acc, s) => acc + s.pricePerKg, 0) / slice.length;
    return { ...pt, movingAvg: Number(ma.toFixed(2)) };
  });

  return {
    series,
    avgPrice: Number(avgPrice.toFixed(2)),
    minPrice: Number(minPrice.toFixed(2)),
    maxPrice: Number(maxPrice.toFixed(2)),
    volatilityPct,
    changePct,
    direction,
  };
}

export function parseCsvPriceHistory(csvText: string): PriceHistoryPoint[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const parsed: PriceHistoryPoint[] = [];
  for (const line of lines) {
    const [dateRaw, priceRaw] = line.split(',').map((s) => s.trim());
    const price = Number(priceRaw);
    if (dateRaw && Number.isFinite(price) && price > 0) {
      parsed.push({ date: dateRaw, pricePerKg: price });
    }
  }
  return parsed;
}

export function simulateSellStrategy(inputs: SellStrategyInputs) {
  const qty = Math.max(0, inputs.quantityKg);
  const immediateRevenue = Math.round(qty * inputs.currentPricePerKg - inputs.transportExpenseInr);

  const storableQty = Math.min(qty, Math.max(0, inputs.storageCapacityKg));
  const excessQty = Math.max(0, qty - storableQty);
  const spoilageFrac = Math.min(0.95, Math.max(0, inputs.spoilagePct / 100));
  const survivingStoredKg = storableQty * (1 - spoilageFrac);
  const storageCost = Math.round(storableQty * Math.max(0, inputs.storageDays) * Math.max(0, inputs.dailyStorageCostPerKg));
  const spoilageLossInr = Math.round(storableQty * spoilageFrac * inputs.expectedFuturePricePerKg);
  const laterRevenue = Math.round(
    survivingStoredKg * inputs.expectedFuturePricePerKg +
      excessQty * inputs.currentPricePerKg -
      storageCost -
      inputs.transportExpenseInr
  );

  const splitFrac = Math.min(1, Math.max(0, inputs.splitImmediatePct / 100));
  const splitNowKg = qty * splitFrac;
  const splitStoreKg = Math.min(qty - splitNowKg, Math.max(0, inputs.storageCapacityKg));
  const splitStorageCost = Math.round(
    splitStoreKg * Math.max(0, inputs.storageDays) * Math.max(0, inputs.dailyStorageCostPerKg)
  );
  const splitNetRevenue = Math.round(
    splitNowKg * inputs.currentPricePerKg +
      splitStoreKg * (1 - spoilageFrac) * inputs.expectedFuturePricePerKg -
      splitStorageCost -
      inputs.transportExpenseInr
  );

  const breakEvenFuturePrice =
    survivingStoredKg > 0
      ? Number(((storableQty * inputs.currentPricePerKg + storageCost) / survivingStoredKg).toFixed(2))
      : 0;

  return {
    immediateRevenue,
    laterRevenue,
    storageCost,
    spoilageLossInr,
    benefitOfWaitingInr: laterRevenue - immediateRevenue,
    splitNetRevenue,
    breakEvenFuturePrice,
    capacityExceeded: qty > inputs.storageCapacityKg,
  };
}

export function evaluateBuyerOffers(offers: BuyerOfferInput[], cultivationExpensesInr: number) {
  return offers
    .map((o) => {
      const grossValue = Math.round(Math.max(0, o.requiredQuantityKg) * Math.max(0, o.offeredPricePerKg));
      const transport = o.transportResponsibility === 'Buyer Pickup' ? 0 : Math.max(0, o.transportExpenseInr);
      const netRevenue = grossValue - transport - Math.max(0, o.additionalSellingExpenseInr);
      const estimatedProfit = netRevenue - Math.round(Math.max(0, cultivationExpensesInr));
      return {
        ...o,
        grossValue,
        effectiveTransportInr: transport,
        netRevenue,
        estimatedProfit,
      };
    })
    .sort((a, b) => b.netRevenue - a.netRevenue);
}

export function evaluateTransportOption(
  opt: TransportOptionInput,
  lang: Language = 'en'
): TransportEvaluation {
  const myWeight = Math.max(0, opt.myProduceWeightKg);
  const otherWeight = opt.mode === 'Shared Vehicle' ? Math.max(0, opt.otherFarmersWeightKg) : 0;
  const totalWeightKg = myWeight + otherWeight;
  const cap = Math.max(0, opt.vehicleCapacityKg);
  const loc = _numLocale(lang);

  if (cap <= 0) {
    const capZeroErr: Record<Language, string> = {
      en: 'Vehicle capacity must be greater than 0 kg.',
      kn: 'ವಾಹನದ ಸಾಮರ್ಥ್ಯ 0 kg ಗಿಂತ ಹೆಚ್ಚಿರಬೇಕು.',
      hi: 'वाहन क्षमता 0 kg से अधिक होनी चाहिए।',
      te: 'వాహన సామర్థ్యం 0 kg కంటే ఎక్కువగా ఉండాలి.',
    };
    return {
      valid: false,
      error: capZeroErr[lang] || capZeroErr.en,
      totalWeightKg,
      utilizationPct: 0,
      totalTransportExpenseInr: opt.quotedCostInr,
      farmerShareInr: opt.quotedCostInr,
      costPerKg: 0,
    };
  }

  if (totalWeightKg > cap) {
    const totStr = totalWeightKg.toLocaleString(loc);
    const capStr = cap.toLocaleString(loc);
    const overloadErr: Record<Language, string> = {
      en: `Load (${totStr} kg) exceeds declared vehicle capacity (${capStr} kg). Reduce load or choose a higher-capacity vehicle.`,
      kn: `ತೂಕ (${totStr} kg) ವಾಹನ ಸಾಮರ್ಥ್ಯವನ್ನು (${capStr} kg) ಮೀರಿದೆ. ಲೋಡ್ ಕಡಿಮೆ ಮಾಡಿ ಅಥವಾ ದೊಡ್ಡ ವಾಹನ ಆಯ್ಕೆಮಾಡಿ.`,
      hi: `भार (${totStr} kg) वाहन क्षमता (${capStr} kg) से अधिक है। भार कम करें या बड़ा वाहन चुनें।`,
      te: `బరువు (${totStr} kg) వాహన సామర్థ్యాన్ని (${capStr} kg) మించింది. లోడ్ తగ్గించండి లేదా పెద్ద వాహనాన్ని ఎంచుకోండి.`,
    };
    return {
      valid: false,
      error: overloadErr[lang] || overloadErr.en,
      totalWeightKg,
      utilizationPct: Number(((totalWeightKg / cap) * 100).toFixed(1)),
      totalTransportExpenseInr: opt.quotedCostInr,
      farmerShareInr: 0,
      costPerKg: 0,
    };
  }

  const utilizationPct = Number(((totalWeightKg / cap) * 100).toFixed(1));
  const totalQuote = opt.mode === 'Buyer Pickup' ? 0 : Math.max(0, opt.quotedCostInr);
  const farmerShareInr =
    totalWeightKg > 0 ? Math.round(totalQuote * (myWeight / totalWeightKg)) : Math.round(totalQuote);
  const costPerKg = myWeight > 0 ? Number((farmerShareInr / myWeight).toFixed(2)) : 0;

  return {
    valid: true,
    totalWeightKg,
    utilizationPct,
    totalTransportExpenseInr: totalQuote,
    farmerShareInr,
    costPerKg,
  };
}
