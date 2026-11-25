// frontend/src/components/modals/OnboardingModal.tsx
'use client';

import React, { useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { FarmCreate } from '@/types';
import { X, Sprout, CheckCircle2 } from 'lucide-react';

export function OnboardingModal() {
  const { isOnboardingOpen, setIsOnboardingOpen, createFarm, t } = useFarm();
  const [formData, setFormData] = useState<FarmCreate>({
    farmer_name: '',
    preferred_language: 'kn',
    farm_name: '',
    village: '',
    district: 'Mandya',
    state: 'Karnataka',
    latitude: 12.5234,
    longitude: 76.8976,
    land_area_ha: 2.0,
    primary_crop: 'Tomato',
    crop_variety: 'Arka Rakshak',
    sowing_date: '2026-10-15',
    crop_stage: 'Mid-Season',
    soil_type: 'Red Sandy Loam',
    irrigation_method: 'Drip Irrigation',
    water_source: 'Borewell',
    available_water_m3: 10000.0,
    cultivation_budget_inr: 75000.0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOnboardingOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await createFarm(formData);
    setIsSubmitting(false);
    setIsOnboardingOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rm-primary/10 text-rm-primary dark:bg-rm-accent/20 dark:text-rm-accent">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Farmer & Parcel Onboarding
              </h2>
              <p className="text-xs text-zinc-500">
                Register a new agricultural parcel into the shared digital twin
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOnboardingOpen(false)}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Farmer Name *
              </label>
              <input
                type="text"
                required
                value={formData.farmer_name}
                onChange={(e) => setFormData({ ...formData, farmer_name: e.target.value })}
                placeholder="e.g. Ramesh Patil"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Preferred Language
              </label>
              <select
                value={formData.preferred_language}
                onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              >
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Farm / Parcel Name *
              </label>
              <input
                type="text"
                required
                value={formData.farm_name}
                onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
                placeholder="e.g. Kaveri Agro Field"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Village / Taluk *
              </label>
              <input
                type="text"
                required
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                placeholder="e.g. Mandya Rural"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                District *
              </label>
              <input
                type="text"
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="e.g. Mandya"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                State *
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. Karnataka"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Land Area (Hectares) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.land_area_ha}
                onChange={(e) => setFormData({ ...formData, land_area_ha: parseFloat(e.target.value) || 1.0 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Primary Crop *
              </label>
              <select
                value={formData.primary_crop}
                onChange={(e) => setFormData({ ...formData, primary_crop: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              >
                <option value="Tomato">Tomato (ಟೊಮ್ಯಾಟೊ)</option>
                <option value="Wheat">Wheat (ಗೋಧಿ)</option>
                <option value="Rice">Rice / Paddy (ಭತ್ತ)</option>
                <option value="Maize">Maize (ಮೆಕ್ಕೆಜೋಳ)</option>
                <option value="Cotton">Cotton (ಹತ್ತಿ)</option>
                <option value="Sugarcane">Sugarcane (ಕಬ್ಬು)</option>
                <option value="Potato">Potato (ಆಲೂಗಡ್ಡೆ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Crop Growth Stage
              </label>
              <select
                value={formData.crop_stage}
                onChange={(e) => setFormData({ ...formData, crop_stage: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              >
                <option value="Initial">Initial / Germination</option>
                <option value="Crop Development">Crop Development / Vegetative</option>
                <option value="Mid-Season">Mid-Season / Flowering & Fruiting</option>
                <option value="Late Season">Late Season / Maturation</option>
                <option value="Harvest Ready">Harvest Ready</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Soil Texture Type
              </label>
              <select
                value={formData.soil_type}
                onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              >
                <option value="Red Sandy Loam">Red Sandy Loam</option>
                <option value="Black Cotton Soil">Black Cotton Soil</option>
                <option value="Alluvial Soil">Alluvial Soil</option>
                <option value="Clay Loam">Clay Loam</option>
                <option value="Laterite Soil">Laterite Soil</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Irrigation Infrastructure
              </label>
              <select
                value={formData.irrigation_method}
                onChange={(e) => setFormData({ ...formData, irrigation_method: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              >
                <option value="Drip Irrigation">Drip Irrigation (ಹನಿ ನೀರಾವರಿ)</option>
                <option value="Sprinkler">Sprinkler Irrigation</option>
                <option value="Flood / Furrow">Flood / Furrow</option>
                <option value="Rainfed">Rainfed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Primary Water Source
              </label>
              <select
                value={formData.water_source}
                onChange={(e) => setFormData({ ...formData, water_source: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              >
                <option value="Borewell">Borewell (ಬೋರ್‌ವೆಲ್)</option>
                <option value="Open Well">Open Well</option>
                <option value="Canal">Canal</option>
                <option value="Farm Pond / Tank">Farm Pond / Krishi Honda</option>
                <option value="River / Stream">River / Stream</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Available Water (m³)
              </label>
              <input
                type="number"
                value={formData.available_water_m3}
                onChange={(e) => setFormData({ ...formData, available_water_m3: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Cultivation Budget (₹ INR)
              </label>
              <input
                type="number"
                value={formData.cultivation_budget_inr}
                onChange={(e) => setFormData({ ...formData, cultivation_budget_inr: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(false)}
              className="px-4 py-2 text-sm font-semibold rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 text-sm font-semibold rounded-lg bg-rm-primary hover:bg-rm-dark text-white shadow-md transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Registering...' : 'Register Farm Twin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
