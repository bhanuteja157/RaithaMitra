// frontend/src/app/dashboard/buyer/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { BiddingListing, PurchaseOrder, Language } from '@/types';
import { getIntlLocale, localizeCropName } from '@/lib/translations';
import {
  ShoppingBag,
  TrendingUp,
  Gavel,
  ShieldCheck,
  Truck,
  ArrowRight,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Store
} from 'lucide-react';
import { NurserySellerInventoryWidget } from '@/components/dashboard/NurserySellerInventoryWidget';

const BUYER_DASH_I18N: Record<
  Language,
  {
    portalBadge: string;
    welcome: string;
    subtitle: string;
    viewLiveAuction: string;
    activeAuctions: string;
    activeAuctionsSub: string;
    confirmedPurchases: string;
    ordersSuffix: string;
    confirmedPurchasesSub: string;
    accountStatus: string;
    apmcVerified: string;
    licencePrefix: string;
    availableLotsTitle: string;
    goToBidding: string;
    defaultGrade: string;
    kg: string;
    perKg: string;
    farmerColon: string;
    reserveColon: string;
    topOfferColon: string;
    placeBidBtn: string;
  }
> = {
  en: {
    portalBadge: 'Wholesale Procurement Portal',
    welcome: 'Welcome,',
    subtitle: 'Browse verified farm-gate produce lots, participate in transparent competitive auctions, and generate compliant purchase orders.',
    viewLiveAuction: 'View Live Auction Desk',
    activeAuctions: 'Active Produce Auctions',
    activeAuctionsSub: 'Direct from Mandya & Ramanagara farmers',
    confirmedPurchases: 'Confirmed Purchases',
    ordersSuffix: 'Orders',
    confirmedPurchasesSub: 'Atomic purchase orders issued',
    accountStatus: 'Procurement Account Status',
    apmcVerified: 'APMC Verified',
    licencePrefix: 'Licence:',
    availableLotsTitle: 'Available Farm-Gate Lots for Bidding',
    goToBidding: 'Go to Bidding Desk →',
    defaultGrade: 'A-Grade',
    kg: 'kg',
    perKg: '/kg',
    farmerColon: 'Farmer:',
    reserveColon: 'Reserve:',
    topOfferColon: 'Top Offer:',
    placeBidBtn: 'Place Competing Bid',
  },
  kn: {
    portalBadge: 'ಸಗಟು ಖರೀದಿ ಪೋರ್ಟಲ್',
    welcome: 'ನಮಸ್ಕಾರ,',
    subtitle: 'ಪರಿಶೀಲಿತ ರೈತರ ಬೆಳೆ ಲಾಟ್‌ಗಳನ್ನು ವೀಕ್ಷಿಸಿ, ಪಾರದರ್ಶಕ ಹರಾಜುಗಳಲ್ಲಿ ಭಾಗವಹಿಸಿ ಮತ್ತು ಖರೀದಿ ಆದೇಶಗಳನ್ನು ಪಡೆಯಿರಿ.',
    viewLiveAuction: 'ನೇರ ಹರಾಜು ಮೇಜು ನೋಡಿ',
    activeAuctions: 'ಸಕ್ರಿಯ ಬೆಳೆ ಹರಾಜುಗಳು',
    activeAuctionsSub: 'ಮಂಡ್ಯ ಮತ್ತು ರಾಮನಗರ ರೈತರಿಂದ ನೇರವಾಗಿ',
    confirmedPurchases: 'ದೃಢೀಕೃತ ಖರೀದಿಗಳು',
    ordersSuffix: 'ಆದೇಶಗಳು',
    confirmedPurchasesSub: 'ಖರೀದಿ ಆದೇಶಗಳನ್ನು ನೀಡಲಾಗಿದೆ',
    accountStatus: 'ಖರೀದಿ ಖಾತೆ ಸ್ಥಿತಿ',
    apmcVerified: 'APMC ಪರಿಶೀಲಿತ',
    licencePrefix: 'ಪರವಾನಗಿ:',
    availableLotsTitle: 'ಹರಾಜಿಗೆ ಲಭ್ಯವಿರುವ ಜಮೀನು ಲಾಟ್‌ಗಳು',
    goToBidding: 'ಹರಾಜು ಮೇಜಿಗೆ ಹೋಗಿ →',
    defaultGrade: 'ಎ-ದರ್ಜೆ',
    kg: 'ಕೆಜಿ',
    perKg: '/ಕೆಜಿ',
    farmerColon: 'ರೈತ:',
    reserveColon: 'ಕನಿಷ್ಠ ಬೆಲೆ:',
    topOfferColon: 'ಗರಿಷ್ಠ ಬಿಡ್:',
    placeBidBtn: 'ಸ್ಪರ್ಧಾತ್ಮಕ ಬಿಡ್ ಸಲ್ಲಿಸಿ',
  },
  hi: {
    portalBadge: 'थोक खरीद पोर्टल',
    welcome: 'स्वागत है,',
    subtitle: 'सत्यापित खेत-स्तर उपज लॉट देखें, पारदर्शी नीलामियों में भाग लें और खरीद आदेश बनाएं।',
    viewLiveAuction: 'लाइव बोली डेस्क देखें',
    activeAuctions: 'सक्रिय उपज नीलामियां',
    activeAuctionsSub: 'मंड्या और रामनगर के किसानों से सीधे',
    confirmedPurchases: 'पुष्ट खरीद आदेश',
    ordersSuffix: 'आदेश',
    confirmedPurchasesSub: 'आधिकारिक खरीद आदेश जारी',
    accountStatus: 'खरीद खाता स्थिति',
    apmcVerified: 'APMC सत्यापित',
    licencePrefix: 'लाइसेंस:',
    availableLotsTitle: 'बोली के लिए उपलब्ध खेत-स्तरीय लॉट',
    goToBidding: 'बोली डेस्क पर जाएं →',
    defaultGrade: 'ए-ग्रेड',
    kg: 'किलो',
    perKg: '/किलो',
    farmerColon: 'किसान:',
    reserveColon: 'न्यूनतम भाव:',
    topOfferColon: 'शीर्ष बोली:',
    placeBidBtn: 'प्रतिस्पर्धी बोली लगाएं',
  },
  te: {
    portalBadge: 'టోకు కొనుగోలు పోర్టల్',
    welcome: 'స్వాగతం,',
    subtitle: 'ధృవీకరించబడిన పంట లాట్లను చూడండి, పారదర్శక పోటీ వేలంలో పాల్గొని కొనుగోలు ఆర్డర్లను రూపొందించండి.',
    viewLiveAuction: 'లైవ్ వేలం డెస్క్ చూడండి',
    activeAuctions: 'సక్రియ పంట వేలం పాటలు',
    activeAuctionsSub: 'మండ్యా & రామనగర రైతుల నుండి నేరుగా',
    confirmedPurchases: 'నిర్ధారించిన కొనుగోళ్లు',
    ordersSuffix: 'ఆర్డర్లు',
    confirmedPurchasesSub: 'కొనుగోలు ఆర్డర్లు జారీ చేయబడ్డాయి',
    accountStatus: 'కొనుగోలు ఖాతా స్థితి',
    apmcVerified: 'APMC ధృవీకరించబడింది',
    licencePrefix: 'లైసెన్స్:',
    availableLotsTitle: 'బిడ్డింగ్ కోసం అందుబాటులో ఉన్న పంట లాట్లు',
    goToBidding: 'బిడ్డింగ్ డెస్క్‌కు వెళ్ళండి →',
    defaultGrade: 'ఎ-గ్రేడ్',
    kg: 'కిలోలు',
    perKg: '/కిలో',
    farmerColon: 'రైతు:',
    reserveColon: 'కనీస ధర:',
    topOfferColon: 'అత్యధిక బిడ్:',
    placeBidBtn: 'పోటీ బిడ్ వేయండి',
  },
};

export default function BuyerDashboardPage() {
  const { currentUser, language } = useFarm();
  const t = BUYER_DASH_I18N[language];
  const numLocale = getIntlLocale(language);
  const [listings, setListings] = useState<BiddingListing[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser.role !== 'buyer') {
      setListings([]);
      setOrders([]);
      return;
    }
    async function fetchBuyerData() {
      setLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
        const listRes = await fetch(`${backendUrl}/bidding/listings?status_filter=active`);
        if (listRes.ok) setListings(await listRes.json());
        const ordersRes = await fetch(`${backendUrl}/bidding/orders`);
        if (ordersRes.ok) setOrders(await ordersRes.json());
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }
    fetchBuyerData();
  }, [currentUser.id, currentUser.role]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-950 via-zinc-900 to-teal-950 border border-emerald-800/60 rounded-3xl shadow-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            {t.portalBadge}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2">
            {t.welcome} {currentUser.name}
          </h1>
          <p className="text-sm text-zinc-300 mt-1">
            {t.subtitle}
          </p>
        </div>

        <Link
          href="/bidding"
          className="px-5 py-3 rounded-xl bg-rm-accent hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-md transition-transform hover:scale-105 self-start md:self-auto shrink-0"
        >
          {t.viewLiveAuction}
        </Link>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{t.activeAuctions}</div>
          <div className="text-3xl font-black text-zinc-900 dark:text-white">{listings.length}</div>
          <div className="text-[11px] text-emerald-600">{t.activeAuctionsSub}</div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{t.confirmedPurchases}</div>
          <div className="text-3xl font-black text-emerald-600">{orders.length} {t.ordersSuffix}</div>
          <div className="text-[11px] text-zinc-400">{t.confirmedPurchasesSub}</div>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{t.accountStatus}</div>
          <div className="text-2xl font-bold text-purple-600">{t.apmcVerified}</div>
          <div className="text-[11px] text-zinc-400">{t.licencePrefix} KA-APMC-BNG-8491</div>
        </div>
      </div>

      {/* Live Produce for Bidding */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-rm-primary dark:text-rm-accent" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              {t.availableLotsTitle}
            </h2>
          </div>
          <Link href="/bidding" className="text-xs font-bold text-rm-primary hover:underline">
            {t.goToBidding}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((l) => (
            <div
              key={l.id}
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">{localizeCropName(l.crop_name, language)}</h3>
                  <p className="text-xs text-zinc-500">{l.variety || t.defaultGrade}</p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {l.quantity_kg.toLocaleString(numLocale)} {t.kg}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span>📍 {l.location}</span>
                <span>🌾 {t.farmerColon} <strong>{l.farmer_name}</strong></span>
                <span>{t.reserveColon} <strong>₹{l.min_price_per_kg}{t.perKg}</strong></span>
                <span>{t.topOfferColon} <strong className="text-emerald-600">₹{l.highest_bid_amount || l.min_price_per_kg}{t.perKg}</strong></span>
              </div>

              <Link
                href="/bidding"
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rm-primary hover:bg-rm-dark text-white text-xs font-bold shadow-sm transition-colors"
              >
                <span>{t.placeBidBtn}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Authorized Nursery & Bio-Input Inventory Management */}
      <div className="pt-4">
        <NurserySellerInventoryWidget />
      </div>
    </div>
  );
}
