// frontend/src/app/resources/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  createEquipmentBooking,
  EquipmentBooking,
  EquipmentFinancialSummary,
  EquipmentListing,
  fetchEquipmentCategories,
  fetchEquipmentFinancialSummary,
  fetchEquipmentListings,
  fetchEquipmentRecommendations,
  fetchMyBookings,
  recordEquipmentMaintenance,
  registerEquipmentListing,
  runSharedOptimization,
  settleBookingPayment,
  SharedOptimizationResponse,
  updateBookingStatus,
} from '@/lib/equipmentApi';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Cpu,
  Plus,
  Search,
  Sparkles,
  Tractor,
  Users,
  Volume2,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const EQ_LABELS: Record<string, { title: string; subtitle: string }> = {
  en: {
    title: 'RaithaMitra Equipment Connect & Resource Optimization',
    subtitle: 'Machinery marketplace, transactional booking calendar, Google OR-Tools shared tractor scheduling, and weather-aware planning.',
  },
  kn: {
    title: 'ರೈತ ಮಿತ್ರ ಯಂತ್ರೋಪಕರಣ ಸಂಪರ್ಕ ಮತ್ತು ಹಂಚಿಕೆ',
    subtitle: 'ಕೃಷಿ ಯಂತ್ರೋಪಕರಣ ಬಾಡಿಗೆ, ಬುಕಿಂಗ್ ಕ್ಯಾಲೆಂಡರ್ ಮತ್ತು ಹಂಚಿಕೆ ವೆಚ್ಚ ಉಳಿತಾಯ ಯೋಜನೆ.',
  },
  hi: {
    title: 'रैतमित्र उपकरण कनेक्ट और संसाधन अनुकूलन',
    subtitle: 'कृषि मशीनरी किराया, बुकिंग कैलेंडर और साझा ट्रैक्टर लागत अनुकूलन।',
  },
  te: {
    title: 'రైతమిత్ర పరికరాల కనెక్ట్ మరియు వనరుల నిర్వహణ',
    subtitle: 'వ్యవసాయ యంత్రాల అద్దె, బుకింగ్ క్యాలెండర్ మరియు ఉమ్మడి ఖర్చు ఆదా.',
  },
};

type TabKey = 'shared' | 'marketplace' | 'bookings' | 'my_equipment' | 'intelligence';

export default function ResourcesPage() {
  const { currentFarm, currentUser, token, language } = useFarm();
  const labels = EQ_LABELS[String(language)] || EQ_LABELS.en;

  const [tab, setTab] = useState<TabKey>('shared');
  const [categories, setCategories] = useState<string[]>([]);
  const [listings, setListings] = useState<EquipmentListing[]>([]);
  const [bookings, setBookings] = useState<EquipmentBooking[]>([]);
  const [finSummary, setFinSummary] = useState<EquipmentFinancialSummary | null>(null);
  const [recs, setRecs] = useState<Array<Record<string, unknown>>>([]);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [catFilter, setCatFilter] = useState('All');
  const [opFilter, setOpFilter] = useState('');

  // Shared Optimizer state (Jury Demo Scenario defaults, clearly labelled)
  const [sharedRate, setSharedRate] = useState(800);
  const [sharedIndDelivery, setSharedIndDelivery] = useState(1200);
  const [sharedGroupDelivery, setSharedGroupDelivery] = useState(1500);
  const [sharedResult, setSharedResult] = useState<SharedOptimizationResponse | null>(null);
  const [participants, setParticipants] = useState([
    { farmer_label: 'Farmer A', area_acres: 2, required_hours: 2, consented: true },
    { farmer_label: 'Farmer B', area_acres: 3, required_hours: 3, consented: true },
    { farmer_label: 'Farmer C', area_acres: 1, required_hours: 1, consented: true },
  ]);

  // Register Equipment state
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState('Tractor');
  const [newRate, setNewRate] = useState(800);
  const [newCap, setNewCap] = useState(0.45);
  const [newLoc, setNewLoc] = useState(currentFarm ? `${currentFarm.village}, ${currentFarm.district}` : 'Mandya, Karnataka');

  // Booking target
  const [bookingEq, setBookingEq] = useState<EquipmentListing | null>(null);
  const [bookingDate, setBookingDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [bookingHours, setBookingHours] = useState(2);

  // Intelligence op
  const [intelOp, setIntelOp] = useState('Land Preparation');

  const refreshAll = useCallback(async () => {
    try {
      const [cRes, lRes] = await Promise.all([
        fetchEquipmentCategories(),
        fetchEquipmentListings({
          category: catFilter,
          operation: opFilter || undefined,
          latitude: currentFarm?.latitude,
          longitude: currentFarm?.longitude,
        }),
      ]);
      setCategories(['All', ...cRes.categories]);
      setListings(lRes.equipment);
    } catch {
      // non-fatal
    }
    if (!token) return;
    try {
      const [bRes, fRes, rRes] = await Promise.all([
        fetchMyBookings(token),
        fetchEquipmentFinancialSummary(token),
        fetchEquipmentRecommendations(currentFarm?.id, intelOp, token),
      ]);
      setBookings(bRes.bookings);
      setFinSummary(fRes);
      setRecs(rRes.recommendations);
    } catch {
      // non-fatal
    }
  }, [catFilter, opFilter, currentFarm?.latitude, currentFarm?.longitude, currentFarm?.id, token, intelOp]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const handleRunSharedOptimize = useCallback(async () => {
    if (!token) return;
    setErrorMsg(null);
    try {
      const targetDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const res = await runSharedOptimization(
        {
          operation_type: 'Land Preparation',
          target_date: targetDate,
          hourly_rate_inr: sharedRate,
          individual_delivery_charge_inr: sharedIndDelivery,
          shared_delivery_charge_inr: sharedGroupDelivery,
          setup_minutes_between_farms: 0,
          participants,
        },
        token
      );
      setSharedResult(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Shared optimization failed.');
    }
  }, [token, sharedRate, sharedIndDelivery, sharedGroupDelivery, participants]);

  useEffect(() => {
    if (token) handleRunSharedOptimize();
  }, [token, handleRunSharedOptimize]);

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const l = String(language);
    utt.lang = l === 'kn' ? 'kn-IN' : l === 'hi' ? 'hi-IN' : l === 'te' ? 'te-IN' : 'en-IN';
    window.speechSynthesis.speak(utt);
  };

  const handleRegisterEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newName.trim()) return;
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await registerEquipmentListing(
        {
          equipment_name: newName.trim(),
          category: newCat,
          rental_rate_inr: newRate,
          rate_unit: 'hourly',
          effective_field_capacity_ha_hr: newCap,
          location_label: newLoc,
          latitude: currentFarm?.latitude ?? 12.5234,
          longitude: currentFarm?.longitude ?? 76.8976,
          suitable_operations:
            newCat === 'Tractor' || newCat === 'Rotavator'
              ? ['Land Preparation', 'Sowing']
              : newCat === 'Agricultural Drone' || newCat === 'Sprayer'
              ? ['Crop Protection']
              : newCat === 'Combine Harvester' || newCat === 'Thresher'
              ? ['Harvesting', 'Post-Harvest Processing']
              : ['Land Preparation'],
        },
        token
      );
      setNewName('');
      setStatusMsg('Equipment registered in RaithaMitra Equipment Connect!');
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to register equipment.');
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !bookingEq) return;
    setErrorMsg(null);
    setStatusMsg(null);
    const startDt = `${bookingDate}T08:00:00`;
    const endHour = 8 + Math.max(1, Math.round(bookingHours));
    const endDt = `${bookingDate}T${String(Math.min(22, endHour)).padStart(2, '0')}:00:00`;
    try {
      await createEquipmentBooking(
        {
          equipment_id: bookingEq.id,
          farm_id: currentFarm?.id ?? 'farm_001',
          operation_type: bookingEq.suitable_operations[0] || 'Land Preparation',
          booking_date: bookingDate,
          start_datetime: startDt,
          end_datetime: endDt,
          duration_hours: bookingHours,
          farm_area_acres: currentFarm ? Number((currentFarm.land_area_ha / 0.404686).toFixed(2)) : 2.0,
        },
        token
      );
      setStatusMsg(`Booking request submitted for ${bookingEq.equipment_name}.`);
      setBookingEq(null);
      setTab('bookings');
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Booking request failed.');
    }
  };

  const handleBookingAction = async (bookingId: string, status: string) => {
    if (!token) return;
    setErrorMsg(null);
    try {
      await updateBookingStatus(bookingId, status, token);
      setStatusMsg(`Booking updated to ${status}.`);
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Booking update failed.');
    }
  };

  const handleSettleBooking = async (bookingId: string) => {
    if (!token) return;
    setErrorMsg(null);
    try {
      await settleBookingPayment(bookingId, token);
      setStatusMsg('Payment settlement recorded and synced to AD-24 Financial Ledger.');
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Settlement failed.');
    }
  };

  const handleLogMaintenance = async (eqId: string) => {
    if (!token) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      await recordEquipmentMaintenance(
        eqId,
        {
          maintenance_type: 'Routine Engine & Blade Inspection',
          maintenance_date: today,
          operating_hours: 250,
          cost_inr: 1200,
          notes: 'Logged from Equipment Connect workspace',
        },
        token
      );
      setStatusMsg('Maintenance record saved.');
      refreshAll();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Maintenance log failed.');
    }
  };

  const sharedChartData = sharedResult?.schedule
    ? sharedResult.schedule.map((s) => ({
        farmer: s.farmer_label,
        Individual: s.individual_cost_inr,
        Shared: s.allocated_total_inr,
      }))
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-blue-100 text-blue-700">
              <Tractor className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                AD-28 RaithaMitra Equipment Connect
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{labels.title}</h1>
              <p className="text-xs text-slate-600 mt-0.5">{labels.subtitle}</p>
            </div>
          </div>
          {sharedResult?.feasible && (
            <button
              onClick={() =>
                speakText(
                  `Shared tractor scheduling saves ${sharedResult.total_savings_inr} rupees, or ${sharedResult.savings_pct} percent.`
                )
              }
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-2 self-start"
            >
              <Volume2 className="w-4 h-4 text-emerald-700" />
              Speak Savings
            </button>
          )}
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

        {/* Financial & Resource KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Registered Machinery</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{listings.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">My Bookings</div>
            <div className="text-2xl font-extrabold text-sky-700 mt-1">{bookings.length}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Committed Rentals</div>
            <div className="text-2xl font-extrabold text-amber-700 mt-1">
              ₹{(finSummary?.committed_cost_inr ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Settled Payments</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              ₹{(finSummary?.settled_payments_inr ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium">Est. Shared Savings</div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">
              ₹{(finSummary?.estimated_shared_savings_inr ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          {[
            { id: 'shared', label: 'Shared Rental Optimizer (OR-Tools)', icon: Users },
            { id: 'marketplace', label: 'Equipment Marketplace', icon: Search },
            { id: 'bookings', label: 'My Bookings', icon: Calendar },
            { id: 'my_equipment', label: 'My Equipment & Maintenance', icon: Wrench },
            { id: 'intelligence', label: 'Resource Intelligence', icon: Sparkles },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as TabKey)}
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

        {/* TAB 1: SHARED RENTAL OPTIMIZER */}
        {tab === 'shared' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  OR-Tools Shared Scheduling Inputs
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSharedRate(800);
                    setSharedIndDelivery(1200);
                    setSharedGroupDelivery(1500);
                    setParticipants([
                      { farmer_label: 'Farmer A', area_acres: 2, required_hours: 2, consented: true },
                      { farmer_label: 'Farmer B', area_acres: 3, required_hours: 3, consented: true },
                      { farmer_label: 'Farmer C', area_acres: 1, required_hours: 1, consented: true },
                    ]);
                  }}
                  className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
                >
                  Jury Demo Scenario
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="font-semibold text-slate-600">Rate (₹/hr)</label>
                  <input
                    type="number"
                    value={sharedRate}
                    onChange={(e) => setSharedRate(Number(e.target.value))}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Indiv. Delivery (₹)</label>
                  <input
                    type="number"
                    value={sharedIndDelivery}
                    onChange={(e) => setSharedIndDelivery(Number(e.target.value))}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Shared Delivery (₹)</label>
                  <input
                    type="number"
                    value={sharedGroupDelivery}
                    onChange={(e) => setSharedGroupDelivery(Number(e.target.value))}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-semibold text-slate-700">Participating Neighbouring Farmers</div>
                {participants.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <input
                      value={p.farmer_label}
                      onChange={(e) => {
                        const next = [...participants];
                        next[idx].farmer_label = e.target.value;
                        setParticipants(next);
                      }}
                      className="col-span-5 px-2 py-1 rounded border border-slate-300"
                    />
                    <input
                      type="number"
                      value={p.area_acres}
                      onChange={(e) => {
                        const next = [...participants];
                        next[idx].area_acres = Number(e.target.value);
                        setParticipants(next);
                      }}
                      className="col-span-3 px-2 py-1 rounded border border-slate-300"
                      title="Acres"
                    />
                    <input
                      type="number"
                      value={p.required_hours}
                      onChange={(e) => {
                        const next = [...participants];
                        next[idx].required_hours = Number(e.target.value);
                        setParticipants(next);
                      }}
                      className="col-span-3 px-2 py-1 rounded border border-slate-300"
                      title="Hours"
                    />
                    <span className="col-span-1 text-slate-500">h</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleRunSharedOptimize}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Optimize Shared Schedule (OR-Tools CP-SAT)
              </button>
            </div>

            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              {sharedResult?.feasible ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-slate-500">Individual Total</div>
                      <div className="text-lg font-bold text-slate-900">
                        ₹{sharedResult.total_individual_cost_inr?.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="text-emerald-800">Shared Total</div>
                      <div className="text-lg font-bold text-emerald-700">
                        ₹{sharedResult.total_shared_cost_inr?.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="text-emerald-800">Total Savings</div>
                      <div className="text-lg font-bold text-emerald-700">
                        ₹{sharedResult.total_savings_inr?.toLocaleString()} ({sharedResult.savings_pct}%)
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-slate-500">Total Hours</div>
                      <div className="text-lg font-bold text-slate-900">
                        {sharedResult.total_operating_hours} hrs
                      </div>
                    </div>
                  </div>

                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sharedChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="farmer" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Individual" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Shared" fill="#059669" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2">Farmer</th>
                          <th className="px-3 py-2">Window</th>
                          <th className="px-3 py-2">Individual</th>
                          <th className="px-3 py-2">Shared Alloc</th>
                          <th className="px-3 py-2">Savings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sharedResult.schedule?.map((row) => (
                          <tr key={row.farmer_label}>
                            <td className="px-3 py-2 font-semibold">{row.farmer_label} ({row.area_acres} ac)</td>
                            <td className="px-3 py-2">{row.start_time} – {row.end_time}</td>
                            <td className="px-3 py-2">₹{row.individual_cost_inr.toLocaleString()}</td>
                            <td className="px-3 py-2 font-bold text-emerald-700">₹{row.allocated_total_inr.toLocaleString()}</td>
                            <td className="px-3 py-2 text-emerald-700">₹{row.savings_inr.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  {sharedResult?.reason || 'Sign in to run Google OR-Tools Shared Equipment Optimization.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: EQUIPMENT MARKETPLACE */}
        {tab === 'marketplace' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center text-xs">
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                value={opFilter}
                onChange={(e) => setOpFilter(e.target.value)}
                placeholder="Filter operation (e.g. Harvesting, Land Preparation)"
                className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>

            {listings.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                No active machinery listings match your filters yet. Register machinery under &quot;My Equipment &amp; Maintenance&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {listings.map((eq) => (
                  <div key={eq.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]">
                          {eq.category}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">{eq.equipment_name}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-extrabold text-emerald-700">₹{eq.rental_rate_inr}</div>
                        <div className="text-[11px] text-slate-500">/{eq.rate_unit}</div>
                      </div>
                    </div>
                    <div className="text-slate-600">
                      {eq.location_label}
                      {eq.distance_km !== undefined ? ` (${eq.distance_km} km)` : ''}
                    </div>
                    <div className="text-slate-500">
                      Eff. Capacity: {eq.effective_field_capacity_ha_hr} ha/hr • {eq.operator_available ? 'Operator Included' : 'Self-Operated'} • {eq.fuel_included ? 'Fuel Included' : 'Fuel Extra'}
                    </div>
                    <button
                      onClick={() => setBookingEq(eq)}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      Request Rental Booking
                    </button>
                  </div>
                ))}
              </div>
            )}

            {bookingEq && (
              <form
                onSubmit={handleSubmitBooking}
                className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-md space-y-4 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Book: {bookingEq.equipment_name}</h3>
                  <button type="button" onClick={() => setBookingEq(null)} className="text-slate-500 underline">
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600">Booking Date</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600">Duration (hours)</label>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={bookingHours}
                      onChange={(e) => setBookingHours(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>
                <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold">
                  Confirm &amp; Submit Booking Request
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: MY BOOKINGS */}
        {tab === 'bookings' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-slate-900">Equipment Rental Bookings</h2>
            {bookings.length === 0 ? (
              <p className="text-xs text-slate-500">No bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => {
                  const isOwner = b.owner_id === currentUser?.id;
                  return (
                    <div key={b.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {b.equipment_name} — {b.operation_type}
                        </div>
                        <div className="text-slate-600">
                          {b.booking_date} ({b.duration_hours}h) • Total: ₹{b.total_cost_inr.toLocaleString()} • Status:{' '}
                          <span className="font-bold uppercase">{b.status}</span> • Payment:{' '}
                          <span className="font-bold uppercase">{b.payment_status}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isOwner && b.status === 'requested' && (
                          <>
                            <button
                              onClick={() => handleBookingAction(b.id, 'accepted')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleBookingAction(b.id, 'rejected')}
                              className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 font-semibold"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {isOwner && (b.status === 'accepted' || b.status === 'scheduled' || b.status === 'in_progress') && (
                          <button
                            onClick={() => handleBookingAction(b.id, 'completed')}
                            className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold"
                          >
                            Mark Completed
                          </button>
                        )}
                        {b.status === 'completed' && b.payment_status === 'unpaid' && (
                          <button
                            onClick={() => handleSettleBooking(b.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold"
                          >
                            Record Payment Settlement
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MY EQUIPMENT & MAINTENANCE */}
        {tab === 'my_equipment' && (
          <div className="space-y-6">
            <form onSubmit={handleRegisterEquipment} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Register Agricultural Machinery
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Equipment Name (e.g. Mahindra 575 DI)"
                  className="px-3 py-2 rounded-lg border border-slate-300"
                />
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300"
                >
                  {categories.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={newRate}
                  onChange={(e) => setNewRate(Number(e.target.value))}
                  placeholder="Hourly Rate (₹)"
                  className="px-3 py-2 rounded-lg border border-slate-300"
                />
                <input
                  type="number"
                  step="0.05"
                  value={newCap}
                  onChange={(e) => setNewCap(Number(e.target.value))}
                  placeholder="Capacity (ha/hr)"
                  className="px-3 py-2 rounded-lg border border-slate-300"
                />
                <input
                  value={newLoc}
                  onChange={(e) => setNewLoc(e.target.value)}
                  placeholder="Location"
                  className="px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold">
                Publish Equipment Listing
              </button>
            </form>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <h3 className="text-base font-bold text-slate-900">My Registered Machinery</h3>
              {listings.filter((l) => l.owner_id === currentUser?.id).length === 0 ? (
                <p className="text-slate-500">You have not registered any machinery yet.</p>
              ) : (
                listings
                  .filter((l) => l.owner_id === currentUser?.id)
                  .map((eq) => (
                    <div key={eq.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{eq.equipment_name} ({eq.category})</div>
                        <div className="text-slate-600">₹{eq.rental_rate_inr}/{eq.rate_unit} • Status: {eq.maintenance_status}</div>
                      </div>
                      <button
                        onClick={() => handleLogMaintenance(eq.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold"
                      >
                        Log Maintenance
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: RESOURCE INTELLIGENCE */}
        {tab === 'intelligence' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900">
                Farm-Aware Machinery Recommendations &amp; Weather Scheduling
              </h2>
              <select
                value={intelOp}
                onChange={(e) => setIntelOp(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300"
              >
                {['Land Preparation', 'Sowing', 'Crop Protection', 'Harvesting', 'Post-Harvest Processing'].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            {recs.length === 0 ? (
              <p className="text-slate-500">
                No compatible machinery registered yet for {intelOp}. Register a compatible listing to see work-time estimates and weather warnings.
              </p>
            ) : (
              <div className="space-y-3">
                {recs.map((r, i) => {
                  const eq = r.equipment as EquipmentListing;
                  const work = r.work_estimation as { estimated_operating_hours: number; farm_area_ha: number; effective_field_capacity_ha_hr: number };
                  const wx = r.weather_advisory as { warnings: string[] };
                  return (
                    <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="font-bold text-slate-900 text-sm">
                        {eq.equipment_name} ({eq.category}) — Est. Base Cost ₹{String(r.estimated_base_cost_inr)}
                      </div>
                      <div className="text-slate-700">
                        Estimated Operating Time: <strong>{work.estimated_operating_hours} hours</strong> for {work.farm_area_ha} ha at effective capacity {work.effective_field_capacity_ha_hr} ha/hr.
                      </div>
                      {wx.warnings.map((w, wi) => (
                        <div key={wi} className="text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                          {w}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
