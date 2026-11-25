// frontend/src/app/resources/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { SmartLocationSelector } from '@/components/location/SmartLocationSelector';
import { Tractor, Users, Clock, CheckCircle2 } from 'lucide-react';

const RES_I18N: Record<
  Language,
  {
    title: string;
    badge: string;
    subtitle: string;
    rotavatorTitle: string;
    rotavatorVal: string;
    rotavatorSub: string;
    droneTitle: string;
    droneVal: string;
    droneSub: string;
    labourTitle: string;
    labourVal: string;
    labourSub: string;
  }
> = {
  en: {
    title: 'Resource Optimization & Equipment Sharing',
    badge: 'Operational Prototype',
    subtitle: 'Community tractor, spray drone, and harvester scheduling under Google OR-Tools routing constraints',
    rotavatorTitle: 'Shared Rotavator Tractor',
    rotavatorVal: 'Available Tomorrow',
    rotavatorSub: '₹850 / hour (Village SHG)',
    droneTitle: 'Kisan Drone Spray Slot',
    droneVal: 'Booked 28 Nov',
    droneSub: '₹450 / acre • Micronutrient Bio-spray',
    labourTitle: 'Labour Pool Syndicate',
    labourVal: '6 Harvesters',
    labourSub: 'Confirmed for Harvest Week',
  },
  kn: {
    title: 'ಸಂಪನ್ಮೂಲ ಅತ್ಯುತ್ತಮೀಕರಣ ಮತ್ತು ಯಂತ್ರ ಹಂಚಿಕೆ',
    badge: 'ಕಾರ್ಯಾಚರಣಾ ಮಾದರಿ',
    subtitle: 'ಸಮುದಾಯ ಟ್ರ್ಯಾಕ್ಟರ್, ಡ್ರೋನ್ ಸಿಂಪಡಣೆ ಮತ್ತು ಕೊಯ್ಲು ಯಂತ್ರ ವೇಳಾಪಟ್ಟಿ',
    rotavatorTitle: 'ಹಂಚಿಕೆಯ ರೋಟವೇಟರ್ ಟ್ರ್ಯಾಕ್ಟರ್',
    rotavatorVal: 'ನಾಳೆ ಲಭ್ಯವಿದೆ',
    rotavatorSub: '₹850 / ಗಂಟೆಗೆ (ಗ್ರಾಮ ಸಂಘ)',
    droneTitle: 'ಕಿಸಾನ್ ಡ್ರೋನ್ ಸಿಂಪಡಣೆ ಸ್ಲಾಟ್',
    droneVal: 'ನವೆಂಬರ್ 28 ಬುಕ್ ಆಗಿದೆ',
    droneSub: '₹450 / ಎಕರೆ • ಸೂಕ್ಷ್ಮ ಪೋಷಕಾಂಶ ಸಿಂಪಡಣೆ',
    labourTitle: 'ಕಾರ್ಮಿಕರ ಗುಂಪು ಒಕ್ಕೂಟ',
    labourVal: '6 ಕೊಯ್ಲುಗಾರರು',
    labourSub: 'ಕೊಯ್ಲು ವಾರಕ್ಕೆ ದೃಢೀಕರಿಸಲಾಗಿದೆ',
  },
  hi: {
    title: 'संसाधन अनुकूलन व उपकरण साझाकरण',
    badge: 'ऑपरेशनल प्रोटोटाइप',
    subtitle: 'सामुदायिक ट्रैक्टर, स्प्रे ड्रोन और हार्वेस्टर समय-सारिणी प्रबंधन',
    rotavatorTitle: 'साझा रोटावेटर ट्रैक्टर',
    rotavatorVal: 'कल उपलब्ध',
    rotavatorSub: '₹850 / घंटा (ग्राम समूह)',
    droneTitle: 'किसान ड्रोन छिड़काव स्लॉट',
    droneVal: '28 नवंबर को बुक',
    droneSub: '₹450 / एकड़ • सूक्ष्म पोषक जैव-स्प्रे',
    labourTitle: 'श्रमिक समूह सिंडिकेट',
    labourVal: '6 कटाई श्रमिक',
    labourSub: 'कटाई सप्ताह के लिए पक्का',
  },
  te: {
    title: 'వనరుల ఆప్టిమైజేషన్ & యంత్రాల భాగస్వామ్యం',
    badge: 'కార్యాచరణ నమూనా',
    subtitle: 'సామూహిక ట్రాక్టర్, స్ప్రే డ్రోన్ మరియు హార్వెస్టర్ షెడ్యూలింగ్',
    rotavatorTitle: 'భాగస్వామ్య రోటావేటర్ ట్రాక్టర్',
    rotavatorVal: 'రేపు అందుబాటులో ఉంది',
    rotavatorSub: '₹850 / గంటకు (గ్రామ సంఘం)',
    droneTitle: 'కిసాన్ డ్రోన్ స్ప్రే స్లాట్',
    droneVal: 'నవంబర్ 28న బుక్ అయింది',
    droneSub: '₹450 / ఎకరం • సూక్ష్మపోషక బయో-స్ప్రే',
    labourTitle: 'కూలీల బృందం',
    labourVal: '6 కోత కూలీలు',
    labourSub: 'కోత వారానికి ఖరారు అయింది',
  },
};

export default function ResourcesPage() {
  const { currentFarm, labourLocation, setLabourLocation, language } = useFarm();
  const t = RES_I18N[language];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
            <Tractor className="w-6 h-6" />
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
          <div className="text-xs font-semibold text-zinc-500">{t.rotavatorTitle}</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{t.rotavatorVal}</div>
          <div className="text-[11px] text-emerald-600">{t.rotavatorSub}</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{t.droneTitle}</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{t.droneVal}</div>
          <div className="text-[11px] text-zinc-400">{t.droneSub}</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{t.labourTitle}</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{t.labourVal}</div>
          <div className="text-[11px] text-zinc-400">{t.labourSub}</div>
        </div>
      </div>

      {/* Simplified Labour Job Discovery Location */}
      <SmartLocationSelector
        role="labour"
        initialLocation={{
          latitude: labourLocation?.latitude ?? currentFarm?.latitude ?? 12.5234,
          longitude: labourLocation?.longitude ?? currentFarm?.longitude ?? 76.8976,
          village: labourLocation?.village ?? currentFarm?.village ?? '',
          district: labourLocation?.district ?? currentFarm?.district ?? '',
          state: labourLocation?.state ?? currentFarm?.state ?? 'Karnataka',
        }}
        onConfirmLocation={(loc) => setLabourLocation(loc)}
      />
    </div>
  );
}
