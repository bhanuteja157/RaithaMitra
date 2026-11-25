// frontend/src/app/post-harvest/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import {
  createHarvestRecord,
  createInventoryLot,
  createListingFromLot,
  createManualFacility,
  createStorageRecord,
  CropStorageProfile,
  EconomicComparisonResponse,
  evaluateEconomicCompare,
  evaluateShelfLife,
  evaluateSpoilageRisk,
  fetchFacilities,
  fetchHarvests,
  fetchInventoryLots,
  fetchPostHarvestSummary,
  fetchStorageKnowledge,
  HarvestRecord,
  InventoryLot,
  PostHarvestSummary,
  prepareTransportFromLot,
  recordLotEvent,
} from '@/lib/postHarvestApi';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Gavel,
  Package,
  Plus,
  ShieldAlert,
  Thermometer,
  Truck,
  Volume2,
  Warehouse,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PH_LABELS: Record<string, { title: string; subtitle: string }> = {
  en: {
    title: 'Post-Harvest Intelligence & Cold Storage',
    subtitle: 'Harvest tracking, persistent lot inventory, scientific shelf-life & spoilage risk, and Sell-Now vs Store optimization.',
  },
  kn: {
    title: 'ಕೊಯ್ಲೋತ್ತರ ಬುದ್ಧಿಮತ್ತೆ ಮತ್ತು ಶೀತಲೀಕರಣ ಸಂಗ್ರಹಣೆ',
    subtitle: 'ಕೊಯ್ಲು ದಾಖಲೆ, ದಾಸ್ತಾನು ನಿರ್ವಹಣೆ, ವೈಜ್ಞಾನಿಕ ಶೆಲ್ಫ್-ಲೈಫ್ ಮತ್ತು ಈಗ ಮಾರಾಟ vs ಸಂಗ್ರಹಣೆ ಲಾಭದ ವಿಶ್ಲೇಷಣೆ.',
  },
  hi: {
    title: 'कटाई-पश्चात बुद्धिमत्ता और कोल्ड स्टोरेज',
    subtitle: 'फसल कटाई रिकॉर्ड, इन्वेंटरी प्रबंधन, वैज्ञानिक शेल्फ-लाइफ और अभी बेचें बनाम भंडारण आर्थिक तुलना।',
  },
  te: {
    title: 'పంట కోత తర్వాత నిల్వ మరియు ఆర్థిక విశ్లేషణ',
    subtitle: 'పంట కోత రికార్డులు, ఇన్వెంటరీ నిర్వహణ, నిల్వ కాలం అంచనా మరియు అమ్మకం vs నిల్వ పోలిక.',
  },
};

type ActiveTab = 'economics' | 'inventory' | 'science' | 'facilities';

export default function PostHarvestPage() {
  const { currentFarm, token, language } = useFarm();
  const labels = PH_LABELS[language] || PH_LABELS.en;

  const [tab, setTab] = useState<ActiveTab>('economics');
  const [summary, setSummary] = useState<PostHarvestSummary | null>(null);
  const [knowledge, setKnowledge] = useState<CropStorageProfile[]>([]);
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [facilities, setFacilities] = useState<{
    google_places_configured: boolean;
    live_facilities: Array<Record<string, unknown>>;
    manual_facilities: Array<Record<string, unknown>>;
    demonstration_facilities: Array<Record<string, unknown>>;
    transparency_note: string;
  } | null>(null);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Economic Simulator State (defaulting to Jury Demonstration Scenario inputs, explicitly labelled)
  const [econCommodity, setEconCommodity] = useState('Tomato');
  const [econQty, setEconQty] = useState(2000);
  const [econCurPrice, setEconCurPrice] = useState(25);
  const [econImmTransport, setEconImmTransport] = useState(3000);
  const [econDays, setEconDays] = useState(5);
  const [econFuturePrice, setEconFuturePrice] = useState(30);
  const [econLossPct, setEconLossPct] = useState(8);
  const [econStorageCost, setEconStorageCost] = useState(4000);
  const [econFutTransport, setEconFutTransport] = useState(3000);
  const [econResult, setEconResult] = useState<EconomicComparisonResponse | null>(null);

  // Harvest & Lot creation forms
  const [lotCrop, setLotCrop] = useState(currentFarm?.primary_crop || 'Tomato');
  const [lotQty, setLotQty] = useState(2000);
  const [lotMethod, setLotMethod] = useState('Ambient Ventilated');
  const [lotLocation, setLotLocation] = useState('On-Farm Shed');
  const [lotTemp, setLotTemp] = useState('26');
  const [lotRh, setLotRh] = useState('78');

  // Science & Risk Analyzer state
  const [sciCrop, setSciCrop] = useState('Tomato');
  const [sciTemp, setSciTemp] = useState(28);
  const [sciRh, setSciRh] = useState(80);
  const [sciDamage, setSciDamage] = useState(4);
  const [sciDays, setSciDays] = useState(5);
  const [shelfResult, setShelfResult] = useState<Record<string, unknown> | null>(null);
  const [riskResult, setRiskResult] = useState<Record<string, unknown> | null>(null);

  // Transport prep preview
  const [transportPreview, setTransportPreview] = useState<Record<string, unknown> | null>(null);

  // Manual Facility Form
  const [facName, setFacName] = useState('');
  const [facLocation, setFacLocation] = useState('');
  const [facContact, setFacContact] = useState('');

  const refreshAll = useCallback(async () => {
    try {
      const kb = await fetchStorageKnowledge();
      setKnowledge(kb.crops);
    } catch {
      // non-fatal
    }
    if (!token) return;
    try {
      const [sumRes, hRes, lRes, fRes] = await Promise.all([
        fetchPostHarvestSummary(currentFarm?.id, token),
        fetchHarvests(currentFarm?.id, token),
        fetchInventoryLots(currentFarm?.id, token),
        fetchFacilities(currentFarm?.id, token),
      ]);
      setSummary(sumRes);
      setHarvests(hRes.harvests);
      setLots(lRes.lots);
      setFacilities(fRes);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load post-harvest records.');
    }
  }, [token, currentFarm?.id]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const runEconomicSimulation = useCallback(async () => {
    if (!token) return;
    setErrorMsg(null);
    try {
      const res = await evaluateEconomicCompare(
        {
          commodity: econCommodity,
          available_quantity_kg: econQty,
          current_price_per_kg: econCurPrice,
          immediate_transport_cost_inr: econImmTransport,
          storage_duration_days: econDays,
          expected_future_price_per_kg: econFuturePrice,
          estimated_loss_pct: econLossPct,
          storage_charges_inr: econStorageCost,
          future_transport_cost_inr: econFutTransport,
          run_monte_carlo: true,
          num_trials: 1000,
          random_seed: 42,
        },
        token
      );
      setEconResult(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Economic simulation failed.');
    }
  }, [
    token,
    econCommodity,
    econQty,
    econCurPrice,
    econImmTransport,
    econDays,
    econFuturePrice,
    econLossPct,
    econStorageCost,
    econFutTransport,
  ]);

  useEffect(() => {
    if (token) runEconomicSimulation();
  }, [token, runEconomicSimulation]);

  const speakSummary = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const langCode = String(language);
    utt.lang = langCode === 'kn' ? 'kn-IN' : langCode === 'hi' ? 'hi-IN' : langCode === 'te' ? 'te-IN' : 'en-IN';
    window.speechSynthesis.speak(utt);
  };

  const handleLoadJuryDemo = () => {
    setEconCommodity('Tomato');
    setEconQty(2000);
    setEconCurPrice(25);
    setEconImmTransport(3000);
    setEconDays(5);
    setEconFuturePrice(30);
    setEconLossPct(8);
    setEconStorageCost(4000);
    setEconFutTransport(3000);
    setStatusMsg('Loaded Jury Demonstration Scenario (Tomato, 2,000 kg, 5-day cold storage trade-off).');
  };

  const handleCreateHarvestAndLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !currentFarm) return;
    setErrorMsg(null);
    setStatusMsg(null);
    const today = new Date().toISOString().slice(0, 10);
    try {
      const h = await createHarvestRecord(
        {
          farm_id: currentFarm.id,
          crop: lotCrop,
          variety: currentFarm.crop_variety || 'Local Standard',
          cultivated_area_ha: currentFarm.land_area_ha || 1.0,
          expected_harvest_date: today,
          estimated_yield_kg: lotQty,
          actual_harvested_kg: lotQty,
          crop_maturity: 'Optimal',
          harvest_quality: 'Grade A',
          is_simulated: false,
        },
        token
      );
      await createInventoryLot(
        {
          farm_id: currentFarm.id,
          harvest_record_id: h.id,
          crop: lotCrop,
          variety: currentFarm.crop_variety || 'Local Standard',
          harvest_date: today,
          initial_quantity_kg: lotQty,
          storage_method: lotMethod,
          storage_location: lotLocation,
          recorded_temp_c: lotTemp ? Number(lotTemp) : null,
          recorded_humidity_pct: lotRh ? Number(lotRh) : null,
        },
        token
      );
      setStatusMsg(`Recorded harvest & inventory lot (${lotQty} kg ${lotCrop}).`);
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create harvest lot.');
    }
  };

  const handleLotAction = async (lot: InventoryLot, eventType: 'sale' | 'damage' | 'discard') => {
    if (!token) return;
    const qty = Math.min(lot.available_quantity_kg, 100);
    if (qty <= 0) return;
    setErrorMsg(null);
    try {
      await recordLotEvent(
        lot.id,
        {
          event_type: eventType,
          quantity_kg: qty,
          notes: `Recorded ${eventType} of ${qty} kg from Post-Harvest Workspace`,
        },
        token
      );
      setStatusMsg(`Recorded ${eventType} (${qty} kg) on ${lot.crop} lot.`);
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Inventory action failed.');
    }
  };

  const handleCreateListing = async (lot: InventoryLot) => {
    if (!token || lot.available_quantity_kg <= 0) return;
    setErrorMsg(null);
    const deadline = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    try {
      await createListingFromLot(
        lot.id,
        {
          quantity_kg: lot.available_quantity_kg,
          min_price_per_kg: 25,
          bidding_deadline: deadline,
        },
        token
      );
      setStatusMsg(`Reserved ${lot.available_quantity_kg} kg of ${lot.crop} and published to Smart Bidding!`);
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create listing.');
    }
  };

  const handlePrepTransport = async (lot: InventoryLot) => {
    if (!token || lot.available_quantity_kg <= 0) return;
    setErrorMsg(null);
    try {
      const prep = await prepareTransportFromLot(
        lot.id,
        {
          quantity_kg: lot.available_quantity_kg,
          route_type: 'farm_to_market',
          destination: 'Mandya APMC Yard',
          estimated_distance_km: 35,
        },
        token
      );
      setTransportPreview(prep as Record<string, unknown>);
      setStatusMsg(`Prepared transport compatibility options for ${lot.crop} (${lot.available_quantity_kg} kg).`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to prepare transport.');
    }
  };

  const handleRunScience = async () => {
    if (!token) return;
    setErrorMsg(null);
    try {
      const [sh, rk] = await Promise.all([
        evaluateShelfLife(
          {
            crop: sciCrop,
            current_temp_c: sciTemp,
            current_rh_pct: sciRh,
            observed_damage_pct: sciDamage,
          },
          token
        ),
        evaluateSpoilageRisk(
          {
            crop: sciCrop,
            storage_duration_days: sciDays,
            current_temp_c: sciTemp,
            current_rh_pct: sciRh,
            observed_damage_pct: sciDamage,
          },
          token
        ),
      ]);
      setShelfResult(sh);
      setRiskResult(rk);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Scientific storage analysis failed.');
    }
  };

  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !facName.trim() || !facLocation.trim()) return;
    setErrorMsg(null);
    try {
      await createManualFacility(
        {
          facility_name: facName.trim(),
          location: facLocation.trim(),
          contact_info: facContact.trim() || undefined,
        },
        token
      );
      setFacName('');
      setFacLocation('');
      setFacContact('');
      setStatusMsg('Saved manual cold storage facility record.');
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save facility.');
    }
  };

  const handleSaveDemoStorageExpense = async () => {
    if (!token || !currentFarm) return;
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + econDays * 86400000).toISOString().slice(0, 10);
    try {
      await createStorageRecord(
        {
          farm_id: currentFarm.id,
          facility_name: 'Planned Cold Storage Reservation Draft',
          facility_source: 'manual',
          commodity: econCommodity,
          quantity_kg: econQty,
          start_date: today,
          expected_retrieval_date: end,
          storage_rate_inr_per_day: Math.round(econStorageCost / Math.max(1, econDays)),
          handling_charges_inr: 0,
          reservation_status: 'draft',
          sync_to_finance: true,
          finance_status: 'estimated',
        },
        token
      );
      setStatusMsg('Saved storage plan draft & synced estimated storage cost to AD-24 Financial Ledger.');
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save storage plan.');
    }
  };

  const selectedProfile = knowledge.find((k) => k.crop.toLowerCase() === sciCrop.toLowerCase()) || knowledge[0];

  const chartData = econResult
    ? [
        {
          name: 'Sell Now',
          NetReturn: econResult.immediate_sale.net_return_inr,
        },
        ...econResult.scenarios.map((s) => ({
          name: `Store (${s.scenario})`,
          NetReturn: s.future_net_return_inr,
        })),
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-amber-100 text-amber-700">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                AD-27 Post-Harvest Intelligence
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{labels.title}</h1>
              <p className="text-xs text-slate-600 mt-0.5">{labels.subtitle}</p>
            </div>
          </div>
          {econResult && (
            <button
              onClick={() => speakSummary(econResult.comparison.summary)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-2 self-start"
            >
              <Volume2 className="w-4 h-4 text-emerald-700" />
              Speak Recommendation
            </button>
          )}
        </div>

        {/* Status / Error Alerts */}
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

        {/* Inventory & Harvest Summary KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Available Produce</div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">
              {(summary?.total_available_kg ?? 0).toLocaleString()} kg
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Reserved (Bidding)</div>
            <div className="text-2xl font-extrabold text-sky-700 mt-1">
              {(summary?.total_reserved_kg ?? 0).toLocaleString()} kg
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Sold Produce</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {(summary?.total_sold_kg ?? 0).toLocaleString()} kg
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Recorded Losses</div>
            <div className="text-2xl font-extrabold text-rose-700 mt-1">
              {((summary?.total_damaged_kg ?? 0) + (summary?.total_discarded_kg ?? 0)).toLocaleString()} kg
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Est. Storage Costs</div>
            <div className="text-2xl font-extrabold text-amber-700 mt-1">
              ₹{(summary?.total_estimated_storage_cost_inr ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          {[
            { id: 'economics', label: 'Sell Now vs Store Simulator', icon: BarChart3 },
            { id: 'inventory', label: 'Harvest & Inventory Lots', icon: Package },
            { id: 'science', label: 'Storage KB, Shelf-Life & Risk', icon: Thermometer },
            { id: 'facilities', label: 'Cold Storage Discovery', icon: Warehouse },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as ActiveTab)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                  tab === t.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: ECONOMIC DECISION SIMULATOR */}
        {tab === 'economics' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Editable Trade-Off Assumptions</h2>
                <button
                  type="button"
                  onClick={handleLoadJuryDemo}
                  className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200"
                >
                  Jury Demo Scenario
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-600">Commodity</label>
                  <input
                    value={econCommodity}
                    onChange={(e) => setEconCommodity(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Quantity (kg)</label>
                  <input
                    type="number"
                    value={econQty}
                    onChange={(e) => setEconQty(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Current Price (₹/kg)</label>
                  <input
                    type="number"
                    value={econCurPrice}
                    onChange={(e) => setEconCurPrice(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Immediate Transport (₹)</label>
                  <input
                    type="number"
                    value={econImmTransport}
                    onChange={(e) => setEconImmTransport(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Storage Duration (days)</label>
                  <input
                    type="number"
                    value={econDays}
                    onChange={(e) => setEconDays(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Expected Future Price (₹/kg)</label>
                  <input
                    type="number"
                    value={econFuturePrice}
                    onChange={(e) => setEconFuturePrice(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Est. Storage Loss (%)</label>
                  <input
                    type="number"
                    value={econLossPct}
                    onChange={(e) => setEconLossPct(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Storage Charges (₹)</label>
                  <input
                    type="number"
                    value={econStorageCost}
                    onChange={(e) => setEconStorageCost(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Future Transport (₹)</label>
                  <input
                    type="number"
                    value={econFutTransport}
                    onChange={(e) => setEconFutTransport(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={runEconomicSimulation}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  Recalculate Trade-Off
                </button>
                <button
                  onClick={handleSaveDemoStorageExpense}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
                >
                  Save Storage Draft to Finance
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              {econResult ? (
                <>
                  <div
                    className={`p-4 rounded-xl border ${
                      econResult.comparison.additional_return_from_storage_inr >= 0
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Economic Decision Summary
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {econResult.comparison.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-slate-500">Immediate Net</div>
                      <div className="text-lg font-bold text-slate-900">
                        ₹{econResult.immediate_sale.net_return_inr.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Gross ₹{econResult.immediate_sale.gross_revenue_inr.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-slate-500">Delayed Net</div>
                      <div className="text-lg font-bold text-emerald-700">
                        ₹{econResult.delayed_sale.net_return_inr.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {econResult.delayed_sale.future_saleable_quantity_kg.toLocaleString()} kg saleable
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-slate-500">Additional Return</div>
                      <div
                        className={`text-lg font-bold ${
                          econResult.comparison.additional_return_from_storage_inr >= 0
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {econResult.comparison.additional_return_from_storage_inr >= 0 ? '+' : ''}₹
                        {econResult.comparison.additional_return_from_storage_inr.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-slate-500">Break-Even Future Price</div>
                      <div className="text-lg font-bold text-sky-700">
                        ₹{econResult.comparison.break_even_future_price_per_kg ?? '—'}/kg
                      </div>
                    </div>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="NetReturn" fill="#059669" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {econResult.monte_carlo && (
                    <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs space-y-1">
                      <div className="font-bold text-sky-900">
                        Monte Carlo Risk Estimate ({econResult.monte_carlo.num_trials} simulated trials)
                      </div>
                      <p className="text-sky-900">
                        Estimated probability that storing outperforms selling now:{' '}
                        <span className="font-bold">
                          {econResult.monte_carlo.prob_store_outperforms_sell_now_pct}%
                        </span>{' '}
                        (P10: ₹{econResult.monte_carlo.p10_net_difference_inr.toLocaleString()} • P50: ₹
                        {econResult.monte_carlo.p50_net_difference_inr.toLocaleString()} • P90: ₹
                        {econResult.monte_carlo.p90_net_difference_inr.toLocaleString()})
                      </p>
                      <p className="text-[11px] text-sky-800">{econResult.disclaimer}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500">Sign in to evaluate Sell Now vs Store economics.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: HARVEST & INVENTORY LOTS */}
        {tab === 'inventory' && (
          <div className="space-y-6">
            <form
              onSubmit={handleCreateHarvestAndLot}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
            >
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Record Harvest &amp; Create Persistent Inventory Lot
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-600">Crop</label>
                  <input
                    value={lotCrop}
                    onChange={(e) => setLotCrop(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Quantity (kg)</label>
                  <input
                    type="number"
                    min={1}
                    value={lotQty}
                    onChange={(e) => setLotQty(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Storage Method</label>
                  <input
                    value={lotMethod}
                    onChange={(e) => setLotMethod(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Location</label>
                  <input
                    value={lotLocation}
                    onChange={(e) => setLotLocation(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Temp (°C)</label>
                  <input
                    value={lotTemp}
                    onChange={(e) => setLotTemp(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">RH (%)</label>
                  <input
                    value={lotRh}
                    onChange={(e) => setLotRh(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Save Harvest &amp; Inventory Lot
              </button>
            </form>

            {harvests.length > 0 && harvests[0].weather_harvest_advice && (
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900">
                <strong>Weather Harvest Window ({harvests[0].weather_harvest_advice.window_status}):</strong>{' '}
                {harvests[0].weather_harvest_advice.guidance}
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Active Post-Harvest Inventory Lots</h3>
              {lots.length === 0 ? (
                <p className="text-xs text-slate-500">No inventory lots recorded yet. Add your first harvested lot above.</p>
              ) : (
                <div className="space-y-3">
                  {lots.map((lot) => (
                    <div
                      key={lot.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-slate-900 text-sm">
                          {lot.crop} ({lot.quality_grade}) — {lot.available_quantity_kg.toLocaleString()} kg available
                        </div>
                        <div className="text-slate-600">
                          Initial: {lot.initial_quantity_kg} kg • Reserved: {lot.reserved_quantity_kg} kg • Sold: {lot.sold_quantity_kg} kg • Damaged/Discarded: {lot.damaged_quantity_kg + lot.discarded_quantity_kg} kg
                        </div>
                        <div className="text-slate-500">
                          {lot.storage_method} @ {lot.storage_location}
                          {lot.recorded_temp_c !== null && lot.recorded_temp_c !== undefined ? ` • ${lot.recorded_temp_c}°C` : ''}
                          {lot.recorded_humidity_pct !== null && lot.recorded_humidity_pct !== undefined ? ` / ${lot.recorded_humidity_pct}% RH` : ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleCreateListing(lot)}
                          disabled={lot.available_quantity_kg <= 0}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <Gavel className="w-3.5 h-3.5" />
                          List on Smart Bidding
                        </button>
                        <button
                          onClick={() => handlePrepTransport(lot)}
                          disabled={lot.available_quantity_kg <= 0}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Prepare Transport
                        </button>
                        <button
                          onClick={() => handleLotAction(lot, 'sale')}
                          disabled={lot.available_quantity_kg <= 0}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold"
                        >
                          -100kg Sold
                        </button>
                        <button
                          onClick={() => handleLotAction(lot, 'damage')}
                          disabled={lot.available_quantity_kg <= 0}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold"
                        >
                          -100kg Loss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {transportPreview && (
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs space-y-2">
                  <div className="font-bold text-sky-900">
                    Transport Connect Compatibility ({String(transportPreview.crop)} — {String(transportPreview.quantity_kg)} kg)
                  </div>
                  <p className="text-sky-900">{String(transportPreview.crop_transport_guidance)}</p>
                  <Link href="/transport" className="inline-block font-semibold text-sky-700 underline">
                    Open Transport Connect to confirm booking →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STORAGE KB, SHELF-LIFE & SPOILAGE RISK */}
        {tab === 'science' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Shelf-Life &amp; Spoilage Risk Analyzer
              </h2>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-600">Crop (15 ICAR/USDA Profiles)</label>
                  <select
                    value={sciCrop}
                    onChange={(e) => setSciCrop(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  >
                    {knowledge.map((k) => (
                      <option key={k.crop} value={k.crop}>
                        {k.crop}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Planned Days</label>
                  <input
                    type="number"
                    value={sciDays}
                    onChange={(e) => setSciDays(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Storage Temp (°C)</label>
                  <input
                    type="number"
                    value={sciTemp}
                    onChange={(e) => setSciTemp(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Relative Humidity (%)</label>
                  <input
                    type="number"
                    value={sciRh}
                    onChange={(e) => setSciRh(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Observed Damage (%)</label>
                  <input
                    type="number"
                    value={sciDamage}
                    onChange={(e) => setSciDamage(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <button
                onClick={handleRunScience}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Analyze Shelf Life &amp; Spoilage Risk
              </button>

              {selectedProfile && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="font-bold text-slate-900">
                    {selectedProfile.crop} Scientific Profile ({selectedProfile.category})
                  </div>
                  <div>
                    <strong>Optimal Temp:</strong> {selectedProfile.recommended_temp_c.min}–{selectedProfile.recommended_temp_c.max}°C ({selectedProfile.recommended_temp_c.note})
                  </div>
                  <div>
                    <strong>RH Range:</strong> {selectedProfile.recommended_rh_pct.min}–{selectedProfile.recommended_rh_pct.max}% • <strong>Refrigeration Needed:</strong> {selectedProfile.requires_refrigeration ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <strong>Chilling Sensitivity:</strong> {selectedProfile.chilling_injury_sensitivity}
                  </div>
                  <div>
                    <strong>Packaging:</strong> {selectedProfile.packaging}
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1">
                    Sources: {selectedProfile.references.join(' • ')}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 space-y-4">
              {shelfResult && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      Rule-Based Shelf-Life Estimate
                    </h3>
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                      {(shelfResult.estimated_remaining_shelf_life_days as { min: number; max: number }).min}–
                      {(shelfResult.estimated_remaining_shelf_life_days as { min: number; max: number }).max} Days
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Inspection interval: every {String(shelfResult.recommended_inspection_interval_hours)} hours.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    {(shelfResult.potential_storage_risks as string[]).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {riskResult && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      Spoilage Risk Assessment
                    </h3>
                    <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold uppercase">
                      {String(riskResult.risk_level)} ({String(riskResult.risk_score_0_100)}/100)
                    </span>
                  </div>
                  <div>
                    <strong>Estimated Loss Range:</strong>{' '}
                    {(riskResult.estimated_loss_range_pct as { min: number; max: number }).min}%–
                    {(riskResult.estimated_loss_range_pct as { min: number; max: number }).max}%
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    {(riskResult.recommended_corrective_actions as string[]).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-slate-500">{String(riskResult.disclaimer)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: COLD STORAGE DISCOVERY */}
        {tab === 'facilities' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleAddFacility}
              className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs"
            >
              <h2 className="text-base font-bold text-slate-900">Add Local / Manual Storage Facility</h2>
              <div>
                <label className="font-semibold text-slate-600">Facility Name</label>
                <input
                  value={facName}
                  onChange={(e) => setFacName(e.target.value)}
                  placeholder="e.g. Mandya Farmers Co-op Cold Store"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600">Address / Location</label>
                <input
                  value={facLocation}
                  onChange={(e) => setFacLocation(e.target.value)}
                  placeholder="e.g. Mysore Road, Mandya"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-600">Contact Info (Optional)</label>
                <input
                  value={facContact}
                  onChange={(e) => setFacContact(e.target.value)}
                  placeholder="+91 ..."
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Save Facility Record
              </button>
            </form>

            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Storage Facilities Directory</h2>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  Google Places: {facilities?.google_places_configured ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              {facilities?.transparency_note && (
                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {facilities.transparency_note}
                </p>
              )}

              <div className="space-y-2.5">
                {[...(facilities?.live_facilities || []), ...(facilities?.manual_facilities || []), ...(facilities?.demonstration_facilities || [])].map(
                  (f, idx) => (
                    <div key={String(f.id || idx)} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-start gap-3">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{String(f.facility_name)}</div>
                        <div className="text-slate-600">{String(f.location)}</div>
                        {Boolean(f.contact_info) && <div className="text-slate-500 mt-0.5">{String(f.contact_info)}</div>}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                          f.is_demonstration ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {f.is_demonstration ? 'Demonstration' : String(f.source || 'Saved')}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
