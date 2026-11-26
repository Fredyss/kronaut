const MINUTE = 60;
const HOUR = 60 * MINUTE;

const RETRY_DELAYS_SECONDS: readonly number[] = [
  MINUTE,
  5 * MINUTE,
  30 * MINUTE,
  2 * HOUR,
  5 * HOUR,
  10 * HOUR,
  10 * HOUR,
];
export const MAX_ATTEMPTS = RETRY_DELAYS_SECONDS.length + 1;
// Longer than the egress timeout, so a live send never outlasts its claim.
export const LEASE_SECONDS = 2 * MINUTE;
export const DISABLE_AFTER_DAYS = 5;

export function retryDelaySeconds(attempts: number): number | null {
  return RETRY_DELAYS_SECONDS[attempts - 1] ?? null;
}
