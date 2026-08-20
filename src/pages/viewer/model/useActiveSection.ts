import { useState } from 'react';

import type { Section } from '@/shared/config/sections';

interface ActiveSection {
  section: Section;
  select: (section: Section) => void;
}

export function useActiveSection(loadKey: string, isLoadFinished: boolean): ActiveSection {
  const [choice, setChoice] = useState<{ key: string; section: Section } | null>(null);

  const section: Section =
    choice?.key === loadKey ? choice.section : isLoadFinished ? 'preview' : 'source';

  return {
    section,
    select: (next) => setChoice({ key: loadKey, section: next }),
  };
}
