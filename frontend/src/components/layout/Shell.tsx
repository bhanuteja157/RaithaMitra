// frontend/src/components/layout/Shell.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { OnboardingModal } from '../modals/OnboardingModal';
import { LocationSelectorModal } from '../modals/LocationSelectorModal';

export function Shell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isDemoMode } = useFarm();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isAuthenticated && !isDemoMode && pathname !== '/login') {
      router.push('/login');
    }
  }, [isMounted, isAuthenticated, isDemoMode, pathname, router]);

  // Clean full-screen presentation for the Authentication & Onboarding portal
  if (pathname === '/login') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans">
        <main className="w-full">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5ED] dark:bg-zinc-900 text-[#20372A] dark:text-zinc-100 font-sans transition-colors">
      {/* Dynamic Role-Based Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:pl-72">
        <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Shared Farm Onboarding & Location Modals */}
      <OnboardingModal />
      <LocationSelectorModal />
    </div>
  );
}
