import { sql } from 'kysely';
import { expect } from 'vitest';
import type { PostDto } from '../posts/dto.ts';
import {
  type Auth,
  accountA,
  call,
  create,
  doc,
  internal,
  owner,
  ownerAuth,
  SYSTEM,
  scheduled,
} from '../posts/testing.ts';

export type Needed = 'failed' | 'blocked' | 'unconfirmed' | 'awaiting_manual' | 'published';

const STEPS: Record<Needed, readonly string[]> = {
  failed: [`state = 'failed', state_reason = 'permanent_error'`],
  blocked: [`state = 'blocked', state_reason = 'account_needs_reauth'`],
  awaiting_manual: [`state = 'awaiting_manual', state_reason = null`],
  unconfirmed: [
    `state = 'publishing', state_reason = null, lease_until = now() + interval '2 minutes',
     claimed_attempt_id = gen_random_uuid()`,
    `state = 'verifying', state_reason = 'ambiguous_response', lease_until = null,
     claimed_attempt_id = null`,
    `state = 'unconfirmed', state_reason = 'ambiguous_response'`,
  ],
  published: [
    `state = 'publishing', state_reason = null, lease_until = now() + interval '2 minutes',
     claimed_attempt_id = gen_random_uuid()`,
    `state = 'published', lease_until = null, claimed_attempt_id = null, published_at = now(),
     resolution = 'api', remote_id = 'r-1'`,
  ],
};

export function destinationRow(destinationId: string) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .select([
        'state',
        'state_reason',
        'version',
        'resolution',
        'published_at',
        'run_at',
        'deadline_at',
        'attempt_count',
        'last_error_code',
      ])
      .where('id', '=', destinationId)
      .executeTakeFirstOrThrow(),
  );
}

export async function internalDestination(post: PostDto, index = 0): Promise<string> {
  const rows = await owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .select('id')
      .where('post_id', '=', internal(post.id))
      .orderBy('created_at')
      .orderBy('id')
      .execute(),
  );
  const row = rows[index];
  if (row === undefined) throw new Error(`post ${post.id} has no destination ${index}`);
  return row.id;
}

export async function moveTo(destinationId: string, state: Needed): Promise<void> {
  for (const step of STEPS[state]) {
    await owner.withActor(SYSTEM, (trx) =>
      sql`update post_destinations set ${sql.raw(step)}, version = version + 1
          where id = ${destinationId}`.execute(trx),
    );
  }
}

export interface InState {
  readonly post: PostDto;
  readonly destinationId: string;
  readonly publicId: string;
  readonly version: number;
}

export async function postIn(
  state: Needed,
  { accountId = accountA, text = 'Treba konať' }: { accountId?: string; text?: string } = {},
): Promise<InState> {
  const created = await create(ownerAuth, {
    items: [{ doc: doc(text) }],
    destinations: [
      {
        accountId,
        publishType: 'post',
        ...(state === 'awaiting_manual' ? { deliveryMode: 'reminder' } : {}),
      },
    ],
  });
  const post = await scheduled(created);
  const destinationId = await internalDestination(post);
  await moveTo(destinationId, state);
  const { version } = await destinationRow(destinationId);
  return { post, destinationId, publicId: post.destinations[0]?.id ?? '', version };
}

export async function act(
  target: InState,
  action: 'mark-published' | 'send-again' | 'cancel',
  body: object = {},
  auth: Auth = ownerAuth,
): Promise<Response> {
  return await call(
    'POST',
    `posts/${target.post.id}/destinations/${target.publicId}/${action}`,
    auth,
    { expectedVersion: target.version, ...body },
  );
}

export function auditsOf(destinationId: string) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('audit_events')
      .select(['action', 'actor_kind', 'outcome', 'error_code', 'args_summary'])
      .where('resource_id', '=', destinationId)
      .where('surface', '<>', 'worker')
      .orderBy('occurred_at')
      .execute(),
  );
}

export async function ok(response: Response): Promise<PostDto> {
  expect(response.status).toBe(200);
  return (await response.json()) as PostDto;
}
