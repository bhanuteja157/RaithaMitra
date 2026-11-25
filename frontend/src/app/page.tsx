// frontend/src/app/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { FlagshipHub } from '@/components/dashboard/FlagshipHub';
import { OverviewCards } from '@/components/dashboard/OverviewCards';
import { ActionPlan } from '@/components/dashboard/ActionPlan';
import { BioIntelWidget } from '@/components/dashboard/BioIntelWidget';
import { ConceptualFarmMap } from '@/components/dashboard/ConceptualFarmMap';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { DataProvenanceFooter } from '@/components/dashboard/DataProvenanceFooter';
import { Sparkles, TrendingUp, ArrowRight, Layers, LineChart } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* 1. Flagship Innovations Showcase (AD-02) */}
      <FlagshipHub />

      {/* 1B. AD-08 Geospatial Simulation & Market Intelligence Spotlight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/digital-farming"
          className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/70 via-zinc-900 to-teal-950/70 border border-emerald-500/40 hover:border-emerald-400 transition-all shadow-lg text-left group flex items-start justify-between"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Interactive Geospatial Engine</span>
            </div>
            <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300 transition-colors">
              Digital Farming Simulator
            </h3>
            <p className="text-xs text-zinc-300 max-w-sm">
              Draw farm boundary polygons, simulate 30-sec satellite crop growth time-lapses, drone views, and 20-crop harvest modeling.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
            <ArrowRight className="w-5 h-5" />
          </div>
        </Link>

        <Link
          href="/market-intelligence"
          className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/70 via-zinc-900 to-cyan-950/70 border border-blue-500/40 hover:border-blue-400 transition-all shadow-lg text-left group flex items-start justify-between"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider">
              <TrendingUp className="w-3 h-3 text-blue-400" />
              <span>Economic Decision Engine</span>
            </div>
            <h3 className="text-base font-extrabold text-white group-hover:text-blue-300 transition-colors">
              Market Intelligence
            </h3>
            <p className="text-xs text-zinc-300 max-w-sm">
              Real-time APMC Mandi price comparison, Sell Now vs Sell Later predictive guidance, and digital harvest data transfer.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/20 text-blue-300 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-slate-950 transition-all">
            <ArrowRight className="w-5 h-5" />
          </div>
        </Link>
      </div>

      {/* 2. Farm Overview & 8 Analytics KPI Cards */}
      <OverviewCards />

      {/* 3. Personalized Daily Action Plan (Centralized Decision Intelligence) */}
      <ActionPlan />

      {/* 4. Feature 17 & 18: BioIntel & Intelligent Nursery Quick Access */}
      <BioIntelWidget />

      {/* 5. Interactive Farm Conceptual Zones Map */}
      <ConceptualFarmMap />

      {/* 5. Analytics & Time Series Charts (Water demand & Financials) */}
      <AnalyticsCharts />

      {/* 6. Quick Actions */}
      <QuickActions />

      {/* 7. Scientific Grounding & Data Provenance Footer */}
      <DataProvenanceFooter />
    </div>
  );
}
