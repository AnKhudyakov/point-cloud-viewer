import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { LanguageSwitch } from '@/features/switch-language';

import styles from './AppHeader.module.scss';

interface AppHeaderProps {
  nav: ReactNode;
}

export function AppHeader({ nav }: AppHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <h1 className={styles.title}>{t('app.title')}</h1>
        <span className={styles.tagline}>{t('app.tagline')}</span>
      </div>
      <nav className={styles.nav}>{nav}</nav>
      <span className={styles.spacer} />
      <div className={styles.trailing}>
        <LanguageSwitch />
      </div>
    </header>
  );
}
