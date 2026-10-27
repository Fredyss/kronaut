import type { ProviderRuntime } from '@kronaut/core';
import * as z from 'zod';
import { readInstanceCapabilities } from './capabilities.ts';
import { connectFinish, connectStart, type MastodonCredentials, registerApp } from './connect.ts';
import type { MastodonSettings } from './manifest.ts';
import { publishStatus } from './publish.ts';
import { verifyStatus } from './verify.ts';

export type { MastodonCredentials } from './connect.ts';

export const mastodonCredentials = z.object({ accessToken: z.string().min(1) });

export const mastodonRuntime: ProviderRuntime<MastodonCredentials, MastodonSettings> = {
  id: 'mastodon',

  parseCredentials: (value) => mastodonCredentials.parse(value),

  registerApp,

  connectStart,

  connectFinish,

  publish: publishStatus,

  verify: verifyStatus,

  readInstanceCapabilities,
};
