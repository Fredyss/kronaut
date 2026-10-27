import { ProviderFailure, type PublishContext } from '@kronaut/core';
import * as z from 'zod';
import { graph } from './graph-call.ts';
import { QUOTA_RESET_MS } from './graph-errors.ts';
import type { Input } from './publish-input.ts';

const CONFIG_ISSUE = /^[A-Z][A-Z_]{0,63}$/;

const quotaEntry = z.looseObject({
  quota_usage: z.number().nonnegative(),
  config: z.looseObject({ quota_total: z.number().nonnegative() }),
});
const quota = z.union([
  z
    .looseObject({ data: z.array(quotaEntry).min(1) })
    .transform((value) => value.data[0] as z.output<typeof quotaEntry>),
  quotaEntry,
]);

export async function checkQuota(ctx: PublishContext, input: Input): Promise<void> {
  const limit = await graph.call(ctx, {
    effect: 'private',
    url: graph.versioned(`${input.credentials.userId}/content_publishing_limit`, input, {
      fields: 'quota_usage,config',
    }),
    schema: quota,
  });
  if (limit.quota_usage >= limit.config.quota_total)
    throw new ProviderFailure({
      kind: 'rate_limited',
      scope: 'account',
      resetAt: ctx.now().add({ milliseconds: QUOTA_RESET_MS }),
    });
}

function configIssue(value: unknown): string {
  if (typeof value === 'string' && CONFIG_ISSUE.test(value)) return value;
  if (Array.isArray(value) && value.every((v) => typeof v === 'string' && CONFIG_ISSUE.test(v)))
    return value.join(',');
  return 'unrecognised';
}

export function logConfigIssue(
  ctx: PublishContext,
  result: Readonly<Record<string, unknown>>,
): void {
  if (result.config_issue !== undefined)
    ctx.logger.warn({ configIssue: configIssue(result.config_issue) }, 'instagram config issue');
}
