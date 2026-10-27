import { randomBytes } from 'node:crypto';
import { keyringFromEnv } from '@kronaut/credentials';
import { createDatabase } from '@kronaut/db';
import type { TestDatabase } from '@kronaut/db/testing';
import type { Logger } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { persistConnection } from '../src/channels/connect.ts';
import { registerBluesky } from '../src/cli/provider-apps.ts';
import { createOwner } from '../src/cli/users.ts';
import type { Env } from '../src/config.ts';
import { purposeKey } from '../src/crypto.ts';
import { CHANNEL, OWNER, TIME_ZONE } from './env.ts';

export interface SeedInput {
  readonly test: TestDatabase;
  readonly secret: Uint8Array;
  readonly publicUrl: URL;
  readonly env: Env;
  readonly logger: Logger;
}

export async function seed({ test, secret, publicUrl, env, logger }: SeedInput): Promise<string> {
  const db = createDatabase({ connectionString: test.appUrl });
  const operator = createDatabase({ connectionString: test.operatorUrl });
  try {
    const owner = await createOwner(
      {
        db,
        resetKey: purposeKey(secret, 'reset-token/v1'),
        publicUrl,
        now: Temporal.Now.instant(),
        logger,
      },
      { ...OWNER, timezone: TIME_ZONE },
    );
    const providerAppId = await registerBluesky({ db: operator, logger }, publicUrl);
    await db.withTenant(owner.workspaceId, { kind: 'user', id: owner.userId }, (trx) =>
      persistConnection(trx, keyringFromEnv(env), {
        workspaceId: owner.workspaceId,
        userId: owner.userId,
        provider: 'bluesky',
        providerAppId,
        clientKeyId: null,
        credentialKind: 'oauth',
        requestId: 'e2e-seed',
        account: {
          providerAccountId: `did:plc:${randomBytes(12).toString('hex')}`,
          accountKind: 'profile',
          handle: CHANNEL.handle,
          displayName: CHANNEL.displayName,
          credentials: { accessToken: randomBytes(16).toString('hex') },
          grantedScopes: [],
        },
      }),
    );
    return owner.link;
  } finally {
    await operator.destroy();
    await db.destroy();
  }
}
