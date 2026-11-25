// frontend/src/app/journey/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import {
  createJourney,
  fetchJourneyReport,
  getJourneyDetail,
  initDemoJourney,
  JourneyDetailResponse,
  JourneySummary,
  listJourneys,
  recordJourneyActivity,
  updateStageStatus,
} from '@/lib/journeyApi';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Compass,
  FileText,
  Plus,
  Printer,
  Sparkles,
  Sprout,
} from 'lucide-react';

export default function SeedToSaleJourneyPage() {
  const { currentFarm, token } = useFarm();

  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JourneyDetailResponse | null>(null);
  const [selectedStageKey, setSelectedStageKey] = useState<string>('crop_seed_selection');
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newCrop, setNewCrop] = useState(currentFarm?.primary_crop || 'Tomato');
  const [newVariety, setNewVariety] = useState('Arka Rakshak');
  const [newSeason, setNewSeason] = useState('Kharif 2026');
  const [newArea, setNewArea] = useState(2);
  const [newBudget, setNewBudget] = useState(50000);

  const [actTitle, setActTitle] = useState('');
  const [actType, setActType] = useState('field_activity');
  const [actCost, setActCost] = useState(0);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadJourneys = useCallback(async () => {
    if (!token) return;
    try {
      const res = await listJourneys(currentFarm?.id, token);
      setJourneys(res.journeys);
      if (res.journeys.length > 0 && !selectedId) {
        setSelectedId(res.journeys[0].id);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load crop journeys.');
    }
  }, [token, currentFarm?.id, selectedId]);

  const loadDetail = useCallback(async () => {
    if (!token || !selectedId) return;
    try {
      const d = await getJourneyDetail(selectedId, token);
      setDetail(d);
      if (d.progress.current_stage_key) {
        setSelectedStageKey(d.progress.current_stage_key);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load journey detail.');
    }
  }, [token, selectedId]);

  useEffect(() => {
    loadJourneys();
  }, [loadJourneys]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleCreateJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !currentFarm) return;
    setErrorMsg(null);
    const today = new Date().toISOString().slice(0, 10);
    const harvestDate = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    try {
      const created = await createJourney(
        {
          farm_id: currentFarm.id,
          crop_name: newCrop,
          crop_variety: newVariety,
          season: newSeason,
          cultivated_area_acres: newArea,
          cultivation_budget_inr: newBudget,
          planned_sowing_date: today,
          expected_harvest_date: harvestDate,
        },
        token
      );
      setShowCreate(false);
      setSelectedId(created.id);
      setStatusMsg(`Started new Seed-to-Sale journey for ${newCrop} (${newSeason}).`);
      loadJourneys();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create journey.');
    }
  };

  const handleInitDemo = async () => {
    if (!token) return;
    setErrorMsg(null);
    try {
      const res = await initDemoJourney(currentFarm?.id || 'farm_001', token);
      setSelectedId(res.journey_id);
      setStatusMsg('Initialized isolated Jury Tomato Demonstration Journey (2 acres, ₹50,000 budget, 2,000 kg scenario).');
      loadJourneys();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to initialize demo journey.');
    }
  };

  const handleStageStatus = async (stageKey: string, status: string) => {
    if (!token || !selectedId) return;
    setErrorMsg(null);
    try {
      await updateStageStatus(selectedId, stageKey, status, token);
      setStatusMsg(`Updated stage to '${status.replace('_', ' ')}'.`);
      loadDetail();
      loadJourneys();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Stage update failed.');
    }
  };

  const handleRecordActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedId || !actTitle.trim()) return;
    setErrorMsg(null);
    try {
      await recordJourneyActivity(
        selectedId,
        {
          stage_key: selectedStageKey,
          activity_type: actType,
          title: actTitle.trim(),
          recorded_date: new Date().toISOString().slice(0, 10),
          cost_inr: actCost,
        },
        token
      );
      setActTitle('');
      setActCost(0);
      setStatusMsg('Recorded agricultural activity on journey timeline.');
      loadDetail();
      loadJourneys();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record activity.');
    }
  };

  const handleGenerateReport = async () => {
    if (!token || !selectedId) return;
    try {
      const rpt = await fetchJourneyReport(selectedId, token);
      setReportData(rpt);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate report.');
    }
  };

  const activeStage = detail?.stages.find((s) => s.stage_key === selectedStageKey) || detail?.stages[0];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Journey Selector */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                ಬಿತ್ತನೆಯಿಂದ ಮಾರಾಟದವರೆಗೆ • AD-32 Lifecycle Orchestration
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Your Seed-to-Sale Journey</h1>
              <p className="text-xs text-slate-600 mt-0.5">
                One intelligent companion throughout your agricultural lifecycle.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {journeys.length > 0 && (
              <select
                value={selectedId || ''}
                onChange={(e) => setSelectedId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
              >
                {journeys.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.is_demonstration ? '[DEMO] ' : ''}
                    {j.crop_name} ({j.season}) — {j.progress.progress_pct}%
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Journey
            </button>
            <button
              onClick={handleInitDemo}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold"
            >
              Jury Tomato Demo
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

        {/* Create New Journey Form */}
        {showCreate && (
          <form onSubmit={handleCreateJourney} className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-sm space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-900">Create New Seed-to-Sale Crop Journey</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <input value={newCrop} onChange={(e) => setNewCrop(e.target.value)} placeholder="Crop" className="px-3 py-2 rounded-lg border border-slate-300" />
              <input value={newVariety} onChange={(e) => setNewVariety(e.target.value)} placeholder="Variety" className="px-3 py-2 rounded-lg border border-slate-300" />
              <input value={newSeason} onChange={(e) => setNewSeason(e.target.value)} placeholder="Season" className="px-3 py-2 rounded-lg border border-slate-300" />
              <input type="number" value={newArea} onChange={(e) => setNewArea(Number(e.target.value))} placeholder="Area (acres)" className="px-3 py-2 rounded-lg border border-slate-300" />
              <input type="number" value={newBudget} onChange={(e) => setNewBudget(Number(e.target.value))} placeholder="Budget (₹)" className="px-3 py-2 rounded-lg border border-slate-300" />
            </div>
            <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold">
              Start Crop Journey
            </button>
          </form>
        )}

        {detail ? (
          <>
            {/* Journey Hero */}
            <div className="bg-gradient-to-r from-emerald-900 to-teal-800 text-white p-6 rounded-2xl shadow-md grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="text-emerald-200 uppercase font-bold">
                  {detail.journey.is_demonstration ? 'Isolated Jury Demo' : 'Active Crop Journey'}
                </div>
                <div className="text-xl font-extrabold mt-1">
                  {detail.journey.crop_name} ({detail.journey.crop_variety || 'Standard'})
                </div>
                <div className="text-emerald-100 mt-0.5">
                  {detail.farm_name} • {detail.journey.cultivated_area_acres} acres • {detail.journey.season}
                </div>
              </div>
              <div>
                <div className="text-emerald-200">Current Stage</div>
                <div className="text-base font-bold text-amber-200 mt-1">
                  {detail.progress.current_stage_title || 'Completed'}
                </div>
                <div className="text-emerald-100 mt-0.5">{detail.progress.calculation_explanation}</div>
              </div>
              <div>
                <div className="text-emerald-200">Lifecycle Progress</div>
                <div className="text-2xl font-extrabold mt-1">{detail.progress.progress_pct}%</div>
                <div className="w-full bg-emerald-950/60 h-2 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-amber-300 h-2 rounded-full" style={{ width: `${detail.progress.progress_pct}%` }} />
                </div>
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <div className="text-emerald-200">Expected Harvest</div>
                  <div className="text-base font-bold mt-1 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {detail.journey.expected_harvest_date}
                  </div>
                </div>
                <button
                  onClick={handleGenerateReport}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-white text-emerald-900 font-bold text-xs flex items-center gap-1.5 self-start"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Crop-Cycle Report
                </button>
              </div>
            </div>

            {/* 9-Stage Connected Visual Timeline */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Nine-Stage Seed-to-Sale Timeline
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                {detail.stages.map((st) => {
                  const active = st.stage_key === selectedStageKey;
                  const badgeCls =
                    st.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : st.status === 'in_progress' || st.status === 'planning'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : st.status === 'not_applicable'
                      ? 'bg-slate-100 text-slate-500 border-slate-200'
                      : 'bg-white text-slate-700 border-slate-200';
                  return (
                    <button
                      key={st.stage_key}
                      onClick={() => setSelectedStageKey(st.stage_key)}
                      className={`p-3 rounded-xl border text-left transition-all ${badgeCls} ${
                        active ? 'ring-2 ring-emerald-600 shadow-sm' : 'hover:border-emerald-400'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase opacity-75">Stage {st.stage_order}</div>
                      <div className="text-xs font-bold mt-0.5 line-clamp-2">{st.title}</div>
                      <div className="text-[10px] mt-1 font-semibold uppercase">{st.status.replace('_', ' ')}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage Detail + AD-30 Recommended Next Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {activeStage && (
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-emerald-700 font-bold">
                        Stage {activeStage.stage_order} • {activeStage.kannada}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{activeStage.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleStageStatus(activeStage.stage_key, 'completed')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
                      >
                        Mark Completed
                      </button>
                      <button
                        onClick={() => handleStageStatus(activeStage.stage_key, 'in_progress')}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-900 font-semibold"
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => handleStageStatus(activeStage.stage_key, 'not_applicable')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold"
                      >
                        Not Applicable
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                    <strong>Completion Rule:</strong> {activeStage.completion_rule}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {activeStage.route && (
                      <Link
                        href={activeStage.route}
                        className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white font-semibold inline-flex items-center gap-1.5"
                      >
                        Open {activeStage.primary_module} <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {activeStage.secondary_routes?.map((r) => (
                      <Link key={r} href={r} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold">
                        {r}
                      </Link>
                    ))}
                  </div>

                  {/* Record Activity in Stage */}
                  <form onSubmit={handleRecordActivity} className="pt-3 border-t border-slate-200 space-y-2.5">
                    <div className="font-bold text-slate-900">Record Stage Activity</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <select value={actType} onChange={(e) => setActType(e.target.value)} className="px-2.5 py-2 rounded-lg border border-slate-300">
                        <option value="field_activity">Field Activity</option>
                        <option value="sowing">Actual Sowing</option>
                        <option value="irrigation">Irrigation</option>
                        <option value="scouting">Crop Scouting</option>
                        <option value="harvest">Harvest</option>
                      </select>
                      <input
                        value={actTitle}
                        onChange={(e) => setActTitle(e.target.value)}
                        placeholder="Activity description..."
                        className="px-2.5 py-2 rounded-lg border border-slate-300"
                      />
                      <input
                        type="number"
                        min={0}
                        value={actCost}
                        onChange={(e) => setActCost(Number(e.target.value))}
                        placeholder="Expense (₹)"
                        className="px-2.5 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold">
                      Save Activity
                    </button>
                  </form>

                  {activeStage.activities.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <div className="font-bold text-slate-800">Recorded Activities ({activeStage.activities.length})</div>
                      {activeStage.activities.map((a) => (
                        <div key={a.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between">
                          <span>{a.title} ({a.recorded_date})</span>
                          <span className="font-semibold">₹{Number(a.cost_inr || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AD-30 Recommended Next Actions & Financial Summary */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    AD-30 Recommended Next Actions
                  </h3>
                  {detail.recommended_next_actions.map((act) => (
                    <div key={act.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-900">{act.title}</div>
                      <p className="text-slate-600">{act.explanation?.why || act.description}</p>
                      <Link href={act.route} className="inline-block font-semibold text-emerald-700 underline">
                        Open Module →
                      </Link>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
                  <h3 className="text-base font-bold text-slate-900">Lifecycle Financial Summary</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-slate-500">Cultivation Budget</div>
                      <div className="text-base font-bold">₹{detail.financial_overview.cultivation_budget_inr.toLocaleString()}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-slate-500">Recorded Expenses</div>
                      <div className="text-base font-bold">₹{detail.financial_overview.farm_ledger_summary.actual_recorded_expenses_inr.toLocaleString()}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-slate-500">Confirmed Sales</div>
                      <div className="text-base font-bold">₹{detail.financial_overview.farm_ledger_summary.confirmed_sales_value_inr.toLocaleString()}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="text-emerald-800">Verified Received Cash</div>
                      <div className="text-base font-bold text-emerald-700">₹{detail.financial_overview.farm_ledger_summary.received_payments_inr.toLocaleString()}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">{detail.financial_overview.separation_notice}</p>
                </div>
              </div>
            </div>

            {reportData && (
              <div className="bg-white p-6 rounded-2xl border-2 border-emerald-600 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">{String(reportData.report_title)}</h3>
                  <button onClick={() => window.print()} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5" /> Print Report
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-50 border border-slate-200 overflow-x-auto text-[11px]">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-3">
            <Sprout className="w-10 h-10 text-emerald-600 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900">Start Your First Seed-to-Sale Journey</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Create a persistent crop lifecycle journey or launch the isolated Jury Tomato Demonstration Journey.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
