'use client';

import { useActionState, useId } from 'react';
import { KeyRound, Phone } from 'lucide-react';
import { login } from '@/lib/actions/auth';
import { useI18n } from '@/lib/i18n/provider';
import { FormMessage } from '@/components/ui/FormMessage';
import { SubmitButton } from '@/components/ui/SubmitButton';

function CapsField({ label, hint, error, icon: Icon, children, id }: { label: string; hint?: string; error?: string; icon: typeof Phone; children: React.ReactNode; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-bold uppercase tracking-wide text-navy-700">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy-400" aria-hidden />
        {children}
      </div>
      {hint && !error && <p id={`${id}-hint`} className="mt-2 text-sm text-slate-600">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="field-error">{error}</p>}
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(login, null);
  const phoneId = useId();
  const keyId = useId();
  const e = state?.fieldErrors;
  return (
    <form action={action} noValidate className="space-y-6">
      <input type="hidden" name="next" value={next ?? ''} />
      <FormMessage state={state} />
      <CapsField id={phoneId} icon={Phone} label={t('login.phone')} error={e?.phone}>
        <input
          id={phoneId}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          maxLength={24}
          placeholder={t('login.phone.ph')}
          defaultValue={state?.values?.phone}
          aria-invalid={e?.phone ? true : undefined}
          aria-describedby={e?.phone ? `${phoneId}-error` : undefined}
          className={`input h-14 rounded-2xl pl-12 text-base ${e?.phone ? 'border-coral-500' : ''}`}
        />
      </CapsField>
      <CapsField id={keyId} icon={KeyRound} label={t('login.key')} hint={t('login.key.hint')} error={e?.key}>
        <input
          id={keyId}
          name="key"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          required
          maxLength={3}
          placeholder={t('login.key.ph')}
          aria-invalid={e?.key ? true : undefined}
          aria-describedby={e?.key ? `${keyId}-error` : `${keyId}-hint`}
          className={`input h-14 rounded-2xl pl-12 text-base tracking-widest ${e?.key ? 'border-coral-500' : ''}`}
        />
      </CapsField>
      <SubmitButton className="btn btn-primary h-14 w-full rounded-2xl text-base">{t('login.submit')}</SubmitButton>
    </form>
  );
}
