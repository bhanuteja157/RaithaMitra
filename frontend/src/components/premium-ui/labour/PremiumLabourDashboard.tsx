// frontend/src/components/premium-ui/labour/PremiumLabourDashboard.tsx
'use client';

import React from 'react';
import { Briefcase, Calendar, MapPin, IndianRupee, Clock, UserCheck, Search } from 'lucide-react';
import { AgriImage, AGRI_IMAGE_ASSETS } from '../shared/AgriImage';
import { PREMIUM_I18N, PremiumLang } from '../shared/i18n';

export interface LabourJobCard {
  id: string;
  workType: string;
  location: string;
  dailyWageLabel: string;
  dateLabel: string;
  workingHoursLabel: string;
  status: 'Open' | 'Applied' | 'Accepted' | 'Completed';
}

export interface PremiumLabourDashboardProps {
  workerName: string;
  language?: PremiumLang;
  jobs: LabourJobCard[];
  onApplyJob?: (jobId: string) => void;
  onActionTile?: (tile: 'find_work' | 'my_jobs' | 'my_earnings' | 'my_profile') => void;
}

export function PremiumLabourDashboard({
  workerName,
  language = 'en',
  jobs,
  onApplyJob,
  onActionTile,
}: PremiumLabourDashboardProps) {
  const t = PREMIUM_I18N[language];

  const tiles = [
    { id: 'find_work' as const, label: t.findWork, icon: Search },
    { id: 'my_jobs' as const, label: t.myJobs, icon: Briefcase },
    { id: 'my_earnings' as const, label: t.myEarnings, icon: IndianRupee },
    { id: 'my_profile' as const, label: t.myProfile, icon: UserCheck },
  ];

  return (
    <div className="rm-premium-root space-y-6 rm-animate-in">
      <div className="relative rounded-3xl overflow-hidden bg-[#14532D] text-white">
        <div className="absolute inset-0">
          <AgriImage src={AGRI_IMAGE_ASSETS.roleLabour} alt="Agricultural workers in farmland" aspectClass="w-full h-full" />
          <div className="absolute inset-0 bg-[#17251D]/75" />
        </div>
        <div className="relative z-10 p-6 sm:p-8 space-y-4">
          <h1 className="text-2xl font-bold">Namaskara, {workerName}</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => onActionTile?.(tile.id)}
                  className="p-4 rounded-2xl bg-white text-[#17251D] text-left font-bold text-sm flex items-center gap-3 hover:bg-emerald-50 transition shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#166534] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span>{tile.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-bold text-[#17251D] dark:text-white">{t.findWork}</h2>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center text-sm text-zinc-500">
          No open agricultural jobs in this view yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col justify-between gap-4 rm-card-hover"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-[#17251D] dark:text-white">{job.workType}</h3>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#166534]">
                    {job.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                  <span className="flex items-center gap-1.5 font-bold text-[#166534]"><IndianRupee className="w-3.5 h-3.5" /> {job.dailyWageLabel}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {job.dateLabel}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {job.workingHoursLabel}</span>
                </div>
              </div>
              <button
                type="button"
                disabled={job.status !== 'Open'}
                onClick={() => onApplyJob?.(job.id)}
                className="w-full py-2.5 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white text-sm font-semibold disabled:opacity-50"
              >
                {job.status === 'Open' ? 'Apply Now' : job.status}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
