import type { ProviderRuntime } from '@kronaut/core';
import * as z from 'zod';
import type { LinkedinSettings } from './manifest.ts';
import {
  AUTHORIZE_URL,
  appSecret,
  callbackCode,
  exchangeCode,
  grantedScopes,
  readUserInfo,
  SCOPES,
} from './oauth.ts';
import { publishPost } from './publish.ts';

export const linkedinCredentials = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
});
export type LinkedinCredentials = z.infer<typeof linkedinCredentials>;

export const linkedinRuntime: ProviderRuntime<LinkedinCredentials, LinkedinSettings> = {
  id: 'linkedin',

  parseCredentials: (value) => linkedinCredentials.parse(value),

  async connectStart(_ctx, input) {
    appSecret(input.app.clientSecret);
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', input.app.clientId);
    url.searchParams.set('redirect_uri', input.redirectUri);
    url.searchParams.set('state', input.state);
    url.searchParams.set('scope', SCOPES.join(' '));
    return { authorizationUrl: url.toString(), pending: {} };
  },

  async connectFinish(ctx, input) {
    const code = callbackCode(input.params);
    const token = await exchangeCode(ctx, {
      clientId: input.app.clientId,
      clientSecret: appSecret(input.app.clientSecret),
      code,
      redirectUri: input.redirectUri,
    });
    const issuedAt = ctx.now();
    const me = await readUserInfo(ctx, token.access_token);
    const name = me.name?.trim() ?? '';
    const credentials = linkedinCredentials.parse({
      accessToken: token.access_token,
      ...(token.refresh_token === undefined ? {} : { refreshToken: token.refresh_token }),
    });
    return [
      {
        credentials,
        grantedScopes: grantedScopes(token.scope),
        accessExpiresAt: issuedAt.add({ seconds: token.expires_in }),
        providerAccountId: me.sub,
        accountKind: 'person',
        displayName: name === '' ? me.sub : name,
      },
    ];
  },

  publish: publishPost,
};
