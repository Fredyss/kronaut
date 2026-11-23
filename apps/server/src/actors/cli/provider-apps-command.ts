import { parseArgs } from 'node:util';
import { parseBaseUrl, parseUuid, requireEnv } from '../../base/config/config.ts';
import { keyring, positionals, stderrLogger, withDatabase } from './context.ts';
import { UsageError } from './errors.ts';
import {
  type AppSecrets,
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
const CLIENT_IDS: Readonly<Record<SecretAppProvider, RegExp>> = {
  discord: /^\d{17,20}$/,
  discord_bot: /^\d{17,20}$/,
  facebook: META_APP_ID,
  instagram: META_APP_ID,
  linkedin: /^[A-Za-z0-9]{1,64}$/,
  pinterest: /^\d{1,32}$/,
  threads: META_APP_ID,
  x_com: /^[A-Za-z0-9_-]{1,128}$/,
  youtube: /^[0-9]{1,32}-[a-z0-9]{1,64}\.apps\.googleusercontent\.com$/,
};

function isSecretAppProvider(provider: string): provider is SecretAppProvider {
  return Object.hasOwn(CLIENT_IDS, provider);
}

function clientIdValid(provider: SecretAppProvider, clientId: string): boolean {
  return CLIENT_IDS[provider].test(clientId);
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

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) throw new UsageError((m) => m.secret_stdin_tty({}));
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk as Uint8Array));
  const raw = Buffer.concat(chunks);
  for (const chunk of chunks) chunk.fill(0);
  const text = raw.toString('utf8').trim();
  raw.fill(0);
  if (text === '') throw new UsageError((m) => m.secret_stdin_empty({}));
  return text;
}

async function readStdinSecrets(provider: SecretAppProvider): Promise<AppSecrets> {
  const text = await readStdin();
  if (provider !== 'discord_bot') {
    if (/[\r\n]/.test(text)) throw new UsageError((m) => m.secret_stdin_lines({}));
    return { clientSecret: text };
  }
  const [clientSecret = '', botToken = '', ...rest] = text
    .split(/\r?\n/)
    .map((line) => line.trim());
  if (clientSecret === '' || botToken === '' || rest.length > 0)
    throw new UsageError((m) => m.bot_token_stdin_lines({}));
  return { clientSecret, botToken };
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
    const secrets = await readStdinSecrets(provider);
    const ring = keyring();
    const id = await withOperator((deps) =>
      registerSecretApp({ ...deps, keyring: ring }, provider, clientId, secrets),
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
