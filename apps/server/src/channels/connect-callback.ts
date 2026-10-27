import { defineRoute } from '@kronaut/contract';
import {
  authorize,
  type ConnectedAccount,
  encodePublicId,
  isProviderFailure,
  MAX_CONNECT_ACCOUNTS,
  type ProviderApp,
  type ProviderState,
  TOO_MANY_ACCOUNTS,
} from '@kronaut/core';
import * as z from 'zod';
import { findSession, SESSION_COOKIE, sessionActive } from '../auth/session.ts';
import { constantTimeEqual } from '../crypto.ts';
import { bindUser } from '../http/principal.ts';
import { bindRoute, type RequestContext } from '../http/types.ts';
import type { ProviderEntry } from '../providers.ts';
import {
  consumePending,
  openPending,
  type PendingRecord,
  persistConnection,
  sha256Hex,
  stateKey,
} from './connect.ts';
import {
  type ChannelRouteDeps,
  loadApp,
  oauthEntry,
  providerContext,
  redirectUri,
} from './deps.ts';
import { markAppMisconfigured } from './instance-apps.ts';

export const CONNECT_ERRORS = [
  'state_invalid',
  'session_mismatch',
  'forbidden',
  'provider_denied',
  'provider_error',
  'app_config',
  'no_accounts',
  'too_many_accounts',
  'server_error',
] as const;
export type ConnectError = (typeof CONNECT_ERRORS)[number];

export const connectCallbackRoute = defineRoute({
  id: 'channels.connect_callback',
  method: 'GET',
  path: '/v1/oauth/:provider/callback',
  auth: 'public',
  action: null,
  params: z.object({ provider: z.string() }),
  query: z.looseObject({}),
  response: z.undefined(),
  status: 303,
  summary: 'Finish connecting a channel after the provider redirects back',
  tags: ['channels'],
});

type FailureReason = Readonly<Record<string, string>>;

class ConnectFailure extends Error {
  readonly code: ConnectError;
  readonly reason: FailureReason;

  constructor(code: ConnectError, reason: FailureReason = {}) {
    super(`connect failed: ${code}`);
    this.name = 'ConnectFailure';
    this.code = code;
    this.reason = reason;
  }
}

interface Claimed {
  readonly params: Record<string, string>;
  readonly kvKey: string;
  readonly record: PendingRecord;
}

interface ProviderFinish {
  readonly entry: ProviderEntry;
  readonly appId: string;
  readonly app: ProviderApp;
  readonly provider: string;
  readonly pending: ProviderState;
  readonly params: Record<string, string>;
}

interface Connected {
  readonly record: PendingRecord;
  readonly entry: ProviderEntry;
  readonly accounts: readonly ConnectedAccount<unknown>[];
}

const LOGGABLE_CODE = /^[A-Za-z0-9_.:-]{1,64}$/;

function loggable(value: string): string {
  return LOGGABLE_CODE.test(value) ? value : 'unrecognised';
}

function providerReason(err: unknown): FailureReason {
  if (!isProviderFailure(err)) return { providerKind: 'unexpected' };
  const { error } = err;
  return error.kind === 'permanent' || error.kind === 'app_config'
    ? { providerKind: error.kind, providerCode: loggable(error.code) }
    : { providerKind: error.kind };
}

function stringParams(query: Readonly<Record<string, unknown>>): Record<string, string> | null {
  const params: Record<string, string> = {};
  for (const [name, value] of Object.entries(query)) {
    if (typeof value !== 'string') return null;
    params[name] = value;
  }
  return params;
}

function channelsUrl(deps: ChannelRouteDeps, name: 'connected' | 'error', value: string): string {
  const url = new URL('/channels', deps.publicBaseUrl);
  url.searchParams.set(name, value);
  return url.toString();
}

async function claim(
  deps: ChannelRouteDeps,
  provider: string,
  query: Readonly<Record<string, unknown>>,
): Promise<Claimed> {
  const params = stringParams(query);
  const state = params?.state;
  if (params === null || state === undefined) throw new ConnectFailure('state_invalid');
  const kvKey = stateKey(state);
  const record = await consumePending(deps.db, kvKey);
  if (record === null || record.provider !== provider) {
    throw new ConnectFailure('state_invalid');
  }
  return { params, kvKey, record };
}

async function checkCaller(
  deps: ChannelRouteDeps,
  record: PendingRecord,
  ctx: RequestContext,
): Promise<void> {
  const token = ctx.cookie(SESSION_COOKIE);
  const session = token === undefined ? null : await findSession(deps.db, deps.keys.session, token);
  if (
    session === null ||
    !sessionActive(session, ctx.now) ||
    session.userId !== record.user_id ||
    !constantTimeEqual(Buffer.from(sha256Hex(session.sessionId)), Buffer.from(record.session_hash))
  ) {
    throw new ConnectFailure('session_mismatch');
  }

  const bound = await bindUser(deps.db, record.workspace_id, session);
  const decision =
    bound === null
      ? null
      : authorize(
          bound.principal,
          'channels:connect',
          { workspaceId: record.workspace_id },
          {
            now: ctx.now,
            ...(bound.accessScope === undefined ? {} : { accessScope: bound.accessScope }),
          },
        );
  if (decision === null || (decision.kind !== 'allow' && decision.kind !== 'allow_scoped')) {
    throw new ConnectFailure('forbidden');
  }
}

function tooManyAccounts(err: unknown): boolean {
  if (!isProviderFailure(err)) return false;
  const { error } = err;
  return error.kind === 'permanent' && error.code === TOO_MANY_ACCOUNTS;
}

async function connectFinish(
  deps: ChannelRouteDeps,
  ctx: RequestContext,
  input: ProviderFinish,
): Promise<readonly ConnectedAccount<unknown>[]> {
  const { entry, appId, app, provider, pending, params } = input;
  try {
    return await entry.runtime.connectFinish(providerContext(deps, entry, ctx), {
      app,
      redirectUri: redirectUri(deps, provider),
      pending,
      params,
    });
  } catch (err) {
    if (!isProviderFailure(err)) {
      const errorName = loggable(err instanceof Error ? err.name : typeof err);
      ctx.logger.error({ errorName }, 'channel connect finish threw');
    }
    if (tooManyAccounts(err)) throw new ConnectFailure('too_many_accounts');
    const appSide = isProviderFailure(err) && err.error.kind === 'app_config';
    if (appSide && app.instanceHost !== undefined) await markAppMisconfigured(deps.db, appId);
    throw new ConnectFailure(appSide ? 'app_config' : 'provider_error', providerReason(err));
  }
}

async function saveConnections(
  deps: ChannelRouteDeps,
  ctx: RequestContext,
  { record, entry, accounts }: Connected,
): Promise<string[]> {
  const { manifest } = entry;
  try {
    return await deps.db.withTenant(
      record.workspace_id,
      { kind: 'user', id: record.user_id },
      async (trx) => {
        const ids: string[] = [];
        for (const account of accounts) {
          const id = await persistConnection(trx, deps.keyring, {
            workspaceId: record.workspace_id,
            userId: record.user_id,
            provider: manifest.id,
            providerAppId: record.provider_app_id,
            clientKeyId: record.client_key_id,
            credentialKind: manifest.auth.kind,
            account,
            requestId: ctx.requestId,
          });
          ids.push(id);
        }
        return ids;
      },
    );
  } catch (err) {
    ctx.logger.error({ err }, 'channel connect could not be saved');
    throw new ConnectFailure('server_error');
  }
}

async function finish(
  deps: ChannelRouteDeps,
  provider: string,
  query: Readonly<Record<string, unknown>>,
  ctx: RequestContext,
): Promise<string[]> {
  const { params, kvKey, record } = await claim(deps, provider, query);
  await checkCaller(deps, record, ctx);

  const pending = openPending(deps.keys.oauthPending, kvKey, record.pending);
  if (pending === null) throw new ConnectFailure('state_invalid');

  if (params.error !== undefined) {
    throw new ConnectFailure(
      params.error === 'access_denied' ? 'provider_denied' : 'provider_error',
      { callbackError: loggable(params.error) },
    );
  }
  const entry = oauthEntry(deps.providers, provider);
  if (entry === undefined) throw new ConnectFailure('provider_error');
  const app = await loadApp(deps, record.provider_app_id, {
    use: 'bound',
    keyId: record.client_key_id,
  });
  if (app === null) throw new ConnectFailure('app_config');

  const accounts = await connectFinish(deps, ctx, {
    entry,
    appId: record.provider_app_id,
    app,
    provider,
    pending,
    params,
  });
  if (accounts.length === 0) throw new ConnectFailure('no_accounts');
  if (accounts.length > MAX_CONNECT_ACCOUNTS) throw new ConnectFailure('too_many_accounts');
  return await saveConnections(deps, ctx, { record, entry, accounts });
}

export function bindConnectCallback(deps: ChannelRouteDeps) {
  return bindRoute(connectCallbackRoute, async ({ params, query }, ctx) => {
    let location: string;
    try {
      const accountIds = await finish(deps, params.provider, query, ctx);
      const connected = accountIds.map((id) => encodePublicId('socialAccount', id));
      location = channelsUrl(deps, 'connected', connected.join(','));
    } catch (err) {
      const code = err instanceof ConnectFailure ? err.code : 'server_error';
      if (!(err instanceof ConnectFailure)) {
        ctx.logger.error({ err }, 'channel connect failed unexpectedly');
      }
      const reason = err instanceof ConnectFailure ? err.reason : {};
      ctx.logger.warn({ ...reason, code }, 'channel connect failed');
      location = channelsUrl(deps, 'error', code);
    }
    return { body: undefined, headers: { location } };
  });
}
