import { z } from 'zod';

/** Connexion : numéro de téléphone + clé d'identification à 3 chiffres. */
export const PHONE_RE = /^\+?[0-9]{6,15}$/;
export const KEY_RE = /^[0-9]{3}$/;

/** Retire les espaces, points, tirets et parenthèses d'un numéro saisi. */
export const compactPhone = (s: string) => s.replace(/[\s.\-()]/g, '');

export const loginSchema = z.object({
  phone: z.string().transform(compactPhone).pipe(z.string().regex(PHONE_RE, 'v.phone')),
  key: z.string().trim().regex(KEY_RE, 'v.key'),
});
