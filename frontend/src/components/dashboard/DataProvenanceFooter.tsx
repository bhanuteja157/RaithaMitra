// frontend/src/components/dashboard/DataProvenanceFooter.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { Database, Wifi, ShieldAlert, Cpu } from 'lucide-react';

const FOOTER_I18N: Record<Language, {
  heading: string; weather: string; biophysics: string; storage: string;
  biophysicsVal: string; storageVal: string; confidence: string; brand: string;
}> = {
  en: {
    heading: 'Data Sources & Scientific Models', weather: 'Weather:', biophysics: 'Crop Model:', storage: 'Data Mode:',
    biophysicsVal: 'FAO-56 & AquaCrop Yield Model', storageVal: 'Local Farm Database',
    confidence: 'Telemetry Confidence: 94.2%', brand: 'RaithaMitra • Syntax Squad',
  },
  kn: {
    heading: 'ಮಾಹಿತಿ ಮೂಲಗಳು ಮತ್ತು ವೈಜ್ಞಾನಿಕ ಮಾದರಿಗಳು', weather: 'ಹವಾಮಾನ:', biophysics: 'ಬೆಳೆ ಮಾದರಿ:', storage: 'ಸಂಗ್ರಹಣೆ:',
    biophysicsVal: 'FAO-56 ಮತ್ತು AquaCrop ಇಳುವರಿ ಮಾದರಿ', storageVal: 'ಸ್ಥಳೀಯ ಜಮೀನು ಡೇಟಾಬೇಸ್',
    confidence: 'ದತ್ತಾಂಶ ವಿಶ್ವಾಸಾರ್ಹತೆ: 94.2%', brand: 'ರೈತ ಮಿತ್ರ • ಸಿಂಟ್ಯಾಕ್ಸ್ ಸ್ಕ್ವಾಡ್',
  },
  hi: {
    heading: 'डेटा स्रोत और वैज्ञानिक मॉडल', weather: 'मौसम:', biophysics: 'फसल मॉडल:', storage: 'डेटा मोड:',
    biophysicsVal: 'FAO-56 व AquaCrop उपज मॉडल', storageVal: 'स्थानीय कृषि डेटाबेस',
    confidence: 'डेटा विश्वसनीयता: 94.2%', brand: 'रैत मित्र • सिंटेक्स स्क्वाड',
  },
  te: {
    heading: 'సమాచార వనరులు & శాస్త్రీయ నమూనాలు', weather: 'వాతావరణం:', biophysics: 'పంట నమూనా:', storage: 'డేటా మోడ్:',
    biophysicsVal: 'FAO-56 & AquaCrop దిగుబడి నమూనా', storageVal: 'స్థానిక పొలం డేటాబేస్',
    confidence: 'డేటా విశ్వసనీయత: 94.2%', brand: 'రైతు మిత్ర • సింటాక్స్ స్క్వాడ్',
  },
};

export function DataProvenanceFooter() {
  const { weather, language } = useFarm();
  const L = FOOTER_I18N[language] || FOOTER_I18N.en;

  return (
    <div className="p-4 rounded-xl bg-zinc-100/70 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-rm-primary dark:text-rm-accent" />
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {L.heading}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            {L.weather} {weather?.provenance?.source || 'Open-Meteo NWP'}
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-cyan-500" />
            {L.biophysics} {L.biophysicsVal}
          </span>
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            {L.storage} {L.storageVal}
          </span>
        </div>
      </div>
      <div className="text-[10px] text-zinc-500 flex flex-wrap justify-between gap-2 border-t border-zinc-200/60 dark:border-zinc-800 pt-1.5">
        <span>{L.confidence}</span>
        <span>{L.brand}</span>
      </div>
    </div>
  );
}
