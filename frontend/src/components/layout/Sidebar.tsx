// frontend/src/components/layout/Sidebar.tsx
'use client';

import React from 'react';
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

  let navigationGroups: NavGroup[] = [];

  if (currentUser.role === 'buyer') {
    navigationGroups = [
      {
        title: t('buyerPortal'),
        items: [
          { name: t('buyerOverview'), href: '/dashboard/buyer', icon: LayoutDashboard, status: 'role', badge: t('roleBuyer') },
          { name: t('browseLots'), href: '/bidding', icon: ShoppingBag, status: 'flagship', badge: t('flagshipTag') },
          { name: t('activeAuctions'), href: '/dashboard/buyer#bids', icon: Gavel, status: 'flagship' },
          { name: t('confirmedPurchases'), href: '/dashboard/buyer#orders', icon: ShieldCheck, status: 'operational' },
          { name: t('deliveryTracking'), href: '/transport', icon: Truck, status: 'flagship' },
          { name: t('nurseryMarketplace'), href: '/nursery-marketplace', icon: Store, status: 'flagship', badge: t('bioMarketTag') },
        ],
      },
      {
        title: t('systemPrefs'),
        items: [
          { name: t('profile'), href: '/profile', icon: User, status: 'operational' },
          { name: t('settings'), href: '/settings', icon: Settings, status: 'operational' },
        ],
      },
    ];
  } else if (currentUser.role === 'labour') {
    navigationGroups = [
      {
        title: t('labourPortal'),
        items: [
          { name: t('labourOverview'), href: '/dashboard/labour', icon: HardHat, status: 'role', badge: t('roleLabour') },
          { name: t('findAgriWork'), href: '/labour', icon: Users2, status: 'flagship', badge: t('flagshipTag') },
          { name: t('myJobsSchedule'), href: '/dashboard/labour#my-jobs', icon: CheckCircle2, status: 'operational' },
          { name: t('myDailyEarnings'), href: '/dashboard/labour#earnings', icon: Coins, status: 'operational' },
        ],
      },
      {
        title: t('systemPrefs'),
        items: [
          { name: t('profile'), href: '/profile', icon: User, status: 'operational' },
          { name: t('settings'), href: '/settings', icon: Settings, status: 'operational' },
        ],
      },
    ];
  } else if (currentUser.role === 'driver') {
    navigationGroups = [
      {
        title: t('driverConsole'),
        items: [
          { name: t('driverConsoleTitle'), href: '/dashboard/driver', icon: Truck, status: 'role', badge: t('roleDriver') },
          { name: t('findCargoLoads'), href: '/transport', icon: Search, status: 'flagship', badge: t('flagshipTag') },
          { name: t('bookingRequests'), href: '/dashboard/driver#requests', icon: Clock, status: 'operational' },
          { name: t('myTripsDeliveries'), href: '/dashboard/driver#trips', icon: CalendarCheck, status: 'operational' },
          { name: t('myVehicleCapacity'), href: '/dashboard/driver#vehicle', icon: ShieldCheck, status: 'operational' },
          { name: t('myFreightEarnings'), href: '/dashboard/driver#earnings', icon: Coins, status: 'operational' },
        ],
      },
      {
        title: t('systemPrefs'),
        items: [
          { name: t('profile'), href: '/profile', icon: User, status: 'operational' },
          { name: t('settings'), href: '/settings', icon: Settings, status: 'operational' },
        ],
      },
    ];
  } else {
    // Unified Farmer Navigation (AD-16 / AD-32 / AD-38 / AD-40A) with uniform font-weight 600
    navigationGroups = [
      {
        title: t('farmerWorkspace'),
        items: [
          { name: t('navHome'), href: '/', icon: LayoutDashboard, status: 'role' },
          { name: t('navJourney'), href: '/journey', icon: Compass, status: 'flagship', badge: t('badgeLifecycle') },
          { name: t('navBiointel'), href: '/biointel', icon: Dna, status: 'flagship', badge: t('badgeSeeds') },
          { name: t('navDigitalFarm'), href: '/digital-farming', icon: Layers, status: 'flagship', badge: t('badgeMapTwin') },
          { name: t('navFarmMgmt'), href: '/farm-management', icon: CloudSun, status: 'operational' },
          { name: t('navCropHealth'), href: '/crop-health', icon: Microscope, status: 'operational' },
          { name: t('navLabour'), href: '/labour', icon: Users2, status: 'flagship', badge: t('badgeWorkers') },
          { name: t('navSmartMarket'), href: '/smart-market', icon: Gavel, status: 'flagship', badge: t('badgeSell') },
          { name: t('navTransport'), href: '/transport', icon: Truck, status: 'flagship', badge: t('badgeTransport') },
          { name: t('navFinanceBenefits'), href: '/finance-benefits', icon: Coins, status: 'operational' },
          { name: t('navProfileSettings'), href: '/profile', icon: User, status: 'operational' },
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
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-72 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
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
              Syntax Squad • HackWarts 2026
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto scrollbar-thin">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <h3 className="px-3 text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase flex items-center justify-between">
                <span>{group.title}</span>
                {group.title.includes("FLAGSHIP") && (
                  <Sparkles className="w-3 h-3 text-amber-500" />
                )}
              </h3>
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
                      className={`flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                        isActive
                          ? 'bg-rm-primary text-white shadow-sm'
                          : isFlagship
                          ? 'text-zinc-900 dark:text-zinc-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${
                          isActive
                            ? 'text-white'
                            : isFlagship
                            ? 'text-rm-primary dark:text-rm-accent'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : isFlagship
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Active Role Indicator */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span className="capitalize font-semibold text-zinc-800 dark:text-zinc-200">
              Role: {currentUser.role}
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SQLite DB Sync
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
