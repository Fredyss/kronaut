import { ProviderFailure, type ProviderRuntime } from '@kronaut/core';
import { connectFinish, connectStart } from './connect.ts';
import { type BlueskyCredentials, blueskyCredentials, issued } from './credentials.ts';
import { authServerFor, permanent, resolveDid } from './identity.ts';
import type { BlueskySettings } from './manifest.ts';
import {
  asFailure,
  CLIENT_METADATA,
  checkedToken,
  clientMetadata,
  postToAs,
  signingKeyOf,
  successBody,
  tokenResponse,
} from './oauth.ts';
import { publishPost, verifyPost } from './publish.ts';

export { type BlueskyCredentials, blueskyCredentials } from './credentials.ts';

export const blueskyRuntime: ProviderRuntime<BlueskyCredentials, BlueskySettings> = {
  id: 'bluesky',

  parseCredentials: (value) => blueskyCredentials.parse(value),

  connectStart,

  connectFinish,

  async refresh(ctx, input) {
    const key = signingKeyOf(input.app);
    const stored = input.credentials;
    const { pds } = await resolveDid(ctx, stored.did);
    const server = await authServerFor(ctx, pds);
    if (server.issuer !== stored.issuer) throw new ProviderFailure({ kind: 'auth_revoked' });

    const reply = await postToAs(
      ctx,
      'public',
      {
        app: input.app,
        key,
        issuer: stored.issuer,
        dpopJwk: stored.dpopJwk,
        ...(stored.asNonce === undefined ? {} : { nonce: stored.asNonce }),
      },
      {
        url: server.tokenEndpoint,
        fields: { grant_type: 'refresh_token', refresh_token: stored.refreshToken },
      },
    );
    if (reply.response.status !== 200) throw asFailure(reply, true);
    const token = successBody(reply, tokenResponse, 'public');
    const scopes = checkedToken(token);
    if (token.sub !== stored.did) throw permanent('sub_mismatch');
    return issued(ctx.now(), token, scopes, {
      ...stored,
      pds,
      tokenEndpoint: server.tokenEndpoint,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      ...(reply.nonce === undefined ? {} : { asNonce: reply.nonce }),
    });
  },

  publish: publishPost,
  verify: verifyPost,

  publicDocuments: (app) => ({ [CLIENT_METADATA]: clientMetadata(app) }),
};
