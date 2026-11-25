// frontend/src/components/modals/LocationSelectorModal.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { SmartLocationSelector } from '@/components/location/SmartLocationSelector';
import { X } from 'lucide-react';

export function LocationSelectorModal() {
  const {
    currentFarm,
    isLocationModalOpen,
    setIsLocationModalOpen,
    updateFarmLocation,
    t,
  } = useFarm();

  if (!isLocationModalOpen || !currentFarm) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {t('updateFarmLocation')} — {currentFarm.farm_name}
            </h2>
            <p className="text-xs text-zinc-500">
              Updating farm coordinates automatically refreshes weather, climate, and recommendations.
            </p>
          </div>
          <button
            onClick={() => setIsLocationModalOpen(false)}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <SmartLocationSelector
          role="farmer"
          initialLocation={{
            latitude: currentFarm.latitude,
            longitude: currentFarm.longitude,
            village: currentFarm.village,
            district: currentFarm.district,
            state: currentFarm.state,
            pin_code: currentFarm.pin_code,
            formatted_address: currentFarm.formatted_address,
            location_source: currentFarm.location_source,
            location_accuracy_m: currentFarm.location_accuracy_m,
          }}
          onConfirmLocation={async (loc) => {
            await updateFarmLocation(currentFarm.id, loc);
            setIsLocationModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}
