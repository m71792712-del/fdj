import { describe, expect, it } from 'vitest';
import { compactPhone, loginSchema } from '@/lib/validations/auth';
import { LOAN_STEP_FIELDS, isValidExpiry, makeLoanSchema, validateLoanStep, type LoanFormValues } from '@/lib/validations/loan';
import { formatCode, formatDigitGroups } from '@/lib/utils';

const BANK = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';
const CARD = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const valid: LoanFormValues = {
  fullName: 'Jean Dupont', contactEmail: 'Jean@Exemple.com', bankId: BANK, demoNumber: 'AB12 CD34 EF56 GH78 IJ90 KL12 MN3', demoFruit: 'Mangue', demoAnimal: 'Iguane', cardTypeId: CARD, otherCardName: '',
  demoColor: '1234', demoDigit: '7', demoYear: '08/26',
};
const errs = (v: unknown) => {
  const r = makeLoanSchema().safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => `${String(i.path[0])}:${i.message}`);
};

describe('connexion par numéro et clé', () => {
  it('accepte un numéro et une clé à 3 chiffres, et nettoie le numéro', () => {
    const r = loginSchema.safeParse({ phone: '+229 97 00-00.00', key: ' 112 ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual({ phone: '+22997000000', key: '112' });
    expect(compactPhone('(0197) 00 00 00')).toBe('0197000000');
  });
  it('refuse un numéro invalide', () => {
    for (const phone of ['', 'abc', '12345', '1'.repeat(16), '+', '12 34 ab 56']) {
      expect(loginSchema.safeParse({ phone, key: '112' }).success, phone).toBe(false);
    }
  });
  it('refuse une clé qui n’a pas exactement 3 chiffres', () => {
    for (const key of ['', '12', '1234', 'abc', '1 2', '12a']) {
      const r = loginSchema.safeParse({ phone: '87123456', key });
      expect(r.success, key).toBe(false);
      if (!r.success) expect(r.error.issues[0].message).toBe('v.key');
    }
  });
});

describe('demande de financement', () => {
  it('accepte une demande valide', () => expect(errs(valid)).toEqual([]));
  it('ne demande plus ni montant ni devise', () => {
    expect('amount' in valid || 'currency' in valid).toBe(false);
    expect(LOAN_STEP_FIELDS.flat()).not.toContain('amount');
    expect(LOAN_STEP_FIELDS.flat()).not.toContain('currency');
  });
  it('exige un nom complet et une adresse email valides', () => {
    expect(errs({ ...valid, fullName: '' })).toContain('fullName:v.fullName');
    expect(errs({ ...valid, fullName: 'A' })).toContain('fullName:v.fullName');
    expect(errs({ ...valid, fullName: 'A'.repeat(121) })).toContain('fullName:v.fullName');
    expect(errs({ ...valid, fullName: 'Li' })).toEqual([]);
    expect(errs({ ...valid, contactEmail: '' })).toContain('contactEmail:v.email');
    expect(errs({ ...valid, contactEmail: 'pas-un-email' })).toContain('contactEmail:v.email');
    expect(errs({ ...valid, contactEmail: 'a@b' })).toContain('contactEmail:v.email');
    const ok = makeLoanSchema().safeParse(valid);
    expect(ok.success && ok.data.contactEmail).toBe('jean@exemple.com'); // normalisé en minuscules
    expect(ok.success && ok.data.fullName).toBe('Jean Dupont');
  });
  it('la banque est choisie dans la liste', () => {
    expect(errs({ ...valid, bankId: 'other' })).toContain('bankId:v.bank'); // plus d'option « Autre banque »
    expect(errs({ ...valid, bankId: '' })).toContain('bankId:v.bank');
    expect(errs({ ...valid, bankId: 'pas-un-uuid' })).toContain('bankId:v.bank');
  });
  it('valide les champs fictifs', () => {
    expect(errs({ ...valid, demoNumber: '' })).toContain('demoNumber:v.codeLength');
    expect(errs({ ...valid, demoNumber: 'A' })).toEqual([]); // 1 caractère suffit : 27 au plus
    expect(errs({ ...valid, demoNumber: 'AB12 CD34' })).toEqual([]);
    expect(errs({ ...valid, demoNumber: 'AB12 CD34 EF56 GH78 IJ90 KL12 MN3' })).toEqual([]); // 27 : accepté
    expect(errs({ ...valid, demoNumber: 'AB12 CD34 EF56 GH78 IJ90 KL12 MN34' })).toContain('demoNumber:v.codeLength'); // 28 : refusé
    expect(errs({ ...valid, demoNumber: 'AB12-CD34-EF56' })).toContain('demoNumber:v.codeLength');
    expect(errs({ ...valid, demoNumber: 'ab12cd34ef56gh78ij90kl12mn3' })).toEqual([]); // sans espaces / minuscules : accepté puis normalisé
    const parsed = makeLoanSchema().safeParse({ ...valid, demoNumber: 'ab12 cd34ef56 gh78ij90 kl12mn3' });
    expect(parsed.success && parsed.data.demoNumber).toBe('AB12CD34EF56GH78IJ90KL12MN3');
    expect(errs({ ...valid, demoDigit: 'abc' })).toContain('demoDigit:v.number');
    expect(errs({ ...valid, demoColor: '' })).toContain('demoColor:v.colorDigits');
    expect(errs({ ...valid, demoColor: 'Bleu' })).toContain('demoColor:v.colorDigits');
    expect(errs({ ...valid, demoColor: '1234 5678 9012 3456' })).toEqual([]); // les espaces de mise en forme sont acceptés
    expect(errs({ ...valid, demoColor: '1234567890123456' })).toEqual([]);
    expect(errs({ ...valid, demoColor: '1234 5678 9012 3456 7' })).toContain('demoColor:v.colorDigits'); // 17 chiffres
    expect(errs({ ...valid, demoColor: '1234 56a8' })).toContain('demoColor:v.colorDigits');
    const color = makeLoanSchema().safeParse({ ...valid, demoColor: '1234 5678 9012 3456' });
    expect(color.success && color.data.demoColor).toBe('1234567890123456'); // envoyé au serveur sans espaces
    expect(errs({ ...valid, demoDigit: '1234' })).toContain('demoDigit:v.number');
  });
  it('le choix de la carte est obligatoire (plus de « Aucun »)', () => {
    expect(errs({ ...valid, cardTypeId: '' })).toContain('cardTypeId:v.card');
    expect(errs({ ...valid, cardTypeId: 'pas-un-uuid' })).toContain('cardTypeId:v.card');
    expect(errs({ ...valid, cardTypeId: 'other' })).toContain('otherCardName:v.otherCard');
    expect(errs({ ...valid, cardTypeId: 'other', otherCardName: 'Carte locale' })).toEqual([]);
    expect(errs({ ...valid, otherCardName: 'Carte locale' })).toContain('otherCardName:v.otherCardUnexpected');
  });
  it('le formulaire n\u2019a plus de champ « description »', () => {
    expect('description' in valid).toBe(false);
    expect(LOAN_STEP_FIELDS.flat()).not.toContain('description');
  });
  it('2 étapes : 1 = nom + email + banque, 2 = carte + vérification', () => {
    expect(LOAN_STEP_FIELDS).toHaveLength(2);
    expect(LOAN_STEP_FIELDS[0]).toEqual(['fullName', 'contactEmail', 'bankId', 'demoNumber', 'demoFruit', 'demoAnimal']);
    expect(LOAN_STEP_FIELDS[1]).toEqual(['cardTypeId', 'otherCardName', 'demoColor', 'demoDigit', 'demoYear']);
    expect(LOAN_STEP_FIELDS.flat()).not.toContain('purposeCode'); // plus de motif
  });
  it('valide étape par étape', () => {
    // étape 1
    expect(validateLoanStep(0, valid)).toEqual({});
    expect(validateLoanStep(0, { ...valid, fullName: '' }).fullName).toBe('v.fullName');
    expect(validateLoanStep(0, { ...valid, contactEmail: 'x' }).contactEmail).toBe('v.email');
    expect(validateLoanStep(0, { ...valid, bankId: '' }).bankId).toBeTruthy();
    expect(validateLoanStep(0, { ...valid, demoNumber: '' }).demoNumber).toBe('v.codeLength');
    expect(validateLoanStep(0, { ...valid, demoFruit: '' }).demoFruit).toBeTruthy();
    expect(validateLoanStep(0, { ...valid, demoAnimal: '' }).demoAnimal).toBeTruthy();
    // étape 2 (les erreurs de l'étape 1 n'y apparaissent pas, et inversement)
    expect(validateLoanStep(1, valid)).toEqual({});
    expect(validateLoanStep(1, { ...valid, cardTypeId: '' }).cardTypeId).toBe('v.card');
    expect(validateLoanStep(1, { ...valid, demoColor: '' }).demoColor).toBe('v.colorDigits');
    expect(validateLoanStep(1, { ...valid, demoDigit: '' }).demoDigit).toBeTruthy();
    expect(validateLoanStep(1, { ...valid, demoYear: '12/2' }).demoYear).toBe('v.year');
    expect(validateLoanStep(1, { ...valid, fullName: '' })).toEqual({});
    expect(validateLoanStep(0, { ...valid, cardTypeId: '' })).toEqual({});
    // il n'y a plus d'étape 3 (récapitulatif supprimé)
    expect(validateLoanStep(2, { ...valid, fullName: '', cardTypeId: '' })).toEqual({});
  });
  it('ne contient aucun champ de carte bancaire', () => {
    const keys = Object.keys(valid);
    expect(keys.some((k) => /cvv|iban|cardnumber|expiry|pin/i.test(k))).toBe(false);
  });
});

describe('formatCode', () => {
  it('met en majuscules, ignore les symboles, groupe par 4 et limite à 27', () => {
    expect(formatCode('ab12')).toBe('AB12');
    expect(formatCode('ab123')).toBe('AB12 3');
    expect(formatCode('ab12-cd34 ef56')).toBe('AB12 CD34 EF56');
    expect(formatCode('a'.repeat(40))).toBe([...Array(6).fill('AAAA'), 'AAA'].join(' '));
    expect(formatCode('é!?')).toBe('');
  });
});

describe('formatDigitGroups', () => {
  it('chiffres uniquement, groupes de 4, 16 maximum', () => {
    expect(formatDigitGroups('1234')).toBe('1234');
    expect(formatDigitGroups('12345')).toBe('1234 5');
    expect(formatDigitGroups('1234 5678 9012 3456')).toBe('1234 5678 9012 3456');
    expect(formatDigitGroups('12345678901234567890')).toBe('1234 5678 9012 3456');
    expect(formatDigitGroups('ab12-34 cd5')).toBe('1234 5');
    expect(formatDigitGroups('abc')).toBe('');
  });
});

describe('isValidExpiry', () => {
  it('exige MM/AA complet, mois 01-12, année 2025 à 2100', () => {
    for (const v of ['12/25', '12/29', '01/26', '06/00']) expect(isValidExpiry(v), v).toBe(true);
    for (const v of ['', '1', '12', '12/', '12/2', '13/25', '00/25', '12/24', '1225', '12/259']) expect(isValidExpiry(v), v).toBe(false);
  });
});
