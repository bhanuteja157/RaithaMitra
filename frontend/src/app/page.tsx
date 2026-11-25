// frontend/src/app/page.tsx
'use client';

import React from 'react';
import { CinematicHero } from '@/components/dashboard/CinematicHero';
import { FlagshipHub } from '@/components/dashboard/FlagshipHub';
import { OverviewCards } from '@/components/dashboard/OverviewCards';
import { ActionPlan } from '@/components/dashboard/ActionPlan';
import { BioIntelWidget } from '@/components/dashboard/BioIntelWidget';
import { ConceptualFarmMap } from '@/components/dashboard/ConceptualFarmMap';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { DataProvenanceFooter } from '@/components/dashboard/DataProvenanceFooter';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* 0. Cinematic Farmland Hero (AD-10) */}
      <CinematicHero />

      {/* 1. Flagship Innovations Showcase (AD-02 / AD-10) */}
      <FlagshipHub />

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
