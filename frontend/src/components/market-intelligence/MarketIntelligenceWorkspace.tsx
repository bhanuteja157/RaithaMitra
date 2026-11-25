// frontend/src/components/market-intelligence/MarketIntelligenceWorkspace.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import {
  addManualMarketPrice,
  compareBuyerOffer,
  compareMarkets,
  createMarketAlertPreference,
  fetchHistoryAndForecast,
  fetchLiveAgmarknet,
  fetchMarketAlerts,
  fetchMarketObservations,
  fetchMarketStatus,
  HistoryAndForecastResponse,
  importMarketCsv,
  MarketComparisonResponse,
  MarketObservation,
  MarketStatusResponse,
} from '@/lib/marketApi';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  Database,
  Gavel,
  LineChart as LineChartIcon,
  Plus,
  RefreshCw,
  Scale,
  Store,
  Truck,
  Upload,
  Volume2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const MKT_LABELS: Record<string, { title: string; subtitle: string }> = {
  en: {
    title: 'RaithaMitra Live Market Intelligence & Price Prediction',
    subtitle: 'AGMARKNET / Data.gov.in integration, Karnataka mandi discovery, transport-adjusted net return ranking, and walk-forward statistical forecasting.',
  },
  kn: {
    title: 'ರೈತ ಮಿತ್ರ ಮಾರುಕಟ್ಟೆ ಬುದ್ಧಿಮತ್ತೆ ಮತ್ತು ಬೆಲೆ ಮುನ್ಸೂಚನೆ',
    subtitle: 'ಮಾರುಕಟ್ಟೆ ದರ ಹೋಲಿಕೆ, ಸಾರಿಗೆ ವೆಚ್ಚದ ನಂತರ ನಿವ್ವಳ ಆದಾಯ ಮತ್ತು ಅಂಕಿಅಂಶ ಆಧಾರಿತ ಬೆಲೆ ಮುನ್ಸೂಚನೆ.',
  },
  hi: {
    title: 'रैतमित्र लाइव बाजार बुद्धिमत्ता और मूल्य पूर्वानुमान',
    subtitle: 'एगमार्कनेट बाजार भाव, परिवहन-समायोजित शुद्ध रिटर्न तुलना और सांख्यिकीय मूल्य पूर्वानुमान।',
  },
  te: {
    title: 'రైతమిత్ర మార్కెట్ ఇంటెలిజెన్స్ మరియు ధరల అంచనా',
    subtitle: 'మార్కెట్ ధరల పోలిక, రవాణా ఖర్చు తర్వాత నికర ఆదాయం మరియు గణాంక ధర అంచనా.',
  },
};

type MarketTab = 'compare' | 'overview' | 'forecast' | 'offers' | 'alerts';

export function MarketIntelligenceWorkspace() {
  const { currentFarm, token, language } = useFarm();
  const labels = MKT_LABELS[String(language)] || MKT_LABELS.en;

  const [tab, setTab] = useState<MarketTab>('compare');
  const [status, setStatus] = useState<MarketStatusResponse | null>(null);
  const [observations, setObservations] = useState<MarketObservation[]>([]);
  const [histFc, setHistFc] = useState<HistoryAndForecastResponse | null>(null);

  const [commodityFilter, setCommodityFilter] = useState(currentFarm?.primary_crop || 'Tomato');
  const [districtFilter, setDistrictFilter] = useState('');
  const [horizonDays, setHorizonDays] = useState(7);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Market Net Return Comparison (Jury Demo defaults, editable)
  const [qtyKg, setQtyKg] = useState(2000);
  const [marketAName, setMarketAName] = useState('Market A — Bengaluru Yeshwanthpur');
  const [marketAPrice, setMarketAPrice] = useState(25);
  const [marketATransport, setMarketATransport] = useState(8000);
  const [marketBName, setMarketBName] = useState('Market B — Mandya APMC');
  const [marketBPrice, setMarketBPrice] = useState(23);
  const [marketBTransport, setMarketBTransport] = useState(2000);
  const [cmpResult, setCmpResult] = useState<MarketComparisonResponse | null>(null);

  // Manual price form
  const [manMarket, setManMarket] = useState('Mandya APMC');
  const [manDistrict, setManDistrict] = useState('Mandya');
  const [manPriceKg, setManPriceKg] = useState(23);

  // CSV Import
  const [csvText, setCsvText] = useState('');

  // Buyer offer compare
  const [offerPriceKg, setOfferPriceKg] = useState(24);
  const [offerTransport, setOfferTransport] = useState(1500);
  const [offerResult, setOfferResult] = useState<Record<string, unknown> | null>(null);

  // Alerts
  const [alertTargetPrice, setAlertTargetPrice] = useState(25);
  const [alertData, setAlertData] = useState<{
    preferences: Array<Record<string, unknown>>;
    alerts: Array<Record<string, unknown>>;
    delivery_mode: string;
  } | null>(null);

  const refreshAll = useCallback(async () => {
    try {
      const [st, obs, hf] = await Promise.all([
        fetchMarketStatus(),
        fetchMarketObservations({ commodity: commodityFilter, district: districtFilter || undefined }),
        fetchHistoryAndForecast(commodityFilter, horizonDays),
      ]);
      setStatus(st);
      setObservations(obs.observations);
      setHistFc(hf);
    } catch {
      // non-fatal
    }
    if (token) {
      try {
        const al = await fetchMarketAlerts(token);
        setAlertData(al);
      } catch {
        // non-fatal
      }
    }
  }, [commodityFilter, districtFilter, horizonDays, token]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const runMarketComparison = useCallback(async () => {
    if (!token) return;
    setErrorMsg(null);
    try {
      const res = await compareMarkets(
        {
          commodity: commodityFilter,
          available_quantity_kg: qtyKg,
          markets: [
            {
              market_name: marketAName,
              selling_price_per_kg: marketAPrice,
              transport_cost_inr: marketATransport,
              price_source_label: 'Editable Scenario / Manual',
            },
            {
              market_name: marketBName,
              selling_price_per_kg: marketBPrice,
              transport_cost_inr: marketBTransport,
              price_source_label: 'Editable Scenario / Manual',
            },
          ],
        },
        token
      );
      setCmpResult(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Market comparison failed.');
    }
  }, [token, commodityFilter, qtyKg, marketAName, marketAPrice, marketATransport, marketBName, marketBPrice, marketBTransport]);

  useEffect(() => {
    if (token) runMarketComparison();
  }, [token, runMarketComparison]);

  const speakSummary = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const l = String(language);
    utt.lang = l === 'kn' ? 'kn-IN' : l === 'hi' ? 'hi-IN' : l === 'te' ? 'te-IN' : 'en-IN';
    window.speechSynthesis.speak(utt);
  };

  const handleFetchLive = async () => {
    if (!token) return;
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await fetchLiveAgmarknet(
        { commodity: commodityFilter, state: 'Karnataka', district: districtFilter || undefined },
        token
      );
      if (res.is_live) {
        setStatusMsg('Retrieved live official AGMARKNET observations.');
      } else {
        setStatusMsg(String(res.error || 'Official API key not configured; showing cached/manual records only.'));
      }
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'AGMARKNET request failed.');
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErrorMsg(null);
    const today = new Date().toISOString().slice(0, 10);
    try {
      await addManualMarketPrice(
        {
          commodity: commodityFilter,
          state: 'Karnataka',
          district: manDistrict,
          market: manMarket,
          observation_date: today,
          modal_price: manPriceKg,
          unit: 'INR/kg',
        },
        token
      );
      setStatusMsg(`Saved farmer-entered price ₹${manPriceKg}/kg for ${commodityFilter} at ${manMarket}.`);
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save manual price.');
    }
  };

  const handleImportCsv = async () => {
    if (!token || !csvText.trim()) return;
    setErrorMsg(null);
    try {
      const res = await importMarketCsv({ filename: 'farmer_upload.csv', csv_text: csvText }, token);
      setStatusMsg(`Imported ${res.inserted} records (${res.skipped} skipped/duplicate out of ${res.total_rows}).`);
      setCsvText('');
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'CSV import failed.');
    }
  };

  const handleCompareOffer = async () => {
    if (!token) return;
    try {
      const res = await compareBuyerOffer(
        {
          commodity: commodityFilter,
          quantity_kg: qtyKg,
          buyer_offer_per_kg: offerPriceKg,
          buyer_transport_cost_inr: offerTransport,
          benchmark_market_name: cmpResult?.recommended_market || marketBName,
          benchmark_price_per_kg: cmpResult?.ranked_markets?.[0]?.selling_price_per_kg || marketBPrice,
          benchmark_transport_cost_inr: cmpResult?.ranked_markets?.[0]?.transport_cost_inr || marketBTransport,
        },
        token
      );
      setOfferResult(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Offer comparison failed.');
    }
  };

  const handleAddAlert = async () => {
    if (!token) return;
    try {
      await createMarketAlertPreference(
        { commodity: commodityFilter, target_price_per_kg: alertTargetPrice },
        token
      );
      setStatusMsg(`Saved target price alert (₹${alertTargetPrice}/kg for ${commodityFilter}).`);
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save alert.');
    }
  };

  const cmpChartData = cmpResult
    ? cmpResult.ranked_markets.map((m) => ({
        name: m.market_name.split('—')[0].trim(),
        Gross: m.gross_revenue_inr,
        NetReturn: m.net_selling_return_inr,
        Transport: m.transport_cost_inr,
      }))
    : [];

  const combinedTrendData = useMemo(() => {
    const histPts = (histFc?.history?.series || []).map((s) => ({
      date: s.date,
      Actual: s.modal_price_per_kg,
      Forecast: null as number | null,
    }));
    const fcPts = (histFc?.forecast?.forecast || []).map((f) => ({
      date: f.date,
      Actual: null as number | null,
      Forecast: f.predicted_modal_per_kg,
    }));
    return [...histPts, ...fcPts];
  }, [histFc]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                AD-29 Market Intelligence &amp; Forecasting
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{labels.title}</h1>
              <p className="text-xs text-slate-600 mt-0.5">{labels.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                status?.official_api_configured
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {status?.official_api_configured ? 'AGMARKNET API Configured' : 'AGMARKNET Key Unconfigured (Manual/CSV/Cache)'}
            </span>
            {cmpResult && (
              <button
                onClick={() => speakSummary(cmpResult.reasoning)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4 text-emerald-700" />
                Speak Advice
              </button>
            )}
          </div>
        </div>

        {statusMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Global Filters & Quick Actions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center text-xs">
          <select
            value={commodityFilter}
            onChange={(e) => setCommodityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 font-semibold"
          >
            {(status?.supported_commodities || ['Tomato', 'Onion', 'Potato', 'Paddy', 'Wheat', 'Maize', 'Ragi']).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300"
          >
            <option value="">All Karnataka Districts</option>
            {(status?.karnataka_priority_districts || []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button
            onClick={handleFetchLive}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Fetch Official AGMARKNET
          </button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Link href="/bidding" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center gap-1">
              <Gavel className="w-3.5 h-3.5" /> Smart Bidding
            </Link>
            <Link href="/transport" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> Transport
            </Link>
            <Link href="/post-harvest" className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center gap-1">
              <Scale className="w-3.5 h-3.5" /> Sell vs Store
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          {[
            { id: 'compare', label: 'Market Comparison (Net Return)', icon: BarChart3 },
            { id: 'overview', label: 'Prices, Manual Entry & CSV Import', icon: Database },
            { id: 'forecast', label: 'Historical Trends & Forecasting', icon: LineChartIcon },
            { id: 'offers', label: 'Buyer Offer Benchmark', icon: Gavel },
            { id: 'alerts', label: 'Market Targets & Alerts', icon: Bell },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as MarketTab)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                  tab === t.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: MARKET NET RETURN COMPARISON */}
        {tab === 'compare' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Transport-Adjusted Net Return</h2>
                <button
                  type="button"
                  onClick={() => {
                    setCommodityFilter('Tomato');
                    setQtyKg(2000);
                    setMarketAName('Market A (Higher Headline Price)');
                    setMarketAPrice(25);
                    setMarketATransport(8000);
                    setMarketBName('Market B (Lower Transport Cost)');
                    setMarketBPrice(23);
                    setMarketBTransport(2000);
                  }}
                  className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
                >
                  Jury Demo Scenario
                </button>
              </div>
              <div>
                <label className="font-semibold text-slate-600">Available Produce Quantity (kg)</label>
                <input
                  type="number"
                  value={qtyKg}
                  onChange={(e) => setQtyKg(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">Market Option A</div>
                <input value={marketAName} onChange={(e) => setMarketAName(e.target.value)} className="w-full px-2.5 py-1.5 rounded border border-slate-300" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={marketAPrice} onChange={(e) => setMarketAPrice(Number(e.target.value))} placeholder="Price ₹/kg" className="px-2.5 py-1.5 rounded border border-slate-300" />
                  <input type="number" value={marketATransport} onChange={(e) => setMarketATransport(Number(e.target.value))} placeholder="Transport ₹" className="px-2.5 py-1.5 rounded border border-slate-300" />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">Market Option B</div>
                <input value={marketBName} onChange={(e) => setMarketBName(e.target.value)} className="w-full px-2.5 py-1.5 rounded border border-slate-300" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={marketBPrice} onChange={(e) => setMarketBPrice(Number(e.target.value))} placeholder="Price ₹/kg" className="px-2.5 py-1.5 rounded border border-slate-300" />
                  <input type="number" value={marketBTransport} onChange={(e) => setMarketBTransport(Number(e.target.value))} placeholder="Transport ₹" className="px-2.5 py-1.5 rounded border border-slate-300" />
                </div>
              </div>
              <button onClick={runMarketComparison} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold">
                Rank Markets by Net Return
              </button>
            </div>

            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              {cmpResult ? (
                <>
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                    <div className="font-bold text-emerald-900 uppercase">
                      Recommended: {cmpResult.recommended_market}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{cmpResult.reasoning}</p>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cmpChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Gross" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="NetReturn" fill="#059669" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500">Sign in to compare transport-adjusted net market returns.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: OBSERVATIONS, MANUAL ENTRY & CSV IMPORT */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <form onSubmit={handleAddManual} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  Record Farmer-Observed Market Price
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <input value={manMarket} onChange={(e) => setManMarket(e.target.value)} placeholder="Mandi / Market" className="px-3 py-2 rounded-lg border border-slate-300" />
                  <input value={manDistrict} onChange={(e) => setManDistrict(e.target.value)} placeholder="District" className="px-3 py-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Modal Price (₹/kg)</label>
                  <input type="number" step="0.5" value={manPriceKg} onChange={(e) => setManPriceKg(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300" />
                </div>
                <button type="submit" className="w-full py-2 rounded-xl bg-emerald-600 text-white font-semibold">
                  Save Market Observation
                </button>
              </form>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-sky-600" />
                  Import Historical CSV (Safe Sanitized)
                </h3>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="commodity,state,district,market,observation_date,modal_price,unit&#10;Tomato,Karnataka,Mandya,Mandya APMC,2026-11-20,2400,INR/Quintal"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-[11px]"
                />
                <button onClick={handleImportCsv} className="w-full py-2 rounded-xl bg-sky-600 text-white font-semibold">
                  Import CSV Observations
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-slate-900">
                Persisted Market Observations ({observations.length})
              </h2>
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Market</th>
                      <th className="px-3 py-2">Modal ₹/kg</th>
                      <th className="px-3 py-2">Modal ₹/Qtl</th>
                      <th className="px-3 py-2">Provenance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {observations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                          No observations persisted for {commodityFilter} yet. Enter a price, import a CSV, or configure DATA_GOV_IN_API_KEY.
                        </td>
                      </tr>
                    ) : (
                      observations.map((o) => (
                        <tr key={o.id}>
                          <td className="px-3 py-2">{o.observation_date}</td>
                          <td className="px-3 py-2 font-semibold">{o.market} ({o.district})</td>
                          <td className="px-3 py-2 font-bold text-emerald-700">₹{o.modal_price_per_kg}</td>
                          <td className="px-3 py-2">₹{o.modal_price_per_quintal}</td>
                          <td className="px-3 py-2 text-[11px] text-slate-500">{o.provenance_label}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HISTORICAL TRENDS & STATISTICAL FORECASTING */}
        {tab === 'forecast' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900">
                Historical Price Trend &amp; Walk-Forward Forecast ({commodityFilter})
              </h2>
              <select
                value={horizonDays}
                onChange={(e) => setHorizonDays(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg border border-slate-300"
              >
                <option value={7}>7-Day Horizon</option>
                <option value={15}>15-Day Horizon</option>
                <option value={30}>30-Day Horizon</option>
              </select>
            </div>

            {histFc?.forecast?.available ? (
              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900">
                <strong>Model:</strong> {histFc.forecast.selected_method} • <strong>Training Obs:</strong>{' '}
                {histFc.forecast.training_observation_count} • <strong>Validation MAE:</strong> ₹
                {histFc.forecast.validation_metrics?.mae_per_kg}/kg • <strong>RMSE:</strong> ₹
                {histFc.forecast.validation_metrics?.rmse_per_kg}/kg
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                {histFc?.forecast?.reason || 'Insufficient historical observations for statistical forecasting.'}
              </div>
            )}

            <div className="h-64 w-full">
              {combinedTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Actual" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Forecast" stroke="#0284c7" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-500">
                  Import or record historical prices to visualize trends and unlock walk-forward forecasting.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: BUYER OFFER BENCHMARK */}
        {tab === 'offers' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-900">Compare Buyer Offer vs Benchmark Market</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-600">Buyer Offer (₹/kg)</label>
                <input type="number" value={offerPriceKg} onChange={(e) => setOfferPriceKg(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300" />
              </div>
              <div>
                <label className="font-semibold text-slate-600">Buyer Pickup / Transport Cost (₹)</label>
                <input type="number" value={offerTransport} onChange={(e) => setOfferTransport(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300" />
              </div>
              <div className="flex items-end">
                <button onClick={handleCompareOffer} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold">
                  Evaluate Offer
                </button>
              </div>
            </div>
            {offerResult && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Net Offer Return: ₹{Number(offerResult.offer_net_return_inr).toLocaleString()}</div>
                <p className="text-slate-700">{String(offerResult.verdict)}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ALERTS */}
        {tab === 'alerts' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="font-semibold text-slate-600">Target Selling Price (₹/kg) for {commodityFilter}</label>
                <input type="number" value={alertTargetPrice} onChange={(e) => setAlertTargetPrice(Number(e.target.value))} className="w-48 mt-1 px-3 py-2 rounded-lg border border-slate-300 block" />
              </div>
              <button onClick={handleAddAlert} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold">
                Save In-App Alert Target
              </button>
            </div>
            <p className="text-slate-500">{alertData?.delivery_mode || 'In-app evaluation only.'}</p>
            <div className="space-y-2">
              {(alertData?.alerts || []).map((a) => (
                <div key={String(a.id)} className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium">
                  {String(a.message)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
