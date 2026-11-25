// frontend/src/app/decision-intelligence/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import {
  DecisionEvaluationResponse,
  evaluateDecisions,
  fetchDecisionHistory,
  simulateScenario,
  submitDecisionFeedback,
  updateDecisionPreference,
  updateRecommendationStatus,
} from '@/lib/decisionApi';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Database,
  GitBranch,
  History,
  RotateCw,
  ShieldAlert,
  Sliders,
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

type TabKey = 'action_plan' | 'conflicts' | 'simulator' | 'evidence' | 'history';

const PREFERENCE_OPTIONS = [
  { id: 'balanced', label: 'Balanced Farming' },
  { id: 'max_profit', label: 'Maximum Estimated Profitability' },
  { id: 'min_cost', label: 'Minimum Cultivation Expenditure' },
  { id: 'water_conservation', label: 'Water Conservation' },
  { id: 'low_risk', label: 'Lower Financial Risk' },
  { id: 'sustainable', label: 'Sustainable Farming' },
];

export default function DecisionIntelligencePage() {
  const { currentFarm, token } = useFarm();

  const [tab, setTab] = useState<TabKey>('action_plan');
  const [preference, setPreference] = useState('balanced');
  const [data, setData] = useState<DecisionEvaluationResponse | null>(null);
  const [history, setHistory] = useState<{ runs: Array<Record<string, unknown>>; feedback: Array<Record<string, unknown>> } | null>(null);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // What-if simulator state
  const [simBudget, setSimBudget] = useState(50000);
  const [simSeed, setSimSeed] = useState(4000);
  const [simLabour, setSimLabour] = useState(12000);
  const [simEquip, setSimEquip] = useState(5000);
  const [simYieldKg, setSimYieldKg] = useState(4000);
  const [simPriceKg, setSimPriceKg] = useState(25);
  const [simTransport, setSimTransport] = useState(3000);
  const [simSpoilagePct, setSimSpoilagePct] = useState(8);
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(null);

  // Feedback form
  const [fbNotes, setFbNotes] = useState('');
  const [fbYield, setFbYield] = useState('');

  const runEvaluation = useCallback(async () => {
    if (!token || !currentFarm?.id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [evRes, histRes] = await Promise.all([
        evaluateDecisions({ farm_id: currentFarm.id, preference_profile: preference, persist_run: true }, token),
        fetchDecisionHistory(currentFarm.id, token),
      ]);
      setData(evRes);
      setHistory(histRes);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to evaluate farm decisions.');
    } finally {
      setLoading(false);
    }
  }, [token, currentFarm?.id, preference]);

  useEffect(() => {
    if (token && currentFarm?.id) {
      runEvaluation();
    }
  }, [token, currentFarm?.id, runEvaluation]);

  const handlePreferenceChange = async (newPref: string) => {
    setPreference(newPref);
    if (!token) return;
    try {
      await updateDecisionPreference(newPref, token);
      setStatusMsg(`Updated farmer priority profile to '${newPref}'.`);
    } catch {
      // non-fatal
    }
  };

  const handleRecStatus = async (recId: string, status: string) => {
    if (!token) return;
    try {
      await updateRecommendationStatus(recId, status, token);
      setStatusMsg(`Marked recommendation as ${status}.`);
      runEvaluation();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update recommendation.');
    }
  };

  const handleSimulate = async () => {
    if (!token || !currentFarm) return;
    try {
      const res = await simulateScenario(
        {
          farm_id: currentFarm.id,
          crop: currentFarm.primary_crop,
          farm_area_acres: Number((currentFarm.land_area_ha / 0.404686).toFixed(2)),
          cultivation_budget_inr: simBudget,
          available_water_m3: currentFarm.available_water_m3,
          expected_yield_kg: simYieldKg,
          seed_expense_inr: simSeed,
          labour_expense_inr: simLabour,
          equipment_expense_inr: simEquip,
          other_cultivation_inr: 10000,
          market_price_per_kg: simPriceKg,
          transport_cost_inr: simTransport,
          estimated_spoilage_pct: simSpoilagePct,
        },
        token
      );
      setSimResult(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Simulation failed.');
    }
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !currentFarm || !fbNotes.trim()) return;
    try {
      await submitDecisionFeedback(
        {
          run_id: data?.run_id,
          farm_id: currentFarm.id,
          followed: true,
          actual_yield_kg: fbYield ? Number(fbYield) : undefined,
          outcome_notes: fbNotes.trim(),
        },
        token
      );
      setFbNotes('');
      setFbYield('');
      setStatusMsg('Recorded farmer outcome feedback.');
      runEvaluation();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record feedback.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                AD-30 Centralized Agricultural Decision Intelligence
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                Unified Farm Decision &amp; Conflict Resolution Engine
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                OBSERVE → PREDICT → SIMULATE → OPTIMIZE → ACT → EVALUATE across Weather, Finance, Satellite, Post-Harvest, Equipment, and Market Intelligence.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={preference}
              onChange={(e) => handlePreferenceChange(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
            >
              {PREFERENCE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  Priority: {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={runEvaluation}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Re-Evaluate Farm
            </button>
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

        {/* Farm Context KPI Strip */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500">Selected Farm</div>
              <div className="text-sm font-bold text-slate-900 mt-1">{data.farm_context.farm_name}</div>
              <div className="text-[11px] text-emerald-700">{data.farm_context.crop} ({data.farm_context.crop_stage})</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500">Remaining Budget</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">
                ₹{data.farm_context.budget_remaining_inr.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500">of ₹{data.farm_context.budget_allocated_inr.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500">48h Weather / Demand</div>
              <div className="text-xl font-extrabold text-sky-700 mt-1">
                {data.farm_context.weather.rain_48h_mm} mm rain
              </div>
              <div className="text-[11px] text-slate-500">
                Demand: {data.farm_context.weather.water_demand_mm_day ?? '—'} mm/day
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500">Conflicts Detected</div>
              <div className="text-xl font-extrabold text-amber-700 mt-1">{data.conflicts.length}</div>
              <div className="text-[11px] text-slate-500">Cross-module checks</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500">Evidence Collected</div>
              <div className="text-xl font-extrabold text-emerald-700 mt-1">{data.evidence.length}</div>
              <div className="text-[11px] text-slate-500">{data.unavailable_modules.length} unavailable</div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          {[
            { id: 'action_plan', label: 'Prioritized Action Plan & Graph', icon: GitBranch },
            { id: 'conflicts', label: 'Conflict Resolution Center', icon: ShieldAlert },
            { id: 'simulator', label: 'Cross-Module What-If Simulator', icon: Sliders },
            { id: 'evidence', label: 'Evidence & Transparency', icon: Database },
            { id: 'history', label: 'Decision History & Feedback', icon: History },
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

        {/* TAB 1: PRIORITIZED ACTION PLAN & DECISION GRAPH */}
        {tab === 'action_plan' && data && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Ranked Multi-Objective Recommendations</h2>
                <span className="text-[11px] text-slate-500">{data.action_plan.scoring_note}</span>
              </div>
              <div className="space-y-3">
                {data.action_plan.ranked_recommendations.map((rec) => (
                  <div key={rec.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${rec.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'}`}>
                          {rec.priority}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">{rec.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                          Score: {rec.heuristic_ranking_score}/100
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {rec.feasible ? 'Feasible' : 'Constraint Blocked'}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-700">{rec.description}</p>
                    <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1 text-[11px] text-slate-600">
                      <div><strong>Why:</strong> {rec.explanation.why}</div>
                      <div><strong>Modules:</strong> {rec.explanation.modules_contributed.join(', ')} • <strong>Data:</strong> {rec.explanation.data_used}</div>
                      <div><strong>What could change this:</strong> {rec.explanation.what_could_change}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Link href={rec.route} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold flex items-center gap-1">
                        Open Module <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => handleRecStatus(rec.id, 'accepted')} className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold">
                        Accept
                      </button>
                      <button onClick={() => handleRecStatus(rec.id, 'deferred')} className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">
                        Defer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dependency Graph */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-base font-bold text-slate-900">Seed-to-Sale Decision Dependency Graph</h3>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2 text-xs">
                {data.action_plan.decision_graph.map((node) => (
                  <div key={node.step} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="font-bold text-emerald-700">Step {node.step}</div>
                    <div className="font-semibold text-slate-900">{node.node}</div>
                    <div className="text-[11px] text-slate-600">{node.detail}</div>
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-200 text-[10px] font-semibold uppercase">
                      {node.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONFLICT RESOLUTION CENTER */}
        {tab === 'conflicts' && data && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Cross-Module Conflict Resolution Center</h2>
            {data.conflicts.length === 0 ? (
              <p className="text-xs text-slate-500">No acute cross-module conflicts detected for current farm conditions.</p>
            ) : (
              <div className="space-y-3">
                {data.conflicts.map((c) => (
                  <div key={c.conflict_id} className="p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 text-sm">{c.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold uppercase text-[11px]">
                        {c.severity}
                      </span>
                    </div>
                    <div className="text-amber-800"><strong>Sources:</strong> {c.modules.join(' ↔ ')}</div>
                    <p className="text-slate-800">{c.description}</p>
                    <p className="text-emerald-900 font-semibold">Resolution: {c.resolution}</p>
                    <Link href={c.route} className="inline-block font-semibold text-emerald-700 underline">
                      Go to Module →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WHAT-IF SCENARIO SIMULATOR */}
        {tab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <h2 className="text-base font-bold text-slate-900">What-If Cross-Module Simulator</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600">Budget (₹)</label>
                  <input type="number" value={simBudget} onChange={(e) => setSimBudget(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Seed Expense (₹)</label>
                  <input type="number" value={simSeed} onChange={(e) => setSimSeed(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Labour Expense (₹)</label>
                  <input type="number" value={simLabour} onChange={(e) => setSimLabour(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Equipment Expense (₹)</label>
                  <input type="number" value={simEquip} onChange={(e) => setSimEquip(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Expected Yield (kg)</label>
                  <input type="number" value={simYieldKg} onChange={(e) => setSimYieldKg(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Market Price (₹/kg)</label>
                  <input type="number" value={simPriceKg} onChange={(e) => setSimPriceKg(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Transport Cost (₹)</label>
                  <input type="number" value={simTransport} onChange={(e) => setSimTransport(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300" />
                </div>
                <div>
                  <label className="font-semibold text-slate-600">Spoilage (%)</label>
                  <input type="number" value={simSpoilagePct} onChange={(e) => setSimSpoilagePct(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300" />
                </div>
              </div>
              <button onClick={handleSimulate} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold">
                Simulate Cross-Module Outcome
              </button>
            </div>

            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
              {simResult ? (
                <>
                  {(() => {
                    const ec = simResult.economics as Record<string, unknown>;
                    const bands = simResult.sensitivity_bands as Array<{ scenario: string; net_profit_inr: number }>;
                    return (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="text-slate-500">Total Investment</div>
                            <div className="text-base font-bold">₹{Number(ec.total_investment_inr).toLocaleString()}</div>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="text-slate-500">Est. Net Profit</div>
                            <div className="text-base font-bold text-emerald-700">₹{Number(ec.net_profit_inr).toLocaleString()}</div>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="text-slate-500">Est. ROI</div>
                            <div className="text-base font-bold">{String(ec.roi_pct)}%</div>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="text-slate-500">Break-Even Price</div>
                            <div className="text-base font-bold text-sky-700">₹{String(ec.break_even_price_per_kg)}/kg</div>
                          </div>
                        </div>
                        <div className="h-52 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bands}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="scenario" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip />
                              <Bar dataKey="net_profit_inr" fill="#059669" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[11px] text-slate-500">{String(simResult.disclaimer)}</p>
                      </>
                    );
                  })()}
                </>
              ) : (
                <p className="text-slate-500">Click &quot;Simulate Cross-Module Outcome&quot; to test budget, spoilage, and price sensitivity without altering actual records.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: EVIDENCE & TRANSPARENCY */}
        {tab === 'evidence' && data && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <h2 className="text-base font-bold text-slate-900">Centralized Evidence Registry &amp; Provenance</h2>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Module</th>
                    <th className="px-3 py-2">Provider</th>
                    <th className="px-3 py-2">Classification</th>
                    <th className="px-3 py-2">Freshness</th>
                    <th className="px-3 py-2">Limitations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.evidence.map((ev) => (
                    <tr key={ev.evidence_id}>
                      <td className="px-3 py-2 font-semibold">{ev.source_module}</td>
                      <td className="px-3 py-2">{ev.source_provider}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">{ev.classification}</span>
                      </td>
                      <td className="px-3 py-2">{ev.freshness}</td>
                      <td className="px-3 py-2 text-slate-500">{ev.limitations || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: DECISION HISTORY & FEEDBACK */}
        {tab === 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
            <form onSubmit={handleSaveFeedback} className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-slate-900">Record Farmer Outcome Feedback</h2>
              <input
                type="number"
                value={fbYield}
                onChange={(e) => setFbYield(e.target.value)}
                placeholder="Actual Harvested Yield (kg, optional)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
              <textarea
                rows={3}
                value={fbNotes}
                onChange={(e) => setFbNotes(e.target.value)}
                placeholder="Observed outcome (e.g. Delayed irrigation 48h after forecast rain, saved pumping cost)..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
              <button type="submit" className="w-full py-2 rounded-xl bg-emerald-600 text-white font-semibold">
                Save Outcome Feedback
              </button>
            </form>

            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-slate-900">Persisted Decision Runs ({history?.runs?.length ?? 0})</h2>
              <div className="space-y-2">
                {(history?.runs || []).map((r) => (
                  <div key={String(r.id)} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="font-semibold text-slate-900">{String(r.summary_text)}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Profile: {String(r.preference_profile)} • {String(r.created_at).slice(0, 19)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
