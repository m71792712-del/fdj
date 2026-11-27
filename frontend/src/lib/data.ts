import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_ATTEMPTS } from '@/lib/config';
import { CURRENCIES } from '@/lib/constants/statuses';
import type { Bank, CardType } from '@/types/db';

export async function getReferenceData(supabase: SupabaseClient) {
  const [banks, cards] = await Promise.all([
    supabase.from('banks').select('id,slug,name,territory,type').eq('is_active', true).order('name', { ascending: true }).limit(500),
    supabase.from('card_types').select('id,family,name').eq('is_active', true).order('sort_order', { ascending: true }),
  ]);
  return { banks: (banks.data ?? []) as Bank[], cardTypes: (cards.data ?? []) as CardType[] };
}

/** Solde fictif affiché (fixé par l'admin, identique pour tous les comptes). */
export async function getBalance(supabase: SupabaseClient): Promise<{ amount: number; currency: string }> {
  const { data } = await supabase.rpc('get_displayed_balance');
  const v = (data ?? {}) as { amount?: unknown; currency?: unknown };
  const amount = typeof v.amount === 'number' && Number.isFinite(v.amount) ? v.amount : Number(v.amount);
  const currency = typeof v.currency === 'string' && (CURRENCIES as readonly string[]).includes(v.currency) ? v.currency : 'EUR';
  return { amount: Number.isFinite(amount) ? amount : 0, currency };
}

/** Nombre de demandes déjà déposées par l'utilisateur (la base ne montre que les siennes). */
export async function countAttempts(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase.from('loan_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  return count ?? 0;
}

export const attemptsLeft = (used: number) => Math.max(0, MAX_ATTEMPTS - used);
