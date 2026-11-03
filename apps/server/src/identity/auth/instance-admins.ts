export function isInstanceAdmin(
  admins: readonly string[] | undefined,
  email: string | null,
): boolean {
  return email !== null && (admins ?? []).includes(email.normalize('NFC').toLowerCase());
}
