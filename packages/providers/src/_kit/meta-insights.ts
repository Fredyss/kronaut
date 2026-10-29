import type { PostMetric, PostMetrics, ProviderError } from '@kronaut/core';
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

const NO_DATA_CODES = new Set(['10', '200']);

function noData(error: ProviderError): boolean {
  if (error.kind !== 'permanent') return false;
  return NO_DATA_CODES.has(error.detail?.split('/')[0] ?? '');
}

// Meta answers a missing permission or a story with under 5 viewers with code 10 or 200: no data, not a failed read.
export async function insightsOrNone(read: () => Promise<Insights>): Promise<Insights | undefined> {
  try {
    return await read();
  } catch (error) {
    if (noData(toProviderFailure(error, 'none').error)) return undefined;
    throw error;
  }
}

// The basic counts were already read, so a failed insights call must not cost them; a transient one writes nothing, so it can't overwrite earlier values with NULL.
export async function extraInsights(
  read: () => Promise<Insights>,
  names: InsightNames,
): Promise<PostMetrics> {
  try {
    return insightMetrics(await read(), names);
  } catch (error) {
    const { kind } = toProviderFailure(error, 'none').error;
    if (kind === 'transient') return {};
    if (kind === 'permanent') return insightMetrics(undefined, names);
    throw error;
  }
}
