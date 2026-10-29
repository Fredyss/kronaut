import type { PostMetric, PostMetrics } from '@kronaut/core';
import * as z from 'zod';
import { countOf } from './analytics.ts';
import { toProviderFailure } from './failure.ts';

const entry = z.looseObject({
  name: z.string(),
  values: z
    .array(z.looseObject({ value: z.unknown() }))
    .optional()
    .catch(undefined),
  total_value: z.looseObject({ value: z.unknown() }).optional().catch(undefined),
});

export const insights = z.looseObject({ data: z.array(z.unknown()) });
export type Insights = z.infer<typeof insights>;

export type InsightNames = Readonly<Record<string, PostMetric>>;

export function insightValue(body: Insights | undefined, name: string): number | null {
  for (const item of body?.data ?? []) {
    const parsed = entry.safeParse(item).data;
    if (parsed?.name !== name) continue;
    return countOf(parsed.total_value?.value ?? parsed.values?.at(-1)?.value);
  }
  return null;
}

export function insightMetrics(body: Insights | undefined, names: InsightNames): PostMetrics {
  return Object.fromEntries(
    Object.entries(names).map(([name, metric]) => [metric, insightValue(body, name)]),
  );
}

// Meta's insight errors are mostly undocumented (codes 10, 100, 200, …); only a channel-wide stop may cost the post its basic counts.
export async function insightsOrNone(read: () => Promise<Insights>): Promise<Insights | undefined> {
  try {
    return await read();
  } catch (error) {
    const { kind } = toProviderFailure(error, 'none').error;
    if (kind === 'permanent' || kind === 'transient') return undefined;
    throw error;
  }
}
