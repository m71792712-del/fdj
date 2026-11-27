'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { formatLongDate } from '@/lib/utils';

/** Date du jour dans la langue choisie, calculée sur l'appareil de l'utilisateur (fuseau horaire correct). */
export function TodayDate() {
  const { locale } = useI18n();
  const [text, setText] = useState('');
  useEffect(() => setText(formatLongDate(new Date(), locale)), [locale]);
  return <time className="inline-block min-h-[1.5em] first-letter:uppercase">{text}</time>;
}
