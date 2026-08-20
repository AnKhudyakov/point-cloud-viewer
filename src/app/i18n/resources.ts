import { DEFAULT_NAMESPACE } from '@/shared/config/i18n';

import en from './locales/en.json';
import ru from './locales/ru.json';

export const resources = {
  en: { [DEFAULT_NAMESPACE]: en },
  ru: { [DEFAULT_NAMESPACE]: ru },
} as const;
