import type { ReactNode } from 'react';

import styles from './PageFrame.module.scss';

export interface PageFrameProps {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

export function PageFrame({ header, footer, children }: PageFrameProps) {
  return (
    <div className={styles.shell}>
      {header}
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>{footer}</footer>
    </div>
  );
}
