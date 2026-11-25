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
    route: '/biointel#nurseries',
    keywords: ['nursery', 'nurseries', 'sapling', 'seedling', 'buy seeds', 'ನರ್ಸರಿ', 'नर्सरी', 'నర్సరీ'],
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
    route: '/smart-market?section=bidding',
    keywords: ['bidding', 'smart bidding', 'bid', 'auction', 'smart market', 'ಬಿಡ್ಡಿಂಗ್', 'बोली', 'బిడ్డింగ్'],
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
    keywords: ['transport', 'logistics', 'truck', 'vehicle', 'post harvest', 'ಸಾರಿಗೆ', 'परिवहन', 'రవాణా'],
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
    keywords: ['digital farming', 'digital farm', 'simulator', 'polygon', 'boundary', 'satellite', 'farm twin', 'ಡಿಜಿಟಲ್ ಕೃಷಿ', 'डिजिटल खेती', 'డిజిటల్ వ్యవసాయం'],
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
    route: '/smart-market?section=market_intel',
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
    route: '/farm-management?section=irrigation',
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
    route: '/farm-management?section=climate',
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
    id: 'soil',
    route: '/farm-management?section=soil',
    keywords: ['soil', 'nutrients', 'fertilizer', 'ಮಣ್ಣು', 'मिट्टी', 'నేల'],
    allowedRoles: ['farmer'],
    label: { en: 'Soil & Nutrients', kn: 'ಮಣ್ಣು ಮತ್ತು ಪೋಷಕಾಂಶಗಳು', hi: 'मिट्टी और पोषक तत्व', te: 'నేల మరియు పోషకాలు' },
    description: {
      en: 'You can inspect soil nutrient health and fertilizer guidance here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಮಣ್ಣಿನ ಪೋಷಕಾಂಶ ಮತ್ತು ಗೊಬ್ಬರ ಸಲಹೆಗಳನ್ನು ನೋಡಬಹುದು.',
      hi: 'यहाँ आप मिट्टी के पोषक तत्व और उर्वरक सलाह देख सकते हैं।',
      te: 'ఇక్కడ మీరు నేల పోషకాలు మరియు ఎరువుల సూచనలను చూడవచ్చు.',
    },
  },
  {
    id: 'farm-management',
    route: '/farm-management',
    keywords: ['farm management', 'ಕೃಷಿ ನಿರ್ವಹಣೆ', 'खेत प्रबंधन'],
    allowedRoles: ['farmer'],
    label: { en: 'Farm Management', kn: 'ಕೃಷಿ ನಿರ್ವಹಣೆ', hi: 'खेत प्रबंधन', te: 'పొలం నిర్వహణ' },
    description: {
      en: 'You can manage climate, precision irrigation, and soil nutrients here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಹವಾಮಾನ, ನೀರಾವರಿ ಮತ್ತು ಮಣ್ಣಿನ ನಿರ್ವಹಣೆಯನ್ನು ನೋಡಬಹುದು.',
      hi: 'यहाँ आप मौसम, सिंचाई और मिट्टी प्रबंधन देख सकते हैं।',
      te: 'ఇక్కడ మీరు వాతావరణం, నీటిపారుదల మరియు నేల నిర్వహణ చూడవచ్చు.',
    },
  },
  {
    id: 'diagnostics',
    route: '/crop-health?section=diagnostics',
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
    id: 'surveillance',
    route: '/crop-health?section=surveillance',
    keywords: ['surveillance', 'crop health', 'camera', 'monitor', 'ಬೆಳೆ ಆರೋಗ್ಯ', 'फसल स्वास्थ्य'],
    allowedRoles: ['farmer'],
    label: { en: 'Crop Health & Surveillance', kn: 'ಬೆಳೆ ಆರೋಗ್ಯ ಮತ್ತು ಕಣ್ಗಾವಲು', hi: 'फसल स्वास्थ्य और निगरानी', te: 'పంట ఆరోగ్యం మరియు నిఘా' },
    description: {
      en: 'You can monitor live field surveillance and crop health here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಜಮೀನಿನ ಕಣ್ಗಾವಲು ಮತ್ತು ಬೆಳೆ ಆರೋಗ್ಯವನ್ನು ನೋಡಬಹುದು.',
      hi: 'यहाँ आप खेत की निगरानी और फसल स्वास्थ्य देख सकते हैं।',
      te: 'ఇక్కడ మీరు పొలం నిఘా మరియు పంట ఆరోగ్యాన్ని చూడవచ్చు.',
    },
  },
  {
    id: 'finance',
    route: '/finance-benefits?section=finance',
    keywords: ['finance', 'ledger', 'loan', 'profit', 'expense', 'ಹಣಕಾಸು', 'वित्त', 'ఆర్థిక'],
    allowedRoles: ['farmer'],
    label: { en: 'Farm Finance Ledger', kn: 'ಕೃಷಿ ಹಣಕಾಸು', hi: 'कृषि वित्त', te: 'వ్యవసాయ ఆర్థికం' },
    description: {
      en: 'You can track farm expenses, revenue, and loan readiness here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಕೃಷಿ ವೆಚ್ಚ ಮತ್ತು ಆದಾಯವನ್ನು ಪರಿಶೀಲಿಸಬಹುದು.',
      hi: 'यहाँ आप कृषि खर्च और आय की जांच कर सकते हैं।',
      te: 'ఇక్కడ మీరు వ్యవసాయ ఖర్చులు మరియు ఆదాయాన్ని చూడవచ్చు.',
    },
  },
  {
    id: 'schemes',
    route: '/finance-benefits?section=schemes',
    keywords: ['scheme', 'subsidy', 'government', 'pm-kisan', 'pmfby', 'ಯೋಜನೆ', 'योजना', 'పథకం'],
    allowedRoles: ['farmer'],
    label: { en: 'Government Schemes', kn: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು', hi: 'सरकारी योजनाएं', te: 'ప్రభుత్వ పథకాలు' },
    description: {
      en: 'You can check eligible government schemes and subsidies here.',
      kn: 'ಇಲ್ಲಿ ನೀವು ಅರ್ಹ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಮತ್ತು ಸಬ್ಸಿಡಿಗಳನ್ನು ನೋಡಬಹುದು.',
      hi: 'यहाँ आप पात्र सरकारी योजनाओं और सब्सिडी की जांच कर सकते हैं।',
      te: 'ఇక్కడ మీరు అర్హమైన ప్రభుత్వ పథకాలను చూడవచ్చు.',
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

export type WaterAvailabilityOption = 'Abundant' | 'Moderate' | 'Scarce';

export type AgenticTaskCommand =
  | {
      type: 'biointel_plan';
      crop: string;
      areaAcres: number | null;
      budgetInr: number | null;
      waterAvailability: WaterAvailabilityOption | null;
      openNurseries: boolean;
    }
  | {
      type: 'digital_farm_control';
      action: 'play' | 'pause' | 'resume' | 'summary';
    }
  | {
      type: 'labour_hire';
      workersCount: number;
      workType: string;
      workDate: string;
    }
  | {
      type: 'bidding_action';
      subAction: 'check_offers' | 'prepare_listing';
      crop?: string;
      quantityKg?: number;
      minPricePerKg?: number;
    }
  | {
      type: 'transport_action';
      subAction: 'find_vehicles' | 'prepare_booking';
      cargoWeightKg?: number;
      crop?: string;
    }
  | {
      type: 'finance_query';
      metric: 'expenditure' | 'profit' | 'remaining_budget' | 'labour_expenses' | 'outstanding_payments';
    };

const CROP_ALIASES: Array<{ canonical: string; terms: string[] }> = [
  { canonical: 'Tomato', terms: ['tomato', 'tomatoes', 'ಟೊಮೆಟೊ', 'टमाटर', 'టొమాటో'] },
  { canonical: 'Maize', terms: ['maize', 'corn', 'ಮೆಕ್ಕೆಜೋಳ', 'मक्का', 'మొక్కజొన్న'] },
  { canonical: 'Paddy', terms: ['paddy', 'rice', 'ಭತ್ತ', 'धान', 'వరి'] },
  { canonical: 'Wheat', terms: ['wheat', 'ಗೋಧಿ', 'गेहूं', 'గోధుమ'] },
  { canonical: 'Ragi', terms: ['ragi', 'millet', 'ರಾಗಿ', 'रागी', 'రాగి'] },
  { canonical: 'Groundnut', terms: ['groundnut', 'peanut', 'ಕಡಲೆಕಾಯಿ', 'मूंगफली', 'వేరుశెనగ'] },
  { canonical: 'Cotton', terms: ['cotton', 'ಹತ್ತಿ', 'कपास', 'పత్తి'] },
  { canonical: 'Sugarcane', terms: ['sugarcane', 'ಕಬ್ಬು', 'गन्ना', 'చెరకు'] },
  { canonical: 'Onion', terms: ['onion', 'ಈರುಳ್ಳಿ', 'प्याज', 'ఉల్లిపాయ'] },
  { canonical: 'Potato', terms: ['potato', 'ಆಲೂಗಡ್ಡೆ', 'आलू', 'బంగాళాదుంప'] },
  { canonical: 'Chilli', terms: ['chilli', 'chili', 'ಮೆಣಸಿನಕಾಯಿ', 'मिर्च', 'మిర్చి'] },
];

const SPOKEN_NUMBER_MAP: Record<string, number> = {
  // English digits & words
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000, lakh: 100000, lakhs: 100000, crore: 10000000,
  // Kannada words
  ಒಂದು: 1, ಎರಡು: 2, ಮೂರು: 3, ನಾಲ್ಕು: 4, ಐದು: 5, ಆರು: 6, ಏಳು: 7, ಎಂಟು: 8, ಒಂಬತ್ತು: 9, ಹತ್ತು: 10,
  ಇಪ್ಪತ್ತು: 20, ಮೂವತ್ತು: 30, ನಲವತ್ತು: 40, ಐವತ್ತು: 50, ಅರವತ್ತು: 60, ಎಪ್ಪತ್ತು: 70, ಎಂಬತ್ತು: 80, ತೊಂಬತ್ತು: 90,
  ನೂರು: 100, ಸಾವಿರ: 1000, ಲಕ್ಷ: 100000,
  // Hindi words
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, छह: 6, सात: 7, आठ: 8, नौ: 9, दस: 10,
  ग्यारह: 11, बारह: 12, बीस: 20, तीस: 30, चालीस: 40, पचास: 50, साठ: 60, सत्तर: 70, अस्सी: 80, नब्बे: 90,
  सौ: 100, हजार: 1000, हज़ार: 1000, लाख: 100000,
  // Telugu words
  ఒకటి: 1, రెండు: 2, మూడు: 3, నాలుగు: 4, ఐదు: 5, ఆరు: 6, ఏడు: 7, ఎనిమిది: 8, తొమ్మిది: 9, పది: 10,
  ఇరవై: 20, ముప్పై: 30, నలభై: 40, యాభై: 50, అరవై: 60, డెబ్బై: 70, ఎనభై: 80, తొంబై: 90,
  వంద: 100, వేలు: 1000, లక్ష: 100000,
};

export function extractAreaAcres(text: string): number | null {
  const q = text.toLowerCase();
  const digitMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:acre|acres|ac|ಎಕರೆ|एकड़|ఎకరాల|ఎకరం)/i);
  if (digitMatch) return Number(digitMatch[1]);

  for (const [word, val] of Object.entries(SPOKEN_NUMBER_MAP)) {
    if (val <= 50) {
      const pattern = new RegExp(`\\b${word}\\s*(?:acre|acres|ac|ಎಕರೆ|एकड़|ఎకరಾಲ|ఎకరం)`, 'i');
      if (pattern.test(q)) return val;
    }
  }
  return null;
}

export function extractBudgetInr(text: string): number | null {
  const q = text.toLowerCase();
  const multipliers = [
    { multiplier: 1000, words: ['thousand', 'k', 'ಸಾವಿರ', 'हजार', 'हज़ार', 'వేలు', 'వేల'] },
    { multiplier: 100000, words: ['lakh', 'lakhs', 'ಲಕ್ಷ', 'लाख', 'లక్ష'] },
  ];

  for (const group of multipliers) {
    for (const w of group.words) {
      const numMatch = q.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${w}\\b`, 'i'));
      if (numMatch) return Math.round(Number(numMatch[1]) * group.multiplier);

      for (const [numWord, val] of Object.entries(SPOKEN_NUMBER_MAP)) {
        if (val < group.multiplier) {
          const comboPattern = new RegExp(`\\b${numWord}\\s*${w}\\b`, 'i');
          if (comboPattern.test(q)) {
            return val * group.multiplier;
          }
        }
      }
    }
  }

  const rawBudgetMatch = q.match(/(?:budget|rs\.?|inr|₹)?\s*(\d[\d,]{2,})\s*(?:rs|inr|rupees|budget|ರೂಪಾಯಿ|रुपये|రూపాయలు)?/i);
  if (rawBudgetMatch) {
    return Number(rawBudgetMatch[1].replace(/,/g, ''));
  }

  for (const [word, val] of Object.entries(SPOKEN_NUMBER_MAP)) {
    if (val >= 1000) {
      if (new RegExp(`(?:budget|of)\\s*${word}`, 'i').test(q)) return val;
    }
  }

  return null;
}

export function extractWorkersCount(text: string): number {
  const q = text.toLowerCase();
  const countMatch = q.match(/(\d+)\s*(?:worker|workers|labour|labor|people|men|women|ಕಾರ್ಮಿಕ|श्रमिक|కూలీ)/i);
  if (countMatch) return Math.max(1, Math.min(100, Number(countMatch[1])));

  for (const [word, val] of Object.entries(SPOKEN_NUMBER_MAP)) {
    if (val <= 20) {
      const pattern = new RegExp(`\\b${word}\\s*(?:worker|workers|labour|labor|people|men|women|ಕಾರ್ಮಿಕ|श्रमिक|కూలీ)`, 'i');
      if (pattern.test(q)) return val;
    }
  }
  return 2;
}

export function extractCropFromText(query: string): string | null {
  const q = query.toLowerCase();
  for (const entry of CROP_ALIASES) {
    if (entry.terms.some((t) => q.includes(t))) return entry.canonical;
  }
  return null;
}

export function extractWaterAvailability(query: string): WaterAvailabilityOption | null {
  const q = query.toLowerCase();
  if (['abundant', 'plenty', 'high water', 'canal', 'flood', 'ಹೆಚ್ಚು', 'अधिक', 'ఎక్కువ'].some((w) => q.includes(w))) {
    return 'Abundant';
  }
  if (['scarce', 'low water', 'less water', 'rainfed', 'ಕಡಿಮೆ', 'कम', 'తక్కువ'].some((w) => q.includes(w))) {
    return 'Scarce';
  }
  if (['moderate', 'medium', 'drip', 'borewell', 'ಮಧ್ಯಮ', 'मध्यम', 'మధ్యస్థం'].some((w) => q.includes(w))) {
    return 'Moderate';
  }
  return null;
}

export function parseConfirmationReply(query: string): boolean | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  if (/^(yes|yeah|yep|confirm|proceed|ok|okay|publish|submit|book|post|ಹೌದು|ಸರಿ|हाँ|ठीक है|అవును)\b/i.test(q)) {
    return true;
  }
  if (/^(no|nope|cancel|stop|abort|don't|do not|ಬೇಡ|रद्द|नहीं|వద్దు)\b/i.test(q)) {
    return false;
  }
  return null;
}

function resolveRelativeDate(query: string): string {
  const d = new Date();
  if (/\b(tomorrow|ನಾಳೆ|कल|రేపు)\b/i.test(query)) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

export function parseAgenticTaskCommand(query: string): AgenticTaskCommand | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // 1. Digital Farm simulation controls
  const hasSimContext = /(simulation|digital farm|crop growth|harvest summary|growth)/i.test(q);
  if (hasSimContext || /^(play|pause|resume|explain harvest)/i.test(q)) {
    if (/\b(pause|stop)\b/i.test(q)) return { type: 'digital_farm_control', action: 'pause' };
    if (/\b(resume|continue)\b/i.test(q)) return { type: 'digital_farm_control', action: 'resume' };
    if (/\b(explain|summary|harvest|report)\b/i.test(q)) return { type: 'digital_farm_control', action: 'summary' };
    if (/\b(start|play|run)\b/i.test(q)) return { type: 'digital_farm_control', action: 'play' };
  }

  // 2. Labour hiring draft
  if (/(hire|book|find|post).*(worker|workers|labour|labor|ಕಾರ್ಮಿಕ|श्रमिक|ಕೂಲೀ)/i.test(q)) {
    const workersCount = extractWorkersCount(q);
    let workType = 'Harvesting';
    if (/weed/i.test(q)) workType = 'Weeding';
    else if (/plant|sow|transplant/i.test(q)) workType = 'Planting';
    else if (/irrigat|water/i.test(q)) workType = 'Irrigation';
    else if (/spray|fertiliz/i.test(q)) workType = 'Spraying';
    else if (/plough|land/i.test(q)) workType = 'Land Preparation';
    return {
      type: 'labour_hire',
      workersCount,
      workType,
      workDate: resolveRelativeDate(q),
    };
  }

  // 3. Smart Bidding offers / listing
  if (/(check|show|any|list).*(bid|bids|offer|offers|buyer)/i.test(q)) {
    return { type: 'bidding_action', subAction: 'check_offers' };
  }
  const sellMatch = q.match(/(?:sell|list|auction)\s+(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilogram|quintal)?/i);
  if (sellMatch && (extractCropFromText(q) || /bid|market|lot/i.test(q))) {
    const priceMatch = q.match(/(?:at|for|min|minimum|₹|rs\.?)\s*(\d+(?:\.\d+)?)/i);
    return {
      type: 'bidding_action',
      subAction: 'prepare_listing',
      crop: extractCropFromText(q) || 'Tomato',
      quantityKg: Number(sellMatch[1]),
      minPricePerKg: priceMatch ? Number(priceMatch[1]) : 25,
    };
  }

  // 4. Transport Connect lookup / booking
  if (/(find|book|check|need).*(transport|truck|vehicle|tempo|tractor|ಸಾರಿಗೆ|वाहन)/i.test(q)) {
    const weightMatch = q.match(/(\d+(?:\.\d+)?)\s*(?:kg|ton|tons|quintal)/i);
    const cargoWeightKg = weightMatch ? Number(weightMatch[1]) : undefined;
    return {
      type: 'transport_action',
      subAction: cargoWeightKg ? 'prepare_booking' : 'find_vehicles',
      cargoWeightKg,
      crop: extractCropFromText(q) || undefined,
    };
  }

  // 5. Financial Intelligence live queries (AD-24)
  if (/(outstanding|unpaid|due).*(buyer|payment|payments|order)/i.test(q)) {
    return { type: 'finance_query', metric: 'outstanding_payments' };
  }
  if (/(labour|labor)\s*(expense|expenses|cost|spending|wages)/i.test(q)) {
    return { type: 'finance_query', metric: 'labour_expenses' };
  }
  if (/(remaining|left|available)\s*(budget|balance)/i.test(q)) {
    return { type: 'finance_query', metric: 'remaining_budget' };
  }
  if (/(total\s*(expenditure|expense|expenses|spent|spending)|how much.*spent)/i.test(q)) {
    return { type: 'finance_query', metric: 'expenditure' };
  }
  if (/(how much\s*profit|net\s*profit|profit.*earned|my\s*profit)/i.test(q)) {
    return { type: 'finance_query', metric: 'profit' };
  }

  // 6. BioIntel seed/crop planning
  const crop = extractCropFromText(q);
  const areaAcres = extractAreaAcres(q);
  const budgetInr = extractBudgetInr(q);
  const waterAvailability = extractWaterAvailability(q);
  const isPlanningIntent = /(plan|cultivat|seed|invest|calculate|recommend|grow|biointel|ಬೆಳೆ|ಸಾಕು|ಬೆಳೆಯಲು)/i.test(q);
  const openNurseries = /(nurser|seedling|sapling|buy seed|nearby|ನರ್ಸರಿ|नर्सरी)/i.test(q);

  if ((crop && (areaAcres !== null || budgetInr !== null || isPlanningIntent)) || (isPlanningIntent && (areaAcres !== null || budgetInr !== null))) {
    return {
      type: 'biointel_plan',
      crop: crop || 'Tomato',
      areaAcres,
      budgetInr,
      waterAvailability,
      openNurseries,
    };
  }

  return null;
}
