import type { Channel } from '../api.ts';
import { m } from '../i18n.ts';

export function statusLabel(status: Channel['status']): string {
  switch (status) {
    case 'active':
      return m.channel_status_active();
    case 'needs_reauth':
      return m.channel_status_needs_reauth();
    case 'disabled':
      return m.channel_status_disabled();
    case 'disconnected':
      return m.channel_status_disconnected();
  }
}
