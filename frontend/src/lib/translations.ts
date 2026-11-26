// frontend/src/lib/translations.ts
import { Language } from '@/types';
import { NAV_AUTH_ENTRIES, QuadEntry } from './i18n/navAuth';
import { MODULES_A_ENTRIES } from './i18n/modulesA';
import { MODULES_B_ENTRIES } from './i18n/modulesB';

export * from './i18n/types';
export * from './i18n/dynamicTerms';
export * from './i18n/biointelAndRecs';

export const ALL_ENTRIES: Record<string, QuadEntry> = {
  ...NAV_AUTH_ENTRIES,
  ...MODULES_A_ENTRIES,
  ...MODULES_B_ENTRIES,
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
