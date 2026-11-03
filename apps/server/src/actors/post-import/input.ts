import * as z from 'zod';
import { InstantFields } from '../../base/http/params.ts';
import { DestinationsInput } from '../../flow/posts/draft/destinations.ts';
import { ItemsInput } from '../../flow/posts/draft/items.ts';

export const MAX_IMPORT_ROWS = 500;

const RowSchedule = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('instant'), ...InstantFields }),
  z.strictObject({ mode: z.literal('queue') }),
]);

const ImportRow = z.strictObject({
  items: ItemsInput,
  destinations: DestinationsInput.min(1),
  schedule: RowSchedule,
});

export const ImportInput = z.strictObject({
  rows: z.array(ImportRow).min(1).max(MAX_IMPORT_ROWS),
});

const Outcome = z.enum(['scheduled', 'requested']);

export const ImportResult = z.object({
  rows: z.array(z.object({ outcome: Outcome, postId: z.string() })),
});

export const ImportCheckResult = z.object({
  rows: z.array(z.object({ outcome: Outcome })),
});

export type ImportBody = z.output<typeof ImportInput>;
export type ImportRowBody = z.output<typeof ImportRow>;
export type RowSchedule = z.output<typeof RowSchedule>;
export type ImportOutput = z.output<typeof ImportResult>;
export type ImportCheckOutput = z.output<typeof ImportCheckResult>;
export type RowOutcome = z.output<typeof Outcome>;
