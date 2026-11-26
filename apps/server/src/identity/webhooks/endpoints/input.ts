import { randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { WEBHOOK_EVENT_TYPES, type WebhookEventType } from '@kronaut/contract';
import { HttpError } from '../../../base/http/errors.ts';

export const URL_MAX = 2048;
export const DESCRIPTION_MAX = 200;
export const SUBSCRIBABLE = WEBHOOK_EVENT_TYPES;
const SECRET_BYTES = 32;

function refused(path: string, code: string, message: string): HttpError {
  return new HttpError('unprocessable', message, { details: [{ path, code }] });
}

function bare(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

// The sender range-checks every resolved address; this only refuses what could never be delivered.
export function endpointUrl(value: string): string {
  const url = value.length > URL_MAX ? null : URL.parse(value.trim());
  const deliverable =
    url !== null &&
    url.protocol === 'https:' &&
    url.username === '' &&
    url.password === '' &&
    url.port === '' &&
    isIP(bare(url.hostname)) === 0 &&
    url.href.length <= URL_MAX;
  if (!deliverable) {
    throw refused(
      'body.url',
      'url_invalid',
      'The endpoint URL must be an https link on port 443 with a host name and no credentials.',
    );
  }
  return url.href;
}

export function endpointEvents(events: readonly WebhookEventType[]): WebhookEventType[] {
  return SUBSCRIBABLE.filter((type) => events.includes(type));
}

export function endpointDescription(value: string | null): string | null {
  if (value === null) return null;
  const description = value.normalize('NFC').trim();
  if ([...description].length > DESCRIPTION_MAX) {
    throw refused(
      'body.description',
      'description_invalid',
      `A description has at most ${DESCRIPTION_MAX} characters.`,
    );
  }
  return description === '' ? null : description;
}

export function newSigningSecret(): string {
  return `whsec_${randomBytes(SECRET_BYTES).toString('base64')}`;
}
