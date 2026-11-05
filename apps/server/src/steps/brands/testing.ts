import { decodePublicId } from '@kronaut/core';
import { sql } from 'kysely';
import { pino } from 'pino';
import { expect } from 'vitest';
import type { PostDto } from '../../flow/posts/read/dto.ts';
import {
  BASE,
  call,
  db,
  fake,
  internal,
  keyring,
  media,
  owner,
  ownerAuth,
  providers,
  SYSTEM,
  workspaceId,
} from '../../flow/posts/testing.ts';
import { publishDeps, runPublish } from '../publish/task.ts';

export interface BrandDto {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly archivedAt: string | null;
  readonly channelCount: number;
}

export async function newBrand(name: string): Promise<BrandDto> {
  const response = await call('POST', 'brands', ownerAuth, { name });
  expect(response.status).toBe(201);
  return (await response.json()) as BrandDto;
}

export function assignCall(channelId: string, brandId: string | null) {
  return call('PUT', `channels/${channelId}/brand`, ownerAuth, { brandId });
}

export async function assign(channelId: string, brand: BrandDto | null): Promise<void> {
  expect((await assignCall(channelId, brand?.id ?? null)).status).toBe(200);
}

export async function postBrandOf(post: PostDto): Promise<string | null> {
  const row = await owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('posts')
      .select('brand_id')
      .where('id', '=', internal(post.id))
      .executeTakeFirstOrThrow(),
  );
  return row.brand_id;
}

export function internalBrand(brand: BrandDto): string {
  return decodePublicId('brand', brand.id) ?? '';
}

export async function runDestination(destinationId: string): Promise<void> {
  const id = decodePublicId('destination', destinationId) ?? '';
  await owner.withActor(SYSTEM, (trx) =>
    sql`update post_destinations set run_at = now() - interval '1 second' where id = ${id}`.execute(
      trx,
    ),
  );
  fake.script({ kind: 'publish', remoteId: `r-${id}` });
  const deps = publishDeps({
    db,
    providers,
    keyring,
    media,
    logger: pino({ level: 'silent' }),
    workerId: 'brands-test',
    publicBaseUrl: BASE,
  });
  await runPublish(deps, { workspaceId, id });
}
