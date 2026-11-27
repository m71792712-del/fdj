import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarDays, ChevronRight, Clock, History } from 'lucide-react';
import { TodayDate } from '@/components/espace/TodayDate';
import { requireUser } from '@/lib/auth';
import { getBalance } from '@/lib/data';
import { getT } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/utils';

export const metadata: Metadata = { title: 'Mon espace' };

export default async function EspacePage() {
  const { t, locale } = await getT();
  await requireUser();
  const supabase = await createClient();
  const balance = await getBalance(supabase);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <CalendarDays className="h-4 w-4" aria-hidden /> <TodayDate />
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl">{t('espace.welcome')}</h1>
      </header>

      <section aria-labelledby="balance-label" className="rounded-2xl bg-navy-900 p-6 text-white shadow-lift sm:p-8">
        <p id="balance-label" className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-200">{t('espace.balance')}</p>
        <p className="mt-3 font-display text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">{formatMoney(balance.amount, balance.currency, locale)}</p>
        <p className="mt-4 flex items-center gap-2 text-sm text-navy-200">
          <Clock className="h-4 w-4" aria-hidden /> {t('espace.updated')}
        </p>
      </section>

      <section className="card text-center">
        <Link href="/apply" className="btn btn-green w-full py-4 text-base">
          {t('espace.cta')} <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
        <p className="mt-3 text-sm text-slate-500">
          <Link href="/apply" className="font-medium text-ocean-600 hover:underline">{t('espace.ctaHint')}</Link>
        </p>
      </section>

      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5 text-left shadow-soft transition hover:border-navy-200"
      >
        <span className="flex items-center gap-3 font-semibold text-navy-900">
          <History className="h-5 w-5 text-navy-600" aria-hidden /> {t('espace.history')}
        </span>
        <ChevronRight className="h-5 w-5 text-navy-300" aria-hidden />
      </button>
    </div>
  );
}
