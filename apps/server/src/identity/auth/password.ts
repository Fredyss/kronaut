import { hash, verify } from '@node-rs/argon2';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 256;

const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
const DUMMY_PASSWORD = 'kronaut-dummy-password-for-timing';

let dummyHash: Promise<string> | undefined;

function normalize(password: string): string {
  return password.normalize('NFC');
}

export type PasswordProblem = 'too_short' | 'too_long';

export function checkPassword(password: string): PasswordProblem | null {
  const length = [...normalize(password)].length;
  if (length < PASSWORD_MIN_LENGTH) return 'too_short';
  if (length > PASSWORD_MAX_LENGTH) return 'too_long';
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const problem = checkPassword(password);
  if (problem !== null) throw new RangeError(`password ${problem}`);
  return await hash(normalize(password), OPTIONS);
}

export async function verifyPassword(stored: string | null, password: string): Promise<boolean> {
  if (password.length > PASSWORD_MAX_LENGTH * 4) return false;
  if (stored === null) {
    dummyHash ??= hash(DUMMY_PASSWORD, OPTIONS);
    await verify(await dummyHash, normalize(password));
    return false;
  }
  try {
    return await verify(stored, normalize(password));
  } catch {
    return false;
  }
}
