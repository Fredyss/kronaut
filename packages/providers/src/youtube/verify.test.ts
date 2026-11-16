import { describe, expect, it } from 'vitest';
import { egressError } from '../_kit/testing.ts';
import {
  resumeIncomplete,
  SENT_AT,
  SESSION,
  TOKEN,
  uploaded,
  VIDEO_ID,
  verify,
  WATCH,
} from './testing.ts';

const sent = { sessionUri: SESSION, sentAt: SENT_AT };

describe('youtube verify', () => {
  it('finds a video the upload already recorded, without calling YouTube', async () => {
    const { result, calls } = await verify([], { state: { videoId: VIDEO_ID } });
    expect(result).toEqual({ kind: 'found', remoteId: VIDEO_ID, url: WATCH });
    expect(calls).toHaveLength(0);
  });

  it('asks the session for its status and finds a completed upload', async () => {
    const { result, calls, checkpoints, events } = await verify([uploaded()], {
      state: sent,
      size: 2_000,
    });
    expect(result).toEqual({ kind: 'found', remoteId: VIDEO_ID, url: WATCH });
    expect(calls[0]).toMatchObject({
      method: 'PUT',
      url: SESSION,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Length': '0',
        'Content-Range': 'bytes */2000',
      },
    });
    expect(calls[0]?.body).toBeUndefined();
    expect(checkpoints).toEqual([]);
    expect(events.filter((event) => event.startsWith('step:'))).toEqual([]);
  });

  it.each([
    [resumeIncomplete(4), 'absent'],
    [resumeIncomplete(), 'absent'],
    [{ method: 'PUT', url: SESSION, status: 404 }, 'inconclusive'],
    [{ method: 'PUT', url: SESSION, status: 503 }, 'inconclusive'],
    [{ method: 'PUT', url: SESSION, status: 401 }, 'inconclusive'],
    [{ method: 'PUT', url: SESSION, error: egressError('timeout') }, 'inconclusive'],
  ])('maps a status answer to its verdict: %#', async (exchange, kind) => {
    const { result } = await verify([exchange], { state: sent });
    expect(result).toEqual({ kind });
  });

  it('is inconclusive without a session, or with a session URI it does not trust', async () => {
    const none = await verify([], { state: { sentAt: SENT_AT } });
    expect(none.result).toEqual({ kind: 'inconclusive' });
    const foreign = await verify([], {
      state: { sessionUri: 'https://uploads.example.org/x', sentAt: SENT_AT },
    });
    expect(foreign.result).toEqual({ kind: 'inconclusive' });
    expect(foreign.calls).toHaveLength(0);
  });
});
