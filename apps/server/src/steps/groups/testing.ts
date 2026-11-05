import { decodePublicId } from '@kronaut/core';
import { expect } from 'vitest';
import type { PostDto } from '../../flow/posts/read/dto.ts';
import { type Auth, call, create, doc, ownerAuth } from '../../flow/posts/testing.ts';

export interface GroupDto {
  readonly id: string;
  readonly name: string;
  readonly channelIds: readonly string[];
}

export async function newGroup(name: string): Promise<GroupDto> {
  const response = await call('POST', 'groups', ownerAuth, { name });
  expect(response.status).toBe(201);
  return (await response.json()) as GroupDto;
}

export function memberCall(
  method: 'PUT' | 'DELETE',
  groupId: string,
  channelId: string,
  auth: Auth = ownerAuth,
) {
  return call(method, `groups/${groupId}/channels/${channelId}`, auth);
}

export async function join(group: GroupDto, ...channelIds: string[]): Promise<void> {
  for (const channelId of channelIds) {
    expect((await memberCall('PUT', group.id, channelId)).status).toBe(204);
  }
}

export async function leave(group: GroupDto, channelId: string): Promise<void> {
  expect((await memberCall('DELETE', group.id, channelId)).status).toBe(204);
}

export function internalGroup(group: GroupDto): string {
  return decodePublicId('group', group.id) ?? '';
}

export function pickedBody(picks: readonly (readonly [string, string | null])[]) {
  return {
    items: [{ doc: doc('Group pick') }],
    destinations: picks.map(([accountId, sourceGroupId]) => ({
      accountId,
      publishType: 'post',
      sourceGroupId,
    })),
  };
}

export function pickedPost(...picks: (readonly [string, string | null])[]): Promise<PostDto> {
  return create(ownerAuth, pickedBody(picks));
}
