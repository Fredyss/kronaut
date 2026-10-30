import type { Temporal } from 'temporal-polyfill';

export function toDate(instant: Temporal.Instant): Date {
  return new Date(instant.epochMilliseconds);
}

export function toDateOrNull(instant: Temporal.Instant | undefined): Date | null {
  return instant === undefined ? null : toDate(instant);
}

export type TzResolution = 'exact' | 'gap_forward' | 'overlap_earlier';

export interface Schedule {
  readonly local: Temporal.PlainDateTime;
  readonly tz: string;
  readonly at: Temporal.Instant;
  readonly resolution: TzResolution;
}

export function resolveLocal(local: Temporal.PlainDateTime, tz: string): Schedule {
  const zoned = local.toZonedDateTime(tz, { disambiguation: 'compatible' });
  let resolution: TzResolution = 'exact';
  if (!zoned.toPlainDateTime().equals(local)) {
    resolution = 'gap_forward';
  } else if (
    local.toZonedDateTime(tz, { disambiguation: 'later' }).epochNanoseconds !==
    zoned.epochNanoseconds
  ) {
    resolution = 'overlap_earlier';
  }
  return {
    local: zoned.toPlainDateTime(),
    tz: zoned.timeZoneId,
    at: zoned.toInstant(),
    resolution,
  };
}

export function scheduleAt(at: Temporal.Instant, tz: string): Schedule {
  const zoned = at.toZonedDateTimeISO(tz);
  return { local: zoned.toPlainDateTime(), tz: zoned.timeZoneId, at, resolution: 'exact' };
}
