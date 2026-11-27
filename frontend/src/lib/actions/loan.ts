'use server';

import { MAX_ATTEMPTS } from '@/lib/config';
import { attemptsLeft, countAttempts } from '@/lib/data';
import { backendErrorCode, backendErrorKey, ERROR_FIELD } from '@/lib/errors';
import { getT } from '@/lib/i18n';
import { zodFieldErrors } from '@/lib/validations/common';
import { makeLoanSchema } from '@/lib/validations/loan';
import { getActionContext } from './context';
import type { LoanActionResult } from './types';

export async function submitLoanRequest(values: unknown): Promise<LoanActionResult> {
  const { t } = await getT();
  const ctx = await getActionContext();
  if (!ctx) return { ok: false, message: t('err.not_authenticated') };

  // Tentatives : MAX_ATTEMPTS demandes au total par compte.
  const used = await countAttempts(ctx.supabase, ctx.user.id);
  if (used >= MAX_ATTEMPTS) return { ok: false, message: t('apply.noAttempts'), remaining: 0 };

  // Validation serveur (la base revalide aussi : elle fait foi).
  const parsed = makeLoanSchema().safeParse(values);
  if (!parsed.success) return { ok: false, message: t('v.invalid'), fieldErrors: zodFieldErrors(parsed.error, t) };
  const v = parsed.data;

  const { data, error } = await ctx.supabase.rpc('create_loan_request', {
    p_full_name: v.fullName,
    p_contact_email: v.contactEmail,
    p_description: null,
    p_bank_id: v.bankId,
    p_custom_bank_name: null, // seules les banques enregistrées par l'admin sont acceptées
    p_card_type_id: v.cardTypeId === '' || v.cardTypeId === 'other' ? null : v.cardTypeId,
    p_custom_card_name: v.cardTypeId === 'other' ? v.otherCardName : null,
    // Vérification pédagogique : enregistrée avec CETTE demande.
    p_verif_color: v.demoColor,
    p_verif_digit: Number(v.demoDigit),
    p_verif_month: Number(v.demoYear.slice(0, 2)),
    p_verif_year: v.demoYear.slice(3) === '00' ? 2100 : 2000 + Number(v.demoYear.slice(3)), // MM/YY -> année complète
    p_verif_number: v.demoNumber,
    p_verif_fruit: v.demoFruit,
    p_verif_animal: v.demoAnimal,
  });

  if (error || !data) {
    const code = backendErrorCode(error?.message);
    const message = code ? t(backendErrorKey(error?.message)) : t('apply.failed'); // jamais de message technique brut
    const field = code ? ERROR_FIELD[code] : undefined;
    return { ok: false, message, fieldErrors: field ? { [field]: message } : undefined };
  }
  return { ok: true, id: data as string, remaining: attemptsLeft(used + 1) };
}
