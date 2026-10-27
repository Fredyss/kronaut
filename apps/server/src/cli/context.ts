import { parseArgs } from 'node:util';
import { CredentialError, keyringFromEnv } from '@kronaut/credentials';
import { createDatabase, type Database } from '@kronaut/db';
import { pino } from 'pino';
import { requireEnv } from '../config.ts';
import { CommandError, UsageError } from './errors.ts';

export const logger = pino({ base: null });
export const stderrLogger = pino({ base: null }, pino.destination(2));

export async function withDatabase<T>(
  variable: string,
  fn: (db: Database) => Promise<T>,
): Promise<T> {
  const db = createDatabase({
    connectionString: requireEnv(process.env, variable),
    applicationName: 'kronaut-cli',
  });
  try {
    return await fn(db);
  } finally {
    await db.destroy();
  }
}

export function noArgs(args: readonly string[]): void {
  parseArgs({ args: [...args], options: {}, strict: true, allowPositionals: false });
}

export function positionals(args: readonly string[], count: number): string[] {
  const parsed = parseArgs({ args: [...args], strict: true, allowPositionals: true, options: {} });
  if (parsed.positionals.length !== count) throw new UsageError('wrong number of arguments');
  return parsed.positionals;
}

export function keyring() {
  try {
    return keyringFromEnv(process.env);
  } catch (err) {
    if (err instanceof CredentialError) throw new CommandError(`KRONAUT_KEK_<n>: ${err.message}`);
    throw err;
  }
}
