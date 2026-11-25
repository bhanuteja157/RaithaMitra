// frontend/src/lib/i18n/types.ts
import { Language } from '@/types';

export type LocalizedRecord<K extends string = string> = Record<Language, Record<K, string>>;

export const LANGUAGE_OPTIONS: Array<{
  code: Language;
  nativeLabel: string;
  englishName: string;
  locale: string;
}> = [
  { code: 'en', nativeLabel: 'English', englishName: 'English', locale: 'en-IN' },
  { code: 'kn', nativeLabel: 'ಕನ್ನಡ', englishName: 'Kannada', locale: 'kn-IN' },
  { code: 'hi', nativeLabel: 'हिन्दी', englishName: 'Hindi', locale: 'hi-IN' },
  { code: 'te', nativeLabel: 'తెలుగు', englishName: 'Telugu', locale: 'te-IN' },
];

export function getIntlLocale(lang: Language): string {
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
