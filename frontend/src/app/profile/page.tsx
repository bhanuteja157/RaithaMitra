// frontend/src/app/profile/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { User, MapPin, Phone, ShieldCheck, Sprout } from 'lucide-react';

export default function ProfilePage() {
  const { currentFarm } = useFarm();

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-2xl shadow-md">
            {currentFarm?.farmer_name ? currentFarm.farmer_name.charAt(0) : 'R'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              {currentFarm?.farmer_name || 'Farmer Profile'}
            </h1>
            <p className="text-xs text-zinc-500">
              Registered Agricultural Producer • {currentFarm?.village}, {currentFarm?.district}, {currentFarm?.state}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
            Farmer Details
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Farmer Name:</span>
              <span className="font-semibold">{currentFarm?.farmer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Location:</span>
              <span className="font-semibold">{currentFarm?.village}, {currentFarm?.district}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">State:</span>
              <span className="font-semibold">{currentFarm?.state}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Preferred Language:</span>
              <span className="font-semibold uppercase">{currentFarm?.preferred_language}</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
            Agricultural Holdings
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Primary Parcel:</span>
              <span className="font-semibold">{currentFarm?.farm_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Total Cultivable Area:</span>
              <span className="font-semibold">{currentFarm?.land_area_ha} Hectares</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Active Crop:</span>
              <span className="font-semibold">{currentFarm?.primary_crop} ({currentFarm?.crop_stage})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Water Infrastructure:</span>
              <span className="font-semibold">{currentFarm?.irrigation_method} ({currentFarm?.water_source})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
