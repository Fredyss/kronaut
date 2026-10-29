import type { AnalyticsResult, PostMetrics, ProviderError } from '@kronaut/core';
import * as z from 'zod';
import { toProviderFailure } from './failure.ts';

const STOP_KINDS: ReadonlySet<ProviderError['kind']> = new Set([
  'rate_limited',
  'auth_expired',
  'auth_revoked',
  'app_config',
]);

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export function countOf(value: unknown): number | null {
  return count.safeParse(value).data ?? null;
}

export const NOT_FOUND: ProviderError = { kind: 'permanent', code: 'not_found' };

export class PostResults {
  readonly #posts = new Map<string, PostMetrics>();
  readonly #failed = new Map<string, ProviderError>();

  ok(remoteId: string, metrics: PostMetrics): void {
    this.#posts.set(remoteId, metrics);
  }

  fail(remoteId: string, error: ProviderError): void {
    this.#failed.set(remoteId, error);
  }

  // A rate limit or a dead token stops the whole channel, so it must not hide behind one post.
  catch(remoteIds: readonly string[], error: unknown): void {
    const failure = toProviderFailure(error, 'none');
    if (STOP_KINDS.has(failure.error.kind)) throw failure;
    for (const remoteId of remoteIds) this.fail(remoteId, failure.error);
  }

  result(apiVersion: string): AnalyticsResult {
    return {
      posts: Object.fromEntries(this.#posts),
      ...(this.#failed.size === 0 ? {} : { failed: Object.fromEntries(this.#failed) }),
      apiVersion,
    };
  }
}

export async function eachPost(
  remoteIds: readonly string[],
  read: (remoteId: string) => Promise<PostMetrics>,
  apiVersion: string,
): Promise<AnalyticsResult> {
  const results = new PostResults();
  for (const remoteId of new Set(remoteIds)) {
    try {
      results.ok(remoteId, await read(remoteId));
    } catch (error) {
      results.catch([remoteId], error);
    }
  }
  return results.result(apiVersion);
}
