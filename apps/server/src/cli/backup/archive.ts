import { isStorageKey } from '@kronaut/media';
import * as z from 'zod';
import { CommandError } from '../errors.ts';

export const ARCHIVE_FORMAT = 1;
export const MANIFEST_NAME = 'manifest.json';
export const DUMP_NAME = 'db.dump';
export const MEDIA_PREFIX = 'media/';
export const MANIFEST_MAX_BYTES = 64 * 1024;

const count = z.number().int().nonnegative();

export const manifestSchema = z.strictObject({
  format: z.literal(ARCHIVE_FORMAT),
  created_at: z.iso.datetime(),
  schema_version: z.number().int().positive(),
  kek_versions: z.array(z.number().int().min(1).max(32767)),
  media: z.strictObject({ files: count, bytes: count, skipped: count }),
});

export type Manifest = z.infer<typeof manifestSchema>;

export type ArchiveEntry = { kind: 'manifest' } | { kind: 'dump' } | { kind: 'media'; key: string };

export interface EntryHeader {
  readonly name: string;
  readonly type?: string | null | undefined;
}

export class ArchiveError extends CommandError {
  constructor(message: string) {
    super(message);
    this.name = 'ArchiveError';
  }
}

export function classifyEntry(header: EntryHeader): ArchiveEntry {
  if (header.type !== 'file') throw new ArchiveError('archive holds a non-regular entry');
  if (header.name === MANIFEST_NAME) return { kind: 'manifest' };
  if (header.name === DUMP_NAME) return { kind: 'dump' };
  if (header.name.startsWith(MEDIA_PREFIX)) {
    const key = header.name.slice(MEDIA_PREFIX.length);
    if (isStorageKey(key)) return { kind: 'media', key };
  }
  throw new ArchiveError('archive holds an entry outside the whitelist');
}

export interface EntryOrder {
  next(entry: ArchiveEntry): void;
  finish(): void;
}

export function entryOrder(): EntryOrder {
  let stage: 'dump' | 'body' | 'done' = 'dump';
  const keys = new Set<string>();
  return {
    next(entry) {
      if (stage === 'done') throw new ArchiveError('manifest.json must be the last entry');
      if (stage === 'dump') {
        if (entry.kind !== 'dump') throw new ArchiveError('db.dump must be the first entry');
        stage = 'body';
        return;
      }
      if (entry.kind === 'manifest') {
        stage = 'done';
        return;
      }
      if (entry.kind !== 'media') throw new ArchiveError('archive repeats db.dump');
      if (keys.has(entry.key)) throw new ArchiveError('archive repeats a media entry');
      keys.add(entry.key);
    },
    finish() {
      if (stage !== 'done') throw new ArchiveError('archive is missing db.dump or manifest.json');
    },
  };
}

export function parseManifest(bytes: Uint8Array): Manifest {
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch {
    throw new ArchiveError('manifest.json is not valid JSON');
  }
  const parsed = manifestSchema.safeParse(raw);
  if (!parsed.success) throw new ArchiveError('manifest.json is not a format 1 manifest');
  return parsed.data;
}
