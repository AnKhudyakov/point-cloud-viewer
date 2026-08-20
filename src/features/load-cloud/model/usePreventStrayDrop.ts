import { useEffect } from 'react';

export function usePreventStrayDrop(): void {
  useEffect(() => {
    const swallow = (event: DragEvent) => {
      event.preventDefault();
    };

    window.addEventListener('dragover', swallow);
    window.addEventListener('drop', swallow);

    return () => {
      window.removeEventListener('dragover', swallow);
      window.removeEventListener('drop', swallow);
    };
  }, []);
}
