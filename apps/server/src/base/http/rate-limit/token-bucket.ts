import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';

export interface Bucket {
  readonly key: string;
  readonly perMinute: number;
}

export type Take =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterSeconds: number };

const SECONDS_PER_MINUTE = 60;

// now() is the transaction start, and the upsert's row lock can order an older transaction after a newer
// one, so the elapsed time is floored at zero and updated_at never moves back.
export async function takeToken(trx: TenantDb, { key, perMinute }: Bucket): Promise<Take> {
  const refilled = await sql<{ tokens: string }>`
    insert into rate_buckets as b (key, kind, capacity, tokens, refill_per_sec)
    values (${key}, 'token_bucket', ${perMinute}, ${perMinute}, ${perMinute}::numeric / 60)
    on conflict (key) do update set
      tokens = least(excluded.capacity,
        b.tokens + greatest(0, extract(epoch from now() - b.updated_at)) * excluded.refill_per_sec),
      capacity = excluded.capacity,
      refill_per_sec = excluded.refill_per_sec,
      updated_at = greatest(b.updated_at, now())
    returning b.tokens
  `.execute(trx);
  const tokens = Number(refilled.rows[0]?.tokens ?? 0);
  if (tokens >= 1) {
    await sql`update rate_buckets set tokens = tokens - 1 where key = ${key}`.execute(trx);
    return { allowed: true };
  }
  const perSecond = perMinute / SECONDS_PER_MINUTE;
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((1 - tokens) / perSecond)) };
}
