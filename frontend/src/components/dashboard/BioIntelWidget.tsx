// frontend/src/components/dashboard/BioIntelWidget.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { fetchBiotechRecommendations } from '@/lib/biointelApi';
import { localizeCropName, formatLocalizedCurrency } from '@/lib/translations';
import { BiotechRecommendation, Language } from '@/types';
import { Dna, Store, ChevronRight } from 'lucide-react';

const BIO_WIDGET_I18N: Record<Language, {
  title: string; badge: string; subPrefix: string;
  exploreBtn: string; loading: string; contactNursery: string; findSuppliers: string;
}> = {
  en: {
    title: 'Biotechnology Intelligence (BioIntel)', badge: 'Scientifically Grounded',
    subPrefix: 'Optimal biological varieties & treatments for', exploreBtn: 'Explore Seed & Biotech Guide',
    loading: 'Loading biotechnology recommendations...', contactNursery: 'Contact Nursery', findSuppliers: 'Find Suppliers',
  },
  kn: {
    title: 'ಬೀಜ ಮತ್ತು ಜೈವಿಕ ತಂತ್ರಜ್ಞಾನ ಮಾಹಿತಿ (BioIntel)', badge: 'ವೈಜ್ಞಾನಿಕ ಆಧಾರಿತ',
    subPrefix: 'ಉತ್ತಮ ರೋಗ-ನಿರೋಧಕ ತಳಿಗಳು ಮತ್ತು ಸಲಹೆ:', exploreBtn: 'ಸಂಪೂರ್ಣ ಬೀಜ ಮಾರ್ಗದರ್ಶಿ ನೋಡಿ',
    loading: 'ಬೀಜ ಮತ್ತು ಬಯೋಟೆಕ್ ಶಿಫಾರಸುಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ...', contactNursery: 'ನರ್ಸರಿ ಸಂಪರ್ಕಿಸಿ', findSuppliers: 'ನರ್ಸರಿ ಹುಡುಕಿ',
  },
  hi: {
    title: 'जैव-प्रौद्योगिकी व बीज बुद्धिमत्ता (BioIntel)', badge: 'वैज्ञानिक रूप से प्रमाणित',
    subPrefix: 'उपयुक्त रोग-प्रतिरोधी किस्में व जैव उपचार:', exploreBtn: 'बीज व शोध मार्गदर्शिका देखें',
    loading: 'बीज एवं जैव-प्रौद्योगिकी सिफारिशें लोड हो रही हैं...', contactNursery: 'नर्सरी से पूछें', findSuppliers: 'नर्सरी खोजें',
  },
  te: {
    title: 'విత్తన & జీవ సాంకేతిక సమాచారం (BioIntel)', badge: 'శాస్త్రీయ ఆధారితం',
    subPrefix: 'ఉత్తమ వ్యాధి-నిరోధక విత్తనాలు & సూచనలు:', exploreBtn: 'విత్తన & పరిశోధన గైడ్ చూడండి',
    loading: 'విత్తన మరియు బయోటెక్ సిఫార్సులు లోడ్ అవుతున్నాయి...', contactNursery: 'నర్సరీని సంప్రదించండి', findSuppliers: 'నర్సరీలను కనుగొనండి',
  },
};

export function BioIntelWidget() {
  const { currentFarm, language } = useFarm();
  const L = BIO_WIDGET_I18N[language] || BIO_WIDGET_I18N.en;
  const [recommendations, setRecommendations] = useState<BiotechRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const crop = currentFarm?.primary_crop || 'Tomato';
        const res = await fetchBiotechRecommendations({
          farm_id: currentFarm?.id || 'farm_001',
          farmer_name: currentFarm?.farmer_name || 'Farmer',
          farm_location: currentFarm ? `${currentFarm.district}, ${currentFarm.state}` : 'Tumakuru, Karnataka',
          latitude: currentFarm?.latitude || 13.3409,
          longitude: currentFarm?.longitude || 77.1010,
          crop_type: crop,
          soil_type: currentFarm?.soil_type || 'Red Sandy Loam',
          soil_ph: 6.5,
          water_availability: 'Limited / Low',
          land_area_ha: currentFarm?.land_area_ha || 1.0,
          cultivation_budget_inr: currentFarm?.cultivation_budget_inr || 75000,
          previous_crop_diseases: ['Bacterial Wilt', 'Tomato Leaf Curl Virus'],
        });
        if (isMounted) {
          setRecommendations(res.recommendations.slice(0, 3));
        }
      } catch (err) {
        console.error('BioIntel widget error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [currentFarm]);

  return (
    <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300">
            <Dna className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                {L.title}
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {L.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {L.subPrefix} {localizeCropName(currentFarm?.primary_crop || 'Tomato', language)}
            </p>
          </div>
        </div>

        <Link
          href="/biointel"
          className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400 hover:underline self-start sm:self-auto"
        >
          {L.exploreBtn} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-6 text-center text-xs text-zinc-400">{L.loading}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300">
                  {rec.category_label}
                </span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug">
                  {rec.variety_or_intervention_name}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                  {rec.expected_agricultural_benefits[0] || rec.scientific_evidence}
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-emerald-600 font-bold">
                  {rec.estimated_cost_inr ? formatLocalizedCurrency(rec.estimated_cost_inr, language) : L.contactNursery}
                </span>

                <Link
                  href={`/nursery-marketplace?crop=${rec.crop_name}&category=${rec.nursery_search_category}`}
                  className="flex items-center gap-1 text-[11px] font-semibold text-green-800 dark:text-green-400 hover:underline"
                >
                  <Store className="w-3 h-3" /> {L.findSuppliers}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
