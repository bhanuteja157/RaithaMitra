// frontend/src/components/layout/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import {
  LayoutDashboard,
  Layers,
  Satellite,
  CloudSun,
  Droplets,
  Microscope,
  Sprout,
  Coins,
  LineChart,
  ShoppingBag,
  Warehouse,
  Tractor,
  Activity,
  Award,
  BotMessageSquare,
  Compass,
  Settings,
  User,
  ExternalLink,
  CheckCircle2,
  Clock,
  Dna,
  Store
} from 'lucide-react';

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { t } = useFarm();

  const navigationGroups = [
    {
      title: t('overview'),
      items: [
        { name: t('dashboard'), href: '/', icon: LayoutDashboard, status: 'operational' },
        { name: t('digitalTwin'), href: '/farm-twin', icon: Layers, status: 'prototype' },
      ],
    },
    {
      title: t('precisionAg'),
      items: [
        { name: t('satellite'), href: '/satellite', icon: Satellite, status: 'prototype' },
        { name: t('climate'), href: '/climate', icon: CloudSun, status: 'operational' },
        { name: t('irrigation'), href: '/irrigation', icon: Droplets, status: 'prototype' },
        { name: t('diagnostics'), href: '/diagnostics', icon: Microscope, status: 'prototype' },
        { name: t('soilNutrients'), href: '/soil-nutrients', icon: Sprout, status: 'prototype' },
        { name: t('biointel'), href: '/biointel', icon: Dna, status: 'operational' },
      ],
    },
    {
      title: t('economicIntel'),
      items: [
        { name: t('nurseryMarketplace'), href: '/nursery-marketplace', icon: Store, status: 'operational' },
        { name: t('finance'), href: '/finance', icon: Coins, status: 'prototype' },
        { name: t('simulation'), href: '/simulation', icon: LineChart, status: 'prototype' },
        { name: t('marketplace'), href: '/marketplace', icon: ShoppingBag, status: 'operational' },
        { name: t('postHarvest'), href: '/post-harvest', icon: Warehouse, status: 'prototype' },
      ],
    },
    {
      title: t('community'),
      items: [
        { name: t('resources'), href: '/resources', icon: Tractor, status: 'prototype' },
        { name: t('surveillance'), href: '/surveillance', icon: Activity, status: 'prototype' },
        { name: t('schemes'), href: '/schemes', icon: Award, status: 'operational' },
      ],
    },
    {
      title: t('aiIntel'),
      items: [
        { name: t('assistant'), href: '/assistant', icon: BotMessageSquare, status: 'prototype' },
        { name: t('decisionIntelligence'), href: '/decision-intelligence', icon: Compass, status: 'operational' },
      ],
    },
    {
      title: "PREFERENCES",
      items: [
        { name: t('settings'), href: '/settings', icon: Settings, status: 'operational' },
        { name: t('profile'), href: '/profile', icon: User, status: 'operational' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-72 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
          {/* Custom SVG Agricultural Technology Logo */}
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-rm-primary to-rm-dark text-white shadow-md">
            <svg
              className="w-7 h-7 text-rm-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 20h10" />
              <path d="M10 20c0-3.5-1.5-6-4-8 4-1 6-3 6-7 0 4 2 6 6 7-2.5 2-4 4.5-4 8" />
              <path d="M12 2v3" />
              <circle cx="12" cy="2" r="1.5" fill="#22C55E" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-rm-text dark:text-white">
                RaithaMitra
              </span>
              <span className="text-xs px-1.5 py-0.5 font-semibold rounded bg-rm-primary/10 text-rm-primary dark:bg-rm-accent/20 dark:text-rm-accent">
                ರೈತ ಮಿತ್ರ
              </span>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Syntax Squad • HackWarts
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto scrollbar-thin">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <h3 className="px-3 text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                {group.title}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-rm-primary text-white shadow-sm'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`} />
                        <span>{item.name}</span>
                      </div>
                      {item.status === 'operational' ? (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          }`}
                        >
                          Live
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}
                        >
                          Proto
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer info */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Unified Platform v1.0</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
