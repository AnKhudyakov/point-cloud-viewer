import { useTranslation } from 'react-i18next';

import { type Language, SUPPORTED_LANGUAGES } from '@/shared/config/i18n';

import styles from './LanguageSwitch.module.scss';

const LANGUAGE_KEY = {
  en: 'language.en',
  ru: 'language.ru',
} as const satisfies Record<Language, string>;

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage;

  const select = (language: Language) => {
    void i18n.changeLanguage(language);
  };

  return (
    <div className={styles.group} role="group" aria-label={t('language.label')}>
      {SUPPORTED_LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          className={`${styles.button} ${language === current ? styles.active : ''}`}
          aria-pressed={language === current}
          title={t(LANGUAGE_KEY[language])}
          onClick={() => select(language)}
        >
          {language}
        </button>
      ))}
    </div>
  );
}
