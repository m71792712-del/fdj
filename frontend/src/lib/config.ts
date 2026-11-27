export const APP_NAME = 'FOM';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** Nombre total de demandes (tentatives) autorisées par compte. */
export const MAX_ATTEMPTS = 3;

// Animation de traitement : 1 % -> 81 % (rapide) puis 81 % -> 94 % (lent), ~8 s.
export const SIMULATION = { totalMs: 8000, phase1EndMs: 4500, start: 1, mid: 81, end: 94 } as const;
