import {
  EgressError,
  type EgressErrorCode,
  type EgressPolicy,
  type HttpClient,
} from '@kronaut/egress';
import { FeedInvalid, type FeedItem, parseFeed } from './parse.ts';

export const RSS_EGRESS: EgressPolicy = {
  allowedHosts: 'any',
  maxResponseBytes: 5 * 1024 * 1024,
  timeoutMs: 30_000,
  maxRedirects: 3,
};

const REQUEST_HEADERS = {
  'user-agent': 'Kronaut feed reader',
  accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9',
};
const VALIDATOR_MAX = 1024;
const MODIFIED_MAX = 128;
const ENCODING = /^<\?xml[^>]*encoding=["']([A-Za-z0-9._-]{1,40})["']/;

export const FEED_ERRORS = [
  'url_blocked',
  'fetch_failed',
  'timed_out',
  'too_large',
  'feed_invalid',
] as const;

export type FeedError = (typeof FEED_ERRORS)[number];

export class FeedFailed extends Error {
  readonly kind: FeedError;

  constructor(kind: FeedError) {
    super(kind);
    this.name = 'FeedFailed';
    this.kind = kind;
  }
}

const EGRESS_FAILURES: Readonly<Record<EgressErrorCode, FeedError>> = {
  blocked_address: 'url_blocked',
  blocked_host: 'url_blocked',
  blocked_scheme: 'url_blocked',
  blocked_port: 'url_blocked',
  too_many_redirects: 'url_blocked',
  response_too_large: 'too_large',
  timeout: 'timed_out',
  dns_failure: 'fetch_failed',
  network: 'fetch_failed',
};

// Egress and undici errors can carry the URL, which may hold a token, so only the kind leaves.
export function classifyFeedFailure(error: unknown): FeedError {
  if (error instanceof FeedFailed) return error.kind;
  if (error instanceof FeedInvalid) return 'feed_invalid';
  if (error instanceof EgressError) return EGRESS_FAILURES[error.code];
  return 'fetch_failed';
}

export interface Validators {
  readonly etag: string | null;
  readonly lastModified: string | null;
}

export type Fetched =
  | { readonly kind: 'not_modified' }
  | ({ readonly kind: 'fetched'; readonly items: readonly FeedItem[] } & Validators);

function decode(bytes: Uint8Array): string {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 200));
  const label = ENCODING.exec(head.replace(/^﻿|^ï»¿/, ''))?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

function header(headers: Headers, name: string, max: number): string | null {
  const value = headers.get(name);
  return value === null || value.length > max ? null : value;
}

function conditional(validators: Validators): Record<string, string> {
  return {
    ...REQUEST_HEADERS,
    ...(validators.etag === null ? {} : { 'if-none-match': validators.etag }),
    ...(validators.lastModified === null ? {} : { 'if-modified-since': validators.lastModified }),
  };
}

async function request(http: HttpClient, url: string, validators: Validators): Promise<Fetched> {
  const response = await http.request(url, { headers: conditional(validators) });
  try {
    if (response.status === 304) return { kind: 'not_modified' };
    if (response.status !== 200) throw new FeedFailed('fetch_failed');
    const xml = decode(await response.bytes());
    return {
      kind: 'fetched',
      items: parseFeed(xml, url),
      etag: header(response.headers, 'etag', VALIDATOR_MAX),
      lastModified: header(response.headers, 'last-modified', MODIFIED_MAX),
    };
  } finally {
    response.discard();
  }
}

export async function fetchFeed(
  http: HttpClient,
  url: string,
  validators: Validators,
): Promise<Fetched> {
  try {
    return await request(http, url, validators);
  } catch (error) {
    throw new FeedFailed(classifyFeedFailure(error));
  }
}
