// frontend/src/components/dashboard/FlagshipHub.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { Dna, Users, Gavel, Truck, ArrowRight, MapPin, TrendingUp } from 'lucide-react';
import { AGRI_IMAGE_ASSETS } from '@/components/premium-ui/shared/AgriImage';

const FLAGSHIP_I18N: Record<Language, {
  heading: string;
  bioTag: string; bioMetric: string;
  labTag: string; labMetric: string;
  bidTag: string; bidMetric: string;
  trnTag: string; trnMetric: string;
  dfBadge: string;
  miBadge: string;
}> = {
  en: {
    heading: 'Four Flagship Innovations',
    bioTag: 'Genomics & Agri-Biotechnology', bioMetric: '300K+ Papers Indexed',
    labTag: 'Farm Workforce Network', labMetric: 'Direct Wage Network',
    bidTag: 'Farmer-First Produce Auction', bidMetric: 'Direct to Buyer',
    trnTag: 'Farm-to-Market Logistics', trnMetric: 'OR-Tools Optimized',
    dfBadge: 'Digital Farming & Geospatial Simulator',
    miBadge: 'Agricultural Market Intelligence',
  },
  kn: {
    heading: 'ನಾಲ್ಕು ಪ್ರಮುಖ ಕೃಷಿ ಸೌಲಭ್ಯಗಳು',
    bioTag: 'ಬೀಜ ಮತ್ತು ಕೃಷಿ ಸಂಶೋಧನೆ', bioMetric: '3 ಲಕ್ಷ+ ಸಂಶೋಧನಾ ಪ್ರಬಂಧಗಳು',
    labTag: 'ಕೃಷಿ ಕಾರ್ಮಿಕ ಜಾಲ', labMetric: 'ನೇರ ಕೂಲಿ ಸಂಪರ್ಕ',
    bidTag: 'ರೈತ-ಪರ ಬೆಳೆ ಹರಾಜು', bidMetric: 'ಖರೀದಿದಾರರಿಗೆ ನೇರ ಮಾರಾಟ',
    trnTag: 'ಜಮೀನಿನಿಂದ ಮಂಡಿಗೆ ಸಾರಿಗೆ', trnMetric: 'ಉತ್ತಮ ಮಾರ್ಗ ಯೋಜನೆ',
    dfBadge: 'ಡಿಜಿಟಲ್ ಕೃಷಿ ಮತ್ತು ಉಪಗ್ರಹ ನಕ್ಷೆ',
    miBadge: 'ಕೃಷಿ ಮಾರುಕಟ್ಟೆ ಬುದ್ಧಿವಂತಿಕೆ',
  },
  hi: {
    heading: 'चार प्रमुख कृषि सेवाएं',
    bioTag: 'बीज विज्ञान व कृषि शोध', bioMetric: '3 लाख+ शोध पत्र उपलब्ध',
    labTag: 'कृषि श्रमिक नेटवर्क', labMetric: 'सीधा मजदूरी नेटवर्क',
    bidTag: 'किसान-हितैषी उपज नीलामी', bidMetric: 'खरीदार को सीधी बिक्री',
    trnTag: 'खेत से मंडी परिवहन', trnMetric: 'मार्ग अनुकूलित',
    dfBadge: 'डिजिटल खेती व उपग्रह सिम्युलेटर',
    miBadge: 'कृषि मंडी बाज़ार जानकारी',
  },
  te: {
    heading: 'నాలుగు ప్రధాన వ్యవసాయ సేవలు',
    bioTag: 'విత్తన శాస్త్రం & పరిశోధన', bioMetric: '3 లక్షల+ పరిశోధన పత్రాలు',
    labTag: 'వ్యవసాయ కూలీల నెట్‌వర్క్', labMetric: 'నేరుగా కూలీ ఒప్పందాలు',
    bidTag: 'రైతు-ప్రథమ పంట వేలం', bidMetric: 'కొనుగోలుదారుకు నేరుగా',
    trnTag: 'పొలం నుండి మార్కెట్‌కు రవాణా', trnMetric: 'ఉత్తమ మార్గ ప్రణాళిక',
    dfBadge: 'డిజిటల్ వ్యవసాయం & ఉపగ్రహ మ్యాప్',
    miBadge: 'వ్యవసాయ మార్కెట్ సమాచారం',
  },
};

export function FlagshipHub() {
  const { t, language } = useFarm();
  const L = FLAGSHIP_I18N[language] || FLAGSHIP_I18N.en;

  const flagships = [
    {
      id: 'biointel',
      title: t('biointel'),
      tagline: L.bioTag,
      description: t('biointelDesc'),
      icon: Dna,
      image: AGRI_IMAGE_ASSETS.featureBiointel,
      href: '/biointel',
      metric: L.bioMetric,
    },
    {
      id: 'labour',
      title: t('labourConnect'),
      tagline: L.labTag,
      description: t('labourConnectDesc'),
      icon: Users,
      image: AGRI_IMAGE_ASSETS.featureLabour,
      href: '/labour',
      metric: L.labMetric,
    },
    {
      id: 'bidding',
      title: t('smartBidding'),
      tagline: L.bidTag,
      description: t('smartBiddingDesc'),
      icon: Gavel,
      image: AGRI_IMAGE_ASSETS.featureBidding,
      href: '/smart-market?section=bidding',
      metric: L.bidMetric,
    },
    {
      id: 'transport',
      title: t('transportConnect'),
      tagline: L.trnTag,
      description: t('transportConnectDesc'),
      icon: Truck,
      image: AGRI_IMAGE_ASSETS.featureTransport,
      href: '/transport',
      metric: L.trnMetric,
    },
  ];

  return (
    <section className="space-y-5 rm-animate-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8D7357]">
            {t('flagshipHub')}
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#20372A] dark:text-white tracking-tight">
            {L.heading}
          </h2>
        </div>
        <span className="text-xs text-[#8D7357] dark:text-zinc-400">
          {t('flagshipSubnote')}
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
                  {t('openAction')} <ArrowRight className="w-3.5 h-3.5" />
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
            alt={L.dfBadge}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover rm-img-zoom"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#102D20]/75 via-[#173C2B]/40 to-transparent" />
          <div className="relative z-10 space-y-1.5 max-w-lg">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#C9A35C]">
              <MapPin className="w-3.5 h-3.5" /> {L.dfBadge}
            </span>
            <h3 className="font-serif text-xl font-semibold text-white">
              {t('planBeforePlantHeadline')}
            </h3>
            <p className="text-xs text-[#F7F5ED]/85">
              {t('planBeforePlantDesc')}
            </p>
          </div>
          <div className="relative z-10 pt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white group-hover:translate-x-0.5 transition-transform">
            {t('startDigitalFarming')} <ArrowRight className="w-4 h-4 text-[#C9A35C]" />
          </div>
        </Link>

        <Link
          href="/smart-market?section=market_intel"
          className="group lg:col-span-5 relative rounded-xl overflow-hidden border border-[#DCD8CA] dark:border-zinc-800 bg-[#F3EFE3] dark:bg-zinc-950 min-h-[168px] flex flex-col justify-between p-5 rm-card-hover"
        >
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8D7357]">
              <TrendingUp className="w-3.5 h-3.5 text-[#36784D]" /> {L.miBadge}
            </span>
            <h3 className="font-serif text-xl font-semibold text-[#20372A] dark:text-white">
              {t('marketIntelHeadline')}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {t('marketIntelDesc')}
            </p>
          </div>
          <div className="pt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#173C2B] dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
            {t('openMarketIntel')} <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </section>
  );
}
