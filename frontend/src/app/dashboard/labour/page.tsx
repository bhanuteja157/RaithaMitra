// frontend/src/app/dashboard/labour/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { getIntlLocale } from '@/lib/translations';
import {
  HardHat,
  Search,
  Briefcase,
  Coins,
  User,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const LABOUR_DASH_I18N: Record<
  Language,
  {
    badge: string;
    ruralEmployment: string;
    greeting: string;
    subtitle: string;
    findWork: string;
    findWorkSub: string;
    myJobs: string;
    confirmedShifts: string;
    wagesEarnedSub: string;
    availableForWork: string;
    busy: string;
    historyTitle: string;
    farmerColon: string;
    perDay: string;
    noAppsYet: string;
  }
> = {
  en: {
    badge: 'Labour Portal',
    ruralEmployment: 'Direct Rural Wage Employment',
    greeting: 'Hello,',
    subtitle: 'Find daily agricultural work nearby, track your confirmed jobs, and receive guaranteed wages directly from farmers.',
    findWork: 'Find Work',
    findWorkSub: 'Browse harvesting & sowing jobs',
    myJobs: 'My Jobs',
    confirmedShifts: 'confirmed shifts',
    wagesEarnedSub: 'Recorded wages earned',
    availableForWork: 'Available for Work',
    busy: 'Busy',
    historyTitle: 'Your Job Applications & Work History',
    farmerColon: 'Farmer:',
    perDay: 'Per Day',
    noAppsYet: "No active job applications yet. Click 'Find Work' above to discover harvesting jobs!",
  },
  kn: {
    badge: 'ಕಾರ್ಮಿಕ ಪೋರ್ಟಲ್',
    ruralEmployment: 'ನೇರ ಗ್ರಾಮೀಣ ಕೂಲಿ ಉದ್ಯೋಗ',
    greeting: 'ನಮಸ್ಕಾರ,',
    subtitle: 'ಸಮೀಪದ ದೈನಂದಿನ ಕೃಷಿ ಕೆಲಸಗಳನ್ನು ಹುಡುಕಿ, ದೃಢೀಕೃತ ಕೆಲಸಗಳನ್ನು ನೋಡಿ ಮತ್ತು ರೈತರಿಂದ ನೇರ ಕೂಲಿ ಪಡೆಯಿರಿ.',
    findWork: 'ಕೆಲಸ ಹುಡುಕಿ',
    findWorkSub: 'ಕೊಯ್ಲು ಮತ್ತು ಬಿತ್ತನೆ ಕೆಲಸಗಳನ್ನು ನೋಡಿ',
    myJobs: 'ನನ್ನ ಕೆಲಸಗಳು',
    confirmedShifts: 'ದೃಢೀಕೃತ ಪಾಳಿಗಳು',
    wagesEarnedSub: 'ದಾಖಲಾದ ಗಳಿಸಿದ ಕೂಲಿ',
    availableForWork: 'ಕೆಲಸಕ್ಕೆ ಲಭ್ಯವಿದೆ',
    busy: 'ಕಾರ್ಯನಿರತ',
    historyTitle: 'ನಿಮ್ಮ ಕೆಲಸದ ಅರ್ಜಿಗಳು ಮತ್ತು ಕೆಲಸದ ಇತಿಹಾಸ',
    farmerColon: 'ರೈತ:',
    perDay: 'ದಿನಕ್ಕೆ',
    noAppsYet: "ಇನ್ನೂ ಯಾವುದೇ ಸಕ್ರಿಯ ಅರ್ಜಿಗಳಿಲ್ಲ. ಕೊಯ್ಲು ಕೆಲಸಗಳನ್ನು ಹುಡುಕಲು ಮೇಲೆ 'ಕೆಲಸ ಹುಡುಕಿ' ಕ್ಲಿಕ್ ಮಾಡಿ!",
  },
  hi: {
    badge: 'श्रमिक पोर्टल',
    ruralEmployment: 'सीधा ग्रामीण मजदूरी रोजगार',
    greeting: 'नमस्ते,',
    subtitle: 'आसपास के दैनिक कृषि कार्य खोजें, पक्की शिफ्ट ट्रैक करें और किसानों से सीधे मजदूरी प्राप्त करें।',
    findWork: 'काम खोजें',
    findWorkSub: 'कटाई और बुवाई के काम देखें',
    myJobs: 'मेरे काम',
    confirmedShifts: 'पक्की शिफ्ट',
    wagesEarnedSub: 'दर्ज की गई कमाई',
    availableForWork: 'काम के लिए उपलब्ध',
    busy: 'व्यस्त',
    historyTitle: 'आपके नौकरी आवेदन और कार्य इतिहास',
    farmerColon: 'किसान:',
    perDay: 'प्रति दिन',
    noAppsYet: "अभी कोई सक्रिय आवेदन नहीं है। काम खोजने के लिए ऊपर 'काम खोजें' पर क्लिक करें!",
  },
  te: {
    badge: 'కూలీల పోర్టల్',
    ruralEmployment: 'నేరుగా గ్రామీణ వేతన ఉపాధి',
    greeting: 'నమస్కారం,',
    subtitle: 'సమీపంలోని రోజువారీ వ్యవసాయ పనులను కనుగొనండి, ఖరారైన పనులను ట్రాక్ చేసి రైతుల నుండి నేరుగా వేతనం పొందండి.',
    findWork: 'పని వెతకండి',
    findWorkSub: 'కోత & విత్తే పనులను చూడండి',
    myJobs: 'నా పనులు',
    confirmedShifts: 'ఖరారైన షిఫ్ట్‌లు',
    wagesEarnedSub: 'నమోదైన వేతన ఆదాయం',
    availableForWork: 'పనికి అందుబాటులో ఉన్నారు',
    busy: 'బిజీగా ఉన్నారు',
    historyTitle: 'మీ పని దరఖాస్తులు & పని చరిత్ర',
    farmerColon: 'రైతు:',
    perDay: 'రోజుకు',
    noAppsYet: "ఇంకా సక్రియ దరఖాస్తులు లేవు. పనులను కనుగొనడానికి పైనున్న 'పని వెతకండి' పై క్లిక్ చేయండి!",
  },
};

export default function LabourDashboardPage() {
  const { currentUser, language } = useFarm();
  const t = LABOUR_DASH_I18N[language];
  const numLocale = getIntlLocale(language);
  const [profile, setProfile] = useState<any>(null);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser.role !== 'labour') {
      setProfile(null);
      setMyJobs([]);
      return;
    }
    async function loadLabourData() {
      setLoading(true);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
        const profRes = await fetch(`${backendUrl}/labour/my-profile?user_id=${currentUser.id}`);
        if (profRes.ok) setProfile(await profRes.json());
        const jobsRes = await fetch(`${backendUrl}/labour/my-jobs?labour_id=${currentUser.id}`);
        if (jobsRes.ok) setMyJobs(await jobsRes.json());
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    }
    loadLabourData();
  }, [currentUser.id, currentUser.role]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Mobile-Friendly Greeting Header */}
      <div className="p-6 bg-gradient-to-r from-blue-950 via-zinc-900 to-blue-900 border border-blue-800/60 rounded-3xl shadow-xl text-white space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
            {t.badge}
          </span>
          <span className="text-xs text-zinc-400">{t.ruralEmployment}</span>
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
        {/* Action 1: Find Work */}
        <Link
          href="/labour"
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:shadow-xl transition-all flex flex-col items-center text-center space-y-3 group"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
            <Search className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              {t.findWork}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {t.findWorkSub}
            </p>
          </div>
        </Link>

        {/* Action 2: My Jobs */}
        <div
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-sm">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              {t.myJobs} ({myJobs.length})
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {myJobs.filter(j => j.app_status === 'accepted').length} {t.confirmedShifts}
            </p>
          </div>
        </div>

        {/* Action 3: My Earnings */}
        <div
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-sm">
            <Coins className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              ₹{profile ? profile.total_earnings.toLocaleString(numLocale) : '8,400'}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {t.wagesEarnedSub}
            </p>
          </div>
        </div>

        {/* Action 4: My Profile */}
        <div
          className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 flex items-center justify-center shadow-sm">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">
              ⭐ {profile?.rating || 4.9}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {profile?.availability_status === 'available' ? t.availableForWork : t.busy}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Applications & Shifts */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          {t.historyTitle}
        </h3>

        {myJobs.length > 0 ? (
          <div className="space-y-3">
            {myJobs.map((j) => (
              <div
                key={j.application_id}
                className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">
                      {j.title}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      j.app_status === 'accepted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      j.app_status === 'completed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                      {j.app_status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {t.farmerColon} <strong>{j.farmer_name}</strong> • 📍 {j.work_location} • {j.work_date}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-base text-zinc-900 dark:text-white">
                    ₹{j.wage_per_day}
                  </div>
                  <div className="text-[10px] text-zinc-400">{t.perDay}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 p-4 text-center">
            {t.noAppsYet}
          </p>
        )}
      </div>
    </div>
  );
}
