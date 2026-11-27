'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FilePlus2, House } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

export function AppNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const items = [
    { href: '/espace', label: t('nav.espace'), icon: House },
    { href: '/apply', label: t('nav.apply'), icon: FilePlus2 },
  ];
  return (
    <nav aria-label={t('nav.menu')} className="flex items-center gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${active ? 'bg-lagoon-50 text-ocean-600' : 'text-slate-600 hover:bg-navy-50 hover:text-navy-900'}`}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
