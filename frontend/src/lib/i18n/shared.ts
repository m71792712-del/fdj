import { de } from './dictionaries/de';
import { en } from './dictionaries/en';
import { es } from './dictionaries/es';
import { fr } from './dictionaries/fr';
import { pt } from './dictionaries/pt';

export const LOCALES = ['fr', 'en', 'es', 'de', 'pt'] as const; // Ajouter une langue : dictionaries/xx.ts puis l'ajouter ici.
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';
export const LOCALE_COOKIE = 'locale';
/** Nom de chaque langue dans sa propre langue (affiché dans le sélecteur). */
export const LOCALE_NAMES: Record<Locale, string> = { fr: 'Français', en: 'English', es: 'Español', de: 'Deutsch', pt: 'Português' };
/** Locale Intl utilisée pour les dates et les montants. */
export const INTL_LOCALES: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', de: 'de-DE', pt: 'pt-PT' };

export type Dictionary = Record<string, string>;
export const dictionaries: Record<Locale, Dictionary> = { fr, en, es, de, pt };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Langue du navigateur depuis Accept-Language (ex. « fr-FR,fr;q=0.9,en;q=0.8 »). */
export function pickLocaleFromHeader(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const tags = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { lang: tag.toLowerCase().split('-')[0], q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { lang } of tags) if (isLocale(lang)) return lang;
  return DEFAULT_LOCALE;
}

export function createT(locale: Locale) {
  const dict = dictionaries[locale];
  return (key: string, params?: Record<string, string | number>): string => {
    const text = dict[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
    const all = { ...params };
    return text.replace(/\{(\w+)\}/g, (_, name: string) => String(all[name] ?? `{${name}}`));
  };
}

export type TFunction = ReturnType<typeof createT>;
