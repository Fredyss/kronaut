import { defineRoute } from '@kronaut/contract';
import type { Keyring } from '@kronaut/credentials';
import type { Actor, Database, TenantDb } from '@kronaut/db';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { loadProviderApp } from '../credential-store.ts';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { enqueueMetaLifecycle } from '../jobs.ts';
import {
  newConfirmationCode,
  requestHash,
  subjectHmac,
  verifySignedRequest,
} from './signed-request.ts';
import { statusLocale, statusText } from './status.ts';

const META_BODY_LIMIT = 8 * 1024;
const META_PROVIDERS: ReadonlySet<string> = new Set(['facebook', 'instagram', 'threads']);
const CONFIRMATION_CODE = /^[A-Z2-7]{20}$/;
const SYSTEM: Actor = { kind: 'system' };
const INVALID = 'The signed request is invalid.';
const SECRET_TTL_MS = 60_000;

export interface MetaRouteDeps {
  readonly db: Database;
  readonly keyring: Keyring;
  readonly subjectKey: Uint8Array;
  readonly publicBaseUrl: string;
}

const ProviderParams = z.object({ provider: z.string() });
const SignedRequestBody = z.object({ signed_request: z.string() });
const CALLBACK = {
  method: 'POST',
  auth: 'public',
  action: null,
  params: ProviderParams,
  body: SignedRequestBody,
  bodyEncoding: 'form',
  tags: ['meta'],
} as const;

export const metaDeletionRoute = defineRoute({
  ...CALLBACK,
  id: 'meta.deletion',
  path: '/v1/meta/:provider/deletion',
  response: z.object({ url: z.string(), confirmation_code: z.string() }),
  summary: 'Meta data deletion callback',
  description:
    'Meta posts a signed request when a person asks to delete their data. Their channels on that network are disconnected and wiped in every workspace; the answer links to a status page. Called by Meta, not by API clients.',
});

export const metaDeauthorizeRoute = defineRoute({
  ...CALLBACK,
  id: 'meta.deauthorize',
  path: '/v1/meta/:provider/deauthorize',
  response: z.undefined(),
  status: 204,
  summary: 'Meta deauthorize callback',
  description:
    'Meta posts a signed request when a person removes the app. Their channels on that network need reconnecting and their tokens are deleted. Called by Meta, not by API clients.',
});

export const metaDeletionStatusRoute = defineRoute({
  id: 'meta.deletion_status',
  method: 'GET',
  path: '/v1/meta/deletion/:code',
  auth: 'public',
  action: null,
  params: z.object({ code: z.string() }),
  response: z.string(),
  responseEncoding: 'text',
  summary: 'Status of a Meta data deletion request',
  description: 'Plain text in English, Slovak or Czech, chosen from Accept-Language.',
  tags: ['meta'],
});

export const META_BODY_LIMITS: Readonly<Record<string, number>> = {
  [metaDeletionRoute.id]: META_BODY_LIMIT,
  [metaDeauthorizeRoute.id]: META_BODY_LIMIT,
};

interface Received {
  readonly id: string;
  readonly kind: string;
  readonly provider: string;
  readonly confirmation_code: string | null;
  readonly completed_at: Date | null;
}

interface Incoming {
  readonly provider: string;
  readonly kind: 'deletion' | 'deauthorize';
  readonly signedRequest: string;
}

type SecretLookup = (provider: string) => Promise<string | null>;

async function usableAppId(trx: TenantDb, provider: string): Promise<string | null> {
  const rows = await trx
    .selectFrom('provider_apps')
    .select('id')
    .where('provider', '=', provider)
    .where('status', '<>', 'disabled')
    .where('instance_host', '=', '')
    .limit(2)
    .execute();
  const [only] = rows;
  return rows.length === 1 && only !== undefined ? only.id : null;
}

async function appSecret(deps: MetaRouteDeps, provider: string): Promise<string | null> {
  const app = await deps.db.withActor(SYSTEM, async (trx) => {
    const id = await usableAppId(trx, provider);
    if (id === null) return null;
    return loadProviderApp(trx, deps.keyring, { id }, { publicBaseUrl: deps.publicBaseUrl });
  });
  return app === null || app.status === 'disabled' ? null : (app.app.clientSecret ?? null);
}

function nowMs(): number {
  return Temporal.Now.instant().epochMilliseconds;
}

function cachedSecrets(deps: MetaRouteDeps): SecretLookup {
  const cache = new Map<string, { readonly secret: string | null; readonly expiresAt: number }>();
  return async (provider) => {
    const hit = cache.get(provider);
    if (hit !== undefined && hit.expiresAt > nowMs()) return hit.secret;
    const secret = await appSecret(deps, provider);
    cache.set(provider, { secret, expiresAt: nowMs() + SECRET_TTL_MS });
    return secret;
  };
}

async function insertRequest(
  trx: TenantDb,
  values: Incoming & { readonly userId: string; readonly subjectKey: Uint8Array },
): Promise<Received> {
  const hash = requestHash(values.signedRequest);
  const columns = ['id', 'kind', 'provider', 'confirmation_code', 'completed_at'] as const;
  const inserted = await trx
    .insertInto('meta_lifecycle_requests')
    .values({
      provider: values.provider,
      kind: values.kind,
      request_hash: hash,
      subject_hmac: subjectHmac(values.subjectKey, values.userId),
      subject_id: values.userId,
      confirmation_code: values.kind === 'deletion' ? newConfirmationCode() : null,
    })
    .onConflict((oc) => oc.columns(['provider', 'kind', 'request_hash']).doNothing())
    .returning(columns)
    .executeTakeFirst();
  return (
    inserted ??
    (await trx
      .selectFrom('meta_lifecycle_requests')
      .select(columns)
      .where('provider', '=', values.provider)
      .where('kind', '=', values.kind)
      .where('request_hash', '=', hash)
      .executeTakeFirstOrThrow())
  );
}

async function receive(
  deps: MetaRouteDeps,
  secretFor: SecretLookup,
  incoming: Incoming,
): Promise<Received> {
  if (!META_PROVIDERS.has(incoming.provider)) throw new HttpError('not_found', 'Not found.');
  const secret = await secretFor(incoming.provider);
  const userId = secret === null ? null : verifySignedRequest(incoming.signedRequest, secret);
  if (userId === null) throw new HttpError('invalid_request', INVALID);
  return await deps.db.withActor(SYSTEM, async (trx) => {
    const stored = await insertRequest(trx, { ...incoming, userId, subjectKey: deps.subjectKey });
    if (stored.completed_at === null) await enqueueMetaLifecycle(trx, stored.id);
    return stored;
  });
}

async function deletionStatus(deps: MetaRouteDeps, code: string) {
  if (!CONFIRMATION_CODE.test(code)) return null;
  const row = await deps.db.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('meta_lifecycle_requests')
      .select(['completed_at', 'matched'])
      .where('confirmation_code', '=', code)
      .executeTakeFirst(),
  );
  return row === undefined ? null : { completedAt: row.completed_at, matched: row.matched };
}

export function metaRoutes(deps: MetaRouteDeps): BoundRoute[] {
  const secretFor = cachedSecrets(deps);
  return [
    bindRoute(metaDeletionRoute, async ({ params, body }) => {
      const incoming = { provider: params.provider, signedRequest: body.signed_request };
      const row = await receive(deps, secretFor, { ...incoming, kind: 'deletion' });
      const code = row.confirmation_code ?? '';
      const url = new URL(`/v1/meta/deletion/${code}`, deps.publicBaseUrl).toString();
      return { body: { url, confirmation_code: code } };
    }),
    bindRoute(metaDeauthorizeRoute, async ({ params, body }) => {
      const incoming = { provider: params.provider, signedRequest: body.signed_request };
      await receive(deps, secretFor, { ...incoming, kind: 'deauthorize' });
      return { body: undefined };
    }),
    bindRoute(metaDeletionStatusRoute, async ({ params }, ctx) => {
      const status = await deletionStatus(deps, params.code);
      return { body: statusText(statusLocale(ctx.acceptLanguage), status) };
    }),
  ];
}
