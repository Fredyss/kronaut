import { m as settingsText } from '../../i18n/settings.ts';

export const GRANTABLE_SCOPES = [
  'brands:read',
  'channels:read',
  'groups:read',
  'posts:read',
  'media:read',
  'analytics:read',
  'comments:read',
  'audit:read',
  'posts:draft',
  'posts:submit',
  'posts:schedule',
  'posts:cancel',
  'media:write',
  'comments:write',
  'ai:generate',
] as const;

export type GrantableScope = (typeof GRANTABLE_SCOPES)[number];

const SCOPE_LABELS: Readonly<Record<GrantableScope, () => string>> = {
  'brands:read': () => settingsText.settings_api_keys_scope_brands_read(),
  'channels:read': () => settingsText.settings_api_keys_scope_channels_read(),
  'groups:read': () => settingsText.settings_api_keys_scope_groups_read(),
  'posts:read': () => settingsText.settings_api_keys_scope_posts_read(),
  'media:read': () => settingsText.settings_api_keys_scope_media_read(),
  'analytics:read': () => settingsText.settings_api_keys_scope_analytics_read(),
  'comments:read': () => settingsText.settings_api_keys_scope_comments_read(),
  'audit:read': () => settingsText.settings_api_keys_scope_audit_read(),
  'posts:draft': () => settingsText.settings_api_keys_scope_posts_draft(),
  'posts:submit': () => settingsText.settings_api_keys_scope_posts_submit(),
  'posts:schedule': () => settingsText.settings_api_keys_scope_posts_schedule(),
  'posts:cancel': () => settingsText.settings_api_keys_scope_posts_cancel(),
  'media:write': () => settingsText.settings_api_keys_scope_media_write(),
  'comments:write': () => settingsText.settings_api_keys_scope_comments_write(),
  'ai:generate': () => settingsText.settings_api_keys_scope_ai_generate(),
};

export function isGrantableScope(scope: string): scope is GrantableScope {
  return Object.hasOwn(SCOPE_LABELS, scope);
}

export function scopeLabel(scope: string): string {
  return isGrantableScope(scope) ? SCOPE_LABELS[scope]() : scope;
}
