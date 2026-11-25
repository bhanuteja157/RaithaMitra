// frontend/src/components/premium-ui/shared/PremiumShellChrome.tsx
'use client';

import React, { useState } from 'react';
import {
  Sprout,
  Dna,
  Users,
  Gavel,
  Truck,
  MapPin,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  UserCircle2,
} from 'lucide-react';
import { PremiumLang } from './i18n';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  group: 'flagship' | 'intelligence' | 'operations';
  badge?: string;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'biointel', label: 'BioIntel', href: '/biointel', group: 'flagship', badge: 'Flagship' },
  { id: 'labour', label: 'Labour Connect', href: '/labour', group: 'flagship', badge: 'Flagship' },
  { id: 'bidding', label: 'Smart Bidding', href: '/bidding', group: 'flagship', badge: 'Flagship' },
  { id: 'transport', label: 'Transport Connect', href: '/transport', group: 'flagship', badge: 'Flagship' },
  { id: 'digital-farming', label: 'Digital Farming', href: '/digital-farming', group: 'intelligence' },
  { id: 'market-intel', label: 'Market Intelligence', href: '/market-intelligence', group: 'intelligence' },
];

interface PremiumSidebarProps {
  activePath?: string;
  navItems?: NavItem[];
  onNavigate?: (href: string) => void;
}

export function PremiumSidebar({
  activePath = '/digital-farming',
  navItems = DEFAULT_NAV_ITEMS,
  onNavigate,
}: PremiumSidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const iconFor = (id: string) => {
    switch (id) {
      case 'biointel':
        return Dna;
      case 'labour':
        return Users;
      case 'bidding':
        return Gavel;
      case 'transport':
        return Truck;
      case 'digital-farming':
        return MapPin;
      default:
        return TrendingUp;
    }
  };

  const flagship = navItems.filter((i) => i.group === 'flagship');
  const intel = navItems.filter((i) => i.group !== 'flagship');

  const renderBody = () => (
    <div className="flex flex-col h-full bg-[#14532D] text-white">
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <div className="font-bold text-sm leading-tight">RaithaMitra</div>
              <div className="text-[10px] text-emerald-200 truncate">ರೈತ ಮಿತ್ರ</div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:inline-flex p-1.5 rounded-lg hover:bg-white/10 text-emerald-100"
          aria-label="Toggle sidebar width"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        <div>
          {!collapsed && (
            <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Flagship Innovations
            </div>
          )}
          <div className="space-y-1">
            {flagship.map((item) => {
              const Icon = iconFor(item.id);
              const active = activePath === item.href;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate?.(item.href);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    active ? 'bg-white text-[#14532D] shadow-sm' : 'text-emerald-50 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!collapsed && item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-emerald-100 text-emerald-900' : 'bg-emerald-800 text-emerald-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {!collapsed && (
            <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Geospatial & Economic
            </div>
          )}
          <div className="space-y-1">
            {intel.map((item) => {
              const Icon = iconFor(item.id);
              const active = activePath === item.href;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate?.(item.href);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    active ? 'bg-white text-[#14532D] shadow-sm' : 'text-emerald-50 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#14532D] text-white text-xs font-semibold"
      >
        <Menu className="w-4 h-4" /> Menu
      </button>

      <aside className={`hidden lg:block shrink-0 rounded-2xl overflow-hidden transition-all ${collapsed ? 'w-16' : 'w-60'}`}>
        {renderBody()}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full shadow-2xl">{renderBody()}</div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)}>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="m-4 p-2 rounded-full bg-white text-zinc-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface PremiumTopBarProps {
  farms?: { id: string; name: string }[];
  selectedFarmId?: string;
  onFarmChange?: (id: string) => void;
  language?: PremiumLang;
  onLanguageChange?: (lang: PremiumLang) => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  isOnline?: boolean;
  userName?: string;
  notificationCount?: number;
}

export function PremiumTopBar({
  farms = [{ id: 'f1', name: 'Tumakuru Plot (Demo)' }],
  selectedFarmId = 'f1',
  onFarmChange,
  language = 'en',
  onLanguageChange,
  isDark = false,
  onToggleTheme,
  isOnline = true,
  userName = 'Farmer Account',
  notificationCount = 0,
}: PremiumTopBarProps) {
  return (
    <header className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {farms.length > 0 && (
          <select
            value={selectedFarmId}
            onChange={(e) => onFarmChange?.(e.target.value)}
            aria-label="Select Farm"
            className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold bg-[#F8F7F2] dark:bg-zinc-800"
          >
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
            isOnline ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
          }`}
        >
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? 'Connected' : 'Offline Mode'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={language}
          onChange={(e) => onLanguageChange?.(e.target.value as PremiumLang)}
          aria-label="Select Language"
          className="px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold bg-white dark:bg-zinc-800"
        >
          <option value="en">English</option>
          <option value="kn">ಕನ್ನಡ</option>
          <option value="hi">हिन्दी</option>
        </select>

        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        <div className="relative p-2 rounded-xl border border-zinc-200 dark:border-zinc-700">
          <Bell className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-700 text-white text-[9px] font-bold flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </div>

        <div className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-xl bg-[#F8F7F2] dark:bg-zinc-800 text-xs font-semibold">
          <UserCircle2 className="w-4 h-4 text-[#166534]" />
          <span>{userName}</span>
        </div>
      </div>
    </header>
  );
}
