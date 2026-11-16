import type { ProviderRuntime } from '@kronaut/core';
import { channelMetrics, videoAnalytics } from './analytics.ts';
import { connectFinish, connectStart } from './connect.ts';
import type { YoutubeSettings } from './manifest.ts';
import {
  refreshAccess,
  revokeGrant,
  type YoutubeCredentials,
  youtubeCredentials,
} from './oauth.ts';
import { publishVideo, verifyUpload } from './publish.ts';

export const youtubeRuntime: ProviderRuntime<YoutubeCredentials, YoutubeSettings> = {
  id: 'youtube',

  parseCredentials: (value) => youtubeCredentials.parse(value),

  connectStart,

  connectFinish,

  refresh: refreshAccess,

  revoke: revokeGrant,

  sharesGrant: (a, b) => a.refreshToken === b.refreshToken,

  publish: publishVideo,

  verify: verifyUpload,

  analytics: videoAnalytics,

  accountMetrics: channelMetrics,
};
