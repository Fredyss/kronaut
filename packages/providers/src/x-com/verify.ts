import { isProviderFailure, type PublishContext, type VerifyOutcome } from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { X_ID } from './connect.ts';
import { isSuccess, xFailure } from './errors.ts';
import { API_BASE } from './oauth.ts';
import { type Input, postUrl, publishState, sentText } from './publish.ts';

const RECENT = '10';

const reference = z.looseObject({ type: z.string(), id: z.string() });
const urlEntity = z.looseObject({
  url: z.string().min(1),
  expanded_url: z.string().nullish(),
  media_key: z.string().nullish(),
});
const timeline = z.looseObject({
  data: z
    .array(
      z.looseObject({
        id: z.string().regex(X_ID),
        text: z.string(),
        created_at: z.string(),
        entities: z
          .looseObject({ urls: z.array(urlEntity).optional() })
          .optional()
          .catch(undefined),
        referenced_tweets: z.array(reference).optional().catch(undefined),
        referenced_posts: z.array(reference).optional().catch(undefined),
      }),
    )
    .optional(),
});
type Post = NonNullable<z.infer<typeof timeline>['data']>[number];

function instantOf(value: string): Temporal.Instant | undefined {
  try {
    return Temporal.Instant.from(value);
  } catch {
    return undefined;
  }
}

function postedText(post: Post): string {
  let text = post.text;
  for (const entity of post.entities?.urls ?? []) {
    const replacement = entity.media_key ? '' : (entity.expanded_url ?? entity.url);
    text = text.split(entity.url).join(replacement);
  }
  // X returns post text with &, < and > HTML-escaped; &amp; goes last so "&amp;lt;" stays "&lt;".
  const unescaped = text.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  return unescaped.normalize('NFC').trim();
}

function repliesTo(post: Post): string | undefined {
  const references = [...(post.referenced_tweets ?? []), ...(post.referenced_posts ?? [])];
  return references.find((entry) => entry.type === 'replied_to')?.id;
}

async function recentPosts(ctx: PublishContext, input: Input): Promise<readonly Post[]> {
  const url = new URL(`${API_BASE}/users/${input.account.providerAccountId}/tweets`);
  url.searchParams.set('max_results', RECENT);
  url.searchParams.set('tweet.fields', 'created_at,text,entities,referenced_tweets');
  const response = await send(ctx, 'none', url, {
    headers: { Authorization: `Bearer ${input.credentials.accessToken}` },
  });
  if (!isSuccess(response.status)) throw await xFailure(response, 'none', ctx.now());
  return (await readJson(response, timeline, 'none')).data ?? [];
}

interface Expected {
  readonly text: string;
  readonly since: Temporal.Instant;
  readonly parent: string | undefined;
}

function expected(input: Input): Expected | undefined {
  const sentAt = publishState.safeParse(input.state).data?.sentAt;
  const [item, ...rest] = input.items;
  if (item === undefined || rest.length > 0 || item.role === 'comment') return undefined;
  const at = sentAt === undefined ? undefined : instantOf(sentAt);
  if (at === undefined || !X_ID.test(input.account.providerAccountId)) return undefined;
  const parent = item.role === 'thread' ? input.chain?.at(-1)?.remoteId : undefined;
  if (item.role === 'thread' && parent === undefined) return undefined;
  const since = at.round({ smallestUnit: 'second', roundingMode: 'floor' });
  return { text: sentText(item).trim(), since, parent };
}

function matches(post: Post, { text, since, parent }: Expected): boolean {
  const at = instantOf(post.created_at);
  return (
    at !== undefined &&
    Temporal.Instant.compare(at, since) >= 0 &&
    postedText(post) === text &&
    repliesTo(post) === parent
  );
}

function found(input: Input, id: string): VerifyOutcome {
  const url = postUrl(input, id);
  return { kind: 'found', remoteId: id, ...(url === undefined ? {} : { url }) };
}

export async function verifyPost(ctx: PublishContext, input: Input): Promise<VerifyOutcome> {
  const posted = publishState.safeParse(input.state).data?.post;
  if (posted !== undefined) return found(input, posted.id);
  const want = expected(input);
  if (want === undefined) return { kind: 'inconclusive' };
  try {
    const [match, ...others] = (await recentPosts(ctx, input)).filter((post) =>
      matches(post, want),
    );
    if (match === undefined || others.length > 0) return { kind: 'inconclusive' };
    return found(input, match.id);
  } catch (error) {
    if (isProviderFailure(error)) return { kind: 'inconclusive' };
    throw error;
  }
}
