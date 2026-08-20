export const SECTIONS = ['source', 'preview'] as const;

export type Section = (typeof SECTIONS)[number];
