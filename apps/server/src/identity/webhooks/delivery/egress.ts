import {
  EgressError,
  type EgressErrorCode,
  type EgressPolicy,
  type HttpClient,
} from '@kronaut/egress';

export const WEBHOOK_EGRESS: EgressPolicy = {
  allowedHosts: 'any',
  maxResponseBytes: 1024 * 1024,
  timeoutMs: 15_000,
  maxRedirects: 0,
};

export type DeliveryError = 'http_status' | EgressErrorCode | 'internal';

export type SendOutcome =
  | { readonly ok: true; readonly status: number }
  | { readonly ok: false; readonly status: number | null; readonly error: DeliveryError };

export interface WebhookRequest {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: string;
}

// Only the status leaves: the body is the receiver's and is never read, and egress messages can name the URL.
export async function postWebhook(http: HttpClient, request: WebhookRequest): Promise<SendOutcome> {
  try {
    const response = await http.request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
      sensitiveHeaders: ['webhook-signature'],
    });
    response.discard();
    const { status } = response;
    return status >= 200 && status < 300
      ? { ok: true, status }
      : { ok: false, status, error: 'http_status' };
  } catch (error) {
    if (error instanceof EgressError) return { ok: false, status: null, error: error.code };
    return { ok: false, status: null, error: 'internal' };
  }
}
