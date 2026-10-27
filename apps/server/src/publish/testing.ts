import { randomBytes, randomUUID } from 'node:crypto';
import { contentHash } from '@kronaut/compose';
import { createKeyring, type Keyring } from '@kronaut/credentials';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import type { HttpClient } from '@kronaut/egress';
import { sql } from 'kysely';
import { pino } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import { saveCredential } from '../credential-store.ts';
import { installJobQueue } from '../job-queue.ts';
import type { MediaAccess } from '../media-access.ts';
import { createProviderRegistry } from '../providers.ts';
import { contentHashInput, parseSnapshot, resolveDestination } from '../snapshot.ts';
import { type PublishDeps, publishDeps } from './task.ts';
import { FAKE_PROVIDER, type FakeProvider, fakeProvider } from './testing-fake.ts';

export {
  FAKE_PROVIDER,
  FAKE_TEXT_MAX,
  type FakeAuthConfig,
  type FakeBehaviour,
  type FakeCall,
  type FakeHook,
  type FakePoll,
  type FakeProvider,
  type FakeRefresh,
  type FakeRefreshCall,
  type FakeVerify,
  type FakeVerifyConfig,
  fakeManifest,
  fakeProvider,
  fakeVerifyDefaults,
} from './testing-fake.ts';

export const SEED_TEXT = 'Ahoj svet';

const SYSTEM: Actor = { kind: 'system' };
const CLI: Actor = { kind: 'cli' };

export interface Seeded {
  readonly destinationId: string;
  readonly postId: string;
  readonly accountId: string;
}

export interface SeedOptions {
  readonly text?: string;
  readonly deliveryMode?: 'auto' | 'reminder';
  readonly deadlineSeconds?: number;
  readonly accountId?: string;
  readonly appId?: string;
  readonly schedulerId?: string;
  readonly attemptCount?: number;
  readonly provider?: string;
  readonly media?: readonly unknown[];
}

export interface SeedCredential {
  readonly value?: unknown;
  readonly accessExpiresAt?: Temporal.Instant;
  readonly refreshExpiresAt?: Temporal.Instant;
  readonly clientKeyId?: string;
  readonly provider?: string;
}

export interface PublishFixture {
  readonly owner: Database;
  readonly db: Database;
  readonly operator: Database;
  readonly keyring: Keyring;
  readonly fake: FakeProvider;
  readonly deps: PublishDeps;
  readonly appId: string;
  readonly workspaceId: string;
  readonly ownerUserId: string;
  createUser(label: string): Promise<string>;
  createApp(clientId: string, provider?: string): Promise<string>;
  connectAccount(app: string, credential?: SeedCredential): Promise<string>;
  seed(options?: SeedOptions): Promise<Seeded>;
  stop(): Promise<void>;
}

const noMedia: MediaAccess = {
  signedUrl: () => Promise.reject(new Error('no media in these tests')),
  read: () => Promise.reject(new Error('no media in these tests')),
};

export interface FixtureUrls {
  readonly ownerUrl: string;
  readonly appUrl: string;
  readonly operatorUrl: string;
}

export async function startPublishFixture(
  test: FixtureUrls,
  slug: string,
  keyring: Keyring = createKeyring(new Map([[1, randomBytes(32)]])),
): Promise<PublishFixture> {
  const owner = createDatabase({ connectionString: test.ownerUrl });
  const db = createDatabase({ connectionString: test.appUrl });
  const operator = createDatabase({ connectionString: test.operatorUrl });
  let appId = '';
  let ownerUserId = '';
  let workspaceId = '';

  function doc(text: string) {
    return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
  }

  async function createUser(label: string): Promise<string> {
    return await db.withActor(SYSTEM, async (trx) => {
      const result = await sql<{ id: string }>`
        select auth_create_user(${`${label}@example.test`}, ${`${label}@example.test`},
                                ${`User ${label}`}, 'hash', 'en') as id
      `.execute(trx);
      return result.rows[0]?.id ?? '';
    });
  }

  async function createApp(clientId: string, provider = FAKE_PROVIDER): Promise<string> {
    const id = randomUUID();
    await operator.withActor(CLI, (trx) =>
      trx.insertInto('provider_apps').values({ id, provider, client_id: clientId }).execute(),
    );
    return id;
  }

  async function connectAccount(app: string, credential: SeedCredential = {}): Promise<string> {
    const actor: Actor = { kind: 'user', id: ownerUserId };
    return await db.withTenant(workspaceId, actor, async (trx) => {
      const { id } = await trx
        .insertInto('social_accounts')
        .values({
          workspace_id: workspaceId,
          provider: credential.provider ?? FAKE_PROVIDER,
          provider_app_id: app,
          provider_account_id: `fake-${randomUUID()}`,
          account_kind: 'profile',
          display_name: 'Fake account',
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      await saveCredential(trx, keyring, {
        workspaceId,
        socialAccountId: id,
        kind: 'oauth',
        value: credential.value ?? { token: 'fake-token' },
        grantedScopes: [],
        accessExpiresAt: credential.accessExpiresAt,
        refreshExpiresAt: credential.refreshExpiresAt,
        clientKeyId: credential.clientKeyId,
      });
      return id;
    });
  }

  async function seed(options: SeedOptions = {}): Promise<Seeded> {
    const accountId = options.accountId ?? (await connectAccount(options.appId ?? appId));
    const deliveryMode = options.deliveryMode ?? 'auto';
    const actor: Actor = { kind: 'user', id: options.schedulerId ?? ownerUserId };
    return await db.withTenant(workspaceId, actor, async (trx) => {
      const post = await trx
        .insertInto('posts')
        .values({ workspace_id: workspaceId, origin: 'ui' })
        .returning('id')
        .executeTakeFirstOrThrow();
      const variant = await trx
        .insertInto('post_variants')
        .values({ workspace_id: workspaceId, post_id: post.id, is_default: true })
        .returning('id')
        .executeTakeFirstOrThrow();
      const snapshot = parseSnapshot({
        v: 1,
        postId: post.id,
        postVersion: 1,
        variants: [
          {
            id: variant.id,
            isDefault: true,
            contentLanguage: null,
            items: [
              {
                position: 0,
                role: 'main',
                doc: doc(options.text ?? SEED_TEXT),
                docSchemaV: 1,
                media: options.media ?? [],
              },
            ],
          },
        ],
        destinations: [
          {
            socialAccountId: accountId,
            provider: options.provider ?? FAKE_PROVIDER,
            publishType: 'post',
            variantId: variant.id,
            deliveryMode,
            settings: {},
          },
        ],
      });
      const resolved = resolveDestination(snapshot, {
        socialAccountId: accountId,
        publishType: 'post',
      });
      const hash = Buffer.from(await contentHash(contentHashInput(resolved)));
      await trx
        .insertInto('post_revisions')
        .values({
          workspace_id: workspaceId,
          post_id: post.id,
          post_version: 1,
          snapshot: JSON.stringify(snapshot),
          snapshot_v: 1,
          content_hash: hash,
          content_hash_v: 1,
          reason: 'schedule',
        })
        .execute();
      await trx
        .insertInto('revision_destinations')
        .values({
          workspace_id: workspaceId,
          post_id: post.id,
          post_version: 1,
          social_account_id: accountId,
          publish_type: 'post',
          variant_id: variant.id,
          content_hash: hash,
        })
        .execute();
      const dest = await trx
        .insertInto('post_destinations')
        .values({
          workspace_id: workspaceId,
          post_id: post.id,
          variant_id: variant.id,
          social_account_id: accountId,
          provider: options.provider ?? FAKE_PROVIDER,
          publish_type: 'post',
          delivery_mode: deliveryMode,
          selection_source: 'manual',
          account_label: 'Fake account',
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      await trx
        .updateTable('post_destinations')
        .set({
          state: 'scheduled',
          version: 2,
          frozen_at: sql<Date>`now()`,
          frozen_post_version: 1,
          content_hash: hash,
          content_hash_v: 1,
          scheduled_local: sql<string>`(now() at time zone 'Europe/Bratislava')`,
          scheduled_tz: 'Europe/Bratislava',
          scheduled_at: sql<Date>`now()`,
          run_at: sql<Date>`now() - interval '1 second'`,
          deadline_at: sql<Date>`now() + make_interval(secs => ${options.deadlineSeconds ?? 3600})`,
          attempt_count: options.attemptCount ?? 0,
        })
        .where('workspace_id', '=', workspaceId)
        .where('id', '=', dest.id)
        .execute();
      return { destinationId: dest.id, postId: post.id, accountId };
    });
  }
  await installJobQueue(test.ownerUrl, owner);
  appId = await createApp('fake-client');
  ownerUserId = await createUser('publisher');
  workspaceId = await db.withActor({ kind: 'user', id: ownerUserId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Org', 'Workspace', ${slug}, 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
  const fake = fakeProvider();
  const deps = publishDeps({
    db,
    providers: createProviderRegistry([fake.manifest], [fake.runtime], () => ({}) as HttpClient),
    keyring,
    media: noMedia,
    logger: pino({ level: 'silent' }),
    workerId: 'publish-test',
    publicBaseUrl: 'https://app.example.test',
  });
  return {
    owner,
    db,
    operator,
    keyring,
    fake,
    deps,
    appId,
    workspaceId,
    ownerUserId,
    createUser,
    createApp,
    connectAccount,
    seed,
    async stop() {
      await db.destroy();
      await operator.destroy();
      await owner.destroy();
    },
  };
}
