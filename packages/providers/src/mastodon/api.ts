import {
  type BaseContext,
  type ProviderApp,
  ProviderFailure,
  type ProviderHttpRequest,
  type ProviderHttpResponse,
  type StepEffect,
} from '@kronaut/core';
import * as z from 'zod';
import { readJson, send, tryJson } from '../_kit/http.ts';

export const SCOPES = ['read:accounts', 'read:statuses', 'write:statuses', 'write:media'] as const;
export const SCOPE = SCOPES.join(' ');

const ERROR_CODE = /^[a-z_]{1,64}$/;
const errorBody = z.looseObject({ error: z.string() });

export function permanent(code: string): ProviderFailure {
  return new ProviderFailure({ kind: 'permanent', code });
}

function appConfig(code: string): ProviderFailure {
  return new ProviderFailure({ kind: 'app_config', code });
}

export function instanceOrigin(host: string): string {
  let url: URL;
  try {
    url = new URL(`https://${host}`);
  } catch {
    throw appConfig('instance_host_invalid');
  }
  if (url.host !== host || url.pathname !== '/') throw appConfig('instance_host_invalid');
  return url.origin;
}

export function originOf(app: ProviderApp): string {
  if (app.instanceHost === undefined || app.instanceHost === '')
    throw appConfig('instance_host_missing');
  return instanceOrigin(app.instanceHost);
}

export function secretOf(app: ProviderApp): string {
  if (app.clientSecret === undefined || app.clientSecret === '')
    throw appConfig('client_secret_missing');
  return app.clientSecret;
}

export function apiUrl(origin: string, path: string): URL {
  return new URL(path, origin);
}

export async function errorCode(response: ProviderHttpResponse): Promise<string | undefined> {
  const parsed = errorBody.safeParse(await tryJson(response));
  if (!parsed.success) return undefined;
  return ERROR_CODE.test(parsed.data.error) ? parsed.data.error : undefined;
}

export function retryable(status: number): boolean {
  return status >= 500 || status === 429;
}

export function transient(status: number): ProviderFailure {
  return new ProviderFailure({ kind: 'transient', detail: `http_${status}` });
}

export interface JsonCall<T> {
  readonly effect: StepEffect;
  readonly url: URL;
  readonly schema: z.ZodType<T>;
  readonly init?: ProviderHttpRequest;
  readonly failure: string;
}

export async function callJson<T>(ctx: BaseContext, call: JsonCall<T>): Promise<T> {
  const response = await send(ctx, call.effect, call.url, {
    ...call.init,
    headers: { accept: 'application/json', ...call.init?.headers },
  });
  if (retryable(response.status)) throw transient(response.status);
  if (response.status !== 200) throw permanent(call.failure);
  return readJson(response, call.schema, call.effect);
}
