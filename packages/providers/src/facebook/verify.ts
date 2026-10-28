import { isProviderFailure, type PublishContext, type VerifyOutcome } from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { hasComment } from '../_kit/items.ts';
import { graphInstant } from '../_kit/meta-recover.ts';
import { graphCall } from './graph.ts';
import { facebookManifest } from './manifest.ts';
import { postId, postUrl } from './publish.ts';
import { type Input, pageOf, publishState, readUrl } from './publish-input.ts';
import { verifyReel } from './reel.ts';

const CLOCK_SKEW = Temporal.Duration.from({ minutes: 2 });
const WINDOW = Temporal.Duration.from({ milliseconds: facebookManifest.verify.windowMs });
const FIELDS = 'id,message,created_time,permalink_url';
const LIMIT = '25';

const posts = z.looseObject({
  data: z.array(
    z.looseObject({
      id: postId,
      message: z.string().nullish(),
      created_time: z.union([z.string(), z.number()]).nullish(),
      permalink_url: z.string().nullish(),
    }),
  ),
});
type Post = z.infer<typeof posts>['data'][number];

function comparable(text: string | null | undefined): string {
  return (text ?? '').normalize('NFC').trim();
}

function createdAt(value: Post['created_time']): Temporal.Instant | undefined {
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds)
      ? Temporal.Instant.fromEpochMilliseconds(seconds * 1000)
      : undefined;
  }
  return typeof value === 'string' ? graphInstant(value) : undefined;
}

function decide(
  ctx: PublishContext,
  list: readonly Post[],
  text: string,
  sentAt: Temporal.Instant,
): VerifyOutcome {
  const since = sentAt.subtract(CLOCK_SKEW);
  const matches = list.filter((post) => {
    const at = createdAt(post.created_time);
    return (
      comparable(post.message) === text &&
      at !== undefined &&
      Temporal.Instant.compare(at, since) >= 0
    );
  });
  const [match, ...others] = matches;
  if (match !== undefined && others.length === 0)
    return { kind: 'found', remoteId: match.id, url: postUrl(match.id, match.permalink_url) };
  if (match === undefined && Temporal.Instant.compare(ctx.now(), sentAt.add(WINDOW)) >= 0)
    return { kind: 'absent' };
  return { kind: 'inconclusive' };
}

export async function verifyPost(ctx: PublishContext, input: Input): Promise<VerifyOutcome> {
  if (hasComment(input)) return { kind: 'inconclusive' };
  if (input.postType === 'reel') return verifyReel(ctx, input);
  const sentAt = publishState.safeParse(input.state).data?.sentAt;
  const item = input.items.find((candidate) => candidate.role === 'main');
  if (sentAt === undefined || item === undefined) return { kind: 'inconclusive' };
  try {
    const page = pageOf(input);
    const url = readUrl(page, `${page.id}/published_posts`, { fields: FIELDS, limit: LIMIT });
    const { data } = await graphCall(ctx, 'none', { url }, posts);
    return decide(ctx, data, comparable(item.text), Temporal.Instant.from(sentAt));
  } catch (error) {
    if (isProviderFailure(error)) return { kind: 'inconclusive' };
    throw error;
  }
}
