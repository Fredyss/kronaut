import { decodePublicId } from '@kronaut/core';
import { expect } from 'vitest';
import type { PostDto } from '../posts/dto.ts';
import {
  type Auth,
  CLI,
  call,
  createUser,
  internal,
  login,
  owner,
  ownerAuth,
  SYSTEM,
  workspaceId,
} from '../posts/testing.ts';
import type { ApprovalRequestDto } from './dto.ts';

export interface PolicyChange {
  readonly mode?: 'none' | 'required';
  readonly required_approvals?: number;
  readonly allow_self_approval?: boolean;
  readonly reschedule_tolerance_min?: number;
}

export interface Member {
  readonly id: string;
  readonly auth: Auth;
}

export async function setPolicy(change: PolicyChange): Promise<void> {
  if (Object.keys(change).length === 0) return;
  await owner.withActor(CLI, (trx) =>
    trx
      .updateTable('approval_policies')
      .set(change)
      .where('workspace_id', '=', workspaceId)
      .where('brand_id', 'is', null)
      .execute(),
  );
}

export async function addMember(label: string, canApprove: boolean): Promise<Member> {
  const id = await createUser(label);
  await owner.withActor(CLI, (trx) =>
    trx
      .insertInto('memberships')
      .values({ workspace_id: workspaceId, user_id: id, role: 'editor', can_approve: canApprove })
      .execute(),
  );
  return { id, auth: await login(label) };
}

export function requestCall(post: PostDto, body: object = {}, auth: Auth = ownerAuth) {
  return call('POST', `posts/${post.id}/approval-requests`, auth, {
    expectedVersion: post.version,
    ...body,
  });
}

export async function requested(
  post: PostDto,
  body: object = {},
  auth: Auth = ownerAuth,
): Promise<PostDto> {
  const response = await requestCall(post, body, auth);
  expect(response.status).toBe(200);
  return (await response.json()) as PostDto;
}

export async function requestsOf(post: PostDto, auth: Auth = ownerAuth) {
  const response = await call('GET', `posts/${post.id}/approval-requests`, auth);
  expect(response.status).toBe(200);
  return ((await response.json()) as { items: ApprovalRequestDto[] }).items;
}

export async function openRequestOf(post: PostDto): Promise<ApprovalRequestDto> {
  const [newest] = await requestsOf(post);
  if (newest === undefined) throw new Error(`post ${post.id} has no approval request`);
  return newest;
}

export function decideCall(request: ApprovalRequestDto, decision: string, auth: Auth) {
  return call('POST', `approval-requests/${request.id}/decisions`, auth, { decision });
}

export async function decided(request: ApprovalRequestDto, decision: string, auth: Auth) {
  const response = await decideCall(request, decision, auth);
  expect(response.status).toBe(200);
  return (await response.json()) as ApprovalRequestDto;
}

export function withdrawCall(request: ApprovalRequestDto, auth: Auth) {
  return call('POST', `approval-requests/${request.id}/withdraw`, auth);
}

export function notificationsFor(userId: string, kind: string, post: PostDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('notifications')
      .select(['payload', 'dedupe_key'])
      .where('user_id', '=', userId)
      .where('kind', '=', kind)
      .where('post_id', '=', internal(post.id))
      .execute(),
  );
}

export function webhookEventsOf(request: ApprovalRequestDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('webhook_events')
      .select(['type', 'dedupe_key', 'payload'])
      .where('subject_id', '=', decodePublicId('approvalRequest', request.id) ?? '')
      .orderBy('occurred_at')
      .execute(),
  );
}

export function destinationsOf(post: PostDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .select(['id', 'state', 'frozen_at', 'approval_request_id', 'approval_schedule_bound'])
      .select(['approved_scheduled_local', 'approved_scheduled_tz', 'approved_tolerance_min'])
      .where('post_id', '=', internal(post.id))
      .orderBy('created_at')
      .orderBy('id')
      .execute(),
  );
}

export async function reauthenticatedHoursAgo(userId: string, hours: number): Promise<void> {
  await owner.withActor(CLI, (trx) =>
    trx
      .updateTable('sessions')
      .set({ reauthenticated_at: new Date(Date.now() - hours * 60 * 60 * 1000) })
      .where('user_id', '=', userId)
      .execute(),
  );
}
