// frontend/src/app/dashboard/labour/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import {
  HardHat,
  Search,
  Briefcase,
  Coins,
  User,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function LabourDashboardPage() {
  const { currentUser } = useFarm();
  const [profile, setProfile] = useState<any>(null);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadLabourData() {
      setLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
        const profRes = await fetch(`${backendUrl}/labour/my-profile?user_id=${currentUser.id}`);
        if (profRes.ok) setProfile(await profRes.json());
        const jobsRes = await fetch(`${backendUrl}/labour/my-jobs?labour_id=${currentUser.id}`);
        if (jobsRes.ok) setMyJobs(await jobsRes.json());
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }
    loadLabourData();
  }, [currentUser.id]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Mobile-Friendly Natural Greeting Header */}
      <div className="relative p-6 sm:p-8 bg-[#173C2B] border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl shadow-sm text-white space-y-2 overflow-hidden">
        <img
          src="/images/roles/role-labour.jpg"
          alt="Agricultural workers in farmland"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#102D20]/90 via-[#173C2B]/75 to-transparent" />
        <div className="relative z-10 flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#C9A35C]">
            Labour Portal • Direct Rural Wage Employment
          </span>
        </div>
        <h1 className="relative z-10 font-serif text-2xl md:text-3xl font-semibold tracking-tight">
          ನಮಸ್ಕಾರ / Hello, {currentUser.name}
        </h1>
        <p className="relative z-10 text-xs sm:text-sm text-[#F7F5ED]/85 max-w-xl">
          Find daily agricultural work nearby, track your confirmed jobs, and receive guaranteed wages directly from farmers.
        </p>
      </div>

      {/* 4 Large Mobile-Friendly Primary Action Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Action 1: Find Work */}
        <Link
          href="/labour"
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:shadow-xl transition-all flex flex-col items-center text-center space-y-3 group"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
            <Search className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              Find Work
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Browse harvesting & sowing jobs
            </p>
          </div>
        </Link>

        {/* Action 2: My Jobs */}
        <div
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-sm">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              My Jobs ({myJobs.length})
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {myJobs.filter(j => j.app_status === 'accepted').length} confirmed shifts
            </p>
          </div>
        </div>

        {/* Action 3: My Earnings */}
        <div
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-sm">
            <Coins className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              ₹{profile ? profile.total_earnings.toLocaleString('en-IN') : '8,400'}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Recorded wages earned
            </p>
          </div>
        </div>

        {/* Action 4: My Profile */}
        <div
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 flex items-center justify-center shadow-sm">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              ⭐ {profile?.rating || 4.9}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {profile?.availability_status === 'available' ? 'Available for Work' : 'Busy'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Applications & Shifts */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          Your Job Applications & Work History
        </h3>

        {myJobs.length > 0 ? (
          <div className="space-y-3">
            {myJobs.map((j) => (
              <div
                key={j.application_id}
                className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">
                      {j.title}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      j.app_status === 'accepted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      j.app_status === 'completed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                      {j.app_status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Farmer: <strong>{j.farmer_name}</strong> • 📍 {j.work_location} • {j.work_date}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-base text-zinc-900 dark:text-white">
                    ₹{j.wage_per_day}
                  </div>
                  <div className="text-[10px] text-zinc-400">Per Day</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 p-4 text-center">
            No active job applications yet. Click 'Find Work' above to discover harvesting jobs!
          </p>
        )}
      </div>
    </div>
  );
}
