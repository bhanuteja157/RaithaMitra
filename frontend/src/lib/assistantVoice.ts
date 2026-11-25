// frontend/src/lib/assistantVoice.ts
// Agentic AI spoken navigation feedback, RBAC route authorization, and Web Speech API helper.

import { Language, UserRole } from '@/types';

export type AssistantLanguage = Language | 'te';

export interface RouteIntent {
  id: string;
  route: string;
  keywords: string[];
  allowedRoles: UserRole[];
  label: Record<AssistantLanguage, string>;
  description: Record<AssistantLanguage, string>;
}

export const AUTHORIZED_ROUTE_INTENTS: RouteIntent[] = [
  {
    id: 'biointel',
    route: '/biointel',
    keywords: ['biointel', 'biotech', 'seed investment', 'seed planner', 'ಬಯೋಇಂಟೆಲ್', 'बायोइंटेल', 'బయోఇంటెల్'],
    allowedRoles: ['farmer'],
    label: { en: 'BioIntel', kn: 'ಬಯೋಇಂಟೆಲ್', hi: 'बायोइंटेल', te: 'బయోఇంటెల్' },
    description: {
      en: 'You can explore agricultural research and seed recommendations here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಕೃಷಿ ಸಂಶೋಧನೆ ಮತ್ತು ಬೀಜಗಳ ಶಿಫಾರಸುಗಳನ್ನು ನೋಡಬಹುದು.',
      hi: 'यहाँ आप कृषि अनुसंधान और बीज सिफारिशें देख सकते हैं।',
      te: 'ఇక్కడ మీరు వ్యవసాయ పరిశోధన మరియు విత్తనాల సిఫార్సులను చూడవచ్చు.',
    },
  },
  {
    id: 'nursery',
    route: '/nursery-marketplace',
    keywords: ['nursery', 'sapling', 'seedling', 'ನರ್ಸರಿ', 'नर्सरी', 'నర్సరీ'],
    allowedRoles: ['farmer', 'buyer'],
    label: { en: 'Nursery Marketplace', kn: 'ನರ್ಸರಿ ಮಾರುಕಟ್ಟೆ', hi: 'नर्सरी मार्केटप्लेस', te: 'నర్సరీ మార్కెట్' },
    description: {
      en: 'You can browse certified nurseries and compare bio-inputs here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಪ್ರಮಾಣೀಕೃತ ನರ್ಸರಿಗಳು ಮತ್ತು ಜೈವಿಕ ಒಳಸುರಿಗಳನ್ನು ಹುಡುಕಬಹುದು.',
      hi: 'यहाँ आप प्रमाणित नर्सरी और जैव-इनपुट देख सकते हैं।',
      te: 'ఇక్కడ మీరు సర్టిఫైడ్ నర్సరీలు మరియు బయో-ఇన్‌పుట్‌లను చూడవచ్చు.',
    },
  },
  {
    id: 'labour',
    route: '/labour',
    keywords: ['labour', 'labor', 'worker', 'work', 'ಕಾರ್ಮಿಕ', 'श्रम', 'కూలీ'],
    allowedRoles: ['farmer', 'labour'],
    label: { en: 'Labour Connect', kn: 'ಲೇಬರ್ ಕನೆಕ್ಟ್', hi: 'लेबर कनेक्ट', te: 'లేబర్ కనెక్ట్' },
    description: {
      en: 'You can find agricultural workers and manage farm jobs here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಕೃಷಿ ಕಾರ್ಮಿಕರನ್ನು ಹುಡುಕಬಹುದು ಮತ್ತು ಕೆಲಸಗಳನ್ನು ನಿರ್ವಹಿಸಬಹುದು.',
      hi: 'यहाँ आप कृषि श्रमिकों को ढूंढ सकते हैं और काम प्रबंधित कर सकते हैं।',
      te: 'ఇక్కడ మీరు వ్యవసాయ కార్మికులను కనుగొనవచ్చు.',
    },
  },
  {
    id: 'bidding',
    route: '/bidding',
    keywords: ['bidding', 'smart bidding', 'bid', 'auction', 'ಬಿಡ್ಡಿಂಗ್', 'बोली', 'బిడ్డింగ్'],
    allowedRoles: ['farmer', 'buyer'],
    label: { en: 'Smart Bidding', kn: 'ಸ್ಮಾರ್ಟ್ ಬಿಡ್ಡಿಂಗ್', hi: 'स्मार्ट बिडिंग', te: 'స్మార్ట్ బిడ్డింగ్' },
    description: {
      en: 'You can list your crops and receive offers from buyers here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಬೆಳೆಗಳನ್ನು ಪಟ್ಟಿ ಮಾಡಿ ಖರೀದಿದಾರರಿಂದ ಬೆಲೆ ಪಡೆಯಬಹುದು.',
      hi: 'यहाँ आप अपनी फसल सूचीबद्ध कर सकते हैं और खरीदारों से बोली प्राप्त कर सकते हैं।',
      te: 'ఇక్కడ మీరు మీ పంటలను జాబితా చేసి కొనుగోలుదారుల నుండి ఆఫర్లు పొందవచ్చు.',
    },
  },
  {
    id: 'transport',
    route: '/transport',
    keywords: ['transport', 'logistics', 'truck', 'vehicle', 'ಸಾರಿಗೆ', 'परिवहन', 'రవాణా'],
    allowedRoles: ['farmer', 'buyer', 'driver'],
    label: { en: 'Transport Connect', kn: 'ಟ್ರಾನ್ಸ್‌ಪೋರ್ಟ್ ಕನೆಕ್ಟ್', hi: 'ट्रांसपोर्ट कनेक्ट', te: 'ట్రాన్స్‌పోర్ట్ కనెక్ట్' },
    description: {
      en: 'You can find transportation for your agricultural produce here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಕೃಷಿ ಉತ್ಪನ್ನಗಳ ಸಾಗಾಣಿಕೆಗೆ ವಾಹನವನ್ನು ಬುಕ್ ಮಾಡಬಹುದು.',
      hi: 'यहाँ आप अपनी कृषि उपज के लिए परिवहन खोज सकते हैं।',
      te: 'ఇక్కడ మీరు మీ వ్యవసాయ ఉత్పత్తుల కోసం రవాణాను కనుగొనవచ్చు.',
    },
  },
  {
    id: 'digital-farming',
    route: '/digital-farming',
    keywords: ['digital farming', 'simulator', 'polygon', 'boundary', 'ಡಿಜಿಟಲ್ ಕೃಷಿ', 'डिजिटल खेती', 'డిజిటల్ వ్యవసాయం'],
    allowedRoles: ['farmer'],
    label: { en: 'Digital Farming', kn: 'ಡಿಜಿಟಲ್ ಕೃಷಿ', hi: 'डिजिटल खेती', te: 'డిజిటల్ వ్యవసాయం' },
    description: {
      en: 'You can select your farmland and simulate crop cultivation here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಜಮೀನಿನ ಗಡಿ ಗುರುತಿಸಿ ಬೆಳೆ ಬೆಳವಣಿಗೆಯನ್ನು ಅನುಕರಿಸಬಹುದು.',
      hi: 'यहाँ आप अपनी जमीन चुनकर फसल की खेती का अनुकरण कर सकते हैं।',
      te: 'ఇక్కడ మీరు మీ భూమిని ఎంచుకుని పంట సాగును అనుకరించవచ్చు.',
    },
  },
  {
    id: 'market-intelligence',
    route: '/market-intelligence',
    keywords: ['market intelligence', 'mandi', 'sell now', 'selling', 'ಮಾರುಕಟ್ಟೆ', 'मंडी', 'మార్కెట్'],
    allowedRoles: ['farmer', 'buyer'],
    label: { en: 'Market Intelligence', kn: 'ಮಾರುಕಟ್ಟೆ ಬುದ್ಧಿವಂತಿಕೆ', hi: 'मार्केट इंटेलिजेंस', te: 'మార్కెట్ ఇంటెలిజెన్స్' },
    description: {
      en: 'You can compare available market prices and selling opportunities here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು ಮತ್ತು ಮಾರಾಟದ ಅವಕಾಶಗಳನ್ನು ಹೋಲಿಸಬಹುದು.',
      hi: 'यहाँ आप बाजार कीमतों और बिक्री के अवसरों की तुलना कर सकते हैं।',
      te: 'ఇక్కడ మీరు మార్కెట్ ధరలు మరియు అమ్మకపు అవకాశాలను పోల్చవచ్చు.',
    },
  },
  {
    id: 'irrigation',
    route: '/irrigation',
    keywords: ['irrigation', 'water', 'drip', 'ನೀರಾವರಿ', 'सिंचाई', 'నీటిపారుదల'],
    allowedRoles: ['farmer'],
    label: { en: 'Precision Irrigation', kn: 'ನಿಖರ ನೀರಾವರಿ', hi: 'सटीक सिंचाई', te: 'ఖచ్చితమైన నీటిపారుదల' },
    description: {
      en: "You can review your farm's water requirements here.",
      kn: 'ಇಲ್ಲಿ ನೀವು ನಿಮ್ಮ ಜಮೀನಿನ ನೀರಿನ ಅಗತ್ಯಗಳನ್ನು ಪರಿಶೀಲಿಸಬಹುದು.',
      hi: 'यहाँ आप अपने खेत की पानी की आवश्यकताओं की समीक्षा कर सकते हैं।',
      te: 'ఇక్కడ మీరు మీ పొలం నీటి అవసరాలను సమీక్షించవచ్చు.',
    },
  },
  {
    id: 'climate',
    route: '/climate',
    keywords: ['climate', 'weather', 'rain', 'ಹವಾಮಾನ', 'मौसम', 'వాతావరణం'],
    allowedRoles: ['farmer'],
    label: { en: 'Climate Intelligence', kn: 'ಹವಾಮಾನ ಮಾಹಿತಿ', hi: 'जलवायु बुद्धिमत्ता', te: 'వాతావరణ సమాచారం' },
    description: {
      en: 'You can review weather forecasts and agricultural advisories here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ಮತ್ತು ಕೃಷಿ ಸಲಹೆಗಳನ್ನು ನೋಡಬಹುದು.',
      hi: 'यहाँ आप मौसम पूर्वानुमान और कृषि सलाह देख सकते हैं।',
      te: 'ఇక్కడ మీరు వాతావరణ సూచనలు చూడవచ్చు.',
    },
  },
  {
    id: 'diagnostics',
    route: '/diagnostics',
    keywords: ['diagnostic', 'disease', 'pest', 'ರೋಗ', 'रोग', 'వ్యాధి'],
    allowedRoles: ['farmer'],
    label: { en: 'Crop Diagnostics', kn: 'ಬೆಳೆ ರೋಗ ಪತ್ತೆ', hi: 'फसल निदान', te: 'పంట వ్యాధి నిర్ధారణ' },
    description: {
      en: 'You can inspect crop health indicators and diagnostics here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಬೆಳೆ ಆರೋಗ್ಯ ಸೂಚಕಗಳನ್ನು ಪರಿಶೀಲಿಸಬಹುದು.',
      hi: 'यहाँ आप फसल स्वास्थ्य संकेतकों की जांच कर सकते हैं।',
      te: 'ఇక్కడ మీరు పంట ఆరోగ్య సూచికలను చూడవచ్చు.',
    },
  },
  {
    id: 'dashboard',
    route: '/',
    keywords: ['home', 'dashboard', 'farmer dashboard', 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', 'डैशबोर्ड'],
    allowedRoles: ['farmer'],
    label: { en: 'Farmer Dashboard', kn: 'ರೈತ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', hi: 'किसान डैशबोर्ड', te: 'రైతు డ్యాష్‌బోర్డ్' },
    description: {
      en: 'You can view your farm overview and daily actions here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ನಿಮ್ಮ ಜಮೀನಿನ ಸಾರಾಂಶ ಮತ್ತು ದೈನಂದಿನ ಕ್ರಮಗಳನ್ನು ನೋಡಬಹುದು.',
      hi: 'यहाँ आप अपने खेत का सारांश और दैनिक कार्य देख सकते हैं।',
      te: 'ఇక్కడ మీరు మీ పొలం సారాంశాన్ని చూడవచ్చు.',
    },
  },
  {
    id: 'buyer-dashboard',
    route: '/dashboard/buyer',
    keywords: ['buyer dashboard', 'buyer portal'],
    allowedRoles: ['buyer'],
    label: { en: 'Buyer Dashboard', kn: 'ಖರೀದಿದಾರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', hi: 'खरीदार डैशबोर्ड', te: 'కొనుగోలుదారు డ్యాష్‌బోర్డ్' },
    description: {
      en: 'You can view active produce lots and confirmed purchases here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಲಭ್ಯವಿರುವ ಬೆಳೆಗಳು ಮತ್ತು ಖರೀದಿಗಳನ್ನು ನೋಡಬಹುದು.',
      hi: 'यहाँ आप उपलब्ध उपज और खरीदारी देख सकते हैं।',
      te: 'ఇక్కడ మీరు అందుబాటులో ఉన్న పంటలను చూడవచ్చు.',
    },
  },
  {
    id: 'labour-dashboard',
    route: '/dashboard/labour',
    keywords: ['labour dashboard', 'labour portal', 'my jobs'],
    allowedRoles: ['labour'],
    label: { en: 'Labour Dashboard', kn: 'ಕಾರ್ಮಿಕ ಪೋರ್ಟಲ್', hi: 'श्रमिक पोर्टल', te: 'కార్మిక పోర్టల్' },
    description: {
      en: 'You can view your agricultural jobs and daily earnings here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ನಿಮ್ಮ ಕೃಷಿ ಕೆಲಸಗಳು ಮತ್ತು ಆದಾಯವನ್ನು ನೋಡಬಹುದು.',
      hi: 'यहाँ आप अपने कृषि कार्य और कमाई देख सकते हैं।',
      te: 'ఇక్కడ మీరు మీ వ్యవసాయ పనులు చూడవచ్చు.',
    },
  },
  {
    id: 'driver-dashboard',
    route: '/dashboard/driver',
    keywords: ['driver dashboard', 'driver console', 'my trips'],
    allowedRoles: ['driver'],
    label: { en: 'Driver Console', kn: 'ಚಾಲಕ ಕನ್ಸೋಲ್', hi: 'ड्राइवर कंसोल', te: 'డ్రైవర్ కన్సోల్' },
    description: {
      en: 'You can view freight booking requests and trip progress here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಸಾಗಾಣಿಕೆ ಬುಕಿಂಗ್ ಮತ್ತು ಟ್ರಿಪ್ ವಿವರಗಳನ್ನು ನೋಡಬಹುದು.',
      hi: 'यहाँ आप माल ढुलाई बुकिंग और यात्रा की प्रगति देख सकते हैं।',
      te: 'ఇక్కడ మీరు రవాణా బుకింగ్‌లను చూడవచ్చు.',
    },
  },
];

export function matchNavigationIntent(query: string): RouteIntent | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const intent of AUTHORIZED_ROUTE_INTENTS) {
    if (intent.keywords.some((kw) => q.includes(kw))) {
      return intent;
    }
  }
  return null;
}

export function buildPreNavigationMessage(intent: RouteIntent, lang: AssistantLanguage): string {
  const name = intent.label[lang] || intent.label.en;
  if (lang === 'kn') return `ಖಂಡಿತ, ನಾನು ನಿಮಗಾಗಿ ${name} ತೆರೆಯುತ್ತಿದ್ದೇನೆ.`;
  if (lang === 'hi') return `ज़रूर, मैं आपके लिए ${name} खोल रहा हूँ।`;
  if (lang === 'te') return `తప్పకుండా, మీ కోసం ${name} తెరుస్తున్నాను.`;
  return `Sure, I am opening ${name} for you.`;
}

export function buildPostNavigationMessage(intent: RouteIntent, lang: AssistantLanguage): string {
  const name = intent.label[lang] || intent.label.en;
  const desc = intent.description[lang] || intent.description.en;
  if (lang === 'kn') return `ನಾನು ನಿಮಗಾಗಿ ${name} ತೆರೆದಿದ್ದೇನೆ. ${desc}`;
  if (lang === 'hi') return `मैंने आपके लिए ${name} खोल दिया है। ${desc}`;
  if (lang === 'te') return `మీ కోసం ${name} తెరిచాను. ${desc}`;
  return `I have opened ${name}. ${desc}`;
}

export function buildUnauthorizedMessage(intent: RouteIntent, role: UserRole, lang: AssistantLanguage): string {
  const name = intent.label[lang] || intent.label.en;
  if (lang === 'kn') return `ಕ್ಷಮಿಸಿ, ನಿಮ್ಮ ${role} ಖಾತೆಗೆ ${name} ಪ್ರವೇಶ ಅನುಮತಿ ಇಲ್ಲ.`;
  if (lang === 'hi') return `क्षमा करें, आपके ${role} खाते को ${name} की अनुमति नहीं है।`;
  if (lang === 'te') return `క్షమించండి, మీ ${role} ఖాతాకు ${name} అనుమతి లేదు.`;
  return `Sorry, ${name} is not available for your ${role} account.`;
}

export function getBcp47ForLanguage(lang: AssistantLanguage): string {
  switch (lang) {
    case 'kn':
      return 'kn-IN';
    case 'hi':
      return 'hi-IN';
    case 'te':
      return 'te-IN';
    default:
      return 'en-IN';
  }
}

export function speakWithDeviceVoice(
  text: string,
  lang: AssistantLanguage,
  muted: boolean,
  callbacks?: { onStart?: () => void; onEnd?: () => void }
): { spoken: boolean; voiceUnavailableReason?: string } {
  if (muted) {
    callbacks?.onEnd?.();
    return { spoken: false };
  }
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callbacks?.onEnd?.();
    return { spoken: false, voiceUnavailableReason: 'Speech synthesis is not supported in this browser.' };
  }

  const synth = window.speechSynthesis;
  synth.cancel(); // Prevent overlapping speech

  const targetTag = getBcp47ForLanguage(lang);
  const voices = synth.getVoices();
  const exactVoice =
    voices.find((v) => v.lang.toLowerCase() === targetTag.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(lang));

  // Do not silently speak in an unrelated language if non-English voice is unavailable
  if (lang !== 'en' && voices.length > 0 && !exactVoice) {
    callbacks?.onEnd?.();
    return {
      spoken: false,
      voiceUnavailableReason: `No ${targetTag} voice installed on this device; showing translated text instead.`,
    };
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = exactVoice?.lang || targetTag;
  if (exactVoice) utterance.voice = exactVoice;
  utterance.rate = 0.96;
  utterance.pitch = 1.0;

  utterance.onstart = () => callbacks?.onStart?.();
  utterance.onend = () => callbacks?.onEnd?.();
  utterance.onerror = () => callbacks?.onEnd?.();

  synth.speak(utterance);
  return { spoken: true };
}
