import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OPENAPI_PATH, renderOpenApi } from './openapi.ts';

describe('openapi.json', () => {
  it('matches the registered routes', () => {
    expect(
      readFileSync(OPENAPI_PATH, 'utf8') === renderOpenApi(),
      'packages/contract/openapi.json is stale: run `pnpm gen:api`',
    ).toBe(true);
  });
});
