import { execFile, spawn } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createKeyring, type Keyring } from '@kronaut/credentials';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { createLocalStore, storageKey } from '@kronaut/media';
import { Decrypter, Encrypter, generateIdentity, identityToRecipient } from 'age-encryption';
import { type RawBuilder, sql } from 'kysely';
import { pino } from 'pino';
import tar from 'tar-stream';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadCredential, saveCredential, sealAppSecret } from '../credential-store.ts';
import { type ExportResult, exportArchive } from './backup/export.ts';
import { type ImportDeps, importArchive } from './backup/import.ts';
import { type PgLauncher, type PgTools, spawnPgTools } from './backup/pg-tools.ts';

const IMAGE = 'postgres:17-alpine';
const SYSTEM: Actor = { kind: 'system' };
const NOW = Temporal.Instant.from('2026-10-23T09:30:00Z');
const BAD_KEY = `${'cd'.repeat(32)}.png`;

const execFileAsync = promisify(execFile);

function dockerHost(dbname: string): string {
  const url = new URL(dbname);
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    url.hostname = 'host.docker.internal';
  }
  return url.toString();
}

const dockerArgs = ['run', '--rm', '-i', '--add-host=host.docker.internal:host-gateway'];

const dockerLauncher: PgLauncher = (tool, args, dbname) => [
  'docker',
  [
    ...dockerArgs,
    '-e',
    'PGPASSWORD',
    IMAGE,
    tool,
    ...args,
    ...(dbname === undefined ? [] : ['--dbname', dockerHost(dbname)]),
  ],
];

async function psql(url: string, command: string): Promise<void> {
  const target = new URL(url);
  const password = decodeURIComponent(target.password);
  target.password = '';
  await execFileAsync(
    'docker',
    [
      ...dockerArgs,
      '-e',
      'PGPASSWORD',
      IMAGE,
      'psql',
      dockerHost(target.toString()),
      '-c',
      command,
    ],
    { env: { ...process.env, PGPASSWORD: password } },
  );
}

async function dumpToSql(dump: Buffer): Promise<string> {
  const child = spawn('docker', [...dockerArgs, IMAGE, 'pg_restore', '--file=-'], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  const chunks: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
  const exited = new Promise<number | null>((resolve) => child.once('close', resolve));
  child.stdin.end(dump);
  expect(await exited).toBe(0);
  return Buffer.concat(chunks).toString('utf8');
}

function withDb(url: string, dbname: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${dbname}`;
  return parsed.toString();
}

async function rows<T>(db: Database, query: RawBuilder<T>): Promise<T[]> {
  return await db.withActor(SYSTEM, async (trx) => (await query.execute(trx)).rows);
}

async function publicTables(url: string): Promise<number> {
  const db = createDatabase({ connectionString: url });
  try {
    const [row] = await rows(
      db,
      sql<{ n: number }>`
        select count(*)::int as n from pg_class
         where relnamespace = 'public'::regnamespace and relkind in ('r', 'p')`,
    );
    return row?.n ?? -1;
  } finally {
    await db.destroy();
  }
}

async function decryptAll(file: string, identity: string): Promise<Buffer> {
  const decrypter = new Decrypter();
  decrypter.addIdentity(identity);
  return Buffer.from(await decrypter.decrypt(await readFile(file)));
}

async function untar(bytes: Buffer): Promise<Map<string, Buffer>> {
  const entries = new Map<string, Buffer>();
  const extract = tar.extract();
  extract.end(bytes);
  for await (const entry of extract) {
    const chunks: Buffer[] = [];
    for await (const chunk of entry) chunks.push(chunk as Buffer);
    entries.set(entry.header.name, Buffer.concat(chunks));
  }
  return entries;
}

async function packTar(
  entries: { name: string; body: Buffer; type?: 'file' | 'symlink'; linkname?: string }[],
): Promise<Buffer> {
  const pack = tar.pack();
  for (const entry of entries) {
    pack.entry(
      {
        name: entry.name,
        type: entry.type ?? 'file',
        size: entry.type === 'symlink' ? 0 : entry.body.byteLength,
        ...(entry.linkname === undefined ? {} : { linkname: entry.linkname }),
      },
      entry.body,
    );
  }
  pack.finalize();
  const chunks: Buffer[] = [];
  for await (const chunk of pack) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

let test: TestDatabase;
let owner: Database;
let app: Database;
let operator: Database;
let keyring: Keyring;
let kek: Buffer;
let identity: string;
let recipient: string;
let work: string;
let identityFile: string;
let exported: ExportResult;
let workspaceId: string;
let accountId: string;
let postId: string;
let userId: string;
let sourceEpoch: number;
const canary = `CANARY_${randomBytes(12).toString('hex')}`;
const kronautSecret = randomBytes(32).toString('base64url');
const media = new Map<string, Buffer>();
const logLines: string[] = [];
const logger = pino({ base: null }, { write: (line: string) => logLines.push(line) });
const pg = spawnPgTools(dockerLauncher);

function importDeps(dbname: string, overrides: Partial<ImportDeps> = {}): ImportDeps {
  return {
    migrationUrl: withDb(test.ownerUrl, dbname),
    mediaDir: join(work, `media-${dbname}-${randomUUID()}`),
    keyring,
    pg,
    logger,
    ...overrides,
  };
}

async function seed(): Promise<void> {
  const appId = randomUUID();
  await operator.withActor({ kind: 'cli' }, (trx) =>
    trx
      .insertInto('provider_apps')
      .values({
        id: appId,
        provider: 'bluesky',
        client_id: 'client-1',
        ...sealAppSecret(keyring, appId, 'bluesky', `${canary}-app`),
      })
      .execute(),
  );
  await app.withActor(SYSTEM, (trx) =>
    sql`select instance_fence(${randomUUID()}::uuid)`.execute(trx),
  );
  userId = await app.withActor(SYSTEM, async (trx) => {
    const result = await sql<{ id: string }>`
      select auth_create_user('backup@example.test', 'backup@example.test', 'Backup', 'hash', 'en') as id
    `.execute(trx);
    return result.rows[0]?.id ?? '';
  });
  const actor: Actor = { kind: 'user', id: userId };
  workspaceId = await app.withActor(actor, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Org', 'Workspace', 'ws-backup', 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
  await app.withTenant(workspaceId, actor, async (trx) => {
    accountId = (
      await trx
        .insertInto('social_accounts')
        .values({
          workspace_id: workspaceId,
          provider: 'bluesky',
          provider_app_id: appId,
          provider_account_id: 'did:plc:backup',
          account_kind: 'profile',
          display_name: 'Account',
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    ).id;
    await saveCredential(trx, keyring, {
      workspaceId,
      socialAccountId: accountId,
      kind: 'oauth',
      value: { accessToken: canary, refreshToken: `${canary}-refresh` },
      grantedScopes: ['atproto'],
    });
    postId = (
      await trx
        .insertInto('posts')
        .values({
          workspace_id: workspaceId,
          title: 'Survives a restore',
          origin: 'cli',
          created_by_user_id: userId,
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    ).id;
  });
  const store = createLocalStore(join(work, 'source-media'));
  for (const [ext, size] of [
    ['jpg', 70_000],
    ['png', 1_234],
  ] as const) {
    const bytes = randomBytes(size);
    const key = storageKey(workspaceId, createHash('sha256').update(bytes).digest(), ext);
    await store.put(key, bytes);
    media.set(key, bytes);
  }
  const [state] = await rows(
    owner,
    sql<{ restore_epoch: number }>`select restore_epoch from instance_state`,
  );
  sourceEpoch = state?.restore_epoch ?? -1;
}

beforeAll(async () => {
  test = await startTestDatabase();
  owner = createDatabase({ connectionString: test.ownerUrl });
  app = createDatabase({ connectionString: test.appUrl });
  operator = createDatabase({ connectionString: test.operatorUrl });
  kek = randomBytes(32);
  keyring = createKeyring(new Map([[1, kek]]));
  work = await mkdtemp(join(tmpdir(), 'kronaut-backup-'));
  identity = await generateIdentity();
  recipient = await identityToRecipient(identity);
  identityFile = join(work, 'identity.txt');
  await writeFile(identityFile, `# backup identity\n${identity}\n`, { mode: 0o600 });
  await seed();
  for (const name of ['restored', 'empty', 'atomic', 'rebound'])
    await psql(test.ownerUrl, `create database ${name}`);

  const previous = process.env.KRONAUT_SECRET;
  process.env.KRONAUT_SECRET = kronautSecret;
  try {
    exported = await exportArchive(
      {
        migrationUrl: test.ownerUrl,
        recipient,
        mediaDir: join(work, 'source-media'),
        pg,
        now: NOW,
        logger,
      },
      join(work, 'backup.age'),
    );
  } finally {
    if (previous === undefined) delete process.env.KRONAUT_SECRET;
    else process.env.KRONAUT_SECRET = previous;
  }
});

afterAll(async () => {
  await owner?.destroy();
  await app?.destroy();
  await operator?.destroy();
  await test?.stop();
  if (work !== undefined) await rm(work, { recursive: true, force: true });
});

describe('kronaut export / import', () => {
  it('round-trips the database and media into an empty target and quarantines it', async () => {
    expect((await stat(exported.path)).mode & 0o777).toBe(0o600);
    expect(existsSync(`${exported.path}.partial`)).toBe(false);
    expect(exported.manifest).toMatchObject({
      format: 1,
      created_at: '2026-10-23T09:30:00.000Z',
      schema_version: 6,
      kek_versions: [1],
      media: { files: 2, bytes: 71_234, skipped: 0 },
    });
    await expect(
      exportArchive(
        { migrationUrl: test.ownerUrl, recipient, mediaDir: work, pg, now: NOW, logger },
        exported.path,
      ),
    ).rejects.toThrow('already exists');

    const deps = importDeps('restored');
    const result = await importArchive(deps, exported.path, identityFile);
    expect(result.epoch).toBe(sourceEpoch + 1);

    const restoredOwner = createDatabase({ connectionString: deps.migrationUrl });
    const restoredApp = createDatabase({ connectionString: withDb(test.appUrl, 'restored') });
    try {
      expect(await rows(restoredOwner, sql`select title from posts where id = ${postId}`)).toEqual([
        { title: 'Survives a restore' },
      ]);
      expect(
        await rows(
          restoredOwner,
          sql`select restore_epoch, publishing_paused, paused_reason from instance_state`,
        ),
      ).toEqual([
        {
          restore_epoch: sourceEpoch + 1,
          publishing_paused: true,
          paused_reason: 'restore_quarantine',
        },
      ]);
      const credential = await restoredApp.withTenant(
        workspaceId,
        { kind: 'user', id: userId },
        (trx) =>
          loadCredential(trx, keyring, { workspaceId, socialAccountId: accountId, kind: 'oauth' }),
      );
      expect(credential?.value).toEqual({ accessToken: canary, refreshToken: `${canary}-refresh` });
    } finally {
      await restoredOwner.destroy();
      await restoredApp.destroy();
    }
    const store = createLocalStore(deps.mediaDir);
    for (const [key, bytes] of media) {
      const opened = await store.open(key);
      const chunks: Buffer[] = [];
      for await (const chunk of opened?.stream ?? []) chunks.push(chunk as Buffer);
      expect(Buffer.concat(chunks).equals(bytes)).toBe(true);
    }
  });

  it('refuses a target database that already holds the schema and leaves it unchanged', async () => {
    const fingerprint = sql<{ posts: number; epoch: number; events: number }>`
      select (select count(*)::int from posts) as posts,
             (select restore_epoch from instance_state) as epoch,
             (select count(*)::int from security_events) as events`;
    const before = await rows(owner, fingerprint);
    const deps = importDeps('test', { migrationUrl: test.ownerUrl });
    await expect(importArchive(deps, exported.path, identityFile)).rejects.toThrow(
      'the target database is not empty',
    );
    expect(await rows(owner, fingerprint)).toEqual(before);
    expect(existsSync(deps.mediaDir)).toBe(false);
  });

  it('refuses before restoring when the keyring lacks a KEK version from the manifest', async () => {
    const deps = importDeps('empty', {
      keyring: createKeyring(new Map([[2, randomBytes(32)]])),
    });
    await expect(importArchive(deps, exported.path, identityFile)).rejects.toThrow(
      'the keyring lacks KEK version 1',
    );
    expect(await publicTables(deps.migrationUrl)).toBe(0);
    expect(existsSync(deps.mediaDir)).toBe(false);
  });

  it('aborts on any entry outside the whitelist without writing a file', async () => {
    const entries = await untar(await decryptAll(exported.path, identity));
    const dump = entries.get('db.dump') ?? Buffer.alloc(0);
    const outside = join(tmpdir(), `kronaut-zip-slip-${randomUUID()}`);
    const cases = [
      { name: 'media/../../x', body: Buffer.from('pwned') },
      { name: '../x', body: Buffer.from('pwned') },
      { name: outside, body: Buffer.from('pwned') },
      {
        name: `media/${BAD_KEY}`,
        body: Buffer.alloc(0),
        type: 'symlink' as const,
        linkname: outside,
      },
      { name: 'notes.txt', body: Buffer.from('pwned') },
    ];
    const encrypter = new Encrypter();
    encrypter.addRecipient(recipient);
    for (const [index, bad] of cases.entries()) {
      const manifest = {
        ...exported.manifest,
        media: { files: 1, bytes: bad.type === 'symlink' ? 0 : bad.body.byteLength, skipped: 0 },
      };
      const archive = await packTar([
        { name: 'db.dump', body: dump },
        bad,
        { name: 'manifest.json', body: Buffer.from(JSON.stringify(manifest)) },
      ]);
      const root = join(work, `slip-${index}`);
      const sandbox = join(root, 'data');
      await mkdir(sandbox, { recursive: true });
      const file = join(work, `slip-${index}.age`);
      await writeFile(file, await encrypter.encrypt(archive));
      const deps = importDeps('empty', { mediaDir: join(sandbox, 'media') });
      await expect(importArchive(deps, file, identityFile)).rejects.toThrow(
        /outside the whitelist|non-regular entry/,
      );
      expect(await readdir(root)).toEqual(['data']);
      expect(await readdir(sandbox)).toEqual([]);
      expect(existsSync(outside)).toBe(false);
      expect(await publicTables(deps.migrationUrl)).toBe(0);
    }
  });

  it('rolls the whole restore back when the appended quarantine fails', async () => {
    const breaking: PgTools = {
      ...pg,
      restore: (connection, source, trailer) =>
        pg.restore(connection, source, `DELETE FROM public.instance_state;\n${trailer}`),
    };
    const deps = importDeps('atomic', { pg: breaking });
    await expect(importArchive(deps, exported.path, identityFile)).rejects.toThrow(
      'psql failed: instance_state missing',
    );
    expect(await publicTables(deps.migrationUrl)).toBe(0);
    expect(existsSync(deps.mediaDir)).toBe(false);
  });

  it('restores the archive it validated, and stops if that file changes between passes', async () => {
    const between = (fn: () => void): Keyring => ({
      ...keyring,
      versions: () => {
        fn();
        return keyring.versions();
      },
    });
    const grown = join(work, 'grown.age');
    await copyFile(exported.path, grown);
    const refused = importDeps('rebound', {
      keyring: between(() => appendFileSync(grown, 'x')),
    });
    await expect(importArchive(refused, grown, identityFile)).rejects.toThrow(
      'the archive changed while it was being imported',
    );
    expect(await publicTables(refused.migrationUrl)).toBe(0);

    const dir = join(work, 'bound');
    const bound = join(dir, 'backup.age');
    await mkdir(dir);
    await copyFile(exported.path, bound);
    const deps = importDeps('rebound', {
      keyring: between(() => {
        renameSync(dir, `${dir}-moved`);
        mkdirSync(dir);
        writeFileSync(bound, randomBytes(4096));
      }),
    });
    const result = await importArchive(deps, bound, identityFile);
    expect(result.epoch).toBe(sourceEpoch + 1);
    expect(existsSync(`${dir}-moved`)).toBe(true);
    const restored = createDatabase({ connectionString: deps.migrationUrl });
    try {
      expect(await rows(restored, sql`select title from posts where id = ${postId}`)).toEqual([
        { title: 'Survives a restore' },
      ]);
    } finally {
      await restored.destroy();
    }
  });

  it('fails clearly with the wrong identity', async () => {
    const other = join(work, 'other-identity.txt');
    await writeFile(other, `${await generateIdentity()}\n`, { mode: 0o600 });
    const deps = importDeps('empty');
    await expect(importArchive(deps, exported.path, other)).rejects.toThrow(
      'cannot decrypt the archive: wrong identity or not an age file',
    );
    expect(await publicTables(deps.migrationUrl)).toBe(0);
  });

  it('keeps keys, secrets, the identity and credential plaintext out of the archive and logs', async () => {
    const plain = await decryptAll(exported.path, identity);
    const entries = await untar(plain);
    expect([...entries.keys()]).toEqual([
      'db.dump',
      ...[...media.keys()].sort().map((key) => `media/${key}`),
      'manifest.json',
    ]);
    const script = await dumpToSql(entries.get('db.dump') ?? Buffer.alloc(0));
    expect(script).toContain('Survives a restore');
    expect(script).toContain('did:plc:backup');
    const haystacks = [plain.toString('latin1'), script, logLines.join('\n')];
    const needles = [
      kek.toString('latin1'),
      kek.toString('base64'),
      kek.toString('base64url'),
      kek.toString('hex'),
      kronautSecret,
      identity,
      canary,
    ];
    expect(logLines.length).toBeGreaterThan(0);
    for (const haystack of haystacks) {
      for (const needle of needles) expect(haystack.includes(needle)).toBe(false);
    }
  });
});
