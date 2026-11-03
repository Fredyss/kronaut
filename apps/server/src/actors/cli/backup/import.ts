import type { Stats } from 'node:fs';
import { type FileHandle, open, readdir, readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import type { Keyring } from '@kronaut/credentials';
import { createDatabase, type Database } from '@kronaut/db';
import { createLocalStore } from '@kronaut/media';
import { Decrypter } from 'age-encryption';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import tar from 'tar-stream';
import { type CliText, CommandError } from '../errors.ts';
import {
  type ArchiveEntry,
  ArchiveError,
  classifyEntry,
  entryOrder,
  MANIFEST_MAX_BYTES,
  type Manifest,
  parseManifest,
} from './archive.ts';
import { type PgTools, requireMajor } from './pg-tools.ts';

export interface ImportDeps {
  readonly migrationUrl: string;
  readonly mediaDir: string;
  readonly keyring: Keyring;
  readonly pg: PgTools;
  readonly logger: Logger;
}

export interface ImportResult {
  readonly epoch: number;
  readonly manifest: Manifest;
}

type Entry = Readable & { header: tar.Header };
type Visit = (entry: ArchiveEntry, stream: Entry) => Promise<void>;

async function loadIdentity(identityFile: string): Promise<Decrypter> {
  let text: string;
  try {
    text = await readFile(identityFile, 'utf8');
  } catch {
    throw new CommandError((m) => m.identity_unreadable({}));
  }
  const decrypter = new Decrypter();
  let count = 0;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    try {
      decrypter.addIdentity(trimmed);
    } catch {
      throw new CommandError((m) => m.identity_invalid({}));
    }
    count += 1;
  }
  if (count === 0) throw new CommandError((m) => m.identity_empty({}));
  return decrypter;
}

async function drain(stream: Readable): Promise<void> {
  for await (const _chunk of stream) void _chunk;
}

async function readSmall(stream: Entry): Promise<Buffer> {
  if ((stream.header.size ?? 0) > MANIFEST_MAX_BYTES) {
    throw new ArchiveError((m) => m.manifest_too_large({}));
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

const QUARANTINE = 'SELECT public.instance_mark_restored();';

async function walkArchive(archive: FileHandle, decrypter: Decrypter, visit: Visit): Promise<void> {
  let plaintext: WebReadableStream<Uint8Array>;
  try {
    plaintext = (await decrypter.decrypt(
      ReadableStream.from(
        archive.createReadStream({ start: 0, autoClose: false }) as AsyncIterable<Uint8Array>,
      ),
    )) as WebReadableStream<Uint8Array>;
  } catch {
    throw new CommandError((m) => m.archive_undecryptable({}));
  }
  const source = Readable.fromWeb(plaintext);
  const extract = tar.extract();
  source.on('error', (error) => extract.destroy(error));
  source.pipe(extract);
  const order = entryOrder();
  try {
    for await (const stream of extract as AsyncIterable<Entry>) {
      const entry = classifyEntry(stream.header);
      order.next(entry);
      await visit(entry, stream);
      await drain(stream);
    }
  } catch (error) {
    source.destroy();
    if (error instanceof CommandError) throw error;
    throw new CommandError((m) => m.archive_corrupt({}));
  }
  order.finish();
}

async function scanArchive(
  archive: FileHandle,
  decrypter: Decrypter,
): Promise<{ manifest: Manifest; files: number; bytes: number }> {
  let manifest: Manifest | undefined;
  let files = 0;
  let bytes = 0;
  await walkArchive(archive, decrypter, async (entry, stream) => {
    if (entry.kind === 'manifest') manifest = parseManifest(await readSmall(stream));
    if (entry.kind === 'media') {
      files += 1;
      bytes += stream.header.size ?? 0;
    }
  });
  if (manifest === undefined) throw new ArchiveError((m) => m.archive_missing_manifest({}));
  return { manifest, files, bytes };
}

function checkManifest(
  scanned: { manifest: Manifest; files: number; bytes: number },
  keyring: Keyring,
): void {
  const { manifest } = scanned;
  if (manifest.media.files !== scanned.files || manifest.media.bytes !== scanned.bytes) {
    throw new ArchiveError((m) => m.archive_media_mismatch({}));
  }
  const available = new Set(keyring.versions());
  const missing = manifest.kek_versions.filter((version) => !available.has(version));
  if (missing.length > 0) {
    throw new CommandError((m, locale) =>
      m.keyring_missing({
        count: missing.length,
        versions: new Intl.ListFormat(locale).format(missing.map(String)),
      }),
    );
  }
}

async function withDatabase<T>(url: string, fn: (db: Database) => Promise<T>): Promise<T> {
  const db = createDatabase({
    connectionString: url,
    applicationName: 'kronaut-import',
    maxConnections: 1,
  });
  try {
    return await fn(db);
  } finally {
    await db.destroy();
  }
}

async function checkTarget(deps: ImportDeps): Promise<void> {
  const tables = await withDatabase(deps.migrationUrl, (db) =>
    db.withActor({ kind: 'cli' }, async (trx) => {
      const result = await sql<{ n: number }>`
        select count(*)::int as n from pg_class
         where relnamespace = 'public'::regnamespace and relkind in ('r', 'p')`.execute(trx);
      return result.rows[0]?.n ?? 0;
    }),
  );
  if (tables > 0) throw new CommandError((m) => m.target_db_not_empty({}));
  let entries: string[] = [];
  try {
    entries = await readdir(deps.mediaDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (entries.length > 0) throw new CommandError((m) => m.target_media_not_empty({}));
}

async function openArchive(file: string): Promise<{ archive: FileHandle; stats: Stats }> {
  let archive: FileHandle;
  try {
    archive = await open(file, 'r');
  } catch {
    throw new CommandError((m) => m.archive_unopenable({}));
  }
  const stats = await archive.stat();
  if (!stats.isFile()) {
    await archive.close();
    throw new CommandError((m) => m.archive_not_file({}));
  }
  return { archive, stats };
}

async function requireUnchanged(archive: FileHandle, before: Stats): Promise<void> {
  const after = await archive.stat();
  if (
    after.size !== before.size ||
    after.mtimeMs !== before.mtimeMs ||
    after.ctimeMs !== before.ctimeMs
  ) {
    throw new CommandError((m) => m.archive_changed({}));
  }
}

async function readEpoch(migrationUrl: string): Promise<number> {
  return await withDatabase(migrationUrl, (db) =>
    db.withActor({ kind: 'cli' }, async (trx) => {
      const result = await sql<{
        restore_epoch: number;
      }>`select restore_epoch from instance_state`.execute(trx);
      const row = result.rows[0];
      if (row === undefined) throw new CommandError((m) => m.restored_no_state({}));
      return row.restore_epoch;
    }),
  );
}

async function createRoles(migrationUrl: string): Promise<void> {
  await withDatabase(migrationUrl, (db) =>
    db.withActor({ kind: 'cli' }, (trx) =>
      sql`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kronaut_app') THEN
            CREATE ROLE kronaut_app NOLOGIN;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kronaut_operator') THEN
            CREATE ROLE kronaut_operator NOLOGIN;
          END IF;
        END $$`.execute(trx),
    ),
  );
}

export async function importArchive(
  deps: ImportDeps,
  file: string,
  identityFile: string,
): Promise<ImportResult> {
  const decrypter = await loadIdentity(identityFile);
  await requireMajor(deps.pg, 'pg_restore');
  await requireMajor(deps.pg, 'psql');
  await checkTarget(deps);
  const { archive, stats } = await openArchive(file);
  try {
    const scanned = await scanArchive(archive, decrypter);
    checkManifest(scanned, deps.keyring);
    await requireUnchanged(archive, stats);
    await createRoles(deps.migrationUrl);

    const store = createLocalStore(deps.mediaDir);
    let epoch: number | undefined;
    try {
      await walkArchive(archive, decrypter, async (entry, stream) => {
        if (entry.kind === 'dump') {
          await deps.pg.restore(deps.migrationUrl, Readable.from(stream), QUARANTINE);
          epoch = await readEpoch(deps.migrationUrl);
        } else if (entry.kind === 'media') {
          await store.put(entry.key, stream as AsyncIterable<Uint8Array>);
        }
      });
    } catch (error) {
      if (epoch === undefined) throw error;
      const restored = epoch;
      const reason: CliText =
        error instanceof CommandError ? error.text : (m) => m.unexpected_error({});
      throw new CommandError((m, locale) =>
        m.media_copy_failed({ epoch: restored, reason: reason(m, locale) }),
      );
    }
    if (epoch === undefined) throw new ArchiveError((m) => m.archive_missing_dump({}));
    deps.logger.info(
      {
        restore_epoch: epoch,
        schema_version: scanned.manifest.schema_version,
        media: scanned.manifest.media,
      },
      'import complete',
    );
    return { epoch, manifest: scanned.manifest };
  } finally {
    await archive.close();
  }
}
