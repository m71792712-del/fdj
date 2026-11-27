import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { AppNav } from '@/components/layout/AppNav';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { Logo } from '@/components/layout/Logo';
import { logout } from '@/lib/actions/auth';
import { requireUser } from '@/lib/auth';
import { getT } from '@/lib/i18n';

// Espace connecté : l'utilisateur est revérifié ici ET dans chaque page (le middleware n'est qu'une première barrière).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { t } = await getT();
  await requireUser();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Logo width={96} priority />
          <div className="order-3 w-full sm:order-none sm:w-auto"><AppNav /></div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <form action={logout}>
              <button type="submit" className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-semibold text-navy-800 shadow-soft transition hover:border-navy-200">
                <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">{t('shell.logout')}</span>
                <span className="sr-only sm:hidden">{t('shell.logout')}</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 animate-fade-up px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </>
  );
}
