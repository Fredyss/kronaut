import { describe, expect, it } from 'vitest';
import { renderOpenApi } from '../../openapi.ts';
import { TOOL_DEFINITIONS } from './catalog.ts';

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

  it('builds every tool from a route an API key may use, or the server does not start', () => {
    expect(() => renderOpenApi()).not.toThrow();
  });
});
