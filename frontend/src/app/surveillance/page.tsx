// frontend/src/app/surveillance/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { fetchSurveillanceSummary } from '@/lib/cropDiagnosticsApi';
import { localizeCropName, localizeDiseaseName, getIntlLocale } from '@/lib/translations';
import { Language } from '@/types';
import { Activity } from 'lucide-react';

const SURV_I18N: Record<Language, {
  title: string; badge: string; sub: string;
  clusterLbl: string; clusterVal: string; clusterSub: string;
  windLbl: string; windVal: string; windSub: string;
  protLbl: string; protVal: string; protSub: string;
  feedTitle: string; emptyMsg: string;
  regionLbl: string; obsLbl: string; statusLbl: string; latestLbl: string;
}> = {
  en: {
    title: 'Community Disease Surveillance Network', badge: 'Regional Alerts',
    sub: 'Aggregated regional crop disease reports, wind dispersion, and preventative alerts',
    clusterLbl: 'Regional Cluster Alert', clusterVal: 'Early Blight Watch', clusterSub: '3 neighboring farms reported nearby',
    windLbl: 'Spore Wind Vector', windVal: 'ESE 9.2 km/h', windSub: 'Low airborne spread risk toward farm',
    protLbl: 'Community Protection Status', protVal: '88% Protected', protSub: 'Preventative bio-spray coverage',
    feedTitle: 'Confirmed Farmer-Submitted Disease Observations',
    emptyMsg: 'No community disease reports submitted yet. Report verified symptoms from AI Crop Doctor when needed.',
    regionLbl: 'Region:', obsLbl: 'Reports:', statusLbl: 'Status:', latestLbl: 'Latest:',
  },
  kn: {
    title: 'ಸಮುದಾಯ ಬೆಳೆ ರೋಗ ಕಣ್ಗಾವಲು ಜಾಲ', badge: 'ಪ್ರಾದೇಶಿಕ ಎಚ್ಚರಿಕೆ',
    sub: 'ಸುತ್ತಮುತ್ತಲಿನ ಜಮೀನುಗಳ ರೋಗ ವರದಿಗಳು, ಗಾಳಿಯ ದಿಕ್ಕು ಮತ್ತು ತಡೆಗಟ್ಟುವ ಎಚ್ಚರಿಕೆಗಳು',
    clusterLbl: 'ಪ್ರಾದೇಶಿಕ ರೋಗ ಎಚ್ಚರಿಕೆ', clusterVal: 'ಆರಂಭಿಕ ಅಂಗಮಾರಿ ಎಚ್ಚರಿಕೆ', clusterSub: 'ಹತ್ತಿರದ 3 ಜಮೀನುಗಳಲ್ಲಿ ವರದಿಯಾಗಿದೆ',
    windLbl: 'ಗಾಳಿ ಹರಡುವಿಕೆ ದಿಕ್ಕು', windVal: 'ESE 9.2 ಕಿ.ಮೀ/ಗಂ', windSub: 'ಜಮೀನಿನ ಕಡೆ ಕಡಿಮೆ ಹರಡುವ ಅಪಾಯ',
    protLbl: 'ರಕ್ಷಣಾ ಸ್ಥಿತಿ', protVal: '88% ಸುರಕ್ಷಿತ', protSub: 'ಮುಂಜಾಗ್ರತಾ ಜೈವಿಕ ಸಿಂಪಡಣೆ',
    feedTitle: 'ರೈತರು ದೃಢೀಕರಿಸಿ ಸಲ್ಲಿಸಿದ ರೋಗ ವರದಿಗಳು',
    emptyMsg: 'ಇನ್ನೂ ಯಾವುದೇ ಸಮುದಾಯ ರೋಗ ವರದಿ ಸಲ್ಲಿಕೆಯಾಗಿಲ್ಲ. AI ಬೆಳೆ ವೈದ್ಯರಿಂದ ಪರೀಕ್ಷಿಸಿ ವರದಿ ಹಂಚಿಕೊಳ್ಳಬಹುದು.',
    regionLbl: 'ಪ್ರದೇಶ:', obsLbl: 'ವರದಿಗಳು:', statusLbl: 'ಸ್ಥಿತಿ:', latestLbl: 'ಕೊನೆಯ ವರದಿ:',
  },
  hi: {
    title: 'सामुदायिक फसल रोग निगरानी नेटवर्क', badge: 'क्षेत्रीय चेतावनी',
    sub: 'आसपास के खेतों की रोग रिपोर्ट, हवा की दिशा और बचाव संबंधी अलर्ट',
    clusterLbl: 'क्षेत्रीय रोग चेतावनी', clusterVal: 'अगेती झुलसा सतर्कता', clusterSub: 'नजदीकी 3 खेतों से सूचना प्राप्त',
    windLbl: 'हवा फैलाव दिशा', windVal: 'ESE 9.2 किमी/घं', windSub: 'खेत की ओर कम फैलाव जोखिम',
    protLbl: 'सामुदायिक सुरक्षा स्थिति', protVal: '88% सुरक्षित', protSub: 'रोकथाम जैव-छिड़काव कवरेज',
    feedTitle: 'किसानों द्वारा साझा की गई रोग रिपोर्ट',
    emptyMsg: 'अभी तक कोई सामुदायिक रोग रिपोर्ट दर्ज नहीं हुई है। आवश्यकता होने पर AI फसल डॉक्टर से रिपोर्ट साझा करें।',
    regionLbl: 'क्षेत्र:', obsLbl: 'रिपोर्ट:', statusLbl: 'स्थिति:', latestLbl: 'ताज़ा रिपोर्ट:',
  },
  te: {
    title: 'సామాజిక పంట వ్యాధి నిఘా నెట్‌వర్క్', badge: 'ప్రాంతీయ హెచ్చరికలు',
    sub: 'చుట్టుపక్కల పొలాల వ్యాధి నివేదికలు, గాలి దిశ మరియు ముందస్తు జాగ్రత్తలు',
    clusterLbl: 'ప్రాంతీయ వ్యాధి హెచ్చరిక', clusterVal: 'ముందస్తు ఎండు తెగులు జాగ్రత్త', clusterSub: 'సమీప 3 పొలాలలో నివేదించబడింది',
    windLbl: 'గాలి వ్యాప్తి దిశ', windVal: 'ESE 9.2 కి.మీ/గం', windSub: 'పొలం వైపు తక్కువ వ్యాప్తి ప్రమాదం',
    protLbl: 'ప్రాంతీయ రక్షణ స్థితి', protVal: '88% సురక్షితం', protSub: 'ముందస్తు జీవ పిచికారీ రక్షణ',
    feedTitle: 'రైతులు నిర్ధారించి పంపిన వ్యాధి నివేదికలు',
    emptyMsg: 'ఇంకా ఎటువంటి ప్రాంతీయ వ్యాధి నివేదికలు లేవు. అవసరమైనప్పుడు AI పంట డాక్టర్ ద్వారా నివేదిక పంపండి.',
    regionLbl: 'ప్రాంతం:', obsLbl: 'నివేదికలు:', statusLbl: 'స్థితి:', latestLbl: 'తాజాది:',
  },
};

export default function SurveillancePage() {
  const { language } = useFarm();
  const L = SURV_I18N[language] || SURV_I18N.en;
  const [reports, setReports] = useState<
    Array<{
      crop: string;
      suspected_disease: string;
      region: string;
      verification_status: string;
      observation_count: number;
      latest_report_date: string;
    }>
  >([]);

  useEffect(() => {
    fetchSurveillanceSummary().then(setReports);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                {L.title}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {L.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {L.sub}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{L.clusterLbl}</div>
          <div className="text-2xl font-bold text-amber-600">{L.clusterVal}</div>
          <div className="text-[11px] text-zinc-400">{L.clusterSub}</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{L.windLbl}</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{L.windVal}</div>
          <div className="text-[11px] text-zinc-400">{L.windSub}</div>
        </div>
        <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-1">
          <div className="text-xs font-semibold text-zinc-500">{L.protLbl}</div>
          <div className="text-2xl font-bold text-emerald-600">{L.protVal}</div>
          <div className="text-[11px] text-zinc-400">{L.protSub}</div>
        </div>
      </div>

      <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3 text-xs">
        <div className="font-bold text-sm text-zinc-900 dark:text-white">
          {L.feedTitle}
        </div>
        {reports.length === 0 ? (
          <p className="text-zinc-500">{L.emptyMsg}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reports.map((rep, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="font-bold text-zinc-900 dark:text-white">
                  {localizeCropName(rep.crop, language)} — {localizeDiseaseName(rep.suspected_disease, language)}
                </div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  {L.regionLbl} {rep.region} · {L.obsLbl} {rep.observation_count} · {L.statusLbl} {rep.verification_status}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {L.latestLbl} {new Date(rep.latest_report_date).toLocaleString(getIntlLocale(language))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
