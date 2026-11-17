import type { ProviderRuntime } from '@kronaut/core';
import { connectFinish, connectStart } from './connect.ts';
import type { PinterestSettings } from './manifest.ts';
import { type PinterestCredentials, pinterestCredentials, refreshAccess } from './oauth.ts';
import { publishPin } from './publish.ts';
import { verifyPin } from './verify.ts';

export const pinterestRuntime: ProviderRuntime<PinterestCredentials, PinterestSettings> = {
  id: 'pinterest',

  parseCredentials: (value) => pinterestCredentials.parse(value),

  connectStart,

  connectFinish,

  refresh: refreshAccess,

  publish: publishPin,

  verify: verifyPin,
};
