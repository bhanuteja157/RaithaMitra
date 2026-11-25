// frontend/src/components/dashboard/FlagshipHub.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { Dna, Users, Gavel, Truck, ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';

export function FlagshipHub() {
  const { t } = useFarm();

  const flagships = [
    {
      id: 'biointel',
      title: 'BioIntel',
      tagline: 'Genomics & Agri-Biotechnology',
      description: 'Peer-reviewed research from Europe PMC for disease-resistant crops, drought resilience, and certified nurseries.',
      icon: Dna,
      badge: 'Live Research',
      color: 'emerald',
      href: '/biointel',
      metric: '300K+ Papers Indexed',
    },
    {
      id: 'labour',
      title: 'Labour Connect',
      tagline: 'Farm Workforce Network',
      description: 'Find skilled agricultural workers for sowing, weeding, and harvesting. Direct WhatsApp/phone contact with zero broker fees.',
      icon: Users,
      badge: 'Fair Wages',
      color: 'blue',
      href: '/labour',
      metric: '100% Wage Transparency',
    },
    {
      id: 'bidding',
      title: 'Smart Bidding',
      tagline: 'Farmer-First Produce Auction',
      description: 'List produce lots with minimum floor price, evaluate verified buyer offers, and confirm sales with instant Purchase Orders.',
      icon: Gavel,
      badge: 'Direct to Buyer',
      color: 'amber',
      href: '/bidding',
      metric: 'Max-Offer AI Intelligence',
    },
    {
      id: 'transport',
      title: 'Transport Connect',
      tagline: 'Farm-to-Market Logistics',
      description: 'Book verified rural carriers by payload capacity, track 6-stage milestone delivery, and pool loads with Google OR-Tools.',
      icon: Truck,
      badge: 'OR-Tools Optimized',
      color: 'purple',
      href: '/transport',
      metric: '6-Stage Live Tracking',
    },
  ];

  return (
    <section className="bg-gradient-to-r from-emerald-900/40 via-slate-900/40 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-700/60 gap-4 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>HackWarts 2026 • 4 Flagship Innovations</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            RaithaMitra Flagship Intelligence Hub
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Integrated agricultural capabilities powering rural prosperity — from seed genetics to market transport.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Unified SQLite Backend Persistence
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 relative z-10">
        {flagships.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.id}
              href={f.href}
              className="group flex flex-col justify-between bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl p-5 transition-all duration-200 shadow-md hover:shadow-emerald-950/50 hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-700/80 text-emerald-300 border border-slate-600/60">
                    {f.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  {f.title}
                </h3>
                <p className="text-xs font-medium text-emerald-500/90 mb-2">
                  {f.tagline}
                </p>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {f.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {f.metric}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
