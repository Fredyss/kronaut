import { ApiRequestError } from '@kronaut/sdk';
import { describe, expect, it } from 'vitest';
import { m } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { feedErrors } from './errors.ts';

const NAMES = ['Ada', 'Bob'];
const nameOf = (index: number) => NAMES[index] ?? '';

function refused(status: number, code: string, details: { path: string; code: string }[] = []) {
  return new ApiRequestError(status, { error: { code, message: '', details } });
}

describe('feedErrors', () => {
  it('puts each detail at its field and names the channel', () => {
    const error = refused(422, 'unprocessable', [
      { path: 'body.url', code: 'feed_unreachable' },
      { path: 'body.name', code: 'name_invalid' },
      { path: 'body.template', code: 'template_invalid' },
      { path: 'body.channelIds.1', code: 'queue_empty' },
      { path: 'body.channelIds.0', code: 'channel_unsupported' },
    ]);
    expect(feedErrors(error, nameOf)).toEqual({
      url: settingsText.settings_feed_unreachable(),
      name: settingsText.settings_feed_name_invalid(),
      template: settingsText.settings_feed_template_invalid(),
      channels: [
        settingsText.settings_feed_channel_queue({ channel: 'Bob' }),
        settingsText.settings_feed_channel_unsupported({ channel: 'Ada' }),
      ],
    });
  });

  it('maps every url code and a missing channel', () => {
    const codes = ['url_invalid', 'feed_invalid'].map((code) => ({ path: 'body.url', code }));
    expect(feedErrors(refused(422, 'unprocessable', codes.slice(0, 1)), nameOf).url).toBe(
      settingsText.settings_feed_url_invalid(),
    );
    expect(feedErrors(refused(422, 'unprocessable', codes.slice(1)), nameOf).url).toBe(
      settingsText.settings_feed_invalid(),
    );
    const gone = refused(422, 'unprocessable', [{ path: 'body.channelIds.0', code: 'not_found' }]);
    expect(feedErrors(gone, nameOf).channels).toEqual([settingsText.settings_feed_channel_gone()]);
  });

  it('shows the feed limit and unknown failures for the whole dialog', () => {
    expect(feedErrors(refused(409, 'rss_feed_limit'), nameOf)).toEqual({
      channels: [],
      form: settingsText.settings_feed_limit(),
    });
    const odd = refused(422, 'unprocessable', [{ path: 'body.mode', code: 'invalid_enum' }]);
    expect(feedErrors(odd, nameOf).form).toBe(m.error_generic());
    expect(feedErrors(new Error('offline'), nameOf).form).toBe(m.error_generic());
  });
});
