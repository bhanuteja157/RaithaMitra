// frontend/src/components/market-intelligence/MarketIntelligenceWorkspace.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { loadHarvestTransferPayload, HarvestToMarketPayload } from '@/lib/digital-farming/geo';
import {
  DEMO_MARKET_PRICES,
  MarketPriceRecord,
  MarketComparisonInput,
  PriceHistoryPoint,
  SellStrategyInputs,
  BuyerOfferInput,
  TransportOptionInput,
  evaluateMarkets,
  analyzePriceTrends,
  parseCsvPriceHistory,
  simulateSellStrategy,
  evaluateBuyerOffers,
  evaluateTransportOption,
} from '@/lib/market-intelligence/market';
import {
  Store,
  TrendingUp,
  Clock,
  Users,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Sprout,
} from 'lucide-react';

type MarketTab = 'prices' | 'compare' | 'trends' | 'sell_timing' | 'offers' | 'transport';

export function MarketIntelligenceWorkspace() {
  const [activeTab, setActiveTab] = useState<MarketTab>('prices');
  const [harvestPayload, setHarvestPayload] = useState<HarvestToMarketPayload | null>(null);

  // Common produce state
  const [cropName, setCropName] = useState<string>('Tomato');
  const [quantityKg, setQuantityKg] = useState<number>(18000);
  const [cultivationExpensesInr, setCultivationExpensesInr] = useState<number>(65000);

  // Phase 12: Prices + Manual Entry
  const [cropFilter, setCropFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [customPrices, setCustomPrices] = useState<MarketPriceRecord[]>([]);
  const [manualMarketName, setManualMarketName] = useState<string>('');
  const [manualPricePerKg, setManualPricePerKg] = useState<number>(20);

  // Phase 13: Multi-market comparison
  const [markets, setMarkets] = useState<MarketComparisonInput[]>([
    {
      id: 'mk1',
      marketName: 'Local Tumakuru APMC (Demo)',
      sellingPricePerKg: 17.5,
      quantityKg: 18000,
      transportExpenseInr: 4500,
      loadingExpenseInr: 1200,
      unloadingExpenseInr: 1000,
      packagingExpenseInr: 2500,
      commissionPct: 2,
      otherSellingExpenseInr: 500,
      spoilagePct: 2,
    },
    {
      id: 'mk2',
      marketName: 'Bengaluru Yeshwanthpur (Demo)',
      sellingPricePerKg: 21.5,
      quantityKg: 18000,
      transportExpenseInr: 14000,
      loadingExpenseInr: 1500,
      unloadingExpenseInr: 1500,
      packagingExpenseInr: 3500,
      commissionPct: 4,
      otherSellingExpenseInr: 1200,
      spoilagePct: 6,
    },
    {
      id: 'mk3',
      marketName: 'Kolar APMC (Demo)',
      sellingPricePerKg: 18.5,
      quantityKg: 18000,
      transportExpenseInr: 12500,
      loadingExpenseInr: 1400,
      unloadingExpenseInr: 1200,
      packagingExpenseInr: 3000,
      commissionPct: 3,
      otherSellingExpenseInr: 800,
      spoilagePct: 4,
    },
  ]);

  // Phase 14: Price Trends (clearly labelled illustrative demo + CSV import)
  const [trendRange, setTrendRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [csvInput, setCsvInput] = useState<string>('');
  const [customTrend, setCustomTrend] = useState<PriceHistoryPoint[] | null>(null);

  // Phase 15: Sell Now vs Later
  const [sellInputs, setSellInputs] = useState<SellStrategyInputs>({
    currentPricePerKg: 17.5,
    expectedFuturePricePerKg: 22.0,
    quantityKg: 18000,
    storageDays: 7,
    dailyStorageCostPerKg: 0.25,
    spoilagePct: 8,
    transportExpenseInr: 4500,
    storageCapacityKg: 12000,
    splitImmediatePct: 50,
  });

  // Phase 16: Buyer Offers (independent of Smart Bidding)
  const [offers, setOffers] = useState<BuyerOfferInput[]>([
    {
      id: 'b1',
      buyerName: 'Trader A (Farmgate Pickup)',
      offeredPricePerKg: 16.5,
      requiredQuantityKg: 18000,
      transportResponsibility: 'Buyer Pickup',
      transportExpenseInr: 0,
      paymentDelayDays: 0,
      additionalSellingExpenseInr: 500,
    },
    {
      id: 'b2',
      buyerName: 'Wholesaler B (Mandi Delivery)',
      offeredPricePerKg: 18.5,
      requiredQuantityKg: 18000,
      transportResponsibility: 'Farmer Delivery',
      transportExpenseInr: 12000,
      paymentDelayDays: 14,
      additionalSellingExpenseInr: 2500,
    },
  ]);

  // Phase 17: Transport Cost Optimizer (independent of Transport Connect)
  const [transportOptions, setTransportOptions] = useState<TransportOptionInput[]>([
    {
      mode: 'Individual Vehicle',
      distanceKm: 75,
      vehicleCapacityKg: 10000,
      quotedCostInr: 9500,
      participatingFarmers: 1,
      myProduceWeightKg: 6000,
      otherFarmersWeightKg: 0,
    },
    {
      mode: 'Shared Vehicle',
      distanceKm: 75,
      vehicleCapacityKg: 10000,
      quotedCostInr: 9500,
      participatingFarmers: 2,
      myProduceWeightKg: 6000,
      otherFarmersWeightKg: 3500,
    },
  ]);

  // Load transferred harvest data from Digital Farming if present
  useEffect(() => {
    const payload = loadHarvestTransferPayload();
    if (payload) {
      setHarvestPayload(payload);
      setCropName(payload.cropName);
      setCropFilter(payload.cropName);
      setQuantityKg(payload.harvestQuantityKg);
      setCultivationExpensesInr(payload.cultivationExpensesInr);
      setMarkets((prev) =>
        prev.map((m) => ({
          ...m,
          quantityKg: payload.harvestQuantityKg,
          sellingPricePerKg: m.id === 'mk1' ? payload.expectedSellingPricePerKg : m.sellingPricePerKg,
        }))
      );
      setSellInputs((prev) => ({
        ...prev,
        quantityKg: payload.harvestQuantityKg,
        currentPricePerKg: payload.expectedSellingPricePerKg,
      }));
    }
  }, []);

  const allPrices = useMemo(() => [...customPrices, ...DEMO_MARKET_PRICES], [customPrices]);
  const filteredPrices = useMemo(
    () =>
      allPrices.filter(
        (p) =>
          (!cropFilter || p.crop.toLowerCase().includes(cropFilter.toLowerCase())) &&
          (!locationFilter ||
            p.district.toLowerCase().includes(locationFilter.toLowerCase()) ||
            p.market.toLowerCase().includes(locationFilter.toLowerCase()) ||
            p.state.toLowerCase().includes(locationFilter.toLowerCase()))
      ),
    [allPrices, cropFilter, locationFilter]
  );

  const marketResults = useMemo(
    () => evaluateMarkets(markets, cultivationExpensesInr),
    [markets, cultivationExpensesInr]
  );

  const highestGrossMarket = useMemo(() => {
    if (marketResults.length === 0) return null;
    return [...marketResults].sort((a, b) => b.sellingPricePerKg - a.sellingPricePerKg)[0];
  }, [marketResults]);

  const demoTrendSeries = useMemo<PriceHistoryPoint[]>(() => {
    const base = cropName.toLowerCase() === 'chilli' ? 56 : cropName.toLowerCase() === 'maize' ? 21 : 17;
    const count = trendRange === '7d' ? 7 : trendRange === '30d' ? 12 : 16;
    return Array.from({ length: count }).map((_, i) => ({
      date: `Day ${i + 1}`,
      pricePerKg: Number((base + Math.sin(i * 0.7) * 2.2 + i * 0.25).toFixed(2)),
    }));
  }, [cropName, trendRange]);

  const trendStats = useMemo(
    () => analyzePriceTrends(customTrend && customTrend.length > 0 ? customTrend : demoTrendSeries),
    [customTrend, demoTrendSeries]
  );

  const sellSim = useMemo(() => simulateSellStrategy(sellInputs), [sellInputs]);
  const evaluatedOffers = useMemo(
    () => evaluateBuyerOffers(offers, cultivationExpensesInr),
    [offers, cultivationExpensesInr]
  );
  const transportEvaluations = useMemo(
    () => transportOptions.map((t) => ({ input: t, eval: evaluateTransportOption(t) })),
    [transportOptions]
  );

  const handleAddManualPrice = () => {
    if (!manualMarketName.trim() || manualPricePerKg <= 0) return;
    setCustomPrices((prev) => [
      {
        id: `custom_${Date.now()}`,
        crop: cropName,
        variety: 'Farmer Entered',
        state: 'User Entry',
        district: 'Local',
        market: manualMarketName.trim(),
        minPricePerQuintal: Math.round(manualPricePerKg * 95),
        maxPricePerQuintal: Math.round(manualPricePerKg * 105),
        modalPricePerQuintal: Math.round(manualPricePerKg * 100),
        pricePerKg: manualPricePerKg,
        priceDate: new Date().toISOString().slice(0, 10),
        source: 'Manual Farmer Entry',
        isDemo: false,
      },
      ...prev,
    ]);
    setManualMarketName('');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 text-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-full mb-2">
              <Store className="w-3.5 h-3.5" />
              RaithaMitra · Independent Agricultural Market Intelligence
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">Market Profit, Price Trends & Transport Optimizer</h1>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1">
              Compare mandis, analyze sell timing, evaluate buyer offers, and optimize shared transport costs.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-emerald-900 text-xs font-semibold print:hidden"
          >
            <Printer className="w-3.5 h-3.5" /> Print Strategy
          </button>
        </div>

        {harvestPayload && (
          <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center gap-3 text-xs text-emerald-50">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Sprout className="w-3.5 h-3.5" /> Imported from Digital Harvest:
            </span>
            <span>{harvestPayload.farmName} ({harvestPayload.areaAcres} ac)</span>
            <span>Crop: <strong>{harvestPayload.cropName}</strong></span>
            <span>Harvest: <strong>{harvestPayload.harvestQuantityKg.toLocaleString('en-IN')} kg</strong></span>
            <span>Cultivation Cost: <strong>₹{harvestPayload.cultivationExpensesInr.toLocaleString('en-IN')}</strong></span>
          </div>
        )}
      </div>

      {/* Shared Produce Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-zinc-500 mb-1 font-semibold">Crop</label>
          <input
            type="text"
            value={cropName}
            onChange={(e) => setCropName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="block text-zinc-500 mb-1 font-semibold">Available Produce Quantity (kg)</label>
          <input
            type="number"
            min="0"
            value={quantityKg}
            onChange={(e) => {
              const q = Math.max(0, Number(e.target.value) || 0);
              setQuantityKg(q);
              setMarkets((prev) => prev.map((m) => ({ ...m, quantityKg: q })));
              setSellInputs((prev) => ({ ...prev, quantityKg: q }));
            }}
            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="block text-zinc-500 mb-1 font-semibold">Total Cultivation Expenses (₹)</label>
          <input
            type="number"
            min="0"
            value={cultivationExpensesInr}
            onChange={(e) => setCultivationExpensesInr(Math.max(0, Number(e.target.value) || 0))}
            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 print:hidden">
        {(
          [
            { id: 'prices', label: 'Mandi Prices', icon: Store },
            { id: 'compare', label: 'Market Profit', icon: TrendingUp },
            { id: 'trends', label: 'Price Trends', icon: TrendingUp },
            { id: 'sell_timing', label: 'Sell Now vs Later', icon: Clock },
            { id: 'offers', label: 'Buyer Offers', icon: Users },
            { id: 'transport', label: 'Transport Cost', icon: Truck },
          ] as { id: MarketTab; label: string; icon: any }[]
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border ${
                activeTab === tab.id
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MANDI PRICES */}
      {activeTab === 'prices' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
            <strong>Data Transparency:</strong> Live AGMARKNET / Data.gov.in API keys are not configured in this client environment. Sample records below are clearly labelled <em>Fictional Demonstration Datasets</em>; you can add real local mandi prices manually below.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <input
              type="text"
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              placeholder="Filter by crop (e.g., Tomato)"
              className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Filter by state, district, or market"
              className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
            <input
              type="text"
              value={manualMarketName}
              onChange={(e) => setManualMarketName(e.target.value)}
              placeholder="Manual market name"
              className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
            <div className="flex gap-2">
              <input
                type="number"
                step="0.5"
                value={manualPricePerKg}
                onChange={(e) => setManualPricePerKg(Number(e.target.value) || 0)}
                placeholder="₹/kg"
                className="w-24 px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={handleAddManualPrice}
                className="flex-1 px-3 py-2 rounded-xl bg-emerald-700 text-white font-semibold"
              >
                Add Price
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500">
                  <th className="py-2 pr-3">Crop</th>
                  <th className="py-2 pr-3">Market & District</th>
                  <th className="py-2 pr-3">Min / Max (₹/qtl)</th>
                  <th className="py-2 pr-3">Modal (₹/qtl)</th>
                  <th className="py-2 pr-3">Normalized (₹/kg)</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrices.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-2 pr-3 font-semibold">{p.crop} ({p.variety})</td>
                    <td className="py-2 pr-3">{p.market}, {p.district}</td>
                    <td className="py-2 pr-3">₹{p.minPricePerQuintal} – ₹{p.maxPricePerQuintal}</td>
                    <td className="py-2 pr-3 font-semibold">₹{p.modalPricePerQuintal}</td>
                    <td className="py-2 pr-3 text-emerald-700 font-bold">₹{p.pricePerKg}/kg</td>
                    <td className="py-2 pr-3">{p.priceDate}</td>
                    <td className="py-2 text-[11px] text-zinc-500">{p.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MARKET PROFIT OPTIMIZATION */}
      {activeTab === 'compare' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <h2 className="text-base font-bold">Market Profit Optimization (Net Return After Transport, Commission & Spoilage)</h2>
          {marketResults.length > 0 && highestGrossMarket && marketResults[0].id !== highestGrossMarket.id && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
              <strong>Key Insight:</strong> <strong>{highestGrossMarket.marketName}</strong> offers the highest selling price (₹{highestGrossMarket.sellingPricePerKg}/kg), but <strong>{marketResults[0].marketName}</strong> yields higher net profit (₹{marketResults[0].netProfitAfterCultivationInr.toLocaleString('en-IN')}) due to lower transport, commission, and spoilage losses.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {markets.map((m, idx) => (
              <div key={m.id} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                <input
                  type="text"
                  value={m.marketName}
                  onChange={(e) => {
                    const next = [...markets];
                    next[idx] = { ...m, marketName: e.target.value };
                    setMarkets(next);
                  }}
                  className="w-full font-bold px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    Price (₹/kg)
                    <input
                      type="number"
                      step="0.5"
                      value={m.sellingPricePerKg}
                      onChange={(e) => {
                        const next = [...markets];
                        next[idx] = { ...m, sellingPricePerKg: Number(e.target.value) || 0 };
                        setMarkets(next);
                      }}
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                    />
                  </label>
                  <label>
                    Transport (₹)
                    <input
                      type="number"
                      value={m.transportExpenseInr}
                      onChange={(e) => {
                        const next = [...markets];
                        next[idx] = { ...m, transportExpenseInr: Number(e.target.value) || 0 };
                        setMarkets(next);
                      }}
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                    />
                  </label>
                  <label>
                    Commission (%)
                    <input
                      type="number"
                      step="0.5"
                      value={m.commissionPct}
                      onChange={(e) => {
                        const next = [...markets];
                        next[idx] = { ...m, commissionPct: Number(e.target.value) || 0 };
                        setMarkets(next);
                      }}
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                    />
                  </label>
                  <label>
                    Spoilage (%)
                    <input
                      type="number"
                      step="0.5"
                      value={m.spoilagePct}
                      onChange={(e) => {
                        const next = [...markets];
                        next[idx] = { ...m, spoilagePct: Number(e.target.value) || 0 };
                        setMarkets(next);
                      }}
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500">
                  <th className="py-2 pr-3">Rank & Market</th>
                  <th className="py-2 pr-3">Price/kg</th>
                  <th className="py-2 pr-3">Gross Revenue</th>
                  <th className="py-2 pr-3">Spoilage Loss</th>
                  <th className="py-2 pr-3">Selling + Transport</th>
                  <th className="py-2 pr-3">Net Sale Revenue</th>
                  <th className="py-2">Net Profit After Cultivation</th>
                </tr>
              </thead>
              <tbody>
                {marketResults.map((r, i) => (
                  <tr key={r.id} className={`border-b border-zinc-100 dark:border-zinc-800 ${i === 0 ? 'bg-emerald-50/60 font-semibold' : ''}`}>
                    <td className="py-2 pr-3">#{i + 1} {r.marketName}</td>
                    <td className="py-2 pr-3">₹{r.sellingPricePerKg}/kg</td>
                    <td className="py-2 pr-3">₹{r.grossSaleRevenueInr.toLocaleString('en-IN')}</td>
                    <td className="py-2 pr-3 text-amber-700">₹{r.spoilageLossInr.toLocaleString('en-IN')}</td>
                    <td className="py-2 pr-3">₹{r.totalSellingExpensesInr.toLocaleString('en-IN')}</td>
                    <td className="py-2 pr-3">₹{r.netSaleRevenueInr.toLocaleString('en-IN')}</td>
                    <td className={`py-2 font-bold ${r.netProfitAfterCultivationInr >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      ₹{r.netProfitAfterCultivationInr.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marketResults}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="marketName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="grossSaleRevenueInr" name="Gross Sale (₹)" fill="#94a3b8" />
                <Bar dataKey="netProfitAfterCultivationInr" name="Net Profit (₹)" fill="#15803d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 3: PRICE TRENDS */}
      {activeTab === 'trends' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">Price Trend Intelligence & Moving Average ({cropName})</h2>
              <p className="text-xs text-zinc-500">
                {customTrend ? 'Using imported CSV historical prices' : 'Using clearly labelled illustrative demonstration series (paste CSV below to analyze real prices)'}
              </p>
            </div>
            <div className="flex gap-1.5 text-xs">
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setCustomTrend(null);
                    setTrendRange(r);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold ${
                    trendRange === r && !customTrend ? 'bg-emerald-700 text-white' : 'bg-zinc-100 dark:bg-zinc-800'
                  }`}
                >
                  {r.toUpperCase()} Demo
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-zinc-500 block">Average Price</span>
              <strong>₹{trendStats.avgPrice}/kg</strong>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-zinc-500 block">Minimum</span>
              <strong>₹{trendStats.minPrice}/kg</strong>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-zinc-500 block">Maximum</span>
              <strong>₹{trendStats.maxPrice}/kg</strong>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-zinc-500 block">Volatility</span>
              <strong>{trendStats.volatilityPct}%</strong>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-zinc-500 block">Direction</span>
              <strong>{trendStats.direction} ({trendStats.changePct}%)</strong>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendStats.series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pricePerKg" name="Price (₹/kg)" stroke="#15803d" strokeWidth={2} />
                <Line type="monotone" dataKey="movingAvg" name="3-Period Moving Avg" stroke="#f59e0b" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="text-xs space-y-2">
            <label className="font-semibold block">Import Observed Price History CSV (format: date,pricePerKg per line):</label>
            <textarea
              rows={3}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              placeholder={'2026-11-18,16.5\n2026-11-19,17.0\n2026-11-20,18.2'}
              className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
            />
            <button
              type="button"
              onClick={() => {
                const parsed = parseCsvPriceHistory(csvInput);
                if (parsed.length > 0) setCustomTrend(parsed);
              }}
              className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold"
            >
              Analyze CSV History
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: SELL NOW VS SELL LATER */}
      {activeTab === 'sell_timing' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <h2 className="text-base font-bold">Sell Now vs Sell Later Strategy Simulator</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {(
              [
                ['currentPricePerKg', 'Current Price (₹/kg)'],
                ['expectedFuturePricePerKg', 'Expected Future Price (₹/kg)'],
                ['storageDays', 'Storage Duration (days)'],
                ['dailyStorageCostPerKg', 'Daily Storage Cost (₹/kg/day)'],
                ['spoilagePct', 'Est. Spoilage (%)'],
                ['storageCapacityKg', 'Storage Capacity (kg)'],
                ['splitImmediatePct', 'Split: Sell Immediately (%)'],
                ['transportExpenseInr', 'Transport Cost (₹)'],
              ] as [keyof SellStrategyInputs, string][]
            ).map(([k, label]) => (
              <label key={k}>
                <span className="text-zinc-500 block mb-1">{label}</span>
                <input
                  type="number"
                  step="any"
                  value={sellInputs[k]}
                  onChange={(e) => setSellInputs({ ...sellInputs, [k]: Number(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                />
              </label>
            ))}
          </div>

          {sellSim.capacityExceeded && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Available produce ({sellInputs.quantityKg} kg) exceeds storage capacity ({sellInputs.storageCapacityKg} kg). Excess produce is modeled as sold immediately; never store perishable produce without proper cold/dry ventilation.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="font-bold text-sm">1. Sell Immediately</div>
              <div className="text-lg font-bold text-emerald-700 mt-1">
                ₹{sellSim.immediateRevenue.toLocaleString('en-IN')}
              </div>
              <p className="text-zinc-500 mt-1">Zero storage cost and zero post-harvest spoilage risk.</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="font-bold text-sm">2. Store & Sell Later</div>
              <div className="text-lg font-bold text-emerald-700 mt-1">
                ₹{sellSim.laterRevenue.toLocaleString('en-IN')}
              </div>
              <p className="text-zinc-500 mt-1">
                Storage: ₹{sellSim.storageCost.toLocaleString('en-IN')} · Spoilage loss: ₹{sellSim.spoilageLossInr.toLocaleString('en-IN')} · Break-even future price: ₹{sellSim.breakEvenFuturePrice}/kg
              </p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="font-bold text-sm">3. Split Strategy ({sellInputs.splitImmediatePct}% Now)</div>
              <div className="text-lg font-bold text-emerald-700 mt-1">
                ₹{sellSim.splitNetRevenue.toLocaleString('en-IN')}
              </div>
              <p className="text-zinc-500 mt-1">Balances immediate cash flow with upside if prices rise.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BUYER OFFER INTELLIGENCE */}
      {activeTab === 'offers' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Buyer Offer Intelligence (Independent Calculator — No Real Orders Created)</h2>
            <button
              type="button"
              onClick={() =>
                setOffers((p) => [
                  ...p,
                  {
                    id: `b_${Date.now()}`,
                    buyerName: `Buyer ${p.length + 1}`,
                    offeredPricePerKg: 18,
                    requiredQuantityKg: quantityKg,
                    transportResponsibility: 'Farmer Delivery',
                    transportExpenseInr: 6000,
                    paymentDelayDays: 7,
                    additionalSellingExpenseInr: 1000,
                  },
                ])
              }
              className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
            >
              + Add Offer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {offers.map((o, idx) => (
              <div key={o.id} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={o.buyerName}
                  onChange={(e) => {
                    const next = [...offers];
                    next[idx] = { ...o, buyerName: e.target.value };
                    setOffers(next);
                  }}
                  className="col-span-2 font-bold px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                />
                <label>
                  Offered Price (₹/kg)
                  <input
                    type="number"
                    step="0.5"
                    value={o.offeredPricePerKg}
                    onChange={(e) => {
                      const next = [...offers];
                      next[idx] = { ...o, offeredPricePerKg: Number(e.target.value) || 0 };
                      setOffers(next);
                    }}
                    className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                  />
                </label>
                <label>
                  Transport Responsibility
                  <select
                    value={o.transportResponsibility}
                    onChange={(e) => {
                      const next = [...offers];
                      next[idx] = { ...o, transportResponsibility: e.target.value as any };
                      setOffers(next);
                    }}
                    className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                  >
                    <option value="Buyer Pickup">Buyer Pickup</option>
                    <option value="Farmer Delivery">Farmer Delivery</option>
                  </select>
                </label>
                <label>
                  Transport Cost (₹)
                  <input
                    type="number"
                    value={o.transportExpenseInr}
                    onChange={(e) => {
                      const next = [...offers];
                      next[idx] = { ...o, transportExpenseInr: Number(e.target.value) || 0 };
                      setOffers(next);
                    }}
                    className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                  />
                </label>
                <label>
                  Payment Delay (days)
                  <input
                    type="number"
                    value={o.paymentDelayDays}
                    onChange={(e) => {
                      const next = [...offers];
                      next[idx] = { ...o, paymentDelayDays: Number(e.target.value) || 0 };
                      setOffers(next);
                    }}
                    className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500">
                  <th className="py-2 pr-3">Buyer</th>
                  <th className="py-2 pr-3">Offered Price</th>
                  <th className="py-2 pr-3">Gross Offer</th>
                  <th className="py-2 pr-3">Farmer Transport</th>
                  <th className="py-2 pr-3">Payment Delay</th>
                  <th className="py-2 pr-3">Net Sale Revenue</th>
                  <th className="py-2">Est. Profit</th>
                </tr>
              </thead>
              <tbody>
                {evaluatedOffers.map((ev, i) => (
                  <tr key={ev.id} className={`border-b border-zinc-100 dark:border-zinc-800 ${i === 0 ? 'bg-emerald-50/60 font-semibold' : ''}`}>
                    <td className="py-2 pr-3">{ev.buyerName}</td>
                    <td className="py-2 pr-3">₹{ev.offeredPricePerKg}/kg</td>
                    <td className="py-2 pr-3">₹{ev.grossValue.toLocaleString('en-IN')}</td>
                    <td className="py-2 pr-3">₹{ev.effectiveTransportInr.toLocaleString('en-IN')}</td>
                    <td className="py-2 pr-3">{ev.paymentDelayDays} days</td>
                    <td className="py-2 pr-3 text-emerald-700">₹{ev.netRevenue.toLocaleString('en-IN')}</td>
                    <td className="py-2">₹{ev.estimatedProfit.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: TRANSPORTATION COST OPTIMIZER */}
      {activeTab === 'transport' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <h2 className="text-base font-bold">Transportation Cost Optimization (Independent Calculator — No Fake Driver Availability)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {transportOptions.map((opt, idx) => {
              const ev = transportEvaluations[idx].eval;
              return (
                <div key={idx} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <select
                      value={opt.mode}
                      onChange={(e) => {
                        const next = [...transportOptions];
                        next[idx] = { ...opt, mode: e.target.value as any };
                        setTransportOptions(next);
                      }}
                      className="font-bold px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                    >
                      <option value="Individual Vehicle">Individual Vehicle</option>
                      <option value="Shared Vehicle">Shared Vehicle</option>
                      <option value="Buyer Pickup">Buyer-Arranged Pickup</option>
                      <option value="Farmer Delivery">Farmer-Arranged Delivery</option>
                    </select>
                    {ev.valid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {ev.utilizationPct}% load
                      </span>
                    ) : (
                      <span className="text-red-600 font-semibold">Capacity Exceeded</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label>
                      Vehicle Capacity (kg)
                      <input
                        type="number"
                        value={opt.vehicleCapacityKg}
                        onChange={(e) => {
                          const next = [...transportOptions];
                          next[idx] = { ...opt, vehicleCapacityKg: Number(e.target.value) || 0 };
                          setTransportOptions(next);
                        }}
                        className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                      />
                    </label>
                    <label>
                      Quoted Vehicle Cost (₹)
                      <input
                        type="number"
                        value={opt.quotedCostInr}
                        onChange={(e) => {
                          const next = [...transportOptions];
                          next[idx] = { ...opt, quotedCostInr: Number(e.target.value) || 0 };
                          setTransportOptions(next);
                        }}
                        className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                      />
                    </label>
                    <label>
                      My Produce Weight (kg)
                      <input
                        type="number"
                        value={opt.myProduceWeightKg}
                        onChange={(e) => {
                          const next = [...transportOptions];
                          next[idx] = { ...opt, myProduceWeightKg: Number(e.target.value) || 0 };
                          setTransportOptions(next);
                        }}
                        className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                      />
                    </label>
                    {opt.mode === 'Shared Vehicle' && (
                      <label>
                        Co-Farmers Weight (kg)
                        <input
                          type="number"
                          value={opt.otherFarmersWeightKg}
                          onChange={(e) => {
                            const next = [...transportOptions];
                            next[idx] = { ...opt, otherFarmersWeightKg: Number(e.target.value) || 0 };
                            setTransportOptions(next);
                          }}
                          className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                        />
                      </label>
                    )}
                  </div>

                  {!ev.valid ? (
                    <p className="text-red-600 bg-red-50 p-2 rounded-lg">{ev.error}</p>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 space-y-1">
                      <div>Total Combined Load: <strong>{ev.totalWeightKg.toLocaleString('en-IN')} kg</strong></div>
                      <div>Your Weight-Proportional Share: <strong className="text-emerald-700">₹{ev.farmerShareInr.toLocaleString('en-IN')}</strong> (₹{ev.costPerKg}/kg)</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
