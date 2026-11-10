import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { encodePublicId } from '@kronaut/core';
import { createKeyring } from '@kronaut/credentials';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type PublishFixture, startPublishFixture } from '../../steps/publish/testing.ts';
import { findBlueskyChannels } from './bluesky-video.ts';

const execFileAsync = promisify(execFile);
const CLI_PATH = join(import.meta.dirname, '..', '..', 'cli.ts');
const LATER = Temporal.Now.instant().add({ hours: 1 });

let test: TestDatabase;
let fixture: PublishFixture;
let kek: Buffer;
let alice: string;
let bob: string;

async function blueskyAccount(handle: string, did: string): Promise<string> {
  const app = await fixture.createApp(`https://kronaut.example.test/${handle}`, 'bluesky');
  const id = await fixture.connectAccount(app, {
    provider: 'bluesky',
    value: { did, marker: handle },
    accessExpiresAt: LATER,
  });
  await fixture.owner.withTenant(fixture.workspaceId, { kind: 'system' }, (trx) =>
    trx
      .updateTable('social_accounts')
      .set({ handle, provider_account_id: did })
      .where('workspace_id', '=', fixture.workspaceId)
      .where('id', '=', id)
      .execute(),
  );
  return id;
}

beforeAll(async () => {
  test = await startTestDatabase();
  kek = randomBytes(32);
  fixture = await startPublishFixture(test, 'ws-bluesky-video', createKeyring(new Map([[1, kek]])));
  alice = await blueskyAccount('alice.example.com', 'did:plc:aliceaaaaaaaaaaaaaaaaaaa');
  bob = await blueskyAccount('bob.example.com', 'did:plc:bobbbbbbbbbbbbbbbbbbbbbb');
  await fixture.owner.withTenant(fixture.workspaceId, { kind: 'system' }, (trx) =>
    trx
      .updateTable('social_accounts')
      .set({ status: 'disconnected' })
      .where('workspace_id', '=', fixture.workspaceId)
      .where('id', '=', bob)
      .execute(),
  );
  await fixture.connectAccount(fixture.appId);
});

afterAll(async () => {
  await fixture?.stop();
  await test?.stop();
});

async function cli(...args: string[]) {
  const env = {
    PATH: process.env.PATH ?? '',
    KRONAUT_DATABASE_URL: test.appUrl,
    KRONAUT_KEK_1: kek.toString('base64url'),
    LANG: 'en_US.UTF-8',
  };
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [CLI_PATH, ...args], { env });
    return { code: 0, stdout, stderr };
  } catch (err) {
    const failed = err as { code?: number; stdout?: string; stderr?: string };
    return { code: failed.code ?? -1, stdout: failed.stdout ?? '', stderr: failed.stderr ?? '' };
  }
}

describe('finding Bluesky channels for the video check', () => {
  it('lists active Bluesky channels with their opened credentials, across the sweep', async () => {
    const channels = await findBlueskyChannels({ db: fixture.db, keyring: fixture.keyring });
    expect(channels).toEqual([
      {
        id: encodePublicId('socialAccount', alice),
        handle: 'alice.example.com',
        did: 'did:plc:aliceaaaaaaaaaaaaaaaaaaa',
        credential: {
          kind: 'stored',
          value: { did: 'did:plc:aliceaaaaaaaaaaaaaaaaaaa', marker: 'alice.example.com' },
          accessExpiresAt: new Date(LATER.epochMilliseconds),
        },
      },
    ]);
  });

  it('marks a credential it cannot open instead of failing the run', async () => {
    const other = createKeyring(new Map([[1, randomBytes(32)]]));
    const channels = await findBlueskyChannels({ db: fixture.db, keyring: other });
    expect(channels.map((channel) => channel.credential)).toEqual([{ kind: 'unreadable' }]);
  });

  it('matches a handle without case or a leading @, or a DID', async () => {
    const deps = { db: fixture.db, keyring: fixture.keyring };
    for (const filter of ['@Alice.Example.com', 'did:plc:aliceaaaaaaaaaaaaaaaaaaa']) {
      const found = await findBlueskyChannels(deps, filter);
      expect(found.map((channel) => channel.handle)).toEqual(['alice.example.com']);
    }
    expect(await findBlueskyChannels(deps, 'bob.example.com')).toEqual([]);
  });

  it('reports a channel whose stored credential is not a Bluesky session, without a request', async () => {
    const run = await cli('bluesky', 'video-check', 'alice.example.com');
    expect(run.code).toBe(0);
    expect(run.stdout.split('\n')).toEqual([
      `alice.example.com  ${encodePublicId('socialAccount', alice)}`,
      "  Kronaut can't read this channel's stored credential; reconnect it",
      '',
    ]);
  });

  it('fails when no channel matches, and rejects extra handles and unknown subcommands', async () => {
    const none = await cli('bluesky', 'video-check', 'nobody.example.com');
    expect(none.code).toBe(1);
    expect(none.stderr).toContain('no connected Bluesky channel found');
    expect(none.stdout).toBe('');
    const extra = await cli('bluesky', 'video-check', 'a.example.com', 'b.example.com');
    expect(extra.code).toBe(2);
    expect(extra.stderr).toContain('expected at most one handle');
    const unknown = await cli('bluesky', 'frobnicate');
    expect(unknown.code).toBe(2);
    expect(unknown.stderr).toContain('kronaut bluesky video-check [<handle>]');
  });
});
