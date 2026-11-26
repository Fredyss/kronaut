import { describe, expect, it } from 'vitest';
import { signatureOf, webhookHeaders } from './sign.ts';

const VECTOR = {
  secret: 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw',
  message: {
    id: 'msg_p5jXN8AQM9LWM0D4loKWxJek',
    timestamp: 1614265330,
    body: '{"test": 2432232314}',
  },
  signature: 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=',
};

describe('Standard Webhooks signing', () => {
  it('matches the specification test vector', () => {
    expect(signatureOf(VECTOR.secret, VECTOR.message)).toBe(VECTOR.signature);
  });

  it('sends the id, the timestamp and one signature per live secret, newest first', () => {
    const previous = 'whsec_dGhlIHByZXZpb3VzIHNlY3JldCBieXRlcyE=';
    const headers = webhookHeaders({ current: VECTOR.secret, previous }, VECTOR.message);
    expect(headers['webhook-id']).toBe(VECTOR.message.id);
    expect(headers['webhook-timestamp']).toBe('1614265330');
    expect(headers['webhook-signature']).toBe(
      `${VECTOR.signature} ${signatureOf(previous, VECTOR.message)}`,
    );
    expect(
      webhookHeaders({ current: VECTOR.secret, previous: null }, VECTOR.message),
    ).toMatchObject({ 'webhook-signature': VECTOR.signature, 'content-type': 'application/json' });
  });

  it('refuses a secret without the whsec_ prefix', () => {
    expect(() => signatureOf('MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw', VECTOR.message)).toThrow();
  });
});
