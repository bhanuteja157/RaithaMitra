// frontend/src/app/ui-preview/page.tsx
'use client';

import React, { useState } from 'react';
import '@/components/premium-ui/styles/premium-ui.css';
import { PremiumLoginView } from '@/components/premium-ui/auth/PremiumLoginView';
import { PremiumRegisterView } from '@/components/premium-ui/auth/PremiumRegisterView';
import { PremiumFarmerDashboard } from '@/components/premium-ui/farmer/PremiumFarmerDashboard';
import { PremiumBuyerDashboard } from '@/components/premium-ui/buyer/PremiumBuyerDashboard';
import { PremiumLabourDashboard } from '@/components/premium-ui/labour/PremiumLabourDashboard';
import { PremiumDriverDashboard } from '@/components/premium-ui/driver/PremiumDriverDashboard';
import { PremiumSidebar, PremiumTopBar } from '@/components/premium-ui/shared/PremiumShellChrome';
import { AgriculturalAssistantOrb } from '@/components/premium-ui/shared/AgriculturalAssistantOrb';
import { MonitoringChartCard, RiskStatusStrip } from '@/components/premium-ui/shared/MonitoringChartCard';
import { PremiumLang } from '@/components/premium-ui/shared/i18n';

type PreviewTab = 'login' | 'register' | 'farmer' | 'buyer' | 'labour' | 'driver';

export default function UiPreviewPage() {
  const [tab, setTab] = useState<PreviewTab>('farmer');
  const [lang, setLang] = useState<PremiumLang>('en');
  const [notice, setNotice] = useState<string>('');

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* Design Preview Banner */}
      <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-200">
        <div>
          <strong>UI Design Preview Route (/ui-preview)</strong> — Isolated presentation components with clearly labelled preview data. Does not bypass authentication or modify backend state.
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'login', label: 'Login' },
              { id: 'register', label: 'Registration' },
              { id: 'farmer', label: 'Farmer Dashboard' },
              { id: 'buyer', label: 'Buyer Dashboard' },
              { id: 'labour', label: 'Labour Dashboard' },
              { id: 'driver', label: 'Driver Dashboard' },
            ] as { id: PreviewTab; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setNotice('');
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold ${
                tab === item.id ? 'bg-[#14532D] text-white' : 'bg-white dark:bg-zinc-900 border border-amber-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          {notice}
        </div>
      )}

      {tab === 'login' && (
        <PremiumLoginView
          language={lang}
          onLanguageChange={setLang}
          onSubmit={({ identifier }) => setNotice(`Preview Login handler invoked for: ${identifier}`)}
          onCreateAccount={() => setTab('register')}
        />
      )}

      {tab === 'register' && (
        <PremiumRegisterView
          language={lang}
          onSubmit={({ role, fullName }) =>
            setNotice(`Preview Registration handler invoked: ${fullName} (${role})`)
          }
          onSignInLink={() => setTab('login')}
        />
      )}

      {(tab === 'farmer' || tab === 'buyer' || tab === 'labour' || tab === 'driver') && (
        <div className="flex flex-col lg:flex-row gap-5">
          <PremiumSidebar
            activePath="/digital-farming"
            onNavigate={(href) => setNotice(`Preview navigation to ${href}`)}
          />
          <div className="flex-1 space-y-5 min-w-0">
            <PremiumTopBar
              language={lang}
              onLanguageChange={setLang}
              userName={`${tab.charAt(0).toUpperCase() + tab.slice(1)} Preview`}
              notificationCount={2}
            />

            {tab === 'farmer' && (
              <>
              <PremiumFarmerDashboard
                farmerName="Ramesh Gowda (Preview)"
                farmName="Tumakuru Plot"
                locationLabel="Tumakuru, Karnataka"
                isDemoData
                language={lang}
                weather={{
                  temperatureC: 27.4,
                  rainfallMm: 1.2,
                  humidityPct: 64,
                  windSpeedKmh: 11,
                  conditionText: 'Partly Cloudy (Preview)',
                  forecastSummary: 'Preview sample telemetry for UI layout verification.',
                  status: 'cached',
                  lastUpdated: 'Preview',
                }}
                farmOverview={{
                  areaLabel: '2.83 acres',
                  selectedCrop: 'Maize',
                  growthStage: 'Vegetative Growth (Day 45)',
                  soilSummary: 'Red Soil (Est.)',
                  irrigationStatus: 'Drip Available',
                  riskSummary: 'Low-Moderate',
                  expectedHarvestDate: '2027-03-10',
                  provenance: 'Simulated',
                }}
                marketSnapshot={{
                  cropName: 'Maize',
                  pricePerKgLabel: '₹22.00 / kg',
                  estimatedRevenueLabel: '₹1,61,260',
                  isDemoDataset: true,
                }}
                recommendedActions={[
                  {
                    id: 'a1',
                    priority: 'Medium',
                    title: 'Schedule Drip Irrigation Check',
                    reason: 'Modeled soil moisture approaching 48% in vegetative stage.',
                    actionLabel: 'Open Digital Farming',
                    href: '/digital-farming',
                  },
                  {
                    id: 'a2',
                    priority: 'Routine',
                    title: 'Compare Regional Mandi Net Returns',
                    reason: 'Compare Tumakuru vs Bengaluru net profit after transport.',
                    actionLabel: 'Open Market Intelligence',
                    href: '/market-intelligence',
                  },
                ]}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7">
                  <MonitoringChartCard
                    title="Modeled Crop Profit Comparison (Preview)"
                    subtitle="Refined chart styling with soft sand grid lines and forest green bars"
                    data={[
                      { name: 'Tomato', value: 142000 },
                      { name: 'Chilli', value: 118000 },
                      { name: 'Maize', value: 84000 },
                    ]}
                  />
                </div>
                <div className="lg:col-span-5 rounded-xl border border-[#E9E5D8] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#26332B] dark:text-zinc-100">
                      Farm-Level Risk & Assistant Status
                    </h3>
                  </div>
                  <RiskStatusStrip
                    items={[
                      { label: 'Water Deficit Risk', level: 'Moderate', detail: 'Soil moisture at 48%' },
                      { label: 'Nutrient Status Risk', level: 'Low', detail: 'Adequate organic baseline' },
                      { label: 'Harvest Weather Risk', level: 'Low', detail: 'No storm overlap in 7-day window' },
                    ]}
                  />
                  <AgriculturalAssistantOrb state="idle" voiceAvailable={false} />
                </div>
              </div>
            </>
            )}

            {tab === 'buyer' && (
              <PremiumBuyerDashboard
                buyerName="Kaveri Agro Traders (Preview)"
                stats={{
                  availableCount: 3,
                  activeAuctions: 2,
                  myBids: 1,
                  confirmedPurchases: 4,
                  inTransitCount: 1,
                }}
                listings={[
                  {
                    id: 'l1',
                    cropName: 'Tomato',
                    quantityLabel: '4,500 kg',
                    location: 'Tumakuru, Karnataka',
                    currentOfferLabel: '₹18.50 / kg',
                    deadlineLabel: '2 days left',
                  },
                  {
                    id: 'l2',
                    cropName: 'Maize',
                    quantityLabel: '7,200 kg',
                    location: 'Hassan, Karnataka',
                    currentOfferLabel: '₹22.00 / kg',
                    deadlineLabel: '4 days left',
                  },
                  {
                    id: 'l3',
                    cropName: 'Wheat',
                    quantityLabel: '5,000 kg',
                    location: 'Dharwad, Karnataka',
                    currentOfferLabel: '₹26.00 / kg',
                    deadlineLabel: '5 days left',
                  },
                ]}
                onViewDetails={(id) => setNotice(`Preview View Details for lot ${id}`)}
                onPlaceBid={(id) => setNotice(`Preview Place Bid for lot ${id}`)}
              />
            )}

            {tab === 'labour' && (
              <PremiumLabourDashboard
                workerName="Manjunath (Preview)"
                language={lang}
                jobs={[
                  {
                    id: 'j1',
                    workType: 'Tomato Staking & Harvesting',
                    location: 'Gubbi, Tumakuru',
                    dailyWageLabel: '₹550 / day',
                    dateLabel: 'Tomorrow',
                    workingHoursLabel: '7:00 AM – 2:00 PM',
                    status: 'Open',
                  },
                  {
                    id: 'j2',
                    workType: 'Maize Weeding & Intercultivation',
                    location: 'Sira, Tumakuru',
                    dailyWageLabel: '₹500 / day',
                    dateLabel: '27 Nov 2026',
                    workingHoursLabel: '7:30 AM – 2:30 PM',
                    status: 'Applied',
                  },
                ]}
                onApplyJob={(id) => setNotice(`Preview Apply clicked for job ${id}`)}
                onActionTile={(tile) => setNotice(`Preview Labour tile: ${tile}`)}
              />
            )}

            {tab === 'driver' && (
              <PremiumDriverDashboard
                driverName="Suresh Kumar (Preview)"
                vehicleLabel="Tata Ace Gold · 1.5 Ton"
                loads={[
                  {
                    id: 'd1',
                    pickupLocation: 'Tumakuru Farm Gate',
                    deliveryDestination: 'Yeshwanthpur APMC',
                    produceName: 'Tomato Crates',
                    loadWeightLabel: '1,200 kg',
                    quotedChargeLabel: '₹3,800',
                    status: 'In Transit',
                    progressPct: 65,
                  },
                  {
                    id: 'd2',
                    pickupLocation: 'Kolar Collection Point',
                    deliveryDestination: 'KR Market Bengaluru',
                    produceName: 'Maize Bags',
                    loadWeightLabel: '1,450 kg',
                    quotedChargeLabel: '₹4,200',
                    status: 'Requested',
                    progressPct: 0,
                  },
                ]}
                onLoadAction={(id) => setNotice(`Preview Driver action for load ${id}`)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
