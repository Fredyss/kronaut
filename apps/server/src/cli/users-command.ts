import { parseArgs } from 'node:util';
import { Temporal } from 'temporal-polyfill';
import { parseBaseUrl, parseSecret, requireEnv } from '../config.ts';
import { purposeKey } from '../crypto.ts';
import { stderrLogger, withDatabase } from './context.ts';
import { UsageError } from './errors.ts';
import { createOwner, resetPassword, type UserCommandDeps } from './users.ts';

async function withUserDeps<T>(fn: (deps: UserCommandDeps) => Promise<T>): Promise<T> {
  const env = process.env;
  const publicUrl = parseBaseUrl('KRONAUT_PUBLIC_URL', requireEnv(env, 'KRONAUT_PUBLIC_URL'));
  const secret = parseSecret('KRONAUT_SECRET', requireEnv(env, 'KRONAUT_SECRET'));
  const resetKey = purposeKey(secret, 'reset-token/v1');
  secret.fill(0);
  return await withDatabase('KRONAUT_DATABASE_URL', (db) =>
    fn({ db, resetKey, publicUrl, now: Temporal.Now.instant(), logger: stderrLogger }),
  );
}

async function createCommand(rest: string[]): Promise<void> {
  const { values } = parseArgs({
    args: rest,
    strict: true,
    allowPositionals: false,
    options: {
      owner: { type: 'boolean' },
      email: { type: 'string' },
      name: { type: 'string' },
      workspace: { type: 'string' },
      timezone: { type: 'string' },
      slug: { type: 'string' },
    },
  });
  if (values.owner !== true) throw new UsageError((m) => m.option_required({ option: '--owner' }));
  const { email, name, workspace, timezone } = values;
  if (email === undefined || name === undefined || workspace === undefined) {
    throw new UsageError((m) => m.owner_options_required({}));
  }
  if (timezone === undefined)
    throw new UsageError((m) => m.option_required({ option: '--timezone' }));
  const created = await withUserDeps((deps) =>
    createOwner(deps, { email, name, workspace, timezone, slug: values.slug }),
  );
  process.stdout.write(`${created.link}\n`);
}

async function resetPasswordCommand(rest: string[]): Promise<void> {
  const { positionals } = parseArgs({
    args: rest,
    strict: true,
    allowPositionals: true,
    options: {},
  });
  const [email, ...extra] = positionals;
  if (email === undefined || extra.length > 0)
    throw new UsageError((m) => m.expected_one_email({}));
  const issued = await withUserDeps((deps) => resetPassword(deps, email));
  process.stdout.write(`${issued.link}\n`);
}

export async function userCommand(args: readonly string[]): Promise<void> {
  const [sub, ...rest] = args;
  if (sub === 'create') {
    await createCommand(rest);
    return;
  }
  if (sub === 'reset-password') {
    await resetPasswordCommand(rest);
    return;
  }
  throw new UsageError((m) => m.unknown_user_command({}));
}
