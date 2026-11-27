import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES, dictionaries } from '@/lib/i18n/shared';

// Tests statiques (sans navigateur ni base) : sécurité du code, traductions et ressources.
const root = new URL('..', import.meta.url).pathname;
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const srcFiles = walk(join(root, 'src')).filter((f) => /\.(ts|tsx)$/.test(f));
const source = srcFiles.map((f) => [relative(root, f), readFileSync(f, 'utf8')] as const);
const SERVICE_FILE = 'src/lib/supabase/admin.ts';

describe('sécurité du code', () => {
  it('n’injecte jamais de HTML brut', () => {
    for (const [f, s] of source) expect(s, f).not.toMatch(/dangerouslySetInnerHTML|innerHTML\s*=/);
  });
  it('la clé secrète (service_role) n’est lue que dans un seul fichier serveur', () => {
    for (const [f, s] of source.filter(([f]) => f !== SERVICE_FILE)) {
      expect(s, f).not.toMatch(/service_role|SERVICE_ROLE/i);
      expect(s, f).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\./); // jeton JWT en dur
    }
    expect(readFileSync(join(root, SERVICE_FILE), 'utf8')).not.toMatch(/NEXT_PUBLIC_[A-Z_]*SERVICE/);
  });
  it('aucun composant client n’importe le client « service »', () => {
    for (const [f, s] of source) {
      if (/^\s*['"]use client['"]/.test(s)) expect(s, f).not.toMatch(/supabase\/admin|createServiceClient/);
    }
  });
  it('le secret des comptes n’est utilisé que par l’action de connexion', () => {
    for (const [f, s] of source.filter(([f]) => f !== 'src/lib/actions/auth.ts')) expect(s, f).not.toMatch(/ACCOUNT_PASSWORD_SECRET/);
  });
  it('ne stocke aucun jeton dans le navigateur', () => {
    for (const [f, s] of source) expect(s, f).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
  });
  it('vérifie l’utilisateur avec getUser (jamais getSession) côté serveur', () => {
    for (const [f, s] of source) expect(s, f).not.toMatch(/auth\.getSession\(/);
  });
  it('n’affiche aucun champ de carte bancaire', () => {
    for (const [f, s] of source.filter(([f]) => !f.includes('dictionaries'))) expect(s, f).not.toMatch(/\bcvv\b|card[_ -]?number|numéro de carte|\biban\b/i);
  });
  it('les redirections ?next passent par safeNext', () => {
    const login = readFileSync(join(root, 'src/lib/actions/auth.ts'), 'utf8');
    expect(login).toContain("safeNext(formString(formData, 'next'))");
  });
  it('seules /espace et /apply sont protégées par le middleware', () => {
    expect(readFileSync(join(root, 'src/middleware.ts'), 'utf8')).toContain("const PROTECTED = ['/espace', '/apply'];");
  });
});

describe('parcours simplifié', () => {
  it('les pages supprimées n’existent plus (accueil, inscription, mentions légales, tableau de bord, profil)', () => {
    for (const p of ['src/app/(site)', 'src/app/(auth)/register', 'src/app/(auth)/forgot-password', 'src/app/(app)/dashboard', 'src/app/(app)/profile', 'src/app/auth']) {
      expect(existsSync(join(root, p)), p).toBe(false);
    }
  });
  it('les pages conservées existent', () => {
    for (const p of ['src/app/(auth)/login/page.tsx', 'src/app/(app)/espace/page.tsx', 'src/app/(app)/apply/page.tsx', 'src/app/page.tsx']) {
      expect(existsSync(join(root, p)), p).toBe(true);
    }
  });
  it('il n’y a plus de bandeau « projet universitaire » ni de lien vers les mentions légales ou l’inscription', () => {
    for (const [f, s] of source.filter(([f]) => !f.includes('dictionaries'))) {
      expect(s, f).not.toMatch(/DemoBanner|href="\/legal"|href="\/register"|\/dashboard/);
    }
  });
  it('le formulaire n’a plus de motif ni de récapitulatif', () => {
    const wizard = readFileSync(join(root, 'src/components/loan/LoanWizard.tsx'), 'utf8');
    expect(wizard).not.toMatch(/purpose|apply\.s3|apply\.t3/i);
    expect(wizard).toContain('const STEPS = 2;');
  });
});

describe('traductions', () => {
  it('toutes les clés utilisées littéralement dans le code existent dans les 5 langues', () => {
    const used = new Set<string>();
    for (const [, s] of source) for (const m of s.matchAll(/\bt\(\s*'([a-z0-9_.]+)'/g)) used.add(m[1]);
    for (const l of LOCALES) for (const k of used) expect(dictionaries[l][k], `clé manquante (${l}) : ${k}`).toBeTruthy();
    expect(used.size).toBeGreaterThan(60);
  });
  it('les clés dynamiques (étapes, tentatives) existent', () => {
    for (const l of LOCALES) {
      for (let i = 1; i <= 2; i++) { expect(dictionaries[l][`apply.s${i}`]).toBeTruthy(); expect(dictionaries[l][`apply.t${i}`]).toBeTruthy(); }
      expect(dictionaries[l]['apply.s3']).toBeUndefined(); // plus de récapitulatif
      for (const k of ['contact', 'bank', 'card', 'verif']) expect(dictionaries[l][`apply.sec.${k}`]).toBeTruthy();
      expect(dictionaries[l]['apply.sec.purpose']).toBeUndefined(); // plus de motif
      expect(dictionaries[l]['proc.attempts.one']).toBeTruthy();
      expect(dictionaries[l]['proc.attempts.other']).toBeTruthy();
    }
  });
});

describe('ressources', () => {
  it('le logo FOM et l’icône existent', () => {
    for (const f of ['logo-fom.png', 'logo-icon.png']) expect(existsSync(join(root, 'public/images', f)), f).toBe(true);
    expect(existsSync(join(root, 'src/app/icon.png'))).toBe(true);
  });
});
