// frontend/src/components/layout/Sidebar.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import {
  LayoutDashboard,
  Layers,
  Dna,
  Users2,
  Gavel,
  Truck,
  ShoppingBag,
  HardHat,
  Satellite,
  CloudSun,
  Droplets,
  Microscope,
  Sprout,
  Coins,
  LineChart,
  Award,
  BotMessageSquare,
  Compass,
  Settings,
  User,
  Sparkles,
  Store,
  Warehouse,
  Tractor,
  Activity,
  ChevronDown,
  Search,
  CheckCircle2,
  Clock,
  CalendarCheck,
  ShieldCheck
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  status: string;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { t, currentUser } = useFarm();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  let navigationGroups: NavGroup[] = [];

  if (currentUser.role === 'buyer') {
    navigationGroups = [
      {
        title: "BUYER PORTAL",
        items: [
          { name: "Buyer Overview", href: '/dashboard/buyer', icon: LayoutDashboard, status: 'role', badge: 'Buyer' },
          { name: "Browse Produce Lots", href: '/bidding', icon: ShoppingBag, status: 'flagship', badge: 'Flagship' },
          { name: "Active Auctions & Bids", href: '/dashboard/buyer#bids', icon: Gavel, status: 'flagship' },
          { name: "Confirmed Purchases", href: '/dashboard/buyer#orders', icon: ShieldCheck, status: 'operational' },
          { name: "Delivery Tracking", href: '/transport', icon: Truck, status: 'flagship' },
          { name: "Nursery Marketplace", href: '/nursery-marketplace', icon: Store, status: 'flagship', badge: 'Bio-Market' },
        ],
      },
      {
        title: "SYSTEM PREFERENCES",
        items: [
          { name: t('profile'), href: '/profile', icon: User, status: 'operational' },
          { name: t('settings'), href: '/settings', icon: Settings, status: 'operational' },
        ],
      },
    ];
  } else if (currentUser.role === 'labour') {
    navigationGroups = [
      {
        title: "LABOUR PORTAL",
        items: [
          { name: "Labour Overview", href: '/dashboard/labour', icon: HardHat, status: 'role', badge: 'Labour' },
          { name: "Find Agricultural Work", href: '/labour', icon: Users2, status: 'flagship', badge: 'Flagship' },
          { name: "My Jobs & Schedule", href: '/dashboard/labour#my-jobs', icon: CheckCircle2, status: 'operational' },
          { name: "My Daily Earnings", href: '/dashboard/labour#earnings', icon: Coins, status: 'operational' },
        ],
      },
      {
        title: "SYSTEM PREFERENCES",
        items: [
          { name: t('profile'), href: '/profile', icon: User, status: 'operational' },
          { name: t('settings'), href: '/settings', icon: Settings, status: 'operational' },
        ],
      },
    ];
  } else if (currentUser.role === 'driver') {
    navigationGroups = [
      {
        title: "LOGISTICS CONSOLE",
        items: [
          { name: "Driver Console", href: '/dashboard/driver', icon: Truck, status: 'role', badge: 'Driver' },
          { name: "Find Agri Cargo Loads", href: '/transport', icon: Search, status: 'flagship', badge: 'Flagship' },
          { name: "Booking Requests", href: '/dashboard/driver#requests', icon: Clock, status: 'operational' },
          { name: "My Trips & Deliveries", href: '/dashboard/driver#trips', icon: CalendarCheck, status: 'operational' },
          { name: "My Vehicle & Capacity", href: '/dashboard/driver#vehicle', icon: ShieldCheck, status: 'operational' },
          { name: "My Freight Earnings", href: '/dashboard/driver#earnings', icon: Coins, status: 'operational' },
        ],
      },
      {
        title: "SYSTEM PREFERENCES",
        items: [
          { name: t('profile'), href: '/profile', icon: User, status: 'operational' },
          { name: t('settings'), href: '/settings', icon: Settings, status: 'operational' },
        ],
      },
    ];
  } else {
    // Farmer Dashboard & Full Agri Intelligence
    navigationGroups = [
      {
        title: "OVERVIEW",
        items: [
          { name: "Farmer Dashboard", href: '/', icon: LayoutDashboard, status: 'role', badge: 'Farmer' },
          { name: "Digital Farming Simulator", href: '/digital-farming', icon: Layers, status: 'flagship', badge: 'New' },
        ],
      },
      {
        title: "FLAGSHIP INNOVATIONS",
        items: [
          { name: "BioIntel Research", href: '/biointel', icon: Dna, status: 'flagship', badge: 'Flagship' },
          { name: "Nursery Marketplace", href: '/nursery-marketplace', icon: Store, status: 'flagship', badge: 'Bio-Market' },
          { name: "Labour Connect", href: '/labour', icon: Users2, status: 'flagship', badge: 'Flagship' },
          { name: "Smart Bidding", href: '/bidding', icon: Gavel, status: 'flagship', badge: 'Flagship' },
          { name: "Transport Connect", href: '/transport', icon: Truck, status: 'flagship', badge: 'Flagship' },
        ],
      },
      {
        title: "ECONOMIC INTELLIGENCE",
        items: [
          { name: "Market Intelligence", href: '/market-intelligence', icon: LineChart, status: 'flagship', badge: 'New' },
          { name: t('finance'), href: '/finance', icon: Coins, status: 'prototype' },
          { name: t('marketplace'), href: '/marketplace', icon: ShoppingBag, status: 'operational' },
        ],
      },
      {
        title: "ROLE DASHBOARDS",
        items: [
          { name: "Farmer Dashboard", href: '/', icon: LayoutDashboard, status: 'role', badge: 'Farmer' },
          { name: "Buyer Marketplace", href: '/dashboard/buyer', icon: ShoppingBag, status: 'role', badge: 'Buyer' },
          { name: "Labour Portal", href: '/dashboard/labour', icon: HardHat, status: 'role', badge: 'Labour' },
          { name: "Driver Console", href: '/dashboard/driver', icon: Truck, status: 'role', badge: 'Driver' },
        ],
      },
      {
        title: "SUPPORTING AGRI CAPABILITIES",
        items: [
          { name: t('climate'), href: '/climate', icon: CloudSun, status: 'operational' },
          { name: t('satellite'), href: '/satellite', icon: Satellite, status: 'prototype' },
          { name: t('digitalTwin'), href: '/farm-twin', icon: Layers, status: 'prototype' },
          { name: t('irrigation'), href: '/irrigation', icon: Droplets, status: 'prototype' },
          { name: t('diagnostics'), href: '/diagnostics', icon: Microscope, status: 'prototype' },
          { name: t('soilNutrients'), href: '/soil-nutrients', icon: Sprout, status: 'prototype' },
          { name: t('simulation'), href: '/simulation', icon: LineChart, status: 'prototype' },
          { name: t('postHarvest'), href: '/post-harvest', icon: Warehouse, status: 'prototype' },
          { name: t('resources'), href: '/resources', icon: Tractor, status: 'prototype' },
          { name: t('surveillance'), href: '/surveillance', icon: Activity, status: 'prototype' },
          { name: t('schemes'), href: '/schemes', icon: Award, status: 'operational' },
          { name: t('assistant'), href: '/assistant', icon: BotMessageSquare, status: 'prototype' },
          { name: t('decisionIntelligence'), href: '/decision-intelligence', icon: Compass, status: 'operational' },
        ],
      },
      {
        title: "SYSTEM PREFERENCES",
        items: [
          { name: t('settings'), href: '/settings', icon: Settings, status: 'operational' },
          { name: t('profile'), href: '/profile', icon: User, status: 'operational' },
        ],
      },
    ];
  }

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
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-72 bg-[#102D20] text-[#F7F5ED] border-r border-[#173C2B] transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#173C2B] border border-white/15 text-white shadow-sm">
            <svg
              className="w-6 h-6 text-[#65A76F]"
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
              <circle cx="12" cy="2" r="1.5" fill="#C9A35C" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-semibold text-lg tracking-tight text-[#F7F5ED]">
                RaithaMitra
              </span>
              <span className="text-[11px] px-1.5 py-0.5 font-medium rounded bg-white/10 text-[#C9A35C]">
                ರೈತ ಮಿತ್ರ
              </span>
            </div>
            <span className="text-[11px] text-[#F7F5ED]/65 font-normal">
              Syntax Squad • HackWarts 2026
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3.5 py-4 space-y-5 overflow-y-auto scrollbar-thin">
          {navigationGroups.map((group) => {
            const isGroupCollapsed = Boolean(collapsedGroups[group.title]);
            return (
              <div key={group.title} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className="w-full px-3 py-1 text-[10px] font-semibold tracking-wider text-[#F7F5ED]/55 uppercase flex items-center justify-between hover:text-[#F7F5ED]/85 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    {group.title}
                    {group.title.includes("FLAGSHIP") && (
                      <Sparkles className="w-3 h-3 text-[#C9A35C]" />
                    )}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${isGroupCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
                {!isGroupCollapsed && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;
                      const isFlagship = item.status === 'flagship';
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            isActive
                              ? 'bg-[#526B38] text-[#F7F5ED] shadow-sm'
                              : isFlagship
                              ? 'text-[#F7F5ED] hover:bg-white/10'
                              : 'text-[#F7F5ED]/80 hover:bg-white/10 hover:text-[#F7F5ED]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isActive
                                  ? 'text-[#F7F5ED]'
                                  : isFlagship
                                  ? 'text-[#65A76F]'
                                  : 'text-[#F7F5ED]/60'
                              }`}
                            />
                            <span className="truncate">{item.name}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                                isActive
                                  ? 'bg-[#F7F5ED]/20 text-[#F7F5ED]'
                                  : isFlagship
                                  ? 'bg-white/10 text-[#C9A35C]'
                                  : 'bg-white/10 text-[#F7F5ED]/70'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Subtle Agricultural Landscape Accent & Role Indicator */}
        <div className="border-t border-white/10">
          <div className="relative h-14 overflow-hidden opacity-45">
            <img
              src="/images/agriculture/indian-farmland-sunrise.jpg"
              alt="Agricultural landscape"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#102D20] via-[#102D20]/60 to-transparent" />
          </div>
          <div className="px-4 py-3 bg-[#102D20] flex items-center justify-between text-xs text-[#F7F5ED]/75">
            <span className="capitalize font-medium text-[#F7F5ED]">
              Role: {currentUser.role}
            </span>
            <span className="flex items-center gap-1.5 text-[#65A76F] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#65A76F]" />
              SQLite DB Sync
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
