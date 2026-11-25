// frontend/src/app/post-harvest/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { Warehouse, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

const POST_HARVEST_I18N: Record<
  Language,
  {
    title: string;
    badge: string;
    subtitle: string;
    ambientTitle: string;
    ambientVal: string;
    ambientSub: string;
    coldTitle: string;
    coldVal: string;
    coldSub: string;
    wdraTitle: string;
    wdraVal: string;
    wdraSub: string;
  }
> = {
  en: {
    title: 'Post-Harvest Management & Cold Chain',
    badge: 'Operational Prototype',
    subtitle: 'Perishability risk evaluation, e-NWR warehouse receipting, and cold storage booking',
    ambientTitle: 'Ambient Shelf Life',
    ambientVal: '5-7 Days',
    ambientSub: 'At 28°C ambient temperature',
    coldTitle: 'Cold Chain Shelf Life',
    coldVal: '21-28 Days',
    coldSub: 'At 10°C - 12°C Controlled Atmosphere',
    wdraTitle: 'Nearest WDRA Warehouse',
    wdraVal: 'Mandya APMC Hub',
    wdraSub: 'Distance: 8.5 km • Capacity Available',
  },
  kn: {
    title: 'ಕೊಯ್ಲು ನಂತರದ ನಿರ್ವಹಣೆ ಮತ್ತು ಶೀತಲ ಸರಪಳಿ',
    badge: 'ಕಾರ್ಯಾಚರಣಾ ಮಾದರಿ',
    subtitle: 'ಹಾಳಾಗುವಿಕೆ ಅಪಾಯ ಮೌಲ್ಯಮಾಪನ, e-NWR ಉಗ್ರಾಣ ರಸೀದಿ ಮತ್ತು ಶೀತಲ ಗೃಹ ಬುಕಿಂಗ್',
    ambientTitle: 'ಸಾಮಾನ್ಯ ತಾಪಮಾನದ ಬಾಳಿಕೆ',
    ambientVal: '5-7 ದಿನಗಳು',
    ambientSub: '28°C ಸಾಮಾನ್ಯ ತಾಪಮಾನದಲ್ಲಿ',
    coldTitle: 'ಶೀತಲ ಗೃಹದ ಬಾಳಿಕೆ',
    coldVal: '21-28 ದಿನಗಳು',
    coldSub: '10°C - 12°C ನಿಯಂತ್ರಿತ ವಾತಾವರಣದಲ್ಲಿ',
    wdraTitle: 'ಹತ್ತಿರದ WDRA ಉಗ್ರಾಣ',
    wdraVal: 'ಮಂಡ್ಯ APMC ಕೇಂದ್ರ',
    wdraSub: 'ದೂರ: 8.5 ಕಿ.ಮೀ • ಸ್ಥಳಾವಕಾಶ ಲಭ್ಯವಿದೆ',
  },
  hi: {
    title: 'कटाई के बाद प्रबंधन और कोल्ड चेन',
    badge: 'ऑपरेशनल प्रोटोटाइप',
    subtitle: 'खराबी जोखिम मूल्यांकन, e-NWR गोदाम रसीद और कोल्ड स्टोरेज बुकिंग',
    ambientTitle: 'सामान्य तापमान शेल्फ लाइफ',
    ambientVal: '5-7 दिन',
    ambientSub: '28°C सामान्य तापमान पर',
    coldTitle: 'कोल्ड चेन शेल्फ लाइफ',
    coldVal: '21-28 दिन',
    coldSub: '10°C - 12°C नियंत्रित वातावरण में',
    wdraTitle: 'निकटतम WDRA गोदाम',
    wdraVal: 'मंड्या APMC केंद्र',
    wdraSub: 'दूरी: 8.5 किमी • क्षमता उपलब्ध',
  },
  te: {
    title: 'కోత తర్వాత నిర్వహణ & కోల్డ్ చైన్',
    badge: 'కార్యాచరణ నమూనా',
    subtitle: 'పంట నిల్వ ప్రమాద అంచనా, e-NWR గిడ్డంగి రసీదు మరియు కోల్డ్ స్టోరేజ్ బుకింగ్',
    ambientTitle: 'సాధారణ ఉష్ణోగ్రత నిల్వ కాలం',
    ambientVal: '5-7 రోజులు',
    ambientSub: '28°C సాధారణ ఉష్ణోగ్రత వద్ద',
    coldTitle: 'కోల్డ్ చైన్ నిల్వ కాలం',
    coldVal: '21-28 రోజులు',
    coldSub: '10°C - 12°C నియంత్రిత వాతావరణంలో',
    wdraTitle: 'సమీప WDRA గిడ్డంగి',
    wdraVal: 'మండ్యా APMC హబ్',
    wdraSub: 'దూరం: 8.5 కి.మీ • సామర్థ్యం అందుబాటులో ఉంది',
  },
};

export default function PostHarvestPage() {
  const { language } = useFarm();
  const t = POST_HARVEST_I18N[language];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                {t.title}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {t.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {t.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{t.ambientTitle}</div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white">{t.ambientVal}</div>
          <div className="text-[11px] text-zinc-400">{t.ambientSub}</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{t.coldTitle}</div>
          <div className="text-3xl font-bold text-emerald-600">{t.coldVal}</div>
          <div className="text-[11px] text-zinc-400">{t.coldSub}</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{t.wdraTitle}</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{t.wdraVal}</div>
          <div className="text-[11px] text-zinc-400">{t.wdraSub}</div>
        </div>
      </div>
    </div>
  );
}
