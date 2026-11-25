// frontend/src/components/modals/OnboardingModal.tsx
'use client';

import React, { useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { FarmCreate, Language } from '@/types';
import { SmartLocationSelector } from '@/components/location/SmartLocationSelector';
import { localizeCropName, localizeGrowthStage, localizeCondition, LANGUAGE_OPTIONS } from '@/lib/translations';
import { X, Sprout, CheckCircle2 } from 'lucide-react';

const ONBOARD_I18N: Record<Language, {
  title: string; subtitle: string; farmerName: string; prefLang: string;
  farmName: string; village: string; district: string; state: string;
  locTitle: string; locSub: string; locBtn: string;
  landArea: string; primaryCrop: string; cropStage: string;
  soilType: string; irrigationInfra: string; waterSource: string;
  waterAvail: string; budget: string; registering: string; registerBtn: string;
}> = {
  en: {
    title: 'Farmer & Parcel Onboarding',
    subtitle: 'Register a new agricultural parcel into the shared digital twin',
    farmerName: 'Farmer Name *',
    prefLang: 'Preferred Language',
    farmName: 'Farm / Parcel Name *',
    village: 'Village / Taluk *',
    district: 'District *',
    state: 'State *',
    locTitle: 'Agricultural Land Location',
    locSub: 'Confirm your farm parcel coordinates (updates Village, District, State & Weather).',
    locBtn: 'Apply Location to Onboarding Form',
    landArea: 'Land Area (Hectares) *',
    primaryCrop: 'Primary Crop *',
    cropStage: 'Crop Growth Stage',
    soilType: 'Soil Texture Type',
    irrigationInfra: 'Irrigation Infrastructure',
    waterSource: 'Primary Water Source',
    waterAvail: 'Available Water (m³)',
    budget: 'Cultivation Budget (₹ INR)',
    registering: 'Registering...',
    registerBtn: 'Register Farm Twin',
  },
  kn: {
    title: 'ರೈತ ಮತ್ತು ಜಮೀನು ನೋಂದಣಿ',
    subtitle: 'ನಿಮ್ಮ ಹೊಸ ಕೃಷಿ ಜಮೀನನ್ನು ಡಿಜಿಟಲ್ ಟ್ವಿನ್‌ನಲ್ಲಿ ನೋಂದಾಯಿಸಿ',
    farmerName: 'ರೈತರ ಹೆಸರು *',
    prefLang: 'ಆದ್ಯತೆಯ ಭಾಷೆ',
    farmName: 'ಜಮೀನಿನ ಹೆಸರು *',
    village: 'ಗ್ರಾಮ / ತಾಲೂಕು *',
    district: 'ಜಿಲ್ಲೆ *',
    state: 'ರಾಜ್ಯ *',
    locTitle: 'ಕೃಷಿ ಜಮೀನಿನ ಸ್ಥಳ',
    locSub: 'ಜಮೀನಿನ ಸ್ಥಳವನ್ನು ದೃಢೀಕರಿಸಿ (ಗ್ರಾಮ, ಜಿಲ್ಲೆ ಮತ್ತು ಹವಾಮಾನ ತಾನಾಗಿಯೇ ನವೀಕರಣಗೊಳ್ಳುತ್ತದೆ).',
    locBtn: 'ಸ್ಥಳವನ್ನು ಫಾರ್ಮ್‌ಗೆ ಅನ್ವಯಿಸಿ',
    landArea: 'ಜಮೀನಿನ ವಿಸ್ತೀರ್ಣ (ಹೆಕ್ಟೇರ್) *',
    primaryCrop: 'ಮುಖ್ಯ ಬೆಳೆ *',
    cropStage: 'ಬೆಳೆ ಬೆಳವಣಿಗೆ ಹಂತ',
    soilType: 'ಮಣ್ಣಿನ ವಿಧ',
    irrigationInfra: 'ನೀರಾವರಿ ಪದ್ಧತಿ',
    waterSource: 'ಮುಖ್ಯ ನೀರಿನ ಮೂಲ',
    waterAvail: 'ಲಭ್ಯವಿರುವ ನೀರು (m³)',
    budget: 'ಬೇಸಾಯ ಬಜೆಟ್ (₹ INR)',
    registering: 'ನೋಂದಾಯಿಸಲಾಗುತ್ತಿದೆ...',
    registerBtn: 'ಜಮೀನು ನೋಂದಾಯಿಸಿ',
  },
  hi: {
    title: 'किसान और खेत पंजीकरण',
    subtitle: 'साझा डिजिटल ट्विन में अपनी नई कृषि भूमि पंजीकृत करें',
    farmerName: 'किसान का नाम *',
    prefLang: 'पसंदीदा भाषा',
    farmName: 'खेत का नाम *',
    village: 'गाँव / तालुका *',
    district: 'जिला *',
    state: 'राज्य *',
    locTitle: 'कृषि भूमि का स्थान',
    locSub: 'अपने खेत के निर्देशांक की पुष्टि करें (गाँव, जिला व मौसम स्वतः अपडेट होगा)।',
    locBtn: 'फॉर्म में स्थान लागू करें',
    landArea: 'भूमि क्षेत्र (हेक्टेयर) *',
    primaryCrop: 'मुख्य फसल *',
    cropStage: 'फसल विकास चरण',
    soilType: 'मिट्टी का प्रकार',
    irrigationInfra: 'सिंचाई प्रणाली',
    waterSource: 'मुख्य जल स्रोत',
    waterAvail: 'उपलब्ध पानी (m³)',
    budget: 'खेती बजट (₹ INR)',
    registering: 'पंजीकरण हो रहा है...',
    registerBtn: 'खेत पंजीकृत करें',
  },
  te: {
    title: 'రైతు & పొలం నమోదు',
    subtitle: 'మీ కొత్త వ్యవసాయ పొలాన్ని డిజిటల్ ట్విన్‌లో నమోదు చేయండి',
    farmerName: 'రైతు పేరు *',
    prefLang: 'ప్రాధాన్య భాష',
    farmName: 'పొలం పేరు *',
    village: 'గ్రామం / మండలం *',
    district: 'జిల్లా *',
    state: 'రాష్ట్రం *',
    locTitle: 'వ్యవసాయ భూమి స్థానం',
    locSub: 'మీ పొలం స్థానం నిర్ధారించండి (గ్రామం, జిల్లా & వాతావరణం ఆటోమేటిక్‌గా మారుతుంది).',
    locBtn: 'స్థానాన్ని ఫారమ్‌కు వర్తింపజేయండి',
    landArea: 'భూమి విస్తీర్ణం (హెక్టార్లు) *',
    primaryCrop: 'ప్రధాన పంట *',
    cropStage: 'పంట పెరుగుదల దశ',
    soilType: 'నేల రకం',
    irrigationInfra: 'నీటిపారుదల పద్ధతి',
    waterSource: 'ప్రధాన నీటి వనరు',
    waterAvail: 'లభ్యమైన నీరు (m³)',
    budget: 'సాగు బడ్జెట్ (₹ INR)',
    registering: 'నమోదు అవుతోంది...',
    registerBtn: 'పొలాన్ని నమోదు చేయండి',
  },
};

export function OnboardingModal() {
  const { isOnboardingOpen, setIsOnboardingOpen, createFarm, t, language } = useFarm();
  const L = ONBOARD_I18N[language] || ONBOARD_I18N.en;
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
                {L.title}
              </h2>
              <p className="text-xs text-zinc-500">
                {L.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOnboardingOpen(false)}
            aria-label={t('close')}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {L.farmerName}
              </label>
              <input
                type="text"
                required
                value={formData.farmer_name}
                onChange={(e) => setFormData({ ...formData, farmer_name: e.target.value })}
                placeholder="Ramesh Patil"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {L.prefLang}
              </label>
              <select
                value={formData.preferred_language}
                onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.nativeLabel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {L.farmName}
              </label>
              <input
                type="text"
                required
                value={formData.farm_name}
                onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
                placeholder="Kaveri Agro Field"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {L.village}
              </label>
              <input
                type="text"
                required
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                placeholder="Mandya"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {L.district}
              </label>
              <input
                type="text"
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="Mandya"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {L.state}
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Karnataka"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <SmartLocationSelector
                role="farmer"
                compactMap={true}
                title={L.locTitle}
                subtitle={L.locSub}
                confirmLabel={L.locBtn}
                initialLocation={{
                  latitude: formData.latitude,
                  longitude: formData.longitude,
                  village: formData.village,
                  district: formData.district,
                  state: formData.state,
                }}
                onConfirmLocation={(loc) => {
                  setFormData((prev) => ({
                    ...prev,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    village: loc.village || prev.village,
                    district: loc.district || prev.district,
                    state: loc.state || prev.state,
                    pin_code: loc.pin_code,
                    formatted_address: loc.formatted_address,
                    location_source: loc.location_source,
                    location_accuracy_m: loc.location_accuracy_m,
                  }));
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {L.landArea}
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
                {L.primaryCrop}
              </label>
              <select
                value={formData.primary_crop}
                onChange={(e) => setFormData({ ...formData, primary_crop: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              >
                <option value="Tomato">{localizeCropName('Tomato', language)}</option>
                <option value="Wheat">{localizeCropName('Wheat', language)}</option>
                <option value="Rice">{localizeCropName('Rice', language)}</option>
                <option value="Maize">{localizeCropName('Maize', language)}</option>
                <option value="Cotton">{localizeCropName('Cotton', language)}</option>
                <option value="Sugarcane">{localizeCropName('Sugarcane', language)}</option>
                <option value="Potato">{localizeCropName('Potato', language)}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {L.cropStage}
              </label>
              <select
                value={formData.crop_stage}
                onChange={(e) => setFormData({ ...formData, crop_stage: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              >
                <option value="Initial">{localizeGrowthStage('Initial', language)}</option>
                <option value="Crop Development">{localizeGrowthStage('Crop Development', language)}</option>
                <option value="Mid-Season">{localizeGrowthStage('Mid-Season', language)}</option>
                <option value="Late Season">{localizeGrowthStage('Late Season', language)}</option>
                <option value="Harvest Ready">{localizeGrowthStage('Harvest Ready', language)}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {L.soilType}
              </label>
              <select
                value={formData.soil_type}
                onChange={(e) => setFormData({ ...formData, soil_type: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              >
                <option value="Red Sandy Loam">{localizeCondition('Red Sandy Loam', language)}</option>
                <option value="Black Cotton Soil">{localizeCondition('Black Soil', language)}</option>
                <option value="Alluvial Soil">{localizeCondition('Alluvial Soil', language)}</option>
                <option value="Clay Loam">{localizeCondition('Clay Soil', language)}</option>
                <option value="Laterite Soil">{localizeCondition('Red Soil', language)}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {L.irrigationInfra}
              </label>
              <select
                value={formData.irrigation_method}
                onChange={(e) => setFormData({ ...formData, irrigation_method: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              >
                <option value="Drip Irrigation">{localizeCondition('Drip Irrigation', language)}</option>
                <option value="Sprinkler">{localizeCondition('Sprinkler', language)}</option>
                <option value="Flood / Furrow">{localizeCondition('Flood / Furrow', language)}</option>
                <option value="Rainfed">{localizeCondition('Rainfed', language)}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {L.waterSource}
              </label>
              <select
                value={formData.water_source}
                onChange={(e) => setFormData({ ...formData, water_source: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary focus:outline-none"
              >
                <option value="Borewell">{language === 'kn' ? 'ಬೋರ್‌ವೆಲ್' : language === 'hi' ? 'बोरवेल' : language === 'te' ? 'బోరు బావి' : 'Borewell'}</option>
                <option value="Open Well">{language === 'kn' ? 'ತೆರೆದ ಬಾವಿ' : language === 'hi' ? 'खुला कुआँ' : language === 'te' ? 'బహిరంగ బావి' : 'Open Well'}</option>
                <option value="Canal">{language === 'kn' ? 'ಕಾಲುವೆ' : language === 'hi' ? 'नहर' : language === 'te' ? 'కాలువ' : 'Canal'}</option>
                <option value="Farm Pond / Tank">{language === 'kn' ? 'ಕೃಷಿ ಹೊಂಡ' : language === 'hi' ? 'खेत तालाब' : language === 'te' ? 'పొలం కుంట' : 'Farm Pond / Krishi Honda'}</option>
                <option value="River / Stream">{language === 'kn' ? 'ನದಿ / ಹಳ್ಳ' : language === 'hi' ? 'नदी / नाला' : language === 'te' ? 'నది / వాగు' : 'River / Stream'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {L.waterAvail}
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
                {L.budget}
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
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 text-sm font-semibold rounded-lg bg-rm-primary hover:bg-rm-dark text-white shadow-md transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? L.registering : L.registerBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
