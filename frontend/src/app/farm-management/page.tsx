// frontend/src/app/farm-management/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ClimatePage from '@/app/climate/page';
import IrrigationPage from '@/app/irrigation/page';
import SoilNutrientsPage from '@/app/soil-nutrients/page';
import { FarmToCarePayload, loadFarmToCareTransfer } from '@/lib/workflowBridge';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { localizeCropName, localizeGrowthStage } from '@/lib/translations';
import { CloudSun, Droplets, Sprout, ArrowRight } from 'lucide-react';

type Section = 'climate' | 'irrigation' | 'soil';

const FARM_MGMT_I18N: Record<
  Language,
  {
    title: string;
    subtitle: string;
    checkCropHealth: string;
    fromDigitalFarm: string;
    crop: string;
    stage: string;
    soilMoisture: string;
    tabClimate: string;
    tabIrrigation: string;
    tabSoil: string;
  }
> = {
  en: {
    title: 'Farm Management',
    subtitle: 'Weather forecasts, irrigation schedules, and soil nutrients in one place.',
    checkCropHealth: 'Check Crop Health',
    fromDigitalFarm: 'From Digital Farm:',
    crop: 'Crop:',
    stage: 'Stage:',
    soilMoisture: 'Soil Moisture:',
    tabClimate: '1. Weather & Climate',
    tabIrrigation: '2. Irrigation Plan',
    tabSoil: '3. Soil & Nutrients',
  },
  kn: {
    title: 'ಜಮೀನು ನಿರ್ವಹಣೆ',
    subtitle: 'ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ, ನೀರಾವರಿ ವೇಳಾಪಟ್ಟಿ ಮತ್ತು ಮಣ್ಣಿನ ಪೋಷಕಾಂಶಗಳು ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ.',
    checkCropHealth: 'ಬೆಳೆ ಆರೋಗ್ಯ ಪರಿಶೀಲಿಸಿ',
    fromDigitalFarm: 'ಡಿಜಿಟಲ್ ಜಮೀನಿನಿಂದ:',
    crop: 'ಬೆಳೆ:',
    stage: 'ಹಂತ:',
    soilMoisture: 'ಮಣ್ಣಿನ ತೇವಾಂಶ:',
    tabClimate: '1. ಹವಾಮಾನ ಮತ್ತು ಮುನ್ಸೂಚನೆ',
    tabIrrigation: '2. ನೀರಾವರಿ ಯೋಜನೆ',
    tabSoil: '3. ಮಣ್ಣು ಮತ್ತು ಪೋಷಕಾಂಶಗಳು',
  },
  hi: {
    title: 'खेत प्रबंधन',
    subtitle: 'मौसम पूर्वानुमान, सिंचाई समय-सारिणी और मिट्टी के पोषक तत्व एक ही स्थान पर।',
    checkCropHealth: 'फसल स्वास्थ्य जांचें',
    fromDigitalFarm: 'डिजिटल खेत से:',
    crop: 'फसल:',
    stage: 'चरण:',
    soilMoisture: 'मिट्टी की नमी:',
    tabClimate: '1. मौसम और जलवायु',
    tabIrrigation: '2. सिंचाई योजना',
    tabSoil: '3. मिट्टी व पोषक तत्व',
  },
  te: {
    title: 'పొలం నిర్వహణ',
    subtitle: 'వాతావరణ అంచనాలు, నీటిపారుదల ప్రణాళిక మరియు నేల పోషకాలు ఒకే చోట.',
    checkCropHealth: 'పంట ఆరోగ్యం తనిఖీ చేయండి',
    fromDigitalFarm: 'డిజిటల్ పొలం నుండి:',
    crop: 'పంట:',
    stage: 'దశ:',
    soilMoisture: 'నేల తేమ:',
    tabClimate: '1. వాతావరణం',
    tabIrrigation: '2. నీటిపారుదల ప్రణాళిక',
    tabSoil: '3. నేల & పోషకాలు',
  },
};

export default function FarmManagementPage() {
  const { currentUser, language } = useFarm();
  const t = FARM_MGMT_I18N[language];
  const [section, setSection] = useState<Section>('climate');
  const [farmCtx, setFarmCtx] = useState<FarmToCarePayload | null>(null);

  useEffect(() => {
    const sec = new URLSearchParams(window.location.search).get('section');
    if (sec === 'climate' || sec === 'irrigation' || sec === 'soil') {
      setSection(sec);
    }
    setFarmCtx(loadFarmToCareTransfer(currentUser.id));
  }, [currentUser.id]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            {t.title}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            {t.subtitle}
          </p>
        </div>
        <Link
          href="/crop-health"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold self-start sm:self-auto"
        >
          {t.checkCropHealth} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {farmCtx && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex flex-wrap gap-3">
          <strong>{t.fromDigitalFarm}</strong>
          <span>{farmCtx.farmName} ({farmCtx.locationLabel})</span>
          <span>{t.crop} <strong>{localizeCropName(farmCtx.crop, language)}</strong></span>
          <span>{t.stage} <strong>{localizeGrowthStage(farmCtx.growthStage, language)}</strong></span>
          <span>{t.soilMoisture} <strong>{Math.round(farmCtx.soilMoisturePct)}%</strong></span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { id: 'climate' as const, label: t.tabClimate, icon: CloudSun },
          { id: 'irrigation' as const, label: t.tabIrrigation, icon: Droplets },
          { id: 'soil' as const, label: t.tabSoil, icon: Sprout },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold border transition ${
                section === tab.id
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                  : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div>
        {section === 'climate' && <ClimatePage />}
        {section === 'irrigation' && <IrrigationPage />}
        {section === 'soil' && <SoilNutrientsPage />}
      </div>
    </div>
  );
}
