// frontend/src/components/premium-ui/farmer/PremiumFarmerDashboard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import {
  Dna,
  Users,
  Gavel,
  Truck,
  MapPin,
  TrendingUp,
  ArrowRight,
  Calendar,
  CloudSun,
  CheckCircle2,
  Sprout,
} from 'lucide-react';
import { AgriImage, AGRI_IMAGE_ASSETS } from '../shared/AgriImage';
import {
  WeatherIntelligenceWidget,
  WeatherWidgetProps,
  IntelligenceMetricCard,
} from '../shared/WeatherIntelligenceWidget';
import { PREMIUM_I18N, PremiumLang } from '../shared/i18n';

export interface FlagshipCardStatus {
  biointel?: string;
  labour?: string;
  bidding?: string;
  transport?: string;
}

export interface FarmerActionItem {
  id: string;
  priority: 'High' | 'Medium' | 'Routine';
  title: string;
  reason: string;
  actionLabel: string;
  href?: string;
}

export interface PremiumFarmerDashboardProps {
  farmerName: string;
  farmName: string;
  locationLabel: string;
  isDemoData?: boolean;
  language?: PremiumLang;
  weather: WeatherWidgetProps;
  flagshipStatus?: FlagshipCardStatus;
  farmOverview: {
    areaLabel: string;
    selectedCrop: string;
    growthStage: string;
    soilSummary: string;
    irrigationStatus: string;
    riskSummary: string;
    expectedHarvestDate: string;
    provenance: 'Measured' | 'Forecast' | 'Estimated' | 'Simulated';
  };
  marketSnapshot?: {
    cropName: string;
    pricePerKgLabel: string;
    estimatedRevenueLabel: string;
    isDemoDataset?: boolean;
  };
  recommendedActions: FarmerActionItem[];
}

export function PremiumFarmerDashboard({
  farmerName,
  farmName,
  locationLabel,
  isDemoData = false,
  language = 'en',
  weather,
  flagshipStatus,
  farmOverview,
  marketSnapshot,
  recommendedActions,
}: PremiumFarmerDashboardProps) {
  const t = PREMIUM_I18N[language];
  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const flagshipFeatures = [
    {
      id: 'biointel',
      title: 'BioIntel',
      purpose: 'Evidence-backed biotechnology, disease-resistant varieties, and bio-inputs.',
      status: flagshipStatus?.biointel || 'Research & variety advisor ready',
      image: AGRI_IMAGE_ASSETS.featureBiointel,
      href: '/biointel',
      icon: Dna,
    },
    {
      id: 'labour',
      title: 'Labour Connect',
      purpose: 'Post seasonal farm tasks and connect with skilled local agricultural workers.',
      status: flagshipStatus?.labour || 'Workforce discovery active',
      image: AGRI_IMAGE_ASSETS.featureLabour,
      href: '/labour',
      icon: Users,
    },
    {
      id: 'bidding',
      title: 'Smart Bidding',
      purpose: 'Receive transparent buyer offers and compare net farmgate returns.',
      status: flagshipStatus?.bidding || 'Direct produce auctions',
      image: AGRI_IMAGE_ASSETS.featureBidding,
      href: '/bidding',
      icon: Gavel,
    },
    {
      id: 'transport',
      title: 'Transport Connect',
      purpose: 'Coordinate pickup vehicles and reduce logistics cost per kilogram.',
      status: flagshipStatus?.transport || 'Farm-to-mandi logistics',
      image: AGRI_IMAGE_ASSETS.featureTransport,
      href: '/transport',
      icon: Truck,
    },
  ];

  return (
    <div className="rm-premium-root space-y-6 rm-animate-in">
      {/* Section A — Welcome Hero */}
      <section className="relative rounded-3xl overflow-hidden border border-emerald-900/15 bg-[#14532D] text-white shadow-md">
        <div className="absolute inset-0">
          <AgriImage
            src={AGRI_IMAGE_ASSETS.heroSunrise}
            alt="Aerial view of Indian agricultural farmland"
            aspectClass="w-full h-full"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#17251D]/90 via-[#14532D]/75 to-[#14532D]/35" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm font-semibold">
                <Calendar className="w-3.5 h-3.5 text-emerald-300" /> {todayStr}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" /> {farmName} · {locationLabel}
              </span>
              {isDemoData && (
                <span className="px-2.5 py-1 rounded-full bg-[#D4A72C] text-[#17251D] text-[10px] font-bold">
                  Preview / Demo Profile
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Namaskara, {farmerName}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100">
              {t.tagline} Monitor field health, simulate crop plans, and compare market returns.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {weather.temperatureC !== null && (
              <div className="px-4 py-2.5 rounded-2xl bg-black/30 backdrop-blur-sm border border-white/15 text-xs flex items-center gap-2.5">
                <CloudSun className="w-5 h-5 text-[#D4A72C]" />
                <div>
                  <div className="font-bold text-sm">{weather.temperatureC}°C</div>
                  <div className="text-[10px] text-emerald-100">{weather.conditionText || 'Field Weather'}</div>
                </div>
              </div>
            )}
            <Link
              href="/digital-farming"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#059669] hover:bg-emerald-600 text-white text-sm font-semibold shadow-sm transition"
            >
              {t.startDigitalFarming} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Section B — Four Flagship Innovations */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#17251D] dark:text-white">
            Four Flagship Innovations
          </h2>
          <span className="text-xs text-zinc-500">Core RaithaMitra Ecosystem</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {flagshipFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <Link
                key={feat.id}
                href={feat.href}
                className="group rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between rm-card-hover"
              >
                <div>
                  <AgriImage
                    src={feat.image}
                    alt={feat.title}
                    aspectClass="aspect-[16/10]"
                  />
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-base text-[#17251D] dark:text-white">
                      <Icon className="w-4 h-4 text-[#166534]" />
                      <span>{feat.title}</span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {feat.purpose}
                    </p>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-medium text-[#166534] dark:text-emerald-400 truncate">
                    {feat.status}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#14532D] dark:text-emerald-300 group-hover:translate-x-0.5 transition">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Section C & D — Digital Farming Experience + Market Intelligence */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 relative rounded-3xl overflow-hidden border border-emerald-900/15 bg-[#14532D] text-white flex flex-col justify-between min-h-[260px]">
          <div className="absolute inset-0">
            <AgriImage
              src={AGRI_IMAGE_ASSETS.satelliteFarmland}
              alt="Satellite aerial view of agricultural plots"
              aspectClass="w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#17251D]/92 via-[#14532D]/80 to-[#14532D]/45" />
          </div>

          <div className="relative z-10 p-6 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold">
              <Sprout className="w-3.5 h-3.5 text-emerald-300" /> Geospatial Digital Farming
            </span>
            <h3 className="text-xl sm:text-2xl font-bold">{t.planBeforePlant}</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-emerald-100">
              <li>• Satellite-based farmland boundary selection</li>
              <li>• Automatic geodesic acreage calculation</li>
              <li>• Virtual crop cultivation & time-lapse</li>
              <li>• Weather risk & profit estimation</li>
            </ul>
          </div>

          <div className="relative z-10 px-6 pb-6 flex flex-wrap gap-3">
            <Link
              href="/digital-farming"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#14532D] text-xs font-bold hover:bg-emerald-50 transition"
            >
              {t.startDigitalFarming} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/farm-twin"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 text-white text-xs font-semibold hover:bg-white/25 transition"
            >
              Digital Farm Twin
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#166534]">
                <TrendingUp className="w-4 h-4" /> Market Intelligence
              </span>
              {marketSnapshot?.isDemoDataset && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                  Illustrative Demo Data
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-[#17251D] dark:text-white">
              Maximize Net Farmgate Return
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F8F7F2] dark:bg-zinc-800">
                <span className="text-zinc-500 block">Reference Crop Price</span>
                <strong className="text-sm text-[#17251D] dark:text-white">
                  {marketSnapshot?.pricePerKgLabel || 'Enter or fetch mandi price'}
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-[#F8F7F2] dark:bg-zinc-800">
                <span className="text-zinc-500 block">Est. Revenue</span>
                <strong className="text-sm text-[#166534] dark:text-emerald-400">
                  {marketSnapshot?.estimatedRevenueLabel || 'Run harvest analysis'}
                </strong>
              </div>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Compare mandis net of transport & spoilage, evaluate buyer offers, and test shared vehicle logistics.
            </p>
          </div>

          <Link
            href="/market-intelligence"
            className="w-full py-2.5 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition"
          >
            {t.openMarketIntel} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Section E & F — Farm Intelligence Overview + Weather + Today's Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-bold text-[#17251D] dark:text-white">
            Farm Intelligence Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <IntelligenceMetricCard
              title="Farm Area"
              value={farmOverview.areaLabel}
              provenance={farmOverview.provenance}
            />
            <IntelligenceMetricCard
              title="Selected Crop"
              value={farmOverview.selectedCrop}
              subtitle={farmOverview.growthStage}
              provenance={farmOverview.provenance}
            />
            <IntelligenceMetricCard
              title="Soil & Irrigation"
              value={farmOverview.soilSummary}
              subtitle={farmOverview.irrigationStatus}
              provenance={farmOverview.provenance}
              icon="droplet"
            />
            <IntelligenceMetricCard
              title="Agricultural Risks"
              value={farmOverview.riskSummary}
              provenance={farmOverview.provenance}
              icon="alert"
            />
            <IntelligenceMetricCard
              title="Expected Harvest"
              value={farmOverview.expectedHarvestDate}
              provenance={farmOverview.provenance}
              icon="trend"
            />
          </div>

          <WeatherIntelligenceWidget {...weather} />
        </div>

        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-base font-bold text-[#17251D] dark:text-white">
            Today&apos;s Agricultural Actions
          </h2>
          {recommendedActions.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-xs text-zinc-500">
              No decision-engine actions supplied yet for this farm. Run crop diagnostics or simulation to generate recommendations.
            </div>
          ) : (
            <div className="space-y-3">
              {recommendedActions.map((act) => (
                <div
                  key={act.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-1.5 rm-card-hover"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[#17251D] dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#059669]" /> {act.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        act.priority === 'High'
                          ? 'bg-red-100 text-red-800'
                          : act.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {act.priority}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{act.reason}</p>
                  {act.href && (
                    <Link
                      href={act.href}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#166534] hover:underline pt-1"
                    >
                      {act.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
