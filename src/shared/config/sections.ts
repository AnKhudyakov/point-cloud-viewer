export const SECTIONS = ['preview', 'source'] as const;

export type Section = (typeof SECTIONS)[number];
