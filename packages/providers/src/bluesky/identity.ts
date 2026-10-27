import {
  type BaseContext,
  isProviderFailure,
  ProviderFailure,
  type ProviderHttpResponse,
} from '@kronaut/core';
import * as z from 'zod';
import { toProviderFailure, unexpectedResponse } from '../_kit/failure.ts';
import { readJson, send } from '../_kit/http.ts';

export const ENTRYWAY = 'https://bsky.social';

const HANDLE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]([a-z0-9-]{0,61}[a-z0-9])?$/;
const DID_PLC = /^did:plc:[a-z2-7]{24}$/;
const DID_WEB = /^did:web:([a-z0-9.-]+)$/;
const PDS_TYPE = 'AtprotoPersonalDataServer';

export interface Identity {
  readonly did: string;
  readonly handle?: string;
  readonly pds: string;
}

export interface AuthServer {
  readonly issuer: string;
  readonly authorizationEndpoint: string;
  readonly parEndpoint: string;
  readonly tokenEndpoint: string;
}

export function permanent(code: string): ProviderFailure {
  return new ProviderFailure({ kind: 'permanent', code });
}

export function statusFailure(status: number, code: string): ProviderFailure {
  if (status >= 500 || status === 429)
    return new ProviderFailure({ kind: 'transient', detail: `http_${status}` });
  return permanent(code);
}

export function normalizeHandle(input: string): string | undefined {
  const handle = input.trim().replace(/^@/, '').toLowerCase();
  return handle.length <= 253 && HANDLE.test(handle) ? handle : undefined;
}

function webHost(did: string): string | undefined {
  const host = DID_WEB.exec(did)?.[1];
  return host !== undefined && host.length <= 253 && HANDLE.test(host) ? host : undefined;
}

export function isSupportedDid(value: string): boolean {
  return DID_PLC.test(value) || webHost(value) !== undefined;
}

export function bareHttpsOrigin(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  const bare =
    url.protocol === 'https:' &&
    url.username === '' &&
    url.password === '' &&
    url.port === '' &&
    url.pathname === '/' &&
    url.search === '' &&
    url.hash === '';
  return bare ? url.origin : undefined;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isJson(response: ProviderHttpResponse): boolean {
  const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
  return type === 'application/json' || (type.startsWith('application/') && type.endsWith('+json'));
}

async function fetchMetadata<T>(
  ctx: BaseContext,
  url: string,
  schema: z.ZodType<T>,
  code: string,
): Promise<T> {
  const response = await send(ctx, 'none', url, { headers: { accept: 'application/json' } });
  if (new URL(response.url).href !== new URL(url).href) throw permanent(`${code}_redirected`);
  if (response.status !== 200) throw statusFailure(response.status, `${code}_unavailable`);
  if (!isJson(response)) throw unexpectedResponse('none');
  return readJson(response, schema, 'none');
}

async function handleViaDns(ctx: BaseContext, handle: string): Promise<string | undefined> {
  if (ctx.dns === undefined) return undefined;
  const values = await ctx.dns.txt(`_atproto.${handle}`);
  const dids = new Set(
    values.filter((value) => value.startsWith('did=')).map((value) => value.slice(4)),
  );
  if (dids.size > 1) throw permanent('handle_ambiguous');
  const [did] = dids;
  return did !== undefined && isSupportedDid(did) ? did : undefined;
}

async function handleViaHttps(ctx: BaseContext, handle: string): Promise<string | undefined> {
  const response = await send(ctx, 'none', `https://${handle}/.well-known/atproto-did`);
  if (response.status >= 500 || response.status === 429)
    throw statusFailure(response.status, 'handle_unresolved');
  const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (response.status < 200 || response.status > 299 || type !== 'text/plain') return undefined;
  const did = (await response.text()).trim();
  return isSupportedDid(did) ? did : undefined;
}

export async function resolveHandle(ctx: BaseContext, handle: string): Promise<string> {
  const [dns, https] = await Promise.allSettled([
    handleViaDns(ctx, handle),
    handleViaHttps(ctx, handle),
  ]);
  if (dns.status === 'fulfilled' && dns.value !== undefined) return dns.value;
  if (dns.status === 'rejected' && isProviderFailure(dns.reason)) throw dns.reason;
  if (https.status === 'fulfilled' && https.value !== undefined) return https.value;
  const failed = [https, dns].find((result) => result.status === 'rejected');
  if (failed !== undefined) throw toProviderFailure(failed.reason, 'none');
  throw permanent('handle_unresolved');
}

const didDocument = z.looseObject({
  id: z.string(),
  alsoKnownAs: z.array(z.unknown()).optional(),
  service: z.array(z.unknown()).optional(),
});

const serviceEntry = z.looseObject({
  id: z.string(),
  type: z.unknown(),
  serviceEndpoint: z.unknown(),
});

function claimedHandle(alsoKnownAs: readonly unknown[]): string | undefined {
  for (const entry of alsoKnownAs) {
    if (typeof entry !== 'string' || !entry.startsWith('at://')) continue;
    const handle = normalizeHandle(entry.slice('at://'.length));
    if (handle !== undefined) return handle;
  }
  return undefined;
}

function pdsOf(did: string, services: readonly unknown[]): string | undefined {
  for (const raw of services) {
    const service = serviceEntry.safeParse(raw);
    if (!service.success) continue;
    const { id, type, serviceEndpoint } = service.data;
    if ((id === '#atproto_pds' || id === `${did}#atproto_pds`) && type === PDS_TYPE)
      return bareHttpsOrigin(serviceEndpoint);
  }
  return undefined;
}

function didDocumentUrl(did: string): string {
  if (DID_PLC.test(did)) return `https://plc.directory/${did}`;
  const host = webHost(did);
  if (host === undefined) throw permanent('did_unsupported');
  return `https://${host}/.well-known/did.json`;
}

export async function resolveDid(
  ctx: BaseContext,
  did: string,
): Promise<{ readonly pds: string; readonly handle?: string }> {
  const response = await send(ctx, 'none', didDocumentUrl(did), {
    headers: { accept: 'application/did+ld+json, application/json' },
  });
  if (response.status !== 200)
    throw statusFailure(
      response.status,
      response.status === 404 || response.status === 410 ? 'did_not_found' : 'did_unavailable',
    );
  const document = await readJson(response, didDocument, 'none');
  if (document.id !== did) throw permanent('did_document_mismatch');
  const pds = pdsOf(did, document.service ?? []);
  if (pds === undefined) throw permanent('pds_missing');
  const handle = claimedHandle(document.alsoKnownAs ?? []);
  return handle === undefined ? { pds } : { pds, handle };
}

export async function resolveIdentity(ctx: BaseContext, hint: string): Promise<Identity> {
  const trimmed = hint.trim();
  if (trimmed.startsWith('did:')) {
    if (!isSupportedDid(trimmed)) throw permanent('did_unsupported');
    const { pds } = await resolveDid(ctx, trimmed);
    return { did: trimmed, pds };
  }
  const handle = normalizeHandle(trimmed);
  if (handle === undefined) throw permanent('login_hint_invalid');
  const did = await resolveHandle(ctx, handle);
  const resolved = await resolveDid(ctx, did);
  if (resolved.handle !== handle) throw permanent('handle_mismatch');
  return { did, handle, pds: resolved.pds };
}

const protectedResource = z.looseObject({
  authorization_servers: z.array(z.unknown()),
});

const authServerMetadata = z.looseObject({
  issuer: z.string(),
  authorization_endpoint: z.string(),
  pushed_authorization_request_endpoint: z.string(),
  token_endpoint: z.string(),
  token_endpoint_auth_methods_supported: z.array(z.unknown()).optional(),
  authorization_response_iss_parameter_supported: z.boolean().optional(),
});

export async function fetchAuthServer(ctx: BaseContext, origin: string): Promise<AuthServer> {
  const metadata = await fetchMetadata(
    ctx,
    `${origin}/.well-known/oauth-authorization-server`,
    authServerMetadata,
    'as_metadata',
  );
  if (metadata.issuer !== origin) throw permanent('as_issuer_mismatch');
  const endpoints = [
    metadata.authorization_endpoint,
    metadata.pushed_authorization_request_endpoint,
    metadata.token_endpoint,
  ];
  if (
    !endpoints.every(isHttpsUrl) ||
    metadata.authorization_response_iss_parameter_supported !== true ||
    !(metadata.token_endpoint_auth_methods_supported ?? []).includes('private_key_jwt')
  )
    throw permanent('as_unsupported');
  return {
    issuer: metadata.issuer,
    authorizationEndpoint: metadata.authorization_endpoint,
    parEndpoint: metadata.pushed_authorization_request_endpoint,
    tokenEndpoint: metadata.token_endpoint,
  };
}

export async function authServerFor(ctx: BaseContext, pds: string): Promise<AuthServer> {
  const resource = await fetchMetadata(
    ctx,
    `${pds}/.well-known/oauth-protected-resource`,
    protectedResource,
    'resource_metadata',
  );
  const [only, ...rest] = resource.authorization_servers;
  const origin = rest.length === 0 ? bareHttpsOrigin(only) : undefined;
  if (origin === undefined) throw permanent('as_unsupported');
  return fetchAuthServer(ctx, origin);
}
