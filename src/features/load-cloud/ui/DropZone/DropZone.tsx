import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BINARY_EXTENSION, isBinaryCloudFile } from '@/entities/point-cloud';

import styles from './DropZone.module.scss';

interface DropZoneProps {
  onFile: (file: File) => void;
}

export function DropZone({ onFile }: DropZoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  const accept = (file: File | undefined) => {
    if (!file) return;
    if (!isBinaryCloudFile(file)) {
      setRejected(file.name);
      return;
    }
    setRejected(null);
    onFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsOver(false);
    accept(event.dataTransfer.files[0]);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsOver(true);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    accept(event.target.files?.[0]);

    event.target.value = '';
  };

  return (
    <div
      className={`${styles.zone} ${isOver ? styles.over : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
    >
      <span className={styles.title}>{t('source.ownTitle')}</span>
      <span className={styles.hint}>{t('source.ownHint')}</span>
      <span className={styles.accepted}>
        {t('source.accepted', { extension: BINARY_EXTENSION })}
      </span>
      {rejected !== null && (
        <span className={styles.rejected}>
          {t('source.rejected', { name: rejected, extension: BINARY_EXTENSION })}
        </span>
      )}
      <input
        ref={inputRef}
        className={styles.input}
        type="file"
        accept={BINARY_EXTENSION}
        aria-label={t('source.choose')}
        onChange={handleChange}
      />
      <button type="button" className={styles.button} onClick={() => inputRef.current?.click()}>
        {t('source.choose')}
      </button>
    </div>
  );
}
