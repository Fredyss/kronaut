import { type BaseContext, isProviderFailure } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';

const describeRepo = z.looseObject({ handle: z.string(), handleIsCorrect: z.boolean() });
const profileRecord = z.looseObject({
  value: z.looseObject({ displayName: z.string().optional() }),
});

async function bestEffort<T>(read: () => Promise<T>): Promise<T | undefined> {
  try {
    return await read();
  } catch (error) {
    if (isProviderFailure(error)) return undefined;
    throw error;
  }
}

export async function readProfile(
  ctx: BaseContext,
  pds: string,
  did: string,
): Promise<{ readonly handle?: string; readonly displayName?: string }> {
  const repo = encodeURIComponent(did);
  const described = await bestEffort(async () => {
    const response = await send(
      ctx,
      'none',
      `${pds}/xrpc/com.atproto.repo.describeRepo?repo=${repo}`,
    );
    if (response.status !== 200) return undefined;
    return readJson(response, describeRepo, 'none');
  });
  const profile = await bestEffort(async () => {
    const response = await send(
      ctx,
      'none',
      `${pds}/xrpc/com.atproto.repo.getRecord?repo=${repo}&collection=app.bsky.actor.profile&rkey=self`,
    );
    if (response.status !== 200) return undefined;
    return readJson(response, profileRecord, 'none');
  });
  const handle = described?.handleIsCorrect === true ? described.handle : undefined;
  const displayName = profile?.value.displayName?.trim();
  return {
    ...(handle === undefined ? {} : { handle }),
    ...(displayName === undefined || displayName === '' ? {} : { displayName }),
  };
}
