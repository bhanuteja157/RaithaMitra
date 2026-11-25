// frontend/src/components/dashboard/CinematicHero.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { ChevronLeft, ChevronRight, MapPin, CloudSun } from 'lucide-react';

const HERO_SLIDES = [
  {
    src: '/images/agriculture/indian-farmland-sunrise.jpg',
    alt: 'Lush green irrigated Indian farmland at sunrise',
  },
  {
    src: '/images/crops/paddy.jpg',
    alt: 'Terraced green paddy fields in rural India',
  },
  {
    src: '/images/agriculture/satellite-farmland.jpg',
    alt: 'Aerial view of patchwork agricultural plots',
  },
  {
    src: '/images/crops/wheat.jpg',
    alt: 'Golden mature agricultural fields in late afternoon light',
  },
];

export function CinematicHero() {
  const { currentFarm, currentUser, weather } = useFarm();
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);

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

  const farmTitle = currentFarm?.farm_name || 'Your Registered Farm';
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
            alt={slide.alt}
            loading={idx === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              slideIdx === idx ? 'opacity-100 scale-[1.02]' : 'opacity-0 scale-100'
            }`}
            style={{ transitionProperty: 'opacity, transform', transitionDuration: '1200ms' }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-[#102D20]/85 via-[#173C2B]/55 to-[#173C2B]/25" />
      </div>

      {/* Editorial Hero Content */}
      <div className="relative z-10 h-full p-6 sm:p-8 flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#C9A35C]">
            YOUR FARM · YOUR FUTURE
          </span>

          {weather?.current && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#102D20]/70 backdrop-blur-sm border border-white/15 text-xs">
              <CloudSun className="w-4 h-4 text-[#C9A35C]" />
              <span>
                {weather.current.temperature_c}°C · {weather.current.condition_text}
              </span>
            </div>
          )}
        </div>

        <div className="max-w-2xl space-y-2">
          <h1 className="font-serif text-2xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">
            Better decisions begin with the land.
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#F7F5ED]/90">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <MapPin className="w-4 h-4 text-[#65A76F]" />
              {farmTitle}
              {farmLocation ? ` — ${farmLocation}` : ''}
            </span>
            {currentUser?.name && (
              <span className="text-[#F7F5ED]/75">· Welcome, {currentUser.name}</span>
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
                aria-label={`Hero slide ${idx + 1}`}
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
              aria-label="Previous farmland photo"
              className="p-1.5 rounded-lg bg-[#102D20]/60 hover:bg-[#102D20]/85 border border-white/15 text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSlideIdx((i) => (i + 1) % HERO_SLIDES.length)}
              aria-label="Next farmland photo"
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
