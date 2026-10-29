import { once } from 'node:events';
import type { FileHandle } from 'node:fs/promises';
import { link, lstat, mkdtemp, open, readdir, rm, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { createDatabase } from '@kronaut/db';
import { createLocalStore, isStorageKey } from '@kronaut/media';
import { Encrypter } from 'age-encryption';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import tar from 'tar-stream';
import type { Temporal } from 'temporal-polyfill';
import { ConfigError } from '../../config.ts';
import { CommandError } from '../errors.ts';
import {
  ARCHIVE_FORMAT,
  DUMP_NAME,
  MANIFEST_NAME,
  type Manifest,
  MEDIA_PREFIX,
} from './archive.ts';
import { type PgTools, requireMajor } from './pg-tools.ts';
import { type SpooledFile, spool } from './spool.ts';

export interface ExportDeps {
  readonly migrationUrl: string;
  readonly recipient: string;
  readonly mediaDir: string;
  readonly pg: PgTools;
  readonly now: Temporal.Instant;
  readonly logger: Logger;
}

export interface ExportResult {
  readonly path: string;
  readonly manifest: Manifest;
}

const X25519_RECIPIENT = /^age1[02-9ac-hj-np-z]{58}$/;
const SHARD = /^[0-9a-f]{2}$/;
const ENTRY_MODE = 0o600;

type Pack = ReturnType<typeof tar.pack>;
type PackHeader = Parameters<Pack['entry']>[0];

export function backupEncrypter(recipient: string): Encrypter {
  const fail = new ConfigError(
    'KRONAUT_BACKUP_RECIPIENT',
    'must be an age X25519 recipient (age1…)',
  );
  if (!X25519_RECIPIENT.test(recipient)) throw fail;
  const encrypter = new Encrypter();
  try {
    encrypter.addRecipient(recipient);
  } catch {
    throw fail;
  }
  return encrypter;
}

function isErrno(error: unknown, code: string): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === code;
}

async function refuseExisting(path: string): Promise<void> {
  try {
    await lstat(path);
  } catch (error) {
    if (isErrno(error, 'ENOENT')) return;
    throw error;
  }
  throw new CommandError((m) => m.output_exists({}));
}

async function openPartial(path: string): Promise<FileHandle> {
  try {
    return await open(path, 'wx', 0o600);
  } catch (error) {
    if (isErrno(error, 'EEXIST')) {
      throw new CommandError((m) => m.partial_exists({}));
    }
    throw error;
  }
}

async function readdirOrEmpty(path: string) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (isErrno(error, 'ENOENT')) return [];
    throw error;
  }
}

async function listMedia(mediaDir: string): Promise<string[]> {
  const keys: string[] = [];
  for (const shard of await readdirOrEmpty(mediaDir)) {
    if (!shard.isDirectory() || !SHARD.test(shard.name)) continue;
    for (const entry of await readdirOrEmpty(join(mediaDir, shard.name))) {
      if (isStorageKey(entry.name) && entry.name.startsWith(shard.name)) keys.push(entry.name);
    }
  }
  return keys.sort();
}

interface Snapshot {
  readonly schemaVersion: number;
  readonly kekVersions: number[];
}

async function dumpDatabase(
  deps: ExportDeps,
  path: string,
): Promise<{ snapshot: Snapshot; dump: SpooledFile }> {
  const db = createDatabase({
    connectionString: deps.migrationUrl,
    applicationName: 'kronaut-export',
    maxConnections: 1,
  });
  try {
    return await db.withActor({ kind: 'cli' }, async (trx) => {
      const columns = await sql<{ table_name: string; column_name: string }>`
        select c.relname as table_name, a.attname as column_name
          from pg_attribute a join pg_class c on c.oid = a.attrelid
         where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
           and not c.relispartition and a.attnum > 0 and not a.attisdropped
           and a.attname ~ 'kek_version$'
         order by 1, 2`.execute(trx);
      if (columns.rows.length === 0) throw new CommandError((m) => m.no_schema({}));
      const versions = sql.join(
        columns.rows.map(
          (column) => sql`select ${sql.ref(column.column_name)}::int as v
                            from ${sql.table(column.table_name)}`,
        ),
        sql` union `,
      );
      const result = await sql<{
        snapshot: string;
        schema_version: number | null;
        instance_started: boolean;
        kek_versions: number[];
      }>`
        select pg_export_snapshot() as snapshot,
               (select max(version) from kronaut_meta.migrations) as schema_version,
               exists (select 1 from public.instance_state) as instance_started,
               array(select v from (${versions}) k where v is not null order by v) as kek_versions
      `.execute(trx);
      const row = result.rows[0];
      if (row?.schema_version == null) throw new CommandError((m) => m.no_migrations({}));
      if (!row.instance_started) {
        throw new CommandError((m) => m.never_started({}));
      }
      const dump = await spool(path, (sink) => deps.pg.dump(deps.migrationUrl, row.snapshot, sink));
      return {
        snapshot: { schemaVersion: row.schema_version, kekVersions: row.kek_versions },
        dump,
      };
    });
  } finally {
    await db.destroy();
  }
}

async function addEntry(
  pack: Pack,
  header: PackHeader,
  source: AsyncIterable<Uint8Array | string>,
): Promise<void> {
  let sink: ReturnType<Pack['entry']> | undefined;
  const done = new Promise<void>((resolveEntry, reject) => {
    sink = pack.entry(header, (error) => (error ? reject(error) : resolveEntry()));
  });
  if (sink === undefined) throw new Error('tar entry was not created');
  for await (const chunk of source) {
    if (!sink.write(chunk)) await once(sink, 'drain');
  }
  sink.end(undefined);
  await done;
}

async function* single(bytes: Uint8Array): AsyncGenerator<Uint8Array> {
  yield bytes;
}

type MediaCounts = Manifest['media'];

interface ArchiveContents {
  readonly mtime: Date;
  readonly dump: SpooledFile;
  readonly mediaDir: string;
  manifestFor(media: MediaCounts): Manifest;
}

async function writeArchive(
  handle: FileHandle,
  encrypter: Encrypter,
  contents: ArchiveContents,
): Promise<Manifest> {
  const { mtime, dump, mediaDir } = contents;
  const pack = tar.pack();
  const ciphertext = await encrypter.encrypt(
    ReadableStream.from(pack as AsyncIterable<Uint8Array>),
  );
  const written = pipeline(
    Readable.fromWeb(ciphertext as WebReadableStream<Uint8Array>),
    handle.createWriteStream({ flush: true }),
  );
  const entry = (name: string, size: number): PackHeader => ({
    name,
    size,
    mode: ENTRY_MODE,
    mtime,
    type: 'file',
  });
  const produced = (async () => {
    await addEntry(pack, entry(DUMP_NAME, dump.size), dump.read());
    const store = createLocalStore(mediaDir);
    const media: MediaCounts = { files: 0, bytes: 0, skipped: 0 };
    for (const key of await listMedia(mediaDir)) {
      const opened = await store.open(key);
      if (opened === null) {
        media.skipped += 1;
        continue;
      }
      try {
        await addEntry(
          pack,
          entry(`${MEDIA_PREFIX}${key}`, opened.size),
          opened.stream as AsyncIterable<Uint8Array>,
        );
      } finally {
        (opened.stream as Readable).destroy();
      }
      media.files += 1;
      media.bytes += opened.size;
    }
    const manifest = contents.manifestFor(media);
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await addEntry(pack, entry(MANIFEST_NAME, manifestBytes.byteLength), single(manifestBytes));
    pack.finalize();
    return manifest;
  })();
  const fail = (error: unknown): never => {
    pack.destroy(error as Error);
    throw error;
  };
  const [manifest] = await Promise.all([produced.catch(fail), written.catch(fail)]);
  return manifest;
}

export async function exportArchive(deps: ExportDeps, out: string): Promise<ExportResult> {
  const encrypter = backupEncrypter(deps.recipient);
  const target = resolve(out);
  const partial = `${target}.partial`;
  await refuseExisting(target);
  await requireMajor(deps.pg, 'pg_dump');
  const handle = await openPartial(partial);
  const work = await mkdtemp(join(dirname(target), '.kronaut-export-'));
  let finished = false;
  try {
    const { snapshot, dump } = await dumpDatabase(deps, join(work, DUMP_NAME));
    const manifest = await writeArchive(handle, encrypter, {
      mtime: new Date(deps.now.epochMilliseconds),
      dump,
      mediaDir: deps.mediaDir,
      manifestFor: (media) => ({
        format: ARCHIVE_FORMAT,
        created_at: deps.now.toString({ smallestUnit: 'millisecond' }),
        schema_version: snapshot.schemaVersion,
        kek_versions: snapshot.kekVersions,
        media,
      }),
    });
    try {
      await link(partial, target);
    } catch (error) {
      if (isErrno(error, 'EEXIST')) throw new CommandError((m) => m.output_exists({}));
      throw error;
    }
    finished = true;
    await unlink(partial);
    deps.logger.info(
      {
        file: target,
        schema_version: manifest.schema_version,
        kek_versions: manifest.kek_versions,
        media: manifest.media,
      },
      'export complete',
    );
    return { path: target, manifest };
  } finally {
    await handle.close().catch(() => undefined);
    await rm(work, { recursive: true, force: true });
    if (!finished) await rm(partial, { force: true });
  }
}
