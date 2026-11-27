import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Tests statiques : s'exécutent sans base de données (npm run test:static).
const root = new URL('../supabase/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), 'utf8');
const migrations = readdirSync(new URL('migrations/', root)).filter((f) => f.endsWith('.sql')).sort();
const allMigrations = migrations.map((f) => read(`migrations/${f}`)).join('\n');
const seed = read('seed.sql');
const stripComments = (sql: string) => sql.replace(/--.*$/gm, '');
const code = stripComments(allMigrations);

describe('migrations', () => {
  it('sont numérotées et ordonnées', () => {
    expect(migrations).toHaveLength(5);
    expect([...migrations].sort()).toEqual(migrations);
  });

  it('activent la RLS sur chaque table du schéma public', () => {
    const tables = [...code.matchAll(/create table (?:if not exists )?public\.(\w+)/g)].map((m) => m[1]);
    expect(tables.length).toBeGreaterThanOrEqual(12);
    expect(tables).toContain('access_keys');
    for (const t of tables) {
      expect(code, `RLS manquante sur ${t}`).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`));
    }
  });

  it('fixent search_path sur TOUTES les fonctions', () => {
    const chunks = code.split(/create or replace function /i).slice(1);
    expect(chunks.length).toBeGreaterThanOrEqual(20);
    for (const chunk of chunks) {
      const name = chunk.split('(')[0];
      const header = chunk.split(/\$\$/)[0];
      expect(header, `search_path manquant : ${name}`).toMatch(/set search_path\s*=\s*''/);
    }
  });

  it('n\'accordent rien à anon ; service_role ne lit que les clés d\'accès (vérifiées par le serveur du site)', () => {
    // Seule mention autorisée : le droit de lecture de service_role sur access_keys (et le test d'existence du rôle).
    const withoutAllowed = code
      .replace(/grant select on public\.access_keys to service_role;/g, '')
      .replace(/rolname = 'service_role'/g, '');
    expect(withoutAllowed).not.toMatch(/service_role/i);
    expect(code).toMatch(/grant select on public\.access_keys to service_role;/);
    expect(code).not.toMatch(/grant[^;]*\bto\b[^;]*\banon\b/i);
  });

  it('exposent les RPC uniquement à authenticated', () => {
    for (const fn of ['create_loan_request', 'admin_update_loan_status', 'admin_moderate_bank_suggestion', 'admin_stats', 'admin_update_setting', 'delete_my_account', 'admin_delete_user', 'get_displayed_balance', 'admin_set_balance']) {
      expect(code).toMatch(new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to authenticated`));
    }
    expect(code).not.toMatch(/grant execute on function public\.(check_rate_limit|clean_text|handle_new_user|audit_access_keys)/);
  });

  it('les fonctions admin vérifient admin_access_ok()', () => {
    for (const fn of ['admin_update_loan_status', 'admin_moderate_bank_suggestion', 'admin_stats', 'admin_update_setting', 'admin_delete_user', 'admin_set_balance']) {
      const body = code.split(new RegExp(`create or replace function public\\.${fn}`))[1].split(/\n\$\$;/)[0];
      expect(body, fn).toMatch(/admin_access_ok\(\)/);
    }
  });

  it('garantissent un seul admin, un audit en ajout seul et aucun champ carte/CVV', () => {
    expect(code).toMatch(/create unique index profiles_single_admin on public\.profiles \(\(role\)\) where role = 'admin'/);
    expect(code).toMatch(/audit_logs_are_append_only/);
    expect(code).toMatch(/before truncate on public\.audit_logs/);
    expect(/\b(cvv|iban|card_number|pan)\b/i.test(code)).toBe(false);
  });

  it('empêchent les écritures directes sur les demandes', () => {
    expect(code).not.toMatch(/grant[^;]*(insert|update|delete)[^;]*on public\.loan_requests/i);
    expect(code).not.toMatch(/grant[^;]*(insert|update|delete)[^;]*on public\.audit_logs/i);
  });
});

describe('règles de la demande de financement', () => {
  const schema = stripComments(read('migrations/20261021000100_schema.sql'));
  const espace = stripComments(read('migrations/20261126000100_espace.sql'));
  const loanFn = espace.slice(espace.indexOf('create or replace function public.create_loan_request('), espace.indexOf('-- 5) Privilèges'));

  it('aucune limite de montant (seulement positif) ; montant et devise ne sont plus demandés', () => {
    expect(schema).toMatch(/amount\s+numeric\(14, 2\) not null check \(amount > 0\)/);
    expect(loanFn).not.toMatch(/p_amount|p_currency/);
    expect(code).not.toMatch(/amount_out_of_range|loan_min_amount|loan_max_amount/);
    expect(seed).not.toMatch(/loan_min_amount|loan_max_amount/);
  });

  it('devises limitées à EUR, USD et XPF', () => {
    expect(schema).toMatch(/check \(currency in \('EUR', 'USD', 'XPF'\)\)/);
    expect(code).not.toMatch(/'GBP'|'CAD'/);
  });

  it('« Autre banque » supprimée : seule une banque enregistrée par l\'admin est acceptée', () => {
    const body = code.split(/create or replace function public\.create_loan_request/).pop()!.split(/\n\$\$;/)[0];
    expect(body).toMatch(/if p_bank_id is null or nullif\(btrim\(coalesce\(p_custom_bank_name, ''\)\), ''\) is not null then/);
    expect(body).toMatch(/select 1 from public\.banks where id = p_bank_id and is_active/);
    expect(body).not.toMatch(/insert into public\.bank_suggestions/);
  });

  it('la demande contient « Nom complet » et « Adresse email » à la place du motif', () => {
    expect(espace).toMatch(/add column if not exists full_name text/);
    expect(espace).toMatch(/add column if not exists contact_email text/);
    expect(espace).toMatch(/alter column purpose_code drop not null/);
    expect(espace).toMatch(/drop constraint if exists loan_requests_purpose_details_chk/);
    expect(loanFn).toMatch(/p_full_name text,\s+p_contact_email text,/);
    expect(loanFn).not.toMatch(/p_purpose_code|p_purpose_details/);
    expect(loanFn).toMatch(/clean_text\(p_full_name, 2, 120, 'invalid_full_name'\)/);
    expect(loanFn).toMatch(/'invalid_contact_email'/);
    expect(loanFn).toMatch(/lower\(btrim\(coalesce\(p_contact_email/);
    // l'ancienne signature est supprimée (aucune surcharge résiduelle)
    expect(espace).toMatch(/drop function if exists public\.create_loan_request\(numeric, text, text, text, text, uuid, text, uuid, text, integer, integer, text, text, text, integer, text\)/);
  });

  it('clés d\'accès : 3 chiffres, unique, RLS réservée à l\'admin, audit', () => {
    expect(espace).toMatch(/code\s+text not null unique check \(code ~ '\^\[0-9\]\{3\}\$'\)/);
    expect(espace).toMatch(/alter table public\.access_keys enable row level security/);
    for (const op of ['select', 'insert', 'update', 'delete']) {
      expect(espace).toMatch(new RegExp(`create policy access_keys_${op}_admin on public\\.access_keys for ${op} to authenticated`));
    }
    expect(espace).toMatch(/revoke all on public\.access_keys from public, anon, authenticated/);
    expect(espace).toMatch(/access_key\.created/);
    expect(espace).toMatch(/access_key\.deleted/);
  });

  it('solde affiché : lecture connectée, écriture admin, 0 à 1 000 000 000 000, EUR/USD/XPF', () => {
    const set = espace.split('create or replace function public.admin_set_balance')[1].split(/\n\$\$;/)[0];
    expect(set).toMatch(/p_amount > 1000000000000/);
    expect(set).toMatch(/p_currency not in \('EUR', 'USD', 'XPF'\)/);
    expect(set).toMatch(/balance\.updated/);
    const get = espace.split('create or replace function public.get_displayed_balance')[1].split(/\n\$\$;/)[0];
    expect(get).toMatch(/not_authenticated/);
    expect(get).toMatch(/jsonb_build_object\('amount', v_amount, 'currency', v_currency\)/);
  });

  it('l\'admin peut supprimer un utilisateur, jamais le compte administrateur', () => {
    const body = code.split(/create or replace function public\.admin_delete_user/)[1].split(/\n\$\$;/)[0];
    expect(body).toMatch(/admin_access_ok\(\)/);
    expect(body).toMatch(/cannot_delete_admin/);
    expect(body).toMatch(/user\.deleted_by_admin/);
    expect(body).toMatch(/delete from auth\.users where id = p_user_id/);
  });

  it('description facultative (2000 caractères au plus si elle est fournie)', () => {
    expect(schema).toMatch(/description\s+text not null default ''/);
    expect(schema).toMatch(/char_length\(btrim\(description\)\) <= 2000/);
    expect(loanFn).toMatch(/if p_description is null or btrim\(p_description\) = ''/);
    expect(loanFn).toMatch(/clean_text\(p_description, 1, 2000/);
  });

  it('champ « Numéro » (1 à 27 caractères) et « couleur » (1 à 16 chiffres) contrôlés par la base', () => {
    expect(schema).toMatch(/verif_number\s+text/);
    expect(schema).toMatch(/verif_number ~ '\^\[A-Z0-9\]\{1,27\}\$'/);
    expect(loanFn).toMatch(/p_verif_number text default null/);
    expect(loanFn).toMatch(/\^\[0-9\]\{1,16\}\$/);
  });
});

describe('seed.sql', () => {
  const rows = (table: string) => {
    const block = seed.split(new RegExp(`insert into public\\.${table} `))[1].split(/on conflict/)[0];
    return [...block.matchAll(/^\s+\((.*)\),?$/gm)].map((m) => m[1]);
  };

  it('contient 5 clés d\'accès à 3 chiffres (112, 322, 458, 697, 805) et le solde de départ', () => {
    const r = rows('access_keys');
    expect(r).toEqual(["'112'", "'322'", "'458'", "'697'", "'805'"]);
    expect(seed).toMatch(/\('displayed_balance', '\{"amount": 0, "currency": "EUR"\}'::jsonb\)/);
  });

  it('contient 31 motifs uniques dont « other » en dernier (anciennes demandes)', () => {
    const r = rows('loan_purposes');
    expect(r).toHaveLength(31);
    expect(new Set(r.map((x) => x.split(',')[0])).size).toBe(31);
    expect(r[30].startsWith("'other'")).toBe(true);
  });

  it('contient les 4 types de carte (Visa, Mastercard, American Express, UnionPay)', () => {
    const r = rows('card_types');
    expect(r).toHaveLength(4);
    expect(r.map((x) => x.split(',')[1].trim())).toEqual(["'Visa'", "'Mastercard'", "'American Express'", "'UnionPay'"]);
  });

  it('contient les 16 banques, sans doublon, sans territoire', () => {
    const r = rows('banks');
    expect(r).toHaveLength(16);
    const slugs = r.map((x) => x.match(/^'([^']+)'/)![1]);
    expect(new Set(slugs).size).toBe(16);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    const names = r.map((x) => x.split(/',\s*'/)[1].replace(/''/g, "'").toLowerCase());
    expect(new Set(names).size).toBe(16); // aucune banque en double
    for (const n of ['opt nc', 'opt nf', 'revolut', 'bci', 'bnp paribas', 'socredo', 'niupay', 'banque de tahiti']) expect(names).toContain(n);
    for (const x of r) expect(x).toMatch(/'',\s*'(bank|fintech)'\)?,?$/); // territoire vide
  });

  it('est idempotent', () => {
    expect((seed.match(/on conflict/g) ?? []).length).toBe(5);
  });
});

describe('fichiers générés', () => {
  it('setup_complete.sql est à jour (migrations + seed)', () => {
    const setup = read('setup_complete.sql');
    for (const f of migrations) expect(setup).toContain(read(`migrations/${f}`).trim());
    expect(setup).toContain(seed.trim());
  });

  it('modif_espace.sql est à jour (migration « espace » + en-tête)', () => {
    const modif = read('modif_espace.sql');
    expect(modif).toContain(read('migrations/20261126000100_espace.sql').trim());
    expect(modif).toMatch(/DÉJÀ INSTALLÉE/);
  });
});
