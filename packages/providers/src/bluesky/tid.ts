import { randomInt } from 'node:crypto';
import type { Temporal } from 'temporal-polyfill';

const ALPHABET = '234567abcdefghijklmnopqrstuvwxyz';
const LENGTH = 13;
const CLOCK_ID_BITS = 10n;
const MAX_MICROS = 1n << 53n;
const PROCESS_CLOCK_ID = randomInt(1 << Number(CLOCK_ID_BITS));

export const TID_PATTERN = /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/;

let lastMicros = -1n;

export function tid(now: Temporal.Instant, clockId = PROCESS_CLOCK_ID): string {
  let micros = now.epochNanoseconds / 1000n;
  if (micros <= lastMicros) micros = lastMicros + 1n;
  if (micros < 0n || micros >= MAX_MICROS) throw new RangeError('timestamp outside the TID range');
  lastMicros = micros;
  let value = (micros << CLOCK_ID_BITS) | BigInt(clockId);
  let out = '';
  for (let i = 0; i < LENGTH; i += 1) {
    out = ALPHABET.charAt(Number(value & 31n)) + out;
    value >>= 5n;
  }
  return out;
}
