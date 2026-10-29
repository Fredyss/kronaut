import { parseArgs } from 'node:util';
import { parseBaseUrl, parseUuid, requireEnv } from '../config.ts';
import { keyring, positionals, stderrLogger, withDatabase } from './context.ts';
import { UsageError } from './errors.ts';
import {
  activateKey,
  createKey,
  deleteKey,
  listKeys,
  type ProviderAppCommandDeps,
  registerBluesky,
  registerSecretApp,
  type SecretAppProvider,
} from './provider-apps.ts';

const META_APP_ID = /^\d{1,32}$/;
const LINKEDIN_CLIENT_ID = /^[A-Za-z0-9]{1,64}$/;
const SECRET_APP_PROVIDERS: readonly string[] = ['facebook', 'instagram', 'linkedin', 'threads'];

function isSecretAppProvider(provider: string): provider is SecretAppProvider {
  return SECRET_APP_PROVIDERS.includes(provider);
}

function clientIdValid(provider: SecretAppProvider, clientId: string): boolean {
  return (provider === 'linkedin' ? LINKEDIN_CLIENT_ID : META_APP_ID).test(clientId);
}

function withOperator<T>(fn: (deps: ProviderAppCommandDeps) => Promise<T>): Promise<T> {
  return withDatabase('KRONAUT_OPERATOR_DATABASE_URL', (db) => fn({ db, logger: stderrLogger }));
}

async function keyCommand(args: readonly string[]): Promise<void> {
  const [sub, ...rest] = args;
  if (sub === 'create') {
    const [appId = ''] = positionals(rest, 1);
    const ring = keyring();
    const kid = await withOperator((deps) =>
      createKey({ ...deps, keyring: ring }, parseUuid('app-id', appId)),
    );
    process.stdout.write(`${kid}\n`);
    return;
  }
  if (sub === 'activate' || sub === 'delete') {
    const [appId = '', kid = ''] = positionals(rest, 2);
    const action = sub === 'activate' ? activateKey : deleteKey;
    await withOperator((deps) => action(deps, parseUuid('app-id', appId), kid));
    return;
  }
  if (sub === 'list') {
    const [appId = ''] = positionals(rest, 1);
    const keys = await withOperator((deps) => listKeys(deps, parseUuid('app-id', appId)));
    for (const key of keys) {
      process.stdout.write(`${key.kid}\t${key.status}\t${key.createdAt.toISOString()}\n`);
    }
    return;
  }
  throw new UsageError((m) => m.unknown_key_command({}));
}

async function readStdinSecret(): Promise<string> {
  if (process.stdin.isTTY) throw new UsageError((m) => m.secret_stdin_tty({}));
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk as Uint8Array));
  const raw = Buffer.concat(chunks);
  for (const chunk of chunks) chunk.fill(0);
  const secret = raw.toString('utf8').trim();
  raw.fill(0);
  if (secret === '') throw new UsageError((m) => m.secret_stdin_empty({}));
  if (/[\r\n]/.test(secret)) throw new UsageError((m) => m.secret_stdin_lines({}));
  return secret;
}

async function registerCommand(args: readonly string[]): Promise<void> {
  const { values, positionals: names } = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: true,
    options: { 'client-id': { type: 'string' } },
  });
  const [provider, ...extra] = names;
  if (provider === undefined || extra.length > 0)
    throw new UsageError((m) => m.expected_one_provider({}));
  const clientId = values['client-id']?.trim();
  if (provider === 'bluesky') {
    if (clientId !== undefined) throw new UsageError((m) => m.bluesky_client_id({}));
    const publicUrl = parseBaseUrl(
      'KRONAUT_PUBLIC_URL',
      requireEnv(process.env, 'KRONAUT_PUBLIC_URL'),
    );
    const id = await withOperator((deps) => registerBluesky(deps, publicUrl));
    process.stdout.write(`${id}\n`);
    return;
  }
  if (isSecretAppProvider(provider)) {
    if (clientId === undefined || !clientIdValid(provider, clientId)) {
      const option = `--client-id <${provider} app id>`;
      throw new UsageError((m) => m.option_required({ option }));
    }
    const secret = await readStdinSecret();
    const ring = keyring();
    const id = await withOperator((deps) =>
      registerSecretApp({ ...deps, keyring: ring }, provider, clientId, secret),
    );
    process.stdout.write(`${id}\n`);
    return;
  }
  throw new UsageError((m) => m.provider_unsupported({}));
}

export async function providerAppCommand(args: readonly string[]): Promise<void> {
  const [sub, ...rest] = args;
  if (sub === 'register') {
    await registerCommand(rest);
    return;
  }
  if (sub === 'key') {
    await keyCommand(rest);
    return;
  }
  throw new UsageError((m) => m.unknown_provider_app_command({}));
}
