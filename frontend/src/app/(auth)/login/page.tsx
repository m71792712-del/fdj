import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Lock, ShieldCheck } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Logo } from '@/components/layout/Logo';
import { getUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { one, safeNext } from '@/lib/utils';

export const metadata: Metadata = { title: 'Connexion' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await getT();
  const sp = await searchParams;
  if (await getUser()) redirect('/espace');
  const next = safeNext(one(sp.next), '');
  return (
    <div className="animate-fade-up">
      <div className="flex flex-col items-center text-center">
        <Logo href="/login" width={230} priority />
        <h1 className="sr-only">{t('login.title')}</h1>
        <p className="mt-4 text-lg font-medium text-navy-700">{t('brand.tagline')}</p>
      </div>

      <div className="card mt-8 p-6 sm:p-8">
        <p className="mb-6 flex items-center gap-2.5 text-sm font-bold uppercase tracking-wide text-ocean-600">
          <Lock className="h-5 w-5" aria-hidden /> {t('login.title')}
        </p>
        <LoginForm next={next || undefined} />
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white">
          <ShieldCheck className="h-4 w-4" aria-hidden /> {t('login.secure')}
        </p>
        <p className="max-w-xs text-sm text-slate-600">{t('login.protected')}</p>
      </div>
    </div>
  );
}
