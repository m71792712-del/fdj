import type { Metadata } from 'next';
import { LoanWizard } from '@/components/loan/LoanWizard';
import { requireUser } from '@/lib/auth';
import { attemptsLeft, countAttempts, getReferenceData } from '@/lib/data';
import { getT } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Nouvelle demande' };

export default async function ApplyPage() {
  const { t } = await getT();
  const user = await requireUser();
  const supabase = await createClient();
  const [ref, used] = await Promise.all([getReferenceData(supabase), countAttempts(supabase, user.id)]);
  const left = attemptsLeft(used);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl sm:text-4xl">{t('apply.title')}</h1>
      {left === 0 ? (
        <div className="card text-center"><p className="font-medium text-navy-900">{t('apply.noAttempts')}</p></div>
      ) : (
        <LoanWizard banks={ref.banks} cardTypes={ref.cardTypes} attemptsLeft={left} />
      )}
    </div>
  );
}
