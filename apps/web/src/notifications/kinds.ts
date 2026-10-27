import { CHANNEL_KINDS, notificationLine as line } from '@kronaut/i18n/notifications';
import type { NotificationItem } from '../api.ts';
import { m } from '../i18n.ts';
import { providerUi } from '../providers.ts';

export function notificationLine(item: NotificationItem): string {
  return line(m, item.kind, item.accountLabel ?? providerUi(item.provider).name());
}

export type NotificationTarget =
  | { readonly to: '/channels' | '/inbox' }
  | { readonly to: '/posts/$postId'; readonly params: { readonly postId: string } };

export function notificationTarget(item: NotificationItem): NotificationTarget {
  if (CHANNEL_KINDS.has(item.kind)) return { to: '/channels' };
  if (item.postId !== null && item.excerpt !== null) {
    return { to: '/posts/$postId', params: { postId: item.postId } };
  }
  return { to: '/inbox' };
}
