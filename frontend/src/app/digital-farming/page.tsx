// frontend/src/app/digital-farming/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { DigitalFarmingWorkspace } from '@/components/digital-farming/DigitalFarmingWorkspace';
import SatellitePage from '@/app/satellite/page';
import { Sprout, Satellite } from 'lucide-react';

type Section = 'workspace' | 'satellite';

export default function DigitalFarmingPage() {
  const { t, language } = useFarm();
  const [section, setSection] = useState<Section>('workspace');

  useEffect(() => {
    const sec = new URLSearchParams(window.location.search).get('section');
    if (sec === 'satellite' || sec === 'workspace') {
      setSection(sec);
    }
  }, []);

  const tabWork =
    language === 'kn'
      ? 'ಡಿಜಿಟಲ್ ಜಮೀನು ಮತ್ತು 3D ಸಿಮ್ಯುಲೇಶನ್'
      : language === 'hi'
        ? 'डिजिटल खेत व सिमुलेशन'
        : language === 'te'
          ? 'డిజిటల్ పొలం & సిమ్యులేషన్'
          : 'Digital Farm & Simulation';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 max-w-md">
        {[
          { id: 'workspace' as const, label: tabWork, icon: Sprout },
          { id: 'satellite' as const, label: t('satellite'), icon: Satellite },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                section === tab.id
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {section === 'workspace' ? <DigitalFarmingWorkspace /> : <SatellitePage />}
    </div>
  );
}
