import { cliMessages } from '@kronaut/i18n/cli';
import type { VideoCheckReport } from '@kronaut/providers/bluesky/video-check';
import { describe, expect, it } from 'vitest';
import { renderChannel } from './bluesky-command.ts';

const ready: VideoCheckReport = {
  checks: [
    { id: 'upload_token', result: { outcome: 'ok' } },
    { id: 'video_token', result: { outcome: 'refused', status: 400, code: 'InvalidRequest' } },
    { id: 'limits_token', result: { outcome: 'ok' } },
    { id: 'upload_limits', result: { outcome: 'ok' } },
  ],
  limits: { canUpload: true, remainingDailyVideos: 25, message: 'fine "really"' },
};

describe('rendering the Bluesky video check', () => {
  it('prints each check, the limits and the verdict', () => {
    const text = renderChannel(cliMessages('en'), {
      id: 'acct_x',
      name: 'alice.example.com',
      check: { kind: 'checked', report: ready },
    });
    expect(text.split('\n')).toEqual([
      'alice.example.com  acct_x',
      '  upload_token  ok',
      '  video_token   refused (HTTP 400) InvalidRequest',
      '  limits_token  ok',
      '  upload_limits ok  canUpload=true remainingDailyVideos=25 message="fine \\"really\\""',
      `  ${cliMessages('en').video_verdict_ready({})}`,
    ]);
  });

  it('prints why a channel was not checked', () => {
    const m = cliMessages('cs');
    const expired = renderChannel(m, { id: 'acct_x', name: 'a', check: { kind: 'expired' } });
    expect(expired).toBe(`a  acct_x\n  ${m.video_check_expired({})}`);
    const unreadable = renderChannel(m, { id: 'acct_x', name: 'a', check: { kind: 'unreadable' } });
    expect(unreadable).toBe(`a  acct_x\n  ${m.video_check_unreadable({})}`);
  });

  it('prints the code of a failed check after its kind', () => {
    const report: VideoCheckReport = {
      checks: [
        {
          id: 'upload_token',
          result: { outcome: 'failed', kind: 'permanent', code: 'egress_blocked' },
        },
        { id: 'video_token', result: { outcome: 'failed', kind: 'transient' } },
      ],
    };
    const lines = renderChannel(cliMessages('en'), {
      id: 'acct_x',
      name: 'a',
      check: { kind: 'checked', report },
    }).split('\n');
    expect(lines.slice(1, 3)).toEqual([
      '  upload_token  failed (permanent: egress_blocked)',
      '  video_token   failed (transient)',
    ]);
  });
});
