import type { HttpClient } from '@kronaut/egress';
import { dubShortener } from './dub.ts';
import { kuttShortener } from './kutt.ts';

export const SHORTENER_PROVIDERS = ['dub', 'kutt'] as const;

export type ShortenerProvider = (typeof SHORTENER_PROVIDERS)[number];

export const DUB_BASE_URL = 'https://api.dub.co';

export interface CreatedLink {
  readonly shortUrl: string;
  readonly linkId: string;
}

export interface Shortener {
  create(target: string, externalId?: string): Promise<CreatedLink>;
  checkKey(): Promise<void>;
}

export interface ShortenerConfig {
  readonly provider: ShortenerProvider;
  readonly baseUrl: string;
  readonly domain: string | null;
  readonly key: string;
}

export interface ShortenerClient {
  readonly http: HttpClient;
  readonly config: ShortenerConfig;
  readonly signal?: AbortSignal | undefined;
}

export function createShortener(client: ShortenerClient): Shortener {
  return client.config.provider === 'dub' ? dubShortener(client) : kuttShortener(client);
}
