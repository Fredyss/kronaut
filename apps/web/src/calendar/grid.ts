import type { Temporal } from 'temporal-polyfill';
import type { Entry } from './entries.ts';
import type { Formats } from './formats.ts';
import type { Mover } from './use-mover.ts';

export const DROP_OVER = 'outline-2 outline-dashed outline-ring bg-accent/60';

export const CELL = 'rounded-md border';

export const PAST = 'hatch-past bg-muted/40';

export interface GridProps {
  readonly days: readonly Temporal.PlainDate[];
  readonly entries: Map<string, Entry[]>;
  readonly formats: Formats;
  readonly current: Temporal.PlainDate;
  readonly now: string;
  readonly clock: Temporal.Instant;
  readonly mover: Mover;
}
