import { describe, expect, it } from 'vitest';
import * as en from '#paraglide/messages/en.js';
import * as sk from '#paraglide/messages/sk.js';
import { notificationLine, providerName, reasonLabel } from './notifications.ts';

describe('notification messages', () => {
  it('labels known reasons and falls back for unknown or inherited codes', () => {
    expect(reasonLabel(en, 'permanent_error')).toBe(en.reason_permanent_error({}));
    expect(reasonLabel(sk, 'restore_quarantine')).toBe(sk.reason_restore_quarantine({}));
    expect(reasonLabel(en, 'nope')).toBe(en.reason_generic({}));
    expect(reasonLabel(en, 'toString')).toBe(en.reason_generic({}));
  });

  it('builds the one-line message per kind with the account', () => {
    expect(notificationLine(en, 'destination.failed', 'Shop')).toBe(
      en.notification_failed({ account: 'Shop' }),
    );
    expect(notificationLine(sk, 'channel.expiring', 'Shop')).toBe(
      sk.notification_expiring({ account: 'Shop' }),
    );
    expect(notificationLine(en, 'destination.unknown', 'Shop')).toBe(en.notification_generic({}));
  });

  it('names known providers and passes unknown ids through', () => {
    expect(providerName(en, 'bluesky')).toBe('Bluesky');
    expect(providerName(en, 'mastodon')).toBe('Mastodon');
    expect(providerName(en, 'threads')).toBe('Threads');
    expect(providerName(en, 'facebook')).toBe('Facebook');
    expect(providerName(en, 'linkedin')).toBe('LinkedIn');
    expect(providerName(en, 'pinterest')).toBe('pinterest');
  });
});
