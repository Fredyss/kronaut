import type { BaseContext, RevokeInput } from '@kronaut/core';
import { send } from '../_kit/http.ts';
import { apiUrl, errorCode, originOf, permanent, retryable, secretOf, transient } from './api.ts';
import type { MastodonCredentials } from './connect.ts';

export async function revokeToken(
  ctx: BaseContext,
  input: RevokeInput<MastodonCredentials>,
): Promise<void> {
  const response = await send(ctx, 'private', apiUrl(originOf(input.app), '/oauth/revoke'), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: input.app.clientId,
      client_secret: secretOf(input.app),
      token: input.credentials.accessToken,
    }).toString(),
  });
  if (retryable(response.status)) throw transient(response.status);
  if (response.status !== 200) throw permanent((await errorCode(response)) ?? 'revoke_rejected');
}
