import type { Temporal } from 'temporal-polyfill';
import type * as z from 'zod';
import type { RateLimitScope } from './provider-error.ts';

export type StepEffect = 'none' | 'private' | 'public';
export type VerifyMode =
  | 'idempotency_key'
  | 'deterministic_id'
  | 'status_by_ref'
  | 'list_recent_match'
  | 'none';
export type RefreshKind = 'none' | 'self_refresh' | 'reusable' | 'rotating' | 'single_use';
export type Delivery = 'api' | 'reminder' | 'unsupported';
export type TextCounting =
  | 'x-weighted'
  | 'mastodon'
  | 'threads'
  | 'graphemes'
  | 'utf16'
  | 'utf8-bytes';
export type AvailabilityState = 'stable' | 'experimental' | 'limited' | 'unavailable';
export const PREVIEW_ARCHETYPES = [
  'short-feed',
  'pro-feed',
  'media-grid',
  'vertical-video',
  'chat',
  'article',
] as const;
export type PreviewArchetype = (typeof PREVIEW_ARCHETYPES)[number];
export type CredentialKind = 'oauth' | 'page_token' | 'app_password' | 'bot_token';
export type ItemRole = 'main' | 'thread' | 'comment';

export interface Ratio {
  readonly width: number;
  readonly height: number;
}

export interface TextLimit {
  readonly counting: TextCounting;
  readonly max: number;
  readonly urlWeight?: number;
}

export interface ImageLimits {
  readonly mimes: readonly string[];
  readonly maxBytes: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly minAspect?: Ratio;
  readonly maxAspect?: Ratio;
}

export interface VideoLimits {
  readonly mimes: readonly string[];
  readonly maxBytes: number;
  readonly minDurationMs: number;
  readonly maxDurationMs: number;
  readonly minAspect?: Ratio;
  readonly maxAspect?: Ratio;
}

export interface MediaLimits {
  readonly minCount: number;
  readonly maxCount: number;
  readonly image?: ImageLimits;
  readonly video?: VideoLimits;
  readonly mixed: boolean;
  readonly altText: {
    readonly supported: boolean;
    readonly required: boolean;
    readonly maxLength: number;
  };
  readonly aiLabel: boolean;
}

export interface PostStep {
  readonly id: string;
  readonly effect: StepEffect;
}

export interface AsyncLimits {
  readonly pollIntervalMs: number;
  readonly giveUpAfterMs: number;
}

export interface PostTypeSpec {
  readonly id: string;
  readonly delivery: Delivery;
  readonly steps: readonly PostStep[];
  readonly text: readonly TextLimit[];
  readonly maxLinks?: number;
  readonly media: MediaLimits;
  readonly async?: AsyncLimits;
}

export interface RateLimitSpec {
  readonly scope: RateLimitScope;
  readonly bucket: string;
  readonly capacity: number;
  readonly refillPerHour: number;
  readonly costPerPost: number;
}

export interface ProviderManifest<S = unknown> {
  readonly id: string;
  readonly apiVersion: { readonly version: string; readonly sunsetOn?: string };
  readonly availability: { readonly state: AvailabilityState; readonly caveatKey?: string };
  readonly auth: {
    readonly kind: CredentialKind;
    readonly refresh: RefreshKind;
    readonly accessTtlMs?: number;
    readonly refreshTtlMs?: number;
    readonly warnLeadMs: number;
    readonly instanceScoped?: boolean;
  };
  readonly postTypes: readonly PostTypeSpec[];
  readonly settings: z.ZodType<S>;
  readonly cost: {
    readonly model: 'free' | 'per_post';
    readonly perPost?: {
      readonly usdMicros: number;
      readonly linkUsdMicros?: number;
      readonly asOf: string;
      readonly sourceUrl: string;
    };
  };
  readonly verify: { readonly mode: VerifyMode; readonly windowMs: number };
  readonly rateLimits: readonly RateLimitSpec[];
  readonly concurrency: number;
  readonly preview: PreviewArchetype;
  readonly capabilities: { readonly analytics: boolean; readonly delete: boolean };
  readonly egressHosts: readonly string[];
  accountPostType?(postType: PostTypeSpec, capabilities: unknown): PostTypeSpec;
}

export interface ProviderHttpResponse {
  readonly status: number;
  readonly headers: Headers;
  readonly url: string;
  bytes(): Promise<Uint8Array>;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export interface ProviderHttpRequest {
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: string | Uint8Array;
  readonly signal?: AbortSignal;
}

export interface ProviderHttp {
  request(url: string | URL, init?: ProviderHttpRequest): Promise<ProviderHttpResponse>;
  readonly fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
}

export interface ProviderLogger {
  debug(fields: Record<string, unknown>, msg: string): void;
  info(fields: Record<string, unknown>, msg: string): void;
  warn(fields: Record<string, unknown>, msg: string): void;
  error(fields: Record<string, unknown>, msg: string): void;
}

export type Jwk = Readonly<Record<string, unknown>>;

export interface ClientSigningKey {
  readonly id: string;
  readonly kid: string;
  readonly alg: 'ES256';
  readonly privateJwk: Jwk;
}

export interface ProviderApp {
  readonly clientId: string;
  readonly clientSecret?: string;
  readonly publicBaseUrl: string;
  readonly signingKey?: ClientSigningKey;
  readonly publishedKeys?: readonly Jwk[];
  readonly instanceHost?: string;
}

export interface ProviderDns {
  txt(name: string): Promise<readonly string[]>;
}

export interface BaseContext {
  readonly http: ProviderHttp;
  readonly dns?: ProviderDns;
  readonly logger: ProviderLogger;
  readonly signal: AbortSignal;
  now(): Temporal.Instant;
}

export interface MediaRef {
  readonly id: string;
  readonly sha256: string;
  readonly mime: string;
  readonly bytes: number;
  readonly width?: number;
  readonly height?: number;
  readonly durationMs?: number;
  readonly altText?: string;
  readonly aiGenerated: boolean;
}

export interface PublishItem {
  readonly position: number;
  readonly role: ItemRole;
  readonly text: string;
  readonly media: readonly MediaRef[];
  readonly language?: string;
}

export type ProviderState = Readonly<Record<string, unknown>>;

export interface PublishContext extends BaseContext {
  readonly media: {
    signedUrl(mediaId: string): Promise<string>;
    read(mediaId: string): Promise<Uint8Array>;
  };
  step(stepId: string): Promise<void>;
  checkpoint(state: ProviderState): Promise<void>;
}

export interface Account {
  readonly providerAccountId: string;
  readonly handle?: string;
}

export interface PublishInput<C, S> {
  readonly destinationId: string;
  readonly attemptNo: number;
  readonly postType: string;
  readonly account: Account;
  readonly credentials: C;
  readonly app: ProviderApp;
  readonly settings: S;
  readonly items: readonly PublishItem[];
  readonly state: ProviderState;
}

export type PublishOutcome =
  | { readonly kind: 'published'; readonly remoteId: string; readonly url?: string }
  | { readonly kind: 'pending'; readonly pollAfterMs: number };

export type VerifyOutcome =
  | { readonly kind: 'found'; readonly remoteId: string; readonly url?: string }
  | { readonly kind: 'absent' }
  | { readonly kind: 'inconclusive' };

export interface IssuedCredentials<C> {
  readonly credentials: C;
  readonly grantedScopes: readonly string[];
  readonly accessExpiresAt?: Temporal.Instant;
  readonly refreshExpiresAt?: Temporal.Instant;
}

export const MAX_CONNECT_ACCOUNTS = 100;
export const TOO_MANY_ACCOUNTS = 'too_many_accounts';

export interface ConnectedAccount<C> extends IssuedCredentials<C> {
  readonly providerAccountId: string;
  readonly accountKind: string;
  readonly handle?: string;
  readonly displayName: string;
  readonly profileUrl?: string;
  readonly capabilities?: Readonly<Record<string, unknown>>;
}

export interface ConnectStartInput {
  readonly app: ProviderApp;
  readonly redirectUri: string;
  readonly state: string;
  readonly loginHint?: string;
}

export interface ConnectStart {
  readonly authorizationUrl: string;
  readonly pending: ProviderState;
}

export interface ConnectFinishInput {
  readonly app: ProviderApp;
  readonly redirectUri: string;
  readonly pending: ProviderState;
  readonly params: Readonly<Record<string, string>>;
}

export interface RegisterAppInput {
  readonly instanceHost: string;
  readonly redirectUri: string;
  readonly clientName: string;
  readonly website?: string;
}

export interface RegisteredApp {
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface RefreshInput<C> {
  readonly app: ProviderApp;
  readonly account: Account;
  readonly credentials: C;
}

export type RevokeInput<C> = RefreshInput<C>;

export interface ProviderRuntime<C = unknown, S = unknown> {
  readonly id: string;
  parseCredentials(value: unknown): C;
  registerApp?(ctx: BaseContext, input: RegisterAppInput): Promise<RegisteredApp>;
  connectStart(ctx: BaseContext, input: ConnectStartInput): Promise<ConnectStart>;
  connectFinish(
    ctx: BaseContext,
    input: ConnectFinishInput,
  ): Promise<readonly ConnectedAccount<C>[]>;
  refresh?(ctx: BaseContext, input: RefreshInput<C>): Promise<IssuedCredentials<C>>;
  revoke?(ctx: BaseContext, input: RevokeInput<C>): Promise<void>;
  publish(ctx: PublishContext, input: PublishInput<C, S>): Promise<PublishOutcome>;
  poll?(ctx: PublishContext, input: PublishInput<C, S>): Promise<PublishOutcome>;
  verify?(ctx: PublishContext, input: PublishInput<C, S>): Promise<VerifyOutcome>;
  readInstanceCapabilities?(
    ctx: BaseContext,
    instanceHost: string,
  ): Promise<Readonly<Record<string, unknown>>>;
  publicDocuments?(app: ProviderApp): Readonly<Record<string, unknown>>;
}
