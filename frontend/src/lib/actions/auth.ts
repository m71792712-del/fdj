'use server';

import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getT } from '@/lib/i18n';
import { clientIp, isBlocked, recordFailure } from '@/lib/rateLimit';
import { createServiceClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { formString, safeNext } from '@/lib/utils';
import { loginSchema } from '@/lib/validations/auth';
import { zodFieldErrors } from '@/lib/validations/common';
import type { ActionState } from './types';

/**
 * Connexion par numéro + clé d'identification.
 *  1. la clé doit exister et être active (table access_keys, gérée par l'admin) ;
 *  2. le numéro devient l'identifiant du compte (adresse interne <chiffres>@<domaine>) ;
 *  3. le mot de passe Supabase est dérivé du numéro avec un secret serveur : l'utilisateur ne le voit jamais ;
 *  4. si le compte n'existe pas, il est créé aussitôt, puis la personne est connectée.
 */
function accountCredentials(phoneCompact: string) {
  const secret = process.env.ACCOUNT_PASSWORD_SECRET;
  if (!secret || secret.length < 24) return null;
  const digits = phoneCompact.replace(/\D/g, '');
  const domain = (process.env.ACCOUNT_EMAIL_DOMAIN ?? 'gmail.com').trim().toLowerCase();
  const email = `${digits}@${domain}`;
  // « Aa1 » garantit lettre minuscule, majuscule et chiffre (règle de mot de passe de Supabase) ; 64 + 3 caractères < 72.
  const password = `${createHmac('sha256', secret).update(`fom-account:${digits}`).digest('hex')}Aa1`;
  return { email, password };
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getT();
  const values = { phone: formString(formData, 'phone') };
  const parsed = loginSchema.safeParse({ phone: values.phone, key: formString(formData, 'key') });
  if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error, t), values };
  const { phone, key } = parsed.data;

  const ip = clientIp(await headers());
  if (isBlocked(ip)) return { ok: false, message: t('auth.tooMany'), values };

  const creds = accountCredentials(phone);
  let service: ReturnType<typeof createServiceClient> | null = null;
  try {
    service = createServiceClient();
  } catch (e) {
    console.error('[login] configuration incomplète :', e instanceof Error ? e.message : e);
  }
  if (!creds || !service) {
    if (!creds) console.error('[login] configuration incomplète : ACCOUNT_PASSWORD_SECRET (24 caractères minimum) manquante');
    return { ok: false, message: t('auth.unavailable'), values };
  }

  const { data: keyRow, error: keyError } = await service.from('access_keys').select('id').eq('code', key).eq('is_active', true).maybeSingle();
  if (keyError) {
    console.error('[login] lecture des clés impossible', { code: keyError.code, message: keyError.message });
    return { ok: false, message: t('auth.unavailable'), values };
  }
  if (!keyRow) {
    recordFailure(ip);
    return { ok: false, fieldErrors: { key: t('auth.login.invalidKey') }, values };
  }

  const supabase = await createClient();
  let { error } = await supabase.auth.signInWithPassword({ email: creds.email, password: creds.password });
  if (error && error.status !== 429) {
    // Premier passage de ce numéro : on crée le compte (idempotent si une autre requête l'a créé entre-temps).
    const created = await service.auth.admin.createUser({
      email: creds.email,
      password: creds.password,
      email_confirm: true,
      user_metadata: { phone },
    });
    if (created.error && created.error.code !== 'email_exists') {
      console.error('[login] création du compte refusée', { status: created.error.status, code: created.error.code, message: created.error.message });
      return { ok: false, message: t('auth.unavailable'), values };
    }
    ({ error } = await supabase.auth.signInWithPassword({ email: creds.email, password: creds.password }));
  }
  if (error) {
    console.error('[login] connexion refusée', { status: error.status, code: error.code });
    return { ok: false, message: error.status === 429 ? t('auth.tooMany') : t('auth.unavailable'), values };
  }
  redirect(safeNext(formString(formData, 'next')));
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
