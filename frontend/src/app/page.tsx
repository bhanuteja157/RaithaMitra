// frontend/src/app/page.tsx
'use client';

import React from 'react';
import { OverviewCards } from '@/components/dashboard/OverviewCards';
import { ActionPlan } from '@/components/dashboard/ActionPlan';
import { ConceptualFarmMap } from '@/components/dashboard/ConceptualFarmMap';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { DataProvenanceFooter } from '@/components/dashboard/DataProvenanceFooter';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* 1. Farm Overview & 8 Analytics KPI Cards */}
      <OverviewCards />

      {/* 2. Personalized Daily Action Plan (Centralized Decision Intelligence) */}
      <ActionPlan />

      {/* 3. Interactive Farm Conceptual Zones Map */}
      <ConceptualFarmMap />

      {/* 4. Analytics & Time Series Charts (Water demand & Financials) */}
      <AnalyticsCharts />

      {/* 5. Quick Actions */}
      <QuickActions />

      {/* 6. Scientific Grounding & Data Provenance Footer */}
      <DataProvenanceFooter />
    </div>
  );
}
