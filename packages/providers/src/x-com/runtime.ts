import type { ProviderRuntime } from '@kronaut/core';
import { accountMetrics, postAnalytics } from './analytics.ts';
import { connectFinish, connectStart } from './connect.ts';
import type { XSettings } from './manifest.ts';
import { refreshAccess, revokeTokens, type XCredentials, xCredentials } from './oauth.ts';
import { publishPost } from './publish.ts';
import { verifyPost } from './verify.ts';

export const xRuntime: ProviderRuntime<XCredentials, XSettings> = {
  id: 'x_com',

  parseCredentials: (value) => xCredentials.parse(value),

  connectStart,

  connectFinish,

  refresh: refreshAccess,

  revoke: revokeTokens,

  publish: publishPost,

  verify: verifyPost,

  analytics: postAnalytics,

  accountMetrics,
};
