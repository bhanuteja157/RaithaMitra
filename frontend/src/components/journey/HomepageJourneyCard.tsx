// frontend/src/components/journey/HomepageJourneyCard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { JourneySummary, listJourneys } from '@/lib/journeyApi';
import { ArrowRight, Compass, PlusCircle, Sprout } from 'lucide-react';

export function HomepageJourneyCard() {
  const { currentFarm, currentUser, token } = useFarm();
  const [activeJourney, setActiveJourney] = useState<JourneySummary | null>(null);

  useEffect(() => {
    if (!token || currentUser?.role !== 'farmer') return;
    listJourneys(currentFarm?.id, token)
      .then((res) => {
        setActiveJourney(res.journeys[0] || null);
      })
      .catch(() => undefined);
  }, [token, currentUser?.role, currentFarm?.id]);

  if (currentUser?.role !== 'farmer') return null;

  return (
    <section className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 text-white rounded-2xl p-6 shadow-md border border-emerald-700/60">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-200">
            <Compass className="w-4 h-4" />
            ಬಿತ್ತನೆಯಿಂದ ಮಾರಾಟದವರೆಗೆ • Seed-to-Sale Companion
          </div>
          <h2 className="text-xl md:text-2xl font-bold">Your Seed-to-Sale Journey</h2>
          {activeJourney ? (
            <div className="text-xs md:text-sm text-emerald-100 space-y-1">
              <p>
                Active Crop: <strong className="text-white">{activeJourney.crop_name}</strong> ({activeJourney.season}) • Current Stage:{' '}
                <strong className="text-amber-200">{activeJourney.progress.current_stage_title || 'In Progress'}</strong>
              </p>
              <p className="text-xs text-emerald-200">
                Progress: {activeJourney.progress.progress_pct}% ({activeJourney.progress.completed_stages}/{activeJourney.progress.applicable_stages} stages) • Expected Harvest: {activeJourney.expected_harvest_date}
              </p>
            </div>
          ) : (
            <p className="text-xs md:text-sm text-emerald-100">
              Start an intelligent, persistent crop journey connecting BioIntel, Equipment, Digital Farming, Post-Harvest, Market Intelligence, Transport, and Finance.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {activeJourney ? (
            <Link
              href="/journey"
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Sprout className="w-4 h-4" />
              Continue Journey
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/journey"
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Start New Journey
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
