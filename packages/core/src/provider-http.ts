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
