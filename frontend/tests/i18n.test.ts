import { describe, expect, it } from 'vitest';
import { BACKEND_ERROR_CODES } from '@/lib/errors';
import { LOCALES, createT, dictionaries, pickLocaleFromHeader } from '@/lib/i18n/shared';

describe('internationalisation', () => {
  it('propose 5 langues : français, anglais, espagnol, allemand, portugais', () => {
    expect([...LOCALES]).toEqual(['fr', 'en', 'es', 'de', 'pt']);
  });
  it('toutes les langues ont exactement les mêmes clés que le français', () => {
    const ref = Object.keys(dictionaries.fr).sort();
    for (const l of LOCALES) expect(Object.keys(dictionaries[l]).sort(), l).toEqual(ref);
  });
  it('aucune traduction n’est vide et les paramètres {…} sont conservés', () => {
    for (const l of LOCALES) {
      for (const [k, v] of Object.entries(dictionaries[l])) {
        expect(v.trim(), `${l}.${k}`).not.toBe('');
        const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        expect(params(v), `${l}.${k}`).toEqual(params(dictionaries.fr[k]));
      }
    }
  });
  it('traduit tous les codes d’erreur du backend dans toutes les langues', () => {
    for (const l of LOCALES) for (const code of BACKEND_ERROR_CODES) expect(dictionaries[l][`err.${code}`], `${l}.${code}`).toBeTruthy();
  });
  it('étiquette comme fictifs les champs de démonstration', () => {
    const mark = { fr: '(fictif)', en: '(fictional)', es: '(ficticio)', de: '(fiktiv)', pt: '(fictício)' } as const;
    for (const l of LOCALES) {
      for (const k of ['apply.demo.color', 'apply.demo.year', 'apply.demo.digit', 'apply.demo.fruit', 'apply.demo.animal']) {
        expect(dictionaries[l][k], `${l}.${k}`).toContain(mark[l]);
      }
    }
  });
  it('contient les textes demandés de la page de connexion et de l’espace (FR)', () => {
    expect(dictionaries.fr['brand.tagline']).toBe('Faire vos demandes en outre-mer');
    expect(dictionaries.fr['login.title']).toBe('Accéder à mon compte');
    expect(dictionaries.fr['login.submit']).toBe('Ouvrir une session');
    expect(dictionaries.fr['espace.welcome']).toBe('Bienvenue dans votre espace');
    expect(dictionaries.fr['espace.balance']).toBe('Solde disponible');
    expect(dictionaries.fr['espace.updated']).toBe('Dernière mise à jour : aujourd’hui');
    expect(dictionaries.fr['espace.cta']).toBe('Effectuer une demande');
    expect(dictionaries.fr['espace.ctaHint']).toBe('Cliquer ici pour effectuer votre demande');
    expect(dictionaries.fr['proc.failed.title']).toBe('Échec');
  });
  it('détecte la langue du navigateur parmi les 5 langues', () => {
    expect(pickLocaleFromHeader('fr-FR,fr;q=0.9,en;q=0.8')).toBe('fr');
    expect(pickLocaleFromHeader('en-US,en;q=0.9')).toBe('en');
    expect(pickLocaleFromHeader('es-ES,es;q=0.9')).toBe('es');
    expect(pickLocaleFromHeader('de-DE,de;q=0.9,en;q=0.5')).toBe('de');
    expect(pickLocaleFromHeader('pt-BR,pt;q=0.9')).toBe('pt');
    expect(pickLocaleFromHeader('ja-JP')).toBe('fr');
    expect(pickLocaleFromHeader(null)).toBe('fr');
  });
  it('interpole les paramètres et accorde le pluriel des tentatives', () => {
    expect(createT('fr')('apply.stepOf', { current: 2, total: 2 })).toBe('Étape 2/2');
    expect(createT('fr')('proc.attempts.other', { count: 2 })).toBe('2 tentatives restantes');
    expect(createT('fr')('proc.attempts.one', { count: 1 })).toBe('1 tentative restante');
    expect(createT('es')('proc.attempts.other', { count: 2 })).toBe('Quedan 2 intentos');
  });
});
