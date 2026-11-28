import type { Database } from '@kronaut/db';
import { describe, expect, it } from 'vitest';
import { createTestInstance } from '../../base/http/testing.ts';
import { renderOpenApi } from '../../openapi.ts';
import { catalog, TOOL_DEFINITIONS } from './catalog.ts';

const unusedDb: Database = {
  withTenant: () => Promise.reject(new Error('database not available in unit tests')),
  withActor: () => Promise.reject(new Error('database not available in unit tests')),
  sweeps: {} as Database['sweeps'],
  destroy: () => Promise.resolve(),
};

const MATRIX = [
  ['get_brand_context', 'brands.list', 'brands:read', 'none'],
  ['list_channels', 'channels.list', 'channels:read', 'none'],
  ['list_account_groups', 'groups.list', 'groups:read', 'none'],
  ['draft_campaign', 'posts.create', 'posts:draft', 'required'],
  ['update_draft', 'posts.update', 'posts:draft', 'required'],
  ['add_media_from_url', 'media.import_create', 'media:write', 'required'],
  ['validate_draft', 'posts.preflight', 'posts:read', 'none'],
  ['preview_post', 'posts.preflight', 'posts:read', 'none'],
  ['request_approval', 'posts.request_approval', 'posts:submit', 'required'],
  ['schedule_approved_post', 'posts.schedule', 'posts:schedule', 'required'],
  ['get_publish_status', 'posts.get', 'posts:read', 'none'],
  ['cancel_scheduled_post', 'posts.cancel', 'posts:cancel', 'generated'],
  ['get_post_metrics', 'analytics.post_metrics', 'analytics:read', 'none'],
];

const FROZEN = [
  'get_brand_context',
  'list_channels',
  'list_account_groups',
  'draft_campaign',
  'update_draft',
  'add_media_from_url',
  'validate_draft',
  'preview_post',
  'request_approval',
  'schedule_approved_post',
  'get_publish_status',
  'cancel_scheduled_post',
  'get_post_metrics',
];
const STARRED = [
  'draft_campaign',
  'update_draft',
  'add_media_from_url',
  'request_approval',
  'schedule_approved_post',
];

describe('mcp tool catalog', () => {
  it('has exactly the frozen tool names (ADR-0030)', () => {
    expect(TOOL_DEFINITIONS.map((tool) => tool.name)).toEqual(FROZEN);
  });

  it('requires an idempotency key on the starred tools only', () => {
    const required = TOOL_DEFINITIONS.filter((tool) => tool.keyed === 'required');
    expect(required.map((tool) => tool.name)).toEqual(STARRED);
  });

  it('maps each tool to its route, action and scope (ADR-0072 matrix)', () => {
    const { routes } = createTestInstance({ db: unusedDb });
    const tools = catalog(routes.map((bound) => bound.route));
    const actions = new Map(routes.map((bound) => [bound.route.id, bound.route.action]));
    expect(tools.map((t) => [t.name, t.route, t.scope, t.keyed])).toEqual(MATRIX);
    for (const tool of tools) expect(actions.get(tool.route)).toBe(tool.scope);
  });

  it('builds every tool from a route an API key may use, or the server does not start', () => {
    expect(() => renderOpenApi()).not.toThrow();
  });
});
