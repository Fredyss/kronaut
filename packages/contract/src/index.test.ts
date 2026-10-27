import { expect, it } from 'vitest';
import * as contract from './index.ts';

it('re-exports the public runtime names of every module', () => {
  expect(Object.keys(contract).sort()).toEqual([
    'API_ERROR_CODES',
    'API_ERROR_STATUS',
    'AUTH_MODES',
    'ApiErrorSchema',
    'HTTP_METHODS',
    'WEBHOOK_API_VERSION',
    'WEBHOOK_EVENT_TYPES',
    'apiError',
    'createRegistry',
    'defineRoute',
    'toOpenApi',
  ]);
});
