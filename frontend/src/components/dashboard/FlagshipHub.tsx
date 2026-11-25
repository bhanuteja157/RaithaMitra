// frontend/src/components/dashboard/FlagshipHub.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Dna, Users, Gavel, Truck, ArrowRight, MapPin, TrendingUp } from 'lucide-react';
import { AGRI_IMAGE_ASSETS } from '@/components/premium-ui/shared/AgriImage';

export function FlagshipHub() {
  const flagships = [
    {
      id: 'biointel',
      title: 'BioIntel',
      tagline: 'Genomics & Agri-Biotechnology',
      description: 'Peer-reviewed research from Europe PMC for disease-resistant crops, drought resilience, and certified nurseries.',
      icon: Dna,
      image: AGRI_IMAGE_ASSETS.featureBiointel,
      href: '/biointel',
      metric: '300K+ Papers Indexed',
    },
    {
      id: 'labour',
      title: 'Labour Connect',
      tagline: 'Farm Workforce Network',
      description: 'Find skilled agricultural workers for sowing, weeding, and harvesting with transparent daily wages.',
      icon: Users,
      image: AGRI_IMAGE_ASSETS.featureLabour,
      href: '/labour',
      metric: 'Direct Wage Network',
    },
    {
      id: 'bidding',
      title: 'Smart Bidding',
      tagline: 'Farmer-First Produce Auction',
      description: 'List produce lots with minimum floor price, evaluate verified buyer offers, and confirm sales.',
      icon: Gavel,
      image: AGRI_IMAGE_ASSETS.featureBidding,
      href: '/bidding',
      metric: 'Direct to Buyer',
    },
    {
      id: 'transport',
      title: 'Transport Connect',
      tagline: 'Farm-to-Market Logistics',
      description: 'Book verified rural carriers by payload capacity, track 6-stage delivery, and pool loads.',
      icon: Truck,
      image: AGRI_IMAGE_ASSETS.featureTransport,
      href: '/transport',
      metric: 'OR-Tools Optimized',
    },
  ];

  return (
    <section className="space-y-5 rm-animate-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8D7357]">
            Core Platform Capabilities
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#20372A] dark:text-white tracking-tight">
            Four Flagship Innovations
          </h2>
        </div>
        <span className="text-xs text-[#8D7357] dark:text-zinc-400">
          From seed genetics to farm-gate transport
        </span>
      </div>

      {/* 4 Photographic Flagship Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {flagships.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.id}
              href={f.href}
              className="group rounded-xl overflow-hidden border border-[#DCD8CA] dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between rm-card-hover"
            >
              <div>
                <div className="relative h-36 overflow-hidden bg-[#173C2B]">
                  <img
                    src={f.image}
                    alt={f.title}
                    loading="lazy"
                    className="w-full h-full object-cover rm-img-zoom"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#102D20]/80 via-[#102D20]/20 to-transparent" />
                  <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white">
                    <span className="font-serif text-lg font-semibold leading-tight">{f.title}</span>
                    <Icon className="w-4 h-4 text-[#C9A35C] shrink-0" />
                  </div>
                </div>
                <div className="p-4 space-y-1.5">
                  <div className="text-[11px] font-semibold text-[#526B38] dark:text-emerald-400">
                    {f.tagline}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                    {f.description}
                  </p>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-[#E9E5D8] dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#8D7357] font-medium">{f.metric}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#173C2B] dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Digital Farming & Market Intelligence Photographic Entry Points */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Link
          href="/digital-farming"
          className="group lg:col-span-7 relative rounded-xl overflow-hidden border border-[#DCD8CA] dark:border-zinc-800 bg-[#173C2B] text-white min-h-[168px] flex flex-col justify-between p-5 rm-card-hover"
        >
          <img
            src={AGRI_IMAGE_ASSETS.satelliteFarmland}
            alt="Satellite farmland plots"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover rm-img-zoom"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#102D20]/90 via-[#173C2B]/75 to-[#173C2B]/35" />
          <div className="relative z-10 space-y-1.5 max-w-lg">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#C9A35C]">
              <MapPin className="w-3.5 h-3.5" /> Digital Farming & Geospatial Simulator
            </span>
            <h3 className="font-serif text-xl font-semibold text-white">
              Plan Your Farm Before You Plant.
            </h3>
            <p className="text-xs text-[#F7F5ED]/85">
              Draw your exact field boundary on satellite imagery, calculate geodesic acreage, and run a 30-second crop growth & weather risk time-lapse.
            </p>
          </div>
          <div className="relative z-10 pt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white group-hover:translate-x-0.5 transition-transform">
            Start Digital Farming <ArrowRight className="w-4 h-4 text-[#C9A35C]" />
          </div>
        </Link>

        <Link
          href="/market-intelligence"
          className="group lg:col-span-5 relative rounded-xl overflow-hidden border border-[#DCD8CA] dark:border-zinc-800 bg-[#F3EFE3] dark:bg-zinc-950 min-h-[168px] flex flex-col justify-between p-5 rm-card-hover"
        >
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8D7357]">
              <TrendingUp className="w-3.5 h-3.5 text-[#36784D]" /> Agricultural Market Intelligence
            </span>
            <h3 className="font-serif text-xl font-semibold text-[#20372A] dark:text-white">
              Make Better Selling Decisions.
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Compare mandis net of transport, commission, and spoilage; simulate Sell Now vs Sell Later; and optimize shared vehicle freight.
            </p>
          </div>
          <div className="pt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#173C2B] dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
            Open Market Intelligence <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </section>
  );
}
