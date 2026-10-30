import type { Temporal } from 'temporal-polyfill';

export function toDate(instant: Temporal.Instant): Date {
  return new Date(instant.epochMilliseconds);
}

export function toDateOrNull(instant: Temporal.Instant | undefined): Date | null {
  return instant === undefined ? null : toDate(instant);
}
