'use client';

import { useId, type InputHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; icon?: LucideIcon };

export function TextField({ label, error, hint, icon: Icon, id, type = 'text', className = '', ...props }: Props) {
  const uid = useId();
  const inputId = id ?? uid;
  const describedBy = [error ? `${inputId}-error` : null, hint ? `${inputId}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={inputId} className="label">
        {label}
        {props.required && <span aria-hidden className="text-coral-500"> *</span>}
      </label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" aria-hidden />}
        <input
          id={inputId}
          type={type}
          className={`input ${Icon ? 'pl-10' : ''} ${error ? 'border-coral-500' : ''} ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
      </div>
      {hint && <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${inputId}-error`} role="alert" className="field-error">{error}</p>}
    </div>
  );
}
