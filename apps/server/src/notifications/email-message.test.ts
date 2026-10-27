import * as cs from '@kronaut/i18n/messages/cs';
import * as en from '@kronaut/i18n/messages/en';
import * as sk from '@kronaut/i18n/messages/sk';
import { NOTIFICATION_KINDS } from '@kronaut/i18n/notifications';
import { describe, expect, it } from 'vitest';
import { buildNotificationEmail, type EmailItem } from './email-message.ts';

const BASE = 'https://app.example.com';
const MANAGE = `${BASE}/settings/notifications`;
const CATALOGS = { en, sk, cs } as const;

const POST: EmailItem = {
  kind: 'destination.failed',
  provider: 'bluesky',
  reason: 'permanent_error',
  accountLabel: 'Shop',
  postId: 'pst_abc',
  excerpt: 'Ahoj svet',
};

const CHANNEL: EmailItem = {
  kind: 'channel.needs_reauth',
  provider: 'instagram',
  reason: 'account_needs_reauth',
  accountLabel: null,
  postId: null,
  excerpt: null,
};

function build(item: EmailItem, locale = 'en') {
  return buildNotificationEmail({
    locale,
    item,
    workspaceName: 'Acme',
    publicBaseUrl: BASE,
  });
}

function accountIn(kind: string, messages: (typeof CATALOGS)[keyof typeof CATALOGS]): string {
  if (kind.startsWith('post.')) return '';
  return kind.startsWith('channel.') ? messages.provider_instagram({}) : 'Shop';
}

describe('buildNotificationEmail', () => {
  for (const [locale, messages] of Object.entries(CATALOGS)) {
    for (const kind of NOTIFICATION_KINDS) {
      it(`writes ${kind} in ${locale}`, () => {
        const channel = kind.startsWith('channel.');
        const email = build({ ...(channel ? CHANNEL : POST), kind }, locale);
        expect(email.subject).not.toBe(messages.notification_generic({}));
        expect(email.subject).toContain(accountIn(kind, messages));
        expect(email.text.startsWith(`${email.subject}\n\n`)).toBe(true);
        expect(email.text).toContain(
          `-- \n${messages.email_footer({ workspace: 'Acme' })}\n${messages.email_manage({ url: MANAGE })}\n`,
        );
        expect(email.text).toContain(
          messages.email_open({ url: channel ? `${BASE}/channels` : `${BASE}/posts/pst_abc` }),
        );
      });
    }
  }

  it('uses the panel line as the subject and lists reason, excerpt and link', () => {
    const email = build(POST);
    expect(email.subject).toBe(en.notification_failed({ account: 'Shop' }));
    expect(email.text).toBe(
      `${[
        en.notification_failed({ account: 'Shop' }),
        en.reason_permanent_error({}),
        en.email_post({ excerpt: 'Ahoj svet' }),
        en.email_open({ url: `${BASE}/posts/pst_abc` }),
        `-- \n${en.email_footer({ workspace: 'Acme' })}\n${en.email_manage({ url: MANAGE })}`,
      ].join('\n\n')}\n`,
    );
  });

  it('omits the excerpt and links the inbox when the post is not visible', () => {
    const email = build({ ...POST, excerpt: null });
    expect(email.text).not.toContain('Ahoj svet');
    expect(email.text).not.toContain(en.email_post({ excerpt: '' }).trim());
    expect(email.text).toContain(`${BASE}/inbox`);
    expect(email.text).not.toContain('/posts/');
  });

  it('falls back to English and the generic line for unknown locales and kinds', () => {
    const email = build({ ...POST, kind: 'destination.other' }, 'de');
    expect(email.subject).toBe(en.notification_generic({}));
  });

  it('keeps the subject on one line whatever the account label holds', () => {
    const email = build({ ...POST, accountLabel: 'Shop\r\nBcc: x@example.com' });
    expect(email.subject).not.toMatch(/[\r\n]/);
  });

  it('links the email settings in every locale', () => {
    expect(en.email_manage({ url: MANAGE })).toBe(`Choose which emails you get: ${MANAGE}`);
    for (const [locale, messages] of Object.entries(CATALOGS)) {
      const footer = build(POST, locale).text.split('\n\n').at(-1);
      expect(footer?.trimEnd().split('\n').at(-1)).toBe(messages.email_manage({ url: MANAGE }));
      expect(messages.email_manage({ url: MANAGE })).toContain(MANAGE);
    }
  });

  it('skips the reason line when there is none', () => {
    const email = build({ ...CHANNEL, reason: null });
    expect(email.text.split('\n\n')).toHaveLength(3);
  });
});
