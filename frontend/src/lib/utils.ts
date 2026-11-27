import { INTL_LOCALES, isLocale } from '@/lib/i18n/shared';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Param = string | string[] | undefined;
export const one = (v: Param): string | undefined => (Array.isArray(v) ? v[0] : v);

/** Empêche les redirections ouvertes (?next=https://site-malveillant). */
export function safeNext(value: string | null | undefined, fallback = '/espace'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}

export function formString(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
}

const intl = (locale: string) => (isLocale(locale) ? INTL_LOCALES[locale] : INTL_LOCALES.fr);

export function formatMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(intl(locale), { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** Date longue (ex. « jeudi 26 novembre 2026 »), dans la langue choisie et le fuseau de l'appareil. */
export function formatLongDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(intl(locale), { dateStyle: 'full' }).format(date);
}

/** Champ « Numéro » : 27 caractères au plus (lettres et chiffres, en majuscules), affichés par groupes de 4 : « XXXX XXXX … ». */
export const CODE_LENGTH = 27;
export function formatCode(input: string): string {
  const compact = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, CODE_LENGTH);
  return compact.replace(/(.{4})(?=.)/g, '$1 ');
}

/** Chiffres uniquement, 16 maximum, regroupés par 4 : « 0000 0000 0000 0000 ». */
export const DIGIT_GROUPS_MAX = 16;
export function formatDigitGroups(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, DIGIT_GROUPS_MAX);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}
