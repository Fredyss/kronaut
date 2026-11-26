import { createHmac } from 'node:crypto';
import type { WebhookSecrets } from '../../../infrastructure/credentials/webhook-secret.ts';

const SECRET_PREFIX = 'whsec_';

export interface SignedMessage {
  readonly id: string;
  readonly timestamp: number;
  readonly body: string;
}

export function signatureOf(secret: string, message: SignedMessage): string {
  if (!secret.startsWith(SECRET_PREFIX)) throw new Error('a webhook secret starts with whsec_');
  const key = Buffer.from(secret.slice(SECRET_PREFIX.length), 'base64');
  try {
    const content = `${message.id}.${message.timestamp}.${message.body}`;
    return `v1,${createHmac('sha256', key).update(content, 'utf8').digest('base64')}`;
  } finally {
    key.fill(0);
  }
}

export function webhookHeaders(
  secrets: WebhookSecrets,
  message: SignedMessage,
): Record<string, string> {
  const keys = secrets.previous === null ? [secrets.current] : [secrets.current, secrets.previous];
  return {
    'content-type': 'application/json',
    'user-agent': 'Kronaut webhooks',
    'webhook-id': message.id,
    'webhook-timestamp': String(message.timestamp),
    'webhook-signature': keys.map((key) => signatureOf(key, message)).join(' '),
  };
}
