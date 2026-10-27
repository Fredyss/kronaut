import type { Dispatcher } from 'undici';
import { type EgressResponse, toEgressResponse } from './egress-response.ts';
import { fetchAdapter } from './fetch-adapter.ts';
import { createGuardedAgent } from './guarded-agent.ts';
import type { Resolver } from './lookup.ts';
import { type EgressRequest, performRequest } from './perform-request.ts';
import type { EgressPolicy } from './policy.ts';

export interface HttpClient {
  request(url: string | URL, init?: EgressRequest): Promise<EgressResponse>;
  fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
}

export function createHttpClient(
  policy: EgressPolicy,
  deps?: { dispatcher?: Dispatcher; resolver?: Resolver },
): HttpClient {
  const dispatcher = deps?.dispatcher ?? createGuardedAgent(deps?.resolver, policy.timeoutMs);
  return {
    request: async (url, init) =>
      toEgressResponse(await performRequest({ policy, dispatcher, input: url, init: init ?? {} })),
    fetch: (input, init) => fetchAdapter(policy, dispatcher, input, init),
  };
}
