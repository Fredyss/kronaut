export const EMAIL_MAX_LENGTH = 320;

export function normalizeEmail(email: string): string {
  return email.trim().normalize('NFC').toLowerCase();
}
