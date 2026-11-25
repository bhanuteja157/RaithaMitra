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
import { getIntlLocale, localizeCondition, localizeCropName } from '@/lib/translations';
import { Mic, MicOff, Volume2, VolumeX, Send, X, Sprout, MessageSquare } from 'lucide-react';

type AssistantState = 'idle' | 'listening' | 'processing' | 'navigating' | 'speaking';

const VOICE_UI_I18N: Record<
  AssistantLanguage,
  {
    headerTitle: string;
    states: Record<AssistantState, string>;
    muteLabel: string;
    unmuteLabel: string;
    closeLabel: string;
    defaultHint: string;
    startMicLabel: string;
    stopMicLabel: string;
    inputPlaceholder: string;
    sendLabel: string;
    toggleLabel: string;
    voiceUnsupported: string;
    voiceCaptureFailed: string;
    fallbackCommandTip: string;
    cancelled: string;
    confirmPromptPrefix: string;
    askWaterPrompt: string;
    farmerOnlyPlanner: string;
    farmerOnlySim: string;
    farmerOnlyLabour: string;
    farmerBuyerBiddingOnly: string;
    farmerOnlyListings: string;
    transportUnavailable: string;
    submitError: string;
    labourPublished: string;
    biddingPublished: string;
    transportSubmitted: string;
    networkError: string;
    fetchBidsError: string;
    noActiveListings: string;
    biddingReachError: string;
    availCheckError: string;
    noVehiclesFound: string;
    transportReachError: string;
    simStarting: string;
    simPausing: string;
    simResuming: string;
    simSummary: string;
    plannedSummary: (crop: string, acres: number, water: string, budget: string, invest: string, yieldKg: string, profit: string, nurseries: boolean) => string;
    gotItBudgetPrompt: (crop: string, acres: number, budget: string) => string;
    draftJobPrompt: (summary: string) => string;
    jobDraftSummary: (workType: string, count: number, date: string, location: string) => string;
    foundBidsSummary: (count: number, qty: number, crop: string, bidCount: number, highest: number) => string;
    lotDraftSummary: (qty: number, crop: string, minPrice: number, location: string) => string;
    draftLotPrompt: (summary: string) => string;
    bookingDraftSummary: (vehicle: string, driver: string, weight: number, pickup: string, fare: number) => string;
    foundVehiclesConfirmPrompt: (count: number, summary: string) => string;
    foundVehiclesListPrompt: (count: number, driver: string, vehicle: string, cap: number | string) => string;
  }
> = {
  en: {
    headerTitle: 'RaithaMitra Voice Guide',
    states: { idle: 'Idle', listening: 'Listening', processing: 'Processing', navigating: 'Navigating', speaking: 'Speaking' },
    muteLabel: 'Mute assistant voice',
    unmuteLabel: 'Unmute assistant voice',
    closeLabel: 'Close voice assistant',
    defaultHint: 'Say or type a command like "Open BioIntel", "Open Digital Farming", or "Open Smart Bidding".',
    startMicLabel: 'Start microphone',
    stopMicLabel: 'Stop microphone',
    inputPlaceholder: 'e.g. Open BioIntel',
    sendLabel: 'Send command',
    toggleLabel: 'Toggle RaithaMitra Voice Assistant',
    voiceUnsupported: 'Browser voice recognition is unavailable here; type your command below.',
    voiceCaptureFailed: 'Could not capture voice; please type your command.',
    fallbackCommandTip: 'Try saying "Plan Tomato for 2 acres with 40000 budget", "Open BioIntel", "Start simulation", or "Open Smart Bidding".',
    cancelled: 'Cancelled. No action was submitted.',
    confirmPromptPrefix: 'Please say Yes to confirm or No to cancel:',
    askWaterPrompt: 'Please tell me your water availability: Abundant, Moderate, or Scarce.',
    farmerOnlyPlanner: 'Sorry, Seed Investment Planning is available only for Farmer accounts.',
    farmerOnlySim: 'Sorry, Digital Farming simulation is available only for Farmer accounts.',
    farmerOnlyLabour: 'Sorry, posting labour jobs is available only for Farmer accounts.',
    farmerBuyerBiddingOnly: 'Sorry, Smart Bidding is available only for Farmer and Buyer accounts.',
    farmerOnlyListings: 'Only Farmer accounts can publish new produce lots.',
    transportUnavailable: 'Sorry, Transport Connect is not available for your account.',
    submitError: 'Could not submit the request right now. Please review and submit from the page.',
    labourPublished: 'Your agricultural labour job has been published.',
    biddingPublished: 'Your produce lot has been published to Smart Bidding.',
    transportSubmitted: 'Your transport booking request has been submitted.',
    networkError: 'Network error while submitting. Please check your connection and try from the form.',
    fetchBidsError: 'Could not fetch Smart Bidding offers right now.',
    noActiveListings: 'There are currently no active crop listings in Smart Bidding.',
    biddingReachError: 'Unable to reach Smart Bidding service right now.',
    availCheckError: 'Could not check transport availability right now.',
    noVehiclesFound: 'No transport vehicles found right now for',
    transportReachError: 'Unable to reach Transport Connect right now.',
    simStarting: 'Starting your Digital Farm crop growth simulation.',
    simPausing: 'Pausing the crop growth simulation.',
    simResuming: 'Resuming the crop growth simulation.',
    simSummary: 'Summarizing your Digital Farm harvest and financial projection.',
    plannedSummary: (crop, acres, water, budget, invest, yieldKg, profit, nurseries) =>
      `Planned ${crop} for ${acres} acres with ${water} water and ₹${budget} budget. Estimated total investment is ₹${invest}, expected production ${yieldKg} kg, and projected net profit ₹${profit}.${nurseries ? ' Opening nearby seed and nursery options below.' : ''}`,
    gotItBudgetPrompt: (crop, acres, budget) =>
      `Got it — ${crop} for ${acres} acres with ₹${budget} budget. What is your water availability: Abundant, Moderate, or Scarce?`,
    draftJobPrompt: (summary) => `I drafted a job: ${summary}. Say Yes to publish or No to cancel.`,
    jobDraftSummary: (workType, count, date, location) =>
      `Publish a ${workType} job for ${count} workers on ${date} in ${location} at ₹650 per day`,
    foundBidsSummary: (count, qty, crop, bidCount, highest) =>
      `Found ${count} active listing${count > 1 ? 's' : ''}. Top lot: ${qty} kg ${crop} with ${bidCount} buyer bid${bidCount === 1 ? '' : 's'}, highest ₹${highest} per kg.`,
    lotDraftSummary: (qty, crop, minPrice, location) =>
      `List ${qty} kg of ${crop} at minimum ₹${minPrice} per kg in ${location}`,
    draftLotPrompt: (summary) => `I drafted your Smart Bidding lot: ${summary}. Say Yes to publish or No to cancel.`,
    bookingDraftSummary: (vehicle, driver, weight, pickup, fare) =>
      `Book ${vehicle} with ${driver} for ${weight} kg from ${pickup} to Bengaluru APMC Yard (estimated ₹${fare})`,
    foundVehiclesConfirmPrompt: (count, summary) =>
      `Found ${count} vehicles. ${summary}. Say Yes to book or No to cancel.`,
    foundVehiclesListPrompt: (count, driver, vehicle, cap) =>
      `Found ${count} available transport vehicle${count > 1 ? 's' : ''}. Nearest is ${driver} (${vehicle}, capacity ${cap} kg).`,
  },
  kn: {
    headerTitle: 'ರೈತ ಮಿತ್ರ ಧ್ವನಿ ಮಾರ್ಗದರ್ಶಿ',
    states: { idle: 'ಸಿದ್ಧ', listening: 'ಕೇಳುತ್ತಿದೆ', processing: 'ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗುತ್ತಿದೆ', navigating: 'ತೆರೆಯುತ್ತಿದೆ', speaking: 'ಮಾತನಾಡುತ್ತಿದೆ' },
    muteLabel: 'ಧ್ವನಿ ಮ್ಯೂಟ್ ಮಾಡಿ',
    unmuteLabel: 'ಧ್ವನಿ ಅನ್‌ಮ್ಯೂಟ್ ಮಾಡಿ',
    closeLabel: 'ಧ್ವನಿ ಸಹಾಯಕ ಮುಚ್ಚಿ',
    defaultHint: '"Open BioIntel", "ಟೊಮೆಟೊ 2 ಎಕರೆ", ಅಥವಾ "Open Digital Farming" ಎಂದು ಹೇಳಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.',
    startMicLabel: 'ಮೈಕ್ರೊಫೋನ್ ಆನ್ ಮಾಡಿ',
    stopMicLabel: 'ಮೈಕ್ರೊಫೋನ್ ನಿಲ್ಲಿಸಿ',
    inputPlaceholder: 'ಉದಾ. Open BioIntel',
    sendLabel: 'ಕಳುಹಿಸಿ',
    toggleLabel: 'ರೈತ ಮಿತ್ರ ಧ್ವನಿ ಸಹಾಯಕ',
    voiceUnsupported: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಲಭ್ಯವಿಲ್ಲ; ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.',
    voiceCaptureFailed: 'ಧ್ವನಿ ಗ್ರಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ; ದಯವಿಟ್ಟು ಟೈಪ್ ಮಾಡಿ.',
    fallbackCommandTip: 'ದಯವಿಟ್ಟು "Open BioIntel", "Plan Tomato 2 acres 40000 budget", ಅಥವಾ "Open Digital Farming" ಎಂದು ಹೇಳಿ.',
    cancelled: 'ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ. ಯಾವುದೇ ಕ್ರಿಯೆ ಸಲ್ಲಿಸಲಾಗಿಲ್ಲ.',
    confirmPromptPrefix: 'ದೃಢೀಕರಿಸಲು ಹೌದು (Yes) ಅಥವಾ ರದ್ದುಮಾಡಲು ಬೇಡ (No) ಎಂದು ಹೇಳಿ:',
    askWaterPrompt: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ನೀರಿನ ಲಭ್ಯತೆ ತಿಳಿಸಿ: ಹೆಚ್ಚು (Abundant), ಮಧ್ಯಮ (Moderate), ಅಥವಾ ಕಡಿಮೆ (Scarce).',
    farmerOnlyPlanner: 'ಕ್ಷಮಿಸಿ, ಬೀಜ ಹೂಡಿಕೆ ಯೋಜನೆ ಕೇವಲ ರೈತ ಖಾತೆಗಳಿಗೆ ಮಾತ್ರ ಲಭ್ಯವಿದೆ.',
    farmerOnlySim: 'ಕ್ಷಮಿಸಿ, ಡಿಜಿಟಲ್ ಕೃಷಿ ಸಿಮ್ಯುಲೇಶನ್ ಕೇವಲ ರೈತ ಖಾತೆಗಳಿಗೆ ಮಾತ್ರ ಲಭ್ಯವಿದೆ.',
    farmerOnlyLabour: 'ಕ್ಷಮಿಸಿ, ಕೃಷಿ ಕೆಲಸ ಪೋಸ್ಟ್ ಮಾಡುವುದು ಕೇವಲ ರೈತ ಖಾತೆಗಳಿಗೆ ಮಾತ್ರ ಲಭ್ಯವಿದೆ.',
    farmerBuyerBiddingOnly: 'ಕ್ಷಮಿಸಿ, ಸ್ಮಾರ್ಟ್ ಹರಾಜು ಕೇವಲ ರೈತ ಮತ್ತು ಖರೀದಿದಾರ ಖಾತೆಗಳಿಗೆ ಮಾತ್ರ ಲಭ್ಯವಿದೆ.',
    farmerOnlyListings: 'ಹೊಸ ಬೆಳೆ ಲಾಟ್‌ಗಳನ್ನು ಕೇವಲ ರೈತ ಖಾತೆಗಳು ಮಾತ್ರ ಪ್ರಕಟಿಸಬಹುದು.',
    transportUnavailable: 'ಕ್ಷಮಿಸಿ, ಸಾರಿಗೆ ಸಂಪರ್ಕ ನಿಮ್ಮ ಖಾತೆಗೆ ಲಭ್ಯವಿಲ್ಲ.',
    submitError: 'ವಿನಂತಿಯನ್ನು ಈಗ ಸಲ್ಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಪುಟದಿಂದ ಸಲ್ಲಿಸಿ.',
    labourPublished: 'ನಿಮ್ಮ ಕೃಷಿ ಕಾರ್ಮಿಕ ಕೆಲಸವನ್ನು ಪ್ರಕಟಿಸಲಾಗಿದೆ.',
    biddingPublished: 'ನಿಮ್ಮ ಬೆಳೆ ಲಾಟ್ ಅನ್ನು ಸ್ಮಾರ್ಟ್ ಹರಾಜಿನಲ್ಲಿ ಪ್ರಕಟಿಸಲಾಗಿದೆ.',
    transportSubmitted: 'ನಿಮ್ಮ ಸಾರಿಗೆ ಬುಕಿಂಗ್ ವಿನಂತಿಯನ್ನು ಸಲ್ಲಿಸಲಾಗಿದೆ.',
    networkError: 'ನೆಟ್‌ವರ್ಕ್ ದೋಷ. ದಯವಿಟ್ಟು ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಫಾರ್ಮ್‌ನಿಂದ ಪ್ರಯತ್ನಿಸಿ.',
    fetchBidsError: 'ಸ್ಮಾರ್ಟ್ ಹರಾಜು ಆಫರ್‌ಗಳನ್ನು ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
    noActiveListings: 'ಪ್ರಸ್ತುತ ಸ್ಮಾರ್ಟ್ ಹರಾಜಿನಲ್ಲಿ ಯಾವುದೇ ಸಕ್ರಿಯ ಬೆಳೆ ಪಟ್ಟಿಗಳಿಲ್ಲ.',
    biddingReachError: 'ಸ್ಮಾರ್ಟ್ ಹರಾಜು ಸೇವೆಯನ್ನು ತಲುಪಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ.',
    availCheckError: 'ಸಾರಿಗೆ ಲಭ್ಯತೆಯನ್ನು ಪರಿಶೀಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
    noVehiclesFound: 'ಈ ತೂಕಕ್ಕೆ ಯಾವುದೇ ವಾಹನಗಳು ಲಭ್ಯವಿಲ್ಲ:',
    transportReachError: 'ಸಾರಿಗೆ ಸಂಪರ್ಕ ಸೇವೆಯನ್ನು ತಲುಪಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ.',
    simStarting: 'ನಿಮ್ಮ ಡಿಜಿಟಲ್ ಜಮೀನು ಬೆಳೆ ಬೆಳವಣಿಗೆ ಸಿಮ್ಯುಲೇಶನ್ ಪ್ರಾರಂಭಿಸಲಾಗುತ್ತಿದೆ.',
    simPausing: 'ಬೆಳೆ ಬೆಳವಣಿಗೆ ಸಿಮ್ಯುಲೇಶನ್ ವಿರಾಮಗೊಳಿಸಲಾಗುತ್ತಿದೆ.',
    simResuming: 'ಬೆಳೆ ಬೆಳವಣಿಗೆ ಸಿಮ್ಯುಲೇಶನ್ ಮುಂದುವರಿಸಲಾಗುತ್ತಿದೆ.',
    simSummary: 'ನಿಮ್ಮ ಡಿಜಿಟಲ್ ಜಮೀನು ಕೊಯ್ಲು ಮತ್ತು ಆರ್ಥಿಕ ವರದಿಯನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ.',
    plannedSummary: (crop, acres, water, budget, invest, yieldKg, profit, nurseries) =>
      `${acres} ಎಕರೆ ${crop} ಬೆಳೆಗೆ ${water} ನೀರು ಮತ್ತು ₹${budget} ಬಜೆಟ್‌ನೊಂದಿಗೆ ಯೋಜನೆ ಸಿದ್ಧವಾಗಿದೆ. ಅಂದಾಜು ಹೂಡಿಕೆ ₹${invest}, ಇಳುವರಿ ${yieldKg} ಕೆಜಿ, ನಿವ್ವಳ ಲಾಭ ₹${profit}.${nurseries ? ' ಹತ್ತಿರದ ನರ್ಸರಿ ಆಯ್ಕೆಗಳನ್ನು ಕೆಳಗೆ ತೆರೆಯಲಾಗುತ್ತಿದೆ.' : ''}`,
    gotItBudgetPrompt: (crop, acres, budget) =>
      `ಸರಿ — ${acres} ಎಕರೆ ${crop} ಮತ್ತು ₹${budget} ಬಜೆಟ್. ನೀರಿನ ಲಭ್ಯತೆ ಹೇಗಿದೆ: ಹೆಚ್ಚು (Abundant), ಮಧ್ಯಮ (Moderate), ಅಥವಾ ಕಡಿಮೆ (Scarce)?`,
    draftJobPrompt: (summary) => `ಕೆಲಸದ ಕರಡು ಸಿದ್ಧವಾಗಿದೆ: ${summary}. ಪ್ರಕಟಿಸಲು ಹೌದು (Yes) ಅಥವಾ ರದ್ದುಮಾಡಲು ಬೇಡ (No) ಎಂದು ಹೇಳಿ.`,
    jobDraftSummary: (workType, count, date, location) =>
      `${location} ನಲ್ಲಿ ${date} ರಂದು ದಿನಕ್ಕೆ ₹650 ದರದಲ್ಲಿ ${count} ಕಾರ್ಮಿಕರಿಗೆ ${workType} ಕೆಲಸ`,
    foundBidsSummary: (count, qty, crop, bidCount, highest) =>
      `${count} ಸಕ್ರಿಯ ಹರಾಜು ಪಟ್ಟಿಗಳು ಸಿಕ್ಕಿವೆ. ಪ್ರಮುಖ ಲಾಟ್: ${qty} ಕೆಜಿ ${crop}, ${bidCount} ಬಿಡ್‌ಗಳು, ಗರಿಷ್ಠ ₹${highest}/ಕೆಜಿ.`,
    lotDraftSummary: (qty, crop, minPrice, location) =>
      `${location} ನಲ್ಲಿ ${qty} ಕೆಜಿ ${crop} (ಕನಿಷ್ಠ ₹${minPrice}/ಕೆಜಿ)`,
    draftLotPrompt: (summary) => `ಸ್ಮಾರ್ಟ್ ಹರಾಜು ಲಾಟ್ ಸಿದ್ಧವಾಗಿದೆ: ${summary}. ಪ್ರಕಟಿಸಲು ಹೌದು (Yes) ಅಥವಾ ರದ್ದುಮಾಡಲು ಬೇಡ (No) ಹೇಳಿ.`,
    bookingDraftSummary: (vehicle, driver, weight, pickup, fare) =>
      `${pickup} ನಿಂದ ಬೆಂಗಳೂರು APMC ಗೆ ${weight} ಕೆಜಿಗಾಗಿ ${driver} ಅವರ ${vehicle} ಬುಕ್ ಮಾಡಿ (ಅಂದಾಜು ₹${fare})`,
    foundVehiclesConfirmPrompt: (count, summary) =>
      `${count} ವಾಹನಗಳು ಲಭ್ಯವಿವೆ. ${summary}. ಬುಕ್ ಮಾಡಲು ಹೌದು (Yes) ಅಥವಾ ಬೇಡ (No) ಎಂದು ಹೇಳಿ.`,
    foundVehiclesListPrompt: (count, driver, vehicle, cap) =>
      `${count} ಸಾರಿಗೆ ವಾಹನಗಳು ಲಭ್ಯವಿವೆ. ಹತ್ತಿರದ ಚಾಲಕ ${driver} (${vehicle}, ಸಾಮರ್ಥ್ಯ ${cap} ಕೆಜಿ).`,
  },
  hi: {
    headerTitle: 'रैतामित्र आवाज़ मार्गदर्शक',
    states: { idle: 'तैयार', listening: 'सुन रहा है', processing: 'प्रक्रिया जारी', navigating: 'खोल रहा है', speaking: 'बोल रहा है' },
    muteLabel: 'आवाज़ बंद करें',
    unmuteLabel: 'आवाज़ चालू करें',
    closeLabel: 'वॉइस असिस्टेंट बंद करें',
    defaultHint: '"Open BioIntel", "टमाटर 2 एकड़ 40000 बजट", या "Open Digital Farming" बोलें या लिखें।',
    startMicLabel: 'माइक चालू करें',
    stopMicLabel: 'माइक बंद करें',
    inputPlaceholder: 'जैसे Open BioIntel',
    sendLabel: 'भेजें',
    toggleLabel: 'रैतामित्र वॉइस असिस्टेंट',
    voiceUnsupported: 'इस ब्राउज़र में वॉइस पहचान उपलब्ध नहीं है; नीचे कमांड टाइप करें।',
    voiceCaptureFailed: 'आवाज़ समझ नहीं आई; कृपया अपना कमांड टाइप करें।',
    fallbackCommandTip: 'कृपया "Open BioIntel", "Plan Tomato 2 acres 40000 budget", या "Open Digital Farming" कहें।',
    cancelled: 'रद्द कर दिया गया। कोई अनुरोध नहीं भेजा गया।',
    confirmPromptPrefix: 'पुष्टि के लिए हाँ (Yes) या रद्द करने के लिए नहीं (No) कहें:',
    askWaterPrompt: 'कृपया अपनी जल उपलब्धता बताएं: प्रचुर (Abundant), मध्यम (Moderate), या कम (Scarce)।',
    farmerOnlyPlanner: 'क्षमा करें, बीज निवेश योजना केवल किसान खातों के लिए उपलब्ध है।',
    farmerOnlySim: 'क्षमा करें, डिजिटल खेती सिमुलेशन केवल किसान खातों के लिए उपलब्ध है।',
    farmerOnlyLabour: 'क्षमा करें, श्रमिक कार्य पोस्ट करना केवल किसान खातों के लिए उपलब्ध है।',
    farmerBuyerBiddingOnly: 'क्षमा करें, स्मार्ट बोली केवल किसान और खरीदार खातों के लिए उपलब्ध है।',
    farmerOnlyListings: 'नए उपज लॉट केवल किसान खाते ही प्रकाशित कर सकते हैं।',
    transportUnavailable: 'क्षमा करें, परिवहन कनेक्ट आपके खाते के लिए उपलब्ध नहीं है।',
    submitError: 'अनुरोध अभी जमा नहीं हो सका। कृपया पेज फॉर्म से जमा करें।',
    labourPublished: 'आपका कृषि कार्य सफलतापूर्वक प्रकाशित हो गया है।',
    biddingPublished: 'आपका उपज लॉट स्मार्ट बोली पर प्रकाशित हो गया है।',
    transportSubmitted: 'आपका परिवहन बुकिंग अनुरोध जमा हो गया है।',
    networkError: 'नेटवर्क त्रुटि। कृपया कनेक्शन जांचें और फॉर्म से प्रयास करें।',
    fetchBidsError: 'अभी स्मार्ट बोली ऑफ़र प्राप्त नहीं हो सके।',
    noActiveListings: 'स्मार्ट बोली में अभी कोई सक्रिय फसल लॉट नहीं है।',
    biddingReachError: 'स्मार्ट बोली सेवा तक अभी पहुंचा नहीं जा सका।',
    availCheckError: 'अभी वाहन उपलब्धता की जांच नहीं हो सकी।',
    noVehiclesFound: 'इस वजन के लिए अभी कोई वाहन नहीं मिला:',
    transportReachError: 'परिवहन सेवा तक अभी पहुंचा नहीं जा सका।',
    simStarting: 'आपका डिजिटल खेत फसल विकास सिमुलेशन शुरू किया जा रहा है।',
    simPausing: 'फसल विकास सिमुलेशन रोका जा रहा है।',
    simResuming: 'फसल विकास सिमुलेशन फिर शुरू किया जा रहा है।',
    simSummary: 'आपकी डिजिटल कटाई और वित्तीय अनुमान दिखाया जा रहा है।',
    plannedSummary: (crop, acres, water, budget, invest, yieldKg, profit, nurseries) =>
      `${acres} एकड़ ${crop} के लिए ${water} पानी व ₹${budget} बजट की योजना तैयार है। अनुमानित निवेश ₹${invest}, उपज ${yieldKg} किलो व शुद्ध लाभ ₹${profit} है।${nurseries ? ' नजदीकी नर्सरी विकल्प नीचे खोले जा रहे हैं।' : ''}`,
    gotItBudgetPrompt: (crop, acres, budget) =>
      `ठीक है — ${acres} एकड़ ${crop} व ₹${budget} बजट। जल उपलब्धता क्या है: प्रचुर (Abundant), मध्यम (Moderate), या कम (Scarce)?`,
    draftJobPrompt: (summary) => `काम का ड्राफ्ट तैयार है: ${summary}। प्रकाशित करने के लिए हाँ (Yes) या रद्द के लिए नहीं (No) कहें।`,
    jobDraftSummary: (workType, count, date, location) =>
      `${location} में ${date} को ₹650 प्रतिदिन पर ${count} श्रमिकों का ${workType} कार्य`,
    foundBidsSummary: (count, qty, crop, bidCount, highest) =>
      `${count} सक्रिय नीलामी लॉट मिले। शीर्ष लॉट: ${qty} किलो ${crop}, ${bidCount} बोलियां, सर्वोच्च ₹${highest}/किलो।`,
    lotDraftSummary: (qty, crop, minPrice, location) =>
      `${location} में ${qty} किलो ${crop} न्यूनतम ₹${minPrice}/किलो पर`,
    draftLotPrompt: (summary) => `स्मार्ट बोली लॉट ड्राफ्ट तैयार है: ${summary}। प्रकाशित करने के लिए हाँ (Yes) या नहीं (No) कहें।`,
    bookingDraftSummary: (vehicle, driver, weight, pickup, fare) =>
      `${pickup} से बेंगलुरु APMC के लिए ${weight} किलो हेतु ${driver} का ${vehicle} बुक करें (अनुमानित ₹${fare})`,
    foundVehiclesConfirmPrompt: (count, summary) =>
      `${count} वाहन मिले। ${summary}। बुक करने के लिए हाँ (Yes) या रद्द के लिए नहीं (No) कहें।`,
    foundVehiclesListPrompt: (count, driver, vehicle, cap) =>
      `${count} परिवहन वाहन उपलब्ध हैं। निकटतम: ${driver} (${vehicle}, क्षमता ${cap} किलो)।`,
  },
  te: {
    headerTitle: 'రైతమిత్ర వాయిస్ గైడ్',
    states: { idle: 'సిద్ధం', listening: 'వింటోంది', processing: 'ప్రాసెస్ చేస్తోంది', navigating: 'తెరుస్తోంది', speaking: 'మాట్లాడుతోంది' },
    muteLabel: 'వాయిస్ మ్యూట్ చేయండి',
    unmuteLabel: 'వాయిస్ ఆన్ చేయండి',
    closeLabel: 'వాయిస్ అసిస్టెంట్ మూయండి',
    defaultHint: '"Open BioIntel", "టొమాటో 2 ఎకరాలు", లేదా "Open Digital Farming" అని చెప్పండి లేదా టైప్ చేయండి.',
    startMicLabel: 'మైక్ ప్రారంభించు',
    stopMicLabel: 'మైక్ ఆపు',
    inputPlaceholder: 'ఉదా. Open BioIntel',
    sendLabel: 'పంపు',
    toggleLabel: 'రైతమిత్ర వాయిస్ అసిస్టెంట్',
    voiceUnsupported: 'ఈ బ్రౌజర్‌లో వాయిస్ గుర్తింపు అందుబాటులో లేదు; క్రింద టైప్ చేయండి.',
    voiceCaptureFailed: 'వాయిస్ గ్రహించలేకపోయాము; దయచేసి టైప్ చేయండి.',
    fallbackCommandTip: 'దయచేసి "Open BioIntel", "Plan Tomato 2 acres 40000 budget", లేదా "Open Digital Farming" అని చెప్పండి.',
    cancelled: 'రద్దు చేయబడింది. ఏ అభ్యర్థనా పంపబడలేదు.',
    confirmPromptPrefix: 'నిర్ధారించడానికి అవును (Yes) లేదా రద్దుకు వద్దు (No) అని చెప్పండి:',
    askWaterPrompt: 'దయచేసి నీటి లభ్యతను చెప్పండి: సమృద్ధిగా (Abundant), మధ్యస్థం (Moderate), లేదా తక్కువ (Scarce).',
    farmerOnlyPlanner: 'క్షమించండి, విత్తన పెట్టుబడి ప్రణాళిక కేవలం రైతు ఖాతాలకు మాత్రమే అందుబాటులో ఉంది.',
    farmerOnlySim: 'క్షమించండి, డిజిటల్ వ్యవసాయ అనుకరణ కేవలం రైతు ఖాతాలకు మాత్రమే అందుబాటులో ఉంది.',
    farmerOnlyLabour: 'క్షమించండి, కూలీ పనులను పోస్ట్ చేయడం కేవలం రైతు ఖాతాలకు మాత్రమే అందుబాటులో ఉంది.',
    farmerBuyerBiddingOnly: 'క్షమించండి, స్మార్ట్ బిడ్డింగ్ కేవలం రైతు & కొనుగోలుదారు ఖాతాలకు మాత్రమే అందుబాటులో ఉంది.',
    farmerOnlyListings: 'కొత్త పంట లాట్లను రైతు ఖాతాలు మాత్రమే ప్రచురించగలవు.',
    transportUnavailable: 'క్షమించండి, రవాణా కనెక్ట్ మీ ఖాతాకు అందుబాటులో లేదు.',
    submitError: 'అభ్యర్థనను ఇప్పుడు పంపలేకపోయాము. దయచేసి పేజీ ఫారమ్ నుండి పంపండి.',
    labourPublished: 'మీ వ్యవసాయ కూలీ పని ప్రచురించబడింది.',
    biddingPublished: 'మీ పంట లాట్ స్మార్ట్ బిడ్డింగ్‌లో ప్రచురించబడింది.',
    transportSubmitted: 'మీ రవాణా బుకింగ్ అభ్యర్థన పంపబడింది.',
    networkError: 'నెట్‌వర్క్ లోపం. దయచేసి కనెక్షన్ తనిఖీ చేసి మళ్ళీ ప్రయత్నించండి.',
    fetchBidsError: 'స్మార్ట్ బిడ్డింగ్ ఆఫర్లను ఇప్పుడు పొందలేకపోయాము.',
    noActiveListings: 'ప్రస్తుతం స్మార్ట్ బిడ్డింగ్‌లో సక్రియ పంట లాట్లు లేవు.',
    biddingReachError: 'స్మార్ట్ బిడ్డింగ్ సేవను చేరుకోలేకపోతున్నాము.',
    availCheckError: 'వాహన లభ్యతను ఇప్పుడు తనిఖీ చేయలేకపోయాము.',
    noVehiclesFound: 'ఈ బరువుకు ప్రస్తుత వాహనాలు లేవు:',
    transportReachError: 'రవాణా కనెక్ట్ సేవను చేరుకోలేకపోతున్నాము.',
    simStarting: 'మీ డిజిటల్ పొలం పంట పెరుగుదల అనుకరణ ప్రారంభించబడుతోంది.',
    simPausing: 'పంట పెరుగుదల అనుకరణ ఆపబడింది.',
    simResuming: 'పంట పెరుగుదల అనుకరణ కొనసాగించబడుతోంది.',
    simSummary: 'మీ డిజిటల్ కోత మరియు ఆర్థిక అంచనా సారాంశం చూపబడుతోంది.',
    plannedSummary: (crop, acres, water, budget, invest, yieldKg, profit, nurseries) =>
      `${acres} ఎకరాల ${crop} కోసం ${water} నీరు మరియు ₹${budget} బడ్జెట్‌తో ప్రణాళిక సిద్ధమైంది. అంచనా పెట్టుబడి ₹${invest}, దిగుబడి ${yieldKg} కిలోలు, నికర లాభం ₹${profit}.${nurseries ? ' సమీప నర్సరీల వివరాలు క్రింద తెరవబడుతున్నాయి.' : ''}`,
    gotItBudgetPrompt: (crop, acres, budget) =>
      `అర్థమైంది — ${acres} ఎకరాల ${crop} & ₹${budget} బడ్జెట్. నీటి లభ్యత ఎలా ఉంది: సమృద్ధిగా (Abundant), మధ్యస్థం (Moderate), లేదా తక్కువ (Scarce)?`,
    draftJobPrompt: (summary) => `పని డ్రాఫ్ట్ సిద్ధమైంది: ${summary}. ప్రచురించడానికి అవును (Yes) లేదా వద్దు (No) అని చెప్పండి.`,
    jobDraftSummary: (workType, count, date, location) =>
      `${location} లో ${date} న రోజుకు ₹650 చొప్పున ${count} కూలీలకు ${workType} పని`,
    foundBidsSummary: (count, qty, crop, bidCount, highest) =>
      `${count} సక్రియ వేలం లాట్లు కనుగొనబడ్డాయి. ప్రధాన లాట్: ${qty} కిలోల ${crop}, ${bidCount} బిడ్లు, గరిష్టం ₹${highest}/కిలో.`,
    lotDraftSummary: (qty, crop, minPrice, location) =>
      `${location} లో ${qty} కిలోల ${crop} కనీస ధర ₹${minPrice}/కిలోకు`,
    draftLotPrompt: (summary) => `స్మార్ట్ బిడ్డింగ్ లాట్ సిద్ధమైంది: ${summary}. ప్రచురించడానికి అవును (Yes) లేదా వద్దు (No) చెప్పండి.`,
    bookingDraftSummary: (vehicle, driver, weight, pickup, fare) =>
      `${pickup} నుండి బెంగళూరు APMC కు ${weight} కిలోల కోసం ${driver} యొక్క ${vehicle} బుక్ చేయండి (అంచనా ₹${fare})`,
    foundVehiclesConfirmPrompt: (count, summary) =>
      `${count} వాహనాలు అందుబాటులో ఉన్నాయి. ${summary}. బుక్ చేయడానికి అవును (Yes) లేదా వద్దు (No) అని చెప్పండి.`,
    foundVehiclesListPrompt: (count, driver, vehicle, cap) =>
      `${count} రవాణా వాహనాలు అందుబాటులో ఉన్నాయి. సమీప డ్రైవర్ ${driver} (${vehicle}, సామర్థ్యం ${cap} కిలోలు).`,
  },
};

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
  const { currentUser, currentFarm, language } = useFarm();

  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [state, setState] = useState<AssistantState>('idle');
  const [input, setInput] = useState('');
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [pendingBioIntelDraft, setPendingBioIntelDraft] = useState<PendingBioIntelDraft | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const pendingIntentRef = useRef<RouteIntent | null>(null);
  const recognitionRef = useRef<any>(null);

  const lang = (language || 'en') as AssistantLanguage;
  const vt = VOICE_UI_I18N[lang];
  const numLocale = getIntlLocale(lang);

  const speakAndSet = (msg: string) => {
    setTranscriptText(msg);
    const res = speakWithDeviceVoice(msg, lang, muted, {
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

    const summaryMsg = vt.plannedSummary(
      localizeCropName(preset.name, lang),
      areaAcres,
      localizeCondition(waterAvailability, lang),
      budgetInr.toLocaleString(numLocale),
      result.totalCultivationInvestmentInr.toLocaleString(numLocale),
      result.expectedProductionKg.toLocaleString(numLocale),
      result.estimatedProfitInr.toLocaleString(numLocale),
      openNurseries
    );
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pending.payload),
      });

      if (!res.ok) {
        speakAndSet(vt.submitError);
        return;
      }

      if (pending.kind === 'labour_post') {
        speakAndSet(vt.labourPublished);
        if (pathname !== '/labour') router.push('/labour');
      } else if (pending.kind === 'bidding_post') {
        speakAndSet(vt.biddingPublished);
        if (pathname !== '/smart-market') router.push('/smart-market?section=bidding');
      } else {
        speakAndSet(vt.transportSubmitted);
        if (pathname !== '/transport') router.push('/transport');
      }
    } catch {
      speakAndSet(vt.networkError);
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
        speakAndSet(vt.cancelled);
        return;
      }
      speakAndSet(`${vt.confirmPromptPrefix} ${pendingConfirmation.summary}`);
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
        speakAndSet(vt.askWaterPrompt);
        return;
      }
      setPendingBioIntelDraft(null);
    }

    // 3. Allowlisted Agentic Task Workflows
    const task = parseAgenticTaskCommand(text);
    if (task) {
      if (task.type === 'biointel_plan') {
        if (currentUser.role !== 'farmer') {
          speakAndSet(vt.farmerOnlyPlanner);
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
            vt.gotItBudgetPrompt(localizeCropName(task.crop, lang), areaAcres, budgetInr.toLocaleString(numLocale))
          );
          return;
        }
        executeBioIntelWorkflow(task.crop, areaAcres, budgetInr, task.waterAvailability, task.openNurseries);
        return;
      }

      if (task.type === 'digital_farm_control') {
        if (currentUser.role !== 'farmer') {
          speakAndSet(vt.farmerOnlySim);
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
            ? vt.simStarting
            : task.action === 'pause'
              ? vt.simPausing
              : task.action === 'resume'
                ? vt.simResuming
                : vt.simSummary;
        speakAndSet(actionMsg);
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

      if (task.type === 'labour_hire') {
        if (currentUser.role !== 'farmer') {
          speakAndSet(vt.farmerOnlyLabour);
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
        const summary = vt.jobDraftSummary(task.workType, task.workersCount, task.workDate, location);
        setPendingConfirmation({ kind: 'labour_post', payload, summary });
        speakAndSet(vt.draftJobPrompt(summary));
        return;
      }

      if (task.type === 'bidding_action') {
        if (currentUser.role !== 'farmer' && currentUser.role !== 'buyer') {
          speakAndSet(vt.farmerBuyerBiddingOnly);
          return;
        }
        if (task.subAction === 'check_offers') {
          try {
            const res = await fetch(`${backendUrl}/bidding/listings`);
            if (!res.ok) {
              speakAndSet(vt.fetchBidsError);
              return;
            }
            const listings = await res.json();
            const mine = Array.isArray(listings)
              ? listings.filter((l: any) => l.farmer_id === currentUser.id)
              : [];
            const target = mine.length > 0 ? mine : Array.isArray(listings) ? listings : [];
            if (target.length === 0) {
              speakAndSet(vt.noActiveListings);
              return;
            }
            const top = target[0];
            const bidCount = Array.isArray(top.bids) ? top.bids.length : 0;
            const highest = bidCount > 0 ? Math.max(...top.bids.map((b: any) => Number(b.bid_amount_per_kg || 0))) : top.min_price_per_kg;
            speakAndSet(
              vt.foundBidsSummary(target.length, top.quantity_kg, localizeCropName(top.crop_name, lang), bidCount, highest)
            );
          } catch {
            speakAndSet(vt.biddingReachError);
          }
          return;
        }
        if (currentUser.role !== 'farmer') {
          speakAndSet(vt.farmerOnlyListings);
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
        const summary = vt.lotDraftSummary(payload.quantity_kg, localizeCropName(payload.crop_name, lang), payload.min_price_per_kg, location);
        setPendingConfirmation({ kind: 'bidding_post', payload, summary });
        speakAndSet(vt.draftLotPrompt(summary));
        return;
      }

      if (task.type === 'transport_action') {
        if (!['farmer', 'buyer', 'driver'].includes(currentUser.role)) {
          speakAndSet(vt.transportUnavailable);
          return;
        }
        try {
          const weight = task.cargoWeightKg || 500;
          const res = await fetch(`${backendUrl}/transport/drivers?min_capacity_kg=${weight}`);
          if (!res.ok) {
            speakAndSet(vt.availCheckError);
            return;
          }
          const drivers = await res.json();
          if (!Array.isArray(drivers) || drivers.length === 0) {
            speakAndSet(`${vt.noVehiclesFound} ${weight} kg.`);
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
            const summary = vt.bookingDraftSummary(d.vehicle_type, d.driver_name, weight, pickup, totalFare);
            setPendingConfirmation({ kind: 'transport_book', payload, summary });
            speakAndSet(vt.foundVehiclesConfirmPrompt(drivers.length, summary));
            return;
          }
          speakAndSet(
            vt.foundVehiclesListPrompt(drivers.length, d.driver_name, d.vehicle_type, d.max_capacity_kg)
          );
        } catch {
          speakAndSet(vt.transportReachError);
        }
        return;
      }
    }

    // 4. Navigation intents
    const intent = matchNavigationIntent(text);
    if (!intent) {
      speakAndSet(vt.fallbackCommandTip);
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

  const toggleMic = () => {
    if (state === 'listening') {
      stopListening();
      setState('idle');
      return;
    }

    const SpeechRecognitionCtor =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognitionCtor) {
      setVoiceNote(vt.voiceUnsupported);
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

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
      setVoiceNote(vt.voiceCaptureFailed);
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
                <div className="text-xs font-semibold">{vt.headerTitle}</div>
                <div className="text-[10px] text-emerald-200 capitalize">{vt.states[state]}</div>
              </div>
              {(state === 'listening' || state === 'speaking') && (
                <div className="flex items-center gap-0.5 h-4 ml-1" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-0.5 h-3.5 rounded-full bg-[#65A76F] rm-wave-bar"
                      style={{ animationDelay: `${i * 0.14}s` }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (!muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  setMuted((m) => !m);
                }}
                aria-label={muted ? vt.unmuteLabel : vt.muteLabel}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                {muted ? <VolumeX className="w-4 h-4 text-amber-300" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={vt.closeLabel}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-3.5 space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 text-[#20372A] dark:text-zinc-200 min-h-[54px]">
              {transcriptText || vt.defaultHint}
            </div>

            {voiceNote && (
              <div className="text-[11px] text-[#8D7357] dark:text-amber-300">{voiceNote}</div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCommand(input);
                setInput('');
              }}
              className="flex items-center gap-1.5"
            >
              <button
                type="button"
                onClick={toggleMic}
                aria-label={state === 'listening' ? vt.stopMicLabel : vt.startMicLabel}
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
                placeholder={vt.inputPlaceholder}
                className="flex-1 px-3 py-2 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
              />
              <button
                type="submit"
                aria-label={vt.sendLabel}
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
        aria-label={vt.toggleLabel}
        className="w-12 h-12 rounded-full bg-[#173C2B] hover:bg-[#102D20] text-white shadow-lg border border-[#65A76F]/40 flex items-center justify-center transition"
      >
        {open ? <MessageSquare className="w-5 h-5" /> : <Sprout className="w-5 h-5 text-[#65A76F]" />}
      </button>
    </div>
  );
}
