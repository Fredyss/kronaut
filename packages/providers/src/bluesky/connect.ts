import {
  type BaseContext,
  type ConnectedAccount,
  type ConnectFinishInput,
  type ConnectStart,
  type ConnectStartInput,
  ProviderFailure,
} from '@kronaut/core';
import * as z from 'zod';
import { pkcePair } from '../_kit/pkce.ts';
import { type BlueskyCredentials, issued } from './credentials.ts';
import { generateDpopKey, privateEcJwk } from './dpop.ts';
import {
  authServerFor,
  ENTRYWAY,
  fetchAuthServer,
  type Identity,
  permanent,
  resolveDid,
  resolveIdentity,
} from './identity.ts';
import {
  asFailure,
  callbackUri,
  checkedToken,
  parResponse,
  postToAs,
  SCOPE,
  signingKeyOf,
  successBody,
  tokenResponse,
} from './oauth.ts';
import { readProfile } from './profile.ts';

const pendingState = z.object({
  verifier: z.string().min(1),
  dpopJwk: privateEcJwk,
  issuer: z.string(),
  tokenEndpoint: z.string(),
  asNonce: z.string().optional(),
  expectedDid: z.string().optional(),
  handle: z.string().optional(),
  pds: z.string().optional(),
});
type PendingState = z.infer<typeof pendingState>;

async function identityOfSub(ctx: BaseContext, sub: string, issuer: string): Promise<Identity> {
  const { pds } = await resolveDid(ctx, sub);
  const server = await authServerFor(ctx, pds);
  if (server.issuer !== issuer) throw permanent('issuer_mismatch');
  return { did: sub, pds };
}

async function connectedIdentity(
  ctx: BaseContext,
  pending: PendingState,
  sub: string,
): Promise<Identity> {
  if (pending.expectedDid !== undefined) {
    if (sub !== pending.expectedDid) throw permanent('sub_mismatch');
    if (pending.pds === undefined) throw permanent('pending_invalid');
    return {
      did: pending.expectedDid,
      pds: pending.pds,
      ...(pending.handle === undefined ? {} : { handle: pending.handle }),
    };
  }
  return identityOfSub(ctx, sub, pending.issuer);
}

export async function connectStart(
  ctx: BaseContext,
  input: ConnectStartInput,
): Promise<ConnectStart> {
  const key = signingKeyOf(input.app);
  if (input.redirectUri !== callbackUri(input.app.publicBaseUrl))
    throw new ProviderFailure({ kind: 'app_config', code: 'redirect_uri_mismatch' });
  const loginHint = input.loginHint?.trim() === '' ? undefined : input.loginHint;
  const identity = loginHint === undefined ? undefined : await resolveIdentity(ctx, loginHint);
  const server =
    identity === undefined
      ? await fetchAuthServer(ctx, ENTRYWAY)
      : await authServerFor(ctx, identity.pds);
  const dpopJwk = await generateDpopKey();
  if (dpopJwk.x === key.privateJwk.x && dpopJwk.y === key.privateJwk.y)
    throw permanent('dpop_key_collision');
  const { verifier, challenge } = pkcePair();
  const reply = await postToAs(
    ctx,
    'none',
    { app: input.app, key, issuer: server.issuer, dpopJwk },
    {
      url: server.parEndpoint,
      fields: {
        response_type: 'code',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: input.state,
        redirect_uri: input.redirectUri,
        scope: SCOPE,
        ...(loginHint === undefined ? {} : { login_hint: loginHint }),
      },
    },
  );
  if (reply.response.status !== 200 && reply.response.status !== 201) throw asFailure(reply, false);
  const { request_uri } = successBody(reply, parResponse, 'none');
  const authorizationUrl = new URL(server.authorizationEndpoint);
  authorizationUrl.searchParams.set('client_id', input.app.clientId);
  authorizationUrl.searchParams.set('request_uri', request_uri);
  return {
    authorizationUrl: authorizationUrl.toString(),
    pending: {
      verifier,
      dpopJwk,
      issuer: server.issuer,
      tokenEndpoint: server.tokenEndpoint,
      ...(reply.nonce === undefined ? {} : { asNonce: reply.nonce }),
      ...(identity === undefined
        ? {}
        : {
            expectedDid: identity.did,
            pds: identity.pds,
            ...(identity.handle === undefined ? {} : { handle: identity.handle }),
          }),
    },
  };
}

export async function connectFinish(
  ctx: BaseContext,
  input: ConnectFinishInput,
): Promise<readonly ConnectedAccount<BlueskyCredentials>[]> {
  const parsed = pendingState.safeParse(input.pending);
  if (!parsed.success) throw permanent('pending_invalid');
  const pending = parsed.data;
  if (input.params.error !== undefined) throw permanent('authorization_denied');
  if (input.params.iss !== pending.issuer) throw permanent('issuer_mismatch');
  const code = input.params.code;
  if (code === undefined || code === '') throw permanent('code_missing');
  const key = signingKeyOf(input.app);

  const reply = await postToAs(
    ctx,
    'private',
    {
      app: input.app,
      key,
      issuer: pending.issuer,
      dpopJwk: pending.dpopJwk,
      ...(pending.asNonce === undefined ? {} : { nonce: pending.asNonce }),
    },
    {
      url: pending.tokenEndpoint,
      fields: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: input.redirectUri,
        code_verifier: pending.verifier,
      },
    },
  );
  if (reply.response.status !== 200) throw asFailure(reply, false);
  const token = successBody(reply, tokenResponse, 'private');
  const scopes = checkedToken(token);
  const now = ctx.now();

  const identity = await connectedIdentity(ctx, pending, token.sub);

  const profile = await readProfile(ctx, identity.pds, identity.did);
  const handle = identity.handle ?? profile.handle;
  const credentials: BlueskyCredentials = {
    did: identity.did,
    pds: identity.pds,
    issuer: pending.issuer,
    tokenEndpoint: pending.tokenEndpoint,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    dpopJwk: pending.dpopJwk,
    ...(reply.nonce === undefined ? {} : { asNonce: reply.nonce }),
  };
  return [
    {
      ...issued(now, token, scopes, credentials),
      providerAccountId: identity.did,
      accountKind: 'profile',
      ...(handle === undefined ? {} : { handle }),
      displayName: profile.displayName ?? handle ?? identity.did,
      profileUrl: `https://bsky.app/profile/${identity.did}`,
    },
  ];
}
