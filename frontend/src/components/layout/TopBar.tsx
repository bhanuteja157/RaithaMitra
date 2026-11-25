// frontend/src/components/layout/TopBar.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { Language, UserRole } from '@/types';
import {
  Menu,
  Moon,
  Sun,
  Globe,
  PlusCircle,
  Bell,
  RefreshCw,
  MapPin,
  Check,
  ChevronDown,
  UserCheck,
  Sparkles
} from 'lucide-react';

export function TopBar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const router = useRouter();
  const {
    farms,
    currentFarm,
    setCurrentFarmId,
    currentUser,
    switchDemoUser,
    language,
    setLanguage,
    theme,
    toggleTheme,
    refreshData,
    isLoading,
    setIsOnboardingOpen,
    setIsLocationModalOpen,
    recommendations,
    t
  } = useFarm();

  const [farmDropdownOpen, setFarmDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const activeAlerts = recommendations?.recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length || 0;

  const handleRoleSwitch = async (role: UserRole) => {
    setRoleDropdownOpen(false);
    await switchDemoUser(role);
    if (role === 'farmer') router.push('/');
    else if (role === 'buyer') router.push('/dashboard/buyer');
    else if (role === 'labour') router.push('/dashboard/labour');
    else if (role === 'driver') router.push('/dashboard/driver');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-[#F7F5ED]/95 backdrop-blur-sm dark:bg-zinc-950 border-b border-[#DCD8CA] dark:border-zinc-800">
      {/* Left: Mobile hamburger & Farm Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-zinc-600 dark:text-zinc-400 rounded-lg md:hidden hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Farm Selector Dropdown (for Farmer role) */}
        {currentUser.role === 'farmer' && (
          <div className="relative">
            <button
              onClick={() => setFarmDropdownOpen(!farmDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors"
            >
              <MapPin className="w-4 h-4 text-rm-primary dark:text-rm-accent" />
              <span className="max-w-[140px] md:max-w-[200px] truncate">
                {currentFarm ? currentFarm.farm_name : t('selectFarm')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {farmDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50">
                <div className="px-3 py-2 text-xs font-semibold uppercase text-zinc-400">
                  Registered Farm Parcels
                </div>
                <div className="space-y-1">
                  {farms.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setCurrentFarmId(f.id);
                        setFarmDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                        currentFarm?.id === f.id
                          ? 'bg-rm-primary/10 text-rm-primary dark:bg-rm-accent/20 dark:text-rm-accent font-semibold'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{f.farm_name}</div>
                        <div className="text-xs text-zinc-500">{f.village}, {f.district} • {f.land_area_ha} ha</div>
                      </div>
                      {currentFarm?.id === f.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>

                <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
                  <button
                    onClick={() => {
                      setFarmDropdownOpen(false);
                      setIsLocationModalOpen(true);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm font-semibold rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    {t('updateFarmLocation')}
                  </button>
                  <button
                    onClick={() => {
                      setFarmDropdownOpen(false);
                      setIsOnboardingOpen(true);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm font-semibold rounded-lg text-rm-primary dark:text-rm-accent hover:bg-rm-primary/5 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {t('newFarm')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Role Badge for non-farmers */}
        {currentUser.role !== 'farmer' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            <span>{currentUser.role} Dashboard</span>
          </div>
        )}
      </div>

      {/* Right Controls: Demo Role Switcher, Language, Theme, Notifications, Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Judging 1-Click Demo Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-200 transition-colors shadow-sm"
            title="Switch Demo Role for Judging Evaluation"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Role:</span>
            <span className="capitalize">{currentUser.role}</span>
            <ChevronDown className="w-3 h-3 text-amber-600" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                1-Click Demo Role Switcher
              </div>
              <div className="space-y-1">
                {[
                  { role: 'farmer' as UserRole, name: 'Suresh Gowda', label: 'Farmer Dashboard (Mandya)' },
                  { role: 'buyer' as UserRole, name: 'Bengaluru Fresh Foods', label: 'Buyer Smart Bidding' },
                  { role: 'labour' as UserRole, name: 'Basavaraj Koravara', label: 'Labour Portal & Work' },
                  { role: 'driver' as UserRole, name: 'Manjunath Transport', label: 'Driver Logistics Console' },
                ].map((item) => (
                  <button
                    key={item.role}
                    onClick={() => handleRoleSwitch(item.role)}
                    className={`w-full p-2 text-left rounded-lg text-xs transition-colors ${
                      currentUser.role === item.role
                        ? 'bg-rm-primary text-white font-bold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="font-semibold">{item.label}</div>
                    <div className={`text-[10px] ${currentUser.role === item.role ? 'text-zinc-200' : 'text-zinc-400'}`}>
                      User: {item.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Refresh Data Button */}
        <button
          onClick={() => refreshData()}
          disabled={isLoading}
          className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-rm-primary rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          title={t('refresh')}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-rm-primary' : ''}`} />
        </button>

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
          >
            <Globe className="w-3.5 h-3.5 text-zinc-500" />
            <span>
              {language === 'kn' ? 'ಕನ್ನಡ' : language === 'hi' ? 'हिन्दी' : 'English'}
            </span>
          </button>

          {langDropdownOpen && (
            <div className="absolute right-0 mt-2 w-36 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-50">
              {[
                { code: 'en' as Language, label: 'English' },
                { code: 'kn' as Language, label: 'ಕನ್ನಡ (Kannada)' },
                { code: 'hi' as Language, label: 'हिन्दी (Hindi)' },
              ].map((item) => (
                <button
                  key={item.code}
                  onClick={() => {
                    setLanguage(item.code);
                    setLangDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-1.5 text-xs rounded text-left ${
                    language === item.code
                      ? 'bg-rm-primary text-white font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {item.label}
                  {language === item.code && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-rm-primary rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          title="Toggle Light/Dark Theme"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Risk Alerts Notification Bell */}
        <div className="relative">
          <button
            className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-rm-primary rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            title="Risk Alerts"
          >
            <Bell className="w-4 h-4" />
            {activeAlerts > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rm-danger opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rm-danger" />
              </span>
            )}
          </button>
        </div>

        {/* Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs shadow-inner">
            {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[120px]">
              {currentUser?.name || 'User'}
            </div>
            <div className="text-[10px] text-zinc-400 capitalize">
              {currentUser?.role || 'Farmer'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
