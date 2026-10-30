import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { issueDetails } from '../http/input.ts';
import { invalid } from '../http/issues.ts';

export const DRAFTS_DEFAULT_LIMIT = 50;
// A six-week grid that crosses a DST change is one hour longer than 42 × 24 hours.
const RANGE_MAX_MS = (42 * 24 + 1) * 60 * 60 * 1000;

export const ListQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  unscheduled: z.string().optional(),
  limit: z.string().optional(),
  tag: z.string().optional(),
});

const Instant = z.iso.datetime({ offset: true });

const RangeQuery = z.strictObject({ from: Instant, to: Instant, tag: z.string().optional() });

const UnscheduledQuery = z.strictObject({
  unscheduled: z.literal('true'),
  limit: z
    .string()
    .regex(/^[0-9]{1,3}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional(),
  tag: z.string().optional(),
});

export type ListFilter =
  | { readonly kind: 'range'; readonly from: Date; readonly to: Date; readonly tag?: string }
  | { readonly kind: 'unscheduled'; readonly limit: number; readonly tag?: string };

export function listFilter(query: z.output<typeof ListQuery>): ListFilter {
  const present = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined));
  const tag = query.tag === undefined ? {} : { tag: query.tag };
  if ('unscheduled' in present) {
    const parsed = UnscheduledQuery.safeParse(present);
    if (!parsed.success) throw invalid(issueDetails('query', parsed.error));
    return { kind: 'unscheduled', limit: parsed.data.limit ?? DRAFTS_DEFAULT_LIMIT, ...tag };
  }
  const parsed = RangeQuery.safeParse(present);
  if (!parsed.success) throw invalid(issueDetails('query', parsed.error));
  const from = Temporal.Instant.from(parsed.data.from).epochMilliseconds;
  const to = Temporal.Instant.from(parsed.data.to).epochMilliseconds;
  if (to <= from) throw invalid([{ path: 'query.to', code: 'range_invalid' }]);
  if (to - from > RANGE_MAX_MS) throw invalid([{ path: 'query.to', code: 'range_too_large' }]);
  return { kind: 'range', from: new Date(from), to: new Date(to), ...tag };
}
