import { defineRoute } from '@kronaut/contract';
import { decodePublicId, isProviderFailure, type ProviderApp } from '@kronaut/core';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { bindRoute, type RequestContext } from '../http/types.ts';
import type { ProviderEntry } from '../providers.ts';
import {
  newState,
  sealPending,
  selectAppId,
  sha256Hex,
  stateKey,
  storePending,
} from './connect.ts';
import {
  type ChannelRouteDeps,
  loadApp,
  oauthEntry,
  PROVIDER_ID,
  providerContext,
  redirectUri,
} from './deps.ts';
import { instanceAppId } from './instance-apps.ts';
import { normalizeInstanceHost } from './instance-host.ts';

const LOGIN_HINT_MAX = 253;
const INSTANCE_INPUT_MAX = 512;

export const connectStartRoute = defineRoute({
  id: 'channels.connect_start',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/channels/connect',
  auth: 'session',
  action: 'channels:connect',
  params: z.object({ workspaceId: z.string() }),
  body: z.object({
    provider: z.string().regex(PROVIDER_ID),
    loginHint: z.string().trim().normalize('NFC').min(1).max(LOGIN_HINT_MAX).optional(),
    instance: z.string().max(INSTANCE_INPUT_MAX).optional(),
  }),
  response: z.object({ authorizationUrl: z.string() }),
  idempotency: false,
  summary: 'Start connecting a channel through the provider',
  tags: ['channels'],
});

function instanceIssue(code: string): HttpError {
  return new HttpError('unprocessable', 'The server address is not usable.', {
    details: [{ path: 'body.instance', code }],
  });
}

function instanceHost(entry: ProviderEntry, instance: string | undefined): string | null {
  const scoped = entry.manifest.auth.instanceScoped === true;
  if (!scoped) {
    if (instance !== undefined) throw instanceIssue('not_supported');
    return null;
  }
  if (instance === undefined || instance.trim() === '') throw instanceIssue('required');
  const host = normalizeInstanceHost(instance);
  if (host === null) throw instanceIssue('invalid');
  return host;
}

function startFailure(
  err: unknown,
  appConfig: HttpError,
  ctx: RequestContext,
  rejectedPath: string,
): never {
  if (!isProviderFailure(err)) throw err;
  ctx.logger.warn({ kind: err.error.kind }, 'channel connect start failed');
  if (err.error.kind === 'app_config') throw appConfig;
  if (err.error.kind === 'permanent') {
    throw new HttpError('unprocessable', 'The provider could not start a connection.', {
      details: [{ path: rejectedPath, code: 'provider_rejected' }],
    });
  }
  throw new HttpError('unavailable', 'The provider could not be reached. Try again later.');
}

interface StartTarget {
  readonly entry: ProviderEntry;
  readonly workspaceId: string;
  readonly host: string | null;
  readonly appConfig: HttpError;
}

async function startApp(
  deps: ChannelRouteDeps,
  ctx: RequestContext,
  { entry, workspaceId, host, appConfig }: StartTarget,
): Promise<{ appId: string; app: ProviderApp }> {
  let appId: string | null;
  try {
    appId =
      host === null
        ? await ctx.tenant((trx) => selectAppId(trx, entry.manifest.id))
        : await instanceAppId(deps, ctx, { entry, workspaceId, host });
  } catch (err) {
    startFailure(err, appConfig, ctx, 'body.instance');
  }
  if (appId === null) throw appConfig;
  const app = await loadApp(deps, appId, { use: 'connect' });
  if (app === null) throw appConfig;
  return { appId, app };
}

export function bindConnectStart(deps: ChannelRouteDeps) {
  return bindRoute(connectStartRoute, async ({ params, body }, ctx) => {
    const workspaceId = decodePublicId('workspace', params.workspaceId);
    if (workspaceId === null) throw new HttpError('not_found', 'Not found.');
    ctx.authorize('channels:connect', { workspaceId });
    if (ctx.session === null) throw new HttpError('internal', 'The route needs a session.');
    const session = ctx.session;
    const entry = oauthEntry(deps.providers, body.provider);
    if (entry === undefined) throw new HttpError('not_found', 'Not found.');
    const appConfig = new HttpError('unprocessable', 'The provider is not set up on this server.', {
      details: [{ path: 'body.provider', code: 'app_config' }],
    });
    const host = instanceHost(entry, body.instance);
    const rejectedPath = host === null ? 'body.loginHint' : 'body.instance';
    const { appId, app } = await startApp(deps, ctx, { entry, workspaceId, host, appConfig });

    const state = newState();
    const kvKey = stateKey(state);
    let started: Awaited<ReturnType<typeof entry.runtime.connectStart>>;
    try {
      started = await entry.runtime.connectStart(providerContext(deps, entry, ctx), {
        app,
        redirectUri: redirectUri(deps, body.provider),
        state,
        ...(body.loginHint === undefined ? {} : { loginHint: body.loginHint }),
      });
    } catch (err) {
      startFailure(err, appConfig, ctx, rejectedPath);
    }
    await ctx.tenant((trx) =>
      storePending(trx, kvKey, {
        workspace_id: workspaceId,
        user_id: session.userId,
        session_hash: sha256Hex(session.sessionId),
        provider: body.provider,
        provider_app_id: appId,
        client_key_id: app.signingKey?.id ?? null,
        pending: sealPending(deps.keys.oauthPending, kvKey, started.pending),
      }),
    );
    return { body: { authorizationUrl: started.authorizationUrl } };
  });
}
