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

export interface AccountMetrics {
  readonly followers: number | null;
  readonly apiVersion: string;
}
