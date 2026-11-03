import { execFile } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createKeyring } from '@kronaut/credentials';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { generateIdentity, identityToRecipient } from 'age-encryption';
import { sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { importArchive } from './backup/import.ts';
import { type PgLauncher, spawnPgTools } from './backup/pg-tools.ts';
import { runBackup } from './backup/run.ts';
import { release, restoreComplete } from './instance.ts';

const IMAGE = 'postgres:17-alpine';
const SYSTEM: Actor = { kind: 'system' };
const NOW = Temporal.Instant.from('2026-10-23T09:30:00Z');

const execFileAsync = promisify(execFile);
const dockerArgs = ['run', '--rm', '-i', '--add-host=host.docker.internal:host-gateway'];

function dockerHost(dbname: string): string {
  const url = new URL(dbname);
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    url.hostname = 'host.docker.internal';
  }
  return url.toString();
}

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

function withDb(url: string, dbname: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${dbname}`;
  return parsed.toString();
}

async function createEmptyDatabase(url: string, name: string): Promise<void> {
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
      `create database ${name}`,
    ],
    { env: { ...process.env, PGPASSWORD: password } },
  );
}

let test: TestDatabase;
let work: string;
const logger = pino({ level: 'silent' });
const pg = spawnPgTools(dockerLauncher);

beforeAll(async () => {
  test = await startTestDatabase();
  work = await mkdtemp(join(tmpdir(), 'kronaut-backup-run-'));
  await createEmptyDatabase(test.ownerUrl, 'restored');
});

afterAll(async () => {
  await test?.stop();
  if (work !== undefined) await rm(work, { recursive: true, force: true });
});

async function instanceState(db: Database) {
  return await db.withActor(SYSTEM, async (trx) => {
    const result = await sql<{
      restore_epoch: number;
      publishing_paused: boolean;
      paused_reason: string | null;
      instance_id: string;
    }>`select restore_epoch, publishing_paused, paused_reason, instance_id from instance_state`.execute(
      trx,
    );
    return result.rows;
  });
}

describe('kronaut backup run', () => {
  it('writes a rotated archive that restores through quarantine to release', async () => {
    const sourceId = randomUUID();
    const app = createDatabase({ connectionString: test.appUrl });
    try {
      await app.withActor(SYSTEM, (trx) =>
        sql`select instance_fence(${sourceId}::uuid)`.execute(trx),
      );
      await app.withActor(SYSTEM, (trx) =>
        sql`select auth_create_user('run@example.test', 'run@example.test', 'Run', 'hash', 'en')`.execute(
          trx,
        ),
      );
    } finally {
      await app.destroy();
    }

    const dir = join(work, 'backups');
    await mkdir(dir);
    const existing = [
      'kronaut-20260601T033000Z.age',
      ...Array.from({ length: 7 }, (_, i) => `kronaut-202610${16 + i}T033000Z.age`),
      'notes.txt',
    ];
    for (const name of existing) await writeFile(join(dir, name), '');
    const identity = await generateIdentity();
    const path = await runBackup(
      {
        migrationUrl: test.ownerUrl,
        recipient: await identityToRecipient(identity),
        mediaDir: join(work, 'no-media'),
        pg,
        now: NOW,
        logger,
      },
      dir,
    );
    expect(path).toBe(join(dir, 'kronaut-20261023T093000Z.age'));
    expect((await readdir(dir)).sort()).toEqual(
      [
        'kronaut-20260601T033000Z.age',
        ...Array.from({ length: 6 }, (_, i) => `kronaut-202610${17 + i}T033000Z.age`),
        'kronaut-20261023T093000Z.age',
        'notes.txt',
      ].sort(),
    );

    const identityFile = join(work, 'identity.txt');
    await writeFile(identityFile, `${identity}\n`, { mode: 0o600 });
    const { epoch } = await importArchive(
      {
        migrationUrl: withDb(test.ownerUrl, 'restored'),
        mediaDir: join(work, 'restored-media'),
        keyring: createKeyring(new Map([[1, randomBytes(32)]])),
        pg,
        logger,
      },
      path,
      identityFile,
    );

    const operator = createDatabase({ connectionString: withDb(test.operatorUrl, 'restored') });
    const owner = createDatabase({ connectionString: withDb(test.ownerUrl, 'restored') });
    try {
      expect(await instanceState(owner)).toEqual([
        {
          restore_epoch: epoch,
          publishing_paused: true,
          paused_reason: 'restore_quarantine',
          instance_id: sourceId,
        },
      ]);
      const users = await owner.withActor(
        SYSTEM,
        async (trx) => (await sql<{ email: string }>`select email from users`.execute(trx)).rows,
      );
      expect(users).toEqual([{ email: 'run@example.test' }]);

      expect(await restoreComplete({ db: operator, logger })).toBe(epoch + 1);
      expect(await instanceState(owner)).toMatchObject([
        { publishing_paused: true, paused_reason: 'restore_quarantine' },
      ]);
      const releasedId = randomUUID();
      await release({ db: operator, logger }, releasedId);
      expect(await instanceState(owner)).toEqual([
        {
          restore_epoch: epoch + 1,
          publishing_paused: false,
          paused_reason: null,
          instance_id: releasedId,
        },
      ]);
    } finally {
      await operator.destroy();
      await owner.destroy();
    }
  });
});
