// frontend/src/components/dashboard/CinematicHero.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { localizeCondition } from '@/lib/translations';
import { Language } from '@/types';
import { ChevronLeft, ChevronRight, MapPin, CloudSun } from 'lucide-react';

const HERO_SLIDE_ALTS: Record<Language, string[]> = {
  en: [
    'Lush green irrigated Indian farmland at sunrise',
    'Terraced green paddy fields in rural India',
    'Aerial view of patchwork agricultural plots',
    'Golden mature agricultural fields in late afternoon light',
  ],
  kn: [
    'ಸೂರ್ಯೋದಯದಲ್ಲಿ ಹಸಿರು ನೀರಾವರಿ ಕೃಷಿ ಭೂಮಿ',
    'ಗ್ರಾಮೀಣ ಭಾರತದ ಹಸಿರು ಭತ್ತದ ಗದ್ದೆಗಳು',
    'ಕೃಷಿ ಜಮೀನುಗಳ ವೈಮಾನಿಕ ನೋಟ',
    'ಕೊಯ್ಲಿಗೆ ಸಿದ್ಧವಾದ ಹೊನ್ನಿನ ಬಣ್ಣದ ಜಮೀನು',
  ],
  hi: [
    'सूर्योदय के समय हरी-भरी सिंचित कृषि भूमि',
    'ग्रामीण भारत के हरे-भरे धान के खेत',
    'खेती के भूखंडों का हवाई दृश्य',
    'कटाई के लिए तैयार सुनहरे कृषि खेत',
  ],
  te: [
    'సూర్యోదయ సమయంలో పచ్చని నీటిపారుదల పొలాలు',
    'గ్రామీణ భారతదేశంలోని పచ్చని వరి పొలాలు',
    'వ్యవసాయ పొలాల విహంగ వీక్షణం',
    'కోతకు సిద్ధంగా ఉన్న బంగారు వర్ణపు పొలాలు',
  ],
};

const HERO_FALLBACK_TEXT: Record<Language, { registeredFarm: string; prevPhoto: string; nextPhoto: string }> = {
  en: { registeredFarm: 'Your Registered Farm', prevPhoto: 'Previous farmland photo', nextPhoto: 'Next farmland photo' },
  kn: { registeredFarm: 'ನಿಮ್ಮ ನೋಂದಾಯಿತ ಜಮೀನು', prevPhoto: 'ಹಿಂದಿನ ಜಮೀನಿನ ಚಿತ್ರ', nextPhoto: 'ಮುಂದಿನ ಜಮೀನಿನ ಚಿತ್ರ' },
  hi: { registeredFarm: 'आपका पंजीकृत खेत', prevPhoto: 'पिछली खेत की फोटो', nextPhoto: 'अगली खेत की फोटो' },
  te: { registeredFarm: 'మీ నమోదైన పొలం', prevPhoto: 'మునుపటి పొలం ఫోటో', nextPhoto: 'తదుపరి పొలం ఫోటో' },
};

const HERO_SLIDES = [
  { src: '/images/agriculture/indian-farmland-sunrise.jpg' },
  { src: '/images/crops/paddy.jpg' },
  { src: '/images/agriculture/satellite-farmland.jpg' },
  { src: '/images/crops/wheat.jpg' },
];

export function CinematicHero() {
  const { currentFarm, currentUser, weather, language, t } = useFarm();
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const fallback = HERO_FALLBACK_TEXT[language] || HERO_FALLBACK_TEXT.en;
  const alts = HERO_SLIDE_ALTS[language] || HERO_SLIDE_ALTS.en;

  useEffect(() => {
    if (paused) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 9000);
    return () => window.clearInterval(timer);
  }, [paused]);

  const farmTitle = currentFarm?.farm_name || fallback.registeredFarm;
  const farmLocation = currentFarm
    ? `${currentFarm.village || ''}${currentFarm.village && currentFarm.district ? ', ' : ''}${currentFarm.district || ''}`
    : 'Karnataka';

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative h-[260px] sm:h-[290px] rounded-2xl overflow-hidden border border-[#DCD8CA] dark:border-zinc-800 bg-[#173C2B] text-[#F7F5ED] shadow-sm rm-animate-in"
    >
      {/* Cycling Farmland Photographs */}
      <div className="absolute inset-0">
        {HERO_SLIDES.map((slide, idx) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={alts[idx] || alts[0]}
            loading={idx === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              slideIdx === idx ? 'opacity-100 scale-[1.02]' : 'opacity-0 scale-100'
            }`}
            style={{ transitionProperty: 'opacity, transform', transitionDuration: '1200ms' }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-[#102D20]/70 via-[#173C2B]/35 to-transparent" />
      </div>

      {/* Editorial Hero Content */}
      <div className="relative z-10 h-full p-6 sm:p-8 flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#C9A35C]">
            {t('heroEyebrow')}
          </span>

          {weather?.current && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#102D20]/70 backdrop-blur-sm border border-white/15 text-xs">
              <CloudSun className="w-4 h-4 text-[#C9A35C]" />
              <span>
                {weather.current.temperature_c}°C · {localizeCondition(weather.current.condition_text, language)}
              </span>
            </div>
          )}
        </div>

        <div className="max-w-2xl space-y-2">
          <h1 className="font-serif text-2xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">
            {t('heroHeadline')}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#F7F5ED]/90">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <MapPin className="w-4 h-4 text-[#65A76F]" />
              {farmTitle}
              {farmLocation ? ` — ${farmLocation}` : ''}
            </span>
            {currentUser?.name && (
              <span className="text-[#F7F5ED]/75">· {t('welcomeUser')}, {currentUser.name}</span>
            )}
          </div>
        </div>

        {/* Slide Indicators + Prev/Next Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSlideIdx(idx)}
                aria-label={`${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  slideIdx === idx ? 'w-6 bg-[#F7F5ED]' : 'w-2 bg-[#F7F5ED]/40 hover:bg-[#F7F5ED]/70'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSlideIdx((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
              aria-label={fallback.prevPhoto}
              className="p-1.5 rounded-lg bg-[#102D20]/60 hover:bg-[#102D20]/85 border border-white/15 text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSlideIdx((i) => (i + 1) % HERO_SLIDES.length)}
              aria-label={fallback.nextPhoto}
              className="p-1.5 rounded-lg bg-[#102D20]/60 hover:bg-[#102D20]/85 border border-white/15 text-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
