export { isPublicAddress } from './address.ts';
export { createHttpClient, type HttpClient } from './client.ts';
export type { EgressResponse } from './egress-response.ts';
export { EgressError, type EgressErrorCode } from './errors.ts';
export { installGlobalDispatcher } from './global.ts';
export { createGuardedLookup, type Resolver } from './lookup.ts';
export type { EgressRequest } from './perform-request.ts';
export type { EgressPolicy } from './policy.ts';
export { type ResolveTxtOptions, resolveTxt, type TxtResolver } from './txt.ts';
