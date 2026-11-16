import { describe, expect, it } from 'vitest';
import { assertPublicSendOrder } from '../_kit/testing.ts';
import { discordManifest } from './manifest.ts';
import { bodyText, EXECUTE, image, MESSAGE_ID, runPublish, WEBHOOK_TOKEN } from './testing.ts';

const sent = { method: 'POST', url: EXECUTE, json: { id: MESSAGE_ID, channel_id: '1' } };
const PERMALINK = `https://discord.com/channels/112233445566778899/998877665544332211/${MESSAGE_ID}`;

describe('discord publish', () => {
  it('sends text as JSON with mentions limited to users and roles', async () => {
    const run = await runPublish([sent], { text: 'Hello @everyone' });
    expect(run.result).toEqual({ kind: 'published', remoteId: MESSAGE_ID, url: PERMALINK });
    const [call] = run.calls;
    expect(call?.headers['content-type']).toBe('application/json');
    expect(JSON.parse(bodyText(call?.body))).toEqual({
      content: 'Hello @everyone',
      allowed_mentions: { parse: ['users', 'roles'] },
    });
    assertPublicSendOrder(run.events, discordManifest);
    expect(run.checkpoints.at(-1)).toMatchObject({ message: { id: MESSAGE_ID } });
  });

  it('maps silent and pingEveryone to flags and allowed mentions', async () => {
    const run = await runPublish([sent], { settings: { silent: true, pingEveryone: true } });
    expect(JSON.parse(bodyText(run.calls[0]?.body))).toEqual({
      content: 'Hello',
      allowed_mentions: { parse: ['users', 'roles', 'everyone'] },
      flags: 4096,
    });
  });

  it('sends media as multipart with payload_json, files[n] and alt text descriptions', async () => {
    const media = [image('m1', { altText: 'A cat' }), image('m2', { mime: 'video/mp4' })];
    const run = await runPublish([sent], { text: '', media });
    const type = run.calls[0]?.headers['content-type'] ?? '';
    expect(type).toMatch(/^multipart\/form-data; boundary=/);
    const text = bodyText(run.calls[0]?.body);
    const json = /name="payload_json"\r\n\r\n(.*)\r\n/.exec(text)?.[1] ?? '';
    expect(JSON.parse(json)).toEqual({
      allowed_mentions: { parse: ['users', 'roles'] },
      attachments: [
        { id: 0, filename: '1.png', description: 'A cat' },
        { id: 1, filename: '2.mp4' },
      ],
    });
    expect(text).toContain(
      'name="files[0]"; filename="1.png"\r\nContent-Type: image/png\r\n\r\nm1',
    );
    expect(text).toContain(
      'name="files[1]"; filename="2.mp4"\r\nContent-Type: video/mp4\r\n\r\nm2',
    );
  });

  it('returns the saved message without sending again', async () => {
    const run = await runPublish([], { state: { message: { id: MESSAGE_ID } } });
    expect(run.result).toEqual({ kind: 'published', remoteId: MESSAGE_ID, url: PERMALINK });
  });

  it.each([
    ['an empty message', { text: ' ' }, 'text_empty'],
    [
      'eleven files',
      { media: Array.from({ length: 11 }, (_, n) => image(`m${n}`)) },
      'too_many_media',
    ],
    [
      'a file over 20 MiB',
      { media: [image('m1', { bytes: 20 * 1024 * 1024 + 1 })] },
      'file_too_large',
    ],
    [
      'files over 25 MiB in total',
      {
        media: [image('m1', { bytes: 13 * 1024 * 1024 }), image('m2', { bytes: 13 * 1024 * 1024 })],
      },
      'too_large',
    ],
    [
      'an unsupported format',
      { media: [image('m1', { mime: 'image/heic' })] },
      'media_type_unsupported',
    ],
  ])('refuses %s before any step', async (_name, options, code) => {
    const run = await runPublish([], options);
    expect(run.error).toEqual({ kind: 'permanent', code });
    expect(run.events).toEqual([]);
  });

  it('never puts the webhook token in errors or logs', async () => {
    const failures = [
      {
        method: 'POST',
        url: EXECUTE,
        status: 404,
        json: { code: 10015, message: 'Unknown Webhook' },
      },
      { method: 'POST', url: EXECUTE, status: 502, text: 'bad gateway' },
      { method: 'POST', url: EXECUTE, json: { nope: true } },
    ];
    for (const failure of failures) {
      const run = await runPublish([failure]);
      expect(run.error).toBeDefined();
      expect(JSON.stringify({ error: run.error, logged: run.logged })).not.toContain(WEBHOOK_TOKEN);
    }
  });
});
