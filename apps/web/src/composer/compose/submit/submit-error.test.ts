import { ApiRequestError } from '@kronaut/sdk';
import { describe, expect, it } from 'vitest';
import { SubmitError, stalePickAccounts } from './submit-error.ts';

function refused(details: { path: string; code: string }[]): SubmitError {
  const cause = new ApiRequestError(422, {
    error: { code: 'unprocessable', message: '', details },
  });
  return new SubmitError('update', cause, [
    { accountId: 'acct_bsky', variant: null },
    { accountId: 'acct_ig', variant: null },
  ]);
}

describe('stalePickAccounts', () => {
  it('names the channels whose group pick was refused, for a deleted group or a channel that left', () => {
    const error = refused([
      { path: 'body.destinations.0.sourceGroupId', code: 'not_found' },
      { path: 'body.destinations.1.sourceGroupId', code: 'not_in_group' },
    ]);
    expect(stalePickAccounts(error)).toEqual(['acct_bsky', 'acct_ig']);
  });

  it('leaves other details on the same destinations alone', () => {
    const error = refused([
      { path: 'body.destinations.0.accountId', code: 'not_found' },
      { path: 'body.destinations.1.items.0', code: 'text_too_long' },
    ]);
    expect(stalePickAccounts(error)).toEqual([]);
  });
});
