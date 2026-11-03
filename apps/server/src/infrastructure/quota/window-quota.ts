import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';

export interface WindowQuota {
  readonly key: string;
  readonly capacity: number;
  readonly windowSeconds: number;
}

export async function takeWindowQuota(
  trx: TenantDb,
  { key, capacity, windowSeconds }: WindowQuota,
): Promise<boolean> {
  const result = await sql<{ key: string }>`
    insert into rate_buckets as b (key, kind, capacity, tokens, window_start, window_secs)
    values (${key}, 'window_quota', ${capacity}, ${capacity - 1}, now(), ${windowSeconds})
    on conflict (key) do update set
      tokens = case when b.window_start + make_interval(secs => b.window_secs) <= now()
                    then excluded.capacity - 1 else b.tokens - 1 end,
      window_start = case when b.window_start + make_interval(secs => b.window_secs) <= now()
                          then now() else b.window_start end,
      capacity = excluded.capacity,
      window_secs = excluded.window_secs,
      updated_at = now()
    where b.window_start + make_interval(secs => b.window_secs) <= now() or b.tokens >= 1
    returning b.key
  `.execute(trx);
  return result.rows.length === 1;
}
