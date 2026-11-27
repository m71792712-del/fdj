import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

// Tests d'intégration via l'API (PostgREST) — comme le feront le frontend et l'admin.
// À lancer UNIQUEMENT sur un projet Supabase de TEST, migrations + seed appliqués :
//   SUPABASE_TEST_URL=... SUPABASE_TEST_ANON_KEY=... SUPABASE_TEST_SERVICE_ROLE_KEY=... npm test
// L'inscription publique est désactivée : les comptes de test sont créés avec la clé service_role du projet de TEST
// (comme le fait le site, côté serveur), puis utilisés avec la clé anon. Ne mettez JAMAIS la clé service_role de production ici.
// Les tests liés au rôle admin et au MFA sont dans tests/sql/security_tests.sql (le rôle ne se change que par SQL).
const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_ANON_KEY;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const PASSWORD = 'Motdepasse12Aa1';

async function newUser() {
  const admin = createClient(url!, serviceKey!, { auth: { persistSession: false } });
  const digits = `229${Math.floor(10000000 + Math.random() * 89999999)}`;
  const email = `${digits}@acces.test.invalid`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true, user_metadata: { phone: digits, role: 'admin' },
  });
  if (createError || !created.user) throw new Error(`création impossible : ${createError?.message}`);
  const client = createClient(url!, key!, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`connexion impossible : ${error.message}`);
  return { client, id: created.user.id, phone: digits };
}

const createLoan = (c: SupabaseClient, over: Record<string, unknown> = {}) =>
  c.rpc('create_loan_request', {
    p_full_name: 'Marie Curie', p_contact_email: `Marie.${randomUUID().slice(0, 8)}@Exemple.fr`,
    p_description: null, p_bank_id: null, p_custom_bank_name: null, p_card_type_id: null, ...over,
  });

describe.skipIf(!url || !key || !serviceKey)('API Supabase de test', () => {
  let a: Awaited<ReturnType<typeof newUser>>;
  let b: Awaited<ReturnType<typeof newUser>>;
  let bankId: string;
  let loanId: string;

  beforeAll(async () => {
    a = await newUser();
    b = await newUser();
    const { data } = await a.client.from('banks').select('id').eq('slug', 'lcl').single();
    bankId = data!.id;
  });

  it('crée le profil avec le rôle « user » (même si les métadonnées demandent « admin ») et le numéro', async () => {
    const { data } = await a.client.from('profiles').select('role, phone').eq('id', a.id).single();
    expect(data).toEqual({ role: 'user', phone: a.phone });
  });

  it('refuse toute auto-promotion', async () => {
    const { error } = await a.client.from('profiles').update({ role: 'admin' }).eq('id', a.id);
    expect(error).not.toBeNull();
    const { data } = await a.client.from('profiles').select('role').eq('id', a.id).single();
    expect(data!.role).toBe('user');
  });

  it('crée une demande (statut pending, nom complet et e-mail enregistrés) et la relit avec son historique', async () => {
    const { data, error } = await createLoan(a.client, { p_bank_id: bankId, p_contact_email: '  Marie.Curie@Exemple.FR ' });
    expect(error).toBeNull();
    loanId = data as string;
    const { data: loan } = await a.client.from('loan_requests').select('status, amount, full_name, contact_email, purpose_code').eq('id', loanId).single();
    expect(loan).toMatchObject({ status: 'pending', full_name: 'Marie Curie', contact_email: 'marie.curie@exemple.fr', purpose_code: null });
    const { data: hist } = await a.client.from('loan_status_history').select('id').eq('loan_id', loanId);
    expect(hist).toHaveLength(1);
  });

  it('isole les données : B ne voit pas la demande de A', async () => {
    const { data } = await b.client.from('loan_requests').select('id').eq('id', loanId);
    expect(data).toEqual([]);
  });

  it('interdit les écritures directes et les fonctions admin', async () => {
    expect((await a.client.from('loan_requests').insert({ user_id: a.id, amount: 1, full_name: 'Test', bank_id: bankId })).error).not.toBeNull();
    await a.client.from('loan_requests').update({ status: 'approved' }).eq('id', loanId);
    const { data } = await a.client.from('loan_requests').select('status').eq('id', loanId).single();
    expect(data!.status).toBe('pending');
    expect((await a.client.rpc('admin_stats')).error?.message).toContain('forbidden');
    expect((await a.client.rpc('admin_set_balance', { p_amount: 10, p_currency: 'EUR' })).error?.message).toContain('forbidden');
    expect((await a.client.rpc('admin_update_loan_status', { p_loan_id: loanId, p_new_status: 'approved', p_comment: 'test' })).error?.message).toContain('forbidden');
    expect((await a.client.from('audit_logs').select('id')).data).toEqual([]);
  });

  it('les clés d\'accès sont invisibles et intouchables pour un utilisateur', async () => {
    expect((await a.client.from('access_keys').select('id')).data).toEqual([]);
    expect((await a.client.from('access_keys').insert({ code: '999' })).error).not.toBeNull();
    const admin = createClient(url!, serviceKey!, { auth: { persistSession: false } });
    const { data } = await admin.from('access_keys').select('code').eq('is_active', true);
    expect((data ?? []).length).toBeGreaterThan(0); // le serveur du site (service_role) les lit
  });

  it('le solde affiché est lisible par tout utilisateur connecté', async () => {
    const { data, error } = await a.client.rpc('get_displayed_balance');
    expect(error).toBeNull();
    expect(data).toEqual(expect.objectContaining({ amount: expect.any(Number), currency: expect.stringMatching(/^(EUR|USD|XPF)$/) }));
  });

  it('valide les entrées côté base', async () => {
    expect((await createLoan(a.client, { p_bank_id: bankId, p_full_name: 'A' })).error?.message).toContain('invalid_full_name');
    expect((await createLoan(a.client, { p_bank_id: bankId, p_contact_email: 'pas-un-email' })).error?.message).toContain('invalid_contact_email');
    expect((await createLoan(a.client, {})).error?.message).toContain('invalid_bank');
  });

  it('refuse « Autre banque » et limite le débit', async () => {
    expect((await createLoan(a.client, { p_custom_bank_name: `Banque Test ${Date.now()}` })).error?.message).toContain('invalid_bank');
    for (let i = 0; i < 4; i++) await createLoan(a.client, { p_bank_id: bankId });
    expect((await createLoan(a.client, { p_bank_id: bankId })).error?.message).toContain('rate_limited');
  });

  it('supprime le compte et ses données', async () => {
    expect((await b.client.rpc('delete_my_account')).error).toBeNull();
    const { data } = await b.client.from('profiles').select('id');
    expect(data ?? []).toEqual([]);
  });
});
