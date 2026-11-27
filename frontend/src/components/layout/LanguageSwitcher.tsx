'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { setLocale } from '@/lib/actions/locale';
import { useI18n } from '@/lib/i18n/provider';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/lib/i18n/shared';
import { Flag } from './Flag';

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const choose = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t('lang.label')}
        disabled={pending}
        className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-semibold text-navy-800 shadow-soft transition hover:border-navy-200 disabled:opacity-70"
      >
        <Globe className="h-4 w-4 text-navy-600" aria-hidden />
        <Flag locale={locale} />
        <span>{LOCALE_NAMES[locale]}</span>
        <ChevronDown className={`h-4 w-4 text-navy-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <ul id={listId} role="listbox" aria-label={t('lang.label')} className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-white p-1 shadow-lift">
          {LOCALES.map((l) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <button
                type="button"
                onClick={() => choose(l)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-navy-50 ${l === locale ? 'font-semibold text-navy-900' : 'text-slate-700'}`}
              >
                <Flag locale={l} />
                <span className="flex-1">{LOCALE_NAMES[l]}</span>
                {l === locale && <Check className="h-4 w-4 text-ocean-600" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
