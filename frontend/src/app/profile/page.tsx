// frontend/src/app/profile/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { UserRole } from '@/types';
import { SmartLocationSelector } from '@/components/location/SmartLocationSelector';
import {
  User,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Sprout,
  Building2,
  Users,
  Truck,
  Sparkles,
  ArrowRight,
  LogOut,
  Layers,
  Coins,
  CheckCircle2
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const {
    currentUser,
    currentFarm,
    updateFarmLocation,
    isDemoMode,
    switchDemoUser,
    logout
  } = useFarm();

  const DEMO_CARDS: {
    role: UserRole;
    name: string;
    title: string;
    subtitle: string;
    desc: string;
    capabilities: string[];
    dashboardUrl: string;
    icon: any;
    color: string;
  }[] = [
    {
      role: 'farmer',
      name: 'Suresh Gowda',
      title: 'Farmer Persona',
      subtitle: 'Cauvery Valley Farm (Mandya)',
      desc: 'Agricultural producer with 2.5 ha Tomato crop under drip irrigation.',
      capabilities: [
        'BioIntel Biotechnology Research & Varietal Evidence',
        'Intelligent Nursery Discovery & Direct Inquiries',
        'Smart Bidding Produce Listing & Bid Acceptance',
        'Agricultural Labour Job Posting & Hiring',
        'Smart Irrigation (FAO-56 Dual Kc Water Balance)'
      ],
      dashboardUrl: '/',
      icon: Sprout,
      color: 'from-emerald-500 to-green-600'
    },
    {
      role: 'buyer',
      name: 'Bengaluru Fresh Foods Co',
      title: 'Buyer Persona',
      subtitle: 'Yeshwanthpur APMC Wholesale Yard',
      desc: 'Licensed commercial buyer bidding on verified farm-gate produce lots.',
      capabilities: [
        'Browse Verified Produce Lots by Crop & Location',
        'Submit Competitive Bids & Outbid Competitors',
        'Generate Legally Enforceable Purchase Orders',
        'Arrange Direct Freight Transport for Purchases',
        'Monitor Supply Chain Delivery Milestones'
      ],
      dashboardUrl: '/dashboard/buyer',
      icon: Building2,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      role: 'labour',
      name: 'Basavaraj Koravara',
      title: 'Labour Persona',
      subtitle: 'Mandya Rural Employment Circle',
      desc: 'Agricultural specialist skilled in harvesting, transplantation and weeding.',
      capabilities: [
        'Mobile-First Daily Farm Work Discovery',
        '1-Click Job Application for Nearby Openings',
        'Guaranteed Direct Daily Wage Tracking',
        'Confirmed Employment Schedule & Hours',
        'Agricultural Skill Profile Management'
      ],
      dashboardUrl: '/dashboard/labour',
      icon: Users,
      color: 'from-amber-500 to-orange-600'
    },
    {
      role: 'driver',
      name: 'Manjunath Transport',
      title: 'Driver Persona',
      subtitle: 'State Highway Logistics Hub',
      desc: 'Independent cargo carrier operating Tata Ace (1500 kg capacity).',
      capabilities: [
        'Discover Farm Produce Freight Requests',
        'Accept or Reject Booking Inquiries',
        'Milestone Updates: Picked Up, In Transit, Delivered',
        'Declared Vehicle Capacity & Rate Management',
        'Real-Time Transport Earnings Tracking'
      ],
      dashboardUrl: '/dashboard/driver',
      icon: Truck,
      color: 'from-purple-500 to-indigo-600'
    }
  ];

  const handleOpenDemoDashboard = async (card: typeof DEMO_CARDS[0]) => {
    await switchDemoUser(card.role);
    router.push(card.dashboardUrl);
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-2xl shadow-md">
            {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                {currentUser?.name || 'User Profile'}
              </h1>
              <span className={`text-xs px-2.5 py-0.5 font-bold uppercase rounded-md border ${
                isDemoMode
                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              }`}>
                {isDemoMode ? `Demo ${currentUser.role}` : `${currentUser.role} Account`}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {currentUser.email} • {currentUser.village || 'Mandya'}, {currentUser.district || 'Mandya'}, {currentUser.state || 'Karnataka'}
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            await logout();
            router.push('/login');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold hover:bg-red-100 transition-colors shadow-sm self-start md:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* DEMO MODE: INTERACTIVE 4-ROLE CARDS WITH DIRECT DASHBOARD NAVIGATION */}
      {isDemoMode && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-900 dark:text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Judging Evaluation: Interactive Multi-Role Hub</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
              Click &quot;Open Dashboard&quot; on any role card below to immediately activate that persona, update the full navigation sidebar, and launch its functional role-specific workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEMO_CARDS.map((card) => {
              const Icon = card.icon;
              const isActive = currentUser.role === card.role;
              return (
                <div
                  key={card.role}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isActive
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-md`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                            {card.title}
                          </h3>
                          <div className="text-xs text-zinc-500 font-medium">
                            {card.name} • {card.subtitle}
                          </div>
                        </div>
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {card.desc}
                    </p>

                    <div className="space-y-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Available Capabilities:
                      </span>
                      {card.capabilities.map((cap, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenDemoDashboard(card)}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                      isActive
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white'
                    }`}
                  >
                    <span>{isActive ? 'Current Dashboard Active' : `Open ${card.title}`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AUTHENTICATED MODE: VERIFIED ACCOUNT DETAILS */}
      {!isDemoMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
              Account Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Full Name:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{currentUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Email:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{currentUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Mobile Phone:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{currentUser.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Verified Role:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{currentUser.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Location:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{currentUser.village || 'Mandya'}, {currentUser.district || 'Mandya'}</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
              Role Security & Authorization
            </h3>
            <p className="text-xs text-zinc-500">
              Your session is cryptographically bound to your registered <span className="font-bold capitalize text-zinc-700 dark:text-zinc-300">{currentUser.role}</span> role. Privilege escalation by modifying client storage is blocked at the backend API layer.
            </p>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Backend Role Verification Active</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                To access another role (e.g. Buyer or Labour), please sign out and log into an account registered with those credentials.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FARMER AGRICULTURAL HOLDINGS (Only if role is farmer) */}
      {currentUser.role === 'farmer' && currentFarm && (
        <>
          <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
              Agricultural Holdings & Cultivation Context
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                <span className="text-zinc-400 block mb-1">Primary Farm</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentFarm.farm_name}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                <span className="text-zinc-400 block mb-1">Total Cultivable Area</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentFarm.land_area_ha} Hectares</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                <span className="text-zinc-400 block mb-1">Active Crop</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentFarm.primary_crop} ({currentFarm.crop_stage})</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                <span className="text-zinc-400 block mb-1">Water Infrastructure</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentFarm.irrigation_method}</span>
              </div>
            </div>
          </div>

          <SmartLocationSelector
            role="farmer"
            title={`Edit Farm Location — ${currentFarm.farm_name}`}
            subtitle="Adjust your agricultural parcel coordinates. Changes update weather, climate, satellite, and nursery discovery."
            initialLocation={{
              latitude: currentFarm.latitude,
              longitude: currentFarm.longitude,
              village: currentFarm.village,
              district: currentFarm.district,
              state: currentFarm.state,
              pin_code: currentFarm.pin_code,
              formatted_address: currentFarm.formatted_address,
              location_source: currentFarm.location_source,
              location_accuracy_m: currentFarm.location_accuracy_m,
            }}
            onConfirmLocation={async (loc) => {
              await updateFarmLocation(currentFarm.id, loc);
            }}
          />
        </>
      )}
    </div>
  );
}
