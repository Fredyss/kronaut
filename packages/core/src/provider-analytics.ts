import type { RefreshInput } from './provider-contract.ts';
import type { ProviderError } from './provider-error.ts';

export const POST_METRICS = [
  'likes',
  'reposts',
  'replies',
  'quotes',
  'comments',
  'shares',
  'reactions',
  'bookmarks',
  'views',
  'reach',
  'saves',
  'link_clicks',
] as const;
export type PostMetric = (typeof POST_METRICS)[number];
export type PostMetrics = Readonly<Partial<Record<PostMetric, number | null>>>;

export interface AnalyticsInput<C> extends RefreshInput<C> {
  readonly remoteIds: readonly string[];
  readonly postTypes: Readonly<Record<string, string>>;
}

export interface AnalyticsResult {
  readonly posts: Readonly<Record<string, PostMetrics>>;
  readonly failed?: Readonly<Record<string, ProviderError>>;
  readonly apiVersion: string;
}

export type AccountMetricsInput<C> = RefreshInput<C>;

export interface AccountProfile {
  readonly displayName: string;
  readonly handle?: string;
  readonly profileUrl?: string;
}

export interface AccountMetrics {
  readonly followers: number | null;
  readonly apiVersion: string;
  readonly profile?: AccountProfile;
}

const STOP_KINDS: ReadonlySet<ProviderError['kind']> = new Set([
  'rate_limited',
  'auth_expired',
  'auth_revoked',
  'app_config',
]);

export function isCreditsDepleted(error: ProviderError | null): boolean {
  return error?.kind === 'permanent' && error.code === 'credits_depleted';
}

// An app out of credits fails every read until someone tops it up, so it must pause the channel, not end each post's pulls.
export function stopsAnalytics(error: ProviderError): boolean {
  return STOP_KINDS.has(error.kind) || isCreditsDepleted(error);
}
