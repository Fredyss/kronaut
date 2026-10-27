import type { PublishContext } from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { readJson, send } from './http.ts';
import type { MetaInput } from './meta-container-state.ts';
import type { MetaGraph } from './meta-graph-call.ts';

const RECOVER_SLACK = Temporal.Duration.from({ minutes: 2 });

export interface Recovered {
  readonly id: string;
  readonly url?: string;
}

export interface RecentMedia {
  readonly id: string;
  readonly timestamp?: string | null | undefined;
  readonly permalink?: string | null | undefined;
}

export interface RecentQuery<T extends RecentMedia> {
  readonly path: string;
  readonly fields: string;
  readonly item: z.ZodType<T>;
  readonly matches: (media: T) => boolean;
  readonly sentAt: string | undefined;
}

export function graphInstant(value: string): Temporal.Instant | undefined {
  try {
    return Temporal.Instant.from(value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  } catch (error) {
    if (error instanceof RangeError) return undefined;
    throw error;
  }
}

export async function findRecent<T extends RecentMedia>(
  ctx: PublishContext,
  graph: MetaGraph,
  input: MetaInput,
  query: RecentQuery<T>,
): Promise<Recovered | undefined> {
  const response = await send(
    ctx,
    'none',
    graph.versioned(query.path, input, { fields: query.fields, limit: '10' }),
    { headers: { accept: 'application/json' } },
  );
  if (response.status !== 200) return undefined;
  const { data } = await readJson(response, z.looseObject({ data: z.array(query.item) }), 'none');
  const since =
    query.sentAt === undefined
      ? undefined
      : Temporal.Instant.from(query.sentAt).subtract(RECOVER_SLACK);
  const matches = data.filter((media) => {
    if (!query.matches(media)) return false;
    if (since === undefined) return true;
    const at = media.timestamp == null ? undefined : graphInstant(media.timestamp);
    return at !== undefined && Temporal.Instant.compare(at, since) >= 0;
  });
  const [match, ...others] = matches;
  if (match === undefined || others.length > 0) return undefined;
  return {
    id: match.id,
    ...(typeof match.permalink === 'string' && match.permalink !== ''
      ? { url: match.permalink }
      : {}),
  };
}
