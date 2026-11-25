// frontend/src/app/labour/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { LabourJob, LabourProfile, Language } from '@/types';
import { localizeCropName } from '@/lib/translations';
import { loadHarvestToLabourTransfer } from '@/lib/workflowBridge';
import ResourcesPage from '@/app/resources/page';
import {
  Users2,
  PlusCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  MapPin,
  Coins,
  HardHat,
  Sparkles,
  Phone,
  MessageSquare,
  Tractor
} from 'lucide-react';

const LABOUR_PAGE_I18N: Record<
  Language,
  {
    jobPostedMsg: string;
    appSubmittedMsg: string;
    couldNotApply: string;
    workerConfirmedMsg: string;
    jobCompletedMsg: string;
    flagshipBadge: string;
    subtitle: string;
    title: string;
    desc: string;
    postJobBtn: string;
    tabJobs: string;
    tabResources: string;
    openJobsTitle: string;
    clustersNote: string;
    recruiting: string;
    farmerColon: string;
    cropColon: string;
    perDay: string;
    workersLabel: string;
    hiredSuffix: string;
    applyJobBtn: string;
    acceptWorkerBtn: string;
    markCompletedBtn: string;
    workersDirTitle: string;
    workersDirNote: string;
    jobsSuffix: string;
    whatsappContact: string;
    modalTitle: string;
    jobTitleLabel: string;
    workTypeLabel: string;
    targetCropLabel: string;
    dailyWageLabel: string;
    workersNeededLabel: string;
    cancel: string;
    publishJob: string;
    workTypes: Record<string, string>;
  }
> = {
  en: {
    jobPostedMsg: 'Agricultural job posted successfully!',
    appSubmittedMsg: 'Application submitted! The farmer will review your profile.',
    couldNotApply: 'Could not apply',
    workerConfirmedMsg: 'Worker employment confirmed!',
    jobCompletedMsg: 'Job marked completed! Daily wages credited to workers.',
    flagshipBadge: 'Flagship Innovation #2',
    subtitle: 'Direct Rural Employment & Skill Matching',
    title: 'Labour Connect — Agricultural Work & Skill Pooling',
    desc: 'Connecting farmers facing critical harvesting deadlines with nearby verified agricultural workers. Direct WhatsApp/call hiring with no intermediaries.',
    postJobBtn: 'Post Agricultural Job',
    tabJobs: 'Hire Workers & Jobs',
    tabResources: 'Equipment & Resources',
    openJobsTitle: 'Open Agricultural Job Listings',
    clustersNote: 'Mandya & Ramanagara Farming Clusters',
    recruiting: 'Recruiting',
    farmerColon: 'Farmer:',
    cropColon: 'Crop:',
    perDay: '/ Day',
    workersLabel: 'Workers:',
    hiredSuffix: 'hired',
    applyJobBtn: 'Apply for this Job',
    acceptWorkerBtn: 'Accept Basavaraj (+1)',
    markCompletedBtn: 'Mark Completed',
    workersDirTitle: 'Verified Agricultural Workers Nearby',
    workersDirNote: 'Filter by Skill & Instant Consent-based WhatsApp',
    jobsSuffix: 'jobs',
    whatsappContact: 'WhatsApp Contact',
    modalTitle: 'Post Agricultural Job',
    jobTitleLabel: 'Job Title *',
    workTypeLabel: 'Work Type',
    targetCropLabel: 'Target Crop',
    dailyWageLabel: 'Daily Wage (₹)',
    workersNeededLabel: 'Workers Needed',
    cancel: 'Cancel',
    publishJob: 'Publish Job',
    workTypes: {
      Harvesting: 'Harvesting',
      Sowing: 'Sowing',
      Transplantation: 'Transplantation',
      Weeding: 'Weeding',
      Irrigation: 'Irrigation',
      'Loading and unloading': 'Loading / Unloading',
    },
  },
  kn: {
    jobPostedMsg: 'ಕೃಷಿ ಕೆಲಸವನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಪ್ರಕಟಿಸಲಾಗಿದೆ!',
    appSubmittedMsg: 'ಅರ್ಜಿ ಸಲ್ಲಿಸಲಾಗಿದೆ! ರೈತರು ನಿಮ್ಮ ವಿವರವನ್ನು ಪರಿಶೀಲಿಸುತ್ತಾರೆ.',
    couldNotApply: 'ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ',
    workerConfirmedMsg: 'ಕಾರ್ಮಿಕರ ನೇಮಕಾತಿ ದೃಢೀಕರಿಸಲಾಗಿದೆ!',
    jobCompletedMsg: 'ಕೆಲಸ ಪೂರ್ಣಗೊಂಡಿದೆ! ದೈನಂದಿನ ಕೂಲಿಯನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ.',
    flagshipBadge: 'ಪ್ರಮುಖ ಆವಿಷ್ಕಾರ #2',
    subtitle: 'ನೇರ ಗ್ರಾಮೀಣ ಉದ್ಯೋಗ ಮತ್ತು ಕೌಶಲ್ಯ ಹೊಂದಾಣಿಕೆ',
    title: 'ಕಾರ್ಮಿಕ ಸಂಪರ್ಕ — ಕೃಷಿ ಕೆಲಸ ಮತ್ತು ಕಾರ್ಮಿಕರ ಗುಂಪು',
    desc: 'ಕೊಯ್ಲು ಸಮಯದಲ್ಲಿ ರೈತರನ್ನು ಹತ್ತಿರದ ಪರಿಶೀಲಿಸಿದ ಕೃಷಿ ಕಾರ್ಮಿಕರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ. ಮಧ್ಯವರ್ತಿಗಳಿಲ್ಲದೆ ನೇರ WhatsApp/ಕರೆ ನೇಮಕಾತಿ.',
    postJobBtn: 'ಕೃಷಿ ಕೆಲಸ ಪ್ರಕಟಿಸಿ',
    tabJobs: 'ಕಾರ್ಮಿಕರು ಮತ್ತು ಕೆಲಸಗಳು',
    tabResources: 'ಯಂತ್ರಗಳು ಮತ್ತು ಸಂಪನ್ಮೂಲಗಳು',
    openJobsTitle: 'ತೆರೆದ ಕೃಷಿ ಕೆಲಸದ ಪಟ್ಟಿಗಳು',
    clustersNote: 'ಮಂಡ್ಯ ಮತ್ತು ರಾಮನಗರ ಕೃಷಿ ಪ್ರದೇಶಗಳು',
    recruiting: 'ನೇಮಕಾತಿ ನಡೆಯುತ್ತಿದೆ',
    farmerColon: 'ರೈತ:',
    cropColon: 'ಬೆಳೆ:',
    perDay: '/ ದಿನ',
    workersLabel: 'ಕಾರ್ಮಿಕರು:',
    hiredSuffix: 'ನೇಮಿಸಲಾಗಿದೆ',
    applyJobBtn: 'ಈ ಕೆಲಸಕ್ಕೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
    acceptWorkerBtn: 'ಬಸವರಾಜ್ ಅವರನ್ನು ಒಪ್ಪಿ (+1)',
    markCompletedBtn: 'ಪೂರ್ಣಗೊಂಡಿದೆ ಎಂದು ಗುರುತಿಸಿ',
    workersDirTitle: 'ಸಮೀಪದ ಪರಿಶೀಲಿಸಿದ ಕೃಷಿ ಕಾರ್ಮಿಕರು',
    workersDirNote: 'ಕೌಶಲ್ಯದ ಆಧಾರದ ಮೇಲೆ ಆಯ್ಕೆ ಮತ್ತು ನೇರ WhatsApp ಸಂಪರ್ಕ',
    jobsSuffix: 'ಕೆಲಸಗಳು',
    whatsappContact: 'WhatsApp ಸಂಪರ್ಕ',
    modalTitle: 'ಕೃಷಿ ಕೆಲಸ ಪ್ರಕಟಿಸಿ',
    jobTitleLabel: 'ಕೆಲಸದ ಶೀರ್ಷಿಕೆ *',
    workTypeLabel: 'ಕೆಲಸದ ವಿಧ',
    targetCropLabel: 'ಬೆಳೆ',
    dailyWageLabel: 'ದೈನಂದಿನ ಕೂಲಿ (₹)',
    workersNeededLabel: 'ಅಗತ್ಯವಿರುವ ಕಾರ್ಮಿಕರು',
    cancel: 'ರದ್ದುಮಾಡಿ',
    publishJob: 'ಕೆಲಸ ಪ್ರಕಟಿಸಿ',
    workTypes: {
      Harvesting: 'ಕೊಯ್ಲು',
      Sowing: 'ಬಿತ್ತನೆ',
      Transplantation: 'ನಾಟಿ',
      Weeding: 'ಕಳೆ ತೆಗೆಯುವುದು',
      Irrigation: 'ನೀರಾವರಿ',
      'Loading and unloading': 'ಲೋಡ್ / ಅನ್‌ಲೋಡ್',
    },
  },
  hi: {
    jobPostedMsg: 'कृषि कार्य सफलतापूर्वक प्रकाशित किया गया!',
    appSubmittedMsg: 'आवेदन जमा हो गया! किसान आपकी प्रोफ़ाइल की समीक्षा करेंगे।',
    couldNotApply: 'आवेदन नहीं किया जा सका',
    workerConfirmedMsg: 'श्रमिक नियुक्ति की पुष्टि हो गई!',
    jobCompletedMsg: 'कार्य पूर्ण चिह्नित! दैनिक मजदूरी दर्ज की गई।',
    flagshipBadge: 'प्रमुख नवाचार #2',
    subtitle: 'सीधा ग्रामीण रोजगार व कौशल मिलान',
    title: 'श्रमिक कनेक्ट — कृषि कार्य और श्रमिक पूल',
    desc: 'कटाई के समय किसानों को आसपास के सत्यापित कृषि श्रमिकों से जोड़ता है। बिना बिचौलियों के सीधा WhatsApp/कॉल संपर्क।',
    postJobBtn: 'कृषि कार्य पोस्ट करें',
    tabJobs: 'श्रमिक व कार्य',
    tabResources: 'उपकरण व संसाधन',
    openJobsTitle: 'खुले कृषि कार्य अवसर',
    clustersNote: 'मंड्या व रामनगर कृषि क्षेत्र',
    recruiting: 'भर्ती चालू',
    farmerColon: 'किसान:',
    cropColon: 'फसल:',
    perDay: '/ दिन',
    workersLabel: 'श्रमिक:',
    hiredSuffix: 'नियुक्त',
    applyJobBtn: 'इस काम के लिए आवेदन करें',
    acceptWorkerBtn: 'बसवराज को चुनें (+1)',
    markCompletedBtn: 'पूर्ण चिह्नित करें',
    workersDirTitle: 'समीप के सत्यापित कृषि श्रमिक',
    workersDirNote: 'कौशल के अनुसार चुनें व सीधे WhatsApp करें',
    jobsSuffix: 'कार्य',
    whatsappContact: 'WhatsApp संपर्क',
    modalTitle: 'कृषि कार्य पोस्ट करें',
    jobTitleLabel: 'कार्य का शीर्षक *',
    workTypeLabel: 'कार्य प्रकार',
    targetCropLabel: 'फसल',
    dailyWageLabel: 'दैनिक मजदूरी (₹)',
    workersNeededLabel: 'आवश्यक श्रमिक',
    cancel: 'रद्द करें',
    publishJob: 'कार्य प्रकाशित करें',
    workTypes: {
      Harvesting: 'कटाई',
      Sowing: 'बुवाई',
      Transplantation: 'रोपाई',
      Weeding: 'निराई',
      Irrigation: 'सिंचाई',
      'Loading and unloading': 'लोडिंग / अनलोडिंग',
    },
  },
  te: {
    jobPostedMsg: 'వ్యవసాయ పని విజయవంతంగా పోస్ట్ చేయబడింది!',
    appSubmittedMsg: 'దరఖాస్తు సమర్పించబడింది! రైతు మీ ప్రొఫైల్‌ను సమీక్షిస్తారు.',
    couldNotApply: 'దరఖాస్తు చేయడం సాధ్యం కాలేదు',
    workerConfirmedMsg: 'కూలీ నియామకం నిర్ధారించబడింది!',
    jobCompletedMsg: 'పని పూర్తయినట్లు గుర్తించబడింది! రోజువారీ వేతనాలు నమోదయ్యాయి.',
    flagshipBadge: 'ప్రధాన ఆవిష్కరణ #2',
    subtitle: 'నేరుగా గ్రామీణ ఉపాధి & నైపుణ్య అనుసంధానం',
    title: 'కూలీ కనెక్ట్ — వ్యవసాయ పనులు & బృందం',
    desc: 'కోత సమయంలో రైతులను సమీపంలోని ధృవీకరించబడిన వ్యవసాయ కూలీలతో అనుసంధానిస్తుంది. మధ్యవర్తులు లేకుండా నేరుగా WhatsApp/కాల్ ద్వారా మాట్లాడండి.',
    postJobBtn: 'వ్యవసాయ పని పోస్ట్ చేయండి',
    tabJobs: 'కూలీలు & పనులు',
    tabResources: 'యంత్రాలు & వనరులు',
    openJobsTitle: 'అందుబాటులో ఉన్న వ్యవసాయ పనులు',
    clustersNote: 'మండ్యా & రామనగర వ్యవసాయ ప్రాంతాలు',
    recruiting: 'నియామకం జరుగుతోంది',
    farmerColon: 'రైతు:',
    cropColon: 'పంట:',
    perDay: '/ రోజు',
    workersLabel: 'కూలీలు:',
    hiredSuffix: 'మంది ఖరారయ్యారు',
    applyJobBtn: 'ఈ పనికి దరఖాస్తు చేయండి',
    acceptWorkerBtn: 'బసవరాజ్‌ను అంగీకరించండి (+1)',
    markCompletedBtn: 'పూర్తయినట్లు గుర్తించండి',
    workersDirTitle: 'సమీపంలోని ధృవీకరించబడిన వ్యవసాయ కూలీలు',
    workersDirNote: 'నైపుణ్యం ప్రకారం ఎంచుకుని నేరుగా WhatsApp చేయండి',
    jobsSuffix: 'పనులు',
    whatsappContact: 'WhatsApp సంప్రదించండి',
    modalTitle: 'వ్యవసాయ పని పోస్ట్ చేయండి',
    jobTitleLabel: 'పని శీర్షిక *',
    workTypeLabel: 'పని రకం',
    targetCropLabel: 'పంట',
    dailyWageLabel: 'రోజువారీ కూలీ (₹)',
    workersNeededLabel: 'అవసరమైన కూలీలు',
    cancel: 'రద్దు చేయండి',
    publishJob: 'పని ప్రచురించండి',
    workTypes: {
      Harvesting: 'కోత',
      Sowing: 'విత్తడం',
      Transplantation: 'నాట్లు వేయడం',
      Weeding: 'కలుపు తీయడం',
      Irrigation: 'నీటిపారుదల',
      'Loading and unloading': 'లోడింగ్ / అన్‌లోడింగ్',
    },
  },
};

export default function LabourConnectPage() {
  const { currentFarm, currentUser, language } = useFarm();
  const t = LABOUR_PAGE_I18N[language];
  const [section, setSection] = useState<'jobs' | 'resources'>('jobs');
  const [jobs, setJobs] = useState<LabourJob[]>([]);
  const [workers, setWorkers] = useState<LabourProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [newJob, setNewJob] = useState({
    title: "Tomato Harvesting & Crating",
    job_type: "Harvesting",
    crop_type: currentFarm?.primary_crop || "Tomato",
    work_location: `${currentFarm?.village || 'Mandya Rural'}, ${currentFarm?.district || 'Mandya'}`,
    work_date: "2026-11-28",
    working_hours: "07:00 - 15:00",
    wage_per_day: 650,
    required_workers: 4
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const jobsRes = await fetch(`${backendUrl}/labour/jobs`);
      if (jobsRes.ok) setJobs(await jobsRes.json());
      const workersRes = await fetch(`${backendUrl}/labour/workers`);
      if (workersRes.ok) setWorkers(await workersRes.json());
    } catch (e) {
      console.warn("Failed to fetch labour data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const transfer = loadHarvestToLabourTransfer(currentUser.id);
    if (transfer) {
      setNewJob((prev) => ({
        ...prev,
        title: `${transfer.crop} Harvesting`,
        job_type: 'Harvesting',
        crop_type: transfer.crop || prev.crop_type,
        work_location: transfer.locationLabel || prev.work_location,
        work_date: transfer.expectedHarvestDate || prev.work_date,
        required_workers: transfer.recommendedWorkers || prev.required_workers,
      }));
    }
  }, [currentUser.id]);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/labour/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: currentUser.id,
          farmer_name: currentUser.name,
          farm_id: currentFarm?.id,
          ...newJob
        })
      });
      if (res.ok) {
        setIsPostingModalOpen(false);
        setFeedback(t.jobPostedMsg);
        loadData();
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (e) {
      console.warn("Error posting job:", e);
    }
  };

  const handleApply = async (jobId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/labour/jobs/${jobId}/apply?labour_id=${currentUser.id}&labour_name=${encodeURIComponent(currentUser.name)}`, {
        method: 'POST'
      });
      if (res.ok) {
        setFeedback(t.appSubmittedMsg);
        loadData();
        setTimeout(() => setFeedback(null), 4000);
      } else {
        const err = await res.json();
        alert(err.detail || t.couldNotApply);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleAcceptWorker = async (jobId: string, labourId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/labour/jobs/${jobId}/accept/${labourId}`, {
        method: 'POST'
      });
      if (res.ok) {
        setFeedback(t.workerConfirmedMsg);
        loadData();
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleCompleteJob = async (jobId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/labour/jobs/${jobId}/complete`, {
        method: 'POST'
      });
      if (res.ok) {
        setFeedback(t.jobCompletedMsg);
        loadData();
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-blue-950 via-zinc-900 to-blue-900 border border-blue-800/60 rounded-3xl shadow-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              {t.flagshipBadge}
            </span>
            <span className="text-xs text-zinc-400">{t.subtitle}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {t.title}
          </h1>
          <p className="text-sm text-zinc-300">
            {t.desc}
          </p>
        </div>

        <button
          onClick={() => setIsPostingModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rm-accent hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-lg transition-transform hover:scale-105 self-start md:self-auto shrink-0"
        >
          <PlusCircle className="w-5 h-5" />
          <span>{t.postJobBtn}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 max-w-md">
        {[
          { id: 'jobs' as const, label: t.tabJobs, icon: Users2 },
          { id: 'resources' as const, label: t.tabResources, icon: Tractor },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                section === tab.id
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {section === 'resources' ? (
        <ResourcesPage />
      ) : (
        <>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Available Agricultural Jobs List */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-rm-primary dark:text-rm-accent" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              {t.openJobsTitle} ({jobs.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            {t.clustersNote}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {t.workTypes[job.job_type] || job.job_type}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    job.status === 'open' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                    job.status === 'in_progress' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {job.status === 'open' ? t.recruiting : job.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {job.title}
                </h3>
                <p className="text-xs text-zinc-500">
                  {t.farmerColon} <strong>{job.farmer_name}</strong> • {t.cropColon} {localizeCropName(job.crop_type, language)}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {job.work_location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" /> {job.work_date} ({job.working_hours})
                  </span>
                  <span className="flex items-center gap-1 font-bold text-zinc-900 dark:text-white">
                    <Coins className="w-3.5 h-3.5 text-amber-500" /> ₹{job.wage_per_day} {t.perDay}
                  </span>
                  <span>
                    {t.workersLabel} <strong>{job.hired_workers_count} / {job.required_workers}</strong> {t.hiredSuffix}
                  </span>
                </div>
              </div>

              {/* Action Buttons based on User Role */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                {currentUser.role === 'labour' ? (
                  <button
                    onClick={() => handleApply(job.id)}
                    disabled={job.status !== 'open'}
                    className="w-full py-2 rounded-xl bg-rm-primary hover:bg-rm-dark text-white font-semibold text-xs shadow-sm transition-colors disabled:opacity-50"
                  >
                    {t.applyJobBtn}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 w-full justify-between">
                    <button
                      onClick={() => handleAcceptWorker(job.id, 'usr_labour')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
                    >
                      {t.acceptWorkerBtn}
                    </button>
                    {job.status !== 'completed' && (
                      <button
                        onClick={() => handleCompleteJob(job.id)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs"
                      >
                        {t.markCompletedBtn}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Skilled Workers Directory */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <HardHat className="w-5 h-5 text-rm-primary dark:text-rm-accent" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              {t.workersDirTitle}
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            {t.workersDirNote}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workers.map((w) => (
            <div
              key={w.id}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                    {w.name}
                  </h3>
                  <p className="text-xs text-zinc-500">📍 {w.location}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  ⭐ {w.rating} ({w.total_jobs_completed} {t.jobsSuffix})
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {w.skills.map((s, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] text-zinc-700 dark:text-zinc-300">
                    {s}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                <span className="font-bold text-zinc-900 dark:text-white">
                  ₹{w.daily_wage_rate} {t.perDay}
                </span>
                <a
                  href={`https://wa.me/91${w.phone.replace(/[^0-9]/g, '')}?text=Hello%20${w.name},%20we%20have%20an%20agricultural%20job%20on%20RaithaMitra`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{t.whatsappContact}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Post Job Modal */}
      {isPostingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {t.modalTitle}
            </h2>
            <form onSubmit={handlePostJob} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">{t.jobTitleLabel}</label>
                <input
                  type="text"
                  required
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">{t.workTypeLabel}</label>
                  <select
                    value={newJob.job_type}
                    onChange={(e) => setNewJob({ ...newJob, job_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  >
                    <option value="Harvesting">{t.workTypes.Harvesting}</option>
                    <option value="Sowing">{t.workTypes.Sowing}</option>
                    <option value="Transplantation">{t.workTypes.Transplantation}</option>
                    <option value="Weeding">{t.workTypes.Weeding}</option>
                    <option value="Irrigation">{t.workTypes.Irrigation}</option>
                    <option value="Loading and unloading">{t.workTypes['Loading and unloading']}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">{t.targetCropLabel}</label>
                  <input
                    type="text"
                    required
                    value={newJob.crop_type}
                    onChange={(e) => setNewJob({ ...newJob, crop_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">{t.dailyWageLabel}</label>
                  <input
                    type="number"
                    required
                    value={newJob.wage_per_day}
                    onChange={(e) => setNewJob({ ...newJob, wage_per_day: parseFloat(e.target.value) || 500 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">{t.workersNeededLabel}</label>
                  <input
                    type="number"
                    required
                    value={newJob.required_workers}
                    onChange={(e) => setNewJob({ ...newJob, required_workers: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPostingModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold rounded-lg bg-rm-primary text-white shadow"
                >
                  {t.publishJob}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
