// frontend/src/components/dashboard/ConceptualFarmMap.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { localizeCropName, localizeCondition } from '@/lib/translations';
import { Language } from '@/types';
import { MapPin, Layers, ShieldCheck, Droplet, Flame } from 'lucide-react';

const MAP_I18N: Record<Language, {
  satActive: string; parcelId: string; ha: string;
  zA: string; zB: string; zC: string; borewell: string;
  moisture: string; optimalVigor: string; waterDeficit: string; highVigor: string;
  dripFlow: string; sensorActive: string;
  legOptimal: string; legIrrig: string; legDrip: string;
}> = {
  en: {
    satActive: 'Satellite Zone Map Active', parcelId: 'Parcel:', ha: 'ha',
    zA: 'Zone A (North)', zB: 'Zone B (Central)', zC: 'Zone C (Water Head)', borewell: 'Borewell & Filter Unit',
    moisture: 'Moisture:', optimalVigor: 'Healthy Vigor', waterDeficit: 'Water Deficit', highVigor: 'Optimal Growth',
    dripFlow: 'Flow: 140 L/min Drip', sensorActive: 'Sensor Node: #SM-04 Active',
    legOptimal: 'Optimal Growth', legIrrig: 'Irrigation Needed', legDrip: 'Drip Line',
  },
  kn: {
    satActive: 'ಉಪಗ್ರಹ ವಲಯ ನಕ್ಷೆ ಸಕ್ರಿಯವಾಗಿದೆ', parcelId: 'ಜಮೀನು:', ha: 'ಹೆ.',
    zA: 'ವಲಯ A (ಉತ್ತರ)', zB: 'ವಲಯ B (ಮಧ್ಯ)', zC: 'ವಲಯ C (ನೀರಿನ ಮೂಲ)', borewell: 'ಬೋರ್‌ವೆಲ್ ಮತ್ತು ಫಿಲ್ಟರ್',
    moisture: 'ತೇವಾಂಶ:', optimalVigor: 'ಉತ್ತಮ ಬೆಳವಣಿಗೆ', waterDeficit: 'ನೀರಿನ ಕೊರತೆ', highVigor: 'ಹೆಚ್ಚಿನ ಹಸಿರು',
    dripFlow: 'ಹರಿವು: 140 ಲೀ/ನಿಮಿಷ', sensorActive: 'ಸೆನ್ಸಾರ್ #SM-04 ಸಕ್ರಿಯ',
    legOptimal: 'ಉತ್ತಮ ಬೆಳೆ', legIrrig: 'ನೀರಾವರಿ ನಿಗದಿತ', legDrip: 'ಹನಿ ನೀರಾವರಿ',
  },
  hi: {
    satActive: 'उपग्रह क्षेत्र मानचित्र सक्रिय', parcelId: 'खेत:', ha: 'हे.',
    zA: 'ज़ोन A (उत्तर)', zB: 'ज़ोन B (मध्य)', zC: 'ज़ोन C (सिंचाई हेड)', borewell: 'बोरवेल व फ़िल्टर यूनिट',
    moisture: 'नमी:', optimalVigor: 'स्वस्थ वृद्धि', waterDeficit: 'पानी की कमी', highVigor: 'उत्तम हरियाली',
    dripFlow: 'प्रवाह: 140 ली/मिनट ड्रिप', sensorActive: 'सेंसर #SM-04 सक्रिय',
    legOptimal: 'उत्तम वृद्धि', legIrrig: 'सिंचाई आवश्यक', legDrip: 'ड्रिप लाइन',
  },
  te: {
    satActive: 'ఉపగ్రహ విభాగ మ్యాప్ సక్రియం', parcelId: 'పొలం:', ha: 'హె.',
    zA: 'విభాగం A (ఉత్తరం)', zB: 'విభాగం B (మధ్య)', zC: 'విభాగం C (నీటి వనరు)', borewell: 'బోరుబావి & ఫిల్టర్ యూనిట్',
    moisture: 'తేమ:', optimalVigor: 'ఆరోగ్యకరమైన పెరుగుదల', waterDeficit: 'నీటి లోపం', highVigor: 'మంచి పచ్చదనం',
    dripFlow: 'ప్రవాహం: 140 లీ/నిమి', sensorActive: 'సెన్సార్ #SM-04 సక్రియం',
    legOptimal: 'మంచి పెరుగుదల', legIrrig: 'నీరు అవసరం', legDrip: 'బిందు సేద్యం లైన్',
  },
};

export function ConceptualFarmMap() {
  const { currentFarm, t, language } = useFarm();
  const L = MAP_I18N[language] || MAP_I18N.en;

  if (!currentFarm) return null;

  const cropName = localizeCropName(currentFarm.primary_crop, language);

  return (
    <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-rm-primary dark:text-rm-accent" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            {t('farmZones')}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-rm-primary" />
            {currentFarm.latitude.toFixed(4)}° N, {currentFarm.longitude.toFixed(4)}° E
          </span>
        </div>
      </div>

      {/* Conceptual Interactive Farm Parcel Zone Map */}
      <div className="relative w-full h-72 md:h-80 rounded-xl bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-emerald-950/90 border border-zinc-800 p-4 flex flex-col justify-between overflow-hidden shadow-inner">
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative z-10 flex items-center justify-between">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-emerald-400 text-xs font-semibold border border-emerald-900/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {L.satActive}
          </span>
          <span className="text-xs text-zinc-400 font-mono">
            {L.parcelId} {currentFarm.id} • {currentFarm.land_area_ha} {L.ha}
          </span>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3 my-auto">
          <div className="p-3 rounded-lg bg-emerald-900/30 border border-emerald-500/40 backdrop-blur-sm space-y-1 hover:border-emerald-400 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
              <span>{L.zA}</span>
              <Droplet className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-[11px] text-zinc-300">{cropName}</div>
            <div className="text-[10px] text-emerald-400">{L.moisture} 22.4% ({localizeCondition('Optimal', language)})</div>
            <div className="text-[10px] text-zinc-400">NDVI: 0.78 ({L.highVigor})</div>
          </div>

          <div className="p-3 rounded-lg bg-amber-900/30 border border-amber-500/40 backdrop-blur-sm space-y-1 hover:border-amber-400 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
              <span>{L.zB}</span>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-[11px] text-zinc-300">{cropName}</div>
            <div className="text-[10px] text-amber-400">{L.moisture} 14.2% ({L.waterDeficit})</div>
            <div className="text-[10px] text-zinc-400">NDVI: 0.69 ({L.waterDeficit})</div>
          </div>

          <div className="p-3 rounded-lg bg-blue-900/30 border border-blue-500/40 backdrop-blur-sm space-y-1 hover:border-blue-400 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between text-xs text-blue-300 font-bold">
              <span>{L.zC}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-[11px] text-zinc-300">{L.borewell}</div>
            <div className="text-[10px] text-cyan-400">{L.dripFlow}</div>
            <div className="text-[10px] text-zinc-400">{L.sensorActive}</div>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> {L.legOptimal}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" /> {L.legIrrig}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-cyan-500" /> {L.legDrip}
            </span>
          </div>
          <span className="font-mono text-zinc-500">
            10m Sentinel-2 Grid
          </span>
        </div>
      </div>
    </div>
  );
}
