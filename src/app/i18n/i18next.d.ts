import type { DEFAULT_NAMESPACE } from '@/shared/config/i18n';

import type { resources } from './resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE;
    resources: (typeof resources)['en'];
  }
}
