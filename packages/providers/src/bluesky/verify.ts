import { isProviderFailure, type PublishContext, type VerifyOutcome } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send, tryJson } from '../_kit/http.ts';
import { errorCode } from './dpop.ts';
import { publishState } from './publish.ts';
import { type Input, POST_COLLECTION, postUrl } from './publish-input.ts';

const recordResponse = z.looseObject({
  uri: z.string(),
  cid: z.string().min(1).optional().catch(undefined),
  value: z.looseObject({ text: z.string(), createdAt: z.string() }),
});

export async function verifyPost(ctx: PublishContext, input: Input): Promise<VerifyOutcome> {
  const { rkey, createdAt } = publishState.safeParse(input.state).data ?? {};
  const [item, ...rest] = input.items;
  if (rkey === undefined || createdAt === undefined || item === undefined || rest.length > 0)
    return { kind: 'inconclusive' };
  const { did, pds } = input.credentials;
  const expected = `at://${did}/${POST_COLLECTION}/${rkey}`;
  const query = new URLSearchParams({ repo: did, collection: POST_COLLECTION, rkey });
  try {
    const response = await send(ctx, 'none', `${pds}/xrpc/com.atproto.repo.getRecord?${query}`, {
      headers: { accept: 'application/json' },
    });
    if (response.status === 200) {
      const { uri, cid, value } = await readJson(response, recordResponse, 'none');
      if (uri !== expected || value.createdAt !== createdAt || value.text !== item.text)
        return { kind: 'inconclusive' };
      return {
        kind: 'found',
        remoteId: uri,
        url: postUrl(did, rkey),
        ...(cid === undefined ? {} : { anchor: { cid } }),
      };
    }
    if (response.status === 400) {
      if (errorCode(await tryJson(response)) === 'RecordNotFound') return { kind: 'absent' };
    }
    return { kind: 'inconclusive' };
  } catch (error) {
    if (isProviderFailure(error)) return { kind: 'inconclusive' };
    throw error;
  }
}
