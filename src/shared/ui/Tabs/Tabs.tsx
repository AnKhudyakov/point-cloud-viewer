import { type KeyboardEvent, useRef } from 'react';

import styles from './Tabs.module.scss';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  items: readonly TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  label: string;
  idPrefix: string;
}

export function Tabs({ items, activeId, onSelect, label, idPrefix }: TabsProps) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const available = items.filter((item) => item.disabled !== true);

  const focusAndSelect = (id: string) => {
    buttons.current.get(id)?.focus();
    onSelect(id);
  };

  const move = (offset: number) => {
    const index = available.findIndex((item) => item.id === activeId);
    if (index === -1 || available.length === 0) return;
    const next = available[(index + offset + available.length) % available.length];
    focusAndSelect(next.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        move(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        move(-1);
        break;
      case 'Home': {
        event.preventDefault();
        const first = available[0];
        if (first) focusAndSelect(first.id);
        break;
      }
      case 'End': {
        event.preventDefault();
        const last = available.at(-1);
        if (last) focusAndSelect(last.id);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            ref={(node) => {
              if (node) {
                buttons.current.set(item.id, node);
              } else {
                buttons.current.delete(item.id);
              }
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.id}`}
            aria-selected={isActive}
            aria-controls={`${idPrefix}-panel-${item.id}`}
            tabIndex={isActive ? 0 : -1}
            disabled={item.disabled === true}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            onClick={() => onSelect(item.id)}
            onKeyDown={handleKeyDown}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
