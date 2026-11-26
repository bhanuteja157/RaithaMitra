// frontend/src/features/disease-surveillance/SurveillanceDashboard.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useFarm } from '@/context/FarmContext';
import {
  AlertStatus,
  DiseaseAlertItem,
  diseaseSurveillanceApi,
  FarmRiskResponse,
  GuidanceProfile,
  RiskLevel,
  SurveillanceMapResponse,
  SurveillanceReport,
} from '@/lib/diseaseSurveillanceApi';
import {
  SURVEILLANCE_TRANSLATIONS,
  SurveillanceLang,
} from '@/features/disease-surveillance/translations';
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  Eye,
  Filter,
  FlaskConical,
  Info,
  Loader2,
  MapPin,
  PlusCircle,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wind,
  XCircle,
} from 'lucide-react';

const DiseaseSurveillanceMap = dynamic(() => import('./DiseaseSurveillanceMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-xs text-zinc-500">
      Loading OpenStreetMap disease surveillance layer...
    </div>
  ),
});

const PRIORITY_CROPS = [
  'All',
  'Tomato',
  'Chilli',
  'Paddy',
  'Maize',
  'Potato',
  'Cotton',
  'Onion',
  'Groundnut',
];

function riskBadgeStyle(level: RiskLevel | string): string {
  switch (level) {
    case 'Critical':
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800';
    case 'High':
      return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800';
    case 'Moderate':
      return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    case 'Low':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
  }
}

export default function SurveillanceDashboard() {
  const { currentFarm, currentUser, token, language, isAuthenticated } = useFarm();

  // Local 4-language selector (supports en/kn/hi/te without modifying global translations.ts)
  const [localLang, setLocalLang] = useState<SurveillanceLang>(
    language === 'kn' || language === 'hi' ? language : 'en'
  );
  useEffect(() => {
    if (language === 'en' || language === 'kn' || language === 'hi') {
      setLocalLang(language);
    }
  }, [language]);
  const copy = SURVEILLANCE_TRANSLATIONS[localLang];

  // Mode toggle: Live Community Data vs. Isolated Demonstration Scenario
  const [demoMode, setDemoMode] = useState<boolean>(false);

  // Filters
  const [cropFilter, setCropFilter] = useState<string>('All');
  const [diseaseFilter, setDiseaseFilter] = useState<string>('');
  const [radiusKm, setRadiusKm] = useState<number>(35);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showRiskZones, setShowRiskZones] = useState<boolean>(true);

  // Loaded data states
  const [mapData, setMapData] = useState<SurveillanceMapResponse | null>(null);
  const [riskData, setRiskData] = useState<FarmRiskResponse | null>(null);
  const [alerts, setAlerts] = useState<DiseaseAlertItem[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(0);
  const [myReports, setMyReports] = useState<SurveillanceReport[]>([]);
  const [guidance, setGuidance] = useState<GuidanceProfile[]>([]);
  const [guidanceCrop, setGuidanceCrop] = useState<string>('Tomato');
  const [guidanceSafetyNote, setGuidanceSafetyNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Report submission state
  const [reportCrop, setReportCrop] = useState<string>(currentFarm?.primary_crop || 'Tomato');
  const [reportDisease, setReportDisease] = useState<string>('Early Blight (Alternaria solani)');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reportAreaHa, setReportAreaHa] = useState<string>('0.5');
  const [reportSymptomsText, setReportSymptomsText] = useState<string>(
    'Concentric dark rings on lower leaves, yellow halo'
  );
  const [reportSource, setReportSource] = useState<'manual_farmer_report' | 'crop_diagnostics_ai'>(
    'manual_farmer_report'
  );
  const [reportConfidence, setReportConfidence] = useState<string>('0.82');
  const [reportNotes, setReportNotes] = useState<string>('');
  const [reportImageRef, setReportImageRef] = useState<string>('');
  const [reportConsent, setReportConsent] = useState<boolean>(false);
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadAll = useCallback(async () => {
    if (!token) {
      setErrorMsg('Please sign in (or select a Demo role) to access authenticated disease surveillance.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const farmId = currentFarm?.id;
      const [mapRes, alertsRes, mineRes, guideRes] = await Promise.all([
        diseaseSurveillanceApi.getMapIntelligence(
          {
            farm_id: farmId,
            crop: cropFilter,
            disease: diseaseFilter || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            radius_km: radiusKm,
            demo_mode: demoMode,
          },
          token
        ),
        diseaseSurveillanceApi.getAlerts({ demo_mode: demoMode }, token),
        diseaseSurveillanceApi.getReports({ mine_only: true, demo_mode: false }, token),
        diseaseSurveillanceApi.getGuidance(guidanceCrop, token),
      ]);

      setMapData(mapRes);
      setAlerts(alertsRes.alerts);
      setUnreadAlerts(alertsRes.unread_count);
      setMyReports(mineRes.reports);
      setGuidance(guideRes.guidance);
      setGuidanceSafetyNote(guideRes.safety_note);

      if (currentUser?.role === 'farmer' || currentUser?.role === 'admin') {
        const rRes = await diseaseSurveillanceApi.getFarmRisk(
          { farm_id: farmId, radius_km: radiusKm, demo_mode: demoMode, sync_alerts: true },
          token
        );
        setRiskData(rRes);
        const refreshedAlerts = await diseaseSurveillanceApi.getAlerts({ demo_mode: demoMode }, token);
        setAlerts(refreshedAlerts.alerts);
        setUnreadAlerts(refreshedAlerts.unread_count);
      } else {
        setRiskData(null);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load surveillance data.');
    } finally {
      setLoading(false);
    }
  }, [token, currentFarm?.id, currentUser?.role, cropFilter, diseaseFilter, dateFrom, dateTo, radiusKm, demoMode, guidanceCrop]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadAll();
    }
  }, [isAuthenticated, token, loadAll]);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFarm?.id) {
      setSubmitFeedback({ type: 'err', text: 'No active farm selected for your account.' });
      return;
    }
    setSubmittingReport(true);
    setSubmitFeedback(null);
    try {
      const symptoms = reportSymptomsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const isAi = reportSource === 'crop_diagnostics_ai';
      await diseaseSurveillanceApi.createReport(
        {
          farm_id: currentFarm.id,
          crop: reportCrop,
          disease_name: reportDisease,
          observation_date: reportDate,
          affected_area_ha: Math.max(0.05, Number(reportAreaHa) || 0.5),
          symptoms,
          notes: reportNotes || undefined,
          image_reference: reportImageRef || undefined,
          diagnostic_confidence: isAi ? Math.max(0, Math.min(1, Number(reportConfidence) || 0.75)) : undefined,
          verification_status: isAi ? 'ai_suspected' : 'farmer_reported',
          data_source: reportSource,
          anonymous_community_consent: reportConsent,
        },
        token
      );
      setSubmitFeedback({
        type: 'ok',
        text: reportConsent
          ? 'Disease observation saved and anonymized community signal shared.'
          : 'Private farm observation saved (not published to community views without consent).',
      });
      await loadAll();
    } catch (err: any) {
      setSubmitFeedback({ type: 'err', text: err?.message || 'Failed to submit disease report.' });
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleAlertAction = async (alertId: string, status: AlertStatus) => {
    try {
      await diseaseSurveillanceApi.updateAlertStatus(alertId, status, token);
      const refreshed = await diseaseSurveillanceApi.getAlerts({ demo_mode: demoMode }, token);
      setAlerts(refreshed.alerts);
      setUnreadAlerts(refreshed.unread_count);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update alert status.');
    }
  };

  const risk = riskData?.risk_assessment;
  const markers = mapData?.markers ?? [];
  const clusters = mapData?.outbreak_clusters ?? [];
  const districts = mapData?.district_summaries ?? [];
  const trendData = mapData?.daily_trend_14d ?? [];

  const confirmedCount = useMemo(
    () => markers.filter((m) => m.verification_status === 'expert_confirmed').length,
    [markers]
  );
  const aiSuspectedCount = useMemo(
    () => markers.filter((m) => m.verification_status === 'ai_suspected').length,
    [markers]
  );

  return (
    <div className="space-y-5 pb-12">
      {/* Hero Header + Language & Honest Demonstration Toggle */}
      <div className="p-5 sm:p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 shrink-0">
              <Radar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                  {copy.title}
                </h1>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    demoMode
                      ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {demoMode ? copy.demoModeLabel : copy.liveModeLabel}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{copy.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Local 4-language switcher */}
            <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-0.5 text-[11px]">
              {(
                [
                  ['en', 'EN'],
                  ['kn', 'ಕನ್ನಡ'],
                  ['hi', 'हिन्दी'],
                  ['te', 'తెలుగు'],
                ] as [SurveillanceLang, string][]
              ).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLocalLang(code)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    localLang === code
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Isolated Demo Mode Switch */}
            <button
              type="button"
              onClick={() => setDemoMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                demoMode
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              {demoMode ? 'Exit Demo Scenario' : 'Try Demonstration Scenario'}
            </button>
          </div>
        </div>

        {demoMode && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{copy.demoBanner}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-2">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={loadAll}
              className="px-2.5 py-1 rounded-lg bg-rose-700 text-white text-[11px] font-semibold"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* 1. Regional Overview & Provenance KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-zinc-500">{copy.regionalOverview}</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            {markers.length}
            <span className="text-xs font-medium text-zinc-500">reports within {radiusKm} km</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            {confirmedCount} confirmed · {aiSuspectedCount} AI-suspected
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-zinc-500">{copy.personalizedRisk}</div>
          <div className="flex items-center gap-2 pt-0.5">
            <span
              className={`px-2.5 py-1 rounded-lg border text-sm font-bold ${riskBadgeStyle(
                risk?.risk_level || 'Insufficient evidence'
              )}`}
            >
              {risk?.risk_level || (loading ? 'Computing...' : 'Insufficient evidence')}
            </span>
            {risk?.heuristic_risk_index != null && (
              <span className="text-xs font-semibold text-zinc-500">
                ({risk.heuristic_risk_index}/100)
              </span>
            )}
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            {risk?.primary_threat_disease || `Crop: ${currentFarm?.primary_crop || 'Tomato'}`}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-zinc-500">{copy.outbreakClusters}</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">
            {clusters.length}{' '}
            <span className="text-xs font-medium text-zinc-500">active cluster(s)</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            {clusters.filter((c) => c.classification === 'confirmed_outbreak').length} confirmed outbreak ·{' '}
            {clusters.filter((c) => c.classification === 'suspected_cluster').length} suspected
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-zinc-500">{copy.alertHistory}</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            {alerts.length}
            {unreadAlerts > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-rose-600 text-white">
                {unreadAlerts} new
              </span>
            )}
          </div>
          <div className="text-[11px] text-zinc-500">In-app verified farm warnings</div>
        </div>
      </div>

      {/* 2. Interactive Map + Filters + Personalized Farm Risk Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map & Filter Controls (2 cols) */}
        <div className="lg:col-span-2 p-4 sm:p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-700" />
              {copy.hotspotMap}
            </h2>
            <div className="flex items-center gap-2 text-[11px]">
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHeatmap}
                  onChange={(e) => setShowHeatmap(e.target.checked)}
                  className="accent-emerald-700"
                />
                Heatmap
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRiskZones}
                  onChange={(e) => setShowRiskZones(e.target.checked)}
                  className="accent-emerald-700"
                />
                Risk Zones
              </label>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />}
            </div>
          </div>

          {/* Filter Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div>
              <label className="block text-[10px] text-zinc-500 mb-0.5">{copy.cropFilter}</label>
              <select
                value={cropFilter}
                onChange={(e) => setCropFilter(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs"
              >
                {PRIORITY_CROPS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-0.5">{copy.diseaseFilter}</label>
              <input
                type="text"
                value={diseaseFilter}
                onChange={(e) => setDiseaseFilter(e.target.value)}
                placeholder="e.g. Blight, Blast"
                className="w-full px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-0.5">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-0.5">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-0.5">
                {copy.radiusLabel}: <strong>{radiusKm}</strong>
              </label>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full accent-emerald-700 mt-1"
              />
            </div>
          </div>

          <DiseaseSurveillanceMap
            mapData={mapData}
            showHeatmap={showHeatmap}
            showRiskZones={showRiskZones}
          />

          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>{mapData?.privacy_notice || copy.privacyNotice}</span>
          </div>

          {/* District Summaries */}
          {districts.length > 0 && (
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                District Surveillance Summary
              </div>
              <div className="flex flex-wrap gap-2">
                {districts.map((d) => (
                  <div
                    key={d.district}
                    className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs"
                  >
                    <strong>{d.district}:</strong> {d.report_count} report(s) across{' '}
                    {d.independent_farms_count} farm(s)
                    {d.leading_disease ? ` · Top: ${d.leading_disease}` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Personalized Risk Assessment Panel (1 col) */}
        <div className="p-4 sm:p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              {copy.personalizedRisk}
            </h2>

            {risk ? (
              <>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Farm &amp; Stage</span>
                    <span className="font-semibold">
                      {risk.crop} ({risk.crop_stage})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Transmission Mode</span>
                    <span className="font-semibold capitalize">
                      {risk.transmission_mode.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 flex items-center gap-1">
                      <Wind className="w-3 h-3" /> Wind Vector Used
                    </span>
                    <span className="font-semibold">
                      {risk.wind_dispersal_considered ? 'Yes (airborne)' : 'No (non-wind / N/A)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Weather Telemetry</span>
                    <span className="font-semibold">
                      {risk.weather_summary.weather_available
                        ? `${risk.weather_summary.temperature_c}°C · ${risk.weather_summary.humidity_pct}% RH`
                        : 'Unavailable'}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Explainable Contributing Factors
                  </div>
                  <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300 list-disc pl-4">
                    {risk.contributing_factors.map((f, idx) => (
                      <li key={idx}>{f}</li>
                    ))}
                  </ul>
                </div>

                {risk.limitations.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1">
                    <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Limitations &amp; Uncertainty
                    </div>
                    {risk.limitations.map((l, idx) => (
                      <div key={idx}>• {l}</div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500">
                Sign in with a farmer account owning a mapped farm to compute parcel-level disease risk.
              </div>
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{risk?.disclaimer || copy.kvkDisclaimer}</span>
          </div>
        </div>
      </div>

      {/* 3. Suspected Clusters + 14-Day Activity Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-600" />
            {copy.outbreakClusters}
          </h2>
          {clusters.length === 0 ? (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500">
              No spatial outbreak clusters detected across multiple independent farms in the current filter window. Single-farm observations never trigger a false regional outbreak.
            </div>
          ) : (
            <div className="space-y-2.5">
              {clusters.map((cl) => (
                <div
                  key={cl.cluster_id}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {cl.crop} — {cl.disease_name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        cl.classification === 'confirmed_outbreak'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {cl.classification.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-300">
                    <strong>{cl.independent_farms_count}</strong> independent farms ·{' '}
                    <strong>{cl.total_reports_count}</strong> reports · Region: {cl.approximate_region} (~
                    {cl.cluster_radius_km} km radius)
                  </div>
                  <div className="text-[11px] text-zinc-500 flex flex-wrap gap-3">
                    <span>Confirmed: {cl.expert_confirmed_count}</span>
                    <span>AI-Suspected: {cl.ai_suspected_count}</span>
                    <span>7d change: {cl.activity_trend_pct >= 0 ? `+${cl.activity_trend_pct}%` : `${cl.activity_trend_pct}%`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-700" />
            {copy.activityTrends}
          </h2>
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => String(d).slice(5)}
                  tick={{ fontSize: 10 }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="reports" fill="#059669" radius={[4, 4, 0, 0]} name="Reports" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Alert History + Community Reporting Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Alert History */}
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              {copy.alertHistory}
            </h2>
            <span className="text-[11px] text-zinc-500">In-app warnings only</span>
          </div>

          {alerts.length === 0 ? (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500">
              No active disease alerts for your farm in this mode.
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {alerts.map((al) => (
                <div
                  key={al.id}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {al.crop} — {al.disease_name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold ${riskBadgeStyle(
                          al.risk_level
                        )}`}
                      >
                        {al.risk_level}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] capitalize">
                        {al.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300">{al.reason}</p>
                  <div className="text-[11px] text-zinc-500">
                    <strong>Follow-up:</strong> {al.followup_inspection}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {al.status === 'unread' && (
                      <button
                        type="button"
                        onClick={() => handleAlertAction(al.id, 'read')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[11px] font-medium"
                      >
                        <Eye className="w-3 h-3" /> {copy.markRead}
                      </button>
                    )}
                    {al.status !== 'acknowledged' && (
                      <button
                        type="button"
                        onClick={() => handleAlertAction(al.id, 'acknowledged')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-medium"
                      >
                        <CheckCircle2 className="w-3 h-3" /> {copy.acknowledge}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAlertAction(al.id, 'dismissed')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium"
                    >
                      <XCircle className="w-3 h-3" /> {copy.dismiss}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Community Disease Reporting Form */}
        <form
          onSubmit={handleSubmitReport}
          className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3 text-xs"
        >
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-emerald-700" />
            {copy.reportDisease}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1">Crop</label>
              <select
                value={reportCrop}
                onChange={(e) => setReportCrop(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              >
                {PRIORITY_CROPS.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Observation Date</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                required
                className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Suspected Disease</label>
              <input
                type="text"
                value={reportDisease}
                onChange={(e) => setReportDisease(e.target.value)}
                required
                className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Affected Area (ha)</label>
              <input
                type="number"
                step="0.1"
                min="0.05"
                value={reportAreaHa}
                onChange={(e) => setReportAreaHa(e.target.value)}
                required
                className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Observation Source</label>
              <select
                value={reportSource}
                onChange={(e) => setReportSource(e.target.value as any)}
                className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              >
                <option value="manual_farmer_report">Manual Farmer Field Observation</option>
                <option value="crop_diagnostics_ai">From AI Crop Diagnostics Result</option>
              </select>
            </div>
            {reportSource === 'crop_diagnostics_ai' && (
              <div>
                <label className="block text-[11px] font-semibold mb-1">
                  Diagnostic Confidence (0–1)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={reportConfidence}
                  onChange={(e) => setReportConfidence(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1">
              Observed Symptoms (comma-separated)
            </label>
            <input
              type="text"
              value={reportSymptomsText}
              onChange={(e) => setReportSymptomsText(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1">
                Optional Image Reference
              </label>
              <input
                type="text"
                value={reportImageRef}
                onChange={(e) => setReportImageRef(e.target.value)}
                placeholder="e.g. tomato_leaf_scan_01.jpg"
                className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Field Notes</label>
              <input
                type="text"
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="Optional field notes"
                className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
            <input
              type="checkbox"
              checked={reportConsent}
              onChange={(e) => setReportConsent(e.target.checked)}
              className="mt-0.5 accent-emerald-700"
            />
            <span className="text-[11px] text-zinc-700 dark:text-zinc-300">{copy.consentLabel}</span>
          </label>

          {submitFeedback && (
            <div
              className={`p-2.5 rounded-xl text-[11px] ${
                submitFeedback.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              {submitFeedback.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submittingReport || !token}
            className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {submittingReport ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {copy.submitReport}
          </button>
        </form>
      </div>

      {/* 5. Nearby Community Observations & Data Provenance + My Reports */}
      <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
            {copy.nearbyReports} ({markers.length})
          </h2>
          <span className="text-[11px] text-zinc-500">
            {copy.dataProvenance}: {demoMode ? 'Demonstration Simulation' : 'Consented Farmer & AI Reports'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 text-[11px]">
                <th className="py-2 pr-3">Crop &amp; Disease</th>
                <th className="py-2 pr-3">Verification</th>
                <th className="py-2 pr-3">Date &amp; Distance</th>
                <th className="py-2 pr-3">Region (Privacy Masked)</th>
                <th className="py-2">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {markers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-zinc-500 text-center">
                    No consented community observations in the selected filters.
                  </td>
                </tr>
              ) : (
                markers.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 pr-3 font-medium">
                      {r.crop} · {r.disease_name}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold capitalize">
                        {r.verification_status.replace('_', ' ')}
                        {r.diagnostic_confidence != null ? ` (${Math.round(r.diagnostic_confidence * 100)}%)` : ''}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-600 dark:text-zinc-400">
                      {r.observation_date}
                      {r.distance_km != null ? ` · ~${r.distance_km} km` : ''}
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-600 dark:text-zinc-400">
                      {r.reporter_label}
                    </td>
                    <td className="py-2.5 text-[11px] text-zinc-500">
                      {r.is_demonstration ? 'Demonstration Data' : r.data_source}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {myReports.length > 0 && (
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
            <div className="font-semibold text-zinc-700 dark:text-zinc-300">
              Your Submitted Farm Reports ({myReports.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {myReports.map((mr) => (
                <div
                  key={mr.id}
                  className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px]"
                >
                  <strong>{mr.crop}:</strong> {mr.disease_name} ({mr.observation_date}) ·{' '}
                  {mr.anonymous_community_consent ? 'Shared Anonymously' : 'Private Only'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Scientific Prevention Guidance Browser */}
      <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-700" />
            {copy.preventionGuidance}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITY_CROPS.filter((c) => c !== 'All').map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setGuidanceCrop(c)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                  guidanceCrop === c
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guidance.map((g) => (
            <div
              key={g.disease_id}
              className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-zinc-900 dark:text-white">{g.disease_name}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold capitalize">
                  {g.transmission_mode.replace('_', ' ')}
                </span>
              </div>
              <div className="text-[11px] text-zinc-500">
                <strong>Key Symptoms:</strong> {g.typical_symptoms.join('; ')}
              </div>
              <ul className="list-disc pl-4 space-y-1 text-zinc-700 dark:text-zinc-300">
                {g.preventive_actions.map((act, idx) => (
                  <li key={idx}>{act}</li>
                ))}
              </ul>
              <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                <strong>References:</strong> {g.scientific_references.join(' | ')}
              </div>
            </div>
          ))}
        </div>

        {guidanceSafetyNote && (
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>{guidanceSafetyNote}</span>
          </p>
        )}
      </div>
    </div>
  );
}
