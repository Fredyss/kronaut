import { m } from './i18n.ts';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 256;

export function passwordHint(): string {
  return m.password_min_length({ count: PASSWORD_MIN_LENGTH });
}

export function passwordProblem(password: string): string | null {
  const length = [...password.normalize('NFC')].length;
  if (length < PASSWORD_MIN_LENGTH) return passwordHint();
  if (length > PASSWORD_MAX_LENGTH) return m.password_too_long();
  return null;
}

export function policyMessage(code: string): string | null {
  if (code === 'too_short') return passwordHint();
  if (code === 'too_long') return m.password_too_long();
  return null;
}
