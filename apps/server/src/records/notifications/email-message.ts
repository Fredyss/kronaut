import * as cs from '@kronaut/i18n/messages/cs';
import * as en from '@kronaut/i18n/messages/en';
import * as sk from '@kronaut/i18n/messages/sk';
import {
  CHANNEL_KINDS,
  notificationLine,
  providerName,
  reasonLabel,
} from '@kronaut/i18n/notifications';
import type { NotificationDto } from './list.ts';

const CATALOGS = { en, sk, cs } as const;

export const MANAGE_PATH = '/settings/notifications';

export type EmailItem = Pick<
  NotificationDto,
  'kind' | 'provider' | 'reason' | 'accountLabel' | 'postId' | 'excerpt'
>;

export interface EmailInput {
  readonly locale: string;
  readonly item: EmailItem;
  readonly workspaceName: string;
  readonly publicBaseUrl: string;
}

export interface EmailContent {
  readonly subject: string;
  readonly text: string;
}

function catalogFor(locale: string) {
  return Object.hasOwn(CATALOGS, locale) ? CATALOGS[locale as keyof typeof CATALOGS] : en;
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function notificationPath(item: EmailItem): string {
  if (CHANNEL_KINDS.has(item.kind)) return '/channels';
  if (item.postId !== null && item.excerpt !== null) {
    return `/posts/${encodeURIComponent(item.postId)}`;
  }
  return '/inbox';
}

export function buildNotificationEmail(input: EmailInput): EmailContent {
  const messages = catalogFor(input.locale);
  const { item } = input;
  const account = item.accountLabel ?? providerName(messages, item.provider);
  const subject = oneLine(notificationLine(messages, item.kind, oneLine(account)));
  const url = new URL(notificationPath(item), input.publicBaseUrl).toString();
  const paragraphs = [
    subject,
    ...(item.reason === null ? [] : [reasonLabel(messages, item.reason)]),
    ...(item.excerpt === null || item.excerpt === ''
      ? []
      : [messages.email_post({ excerpt: item.excerpt })]),
    messages.email_open({ url }),
    [
      '-- ',
      messages.email_footer({ workspace: oneLine(input.workspaceName) }),
      messages.email_manage({ url: new URL(MANAGE_PATH, input.publicBaseUrl).toString() }),
    ].join('\n'),
  ];
  return { subject, text: `${paragraphs.join('\n\n')}\n` };
}
