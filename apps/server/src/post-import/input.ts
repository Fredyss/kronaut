import * as z from 'zod';
import { InstantFields } from '../http/params.ts';
import { DestinationsInput } from '../posts/draft/destinations.ts';
import { ItemsInput } from '../posts/draft/items.ts';

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
  dryRun: z.boolean().optional(),
  rows: z.array(ImportRow).min(1).max(MAX_IMPORT_ROWS),
});

export const ImportResult = z.object({
  rows: z.array(
    z.object({
      outcome: z.enum(['scheduled', 'requested']),
      postId: z.string().nullable(),
    }),
  ),
});

export type ImportBody = z.output<typeof ImportInput>;
export type ImportRowBody = z.output<typeof ImportRow>;
export type RowSchedule = z.output<typeof RowSchedule>;
export type ImportOutput = z.output<typeof ImportResult>;
export type RowOutcome = ImportOutput['rows'][number]['outcome'];
