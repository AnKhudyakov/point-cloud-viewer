export const SUPPORTED_LANGUAGES = ['en', 'ru'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const FALLBACK_LANGUAGE: Language = 'en';

export const DEFAULT_NAMESPACE = 'translation';

export const LANGUAGE_STORAGE_KEY = 'pcv.language';

export function isLanguage(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
