// frontend/src/components/assistant/AssistantResponseCards.tsx
'use client';

import React from 'react';
import { ResponseCard } from '@/lib/assistantApi';
import {
  Sprout,
  CloudSun,
  Droplets,
  TrendingUp,
  Stethoscope,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Users2,
  Gavel,
  Truck,
  Coins,
  Award,
  FlaskConical,
} from 'lucide-react';

interface Props {
  cards: ResponseCard[];
  onNavigate: (route: string) => void;
  onConfirmAction: (confirmationId: string, decision: 'confirm' | 'cancel') => void;
  confirmingIds: Record<string, boolean>;
  confirmedResults: Record<string, { status: string; message: string; route?: string | null }>;
}

function CardIcon({ type }: { type: ResponseCard['card_type'] }) {
  switch (type) {
    case 'crop_recommendation':
      return <Sprout className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    case 'weather_advisory':
      return <CloudSun className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    case 'irrigation':
      return <Droplets className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
    case 'market_comparison':
      return <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case 'crop_diagnosis':
      return <Stethoscope className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    case 'transaction_confirmation':
      return <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case 'digital_farm':
      return <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    case 'labour':
      return <Users2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
    case 'bidding':
      return <Gavel className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />;
    case 'transport':
      return <Truck className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    case 'finance':
      return <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    case 'schemes':
      return <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    default:
      return <FlaskConical className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
  }
}

export function AssistantResponseCards({
  cards,
  onNavigate,
  onConfirmAction,
  confirmingIds,
  confirmedResults,
}: Props) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
      {cards.map((card, idx) => {
        const d = card.data || {};
        const confId = d.confirmation_id as string | undefined;
        const confState = confId ? confirmedResults[confId] : undefined;
        const isBusy = confId ? Boolean(confirmingIds[confId]) : false;

        return (
          <div
            key={`${card.card_type}-${idx}`}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3.5 shadow-sm flex flex-col justify-between gap-2.5"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900">
                    <CardIcon type={card.card_type} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-snug">
                      {card.title}
                    </h4>
                    {card.subtitle && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {card.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                {card.badge && (
                  <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {card.badge}
                  </span>
                )}
              </div>

              {/* Card-specific structured telemetry */}
              {card.card_type === 'crop_recommendation' && (
                <div className="mt-2.5 space-y-1.5 text-xs">
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Est. Investment</span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        ₹{Number(d.estimated_investment_inr || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Expected Production</span>
                      <span className="font-bold text-zinc-900 dark:text-white">
                        {Number(d.expected_production_kg || 0).toLocaleString('en-IN')} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Seed Required</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {d.seed_required_kg} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Est. Net Profit</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(d.estimated_profit_inr || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  {Array.isArray(d.suitable_varieties) && d.suitable_varieties.length > 0 && (
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
                      <span className="font-semibold">Varieties:</span>{' '}
                      {d.suitable_varieties.slice(0, 2).join(', ')}
                    </div>
                  )}
                  {Array.isArray(d.main_risks) && d.main_risks.length > 0 && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-300">
                      <span className="font-semibold">Risks:</span> {d.main_risks[0]}
                    </div>
                  )}
                </div>
              )}

              {card.card_type === 'weather_advisory' && (
                <div className="mt-2.5 space-y-1.5 text-xs">
                  <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Humidity</span>
                      <span className="font-bold">{d.humidity_pct}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Wind</span>
                      <span className="font-bold">{d.wind_speed_kmh} km/h</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">48h Rain</span>
                      <span className="font-bold">{d.forecast_48h_rain_mm} mm</span>
                    </div>
                  </div>
                  {Array.isArray(d.agricultural_risks) && d.agricultural_risks.length > 0 && (
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                      {d.agricultural_risks[0]}
                    </p>
                  )}
                </div>
              )}

              {card.card_type === 'irrigation' && (
                <div className="mt-2.5 space-y-1.5 text-xs">
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Gross Water Need</span>
                      <span className="font-bold">
                        {d.gross_irrigation_mm} mm ({d.gross_volume_m3} m³)
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Available Water</span>
                      <span className="font-bold">
                        {Number(d.available_water_m3 || 0).toLocaleString('en-IN')} m³
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">ETc Demand</span>
                      <span className="font-semibold">{d.etc_mm_day} mm/day</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Duration / Deficit</span>
                      <span className="font-semibold">
                        {d.estimated_duration_hours ? `${d.estimated_duration_hours} hrs` : d.water_deficit_status}
                      </span>
                    </div>
                  </div>
                  {Array.isArray(d.missing_measurements) && d.missing_measurements.length > 0 && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      {d.missing_measurements[0]}
                    </p>
                  )}
                </div>
              )}

              {card.card_type === 'market_comparison' && (
                <div className="mt-2.5 space-y-1.5 text-xs">
                  <div className="space-y-1">
                    {(d.markets || []).slice(0, 3).map((m: any, mIdx: number) => (
                      <div
                        key={mIdx}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70 text-[11px]"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {m.market}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            ₹{m.price_per_kg}/kg • Freight ₹{Number(m.transport_cost_inr || 0).toLocaleString('en-IN')} • {m.is_demo ? 'Demo' : m.data_quality}
                          </div>
                        </div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                          ₹{Number(m.net_revenue_inr || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                  {d.sell_vs_wait_analysis && (
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
                      Break-even future price if waiting {d.sell_vs_wait_analysis.wait_days_evaluated}d:{' '}
                      <strong>₹{d.sell_vs_wait_analysis.break_even_future_price_per_kg}/kg</strong> (est.{' '}
                      {d.sell_vs_wait_analysis.estimated_spoilage_if_waiting_pct}% spoilage risk).
                    </p>
                  )}
                </div>
              )}

              {card.card_type === 'crop_diagnosis' && (
                <div className="mt-2.5 space-y-1.5 text-xs">
                  <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70 text-[11px] space-y-1">
                    <div>
                      <span className="font-semibold">Status:</span>{' '}
                      {d.ad22_available
                        ? `${d.suspected_disease} (Score: ${d.model_score ?? 'N/A'})`
                        : d.unavailable_reason || 'AD-22 diagnostics unavailable'}
                    </div>
                    <div className="text-amber-700 dark:text-amber-300">{d.uncertainty_warning}</div>
                  </div>
                </div>
              )}

              {card.card_type === 'soil' && (
                <div className="mt-2.5 space-y-1 text-[11px]">
                  <div>
                    Optimal pH for {card.subtitle}:{' '}
                    <strong>
                      {Array.isArray(d.optimal_ph_range) ? `${d.optimal_ph_range[0]} – ${d.optimal_ph_range[1]}` : '6.0 – 7.5'}
                    </strong>
                  </div>
                  {Array.isArray(d.missing_soil_readings) && d.missing_soil_readings.length > 0 && (
                    <div className="text-amber-700 dark:text-amber-300">
                      Missing lab Soil Health Card tests: {d.missing_soil_readings.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {card.card_type === 'digital_farm' && (
                <div className="mt-2.5 grid grid-cols-2 gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Expected Harvest</span>
                    <span className="font-bold">{d.expected_harvest_date}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Projected Production</span>
                    <span className="font-bold">{Number(d.estimated_production_kg || 0).toLocaleString('en-IN')} kg</span>
                  </div>
                </div>
              )}

              {card.card_type === 'schemes' && (
                <div className="mt-2.5 space-y-1.5 text-[11px]">
                  {(d.schemes || []).slice(0, 3).map((s: any) => (
                    <div key={s.id} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70">
                      <div className="font-semibold text-zinc-900 dark:text-white">{s.name}</div>
                      <div className="text-zinc-500 dark:text-zinc-400 line-clamp-2">{s.financial_benefit}</div>
                      <a
                        href={s.application_portal}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5 hover:underline"
                      >
                        Official Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {card.card_type === 'bidding' && (
                <div className="mt-2.5 space-y-1 text-[11px]">
                  {(d.confirmed_orders || []).slice(0, 2).map((o: any) => (
                    <div key={o.id} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70">
                      Order <strong>{o.id}</strong>: {o.quantity_kg} kg {o.crop_name} @ ₹{o.price_per_kg}/kg (Status: {o.status})
                    </div>
                  ))}
                  {(d.listings || []).slice(0, 2).map((l: any) => (
                    <div key={l.id} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70">
                      Listing <strong>{l.id}</strong>: {l.quantity_kg} kg {l.crop_name} • Highest ₹{l.highest_bid_per_kg}/kg ({l.buyer_count} bids)
                    </div>
                  ))}
                </div>
              )}

              {card.card_type === 'transport' && (
                <div className="mt-2.5 space-y-1 text-[11px]">
                  {(d.available_drivers || []).slice(0, 2).map((drv: any) => (
                    <div key={drv.id} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70">
                      <strong>{drv.driver_name}</strong> ({drv.vehicle_type}, {drv.capacity_kg} kg) • ₹{drv.base_fare_per_km}/km
                    </div>
                  ))}
                  {(d.bookings || []).slice(0, 2).map((b: any) => (
                    <div key={b.id} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70">
                      Booking <strong>{b.id}</strong>: {b.weight_kg} kg {b.produce_type} • Status: {b.status}
                    </div>
                  ))}
                </div>
              )}

              {card.card_type === 'labour' && (
                <div className="mt-2.5 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70 text-[11px] space-y-1">
                  <div>Recommended Crew: <strong>{d.recommended_workers_for_stage} workers</strong></div>
                  <div>Recorded Avg Daily Wage: <strong>₹{d.average_daily_wage_inr}/day</strong></div>
                </div>
              )}

              {card.card_type === 'finance' && (
                <div className="mt-2.5 grid grid-cols-2 gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Recorded PO Revenue</span>
                    <span className="font-bold">₹{Number(d.recorded_purchase_order_revenue_inr || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Modeled Median Profit</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(d.monte_carlo_summary?.median_p50_profit_inr || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}

              {card.card_type === 'transaction_confirmation' && (
                <div className="mt-2.5 space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1">
                    <div className="font-semibold text-zinc-900 dark:text-white">{d.proposed_action}</div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
                      Quantity: <strong>{d.relevant_quantity}</strong> • Est. Cost/Value:{' '}
                      <strong>₹{Number(d.estimated_cost_inr || 0).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                  {confState && (
                    <div
                      className={`p-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${
                        confState.status === 'executed'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                      }`}
                    >
                      {confState.status === 'executed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{confState.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card Action Buttons */}
            {card.actions && card.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {card.actions.map((act) => {
                  if (act.action_type === 'execute_confirmed' && act.confirmation_id) {
                    const decision = act.payload?.decision === 'cancel' ? 'cancel' : 'confirm';
                    const done = Boolean(confState);
                    return (
                      <button
                        key={act.id}
                        type="button"
                        disabled={done || isBusy}
                        onClick={() => onConfirmAction(act.confirmation_id!, decision)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          decision === 'confirm'
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50'
                            : 'bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 disabled:opacity-50'
                        }`}
                      >
                        {isBusy ? 'Processing...' : act.label}
                      </button>
                    );
                  }
                  if (act.route) {
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => onNavigate(act.route!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition"
                      >
                        <span>{act.label}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
