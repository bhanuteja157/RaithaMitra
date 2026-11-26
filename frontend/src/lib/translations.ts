// frontend/src/lib/translations.ts
import { Language } from '@/types';
import { NAV_AUTH_ENTRIES, QuadEntry } from './i18n/navAuth';
import { MODULES_A_ENTRIES } from './i18n/modulesA';
import { MODULES_B_ENTRIES } from './i18n/modulesB';

export * from './i18n/types';
export * from './i18n/dynamicTerms';
export * from './i18n/biointelAndRecs';

const EXTRA_COMPAT_ENTRIES: Record<string, QuadEntry> = {
  overview: { en: 'OVERVIEW', kn: 'ಅವಲೋಕನ', hi: 'अवलोकन', te: 'అవలోకనం' },
  flagshipGroup: { en: 'FLAGSHIP INNOVATIONS', kn: 'ಪ್ರಮುಖ ಸೌಲಭ್ಯಗಳು', hi: 'प्रमुख विशेषताएं', te: 'ప్రధాన సేవలు' },
  precisionAg: { en: 'PRECISION AGRICULTURE', kn: 'ನಿಖರ ಕೃಷಿ', hi: 'सटीक कृषि', te: 'ఖచ్చితమైన వ్యవసాయం' },
  economicIntel: { en: 'ECONOMIC INTELLIGENCE', kn: 'ಆರ್ಥಿಕ ಬುದ್ಧಿವಂತಿಕೆ', hi: 'आर्थिक बुद्धिमत्ता', te: 'ఆర్థిక సమాచారం' },
  community: { en: 'COMMUNITY', kn: 'ಸಮುದಾಯ', hi: 'समुदाय', te: 'సంఘం' },
  aiIntel: { en: 'AI INTELLIGENCE', kn: 'AI ಬುದ್ಧಿವಂತಿಕೆ', hi: 'कृत्रिम बुद्धिमत्ता', te: 'AI మేధస్సు' },
  operationalStatus: { en: 'Operational', kn: 'ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿದೆ', hi: 'सक्रिय', te: 'అమలులో ఉంది' },
  prototypeStatus: { en: 'Prototype', kn: 'ಮಾದರಿ', hi: 'प्रोटोटाइप', te: 'నమూనా' },
  plannedStatus: { en: 'Planned Feature', kn: 'ಯೋಜಿತ ಸೌಲಭ್ಯ', hi: 'प्रस्तावित सुविधा', te: 'ప్రణాళికా సౌకర్యం' },
  switchRole: { en: 'Switch Role', kn: 'ಪಾತ್ರ ಬದಲಾಯಿಸಿ', hi: 'भूमिका बदलें', te: 'పాత్ర మార్చండి' },
  demoSwitch: { en: 'Demo Persona', kn: 'ಡೆಮೊ ಖಾತೆ', hi: 'डेमो खाता चयन', te: 'డెమో ఖాతా' },
  navJourney: { en: 'Seed-to-Sale Journey', kn: 'ಬಿತ್ತನೆಯಿಂದ ಮಾರಾಟದವರೆಗೆ', hi: 'बीज से बिक्री यात्रा', te: 'విత్తనం నుండి అమ్మకం వరకు' },
  badgeLifecycle: { en: 'Lifecycle', kn: 'ಜೀವನಚಕ್ರ', hi: 'जीवनचक्र', te: 'జీవనచక్రం' },
  en: { en: 'English', kn: 'English', hi: 'English', te: 'English' },
  kn: { en: 'ಕನ್ನಡ', kn: 'ಕನ್ನಡ', hi: 'ಕನ್ನಡ', te: 'ಕನ್ನಡ' },
  hi: { en: 'हिन्दी', kn: 'हिन्दी', hi: 'हिन्दी', te: 'हिन्दी' },
  te: { en: 'తెలుగు', kn: 'తెలుగు', hi: 'తెలుగు', te: 'తెలుగు' },
};

export const ALL_ENTRIES: Record<string, QuadEntry> = {
  ...NAV_AUTH_ENTRIES,
  ...MODULES_A_ENTRIES,
  ...MODULES_B_ENTRIES,
  ...EXTRA_COMPAT_ENTRIES,
};

function buildTranslations(): Record<Language, Record<string, string>> {
  const result: Record<Language, Record<string, string>> = {
    en: {},
    kn: {},
    hi: {},
    te: {},
  };
  for (const [key, entry] of Object.entries(ALL_ENTRIES)) {
    result.en[key] = entry.en;
    result.kn[key] = entry.kn;
    result.hi[key] = entry.hi;
    result.te[key] = entry.te;
  }
  return result;
}

export const TRANSLATIONS: Record<Language, Record<string, string>> = buildTranslations();

export function translateKey(
  lang: Language,
  key: string,
  vars?: Record<string, string | number>
): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  let template = dict[key] || TRANSLATIONS.en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      template = template.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }
  return template;
}
