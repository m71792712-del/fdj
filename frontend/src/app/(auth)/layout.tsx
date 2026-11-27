import type { ReactNode } from 'react';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-lagoon-100/70 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-lagoon-100/60 blur-3xl" />
      </div>
      <div className="relative flex justify-end px-4 pt-4 sm:px-8 sm:pt-6">
        <LanguageSwitcher />
      </div>
      <main id="main" className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-0">{children}</main>
    </div>
  );
}
