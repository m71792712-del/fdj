import { describe, expect, it } from 'vitest';
import { backendErrorCode, backendErrorKey, ERROR_FIELD } from '@/lib/errors';

describe('erreurs du backend', () => {
  it('reconnaît un code dans un message PostgREST', () => {
    expect(backendErrorCode('rate_limited')).toBe('rate_limited');
    expect(backendErrorCode('Error: amount_out_of_range (P0001)')).toBe('amount_out_of_range');
    expect(backendErrorCode('invalid_amount')).toBe('invalid_amount');
  });
  it('n’expose jamais un message technique inconnu', () => {
    expect(backendErrorKey('duplicate key value violates unique constraint "x"')).toBe('err.generic');
    expect(backendErrorKey(undefined)).toBe('err.generic');
  });
  it('associe chaque erreur de saisie à un champ du formulaire', () => {
    expect(ERROR_FIELD.invalid_bank).toBe('bankId');
    expect(ERROR_FIELD.amount_out_of_range).toBe('amount');
    expect(ERROR_FIELD.invalid_full_name).toBe('fullName');
    expect(ERROR_FIELD.invalid_contact_email).toBe('contactEmail');
  });
});
