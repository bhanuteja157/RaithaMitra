// frontend/src/components/assistant/PersistentVoiceAssistant.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import {
  AssistantLanguage,
  RouteIntent,
  WaterAvailabilityOption,
  buildPostNavigationMessage,
  buildPreNavigationMessage,
  buildUnauthorizedMessage,
  extractWaterAvailability,
  getBcp47ForLanguage,
  matchNavigationIntent,
  parseAgenticTaskCommand,
  parseConfirmationReply,
  speakWithDeviceVoice,
} from '@/lib/assistantVoice';
import { calculateSeedInvestment, getCropPreset } from '@/lib/seedInvestment';
import {
  AssistantChatResponse,
  fetchAssistantStatus,
  sendAssistantMessage,
  sendVoiceTurn,
  synthesizeGeminiSpeech,
} from '@/lib/assistantApi';
import {
  AudioClipRecorder,
  GeminiLiveVoiceSession,
  LiveOrbState,
  playWavBase64,
  stopWavAudio,
} from '@/lib/geminiLiveVoice';
import { Mic, MicOff, Volume2, VolumeX, Send, X, Sprout, MessageSquare, Square, Radio, Sparkles } from 'lucide-react';

type AssistantState = 'idle' | 'connecting' | 'listening' | 'processing' | 'navigating' | 'speaking';

interface PendingBioIntelDraft {
  crop: string;
  areaAcres: number;
  budgetInr: number;
  openNurseries: boolean;
}

interface PendingConfirmation {
  kind: 'labour_post' | 'bidding_post' | 'transport_book';
  payload: Record<string, unknown>;
  summary: string;
}

export function PersistentVoiceAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, currentFarm, language, token } = useFarm();

  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [state, setState] = useState<AssistantState>('idle');
  const [input, setInput] = useState('');
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [pendingBioIntelDraft, setPendingBioIntelDraft] = useState<PendingBioIntelDraft | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [liveActive, setLiveActive] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [geminiAvailable, setGeminiAvailable] = useState(false);
  const [detectedLang, setDetectedLang] = useState<AssistantLanguage>((language || 'en') as AssistantLanguage);
  const [micLevel, setMicLevel] = useState(0);
  const [liveUserCaption, setLiveUserCaption] = useState('');
  const pendingIntentRef = useRef<RouteIntent | null>(null);
  const recognitionRef = useRef<any>(null);
  const liveSessionRef = useRef<GeminiLiveVoiceSession | null>(null);
  const clipRecorderRef = useRef<AudioClipRecorder | null>(null);
  const isRecordingClipRef = useRef(false);

  const lang = (language || 'en') as AssistantLanguage;
  const convStorageKey = `rm_assistant_conv_${currentUser.id}`;
  const bioStateStorageKey = `rm_voice_biointel_state_${currentUser.id}`;

  useEffect(() => {
    setDetectedLang(lang);
  }, [lang]);

  useEffect(() => {
    if (!token) {
      setGeminiAvailable(false);
      return;
    }
    fetchAssistantStatus(token)
      .then((s) => setGeminiAvailable(Boolean(s.gemini_configured && s.live_api_available)))
      .catch(() => setGeminiAvailable(false));
  }, [token]);

  useEffect(() => {
    return () => {
      liveSessionRef.current?.stop();
      clipRecorderRef.current?.cancel();
      stopWavAudio();
    };
  }, []);

  const applyClientDirective = (res: AssistantChatResponse) => {
    if (res.conversation_id) {
      setConversationId(res.conversation_id);
      try {
        window.sessionStorage.setItem(convStorageKey, res.conversation_id);
      } catch {
        // ignore
      }
    }
    if (res.language) {
      setDetectedLang(res.language as AssistantLanguage);
    }
    if (res.client_directive?.directive_type === 'biointel_fill' && typeof window !== 'undefined') {
      window.localStorage.setItem('rm_voice_biointel_draft_v1', JSON.stringify(res.client_directive.payload));
      window.dispatchEvent(new CustomEvent('rm-biointel-voice-fill', { detail: res.client_directive.payload }));
      if (pathname !== '/biointel') router.push('/biointel');
    } else if (res.client_directive?.directive_type === 'digital_farm_control' && typeof window !== 'undefined') {
      const act = String(res.client_directive.payload.action || 'summary');
      window.sessionStorage.setItem('rm_df_pending_action', act);
      window.dispatchEvent(new CustomEvent('rm-df-control', { detail: { action: act } }));
      if (pathname !== '/digital-farming') router.push('/digital-farming');
    } else if (res.client_directive?.directive_type === 'navigate' && res.client_directive.route) {
      router.push(res.client_directive.route);
    }
  };

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(convStorageKey);
      setConversationId(saved || null);
    } catch {
      setConversationId(null);
    }
  }, [convStorageKey]);

  const stopSpeaking = () => {
    liveSessionRef.current?.interruptPlayback();
    stopWavAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setState(liveActive ? 'listening' : 'idle');
  };

  const speakAndSet = async (msg: string, spokenLang?: AssistantLanguage, preloadedAudioB64?: string | null, preloadedMime?: string | null) => {
    const targetLang = spokenLang || lang;
    setTranscriptText(msg);
    setDetectedLang(targetLang);
    if (muted) {
      setState('idle');
      return;
    }
    if (preloadedAudioB64) {
      try {
        await playWavBase64(preloadedAudioB64, preloadedMime || 'audio/wav', muted, {
          onStart: () => setState('speaking'),
          onEnd: () => setState('idle'),
        });
        return;
      } catch {
        // fall through to browser speech
      }
    }
    if (token && geminiAvailable) {
      try {
        const tts = await synthesizeGeminiSpeech(msg, targetLang, token);
        await playWavBase64(tts.audio_base64, tts.mime_type, muted, {
          onStart: () => setState('speaking'),
          onEnd: () => setState('idle'),
        });
        return;
      } catch {
        // fall through to browser speech
      }
    }
    const res = speakWithDeviceVoice(msg, targetLang, muted, {
      onStart: () => setState('speaking'),
      onEnd: () => setState('idle'),
    });
    if (res.voiceUnavailableReason) setVoiceNote(res.voiceUnavailableReason);
  };

  // Clear pending multiturn/confirmation state whenever the active user switches
  useEffect(() => {
    setPendingBioIntelDraft(null);
    setPendingConfirmation(null);
    pendingIntentRef.current = null;
    setTranscriptText('');
    setVoiceNote(null);
  }, [currentUser.id]);

  // Confirm navigation only after Next.js pathname actually matches target route
  useEffect(() => {
    const pending = pendingIntentRef.current;
    if (!pending) return;
    const targetPath = pending.route.split('?')[0].split('#')[0];
    if (pathname === targetPath) {
      pendingIntentRef.current = null;
      const msg = buildPostNavigationMessage(pending, lang);
      speakAndSet(msg);
    }
  }, [pathname, lang, muted]);

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
  };

  const executeBioIntelWorkflow = (
    crop: string,
    areaAcres: number,
    budgetInr: number,
    waterAvailability: WaterAvailabilityOption,
    openNurseries: boolean
  ) => {
    const preset = getCropPreset(crop);
    const result = calculateSeedInvestment({
      crop: preset.name,
      variety: preset.defaultVariety,
      areaAcres,
      seedQtyPerAcreKg: preset.seedRatePerAcreKg,
      seedPricePerKg: preset.seedPricePerKg,
      fertilizerExpensesInr: Math.round(preset.fertilizerExpensesPerAcreInr * areaAcres),
      labourExpensesInr: Math.round(preset.labourExpensesPerAcreInr * areaAcres),
      irrigationExpensesInr: Math.round(preset.irrigationExpensesPerAcreInr * areaAcres),
      otherExpensesInr: Math.round(preset.otherExpensesPerAcreInr * areaAcres),
      availableBudgetInr: budgetInr,
      expectedYieldPerAcreKg: preset.expectedYieldPerAcreKg,
      expectedSellingPricePerKg: preset.expectedSellingPricePerKg,
    });

    const draftPayload = {
      userId: currentUser.id,
      crop: preset.name,
      areaAcres,
      budgetInr,
      waterAvailability,
      openNurseries,
      autoGenerate: true,
      requestedAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('rm_voice_biointel_draft_v1', JSON.stringify(draftPayload));
      } catch {
        // ignore storage errors
      }
      window.dispatchEvent(new CustomEvent('rm-biointel-voice-fill', { detail: draftPayload }));
    }

    const targetRoute = openNurseries ? '/biointel#nurseries' : '/biointel';
    if (pathname !== '/biointel' || openNurseries) {
      router.push(targetRoute);
    }

    const exceedsBudget = result.totalCultivationInvestmentInr > budgetInr;
    const budgetWarning = exceedsBudget
      ? ` Warning: Estimated cultivation investment of ₹${result.totalCultivationInvestmentInr.toLocaleString('en-IN')} exceeds your available budget of ₹${budgetInr.toLocaleString('en-IN')}. Consider selecting a lower-input variety.`
      : '';

    const summaryMsg =
      `Planned ${preset.name} for ${areaAcres} acres with ${waterAvailability} water and ₹${budgetInr.toLocaleString('en-IN')} budget. ` +
      `Estimated total investment is ₹${result.totalCultivationInvestmentInr.toLocaleString('en-IN')}, expected production ${result.expectedProductionKg.toLocaleString('en-IN')} kg, and projected net profit ₹${result.estimatedProfitInr.toLocaleString('en-IN')}.` +
      budgetWarning +
      (openNurseries ? ' Opening nearby seed and nursery options below.' : '');
    speakAndSet(summaryMsg);
  };

  const executeConfirmedAction = async (pending: PendingConfirmation) => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
    try {
      const endpoint =
        pending.kind === 'labour_post'
          ? `${backendUrl}/labour/jobs`
          : pending.kind === 'bidding_post'
            ? `${backendUrl}/bidding/listings`
            : `${backendUrl}/transport/bookings`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(pending.payload),
      });

      if (!res.ok) {
        speakAndSet('Could not submit the request right now. Please review and submit from the page.');
        return;
      }

      if (pending.kind === 'labour_post') {
        speakAndSet('Your agricultural labour job has been published.');
        if (pathname !== '/labour') router.push('/labour');
      } else if (pending.kind === 'bidding_post') {
        speakAndSet('Your produce lot has been published to Smart Bidding.');
        if (pathname !== '/smart-market') router.push('/smart-market?section=bidding');
      } else {
        speakAndSet('Your transport booking request has been submitted.');
        if (pathname !== '/transport') router.push('/transport');
      }
    } catch {
      speakAndSet('Network error while submitting. Please check your connection and try from the form.');
    }
  };

  const handleCommand = async (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    stopListening(); // Prevent mic from capturing assistant voice
    setVoiceNote(null);
    setState('processing');

    // 1. Handle pending explicit confirmation for Labour / Bidding / Transport writes
    if (pendingConfirmation) {
      const decision = parseConfirmationReply(text);
      if (decision === true) {
        const current = pendingConfirmation;
        setPendingConfirmation(null);
        await executeConfirmedAction(current);
        return;
      }
      if (decision === false) {
        setPendingConfirmation(null);
        speakAndSet('Cancelled. No action was submitted.');
        return;
      }
      speakAndSet(`Please say Yes to confirm or No to cancel: ${pendingConfirmation.summary}`);
      return;
    }

    // 2. Handle multiturn BioIntel water-availability prompt
    if (pendingBioIntelDraft) {
      const water = extractWaterAvailability(text);
      if (water) {
        const draft = pendingBioIntelDraft;
        setPendingBioIntelDraft(null);
        executeBioIntelWorkflow(draft.crop, draft.areaAcres, draft.budgetInr, water, draft.openNurseries);
        return;
      }
      // Allow user to break out if they issued a completely new command
      if (!parseAgenticTaskCommand(text) && !matchNavigationIntent(text)) {
        speakAndSet('Please tell me your water availability: Abundant, Moderate, or Scarce.');
        return;
      }
      setPendingBioIntelDraft(null);
    }

    // 3. Allowlisted Agentic Task Workflows
    const task = parseAgenticTaskCommand(text);
    if (task) {
      if (task.type === 'biointel_slot') {
        if (currentUser.role !== 'farmer' && currentUser.role !== 'admin') {
          speakAndSet('Sorry, Seed Investment Planning is available only for Farmer accounts.');
          return;
        }
        let savedState: {
          crop: string;
          areaAcres: number;
          budgetInr: number;
          waterAvailability: WaterAvailabilityOption;
        } = {
          crop: currentFarm?.primary_crop || 'Tomato',
          areaAcres: currentFarm ? Number((currentFarm.land_area_ha * 2.471).toFixed(1)) : 2,
          budgetInr: currentFarm?.cultivation_budget_inr || 50000,
          waterAvailability: 'Moderate',
        };
        try {
          const rawSaved = window.localStorage.getItem(bioStateStorageKey);
          if (rawSaved) {
            savedState = { ...savedState, ...JSON.parse(rawSaved) };
          }
        } catch {
          // ignore
        }

        const nextState = {
          crop: task.crop || savedState.crop,
          areaAcres: task.areaAcres ?? savedState.areaAcres,
          budgetInr: task.budgetInr ?? savedState.budgetInr,
          waterAvailability: task.waterAvailability || savedState.waterAvailability,
        };
        const deltaPayload: Record<string, unknown> = {
          userId: currentUser.id,
          autoGenerate: Boolean(task.autoGenerate),
          requestedAt: new Date().toISOString(),
        };
        if (task.crop) deltaPayload.crop = task.crop;
        if (task.areaAcres !== null && task.areaAcres !== undefined) deltaPayload.areaAcres = task.areaAcres;
        if (task.budgetInr !== null && task.budgetInr !== undefined) deltaPayload.budgetInr = task.budgetInr;
        if (task.waterAvailability) deltaPayload.waterAvailability = task.waterAvailability;

        try {
          window.localStorage.setItem(bioStateStorageKey, JSON.stringify(nextState));
          window.localStorage.setItem('rm_voice_biointel_draft_v1', JSON.stringify(deltaPayload));
          window.dispatchEvent(new CustomEvent('rm-biointel-voice-fill', { detail: deltaPayload }));
        } catch {
          // ignore
        }

        if (pathname !== '/biointel') {
          router.push('/biointel');
        }

        if (task.autoGenerate) {
          const preset = getCropPreset(nextState.crop);
          const calc = calculateSeedInvestment({
            crop: preset.name,
            variety: preset.defaultVariety,
            areaAcres: nextState.areaAcres,
            seedQtyPerAcreKg: preset.seedRatePerAcreKg,
            seedPricePerKg: preset.seedPricePerKg,
            fertilizerExpensesInr: Math.round(preset.fertilizerExpensesPerAcreInr * nextState.areaAcres),
            labourExpensesInr: Math.round(preset.labourExpensesPerAcreInr * nextState.areaAcres),
            irrigationExpensesInr: Math.round(preset.irrigationExpensesPerAcreInr * nextState.areaAcres),
            otherExpensesInr: Math.round(preset.otherExpensesPerAcreInr * nextState.areaAcres),
            availableBudgetInr: nextState.budgetInr,
            expectedYieldPerAcreKg: preset.expectedYieldPerAcreKg,
            expectedSellingPricePerKg: preset.expectedSellingPricePerKg,
          });
          const warn = !calc.isWithinBudget
            ? ` Caution: estimated cost exceeds your ₹${nextState.budgetInr.toLocaleString('en-IN')} budget.`
            : ` It fits within your ₹${nextState.budgetInr.toLocaleString('en-IN')} budget.`;
          speakAndSet(
            `Calculated ${preset.name} cultivation investment for ${nextState.areaAcres} acres: requires ${calc.totalSeedRequirementKg} kg seed, total investment ₹${calc.totalCultivationInvestmentInr.toLocaleString('en-IN')}, expected profit ₹${calc.estimatedProfitInr.toLocaleString('en-IN')}.${warn}`
          );
          return;
        }

        const updates: string[] = [];
        if (task.crop) updates.push(`crop to ${task.crop}`);
        if (task.areaAcres !== null) updates.push(`land area to ${task.areaAcres} acres`);
        if (task.budgetInr !== null) updates.push(`budget to ₹${task.budgetInr.toLocaleString('en-IN')}`);
        if (task.waterAvailability) updates.push(`water availability to ${task.waterAvailability}`);
        speakAndSet(
          `Updated Seed Investment Planner: set ${updates.join(', ') || 'your field settings'}. Say "Calculate my cultivation investment" when ready.`
        );
        return;
      }

      if (task.type === 'biointel_plan') {
        if (currentUser.role !== 'farmer') {
          speakAndSet('Sorry, Seed Investment Planning is available only for Farmer accounts.');
          return;
        }
        const areaAcres =
          task.areaAcres ?? (currentFarm ? Number((currentFarm.land_area_ha * 2.471).toFixed(1)) : 2);
        const budgetInr = task.budgetInr ?? (currentFarm?.cultivation_budget_inr || 50000);
        if (!task.waterAvailability) {
          setPendingBioIntelDraft({
            crop: task.crop,
            areaAcres,
            budgetInr,
            openNurseries: task.openNurseries,
          });
          speakAndSet(
            `Got it — ${task.crop} for ${areaAcres} acres with ₹${budgetInr.toLocaleString('en-IN')} budget. What is your water availability: Abundant, Moderate, or Scarce?`
          );
          return;
        }
        executeBioIntelWorkflow(task.crop, areaAcres, budgetInr, task.waterAvailability, task.openNurseries);
        return;
      }

      if (task.type === 'digital_farm_control') {
        if (currentUser.role !== 'farmer') {
          speakAndSet('Sorry, Digital Farming simulation is available only for Farmer accounts.');
          return;
        }
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('rm_df_pending_action', task.action);
          window.dispatchEvent(new CustomEvent('rm-df-control', { detail: { action: task.action } }));
        }
        if (pathname !== '/digital-farming') {
          router.push('/digital-farming');
        }
        const actionMsg =
          task.action === 'play'
            ? 'Starting your Digital Farm crop growth simulation.'
            : task.action === 'pause'
              ? 'Pausing the crop growth simulation.'
              : task.action === 'resume'
                ? 'Resuming the crop growth simulation.'
                : 'Summarizing your Digital Farm harvest and financial projection.';
        speakAndSet(actionMsg);
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

      if (task.type === 'labour_hire') {
        if (currentUser.role !== 'farmer') {
          speakAndSet('Sorry, posting labour jobs is available only for Farmer accounts.');
          return;
        }
        const location = `${currentFarm?.village || 'Mandya Rural'}, ${currentFarm?.district || 'Mandya'}`;
        const crop = currentFarm?.primary_crop || 'Tomato';
        const payload = {
          farmer_id: currentUser.id,
          farmer_name: currentUser.name,
          farm_id: currentFarm?.id,
          title: `${crop} ${task.workType}`,
          job_type: task.workType,
          crop_type: crop,
          work_location: location,
          work_date: task.workDate,
          working_hours: '07:00 - 15:00',
          wage_per_day: 650,
          required_workers: task.workersCount,
        };
        const summary = `Publish a ${task.workType} job for ${task.workersCount} workers on ${task.workDate} in ${location} at ₹650 per day`;
        setPendingConfirmation({ kind: 'labour_post', payload, summary });
        speakAndSet(`I drafted a job: ${summary}. Say Yes to publish or No to cancel.`);
        return;
      }

      if (task.type === 'bidding_action') {
        if (currentUser.role !== 'farmer' && currentUser.role !== 'buyer') {
          speakAndSet('Sorry, Smart Bidding is available only for Farmer and Buyer accounts.');
          return;
        }
        if (task.subAction === 'check_offers') {
          try {
            const res = await fetch(`${backendUrl}/bidding/listings`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) {
              speakAndSet('Could not fetch Smart Bidding offers right now.');
              return;
            }
            const listings = await res.json();
            const mine = Array.isArray(listings)
              ? listings.filter((l: any) => l.farmer_id === currentUser.id)
              : [];
            const target = mine.length > 0 ? mine : Array.isArray(listings) ? listings : [];
            if (target.length === 0) {
              speakAndSet('There are currently no active crop listings in Smart Bidding.');
              return;
            }
            const top = target[0];
            const bidCount = Array.isArray(top.bids) ? top.bids.length : 0;
            const highest = bidCount > 0 ? Math.max(...top.bids.map((b: any) => Number(b.bid_amount_per_kg || 0))) : top.min_price_per_kg;
            speakAndSet(
              `Found ${target.length} active listing${target.length > 1 ? 's' : ''}. Top lot: ${top.quantity_kg} kg ${top.crop_name} with ${bidCount} buyer bid${bidCount === 1 ? '' : 's'}, highest ₹${highest} per kg.`
            );
          } catch {
            speakAndSet('Unable to reach Smart Bidding service right now.');
          }
          return;
        }
        if (currentUser.role !== 'farmer') {
          speakAndSet('Only Farmer accounts can publish new produce lots.');
          return;
        }
        const location = `${currentFarm?.village || 'Mandya Rural'}, ${currentFarm?.district || 'Mandya'}`;
        const payload = {
          farmer_id: currentUser.id,
          farmer_name: currentUser.name,
          farm_id: currentFarm?.id,
          crop_name: task.crop || 'Tomato',
          variety: currentFarm?.crop_variety || 'Standard Grade',
          quantity_kg: task.quantityKg || 500,
          min_price_per_kg: task.minPricePerKg || 25,
          harvest_date: new Date().toISOString().split('T')[0],
          location,
          bidding_deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
        };
        const summary = `List ${payload.quantity_kg} kg of ${payload.crop_name} at minimum ₹${payload.min_price_per_kg} per kg in ${location}`;
        setPendingConfirmation({ kind: 'bidding_post', payload, summary });
        speakAndSet(`I drafted your Smart Bidding lot: ${summary}. Say Yes to publish or No to cancel.`);
        return;
      }

      if (task.type === 'transport_action') {
        if (!['farmer', 'buyer', 'driver'].includes(currentUser.role)) {
          speakAndSet('Sorry, Transport Connect is not available for your account.');
          return;
        }
        try {
          const weight = task.cargoWeightKg || 500;
          const res = await fetch(`${backendUrl}/transport/drivers?min_capacity_kg=${weight}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) {
            speakAndSet('Could not check transport availability right now.');
            return;
          }
          const drivers = await res.json();
          if (!Array.isArray(drivers) || drivers.length === 0) {
            speakAndSet(`No transport vehicles found right now for ${weight} kg.`);
            return;
          }
          const d = drivers[0];
          if (task.subAction === 'prepare_booking' && currentUser.role === 'farmer') {
            const pickup = `${currentFarm?.village || 'Mandya Rural'}, ${currentFarm?.district || 'Mandya'}`;
            const estDistance = 35;
            const totalFare = estDistance * Number(d.base_fare_per_km || 20);
            const payload = {
              farmer_id: currentUser.id,
              farmer_name: currentUser.name,
              driver_id: d.driver_id,
              driver_name: d.driver_name,
              driver_phone: d.driver_phone,
              produce_type: task.crop || currentFarm?.primary_crop || 'Tomato',
              weight_kg: weight,
              pickup_location: pickup,
              delivery_destination: 'Bengaluru APMC Yard',
              pickup_time: 'Tomorrow 06:30 AM',
              vehicle_type: d.vehicle_type,
              estimated_distance_km: estDistance,
              total_fare: totalFare,
            };
            const summary = `Book ${d.vehicle_type} with ${d.driver_name} for ${weight} kg from ${pickup} to Bengaluru APMC Yard (estimated ₹${totalFare})`;
            setPendingConfirmation({ kind: 'transport_book', payload, summary });
            speakAndSet(`Found ${drivers.length} vehicles. ${summary}. Say Yes to book or No to cancel.`);
            return;
          }
          speakAndSet(
            `Found ${drivers.length} available transport vehicle${drivers.length > 1 ? 's' : ''}. Nearest is ${d.driver_name} (${d.vehicle_type}, capacity ${d.max_capacity_kg} kg).`
          );
        } catch {
          speakAndSet('Unable to reach Transport Connect right now.');
        }
        return;
      }

      if (task.type === 'finance_query') {
        if (currentUser.role !== 'farmer' && currentUser.role !== 'admin') {
          speakAndSet('Financial intelligence queries are available only for Farmer accounts.');
          return;
        }
        try {
          const farmId = currentFarm?.id || 'farm_001';
          const res = await fetch(
            `${backendUrl}/finance/summary?farm_id=${encodeURIComponent(farmId)}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          );
          if (!res.ok) {
            speakAndSet('Could not load your verified financial records right now.');
            return;
          }
          const fin = await res.json();
          if (task.metric === 'expenditure') {
            speakAndSet(
              `Your total recorded expenditure is ₹${Number(fin.actual_recorded_expenses_inr || 0).toLocaleString('en-IN')}, plus ₹${Number(fin.committed_expenses_inr || 0).toLocaleString('en-IN')} in committed expenses.`
            );
          } else if (task.metric === 'profit') {
            speakAndSet(
              `Your realized net profit is ₹${Number(fin.realized_net_profit_inr || 0).toLocaleString('en-IN')}, and estimated profit from confirmed orders is ₹${Number(fin.estimated_net_profit_inr || 0).toLocaleString('en-IN')}.`
            );
          } else if (task.metric === 'remaining_budget') {
            speakAndSet(
              `Your remaining budget is ₹${Number(fin.remaining_budget_inr || 0).toLocaleString('en-IN')} out of ₹${Number(fin.allocated_budget_inr || 0).toLocaleString('en-IN')} allocated.`
            );
          } else if (task.metric === 'labour_expenses') {
            const lab = (fin.expense_breakdown || []).find((e: any) => e.category === 'labour')?.amount_inr || 0;
            speakAndSet(`Your recorded and committed labour expenses total ₹${Number(lab).toLocaleString('en-IN')}.`);
            if (pathname !== '/finance') router.push('/finance');
          } else if (task.metric === 'outstanding_payments') {
            speakAndSet(
              `You have ₹${Number(fin.outstanding_payments_inr || 0).toLocaleString('en-IN')} in outstanding buyer payments across ₹${Number(fin.confirmed_sales_value_inr || 0).toLocaleString('en-IN')} in confirmed sales.`
            );
            if (pathname !== '/finance' && pathname !== '/finance-benefits') router.push('/finance-benefits?section=finance');
          } else if (task.metric === 'summary') {
            speakAndSet(
              `Financial summary: allocated budget ₹${Number(fin.allocated_budget_inr || 0).toLocaleString('en-IN')}, recorded expenses ₹${Number(fin.actual_recorded_expenses_inr || 0).toLocaleString('en-IN')}, confirmed sales ₹${Number(fin.confirmed_sales_value_inr || 0).toLocaleString('en-IN')}, and realized net profit ₹${Number(fin.realized_net_profit_inr || 0).toLocaleString('en-IN')}.`
            );
            if (pathname !== '/finance' && pathname !== '/finance-benefits') router.push('/finance-benefits?section=finance');
          }
        } catch {
          speakAndSet('Unable to reach the Financial Intelligence service right now.');
        }
        return;
      }
    }

    // 4. Navigation intents (allow rich domain queries & follow-ups to reach unified backend intelligence)
    const intent = matchNavigationIntent(text, currentUser.role);
    const shouldPreferBackendQuery =
      Boolean(token) &&
      (/(buyers? for|who wants to buy|what should i do|explain|why do|how does|photosynthesis)/i.test(text) ||
        (/find buyers/i.test(text) && (/\d/.test(text) || /(tomato|potato|onion|chilli|maize|paddy|rice|wheat|ragi|cotton)/i.test(text))));

    if (!intent || shouldPreferBackendQuery) {
      // Delegate general agricultural questions, buyer discovery, decisions & follow-ups to the unified AD-23/AD-39 Assistant backend
      if (token) {
        try {
          const res = await sendAssistantMessage(
            {
              message: text,
              conversation_id: conversationId,
              farm_id: currentUser.role === 'farmer' ? currentFarm?.id : undefined,
              language: lang,
            },
            token
          );
          if (res.conversation_id) {
            setConversationId(res.conversation_id);
            try {
              window.sessionStorage.setItem(convStorageKey, res.conversation_id);
            } catch {
              // ignore
            }
          }
          if (res.client_directive?.directive_type === 'biointel_fill' && typeof window !== 'undefined') {
            window.localStorage.setItem('rm_voice_biointel_draft_v1', JSON.stringify(res.client_directive.payload));
            window.dispatchEvent(new CustomEvent('rm-biointel-voice-fill', { detail: res.client_directive.payload }));
            if (pathname !== '/biointel') router.push('/biointel');
          } else if (res.client_directive?.directive_type === 'digital_farm_control' && typeof window !== 'undefined') {
            const act = String(res.client_directive.payload.action || 'summary');
            window.sessionStorage.setItem('rm_df_pending_action', act);
            window.dispatchEvent(new CustomEvent('rm-df-control', { detail: { action: act } }));
            if (pathname !== '/digital-farming') router.push('/digital-farming');
          } else if (res.client_directive?.directive_type === 'navigate' && res.client_directive.route) {
            router.push(res.client_directive.route);
          }
          speakAndSet(res.reply, (res.language || lang) as AssistantLanguage);
          return;
        } catch {
          // fall through to local prompt
        }
      }
      const msg =
        lang === 'kn'
          ? 'ದಯವಿಟ್ಟು "Open BioIntel", "Plan Tomato 2 acres 40000 budget", ಅಥವಾ "Open Digital Farming" ಎಂದು ಹೇಳಿ.'
          : lang === 'hi'
            ? 'कृपया "Open BioIntel", "Plan Tomato 2 acres 40000 budget", या "Open Digital Farming" कहें।'
            : lang === 'te'
              ? 'దయచేసి "Open BioIntel", "Plan Tomato 2 acres 40000 budget", లేదా "Open Digital Farming" అని చెప్పండి.'
              : 'Try saying "Plan Tomato for 2 acres with 40000 budget", "Should I irrigate tomorrow?", "Open BioIntel", or "How much profit have I earned?".';
      speakAndSet(msg);
      return;
    }

    // RBAC check
    if (!intent.allowedRoles.includes(currentUser.role)) {
      const msg = buildUnauthorizedMessage(intent, currentUser.role, lang);
      speakAndSet(msg);
      return;
    }

    const targetPath = intent.route.split('?')[0].split('#')[0];

    // Pre-navigation acknowledgement
    const preMsg = buildPreNavigationMessage(intent, lang);
    setTranscriptText(preMsg);
    setState('navigating');
    speakWithDeviceVoice(preMsg, lang, muted, {
      onStart: () => setState('speaking'),
      onEnd: () => {
        if (!pendingIntentRef.current) setState('idle');
      },
    });

    if (pathname === targetPath && !intent.route.includes('?') && !intent.route.includes('#')) {
      const postMsg = buildPostNavigationMessage(intent, lang);
      speakAndSet(postMsg);
    } else {
      pendingIntentRef.current = intent;
      router.push(intent.route);
    }
  };

  const stopLiveVoice = () => {
    liveSessionRef.current?.stop();
    liveSessionRef.current = null;
    setLiveActive(false);
    setMicLevel(0);
    setState('idle');
  };

  const toggleLiveVoice = async () => {
    if (liveActive) {
      stopLiveVoice();
      return;
    }
    if (!token || !geminiAvailable) {
      setVoiceNote('Sign in with Gemini configured on backend to start Live Audio; using Voice Turn fallback.');
      toggleMic();
      return;
    }
    stopSpeaking();
    stopListening();
    setVoiceNote(null);
    setLiveUserCaption('');

    const session = new GeminiLiveVoiceSession();
    liveSessionRef.current = session;
    setLiveActive(true);
    try {
      await session.start({
        authToken: token,
        farmId: currentUser.role === 'farmer' ? currentFarm?.id : undefined,
        conversationId,
        language: lang,
        muted,
        onStateChange: (orbState: LiveOrbState) => {
          setState(orbState === 'thinking' ? 'processing' : orbState);
          if (orbState === 'idle') {
            setLiveActive(false);
            setMicLevel(0);
          }
        },
        onMicLevel: (lvl) => setMicLevel(lvl),
        onInputTranscript: (delta) => setLiveUserCaption((prev) => `${prev}${delta}`.slice(-220)),
        onOutputTranscript: (delta) => setTranscriptText((prev) => `${prev}${delta}`.slice(-420)),
        onToolResult: (res) => {
          applyClientDirective(res);
          if (res.reply) setTranscriptText(res.reply);
        },
        onError: (msg) => {
          setVoiceNote(`Live session fallback: ${msg}`);
          stopLiveVoice();
        },
      });
    } catch (err: any) {
      setVoiceNote(err?.message || 'Could not start Gemini Live Voice; using microphone turn capture.');
      stopLiveVoice();
    }
  };

  const toggleMic = async () => {
    if (liveActive) {
      stopLiveVoice();
      return;
    }

    // Prefer real MediaRecorder -> Gemini 3.5 Transcribe + Gemini 3.8 Flash-Lite TTS when signed in
    if (token && geminiAvailable && typeof MediaRecorder !== 'undefined') {
      if (isRecordingClipRef.current && clipRecorderRef.current) {
        isRecordingClipRef.current = false;
        setState('processing');
        try {
          const blob = await clipRecorderRef.current.stop();
          const res = await sendVoiceTurn(
            blob,
            {
              farm_id: currentUser.role === 'farmer' ? currentFarm?.id : undefined,
              conversation_id: conversationId,
              language: lang,
              include_tts: !muted,
            },
            token
          );
          setInput(res.transcript);
          setLiveUserCaption(res.transcript);
          applyClientDirective(res.chat);
          await speakAndSet(
            res.chat.reply,
            res.chat.language,
            res.tts_audio_base64,
            res.tts_mime_type
          );
          if (continuousMode && !muted) {
            window.setTimeout(() => {
              if (!isRecordingClipRef.current) toggleMic();
            }, 350);
          }
          return;
        } catch (err: any) {
          setVoiceNote(err?.message || 'Gemini voice turn unavailable; falling back to browser speech.');
          setState('idle');
        }
      } else {
        try {
          stopSpeaking();
          setVoiceNote(null);
          const rec = new AudioClipRecorder();
          clipRecorderRef.current = rec;
          await rec.start();
          isRecordingClipRef.current = true;
          setState('listening');
          return;
        } catch {
          isRecordingClipRef.current = false;
        }
      }
    }

    if (state === 'listening') {
      stopListening();
      setState('idle');
      return;
    }

    const SpeechRecognitionCtor =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognitionCtor) {
      setVoiceNote('Browser voice recognition is unavailable here; type your command below.');
      return;
    }

    stopSpeaking();

    const rec = new SpeechRecognitionCtor();
    rec.lang = getBcp47ForLanguage(lang);
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setState('listening');
    rec.onresult = (event: any) => {
      const spoken = event.results?.[0]?.[0]?.transcript || '';
      setInput(spoken);
      handleCommand(spoken);
    };
    rec.onerror = () => {
      setState('idle');
      setVoiceNote('Could not capture voice; please type your command.');
    };
    rec.onend = () => {
      setState((prev) => (prev === 'listening' ? 'idle' : prev));
    };

    recognitionRef.current = rec;
    rec.start();
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-80 sm:w-96 rounded-2xl border border-[#DCD8CA] dark:border-zinc-800 bg-[#F7F5ED] dark:bg-zinc-900 shadow-2xl overflow-hidden">
          <div className="px-4 py-3 bg-[#173C2B] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center bg-[#36784D] ${
                  state !== 'idle' ? 'rm-orb-active' : ''
                }`}
              >
                <Sprout className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <span>RaithaMitra Voice</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/15 text-[9px] uppercase">
                    {detectedLang}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-200 capitalize">
                  {liveActive ? `Gemini Live • ${state}` : state}
                </div>
              </div>
              {(state === 'listening' || state === 'speaking') && (
                <div className="flex items-center gap-0.5 h-4 ml-1" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-0.5 rounded-full bg-[#65A76F] rm-wave-bar"
                      style={{
                        height: `${Math.max(6, Math.round(10 + micLevel * 12))}px`,
                        animationDelay: `${i * 0.14}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleLiveVoice}
                title={liveActive ? 'End Live Voice' : 'Start Gemini Live Voice'}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1 ${
                  liveActive
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-100'
                }`}
              >
                <Radio className="w-3 h-3" />
                {liveActive ? 'End Live' : 'Live'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push('/assistant');
                }}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold"
              >
                Full Chat
              </button>
              {state === 'speaking' && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  aria-label="Stop speaking"
                  title="Stop speaking"
                  className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-semibold inline-flex items-center gap-1"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Stop
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const nextMuted = !muted;
                  if (nextMuted) stopSpeaking();
                  liveSessionRef.current?.setMuted(nextMuted);
                  setMuted(nextMuted);
                }}
                aria-label={muted ? 'Unmute assistant voice' : 'Mute assistant voice'}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                {muted ? <VolumeX className="w-4 h-4 text-amber-300" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close voice assistant"
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-3.5 space-y-2.5 text-xs">
            {liveUserCaption && (
              <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-[11px]">
                <span className="font-semibold">You: </span>{liveUserCaption}
              </div>
            )}
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 text-[#20372A] dark:text-zinc-200 min-h-[54px]">
              {transcriptText ||
                'Tap Live for real-time Gemini 3.8 voice conversation, tap the mic to speak in EN / ಕನ್ನಡ / हिन्दी / తెలుగు, or type below.'}
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={continuousMode}
                  onChange={(e) => setContinuousMode(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                <span>Continuous hands-free turn mode</span>
              </label>
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <Sparkles className="w-3 h-3" />
                {geminiAvailable ? 'Gemini Live + TTS' : 'Local Fallback'}
              </span>
            </div>

            {voiceNote && (
              <div className="text-[11px] text-[#8D7357] dark:text-amber-300">{voiceNote}</div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (liveActive && liveSessionRef.current && input.trim()) {
                  setLiveUserCaption(input.trim());
                  liveSessionRef.current.sendTextTurn(input.trim());
                  setInput('');
                  return;
                }
                handleCommand(input);
                setInput('');
              }}
              className="flex items-center gap-1.5"
            >
              <button
                type="button"
                onClick={toggleMic}
                aria-label={state === 'listening' ? 'Stop microphone' : 'Start microphone'}
                className={`p-2 rounded-xl border ${
                  state === 'listening'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white dark:bg-zinc-800 border-[#DCD8CA] dark:border-zinc-700 text-[#173C2B] dark:text-emerald-300'
                }`}
              >
                {state === 'listening' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. Open BioIntel"
                className="flex-1 px-3 py-2 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
              />
              <button
                type="submit"
                aria-label="Send command"
                className="p-2 rounded-xl bg-[#173C2B] hover:bg-[#102D20] text-white"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle RaithaMitra Voice Assistant"
        className="w-12 h-12 rounded-full bg-[#173C2B] hover:bg-[#102D20] text-white shadow-lg border border-[#65A76F]/40 flex items-center justify-center transition"
      >
        {open ? <MessageSquare className="w-5 h-5" /> : <Sprout className="w-5 h-5 text-[#65A76F]" />}
      </button>
    </div>
  );
}
