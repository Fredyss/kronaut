import type { IssuedCredentials } from '@kronaut/core';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { privateEcJwk } from './dpop.ts';
import type { TokenResponse } from './oauth.ts';

export const blueskyCredentials = z.object({
  did: z.string(),
  pds: z.string(),
  issuer: z.string(),
  tokenEndpoint: z.string(),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  dpopJwk: privateEcJwk,
  asNonce: z.string().optional(),
  pdsNonce: z.string().optional(),
});
export type BlueskyCredentials = z.infer<typeof blueskyCredentials>;

function expiresAt(now: Temporal.Instant, token: TokenResponse): Temporal.Instant | undefined {
  return token.expires_in === undefined ? undefined : now.add({ seconds: token.expires_in });
}

export function issued(
  now: Temporal.Instant,
  token: TokenResponse,
  scopes: readonly string[],
  credentials: BlueskyCredentials,
): IssuedCredentials<BlueskyCredentials> {
  const accessExpiresAt = expiresAt(now, token);
  return {
    credentials,
    grantedScopes: scopes,
    ...(accessExpiresAt === undefined ? {} : { accessExpiresAt }),
  };
}
