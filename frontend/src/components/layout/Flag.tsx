import type { Locale } from '@/lib/i18n/shared';

/** Petits drapeaux en SVG (pas d'emoji : ils ne s'affichent pas sous Windows). */
export function Flag({ locale, className = 'h-4 w-6' }: { locale: Locale; className?: string }) {
  const common = { viewBox: '0 0 30 20', className: `${className} shrink-0 rounded-[3px] ring-1 ring-black/10`, 'aria-hidden': true as const };
  switch (locale) {
    case 'fr':
      return (
        <svg {...common}><rect width="10" height="20" fill="#0055a4" /><rect x="10" width="10" height="20" fill="#fff" /><rect x="20" width="10" height="20" fill="#ef4135" /></svg>
      );
    case 'en':
      return (
        <svg {...common}>
          <rect width="30" height="20" fill="#012169" />
          <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
          <path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.6" />
          <path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="6" />
          <path d="M15 0V20M0 10H30" stroke="#c8102e" strokeWidth="3.6" />
        </svg>
      );
    case 'es':
      return (
        <svg {...common}><rect width="30" height="20" fill="#aa151b" /><rect y="5" width="30" height="10" fill="#f1bf00" /></svg>
      );
    case 'de':
      return (
        <svg {...common}><rect width="30" height="7" fill="#000" /><rect y="6.6" width="30" height="6.8" fill="#dd0000" /><rect y="13.3" width="30" height="6.7" fill="#ffce00" /></svg>
      );
    case 'pt':
      return (
        <svg {...common}><rect width="30" height="20" fill="#ff0000" /><rect width="12" height="20" fill="#006600" /><circle cx="12" cy="10" r="3.4" fill="#ffd400" /><circle cx="12" cy="10" r="1.8" fill="#fff" /></svg>
      );
  }
}
