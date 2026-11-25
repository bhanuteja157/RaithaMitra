// frontend/src/app/dashboard/driver/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { getIntlLocale, localizeCropName } from '@/lib/translations';
import {
  Truck,
  Search,
  CalendarCheck,
  Coins,
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react';

const DRIVER_DASH_I18N: Record<
  Language,
  {
    badge: string;
    freightDispatch: string;
    greeting: string;
    subtitle: string;
    findLoads: string;
    findLoadsSub: string;
    myTrips: string;
    activeDispatches: string;
    vehicleName: string;
    capSuffix: string;
    earningsSub: string;
    milestoneTitle: string;
    manageDispatches: string;
    tripPrefix: string;
    kg: string;
    farmerColon: string;
    fromColon: string;
    toColon: string;
    noTrips: string;
  }
> = {
  en: {
    badge: 'Logistics Console',
    freightDispatch: 'Direct Farm-Gate Freight Dispatch',
    greeting: 'Hello,',
    subtitle: 'Accept farm produce freight requests directly from local farmers, update trip milestones, and track guaranteed delivery earnings.',
    findLoads: 'Find Loads',
    findLoadsSub: 'Browse farmer booking requests',
    myTrips: 'My Trips',
    activeDispatches: 'active dispatches',
    vehicleName: 'Tata Ace',
    capSuffix: 'kg Cap',
    earningsSub: 'Completed freight receipts',
    milestoneTitle: 'Trip Milestone Execution',
    manageDispatches: 'Manage All Dispatches →',
    tripPrefix: 'Trip #',
    kg: 'kg',
    farmerColon: 'Farmer:',
    fromColon: 'From:',
    toColon: 'To:',
    noTrips: "No active trips assigned. Click 'Find Loads' to accept farmer bookings!",
  },
  kn: {
    badge: 'ಸಾರಿಗೆ ಕನ್ಸೋಲ್',
    freightDispatch: 'ಜಮೀನಿನಿಂದ ನೇರ ಸರಕು ಸಾಗಾಣಿಕೆ',
    greeting: 'ನಮಸ್ಕಾರ,',
    subtitle: 'ಸ್ಥಳೀಯ ರೈತರಿಂದ ನೇರ ಸರಕು ಸಾಗಾಣಿಕೆ ವಿನಂತಿಗಳನ್ನು ಸ್ವೀಕರಿಸಿ, ಟ್ರಿಪ್ ಹಂತಗಳನ್ನು ನವೀಕರಿಸಿ ಮತ್ತು ಗಳಿಕೆಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ.',
    findLoads: 'ಲೋಡ್ ಹುಡುಕಿ',
    findLoadsSub: 'ರೈತರ ಬುಕಿಂಗ್ ವಿನಂತಿಗಳನ್ನು ನೋಡಿ',
    myTrips: 'ನನ್ನ ಟ್ರಿಪ್‌ಗಳು',
    activeDispatches: 'ಸಕ್ರಿಯ ಟ್ರಿಪ್‌ಗಳು',
    vehicleName: 'ಟಾಟಾ ಏಸ್ (Tata Ace)',
    capSuffix: 'ಕೆಜಿ ಸಾಮರ್ಥ್ಯ',
    earningsSub: 'ಪೂರ್ಣಗೊಂಡ ಸಾಗಾಣಿಕೆ ಗಳಿಕೆ',
    milestoneTitle: 'ಟ್ರಿಪ್ ಹಂತಗಳ ನಿರ್ವಹಣೆ',
    manageDispatches: 'ಎಲ್ಲಾ ಟ್ರಿಪ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ →',
    tripPrefix: 'ಟ್ರಿಪ್ #',
    kg: 'ಕೆಜಿ',
    farmerColon: 'ರೈತ:',
    fromColon: 'ಸ್ಥಳದಿಂದ:',
    toColon: 'ತಲುಪುವ ಸ್ಥಳ:',
    noTrips: "ಯಾವುದೇ ಸಕ್ರಿಯ ಟ್ರಿಪ್ ಇಲ್ಲ. ರೈತರ ಬುಕಿಂಗ್ ಸ್ವೀಕರಿಸಲು 'ಲೋಡ್ ಹುಡುಕಿ' ಕ್ಲಿಕ್ ಮಾಡಿ!",
  },
  hi: {
    badge: 'लॉजिस्टिक्स कंसोल',
    freightDispatch: 'खेत से सीधी माल ढुलाई सेवा',
    greeting: 'नमस्ते,',
    subtitle: 'स्थानीय किसानों से सीधे माल ढुलाई अनुरोध स्वीकार करें, यात्रा स्थिति अपडेट करें और आय ट्रैक करें।',
    findLoads: 'लोड खोजें',
    findLoadsSub: 'किसान बुकिंग अनुरोध देखें',
    myTrips: 'मेरी यात्राएं',
    activeDispatches: 'सक्रिय बुकिंग',
    vehicleName: 'टाटा एस (Tata Ace)',
    capSuffix: 'किलो क्षमता',
    earningsSub: 'पूर्ण माल ढुलाई रसीदें',
    milestoneTitle: 'यात्रा चरण प्रबंधन',
    manageDispatches: 'सभी बुकिंग प्रबंधित करें →',
    tripPrefix: 'ट्रिप #',
    kg: 'किलो',
    farmerColon: 'किसान:',
    fromColon: 'कहाँ से:',
    toColon: 'कहाँ तक:',
    noTrips: "कोई सक्रिय ट्रिप नहीं है। किसान बुकिंग स्वीकार करने के लिए 'लोड खोजें' पर क्लिक करें!",
  },
  te: {
    badge: 'రవాణా కన్సోల్',
    freightDispatch: 'పొలం నుండి నేరుగా సరుకు రవాణా',
    greeting: 'నమస్కారం,',
    subtitle: 'స్థానిక రైతుల నుండి రవాణా అభ్యర్థనలను అంగీకరించండి, ట్రిప్ దశలను అప్‌డేట్ చేసి మీ సంపాదనను చూడండి.',
    findLoads: 'లోడ్లు వెతకండి',
    findLoadsSub: 'రైతుల బుకింగ్ అభ్యర్థనలను చూడండి',
    myTrips: 'నా ట్రిప్పులు',
    activeDispatches: 'సక్రియ ట్రిప్పులు',
    vehicleName: 'టాటా ఏస్ (Tata Ace)',
    capSuffix: 'కిలోల సామర్థ్యం',
    earningsSub: 'పూర్తయిన రవాణా ఆదాయం',
    milestoneTitle: 'ట్రిప్ దశల నిర్వహణ',
    manageDispatches: 'అన్ని ట్రిప్పులను నిర్వహించండి →',
    tripPrefix: 'ట్రిప్ #',
    kg: 'కిలోలు',
    farmerColon: 'రైతు:',
    fromColon: 'నుండి:',
    toColon: 'కు:',
    noTrips: "సక్రియ ట్రిప్పులు ఏవీ లేవు. బుకింగ్స్ అంగీకరించడానికి 'లోడ్లు వెతకండి' పై క్లిక్ చేయండి!",
  },
};

export default function DriverDashboardPage() {
  const { currentUser, language } = useFarm();
  const t = DRIVER_DASH_I18N[language];
  const numLocale = getIntlLocale(language);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser.role !== 'driver') {
      setBookings([]);
      return;
    }
    async function loadDriverData() {
      setLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
        const res = await fetch(`${backendUrl}/transport/bookings?user_id=${currentUser.id}&role=driver`);
        if (res.ok) setBookings(await res.json());
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }
    loadDriverData();
  }, [currentUser.id, currentUser.role]);

  const totalEarnings = bookings
    .filter(b => b.status === 'delivered')
    .reduce((acc, b) => acc + (b.total_fare || 0), 12500);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Driver Greeting Header */}
      <div className="p-6 bg-gradient-to-r from-purple-950 via-zinc-900 to-purple-900 border border-purple-800/60 rounded-3xl shadow-xl text-white space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
            {t.badge}
          </span>
          <span className="text-xs text-zinc-400">{t.freightDispatch}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          {t.greeting} {currentUser.name}
        </h1>
        <p className="text-sm text-zinc-300">
          {t.subtitle}
        </p>
      </div>

      {/* 4 Large Mobile-Friendly Primary Action Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Action 1: Find Loads */}
        <Link
          href="/transport"
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 hover:border-purple-500 hover:shadow-xl transition-all flex flex-col items-center text-center space-y-3 group"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
            <Search className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              {t.findLoads}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {t.findLoadsSub}
            </p>
          </div>
        </Link>

        {/* Action 2: My Bookings */}
        <div
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-sm">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              {t.myTrips} ({bookings.length})
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {bookings.filter(b => b.status !== 'delivered').length} {t.activeDispatches}
            </p>
          </div>
        </div>

        {/* Action 3: My Vehicle */}
        <div
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center shadow-sm">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              {t.vehicleName}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              KA-11-EA-4521 • 1500 {t.capSuffix}
            </p>
          </div>
        </div>

        {/* Action 4: My Earnings */}
        <div
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-sm">
            <Coins className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              ₹{totalEarnings.toLocaleString(numLocale)}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {t.earningsSub}
            </p>
          </div>
        </div>
      </div>

      {/* Driver Booking Dispatches List */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            {t.milestoneTitle}
          </h3>
          <Link href="/transport" className="text-xs font-bold text-purple-600 hover:underline">
            {t.manageDispatches}
          </Link>
        </div>

        {bookings.length > 0 ? (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">
                      {t.tripPrefix}{b.id.slice(3, 8)} • {localizeCropName(b.produce_type, language)} ({b.weight_kg} {t.kg})
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 uppercase">
                      {b.status}
                    </span>
                  </div>
                  <strong className="text-sm font-extrabold text-emerald-600">
                    ₹{b.total_fare.toLocaleString(numLocale)}
                  </strong>
                </div>

                <div className="text-xs text-zinc-500">
                  {t.farmerColon} <strong>{b.farmer_name}</strong> | {t.fromColon} {b.pickup_location} → {t.toColon} {b.delivery_destination}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 p-4 text-center">
            {t.noTrips}
          </p>
        )}
      </div>
    </div>
  );
}
